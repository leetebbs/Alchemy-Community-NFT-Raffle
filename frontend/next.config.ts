import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize packages that have build issues
  serverExternalPackages: ['pino', 'thread-stream'],
  
  // Empty turbopack config to silence the warning and use Turbopack defaults
  turbopack: {},
};

export default nextConfig;
