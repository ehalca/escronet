# Backend

## Structure

```
apps/backend/src/
├── main.ts                       ← bootstrap, port 3000, global prefix /api
├── app.module.ts                 ← root module, TypeORM connection
├── common/
│   └── zod-validation.pipe.ts   ← per-param ZodValidationPipe
├── controllers/
│   └── health.controller.ts     ← GET /api/ping, GET /api/health
├── entities/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts   ← POST /api/auth/register
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   └── callers/
│       ├── callers.controller.ts ← GET /api/callers/delta
│       ├── callers.service.ts
│       └── callers.module.ts
```

## API

All routes are prefixed with `/api`. Request validation uses `ZodValidationPipe` applied per-parameter, backed by the Zod schemas in `packages/shared`.

| Method | Path                  | Description                                    |
| ------ | --------------------- | ---------------------------------------------- |
| GET    | `/api/ping`           | Health check — returns `{ message, timestamp }`|
| GET    | `/api/health`         | Readiness check — returns `{ ok: true }`       |
| POST   | `/api/auth/register`  | Register device, returns `{ token, userId }`   |
| GET    | `/api/callers/delta`  | Caller delta sync since `lastSyncDate`         |

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

## Environment

Copy `apps/backend/.env.example` to `apps/backend/.env`. Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — secret for signing tokens
- `TWILIO_*` (or equivalent) — SMS provider credentials
