# SMS OTP Banner

When a call from an unsaved contact is active and an OTP-like SMS arrives during that call, Escronet displays a persistent warning banner. The banner is designed to be visible even when the phone dialer or any other app is in the foreground.

---

## Trigger conditions

Both conditions must be true simultaneously:

1. A call from a number **not in the device's contacts** is answered (`isMonitoringCall = true`).
2. An incoming SMS matches the OTP detection heuristic during that call.

When the call ends (`CALL_STATE_IDLE`), the banner is dismissed automatically.

---

## OTP detection heuristic

Implemented in `CallDetectionForegroundService.isOtpMessage()`:

```kotlin
private fun isOtpMessage(body: String): Boolean {
    if (body.length > 300) return false
    val hasCode = Regex("""\b\d{4,8}\b""").containsMatchIn(body)
    val hasKeyword = Regex(
        """(?i)\b(code|cod|otp|pin|verif|verificare|parola|код|пин|пароль|ключ)\b"""
    ).containsMatchIn(body)
    return hasCode && hasKeyword
}
```

**Dual-condition approach** — requires both a digit sequence AND a keyword. This avoids false positives from messages that contain numbers but are not OTP-related (e.g., "Call me at 12345").

| Check | Pattern | Rationale |
|---|---|---|
| Digit sequence | `\b\d{4,8}\b` | Covers 4–8 digit OTP codes (most common range) |
| OTP keyword | EN: `code`, `otp`, `pin`, `verif` | Explicit OTP context |
| | RO: `cod`, `verificare`, `parola` | Romanian SMS banking/auth language |
| | RU: `код`, `пин`, `пароль`, `ключ` | Russian SMS auth language |
| Max length | 300 chars | OTP SMS are short; skips long marketing messages |

To extend coverage, add keywords to the regex in `isOtpMessage()`. The pattern is case-insensitive (`(?i)`).

---

## Android implementation

### Two-layer banner

The feature uses two independent layers so the warning is visible regardless of which app is in the foreground:

| Layer | Mechanism | Visible when |
|---|---|---|
| **System overlay** | `WindowManager` (`TYPE_APPLICATION_OVERLAY`) | App is in background (phone dialer, any other app) |
| **In-app banner** | React Native `SmsOtpBanner` component | Escronet is in the foreground |

Both layers listen to the same events and are dismissed when the call ends.

### Event flow

```
SMS arrives → BroadcastReceiver.onReceive()
           → isOtpMessage() → true
           → emitEvent("sms_otp_during_call")  ← RN SmsOtpBanner picks this up
           → showOtpOverlay()                  ← WindowManager overlay appears

Call ends  → CALL_STATE_IDLE
           → hideOtpOverlay()
           → emitEvent("call_ended")           ← RN SmsOtpBanner hides
```

### SMS BroadcastReceiver

The receiver is registered **dynamically** (not in the manifest) and only for the duration of a monitored call. It is registered in `onAnswered()` and unregistered in `onIdle()` and `onDestroy()`.

```kotlin
val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
// API 33+: RECEIVER_NOT_EXPORTED — system broadcasts still reach it
registerReceiver(receiver, filter, RECEIVER_NOT_EXPORTED)
```

### WindowManager overlay

```kotlin
val params = WindowManager.LayoutParams(
    MATCH_PARENT, WRAP_CONTENT,
    TYPE_APPLICATION_OVERLAY,          // API 26+; TYPE_PHONE on older
    FLAG_NOT_FOCUSABLE or FLAG_NOT_TOUCHABLE,
    PixelFormat.TRANSLUCENT,
).apply {
    gravity = Gravity.TOP
    y = statusBarHeight                // positioned below status bar
}
```

`FLAG_NOT_FOCUSABLE | FLAG_NOT_TOUCHABLE` — the overlay is purely informational; the user can still interact with whatever app is below it.

### Permissions (Android)

| Permission | Type | How granted |
|---|---|---|
| `RECEIVE_SMS` | **Dangerous** — requires runtime grant | `PermissionsAndroid.request()` in `AppNavigator` bootstrap |
| `SYSTEM_ALERT_WINDOW` | **Special** — requires Settings redirect | `OverlayPermissionModule.requestPermission()` opens `Settings.ACTION_MANAGE_OVERLAY_PERMISSION` |

**Critical:** `RECEIVE_SMS` in the manifest is not sufficient on Android 6+. The app must call `PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS)` at runtime. Without this, the `BroadcastReceiver` is registered but silently never fires.

If `SYSTEM_ALERT_WINDOW` is not granted, `Settings.canDrawOverlays()` returns `false` and `showOtpOverlay()` returns early. The in-app `SmsOtpBanner` still shows when Escronet is in the foreground.

### Native module: `OverlayPermission`

A minimal native module exposes two methods to React Native:

