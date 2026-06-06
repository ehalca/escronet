# Escronet — Development Plan

## What's Already Built

| Area | Status |
|---|---|
| Backend scaffolding (4 modules, controllers, services) | Done |
| Database schema + SQL migration | Done |
| TypeORM entities + repositories | Done |
| tRPC integration (health + auth routes) | Done |
| FCM push notification service | Done |
| Phone hashing utilities (E.164 + SHA-256) | Done |
| Mobile SQLite schema + delta upsert | Done |
| Detection pipeline orchestration service | Done |
| Shared types + Zod contracts | Done |
| Docker PostgreSQL setup | Done |

---

## Phase 1 — Call Trigger & Detection Entry Point

The core product mechanic: the app passively monitors calls and begins the scam detection pipeline only when a call from an **unsaved contact** exceeds a configurable time limit (`CALL_TRIGGER_LIMIT_SECONDS`). This keeps the detection targeted and avoids wasting resources on calls from known people or very short robocalls.

**1.1 — Contact presence check (Mobile)**
- On incoming/outgoing call start: resolve the caller's number against the device's native contact list
- If the number matches a saved contact → do nothing, call is trusted
- If the number is unknown → start the duration timer
- Use React Native Contacts (or the platform call API) to query the contact list

**1.2 — Duration timer & trigger event**
- Start a timer when an unsaved-contact call is detected
- If the call ends before `CALL_TRIGGER_LIMIT_SECONDS` → discard, no pipeline run
- If the call reaches `CALL_TRIGGER_LIMIT_SECONDS` → fire the detection pipeline
- If the call ends after the trigger → pipeline continues until call ends or scam detected
- `CALL_TRIGGER_LIMIT_SECONDS` is configurable via `.env` (suggest default: 30s)

**1.3 — Detection pipeline integration**
- On trigger event: call `DetectionPipeline.prewarm()` if not already warm
- Begin audio chunk loop: every `CHUNK_SECONDS` read a chunk → Whisper → Classifier
- Stop loop on: call end, scam confirmed, or explicit user dismiss

**1.4 — Auth & Security (Backend)**
- SMS OTP via Twilio/MessageBird: `requestOtp` sends real SMS, stores code with TTL
- Replace placeholder token with signed JWT (`sub`: phoneHash, `iat`, `exp`)
- `JwtAuthGuard` applied to: alerts, contacts, scam-number report endpoints
- `GET /scam-numbers/delta` stays public so devices can sync before first login

---

## Phase 2 — Mobile UI

The mobile shell has no screens. These need to be built in order.

**2.1 — Navigation scaffold**
- Bottom tab or stack navigator (React Navigation)
- Routes: Onboarding, Home, Settings, Alert history

**2.2 — Onboarding + Auth screens**
- Phone number entry (E.164 formatting, country picker)
- OTP input screen (6-digit code, auto-submit, resend timer)
- Calls tRPC `auth.requestOtp` / `auth.verifyOtp`
- Persists JWT to secure storage (MMKV or Keychain/Keystore)

**2.3 — Home / Status screen**
- Shows protection status (on/off toggle)
- Last sync time for scam number database
- Recent alerts summary

**2.4 — Settings screen**
- Designated contact setup (calls `PUT /api/contacts/designated`)
- Detection sensitivity slider (maps to `ESCRONET_SCAM_THRESHOLD`)
- `CALL_TRIGGER_LIMIT_SECONDS` setting (how long before pipeline starts)
- Clear local data / logout

**2.5 — Alert detail screen**
- Shows call metadata, score, transcript preview
- Triggered from local notification tap

---

## Phase 3 — Native Modules (Android)

TypeScript contracts exist; JNI/Kotlin bridges need to be written.

**3.1 — AndroidCallMonitorModule**
- Kotlin implementation hooking `android.telecom.InCallService`
- `startCallSession` / `stopCallSession` lifecycle management
- `readAudioChunk` — captures N seconds of in-call audio to a WAV file path
- Exposes call duration so Phase 1 timer logic can fire the trigger
- Requires `RECORD_AUDIO` + `READ_CALL_LOG` permissions

**3.2 — WhisperModule (Android)**
- Wrap Whisper.cpp via JNI
- Implement `prewarm()` to load model off the UI thread
- `transcribe(audioChunkPath)` — process WAV → text in <4s
- Bundle GGML model file in assets (tiny.en recommended for latency)

**3.3 — ClassifierModule (Android)**
- Wrap ONNX Runtime React Native
- Load ONNX model from app bundle
- `classifyTranscript` — tokenize + infer, return `{ label, score, modelVersion }`
- Target <500ms inference

