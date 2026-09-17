# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for SvelteKit (baked in at build time)
ARG VITE_HUB_API_URL
ARG VITE_HUB_FQDN

# Set them as env vars for the build process
ENV VITE_HUB_API_URL=$VITE_HUB_API_URL
ENV VITE_HUB_FQDN=$VITE_HUB_FQDN

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the SvelteKit app
# Note: VITE_ variables must be present during build if used
RUN npm run build

# Stage 2: Final Image
FROM node:20-alpine

WORKDIR /app

# Copy production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy build output and static files
COPY --from=builder /app/build ./build
COPY --from=builder /app/static ./static
COPY --from=builder /app/package.json ./package.json

# Expose port
EXPOSE 5173

# Run the app
CMD ["node", "build"]
