import { getAuth, signInWithCustomToken, onAuthStateChanged } from "@react-native-firebase/auth";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha2";
import { api } from "../api/api";
import {
  getPrivateKeyB64,
  setPrivateKeyB64,
  setUserId,
} from "../storage/authStore";
import { pushService } from "./push";

// SPKI DER header for P-256 uncompressed public key (26 bytes)
// Wraps the raw 65-byte EC point into ASN.1 SubjectPublicKeyInfo for Node.js crypto.
const P256_SPKI_PREFIX = new Uint8Array([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07,
  0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
  0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
  0x03, 0x42, 0x00,
]);

function toBase64url(bytes: Uint8Array | ArrayBuffer): string {
  const u8 = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  let binary = "";
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Firebase Auth restores its session from storage asynchronously.
// auth.currentUser is null until onAuthStateChanged fires, even on subsequent
// launches. This waits for that first emission so we know the true initial state.
function waitForInitialAuthState(): Promise<FirebaseAuthTypes.User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

function ensurePrivateKey(): Uint8Array {
  const stored = getPrivateKeyB64();
  if (stored) return fromBase64url(stored);

  const privateKey = p256.utils.randomPrivateKey();
  setPrivateKeyB64(toBase64url(privateKey));
  return privateKey;
}

function createRegistrationJwt(privateKey: Uint8Array): string {
  const encoder = new TextEncoder();

  const pubRaw = p256.ProjectivePoint.fromPrivateKey(privateKey).toRawBytes(false);
  const pubSpki = new Uint8Array(P256_SPKI_PREFIX.length + pubRaw.length);
  pubSpki.set(P256_SPKI_PREFIX);
  pubSpki.set(pubRaw, P256_SPKI_PREFIX.length);

  const headerB64 = toBase64url(encoder.encode(JSON.stringify({ alg: "ES256", typ: "JWT" })));
  const payloadB64 = toBase64url(
    encoder.encode(
      JSON.stringify({ pub: toBase64url(pubSpki), iat: Math.floor(Date.now() / 1000) }),
    ),
  );
  const signingInput = `${headerB64}.${payloadB64}`;

  const msgHash = sha256(encoder.encode(signingInput));
  const sigBytes = p256.sign(msgHash, privateKey, { lowS: true }).toCompactRawBytes();

  return `${signingInput}.${toBase64url(sigBytes)}`;
}

export async function ensureAuthenticated(): Promise<void> {
  const currentUser = await waitForInitialAuthState();

  if (currentUser) {
    const fcmToken = await pushService.getToken().catch(() => null);
    if (fcmToken) {
      const privateKey = ensurePrivateKey();
      const registrationJwt = createRegistrationJwt(privateKey);
      api.auth.register({ registrationJwt, fcmToken }).catch(() => null);
    }
    return;
  }

  void pushService.requestPermission().catch(() => null);
  const fcmToken = await pushService.getToken().catch(() => null);
  console.log(
    `[ensureAuthenticated] fcmToken=${fcmToken ? fcmToken.slice(0, 12) + "…" : "null"}`,
  );

  const privateKey = ensurePrivateKey();
  const registrationJwt = createRegistrationJwt(privateKey);

  const { customToken, userId } = await api.auth.register({
    registrationJwt,
    fcmToken: fcmToken ?? undefined,
  });

  // signInWithCustomToken updates auth.currentUser synchronously once resolved,
  // but we also need the onAuthStateChanged listener to fire so the token getter
  // in api.ts picks it up. Wait for the state change before returning.
  await new Promise<void>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      if (user) {
        unsubscribe();
        resolve();
      }
    });
    signInWithCustomToken(getAuth(), customToken).catch((err) => {
      unsubscribe();
      reject(err as Error);
    });
  });

  setUserId(userId);
}

export function listenForTokenRefresh(): () => void {
  return pushService.onTokenRefresh((fcmToken) => {
    const privateKey = ensurePrivateKey();
    const registrationJwt = createRegistrationJwt(privateKey);
    api.auth.register({ registrationJwt, fcmToken }).catch(() => null);
  });
}

// Fires `onDeleted` when Firebase transitions from signed-in → signed-out,
// which happens when the server deletes the Firebase auth user.
export function listenForAccountDeletion(onDeleted: () => void): () => void {
  let hasBeenSignedIn = false;
  return onAuthStateChanged(getAuth(), (user) => {
    if (user) {
      hasBeenSignedIn = true;
    } else if (hasBeenSignedIn) {
      onDeleted();
    }
  });
}
