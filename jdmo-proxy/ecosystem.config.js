module.exports = {
  apps: [
    {
      name: "jdmo-proxy",
      script: "server.py",
      interpreter: "python3",
      args: "",
      watch: false,
      autorestart: true,
      max_restarts: 10
    }
  ]
};
