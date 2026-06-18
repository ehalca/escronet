FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm

# Layer cache — all manifests so pnpm can resolve the full workspace graph
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json  ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/mobile/package.json   ./apps/mobile/
COPY packages/shared/package.json    ./packages/shared/
COPY packages/shared-ui/package.json ./packages/shared-ui/
COPY packages/i18n/package.json      ./packages/i18n/
# Remove Windows-specific virtual-store-dir so pnpm uses its Linux default
RUN sed -i '/virtual-store-dir/d' .npmrc && pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# shamefully-hoist puts all binaries at root node_modules/.bin but does not
# create workspace-level symlinks in the container, so bypass pnpm script
# runner and call tools directly from the hoisted root bin directory.
ENV PATH="/app/node_modules/.bin:${PATH}"

RUN cd /app/packages/shared && tsc
RUN cd /app/apps/backend && nest build

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
