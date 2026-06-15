# Push Notifications

Push notifications are used to alert the GUARDIAN when a protected contact's call crosses the 30-second monitoring threshold and an alert is created on the backend. This document describes the current Android implementation and the iOS migration path.

---

## Stack

| Layer | Library |
|---|---|
| Firebase Cloud Messaging (FCM) | `@react-native-firebase/messaging` v24+ (modular API) |
| Foreground display + channels | `@notifee/react-native` v9+ |
| Backend send | `firebase-admin` SDK in NestJS |

---

## FCM token

### Android

FCM tokens on Android are **device-level** and do not require notification permission. Do not gate `getToken()` behind `requestPermission()`.

```typescript
// Correct — works regardless of notification permission status
async getToken(): Promise<string | null> {
  try {
    return await getToken(getMessaging());
  } catch (err) {
    console.warn("getToken() failed — Firebase not configured or no Play Services:", err);
    return null;
  }
}
```

`requestPermission()` only controls whether notifications are *displayed* to the user. It is called separately (fire-and-forget) before `getToken()` but must never block token retrieval.

### iOS (migration path)

On iOS, `getToken()` depends on APNs being configured first. Firebase wraps the APNs token internally. Steps required:

1. Add APNs Auth Key (or certificate) in Firebase Console → Project Settings → Cloud Messaging → Apple app configuration.
2. Enable the **Push Notifications** capability in Xcode.
3. Add **Background Modes → Remote notifications** in Xcode.
4. `requestPermission()` is critical on iOS — the user must allow notifications before APNs issues a device token. Call it early, before `getToken()`.
5. `AuthorizationStatus.AUTHORIZED` or `AuthorizationStatus.PROVISIONAL` means the token will be available.

---

## Android notification channels

Android 8.0+ requires notifications to be posted to a *channel*. Heads-up (pop-over) notifications require the channel importance to be `HIGH`.

### Critical: the `channelId` must be in the FCM payload

If the FCM payload does not specify `android.notification.channelId`, Android falls back to a default channel with `IMPORTANCE_DEFAULT`. The notification will appear in the shade but **not** as a heads-up banner. The channel must also already exist on the device.

**Backend FCM send (must include `channelId`):**

```typescript
await messaging.send({
  token: fcmToken,
  notification: { title, body },
  android: {
    priority: "high",
    notification: { channelId: "escronet_alerts" },
  },
});
```

**Mobile channel creation (`notifications.setup.ts`) — must run before any notification is received:**

```typescript
await notifee.createChannel({
  id: "escronet_alerts",
  name: "Scam Alerts",
  importance: AndroidImportance.HIGH,
  vibration: true,
});
```

`createNotificationChannels()` is called in `AppNavigator` bootstrap before `ensureAuthenticated()`.

### iOS (migration path)

iOS has no notification channels. Importance/sound/badge are configured per-notification in `UNNotificationRequest`. Remove the `android` block from the FCM payload for iOS, or send platform-specific payloads using FCM's `apns` key.

---

## Foreground notifications

The FCM SDK silently drops notifications when the app is in the foreground. `notifee` is used as the display layer in this case.

```typescript
// notifications.setup.ts
export function listenForForegroundMessages(): () => void {
  return pushService.onMessage((message) => {
    void notifee.displayNotification({
      title: message.title ?? "Scam Alert",
      body: message.body ?? "A contact may be on a scam call",
      android: {
        channelId: "escronet_alerts",
        importance: AndroidImportance.HIGH,
        pressAction: { id: "default" },
      },
    });
  });
}
```

### iOS (migration path)

On iOS the FCM SDK *does* deliver the `onMessage` callback when the app is in the foreground, but the notification is not displayed. The same `notifee.displayNotification()` call works on iOS — remove the `android` key and add `ios: { sound: "default" }`.

---

## Notification tap → navigate to Alerts screen

Navigation from outside React components uses a `NavigationContainerRef`.

```typescript
// navigation/navigationRef.ts
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToAlerts(): void {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.navigate({ name: "Alerts" }));
  }
}
```

Three cases handled:

| App state | Mechanism |
|---|---|
| **Foreground** | `notifee.onForegroundEvent(EventType.PRESS)` → `navigateToAlerts()` |
| **Background → foreground** | Same — notifee fires `PRESS` event once the app is foregrounded |
| **Killed / quit** | `notifee.getInitialNotification()` in `AppNavigator` bootstrap; navigate via `NavigationContainer.onReady` callback |

The `NavigationContainer` is only rendered after `ready === true` (bootstrap complete), so `onReady` is guaranteed to fire after the ref is attached.

---

## Alerts screen cache invalidation

The Alerts screen refreshes from three independent sources:

**1. Screen focus** — `useFocusEffect` invalidates both caches whenever the screen becomes active (handles notification tap from background, tab switch, app resume).

**2. Foreground FCM push** — `listenForForegroundMessages` emits `ALERT_LIST_CHANGED_EVENT` before displaying the in-app notification. This refreshes the guardian's Alerts screen immediately when a push arrives while the app is open.

```typescript
// notifications.setup.ts
return pushService.onMessage((message) => {
  DeviceEventEmitter.emit(ALERT_LIST_CHANGED_EVENT); // refresh before display
  void notifee.displayNotification({ ... });
});
```

**3. WebSocket events** — `wsService.ts` listens for `alert_status_changed` and `alert_risk_changed` from the backend Socket.IO gateway and emits `ALERT_LIST_CHANGED_EVENT`. This gives the guardian instant updates (call ended, risk escalated) without waiting for a push.

`AlertsScreen` registers a `DeviceEventEmitter` listener for `ALERT_LIST_CHANGED_EVENT` that invalidates both `myAlerts` and `alertNotifications` queries:

```typescript
useEffect(() => {
  const sub = DeviceEventEmitter.addListener(ALERT_LIST_CHANGED_EVENT, () => {
    void queryClient.invalidateQueries({ queryKey: ["myAlerts"] });
    void queryClient.invalidateQueries({ queryKey: ["alertNotifications"] });
  });
  return () => sub.remove();
}, [queryClient]);
```

See [alerts.md](alerts.md#alertsscreen--real-time-refresh) for the full refresh trigger table.

---

## React Native Firebase v22 modular API

The namespaced API (`messaging()`) is deprecated as of v22. All imports are top-level functions:

```typescript
import {
  getMessaging,
  requestPermission,
  getToken,
  onMessage,
  onTokenRefresh,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";
```

Do not use `messaging()` — it still works but logs deprecation warnings and will be removed in the next major release.

---

## 204 No Content responses

The API client must check for empty responses before calling `res.json()`. JSON parsing on a 204 throws a `SyntaxError`, which silently prevents `onSuccess` from firing.

```typescript
if (res.status === 204 || res.headers.get("content-length") === "0") {
  return schema.parse(undefined); // z.void() accepts undefined
}
return schema.parse(await res.json());
```

---

## Firebase service account (backend)

`apps/backend/src/modules/firebase/firebase.service.ts` reads the service account JSON from `FIREBASE_SERVICE_ACCOUNT_PATH`. If the file is missing or contains a placeholder `project_id`, `isReady` remains `false` and all pushes are silently skipped (logged as warnings).

To verify: look for `[FirebaseService] initialized project_id=<your-project-id>` in backend logs on startup. A placeholder or missing file produces `[FirebaseService] failed to initialize`.
