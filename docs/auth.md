# Authentication

Escronet uses **EC P-256 + Firebase Custom Auth** for device identity. Each installation generates a P-256 key pair, signs a self-signed JWT to prove key possession, and exchanges it for a Firebase Custom Token. All subsequent API requests carry a Firebase ID Token in the `Authorization: Bearer` header.

There is no username/password, no email, and no separate session management layer — Firebase Auth handles token storage and refresh across app restarts.

---

## Architecture overview

```
Mobile                          Backend                         Firebase Auth
  │                               │                                  │
  │  1. POST /v1/auth/register    │                                  │
  │     { registrationJwt,        │                                  │
  │       fcmToken? }             │                                  │
  │ ─────────────────────────────►│                                  │
  │                               │ 2. verify ES256 signature        │
  │                               │ 3. derive firebaseUid            │
  │                               │    = "device:" +                 │
  │                               │      sha256(pubKeyDer).hex[:28]  │
  │                               │ 4. getUser(uid) or createUser()  │
  │                               │ ─────────────────────────────────►
  │                               │ 5. createCustomToken(uid)        │
  │                               │ ◄─────────────────────────────── │
  │  6. { customToken, userId }   │                                  │
  │ ◄─────────────────────────────│                                  │
  │                               │                                  │
  │ 7. signInWithCustomToken()    │                                  │
  │ ─────────────────────────────────────────────────────────────────►
  │                               │                                  │
  │ 8. All requests: Authorization: Bearer <Firebase ID Token>       │
  │ ─────────────────────────────►│                                  │
  │                               │ verifyIdToken() ─────────────────►
  │                               │ ◄─────────────────────────────── │
  │                               │ look up User in Postgres         │
```

The `registrationJwt` is a self-signed JWT (ES256) with the device's P-256 public key in the payload. The backend derives the same deterministic `firebaseUid` every time from the public key hash, so re-registrations (on fresh launches) are idempotent.

---

## Mobile implementation

### Crypto library choice

All cryptography is **pure JavaScript** via `@noble/curves` and `@noble/hashes`. This was chosen over `react-native-quick-crypto` because:

- No APK rebuild needed when changing crypto logic
- No native module linking issues (`react-native-quick-base64` was a transitive dep of `react-native-quick-crypto` and was not autolinked by React Native — caused a hard crash on launch)
- `@noble/*` is audited, widely used, and has a zero-dependency pure-JS build

The only remaining native module requirement is `react-native-get-random-values`, which polyfills `globalThis.crypto.getRandomValues` for Hermes.

### Hermes / `crypto.getRandomValues` polyfill

Hermes in React Native 0.76 does not expose `globalThis.crypto.getRandomValues` at module load time. `@noble/curves` calls it during key generation. Without the polyfill, the app crashes on first launch with:

```
Error: crypto.getRandomValues must be defined
```

Fix: `react-native-get-random-values` must be the **first import** in `apps/mobile/index.js`:

```javascript
import "react-native-get-random-values"; // MUST be first — polyfills globalThis.crypto
import "./global.css";
import { AppRegistry } from "react-native";
// ...
```

This is a native module and **requires an APK rebuild** (`pnpm dev:android`) to take effect.

### Key storage

Only the **private key** (32 raw bytes, base64url-encoded) is stored in MMKV. The public key is always derived on demand from the private key using `p256.ProjectivePoint.fromPrivateKey(privateKey).toRawBytes(false)`. This avoids any public key storage/sync inconsistency.

```
MMKV key: "privateKey"   → 32-byte P-256 scalar, base64url
MMKV key: "userId"       → Postgres User UUID
```

### SPKI DER wrapping

`@noble/curves` produces a raw 65-byte uncompressed EC point (`04 || X || Y`). Node.js `createPublicKey({ format: 'der', type: 'spki' })` requires the key to be wrapped in an ASN.1 SubjectPublicKeyInfo structure. The mobile side prepends a hardcoded 26-byte prefix before encoding in the JWT payload:

```typescript
const P256_SPKI_PREFIX = new Uint8Array([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07,
  0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,    // OID id-ecPublicKey
  0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID P-256
  0x03, 0x42, 0x00,                              // BIT STRING, 66 bytes, 0 padding
]);
// Total SPKI = prefix (26) + raw point (65) = 91 bytes
```

### Firebase modular API

