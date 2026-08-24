# --- build stage ---
FROM node:22-alpine AS build
WORKDIR /app
# Pin npm to the dev/lockfile toolchain (npm 11.x). The base image bundles npm 10.9.8, which
# strictly rejects this lockfile's nested tsx -> esbuild@0.28.1 optional-platform entries
# ("npm ci can only install when package.json and package-lock.json are in sync"). npm 11
# resolves the same lock cleanly, matching local dev — keep dev/prod npm in parity.
RUN npm install -g npm@11.12.1
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
COPY scripts ./scripts
COPY public ./public
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
COPY --from=build /app/public ./public
# The Android APK is a build artifact (gitignored), published as a rolling GitHub
# release by the dev machine that runs `npm run build-apk`. Fetch it here so the
# deployed demo serves /apk/smashcart.apk and the in-game download pill shows.
# Non-fatal on purpose: a missing release just hides the pill.
RUN apk add --no-cache curl  && mkdir -p public/apk  && (curl -fsSL -o public/apk/smashcart.apk       https://github.com/AI-07223/Flycart1/releases/download/apk-latest/smashcart.apk       || echo "APK release not found — deploying without it")
EXPOSE 2567
CMD ["node", "dist/index.js"]
