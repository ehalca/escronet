# Call Risk Levels

A call is assigned exactly one risk level at any point in time. The level can only escalate during a call — it never decreases. Each level is a superset of the conditions below it.

## Quick reference

| Level | Name | One-line description |
|---|---|---|
| 0 | **NONE** | Caller is a saved contact. Call is trusted. |
| 1 | **LOWER** | Caller is not in contacts. Analysis pipeline begins. |
| 2 | **LOW** | Call has structural scam indicators (duration, crowd signal). |
| 3 | **MEDIUM** | Number appears in unverified community reports. |
| 4 | **HIGH** | Number is verified as scam and/or on-device classifier confirms scam topic. |
| 5 | **HIGHEST** | HIGH confirmed and designated contact has been notified. |

---

## Level 0 — NONE

**The call is safe. No action required.**

### Triggering conditions
- Caller's phone number matches a saved contact in the device's native contact list.

### System response
- Call detection service remains active but takes no further action for this call.
- No notification is shown.
- Detection pipeline does not start.

### Data sources
- Device contact list (ContactsContract on Android).

---

## Level 1 — LOWER

**The call is suspicious enough to warrant monitoring. Analysis begins.**

### Triggering conditions
- Caller's phone number does NOT match any saved contact.

### System response
- Call detection service starts the duration timer.
- At 7 seconds after the call is answered, a local notification is shown: "Unknown caller — not in your contacts".
- Detection pipeline is queued for prewarm (Whisper model load begins in background).

### Data sources
- Device contact list (absence of match).

### Notes
- This is the entry point for all further risk escalation.
- Every call that is not NONE starts here and may escalate to LOW or higher as more signals arrive.

---

## Level 2 — LOW

**The call has structural characteristics consistent with scam calls.**

Requires: all conditions from LOWER, plus at least one of the following signals.

### Triggering conditions (signals)
- **Duration signal**: The call (from an unsaved contact) has exceeded `CALL_TRIGGER_LIMIT_SECONDS`. Exact threshold to be determined after investigation — longer unsaved-contact calls are statistically more likely to be scam attempts. Suggested starting range: 20–60 seconds.
- **Crowd signal**: The caller's hashed number exists in the local `scam_numbers` SQLite table with a `report_count` above a minimum threshold, meaning other users of the system have also received calls from this number and not recognised it as a contact.

### System response
- Detection pipeline activates: audio chunk loop begins (Whisper transcription + ONNX classifier per chunk).
- If duration signal triggered: start the Whisper/ONNX analysis loop.
- User may see a persistent in-call notification indicating the call is being analysed.

### Data sources
- Call duration (in-call timer from `AndroidCallMonitorModule`).
- Local SQLite `scam_numbers` table (`report_count`, `confidence` columns), kept up to date via background delta sync from the backend.

### Open questions
- Exact value of `CALL_TRIGGER_LIMIT_SECONDS` — investigate distribution of legitimate vs scam call durations.
- Minimum `report_count` threshold to count as a crowd signal.
- Whether `confidence` from `ScamNumberEntity` alone (without a `report_count` threshold) should trigger LOW.

---

## Level 3 — MEDIUM

**The number has been reported as suspicious by community members but not yet verified by a moderator.**

Requires: all conditions from LOW, plus at least one of the following signals.

### Triggering conditions (signals)
- **Unverified report signal**: The caller's hashed phone number appears in the backend `scam_reports` table with status `UNVERIFIED` — meaning real users submitted reports against this number but a human/automated verification step has not yet confirmed them.

### System response
- Detection pipeline continues (if not already running, it starts now).
- Notification urgency increases — user sees a clearer warning that this number has been reported.
- Alert is staged for potential upload to backend on call end.

### Data sources
- Backend `scam_reports` table (`status = UNVERIFIED`). Data must be synced to the device (either via delta sync or a real-time lookup).

### Open questions
- Minimum number of unverified reports to count as a signal (single report vs. quorum).
- Whether MEDIUM can be reached without first passing through LOW, or if LOW conditions are always required.
- Sync strategy: delta sync (periodic) vs. real-time lookup per call (latency vs. freshness trade-off).

### Data model gap
`ScamReportEntity` currently has no `status` field. A `status` column (`UNVERIFIED` | `VERIFIED` | `DISMISSED`) must be added to `scam_reports` before this level can be implemented.

---

## Level 4 — HIGH

**Strong evidence that the call is a scam. Immediate action warranted.**

