module.exports = {
  apps: [
    {
      name: 'anja',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
    },
    {
      name: 'anja-notifier',
      script: 'scripts/anja-notifier.mjs',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'anja-dev',
      script: 'node_modules/.bin/next',
      args: 'dev --port 3000',
      cwd: __dirname,
      instances: 1,
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
}
