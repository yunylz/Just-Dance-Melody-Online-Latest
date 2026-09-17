# Stage 1: Build dependencies
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies for native modules (like bcrypt)
RUN apk add --no-cache python3 make g++ 

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Stage 2: Final image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy application source
COPY . .

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Expose the port the app runs on
EXPOSE 8455

# Start the application
CMD ["npm", "start"]
