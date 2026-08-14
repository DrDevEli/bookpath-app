// PM2 process definition for the BookPath backend.
// Usage: pm2 start deploy/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "bookpath-backend",
      cwd: "/opt/bookpath/backend",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
