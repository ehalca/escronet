# Escronet — Claude Development Guide

Escronet is an on-device scam call prevention platform. It detects calls from unsaved contacts, transcribes in-call audio via on-device Whisper, classifies transcripts with an ONNX model, and fires a local notification if the call looks like a scam. Alerts can also be forwarded to designated contacts via the backend.

## Monorepo layout

| Workspace    | Path               | Stack                                   |
| ------------ | ------------------ | --------------------------------------- |
| Mobile app   | `apps/mobile/`     | React Native 0.76, Kotlin, ONNX Runtime |
| Backend API  | `apps/backend/`    | NestJS, TypeORM, PostgreSQL, tRPC       |
| Shared types | `packages/shared/` | tRPC router, Zod contracts              |

Package manager: **pnpm 9** with workspaces. Never use `npm` or `yarn`.

## Commands

```bash
# Development
pnpm dev:backend                                   # NestJS with hot reload
pnpm dev:android                                   # Build APK, install, start Metro

# Per-workspace
pnpm --filter @escronet/mobile start               # Metro bundler only
pnpm --filter @escronet/backend build              # Compile NestJS

# Type checking and lint (all workspaces)
pnpm typecheck
pnpm lint

# Kotlin compile check — always use this to verify native Android changes
cd apps/mobile/android && ./gradlew app:compileDebugKotlin
```

**Call detection is native-only**: All call detection logic lives in Kotlin (`CallDetectionForegroundService`, `CallStateBroadcastReceiver`). There is no JS/TS call detection layer. Do not re-introduce `callDetectionService.ts` or use `asForegroundService: true` in notifee. See [docs/android.md](docs/android.md).

**pnpm only**: This is a pnpm workspace. Running `npm install` will corrupt the lockfile.

## Reference docs

- [Architecture & data flow](docs/architecture.md) — system design, call detection pipeline, current build state
- [Actors](docs/actors.md) — human roles (USER, GUARDIAN, MODERATOR, ADMIN) and system roles (CALL_ANALYZER, MOBILE_SUPPORT, REMOTE_SUPPORT)
- [Risk levels](docs/risk-levels.md) — how a call's scam risk is classified (NONE → HIGHEST) and what triggers each level
- [Android native layer](docs/android.md) — Kotlin service, broadcast receiver, notifications, IDE gotchas
- [Mobile app](docs/mobile.md) — component contracts, native module interfaces, platform conventions
- [Call Processor](docs/call-processor.md) — background service risk-level handling and backend events
- [Analyzer](docs/analyzer.md) — audio chunk pipeline, language support, scam categories, Guardian service emission
- [Guardian Service](docs/guardian.md) — event processor for blocking calls, local alerts, and GUARDIAN notifications
- [Backend](docs/backend.md) — NestJS modules, tRPC, database, FCM
