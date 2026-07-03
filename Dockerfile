# ---- build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# ---- run stage ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Next standalone output keeps the runtime image small
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# personal library lives on a volume
ENV DATA_DIR=/data
VOLUME /data

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
