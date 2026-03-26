/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "capsule-render.vercel.app",
      },
      {
        protocol: "https",
        hostname: "readme-typing-svg.demolab.com",
      },
      {
        protocol: "https",
        hostname: "skillicons.dev",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;