Requires: all conditions from MEDIUM, plus at least one of the following signals.

### Triggering conditions (signals)
- **Verified report signal**: The caller's hashed number exists in the backend `scam_reports` table with status `VERIFIED` — confirmed as a scam number by moderation or automated verification pipeline.
- **Classifier signal**: The on-device ONNX classifier has analysed a transcript chunk and returned `label = "scam"` with `score >= HIGH_CLASSIFIER_THRESHOLD`. Suggested starting threshold: `0.75` (configurable via settings).

### System response
- High-priority local notification fires immediately: "Scam call detected".
- Detection pipeline may continue running to gather further evidence.
- Alert payload is uploaded to the backend (`POST /alerts`) containing: call ID, classifier score, transcript preview, timestamp.
- Score and transcript preview are stored in `scam_alerts` table.

### Data sources
- Backend `scam_reports` table (`status = VERIFIED`), synced to device.
- On-device ONNX classifier (`ClassifierModule.classifyTranscript`), score from `DetectionPipeline.evaluateChunk`.

### Open questions
- `HIGH_CLASSIFIER_THRESHOLD` exact value — tune against real call data. Proposed default: `0.75`.
- Whether a single chunk above threshold is sufficient, or a rolling average over N chunks is more robust.
- Whether VERIFIED report alone (without classifier confirmation) is enough for HIGH, or if both signals should be required.

### Data model gap
Same `status` field on `ScamReportEntity` required (shared with MEDIUM).

---

## Level 5 — HIGHEST

**The scam is confirmed and the designated responsible contact has been alerted.**

Requires: all conditions from HIGH, plus the following action having been taken.

### Triggering conditions (signals)
- A `BLOCK` (alert) notification has been successfully dispatched to the user's designated contact via FCM push notification.

### System response
- The designated contact receives a FCM push notification: "Your contact may be on a scam call".
- Backend logs the FCM dispatch against the alert record.
- The user's in-app notification is updated to confirm that the designated contact has been reached.
- No further escalation is possible.

### Data sources
- `designated_contacts` table — resolved to FCM token for push delivery.
- `scam_alerts` table — the triggering HIGH-level alert.
- FCM delivery receipt from `FcmService`.

### Open questions
- Delivery confirmation: FCM does not guarantee delivery. Should HIGHEST only be set on confirmed FCM receipt, or on dispatch attempt?
- What happens if the designated contact has no registered device / FCM token?
- Should the user be able to silence HIGHEST escalation (i.e., opt out of alerting their designated contact)?

---

## Signal summary

| Signal | Level reached | Source |
|---|---|---|
| Number NOT in contacts | LOWER | Device ContactsContract |
| Call duration > `CALL_TRIGGER_LIMIT_SECONDS` | LOW | In-call timer |
| Number in local scam DB with enough reports | LOW | SQLite `scam_numbers` (synced from backend) |
| Number in `scam_reports` with `UNVERIFIED` status | MEDIUM | Backend `scam_reports` (synced or queried) |
| Number in `scam_reports` with `VERIFIED` status | HIGH | Backend `scam_reports` (synced or queried) |
| Classifier score >= `HIGH_CLASSIFIER_THRESHOLD` | HIGH | On-device ONNX `ClassifierModule` |
| FCM dispatch to designated contact confirmed | HIGHEST | Backend `FcmService` |

---

## Escalation rules

- A call always starts at NONE or LOWER, depending on contact status.
- Levels only move upward during a call's lifetime.
- Multiple signals from the same level do not produce a higher level on their own.
- Reaching a level's conditions is sufficient to escalate — satisfying every listed signal is not required (signals are OR, not AND, unless noted).

---

## Open decisions

| Decision | Notes |
|---|---|
| `CALL_TRIGGER_LIMIT_SECONDS` | Default range 20–60s. Tune after analysis of call duration data. |
| `HIGH_CLASSIFIER_THRESHOLD` | Proposed default `0.75`. Tune against real scam/legit call transcripts. |
| Minimum `report_count` for crowd signal (LOW) | Needs data before a sensible default can be set. |
| Unverified report quorum (MEDIUM) | How many UNVERIFIED reports before the signal counts? |
| `status` field on `ScamReportEntity` | Must be added to schema before MEDIUM and HIGH can be implemented. |
| Sync strategy for report status | Periodic delta sync vs. per-call API lookup. |
| Classifier confidence: single chunk vs. rolling average | Affects false positive rate. |
