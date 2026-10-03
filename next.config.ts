import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Photos are downscaled in the browser before upload; Vercel caps request bodies at 4.5 MB.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
