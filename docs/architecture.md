# Architecture

## Deployables

### 1. Backend

| #   | Component         | Purpose                                                                     |
| --- | ----------------- | --------------------------------------------------------------------------- |
| 1.1 | NestJS API server | REST endpoints — auth, alerts, contacts, scam-number management             |
| 1.2 | PostgreSQL        | Persistent storage for users, alerts, scam reports, designated contacts     |
| 1.3 | Next.js web app   | Landing page, help, FAQ, terms, stats, MODERATOR dashboard, ADMIN dashboard |

### 2. Mobile (Android-first)

#### 2.1 Native

| #       | Component                           | Purpose                                                                                                                                                                       |
| ------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1.1.1 | Call Processor — Background service | Registered to receive incoming call events from the OS. Entry point for all call-related activity.                                                                            |
| 2.1.1.2 | Call Processor — Analyzer           | Evaluates available signals (contact status, duration, crowd data, classifier output) and assigns a risk level.                                                               |
| 2.1.2   | Guardian service                    | Acts on risk level decisions — fires local notifications and alerts, escalates to the backend when the level reaches HIGHEST. Corresponds to the MOBILE_SUPPORT system actor. |
| 2.1.3   | UI                                  | App configuration, GUARDIAN setup, protection status, local stats, alert history.                                                                                             |
| 2.1.4   | Migration service                   | Keeps the on-device blocked-number registry up to date via delta sync with the backend. Also handles ONNX classifier model updates.                                           |

---

## Data flow overview

For the full risk escalation model see [risk-levels.md](risk-levels.md).
For actor definitions and responsibilities see [actors.md](actors.md).
For Android-specific implementation details see [android.md](android.md).

---

## Shared types

`packages/shared` contains Zod schemas, inferred TypeScript interfaces, and a typed `fetch`-based API client used by both the NestJS backend and the mobile/frontend clients. There is no tRPC — all server–client communication uses plain REST with shared DTOs for type safety.

- **Schemas** (`packages/shared/src/schemas/`) — Zod schemas that are the single source of truth for request/response shapes. The backend validates incoming requests against these schemas; clients parse responses through them.
- **Interfaces** (`packages/shared/src/interfaces/`) — TypeScript types inferred from the schemas via `z.infer<>`.
- **API client** (`packages/shared/src/api/client.ts`) — `createApiClient(baseUrl, getToken?)` returns a typed client used by mobile and frontend. Responses are parsed and validated with the shared schemas.

Rebuild the shared package after changing any schema or client:

```bash
pnpm --filter @escronet/shared build
```
