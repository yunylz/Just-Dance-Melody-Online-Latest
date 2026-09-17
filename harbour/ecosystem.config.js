module.exports = {
  apps: [
    {
      name: "harbour-dev",
      script: "node",
      args: "src/server.js",
      // Optional settings:
      watch: false,         // Set true if you want PM2 to watch for changes
      autorestart: true
    },
  ],
};
