# Use Python slim image for smaller size
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for mitmproxy
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY server.py .
COPY proxy.py .
COPY config.py .
COPY .env* ./

# Expose the proxy port (default 3128)
EXPOSE 4080

# Create volume for logs
VOLUME ["/app/logs"]

# Run the server
CMD ["python", "server.py"]