FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm

# NEXT_PUBLIC_BACKEND_URL is baked into the JS bundle at build time.
# Pass it via --build-arg or the BACKEND_PUBLIC_URL GitHub Actions variable.
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

# Layer cache — all manifests so pnpm can resolve the full workspace graph
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json  ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/mobile/package.json   ./apps/mobile/
COPY packages/shared/package.json    ./packages/shared/
COPY packages/shared-ui/package.json ./packages/shared-ui/
COPY packages/i18n/package.json      ./packages/i18n/
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/frontend ./apps/frontend

# shamefully-hoist puts all binaries at root node_modules/.bin but does not
# create workspace-level symlinks in the container, so bypass pnpm script
# runner and call tools directly from the hoisted root bin directory.
ENV PATH="/app/node_modules/.bin:${PATH}"

RUN cd /app/packages/shared && tsc
RUN cd /app/apps/frontend && next build

# ---- production image ----
# With output:'standalone' + outputFileTracingRoot set to the monorepo root,
# Next.js produces .next/standalone/ mirroring the monorepo structure.
# server.js lands at apps/frontend/server.js inside the standalone dir.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3011
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

EXPOSE 3011
CMD ["node", "apps/frontend/server.js"]
