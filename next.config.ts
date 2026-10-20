import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["mongodb", "sharp"],
  poweredByHeader: false,
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 31536000,
    deviceSizes: [360, 640, 828, 1080, 1440, 1920],
    imageSizes: [96, 200, 400],
    qualities: [60, 75],
  },
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    ];
    return [
      { source: "/:path*", headers: security },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
};
export default config;
