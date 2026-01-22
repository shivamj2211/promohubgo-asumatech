/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Security headers (safe defaults; avoids breaking Next.js runtime)
  async headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];

    // Only enable HSTS in production (requires HTTPS)
    const hsts =
      process.env.NODE_ENV === "production"
        ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
        : [];

    return [
      {
        source: "/(.*)",
        headers: [...base, ...hsts],
      },
    ];
  },

  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  webpack: (config) => {
    config.watchOptions = { poll: 800, aggregateTimeout: 300 };
    return config;
  },
};

module.exports = nextConfig;
