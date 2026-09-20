/** @type {import('next').NextConfig} */
const nextConfig = {
  // Release builds for the on-premise installer set NEXT_STANDALONE=1, which
  // emits .next/standalone: a self-contained server.js plus only the
  // node_modules it actually imports. Dev and Vercel builds are unaffected.
  output: process.env.NEXT_STANDALONE ? "standalone" : undefined,

  // Tree-shake big icon/util libraries on a per-symbol basis instead of
  // pulling whole barrel files into each route's bundle. Lucide alone is
  // imported in 90+ files and ships hundreds of unused icons without this.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
    ],
  },

  // Defer to next/image responsive optimisation defaults; declaring an
  // explicit list keeps the manifest small and avoids accidentally
  // generating sizes we never render.
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Allow server-side API calls to the Go backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
