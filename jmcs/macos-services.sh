#!/bin/bash

# macos-services.sh
# Starts MongoDB and Memcached via Homebrew on macOS if not already running

# Detect OS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "This script is only supported on macOS, skipping..."
  exit 1
fi

# Ensure Homebrew is installed
if ! command -v brew &>/dev/null; then
  echo "Homebrew is not installed. Install it first: https://brew.sh/"
  exit 1
fi

echo "Detected macOS. Checking services..."

# Function to check and start a service
start_service_if_needed() {
  local service="$1"
  if brew services list | grep -qE "^${service}\s+started"; then
    echo "$service is already running."
  else
    echo "Starting $service..."
    brew services start "$service"
  fi
}

# Check and start MongoDB
start_service_if_needed "mongodb-community"

# Check and start Memcached
start_service_if_needed "memcached"

# Check and start Redis
start_service_if_needed "redis"
