# Deployment

## Local development

### Prerequisites

- Node.js 20+, pnpm 9
- Docker & Docker Compose

### Database

Start PostgreSQL in Docker:

```bash
docker compose -f local-docker-compose.yml up -d
```

See [local-docker-compose.yml](../local-docker-compose.yml).

### Backend

```bash
cp apps/backend/.env.example apps/backend/.env
pnpm dev:backend
```

Runs NestJS with hot reload on `http://localhost:3000`.

### Frontend

```bash
pnpm --filter @escronet/frontend dev
```

Runs Next.js dev server on `http://localhost:3001`.

---

## Production

### Overview

```
                        ┌──────────────────────────────────┐
Internet ──► Nginx :443 │  /        → frontend :3001       │
                        │  /api/*   → backend  :3000        │
                        └──────────────────────────────────┘
                        Watchtower auto-updates both images
                        Certbot renews TLS certificates
```

All persistent data lives under `~/escronet` on the host.

### Directory layout on the server

```
~/escronet/
  prod.env                  # secrets (git-ignored, provisioned manually)
  nginx/
    conf.d/
      app.conf              # HTTPS config (copy from nginx/conf.d/app.conf)
      app-certonly.conf     # HTTP-only config used once for initial cert generation
  certbot/
    www/                    # ACME challenge webroot
    conf/                   # Let's Encrypt certs & config
  postgres/                 # Postgres data volume
```

Copy the nginx configs from the repo to the server on first deploy:

```bash
cp nginx/conf.d/app.conf          ~/escronet/nginx/conf.d/app.conf
cp nginx/conf.d/app-certonly.conf ~/escronet/nginx/conf.d/app-certonly.conf
```

Nginx configs: [nginx/conf.d/app.conf](../nginx/conf.d/app.conf), [nginx/conf.d/app-certonly.conf](../nginx/conf.d/app-certonly.conf)

### Environment variables

Non-secret config is defined inline in [prod-docker-compose.yml](../prod-docker-compose.yml). Secrets are loaded from `~/escronet/prod.env` via `env_file`. This file is **git-ignored** and must be provisioned manually.

Use [prod.env.example](../prod.env.example) as a template:

```bash
cp prod.env.example ~/escronet/prod.env
nano ~/escronet/prod.env  # fill in real values
```

### Docker images

Each service has its own Dockerfile at its workspace root. Images are built and pushed to Docker Hub by GitHub Actions on every push to `main`. Configure `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` in GitHub repo secrets.

| Service  | Dockerfile                                           | Image                      |
| -------- | ---------------------------------------------------- | -------------------------- |
| Backend  | [apps/backend/Dockerfile](../apps/backend/Dockerfile)   | `escronet/backend:latest`  |
| Frontend | [apps/frontend/Dockerfile](../apps/frontend/Dockerfile) | `escronet/frontend:latest` |

CI/CD workflow: [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)

### Compose files

| File                                                               | Purpose                                              |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| [local-docker-compose.yml](../local-docker-compose.yml)           | Local dev — Postgres only                            |
| [prod-docker-compose.yml](../prod-docker-compose.yml)             | Full production stack                                |
| [cert-docker-compose.yml](../cert-docker-compose.yml)             | One-time initial TLS cert issuance (HTTP-only nginx) |

### First deploy — step by step

```bash
# 1. SSH into server and create the host directories
mkdir -p ~/escronet/{nginx/conf.d,certbot/{www,conf},postgres}

# 2. Copy nginx configs from the repo
cp nginx/conf.d/app.conf          ~/escronet/nginx/conf.d/
cp nginx/conf.d/app-certonly.conf ~/escronet/nginx/conf.d/

# 3. Create prod.env with real secrets
cp prod.env.example ~/escronet/prod.env
nano ~/escronet/prod.env

# 4. Issue the initial TLS certificate (HTTP-only nginx, runs once)
docker compose -f cert-docker-compose.yml up --abort-on-container-exit

# 5. Start the full production stack
docker compose -f prod-docker-compose.yml up -d
```

### Subsequent deploys

GitHub Actions builds and pushes new images on every merge to `main`. Watchtower polls Docker Hub every 30 seconds and automatically pulls and restarts containers tagged with `com.centurylinklabs.watchtower.enable=true`. No manual intervention required.

To force an immediate update:

```bash
docker compose -f prod-docker-compose.yml pull
docker compose -f prod-docker-compose.yml up -d
```
