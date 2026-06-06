# Escronet

On-device scam call prevention platform with an Android-first React Native app and a focused NestJS backend for number sync and emergency alert fanout.

## 1) Architecture Summary

### Platform

- **Mobile:** React Native (cross-platform)
- **Primary platform:** Android (full feature support)
- **iOS limitations:** scam number blocking + contact alerting only
  - Live call audio analysis is not possible on iOS due to platform sandboxing/telephony restrictions.

### Native Modules

- **Android**
  - `CallMonitorModule` (InCallService + speakerphone path)
  - `WhisperModule` (Whisper.cpp via JNI)
  - `ClassifierModule` (MobileBERT/DistilBERT via ONNX Runtime)
- **iOS**
  - `CallKitModule` (call blocking / block list sync)
  - `WhisperModule` (Swift bridge for local transcription support where applicable)

### On-Device Audio + Detection Pipeline

1. On call connect, pre-warm Whisper (one-time target: <3s).
2. Capture audio in **20-30 second chunks** (default: 20s) with no keyword pre-filter.
3. Run Whisper.cpp STT per chunk (target: <4s for 20s chunk).
4. Run ONNX classifier (target: <500ms).
5. If score >= threshold (default: 0.75), trigger alert flow.

No audio or transcript leaves the device.

### Scam Number Database Model

- Device DB uses SQLite.
- Numbers are normalized to E.164 then SHA-256 hashed.
- Only hashes are stored/synced; never raw phone numbers.
- Delta sync uses `updated_since` checkpoints.

### Cloud Responsibilities (Narrow Scope)

Cloud never receives audio/transcripts/classification artifacts. It handles only:

- Scam number master DB + delta sync
- Community report ingestion
- OTP auth
- Designated contact management + FCM token storage
- Push dispatch to designated contacts
- Alert history logging

### Backend Modules

- `AuthModule` (phone OTP)
- `ScamNumbersModule` (delta sync + reports)
- `ContactsModule` (designated contacts + FCM tokens)
- `AlertsModule` (ingest alert and fan out FCM)

### Performance Targets

- Whisper cold start: <3s
- 20s chunk processing: <4s
- Classifier inference: <500ms
- Alert -> designated contact notified: <5s

### Privacy and Safety

- Audio processing on-device only.
- No call recordings persisted.
- No raw phone numbers in synced scam DB.
- iOS speakerphone workaround requires explicit user consent.

## 2) Repository Layout

```
.
├─ apps/
│  ├─ mobile/                # React Native app + native module contracts
│  │  ├─ src/native/modules.ts
│  │  ├─ src/services/detectionPipeline.ts
│  │  ├─ src/services/alertService.ts
│  │  └─ src/storage/scamNumberStore.ts
│  └─ backend/               # NestJS API + Postgres integration
│     ├─ src/modules/auth/
│     ├─ src/modules/scam-numbers/
│     ├─ src/modules/contacts/
│     ├─ src/modules/alerts/
│     ├─ src/entities/
│     └─ migrations/001_init.sql
├─ packages/
│  └─ shared/                # Shared types/contracts
├─ docker-compose.yml        # Local Postgres
├─ package.json              # Workspace root scripts
└─ pnpm-workspace.yaml
```

## 3) What Is Scaffolded in This Starter

### Mobile (`apps/mobile`)

- Basic RN entrypoint + app shell
- Native module interfaces for:
  - Android call monitor
  - Whisper STT
  - ONNX classifier
  - iOS CallKit blocklist sync
- `DetectionPipeline` service with threshold-based scam evaluation
- Local SQLite scam hash table bootstrap + upsert methods
- `alertService` for posting detections to backend `/alerts`

### Backend (`apps/backend`)

- Nest app bootstrap (`/api` prefix + validation pipes)
- TypeORM entities for:
  - `scam_numbers`
  - `scam_reports`
  - `designated_contacts`
  - `scam_alerts`
- Module scaffolds and endpoints:
  - `POST /api/auth/otp/request`
  - `POST /api/auth/otp/verify`
  - `GET /api/scam-numbers/delta?updatedSince=...`
  - `POST /api/scam-numbers/reports`
  - `PUT /api/contacts/designated`
  - `GET /api/contacts/designated?ownerUserId=...`
  - `POST /api/alerts`
- FCM service with runtime flag (`FCM_ENABLED=true|false`)
- Initial SQL migration

### Shared Package (`packages/shared`)

- Shared TypeScript types for scam delta records + alert payloads

## 4) Local Development Setup

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop (for local Postgres)
- Android Studio + SDK (for Android app)
- Java 17+
- Xcode (only if building iOS)

## Install Dependencies

```bash
pnpm install
```

## Start Postgres

```bash
docker compose up -d
```

## Configure Environment

1. Copy env templates:

```bash
copy apps\backend\.env.example apps\backend\.env
copy apps\mobile\.env.example apps\mobile\.env
```

2. Update values as needed.

## Run DB Migration

Apply `apps/backend/migrations/001_init.sql` to your Postgres instance.

Example:

```bash
docker exec -i escronet-postgres psql -U escronet -d escronet < apps/backend/migrations/001_init.sql
```

## Run Backend

```bash
pnpm dev:backend
```

Backend base URL: `http://localhost:3000/api`

## Run Mobile (Android)

```bash
pnpm --filter @escronet/mobile start
pnpm --filter @escronet/mobile android
```

Use `10.0.2.2` as API host from Android emulator.

## 5) Implementation Checklist (Next)

1. Implement Android native modules:
   - `CallMonitorModule` audio chunk capture on-call
   - JNI bridge for Whisper.cpp model lifecycle
   - ONNX Runtime classifier bridge + model loading
2. Implement iOS CallKit blocklist sync and consent UX.
3. Add OTP provider integration (Twilio/MessageBird/etc.).
4. Replace auth token placeholder with JWT strategy.
5. Add TypeORM migrations pipeline and migration runner script.
6. Add API auth guards + per-user access checks.
7. Add background delta sync scheduler in mobile.
8. Add local notifications via `@notifee/react-native`.
9. Add tests:
   - backend unit/integration tests
   - mobile service tests for pipeline thresholds and sync logic

## 6) API Contracts (Current Stub)

### `GET /api/scam-numbers/delta`

Query:

- `updatedSince` (ISO date, required)
- `limit` (optional, default 1000, max 5000)

Response:

```json
{
  "records": [
    {
      "phoneHash": "<sha256>",
      "confidence": 87,
      "reportCount": 42,
      "source": "community",
      "updatedAt": "2026-06-05T08:41:00.000Z"
    }
  ]
}
```

### `POST /api/alerts`

Body:

```json
{
  "userId": "user_123",
  "callId": "call_abc",
  "score": 0.92,
  "transcriptPreview": "...",
  "detectedAt": "2026-06-05T09:00:00.000Z"
}
```

Response:

```json
{
  "accepted": true,
  "contactNotified": true
}
```

## 7) Notes on iOS Capability Boundaries

- iOS cannot run Android-style continuous in-call audio interception.
- iOS support in this architecture should focus on:
  - number blocking via CallKit extension
  - syncing known scam hashes
  - user and designated-contact alerting flows

## 8) Security Notes

- Keep all model inference on-device.
- Avoid logging transcript payloads in production telemetry.
- Hash numbers client-side before report submission when possible.
- Consider app attestation and token binding for alert endpoint hardening.
