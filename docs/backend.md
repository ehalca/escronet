# Backend

## Structure

```
apps/backend/src/
├── main.ts                       ← bootstrap, port 3000
├── app.module.ts                 ← root module, TypeORM connection
├── common/
│   └── hash.util.ts              ← E.164 normalization + SHA-256
├── entities/
│   ├── alert.entity.ts
│   ├── designated-contact.entity.ts
│   ├── scam-number.entity.ts
│   └── scam-report.entity.ts
├── modules/
│   ├── alerts/                   ← POST /alerts
│   ├── auth/                     ← OTP request/verify, JWT issue
│   ├── contacts/                 ← PUT /contacts/designated
│   └── scam-numbers/             ← GET /scam-numbers/delta, POST report
└── trpc/
    ├── trpc.ts                   ← tRPC init
    └── mount-trpc.ts             ← mounts tRPC under /trpc
```

## API surface

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/request-otp` | None | Send SMS OTP to phone number |
| POST | `/auth/verify-otp` | None | Verify OTP, return JWT |
| POST | `/alerts` | JWT | Upload scam alert |
| PUT | `/contacts/designated` | JWT | Set/update designated contact |
| GET | `/scam-numbers/delta` | None | Fetch scam hashes updated since timestamp |
| POST | `/scam-numbers/report` | JWT | Report a number as scam |

tRPC routes are mounted at `/trpc` and currently expose `health.ping` and the auth procedures.

## Auth flow (scaffolded — not production-ready)

1. Client calls `POST /auth/request-otp` with E.164 phone number
2. Server generates OTP, stores with TTL, sends SMS (Twilio — provider TBD)
3. Client calls `POST /auth/verify-otp` with code
4. Server returns signed JWT (`sub`: SHA-256 of phone number)
5. Client stores JWT in MMKV; attaches as `Authorization: Bearer <token>` on subsequent requests

Open decisions: SMS provider, JWT algorithm (HS256 vs RS256), OTP storage (in-memory Map vs Redis). See [PLAN.md](../PLAN.md#open-decisions).

## Database

PostgreSQL via TypeORM. Connection configured in `app.module.ts` from environment variables. Migration SQL is in `migrations/001_init.sql` — run manually for now. A migration CLI script is planned (Phase 8).

For local development: `docker-compose up -d` starts PostgreSQL on port 5432.

## Shared types

The tRPC router type is exported from `packages/shared`. The mobile app imports it for type-safe API calls. After changing the router:
```bash
pnpm --filter @escronet/shared build
```

## Environment

Copy `apps/backend/.env.example` to `apps/backend/.env`. Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — secret for signing tokens
- `TWILIO_*` (or equivalent) — SMS provider credentials