**3.4 — End-to-end call flow (Android)**
- Wire CallMonitor → Phase 1 trigger logic → DetectionPipeline → AlertService
- On call start: check contacts (1.1), start timer (1.2)
- On trigger: prewarm Whisper, begin chunk loop (1.3)
- If `isScam`: POST alert to backend, fire local notification

---

## Phase 4 — Native Modules (iOS)

**4.1 — CallDirectory extension**
- Implement `IOSCallKitModule` via `CXCallDirectoryProvider`
- `syncBlockedHashes` writes to extension's shared database
- UI consent flow (Settings → Phone → Call Blocking & Identification)

**4.2 — Audio monitoring (iOS)**
- iOS does not allow in-call audio capture in the same way as Android
- Options: CallKit for call blocking only (no transcript), or investigate `RPSystemBroadcastPickerView`
- Decision needed before implementation starts

---

## Phase 5 — Background Sync (Mobile)

**5.1 — Delta sync scheduler**
- Background task using React Native Background Fetch or a headless task
- Reads `lastSyncAt` from MMKV, calls `GET /api/scam-numbers/delta?updatedSince=...`
- Upserts results into SQLite via `upsertScamHash`
- Updates `lastSyncAt` on success

**5.2 — Foreground sync on launch**
- On app foreground: trigger sync if last sync was >1h ago

---

## Phase 6 — Notifications (Mobile)

**6.1 — Local scam-detected notification**
- Use `@notifee/react-native` to fire a high-priority notification when `isScam` is true
- Notification tap opens Alert detail screen

**6.2 — FCM push for contact alerts**
- The backend already sends FCM pushes to designated contacts
- Mobile needs to handle incoming FCM data messages
- Show notifee notification with "Your contact may be on a scam call" content

---

## Phase 7 — Testing

**7.1 — Backend unit tests**
- `AuthService`: OTP generation, expiry, JWT sign/verify
- `ScamNumbersService`: delta query, report ingestion
- `AlertsService`: FCM trigger logic, contact lookup
- Hash utilities

**7.2 — Backend integration tests**
- Spin up test Postgres (testcontainers or in-memory)
- Full HTTP roundtrip tests for each endpoint
- Auth guard enforcement

**7.3 — Mobile unit tests**
- `ScamNumberStore`: upsert, hash, normalizer
- `DetectionPipeline`: mock native modules, test orchestration logic
- Phase 1 trigger logic: timer, contact check, pipeline entry
- `AlertService`: mock fetch, test error handling

**7.4 — E2E / snapshot tests**
- Screen-level tests with React Native Testing Library
- At minimum: Onboarding flow, Settings contact entry

---

## Phase 8 — Observability & Polish

**8.1 — Structured logging (Backend)**
- Replace `console.log` with NestJS `Logger` consistently
- Add request/response logging middleware
- Error tracking (Sentry or equivalent)

**8.2 — Swagger / OpenAPI**
- Add `@nestjs/swagger` decorators to controllers
- Serve docs at `/api/docs`

**8.3 — TypeORM migrations runner**
- Add a migration CLI script so `001_init.sql` runs automatically on deploy
- Add a `db:migrate` npm script

**8.4 — CI pipeline**
- GitHub Actions: typecheck + lint + test on PR
- Separate jobs for backend and mobile
- Docker build check for backend

---

## Dependency Order

```
Phase 1 (Call trigger + Auth)
    └── Phase 2.2 (Auth screens)
            └── Phase 2.1, 2.3, 2.4, 2.5 (rest of mobile UI)

Phase 3.1 (AndroidCallMonitorModule)
    └── Phase 1 trigger wiring (1.2, 1.3)
            └── Phase 3.4 (end-to-end call flow)
                    └── Phase 6.1 (local notifications)

Phase 5 (Background sync) — parallel with Phase 3

Phase 4 (iOS) — parallel with Phase 3, decision needed on audio first

Phase 7 (Tests) — rolling; unit tests alongside each phase
Phase 8 (Observability) — rolling; start after Phase 1 backend is stable
```

---

## Open Decisions

| Decision | Options | Notes |
|---|---|---|
| SMS provider | Twilio, MessageBird, Vonage | Twilio most widely documented |
| JWT algorithm | HS256 (symmetric), RS256 (asymmetric) | HS256 simpler; RS256 better if other services need to verify |
| OTP storage | In-memory Map, Redis | Redis needed for multi-instance deploys |
| `CALL_TRIGGER_LIMIT_SECONDS` default | 20s, 30s, 60s | Shorter = more sensitive but more false positives |
| iOS audio | CallKit block-only, RPSystemBroadcastPickerView | iOS sandboxing limits options significantly |
| Whisper model size | tiny.en, base.en, small.en | Larger = better accuracy, slower; tune to target <4s |
| ONNX model training | Pre-trained scam classifier needed | Where does the model come from? |
