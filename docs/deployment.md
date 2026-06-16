# Deployment

## Local development

### Prerequisites

- Node.js 22+, pnpm 9
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

Runs NestJS with hot reload on `http://localhost:3010`.

### Frontend

```bash
pnpm --filter @escronet/frontend dev
```

Runs Next.js dev server on `http://localhost:3011`.

---

## Production

### Overview

```
                        ┌──────────────────────────────────────┐
Internet ──► Nginx :443 │  /           → frontend :3011        │
                        │  /api/*      → backend  :3010        │
                        │  /socket.io/ → backend  :3010 (WS)   │
                        └──────────────────────────────────────┘
                        Watchtower auto-updates both images
                        Certbot renews TLS certificates
```

All persistent data lives under `~/escronet` on the host.

### Server prerequisites

Install Docker and Docker Compose on a fresh Ubuntu/Debian server:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### Directory layout on the server

```
~/escronet/
  prod.env                          # secrets (git-ignored, provisioned manually)
  firebase-service-account.json     # Firebase Admin SDK service account key
  nginx/
    conf.d/
      app.conf                      # HTTPS config
      app-certonly.conf             # HTTP-only config for initial cert issuance
  certbot/
    www/                            # ACME challenge webroot
    conf/                           # Let's Encrypt certs & config
  postgres/                         # Postgres data volume
```

### SSH copy commands (run from the repo root on your local machine)

```bash
SERVER=ehalca@192.168.0.112

# Create host directories
ssh $SERVER "mkdir -p ~/escronet/{nginx/conf.d,certbot/{www,conf},postgres}"

# Copy nginx configs
scp nginx/conf.d/app.conf          $SERVER:~/escronet/nginx/conf.d/app.conf
scp nginx/conf.d/app-certonly.conf $SERVER:~/escronet/nginx/conf.d/app-certonly.conf

# Copy compose files
scp prod-docker-compose.yml $SERVER:~/escronet/prod-docker-compose.yml
scp cert-docker-compose.yml $SERVER:~/escronet/cert-docker-compose.yml

# Copy env template and fill in real values
scp prod.env.example $SERVER:~/escronet/prod.env
ssh $SERVER "nano ~/escronet/prod.env"

# Copy Firebase service account key (download from Firebase Console)
scp /path/to/firebase-service-account.json $SERVER:~/escronet/firebase-service-account.json
ssh $SERVER "chmod 600 ~/escronet/firebase-service-account.json"
```

Nginx configs: [nginx/conf.d/app.conf](../nginx/conf.d/app.conf), [nginx/conf.d/app-certonly.conf](../nginx/conf.d/app-certonly.conf)

### Environment variables

Non-secret config is defined inline in [prod-docker-compose.yml](../prod-docker-compose.yml). Secrets are loaded from `~/escronet/prod.env` via `env_file`. This file is **git-ignored** and must be provisioned manually.

Use [prod.env.example](../prod.env.example) as a template. Required values:

| Variable                        | Description                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `DB_PASSWORD`                   | Postgres password used by the backend                                                                        |
| `POSTGRES_PASSWORD`             | Same value as `DB_PASSWORD` — read by the `postgres` Docker image                                            |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Path to the Firebase JSON file inside the container (`/run/secrets/firebase-service-account.json`)           |
| `NEXT_PUBLIC_BACKEND_URL`       | Public HTTPS URL of the backend, baked into the Next.js bundle at build time (e.g. `https://yourdomain.com`) |

### Firebase service account

Download the JSON key from [Firebase Console](https://console.firebase.google.com) → Project Settings → Service accounts → Generate new private key.

The backend container mounts `~/escronet/firebase-service-account.json` as `/run/secrets/firebase-service-account.json` (read-only). `FIREBASE_SERVICE_ACCOUNT_JSON` in `prod.env` points to this path — the backend reads the file at startup via the Firebase Admin SDK.

### Docker images

Each service has its own Dockerfile at its workspace root. Images are built and pushed to Docker Hub by GitHub Actions on every push to `main`.

| Service  | Dockerfile                                              | Image                      |
| -------- | ------------------------------------------------------- | -------------------------- |
| Backend  | [apps/backend/Dockerfile](../apps/backend/Dockerfile)   | `ehalca/escronet:backend`  |
| Frontend | [apps/frontend/Dockerfile](../apps/frontend/Dockerfile) | `ehalca/escronet:frontend` |

CI/CD workflow: [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)

### GitHub repository settings

Before the first CI run, configure the following in **Settings → Secrets and variables**:

**Secrets** (Settings → Secrets and variables → Actions → Secrets):
| Name | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |

**Variables** (Settings → Secrets and variables → Actions → Variables):
| Name | Value |
|---|---|
| `BACKEND_PUBLIC_URL` | Public HTTPS URL of the backend (e.g. `https://yourdomain.com`) — baked into the Next.js bundle at build time |

`NEXT_PUBLIC_BACKEND_URL` is a public value (not a secret) so it uses `vars`, not `secrets`.

### Compose files

| File                                                    | Purpose                                              |
| ------------------------------------------------------- | ---------------------------------------------------- |
| [local-docker-compose.yml](../local-docker-compose.yml) | Local dev — Postgres only                            |
| [prod-docker-compose.yml](../prod-docker-compose.yml)   | Full production stack                                |
| [cert-docker-compose.yml](../cert-docker-compose.yml)   | One-time initial TLS cert issuance (HTTP-only nginx) |

### First deploy — step by step

```bash
# 1. SSH into the server and run the SSH copy commands above (local machine)

# 2. SSH into the server
ssh user@your-server.com

# 3. Issue the initial TLS certificate (HTTP-only nginx, runs once)
cd ~/escronet
docker compose -f cert-docker-compose.yml up --abort-on-container-exit

# 4. Start the full production stack
docker compose -f prod-docker-compose.yml up -d
```

### Subsequent deploys

GitHub Actions builds and pushes new images on every merge to `main`. Watchtower polls Docker Hub every 30 seconds and automatically pulls and restarts containers tagged with `com.centurylinklabs.watchtower.enable=true`. No manual intervention required.

To force an immediate update:

```bash
cd ~/escronet
docker compose -f prod-docker-compose.yml pull
docker compose -f prod-docker-compose.yml up -d
```
