/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from external sources if needed
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'recharts', 'lucide-react', 'ioredis'],
  }
};

export default nextConfig;
