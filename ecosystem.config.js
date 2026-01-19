module.exports = {
  apps: [
    {
      name: 'postauto-backend',
      cwd: '/var/www/postauto/backend',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_file: '/var/www/postauto/backend/.env',
      error_file: '/var/log/postauto/backend-error.log',
      out_file: '/var/log/postauto/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'postauto-frontend',
      cwd: '/var/www/postauto/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/postauto/frontend-error.log',
      out_file: '/var/log/postauto/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
