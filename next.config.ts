import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 + Vercel adapter build: disable standalone output when on
  // Vercel. The Vercel adapter produces its own deployment output, and
  // requesting standalone output alongside it causes an ENOENT error on
  // next-server.js.nft.json during Vercel's onBuildComplete packaging phase.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
