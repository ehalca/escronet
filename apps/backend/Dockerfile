FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm

# Layer cache — manifests only, so source changes don't bust the install layer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Build shared types first (backend imports from @escronet/shared/dist)
RUN pnpm --filter @escronet/shared build:types
RUN pnpm --filter @escronet/backend build

# Create a production-ready bundle: copies non-dev deps and workspace packages (with their dist)
RUN pnpm deploy --filter @escronet/backend --prod /deploy

# ---- production image ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist

EXPOSE 3010
CMD ["node", "dist/main.js"]
