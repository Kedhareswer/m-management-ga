# Single-container image: Next.js app with Playwright's Chromium inside.
# Build:  docker build -t mangashelf .
# Run:    docker run -p 3000:3000 -v mangashelf-data:/data mangashelf

# ---- build stage ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# ---- run stage ----
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

# Chromium + system deps for the in-app Playwright extractor
COPY --from=builder /app/node_modules/playwright /tmp/pw-installer/node_modules/playwright
COPY --from=builder /app/node_modules/playwright-core /tmp/pw-installer/node_modules/playwright-core
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN node /tmp/pw-installer/node_modules/playwright/cli.js install --with-deps chromium \
  && rm -rf /tmp/pw-installer /var/lib/apt/lists/*

# Next standalone output keeps the runtime small; playwright is external
# (serverExternalPackages) so its node_modules copy is included by the trace.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# personal library + cover cache live on a volume
ENV DATA_DIR=/data
VOLUME /data

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
