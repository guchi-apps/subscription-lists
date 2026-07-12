import type { NextConfig } from "next";

const devAllowedOrigins = [
  "*.sslip.io",
  // Cloudflare Tunnel (signaly-dev) 経由の外出先アクセス用
  "*.minagu.work",
  ...(process.env.DEV_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: devAllowedOrigins,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
};

export default nextConfig;
