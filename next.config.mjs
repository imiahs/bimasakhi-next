/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from external sources if needed
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
