// PM2 config. Secrets are NOT stored here; they are read from
// backend/.env.production on the server (see env_file). Rotate any
// credentials that were previously committed in this file.
module.exports = {
  apps: [
    {
      name: "peepal-backend",
      cwd: __dirname,
      script: "./main",
      env: {
        APP_ENV: "production",
      },
      // pm2 loads the rest (JWT_SECRET, DB_PATH, SUPER_ADMIN_*) from:
      env_file: ".env.production",
    },
  ],
};
