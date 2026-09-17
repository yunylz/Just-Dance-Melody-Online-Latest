FROM node:20-alpine
WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY src ./src

ENV PORT=80
ENV MMDB_PATH=./src/data/GeoLite2-Country.mmdb

EXPOSE 80
CMD ["node", "src/server.js"]
