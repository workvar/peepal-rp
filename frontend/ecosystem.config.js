module.exports = {
  apps: [
    {
      name: "peepal-frontend",
      cwd: __dirname,
      // Run the Next.js server binary directly with Node. Going through
      // npm/pnpm makes PM2 (fork mode) try to load the package-manager shell
      // script as a JS module, which crashes with "SyntaxError: missing )".
      script: "node_modules/next/dist/bin/next",
      args: "start --hostname 0.0.0.0 --port 3000",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        NEXT_PUBLIC_API_URL: "https://api-roserp.workvar.com",
      },
    },
  ],
};
