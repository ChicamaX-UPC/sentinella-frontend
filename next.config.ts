import type { NextConfig } from "next";

/** PWA (next-pwa): el blueprint §9.3 sugiere next-pwa; en Next 16 + Turbopack suele requerir `next build --webpack` si se añade el plugin. */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/monitoring/map", destination: "/dashboard", permanent: false }];
  },
};

export default nextConfig;
