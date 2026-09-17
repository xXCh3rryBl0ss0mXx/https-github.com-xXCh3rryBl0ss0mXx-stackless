import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["googleapis", "google-auth-library", "stripe", "@neondatabase/serverless"],
};

export default nextConfig;
