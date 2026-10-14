/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NEXT_DIST_DIR serve solo ai test e2e (build separata dal dev server).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
