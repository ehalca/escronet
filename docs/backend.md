# Backend

## Structure

```
apps/backend/src/
├── main.ts                       ← bootstrap, port 3010, global prefix /api
├── app.module.ts                 ← root module, TypeORM connection
├── common/
│   └── zod-validation.pipe.ts   ← per-param ZodValidationPipe
├── controllers/
│   └── health.controller.ts     ← GET /api/ping, GET /api/health
├── gateway/
│   ├── guardian-events.gateway.ts ← Socket.IO gateway, namespace /guardian
│   └── guardian-events.module.ts
├── entities/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts   ← POST /api/auth/register
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── alerts/
│   │   ├── alerts.controller.ts ← alert CRUD + status/risk updates
│   │   ├── alerts.service.ts    ← retry loop, WS emission
│   │   └── alerts.module.ts
│   └── callers/
│       ├── callers.controller.ts ← GET /api/callers/delta
│       ├── callers.service.ts
│       └── callers.module.ts
```

## API

All routes are prefixed with `/api`. Request validation uses `ZodValidationPipe` applied per-parameter, backed by the Zod schemas in `packages/shared`.

| Method | Path                                    | Description                                                        |
| ------ | --------------------------------------- | ------------------------------------------------------------------ |
| GET    | `/api/ping`                             | Health check — returns `{ message, timestamp }`                    |
| GET    | `/api/health`                           | Readiness check — returns `{ ok: true }`                           |
| POST   | `/api/v1/auth/register`                 | Register device, returns `{ token, userId }`                       |
| GET    | `/api/v1/callers/delta`                 | Caller delta sync since `lastSyncDate`                             |
| POST   | `/api/v1/alerts`                        | Create alert from device; fans out FCM to guardians, starts retry  |
| GET    | `/api/v1/alerts`                        | List alerts belonging to the authenticated user                    |
| GET    | `/api/v1/alerts/notifications`          | List guardian notifications for the authenticated user             |
| PATCH  | `/api/v1/alerts/:id/status`             | Update alert status (`hung`); cancels guardian push retry loop     |
| PATCH  | `/api/v1/alerts/:id/risk`               | Escalate risk level; immediate FCM + WS push to all guardians      |
| PATCH  | `/api/v1/alerts/notifications/:id/seen` | Mark a guardian notification as seen; stops its retry              |
| DELETE | `/api/v1/guardians/:id`                 | Remove a guardian relation (protected user removes guardian)       |
| DELETE | `/api/v1/guardian-links/:id`            | Cancel a pending (unscanned) guardian invite link                  |

See [alerts.md](alerts.md) for full alert lifecycle, retry mechanism, and real-time update details.

## Server–client contract

There is no tRPC. The backend exposes plain REST endpoints. Type safety is maintained through `packages/shared`:

- **Zod schemas** in `packages/shared/src/schemas/` define request and response shapes.
- **Controllers** validate incoming requests using `ZodValidationPipe(schema)` applied to `@Body()` or `@Query()` parameters.
- **Clients** (mobile, frontend) call the backend through `createApiClient` from `packages/shared/src/api/client.ts`, which parses responses with the same schemas.

Adding a new endpoint:
1. Define or reuse a schema in `packages/shared/src/schemas/`.
2. Create or update the controller in `apps/backend/src/modules/<name>/`.
3. Register the controller in its module.
4. Expose the route in `createApiClient` in `packages/shared/src/api/client.ts`.

## Auth flow (scaffolded — not production-ready)

1. Client calls `POST /api/auth/register` with `{ deviceId, fcmToken? }`
2. Server upserts the user record and returns `{ token, userId }` (token is the user ID for now; Firebase JWT verification replaces this later)
3. Client stores the token in MMKV and attaches it as `Authorization: Bearer <token>` on subsequent requests

## Database

PostgreSQL via TypeORM. Connection configured in `app.module.ts` from environment variables. `synchronize: true` is enabled for development — replace with explicit migrations before production.

For local development: `docker compose -f local-docker-compose.yml up -d` starts PostgreSQL on port 5432.

## Alerts module

See [alerts.md](alerts.md) for the full alert lifecycle. Summary:

`POST /api/v1/alerts` is the central fan-out path. When the device posts a new alert:

1. Alert entity is saved with `callerHash`, `riskLevel`, `callDuration`, `callStartedAt`, `detectedAt`, `status = "active"`.
2. All `GuardianRelation` rows for the user are loaded to find configured guardians.
3. An `AlertNotification` row is created for each guardian.
4. An FCM push is sent to each guardian; on success `delivered = true`.
5. A per-notification retry loop starts (30s initial, ×0.7 decay, 10s floor). Stops when the notification is marked seen or the alert becomes `"hung"`.

`PATCH /api/v1/alerts/:id/status` (`hung`) stops the retry loop and emits `alert_status_changed` via WebSocket to all guardians.

`PATCH /api/v1/alerts/:id/risk` updates `riskLevel`, sends an immediate FCM push to all guardians (outside the retry loop), and emits `alert_risk_changed` via WebSocket.

**Caller number privacy:** Only `callerHash` (SHA-256 of the normalised number) is stored. The raw phone number is never sent to the backend. See [sms-otp-banner.md](sms-otp-banner.md#privacy-decision).

**Guardian notifications** (`GET /api/v1/alerts/notifications`) return enriched records: the full nested `alert` object plus `protectedUserId` and `protectedUserLabel`, so the mobile client does not need a second fetch.

## WebSocket gateway

`GuardianEventsGateway` (`src/gateway/`) runs a Socket.IO server on the `/guardian` namespace, co-hosted on the same HTTP port as the REST API. On connection the client passes `auth: { token: userId }` in the handshake; the gateway joins that socket to room `user:{userId}`.

Events emitted by the server:

| Event | Payload | Trigger |
|-------|---------|---------|
| `alert_status_changed` | `{ alertId, status }` | `PATCH /alerts/:id/status` |
| `alert_risk_changed` | `{ alertId, riskLevel }` | `PATCH /alerts/:id/risk` |
| `guardian-paired` | `{ relationId, guardianUserId / guardedUserId }` | Guardian link claimed |
| `guardian-removed` | `{ relationId }` | Guardian relation deleted |

## Firebase Cloud Messaging (backend)

FCM is handled by two services in `apps/backend/src/modules/firebase/`:

- `FirebaseService` — loads the service account JSON at startup (`FIREBASE_SERVICE_ACCOUNT_PATH`). Exposes `isReady: boolean` and `messaging()`. All push sends are skipped silently if `isReady` is `false`.
- `FirebaseMessagingService` — wraps `send()` and `sendEachForMulticast()`. **Always includes `android.notification.channelId: "escronet_alerts"`** in the payload so Android routes to the high-importance channel. See [push-notifications.md](push-notifications.md#critical-the-channelid-must-be-in-the-fcm-payload).

## Environment

Copy `apps/backend/.env.example` to `apps/backend/.env`. Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — secret for signing tokens
- `FIREBASE_SERVICE_ACCOUNT_PATH` — absolute path to Firebase service account JSON file
