# Mobile App

This document describes the mobile app's responsibilities, component contracts, and conventions. It is platform-agnostic — implementation details for each platform live in [android.md](android.md) and _(future)_ `ios.md`. Both platform implementations follow the naming and structural conventions defined here.

---

## Components

Corresponds to the deployable breakdown in [architecture.md](architecture.md#2-mobile-android-first).

### Call Processor — Background service (2.1.1.1)

Registered with the OS to receive call lifecycle events regardless of whether the app is in the foreground, background, or not running. On `RINGING`, performs an immediate risk assessment using pre-known data and either short-circuits (block or pass) or hands off to the Analyzer.

See [call-processor.md](call-processor.md) for the full contract including risk-level decision tree and backend events.

### Call Processor — Analyzer (2.1.1.2)

Evaluates signals as a call progresses and refines the risk level. Corresponds to the CALL_ANALYZER system actor.

See [analyzer.md](analyzer.md) for the full contract.

Risk level can only increase during a call's lifetime. See [risk-levels.md](risk-levels.md) for the full signal-to-level mapping.

### Guardian service (2.1.2)

Takes protective actions in response to risk level changes. Corresponds to the MOBILE_SUPPORT system actor.

**Contract:**

| Risk level | Required action                                                                      |
| ---------- | ------------------------------------------------------------------------------------ |
| LOWER      | Show persistent "Unknown caller" notification after 7 seconds from answer.           |
| LOW        | Update notification to reflect analysis in progress.                                 |
| MEDIUM     | Escalate notification urgency. Inform USER that the number has community reports.    |
| HIGH       | Fire high-priority alert notification. Upload alert payload to backend.              |
| HIGHEST    | Confirm GUARDIAN was notified (via REMOTE_SUPPORT). Update notification accordingly. |

The Guardian service does not evaluate signals itself — it only acts on levels assigned by the Analyzer.

### UI (2.1.3)

Handles all USER-facing configuration and information surfaces.

**Responsibilities:**

- App onboarding and permission requests.
- GUARDIAN setup (nominate a designated contact).
- Protection status toggle.
- Local alert history and call stats.
- Settings: detection sensitivity, `CALL_TRIGGER_LIMIT_SECONDS`, account management.

### Migration service (2.1.4)

Keeps on-device data in sync with the backend.

**Responsibilities:**

- Periodically fetch scam-number delta updates from `GET /scam-numbers/delta` and upsert into the local hash store.
- Trigger a sync on app foreground if the last sync exceeds a staleness threshold.
- Receive and apply ONNX classifier model updates.
- Persist `lastSyncAt` to survive app restarts.

---

## Native module interfaces

The following interfaces are consumed by JS/TS orchestration logic. Platform implementations must satisfy these contracts exactly — name and signature are shared across platforms.

**CallMonitorModule**

- `startCallSession(callId)` — begin audio capture for the given call.
- `stopCallSession(callId)` — end capture and release resources.
- `readAudioChunk(callId, seconds)` → file path of WAV chunk.

**WhisperModule**

- `prewarm()` — load the Whisper model off the main thread.
- `transcribe(audioChunkPath)` → transcript string.

**ClassifierModule**

- `classifyTranscript(transcript)` → `{ label: "scam" | "legit", score: number, modelVersion: string }`.

**EventReportingModule**

- `reportEvent(eventName, payload)` — send structured event data to the backend for analytics and model training. See [events.md](events.md) for the event taxonomy and payload schemas.

**DBModule**

- `getScamNumbers()` → array of phone numbers.

---

## Platform conventions

Both Android and iOS implementations follow these conventions so that the codebase is consistent and the platform docs can be read side by side.

**Naming:**

- Component names map directly to the architecture names: `CallDetectionService`, `CallAnalyzer`, `GuardianService`, `MigrationService`.
- Native module class names match the interface names above: `CallMonitorModule`, `WhisperModule`, `ClassifierModule`.
- Notification channel identifiers are shared constants: `call_monitoring`, `call_alerts`.
- Risk level identifiers are uppercase string constants: `NONE`, `LOWER`, `LOW`, `MEDIUM`, `HIGH`, `HIGHEST`.

**Structure:**

- Where the platform allows, each architecture component maps to a single class or service.
- Platform-specific lifecycle mechanics (foreground service vs. background task, broadcast receiver vs. CallKit) are encapsulated inside the component — the interface exposed to other components does not change.

Deviations from these conventions must be documented in the relevant platform file with a reason.

## App use cases

First start:

1. USER opens app → app registers anonymous device with backend and send FCM token if available.

On app foreground:

1. Migration service sends lastSyncAt to backend and fetches scam number updates if necessary.

UI:

1. App has a bottom tab navigator with "Home", "Alerts", and "Settings" tabs.
2. Home tab shows current protection status and a toggle to enable/disable protection.
3. Alerts tab shows a list of past call alerts with details and outcomes.
4. Settings tab allows GUARDIAN setup, sensitivity adjustment, and account management.
   4.1 GUARDIAN setup prompts the USER to nominate a trusted contact, if positive, renders a QR code to be scanned by the GUARDIAN's app for linking.
   4.2 Checks if GUARDIAN is linked and shows linked contact info or prompts to link if not.