```typescript
// apps/mobile/src/navigation/AppNavigator.tsx — used at bootstrap
const OverlayPermission = NativeModules.OverlayPermission as
  | { isGranted: () => Promise<boolean>; requestPermission: () => void }
  | undefined;

if (OverlayPermission) {
  const granted = await OverlayPermission.isGranted().catch(() => true);
  if (!granted) OverlayPermission.requestPermission();
}
```

Implemented in `OverlayPermissionModule.kt` + `OverlayPermissionPackage.kt`. Registered in `MainApplication.kt`:

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages + listOf(OverlayPermissionPackage())
```

### React Native `SmsOtpBanner` component

Located at `apps/mobile/src/components/SmsOtpBanner.tsx`. Rendered in `AppNavigator` as an absolute-positioned overlay above `NavigationContainer`:

```tsx
<View style={{ flex: 1 }}>
  <NavigationContainer ...>...</NavigationContainer>
  <SmsOtpBanner />  {/* zIndex: 9999, pointerEvents="none" */}
</View>
```

`pointerEvents="none"` — the banner is visible but does not intercept touch events; the user can continue using the app under it.

---

## Privacy decision

**Caller phone numbers are never sent to the backend.** Only a SHA-256 hash (`callerHash`) of the normalized number is stored. This was an explicit design decision:

- The hash is used for cross-referencing with the community scam blocklist.
- The raw number is available only transiently on the device (during the call).
- Reversing the hash to recover the number is not possible without a rainbow table.

The `callerNumber` field was prototyped and reverted. Do not re-introduce it without a privacy review.

---

## iOS limitations and migration path

iOS does not expose the equivalent of Android's `RECEIVE_SMS` or `WindowManager`. The feature requires platform-specific alternatives.

### SMS interception — not possible on iOS

iOS apps cannot read incoming SMS messages. There is no equivalent to `android.provider.Telephony.SMS_RECEIVED`. The OTP detection trigger (`isOtpMessage`) has no iOS implementation path via SMS.

**Alternatives for iOS:**
- **Screen Time API / AutoFill** — iOS 12+ auto-suggests OTP codes from SMS in text fields. There is no programmatic access to this stream from a third-party app.
- **Clipboard monitoring** — iOS 16+ requires explicit user permission to read the clipboard; polling is not practical.
- **Manual input** — If the user copies the OTP, a banner could prompt them not to share it. Requires the app to be in the foreground.
- **Best practical option:** Show a persistent in-app reminder while a call is active (using `CXCallObserver` — see below). Cannot detect the OTP arrival, but can remind the user to be cautious for the entire duration of any call with an unsaved number.

### Call detection on iOS

Use `CXCallObserver` from CallKit to detect call state changes:

```swift
// iOS equivalent of PhoneStateListener
let observer = CXCallObserver()
observer.setDelegate(self, queue: nil)

func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
    if call.hasConnected && !call.hasEnded {
        // equivalent of CALL_STATE_OFFHOOK — check contacts, start monitoring
    }
    if call.hasEnded {
        // equivalent of CALL_STATE_IDLE
    }
}
```

`CXCall` provides `call.uuid` but **not** the phone number. Correlating the call to a phone number requires `CNContactStore` lookup via `CallKit` integration, which requires the app to be a registered call extension (`CXProvider`). For a monitoring-only use case (no blocking), `CXCallObserver` without a `CXProvider` is sufficient but the number will not be available.

### System overlay on iOS

`WindowManager`-style overlays over other apps are **not possible on iOS**. There is no equivalent to `SYSTEM_ALERT_WINDOW`.

**Alternatives:**
- **CallKit call UI** — only available if the app registers as a VoIP calling app via `CXProvider`. This is a heavy integration requiring significant call management responsibilities.
- **Live Activities** — iOS 16.1+ Dynamic Island / lock screen widget. Could show a persistent warning during a flagged call without overlaying the dialer. Requires ActivityKit and a widget extension target.
- **Local notification** — Can be posted while the app is backgrounded. Will appear as a banner over the dialer if notification permission is granted. Less intrusive than a full overlay.

### Summary table

| Feature | Android (current) | iOS (roadmap) |
|---|---|---|
| Call detection | `PhoneStateListener` (Kotlin service) | `CXCallObserver` (CallKit) |
| Caller number lookup | `ContactsContract.PhoneLookup` | `CNContactStore` |
| SMS interception | `BroadcastReceiver` + `RECEIVE_SMS` | **Not possible** |
| OTP detection trigger | SMS arrival during call | No equivalent — show general call warning |
| Warning over dialer | `WindowManager` overlay | Live Activity or local notification |
| In-app banner | `SmsOtpBanner` (RN component) | Same component — reuse as-is |
| Rebuild required after Kotlin change | Yes (`pnpm dev:android`) | Yes (Xcode rebuild) |
