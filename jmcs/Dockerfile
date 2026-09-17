# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build && \
    echo "{\"revision\":\"$(git rev-parse --short HEAD 2>/dev/null || echo unknown)\",\"branch\":\"$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)\",\"deploymentTime\":$(git log -1 --format=%ct 2>/dev/null || echo 0)000}" > /app/dist/git-info.json

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache curl
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY src/content ./dist/content
COPY src/data ./src/data
# WDF seed data for first-boot auto-load (wdfBootstrap reads dist/src/config/wdf-data)
COPY src/config/wdf-data ./dist/src/config/wdf-data
# Quest seed data for first-boot auto-load (questBootstrap reads dist/src/config/quest-data)
COPY src/config/quest-data ./dist/src/config/quest-data

ENV PORT=3000
ENV MMDB_PATH=./src/data/GeoLite2-Country.mmdb

EXPOSE 3000
CMD ["node", "dist/src/server.js"]