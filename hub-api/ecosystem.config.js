module.exports = {
  apps: [
    {
      name: "hub-api-dev",
      script: "node",
      args: "src/server.js",
      // Optional settings:
      watch: false,
      autorestart: true,
    },
  ],
};
