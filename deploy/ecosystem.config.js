module.exports = {
  apps: [
    {
      name: 'carelink-server',
      cwd: '/opt/carelink/apps/server',
      script: 'dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};