React Native Firebase v22+ deprecated the namespaced `auth()` API. All usages use the modular API:

```typescript
import { getAuth, signInWithCustomToken, onAuthStateChanged } from "@react-native-firebase/auth";

// Old (deprecated, causes runtime warning):
// import auth from "@react-native-firebase/auth";
// auth().currentUser

// New:
getAuth().currentUser
```

### Firebase Auth initialization race (`waitForInitialAuthState`)

Firebase Auth restores its session from AsyncStorage **asynchronously** on every app launch. `getAuth().currentUser` is `null` immediately after launch — even when a valid session exists — until `onAuthStateChanged` fires once.

Any code that checks `currentUser` at startup must await this first emission:

```typescript
function waitForInitialAuthState(): Promise<FirebaseAuthTypes.User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function ensureAuthenticated(): Promise<void> {
  const currentUser = await waitForInitialAuthState(); // waits for Firebase to restore session
  if (currentUser) return; // already authenticated — skip registration
  // ... registration flow
}
```

Additionally, `signInWithCustomToken()` resolves its promise **before** `onAuthStateChanged` fires and before the token getter in `api.ts` picks up the new user. After calling `signInWithCustomToken`, wait for `onAuthStateChanged` to confirm the state has propagated:

```typescript
await new Promise<void>((resolve, reject) => {
  const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
    if (user) { unsubscribe(); resolve(); }
  });
  signInWithCustomToken(getAuth(), customToken).catch((err) => {
    unsubscribe(); reject(err as Error);
  });
});
```

Skipping this second wait causes all API requests made immediately after sign-in to send no token (401 "Missing Bearer token").

### FCM token refresh

On launch when already authenticated, `ensureAuthenticated` silently re-registers with the latest FCM token (fire-and-forget, errors suppressed). A permanent `listenForTokenRefresh` listener also re-registers whenever FCM rotates the token.

### Metro configuration

`transformIgnorePatterns` must include `@noble` so Babel transforms their ESM modules if Metro resolves them:

```javascript
// metro.config.js
transformIgnorePatterns: [
  'node_modules/(?!(@gluestack-ui|nativewind|react-native-reanimated|@escronet|@trpc|@noble)/)',
],
```

---

## Backend implementation

### JWT verification (`AuthService`)

The backend performs these checks in order:

1. Split the JWT into 3 parts (`header.payload.signature`)
2. Decode the payload (`base64url` → JSON)
3. Validate `iat` is within ±5 minutes (replay protection)
4. Decode `payload.pub` as SPKI DER → `createPublicKey({ format: 'der', type: 'spki' })`
5. Verify the ES256 signature over `"header.payload"` — tries `ieee-p1363` format first (R||S compact, 64 bytes), falls back to DER encoding
6. Derive `firebaseUid = "device:" + sha256(pubKeyDer).hex.slice(0, 28)`
7. `admin.auth().getUser(uid)` — if `auth/user-not-found`, call `createUser({ uid })`
8. Issue `createCustomToken(uid)`, upsert Postgres `User`, return both

**Error handling in step 7**: Only catch `auth/user-not-found`. Any other Firebase error (network, misconfiguration, etc.) must be re-thrown. If you swallow all errors from `getUser()` and always call `createUser()`, configuration errors manifest as confusing 500s with no useful log.

### Firebase Auth guard (`FirebaseAuthGuard`)

Applied globally. Skipped for endpoints decorated with `@SkipAuth()` (`SetMetadata('skipAuth', true)`).

```
Authorization: Bearer <Firebase ID Token>
  → firebase.auth().verifyIdToken(token)
  → decoded.uid
  → User.findOneBy({ firebaseUid })
  → req.userId = user.id
```

Verification errors are logged with `code` before being converted to `UnauthorizedException("Invalid or expired token")`.

### Firebase Console prerequisite

Firebase Authentication **must be activated** in the Firebase Console before any auth endpoints work. Without it, `admin.auth().getUser()` throws:

```
Error: There is no configuration corresponding to the provided identifier.
code: "CONFIGURATION_NOT_FOUND"
```

