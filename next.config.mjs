/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from external sources if needed
  images: {
    // Enable Next.js image optimization
    // External domains can be added to remotePatterns if necessary
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'recharts', 'lucide-react', 'ioredis'],
    serverActions: {
      bodySizeLimit: '1mb',
    },
  }
};

export default nextConfig;
