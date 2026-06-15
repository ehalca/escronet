# Alerts

This document describes the full alert lifecycle: how alerts are created, escalated, tracked, delivered to guardians, and displayed in the mobile UI. It covers both the protected user's device (the source) and the guardian's device (the sink).

---

## Alert lifecycle

```
Call answered
    │
    ├── 7s  → "Unknown caller" local notification (Kotlin)
    │
    ├── 30s → call_threshold_reached (DeviceEventEmitter)
    │           └── POST /api/alerts  (riskLevel=low, callDuration=30)
    │               └── FCM push → guardian(s)
    │               └── retry loop starts
    │
    ├── OTP SMS during call → risk_escalated (DeviceEventEmitter)
    │           ├── if alert exists → PATCH /api/alerts/:id/risk (riskLevel=highest)
    │           │       └── immediate FCM push + WS event → guardian(s)
    │           └── if no alert yet → POST /api/alerts immediately (skip waiting 30s)
    │
    └── Call ends → call_ended (DeviceEventEmitter)
                └── PATCH /api/alerts/:id/status  (status=hung)
                    └── retry loop stops
                    └── WS event alert_status_changed → guardian(s)
```

---

## Entity — `alerts` table

| Column           | Type         | Nullable | Description                                                 |
|------------------|--------------|----------|-------------------------------------------------------------|
| `id`             | uuid         | no       | Primary key (BaseEntity)                                    |
| `user_id`        | uuid         | no       | FK → users                                                  |
| `caller_hash`    | varchar(128) | no       | SHA-256 of the normalised phone number (raw number never stored) |
| `risk_level`     | varchar(20)  | no       | Current risk level; mutable — see escalation below         |
| `score`          | float        | yes      | ONNX classifier confidence (0–1)                           |
| `transcript_snippet` | text     | yes      | Short transcript excerpt for display                       |
| `category`       | varchar(64)  | yes      | Scam category (FAKE_DELIVERY, SMS_CODE_REQUEST, etc.)      |
| `call_duration`  | integer      | yes      | Seconds elapsed at the time of alert creation (≈30)        |
| `call_started_at`| timestamptz  | yes      | When the call was answered (from Kotlin `onAnswered()`)    |
| `detected_at`    | timestamptz  | no       | When the alert was created                                 |
| `status`         | varchar(16)  | no       | `"active"` (default) or `"hung"`                          |
| `hung_at`        | timestamptz  | yes      | Set by backend when status changes to `"hung"`             |
| `created_at`     | timestamptz  | no       | BaseEntity                                                  |
| `updated_at`     | timestamptz  | no       | BaseEntity                                                  |

`callDuration` is the number of seconds the call had been running when the alert was created (typically 30). It is used to reconstruct `callStartedAt` when that field is null (see Duration display below).

---

## Alert status

| Value    | Meaning                                      | Transition                          |
|----------|----------------------------------------------|-------------------------------------|
| `active` | Call is still ongoing (default on creation)  | → `hung` when call ends             |
| `hung`   | Call has ended; `hungAt` is set              | Terminal — no further transitions   |

**Server-side effect of `hung`:** the guardian push retry loop is cancelled immediately for all notifications on this alert.

---

## Duration tracking

The duration shown to the user is:

- **Active alert:** `now() − callStartedAt` (ticking every second)
- **Hung alert:** `hungAt − callStartedAt` (fixed)

### `effectiveCallStart` — graceful fallback

`callStartedAt` is nullable. For alerts created before the field existed, or when the APK has not been rebuilt after the field was added, it will be null. In that case the mobile client reconstructs an estimate:

```
effectiveCallStart = detectedAt − (callDuration × 1000 ms)
```

With `callDuration = 30` and `detectedAt = T+30s`, this gives `T+0s` — the actual call start. For hung alerts, the reconstructed estimate produces the same total-duration result as the real value would have.

---

## Guardian push retry mechanism

When an alert is created the backend starts a per-notification retry loop in `AlertsService`:

| Parameter        | Value                                          |
|------------------|------------------------------------------------|
| `INITIAL_RETRY_MS` | 30 000 ms (first retry 30 s after creation) |
| `RETRY_DECAY`    | 0.7 (each interval = previous × 0.7)          |
| `MIN_RETRY_MS`   | 10 000 ms (floor — never faster than 10 s)    |

Each retry:
1. Reloads the alert — if `status = "hung"` the loop stops.
2. Reloads the notification — if `seen = true` the loop stops.
3. Reloads the guardian's current FCM token (token may have rotated).
4. Sends FCM push.
5. Schedules next retry at `max(MIN_RETRY_MS, round(current × RETRY_DECAY))`.

The retry loop is keyed on `notificationId` and stored in `Map<string, NodeJS.Timeout>` inside `AlertsService`. A second index `Map<alertId, Set<notificationId>>` allows bulk cancellation when the alert becomes `"hung"`. `OnModuleDestroy` clears all timers on shutdown.

### Marking seen

`PATCH /api/alerts/notifications/:id/seen` sets `seen = true` and `seenAt`. The retry loop detects the flag on its next execution and stops without a separate cancellation step.

---

## Risk escalation

Risk level can be raised at any point during an active call. The current trigger is OTP SMS detection.

### Flow on the protected user's device

1. **Kotlin** (`CallDetectionForegroundService`) detects an OTP-pattern SMS while `isMonitoringCall = true`.
2. Emits `risk_escalated` via `DeviceEventEmitter` with payload:
   ```json
   { "riskLevel": "highest", "callerHash": "<sha256>", "callStartedAt": "<iso>", "detectedAt": "<iso>" }
   ```
