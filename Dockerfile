# --- build stage ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
# Single resilient install. The host's npm registry connection resets under load,
# so retry aggressively; --omit not set here because the build needs devDeps (tsc).
RUN npm ci --no-audit --no-fund \
  --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=180000 --fetch-timeout=600000
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