Setup: [console.firebase.google.com](https://console.firebase.google.com) → your project → Authentication → Get Started → enable Anonymous or any sign-in method. The specific sign-in method doesn't matter; activating the service is what unblocks custom tokens.

---

## Global error logging (TanStack Query)

All query and mutation errors are logged centrally via `QueryCache`/`MutationCache` handlers in `App.tsx`. Per-call error handlers are not needed for logging:

```typescript
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error(`[query ${JSON.stringify(query.queryKey)}]`, error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => { console.error("[mutation]", error); },
  }),
});
```

Error banners shown to users display friendly text ("⚠ Failed to load — tap to retry"), not raw error strings.

---

## iOS migration notes

The auth _protocol_ is identical on iOS (same backend endpoints, same JWT format, same Firebase flow). What changes is the native module landscape.

### Crypto

`@noble/curves` and `@noble/hashes` are pure JS — they work on iOS without any changes. `react-native-get-random-values` also supports iOS (uses `SecRandomCopyBytes` under the hood). No iOS-specific crypto changes needed.

### Firebase

Replace the `google-services.json` (Android) with `GoogleService-Info.plist` (iOS). Both come from the same Firebase Console project under **Project settings → Your apps**.

Firebase SDK packages (`@react-native-firebase/app`, `@react-native-firebase/auth`, `@react-native-firebase/messaging`) already support iOS — no separate iOS packages. iOS requires `pod install` after adding new RN Firebase modules.

### FCM on iOS → APNs

Firebase Cloud Messaging on iOS routes through APNs. Requirements:

1. **APNs auth key** — generate in Apple Developer portal (Certificates, Identifiers & Profiles → Keys → + → Apple Push Notifications service). Upload the `.p8` key to Firebase Console → Project settings → Cloud Messaging → Apple app configuration.
2. **App entitlement** — add `aps-environment` (`development` or `production`) to `ios/<AppName>/<AppName>.entitlements`.
3. **Background mode** — add `remote-notifications` to `UIBackgroundModes` in `Info.plist`.
4. **Register for remote notifications** — `@react-native-firebase/messaging` handles this when you call `messaging().requestPermission()`.
5. **`react-native-get-random-values`** must be listed in the Podfile (it is autolinked, so `pod install` is sufficient after adding to `package.json`).

### Call detection

Call detection is currently **Android-only** (Kotlin `CallDetectionForegroundService` + `READ_PHONE_STATE` permission). iOS does not allow apps to intercept calls. The iOS alternative is CallKit + CXCallObserver, which requires the user to configure the app as a Call Blocker in Settings — a separate feature not yet scoped.

### Overlay / OTP banner

The SMS OTP overlay (`OverlayPermissionModule.kt`, `SYSTEM_ALERT_WINDOW`) is Android-only. iOS has no equivalent capability. See [sms-otp-banner.md](sms-otp-banner.md) for iOS alternatives.

### Required APK rebuild triggers (Android)

Any of the following require a full APK rebuild (`pnpm dev:android`):

| Change | Why |
|---|---|
| Adding/removing a native module | React Native autolinking re-runs at build time |
| Modifying `AndroidManifest.xml` | Manifest is compiled into the APK |
| Updating `google-services.json` | Firebase plugin processes it at build time |
| Changing Kotlin code | Kotlin compilation |
| Updating `@react-native-firebase/*` | Native bridge changes |
| Updating `react-native-get-random-values` | Native bridge changes |

Pure JS changes (including all `@noble/*` changes, all TS/TSX changes) do **not** require a rebuild — Metro hot reload handles them.

---

## Setup checklist

### First-time setup

- [ ] Firebase project created at console.firebase.google.com
- [ ] Android app registered in Firebase (package `com.escronet`) — download `google-services.json` to `apps/mobile/android/app/`
- [ ] iOS app registered in Firebase (bundle ID) — download `GoogleService-Info.plist` to `apps/mobile/ios/<AppName>/`
- [ ] **Authentication activated**: Firebase Console → Authentication → Get Started (required even if using only custom tokens)
- [ ] `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` set in backend `.env` (service account credentials from Firebase Console → Project settings → Service accounts)
- [ ] APK built with `react-native-get-random-values` linked (`pnpm dev:android`)

### Per-device debug

- [ ] Backend is reachable from the device/emulator (check `BACKEND_URL` in `apps/mobile/.env`)
- [ ] Firebase Authentication is enabled in the Firebase Console (not just the SDK initialized)
- [ ] Metro cache cleared if seeing stale module resolution errors: `pnpm --filter @escronet/mobile start -- --reset-cache`
