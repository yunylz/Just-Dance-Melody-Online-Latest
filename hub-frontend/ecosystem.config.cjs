module.exports = {
  apps: [
    {
      name: "jdmo-hub-dev",
      script: "node",
      args: "-r dotenv/config build",
      // Optional settings:
      watch: false,         // Set true if you want PM2 to watch for changes
      autorestart: true,    // Automatically restart on crash
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
