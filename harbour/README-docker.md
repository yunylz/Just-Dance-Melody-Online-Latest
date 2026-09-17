# Dockerizing Harbour

This project is now dockerized with Docker and Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

1.  **Configure Environment Variables**:
    Create a `.env` file in the root directory (you can use `.env.example` as a template).
    The Docker setup will automatically pick up variables from this file.

2.  **Build and Start**:
    ```bash
    docker compose up --build -d
    ```

3.  **Check Logs**:
    ```bash
    docker compose logs -f harbour
    ```

4.  **Stop**:
    ```bash
    docker compose down
    ```

## Services

- **harbour**: The Node.js application, running on port `6000` (or as defined in `PORT`).
- **mongodb**: MongoDB database (v6.0), using a persistent volume `mongodb_data`.
- **memcached**: Memcached for caching.

## Health Checks

- The `harbour` service includes a health check that verifies the `/v1/gateway/configuration/cors` endpoint.
- The `mongodb` service includes a health check using `mongosh`.

## MMDB File

The application expects a GeoLite2-Country MMDB file at `./src/data/GeoLite2-Country.mmdb`. Ensure this file exists in your source code before building the image, or the country lookup feature will be disabled.
