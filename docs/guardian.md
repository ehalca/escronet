# Guardian Service

The Guardian Service is the mobile event processor that sits between the [Analyzer](analyzer.md), the [Background service](call-processor.md), and the user-facing layer. It acts as both an **event emitter** (produces notifications and backend events) and an **event processor** (routes incoming signals to the correct action). It is the single authority over local notification display and call-blocking on-device.

---

## Event overview

| Event | Source | Action |
|---|---|---|
| `GUARDIAN_REQUEST_BLOCK` | GUARDIAN human actor (via backend push) | Hang / deny the current call |
| `BLOCK_CALL_AUTO` | Background service (Call Processor) | Hang / deny the current call, notify USER, emit `CALL_BLOCKED` to backend |
| `ALERT_LOCAL` | Internal (produced by this service) | Display a local notification to the USER |
| `ON_ANALYZER_LOCAL_RESULT` | Analyzer | Route to `ALERT_LOCAL` and/or escalation based on result risk level |

---

## Events in detail

### `GUARDIAN_REQUEST_BLOCK`

Triggered by an explicit action taken by the GUARDIAN human actor. The backend translates the GUARDIAN's in-app action into a push message to the USER's device, which fires this event.

**Actions (in order):**

1. Hang / deny the current ongoing call at the OS level.
2. Emit `ALERT_LOCAL` — show a notification: `"Call ended — blocked by your designated contact"`.

No backend event is emitted by this path; the GUARDIAN's action was already recorded server-side when it was initiated.

---

### `BLOCK_CALL_AUTO`

Triggered by the Background service when the Call Processor determines the call should be rejected automatically (risk level HIGHEST). See [call-processor.md](call-processor.md) for the conditions under which this event is fired.

**Actions (in order):**

1. Hang / deny the current ongoing call at the OS level.
2. Emit `ALERT_LOCAL` — show a local notification to USER:

   > **"Call blocked — this number is a known scammer"**
   >
   > Action: **Unblock**

3. Emit `CALL_BLOCKED` to backend (payload: caller number hash, timestamp).
4. Backend notifies GUARDIAN via FCM if one is configured.

**If USER taps Unblock:**

- Release the block for this number on this device.
- Emit `LOCAL_PHONE_UN_BLOCK` to backend.
- If GUARDIAN is configured → emit `NOTIFY_GUARDIAN_LOCAL_UN_BLOCK` to backend.
- When GUARDIAN's device acknowledges the unblock notification → emit `NOTIFY_GUARDIAN_LOCAL_UN_BLOCK_READ`.

---

### `ALERT_LOCAL`

Produced internally by the Guardian Service in response to other events. Displays a local notification to the USER. The content and urgency of the notification are determined by the context that generated it (see individual event sections above and the `ON_ANALYZER_LOCAL_RESULT` section below).

#### Retry policy

Notifications emitted for a risk level **above MEDIUM** (i.e. HIGH or HIGHEST) must be retried with a parametrised exponential backoff until the notification is acknowledged (`ACKED`).

| Parameter | Description |
|---|---|
| `ALERT_RETRY_INITIAL_DELAY_MS` | Wait before the first retry attempt. Configurable. Default TBD. |
| `ALERT_RETRY_MULTIPLIER` | Backoff multiplier applied on each retry. Configurable. Default TBD. |
| `ALERT_RETRY_MAX_DELAY_MS` | Upper bound on the delay between retries. Configurable. Default TBD. |
| `ALERT_RETRY_MAX_ATTEMPTS` | Maximum number of retry attempts before giving up. Configurable. Default TBD. |

An `ALERT_LOCAL` is considered `ACKED` when:

- The USER interacts with the notification (taps it, dismisses it, or taps an action), **or**
- The call ends while the notification is visible.

Notifications for MEDIUM and below are fire-and-forget — they are not retried.

---

### `ON_ANALYZER_LOCAL_RESULT`

Emitted by the Analyzer after each audio chunk is evaluated. The Guardian Service inspects the `riskLevel` field of the result and takes the corresponding action.

**Result payload** (from [analyzer.md](analyzer.md)):

| Field | Description |
|---|---|
| `riskLevel` | `LOWER` / `LOW` / `MEDIUM` / `HIGH` |
| `category` | Matched scam category, or `null` |
| `score` | Classifier confidence (0.0 – 1.0) |
| `language` | Detected language code, or `LANG_UNSUPPORTED` |
| `transcriptSnippet` | Short transcript excerpt |
| `chunkIndex` | Sequence number within this call |

**Routing by risk level:**

| Risk level | Action |
|---|---|
| `LOWER` | No action. Guardian Service records the result internally. |
| `LOW` | No action. Guardian Service records the result internally. |
| `MEDIUM` | Emit `ALERT_LOCAL` — notify USER: `"Possible scam call — stay cautious"`. Fire-and-forget (no retry). |
| `HIGH` | Emit `ALERT_LOCAL` — notify USER: `"Scam call detected"` (retried with backoff until `ACKED`). Upload alert payload to backend (`POST /alerts`): caller hash, `score`, `transcriptSnippet`, `category`, timestamp. Backend escalates to GUARDIAN if configured. |

When the Analyzer stops the loop on `riskLevel == HIGH`, the Guardian Service takes over as the sole active monitor for the remainder of the call.

---

## Backend events emitted

| Event | Trigger | Payload |
|---|---|---|
| `CALL_BLOCKED` | `BLOCK_CALL_AUTO` handled | caller number hash, timestamp |
| `LOCAL_PHONE_UN_BLOCK` | USER tapped Unblock on a blocked-call notification | caller number hash, timestamp |
| `NOTIFY_GUARDIAN_LOCAL_UN_BLOCK` | GUARDIAN notified of USER unblock | caller number hash, GUARDIAN ID, timestamp |
| `NOTIFY_GUARDIAN_LOCAL_UN_BLOCK_READ` | GUARDIAN's device acknowledged the unblock notification | caller number hash, GUARDIAN ID, timestamp |

---

## Open questions

| Question | Notes |
|---|---|
| `ALERT_RETRY_INITIAL_DELAY_MS` default | Suggested starting point: 5 000 ms. |
| `ALERT_RETRY_MULTIPLIER` default | Suggested starting point: 2× (doubles each attempt). |
| `ALERT_RETRY_MAX_DELAY_MS` default | Cap to avoid notification spam. Suggested: 60 000 ms. |
| `ALERT_RETRY_MAX_ATTEMPTS` default | What happens after all retries are exhausted? Silent drop or fallback escalation? |
| MEDIUM notification wording | Should MEDIUM mention the number has been reported, or keep it generic? |
| ACKED on call end — partial interaction | If the call ends between retry attempts, is the in-flight notification still shown? |
| `GUARDIAN_REQUEST_BLOCK` delivery | If the push arrives after the call has already ended, should the event be silently discarded or logged? |
