# Playwright's official image ships Chromium + all system deps
FROM mcr.microsoft.com/playwright:v1.49.0-noble

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.js ./

ENV PORT=4000
EXPOSE 4000

CMD ["node", "index.js"]