3. **`callEventService.ts`** receives the event:
   - If `activeAlertId` is set → `PATCH /api/alerts/:id/risk` (escalate existing alert).
   - If `activeAlertId` is null (OTP arrived before the 30s threshold) → `POST /api/alerts` immediately with the escalated risk level; marks `activeAlertId`.
   - When the 30s `call_threshold_reached` fires and `activeAlertId` is already set, it is a no-op (no duplicate created).

### What the backend does on `PATCH /api/alerts/:id/risk`

1. Updates `riskLevel` on the alert row.
2. Loads all `AlertNotification` rows for the alert to get guardian IDs.
3. Sends an immediate FCM push to every guardian with a registered token (no retry scheduled — the existing retry loop already covers this alert).
4. Emits `alert_risk_changed` Socket.IO event to each guardian's room (`user:{guardianUserId}`).

### iOS note

On iOS, SMS interception via broadcast receivers is not available. Risk escalation from OTP detection must come from the transcript classifier (ONNX model) or other on-device signal. The JS layer (`callEventService.ts`) and backend are fully iOS-compatible — only the Kotlin emission needs a Swift equivalent.

---

## Real-time updates — WebSocket

The guardian's device maintains a persistent Socket.IO connection to receive instant updates without polling.

### Connection

```typescript
// apps/mobile/src/services/wsService.ts
const socket = io("http://<host>/guardian", {
  auth: { token: userId },   // token = userId (same as REST bearer)
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10_000,
});
```

The socket connects after `ensureAuthenticated()` resolves (guarantees the token exists). `connectWs()` is called in the `AppNavigator` bootstrap effect; it returns a cleanup function stored and called on unmount.

### Rooms

On connection the backend gateway (`GuardianEventsGateway`, namespace `/guardian`) does:

```kotlin
client.data.userId = token   // token is the userId
client.join("user:${token}")
```

All events are emitted to a room, never broadcast globally.

### Events received by the guardian

| Event                 | Payload                            | Action                        |
|-----------------------|------------------------------------|-------------------------------|
| `alert_status_changed`| `{ alertId, status }`             | Refresh `myAlerts` + `alertNotifications` |
| `alert_risk_changed`  | `{ alertId, riskLevel }`          | Refresh `myAlerts` + `alertNotifications` |
| `guardian-paired`     | `{ relationId, guardedUserId }`   | Guardian setup screen update  |
| `guardian-removed`    | `{ relationId }`                   | Guardian setup screen update  |

Both alert events trigger `DeviceEventEmitter.emit(ALERT_LIST_CHANGED_EVENT)` which the `AlertsScreen` listens to.

### iOS note

`socket.io-client` is pure JS and works identically on iOS. No platform-specific changes needed.

---

## AlertsScreen — real-time refresh

The screen re-fetches from three independent triggers:

| Trigger | Source | Queries invalidated |
|---------|--------|---------------------|
| Screen focus (`useFocusEffect`) | React Navigation | `myAlerts`, `alertNotifications` |
| `ALERT_LIST_CHANGED_EVENT` from `callEventService` | Protected user's own call events | `myAlerts`, `alertNotifications` |
| `ALERT_LIST_CHANGED_EVENT` from `wsService` | Guardian WS events (`alert_status_changed`, `alert_risk_changed`) | `myAlerts`, `alertNotifications` |
| `ALERT_LIST_CHANGED_EVENT` from `listenForForegroundMessages` | FCM push received while app is foregrounded | `myAlerts`, `alertNotifications` |

The listener is registered in `AlertsScreen` via `useEffect` on `queryClient` (stable reference), so it persists for the component's lifetime regardless of screen focus.

---

## AlertsScreen — card display

### Badges (top row)

Active and hung alerts both show two badge positions:

| Position | Content | When shown |
|----------|---------|------------|
| Left (always) | Risk level label (Low Risk, High Risk, etc.) in its risk colour | Always |
| Right of risk | `● LIVE` in orange | Active alerts only |

The risk level badge is never replaced by the live indicator — it always reflects the current `riskLevel` from the server, so a risk escalation shows immediately after the AlertsScreen refetches.

### Left bar colour

Orange (`#FF6F00`) while active; risk-level colour when hung. The card border and background also use orange for active alerts (distinct from risk colour).

### Duration

Shown in natural language: `"33 secs"`, `"1 min 33 secs"`, `"1 hour 32 mins"`. Internationalised via `alerts.durationSecs`, `alerts.durationMinsAndSecs`, `alerts.durationHoursAndMins` i18n keys (all three locales: en, ro, ru). Active alerts tick every second via a `setInterval` in `useLiveDuration`.

### Sorting within guardian groups

Groups (by protected user) are sorted alphabetically by label. Within each group, alerts are sorted by `callStartedAt ?? detectedAt` descending — most recent call on top.

---

## API reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/alerts` | Bearer | Create alert; fans out FCM and starts retry loop |
| `GET` | `/api/v1/alerts` | Bearer | List alerts for the authenticated user |
| `GET` | `/api/v1/alerts/notifications` | Bearer | List guardian notifications (with nested alert) |
| `PATCH` | `/api/v1/alerts/:id/status` | Bearer | Update alert status (`active`→`hung`); cancels retry loop |
| `PATCH` | `/api/v1/alerts/:id/risk` | Bearer | Escalate risk level; immediate FCM + WS push to guardians |
| `PATCH` | `/api/v1/alerts/notifications/:id/seen` | Bearer | Mark guardian notification as seen; stops retry for that notification |
