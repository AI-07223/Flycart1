# --- build stage ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
# Resilient install. The host's npm registry connection is flaky and intermittently fails the
# WHOLE step (exit 152) beyond npm's own retries, so wrap it in a shell retry loop: up to 5 whole
# attempts with backoff, which reliably catches a working network window. devDeps kept (tsc needs them).
RUN for i in 1 2 3 4 5; do \
      echo "npm ci attempt $i/5..."; \
      npm ci --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=180000 --fetch-timeout=600000 && break; \
      if [ "$i" = "5" ]; then echo "npm ci failed after 5 attempts"; exit 1; fi; \
      echo "retrying in 20s..."; sleep 20; \
    done
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# Drop devDependencies so the pruned node_modules can be reused at runtime
# (avoids a second network install — the step that kept failing with ECONNRESET).
RUN npm prune --omit=dev

# --- runtime stage ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY public ./public
EXPOSE 2567
CMD ["node", "dist/index.js"]
