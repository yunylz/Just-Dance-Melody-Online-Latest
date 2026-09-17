# JDMO Hub API

This is the API for the JDMO Hub. It's a Node.js application that uses Express.js as the web framework. It's a modified version of [DanceParty Hub](https://dnceprty.co/hub).

## Contributing

This project is developed and maintained by the RyuAtelier team. If you have no clue what you're doing or what you want to do, please don't. Let us handle the situation.

## Getting Started

### Prerequisites

- Node.js 16.x
- MongoDB

### Installation

1. Clone the repository:

```bash
git clone https://github.com/dancepartyteam/jdmo-hub-api.git
```

2. Install dependencies:

```bash
npm install
```

### Docker (Recommended)

1. Create a `.env` file from `.env.example` and fill in the required values.
2. Build and start the containers:
   ```bash
   docker-compose up -d --build
   ```
3. The API will be available at `http://localhost:3000` (or the port specified in your `.env`).

The Docker setup includes a MongoDB instance automatically.