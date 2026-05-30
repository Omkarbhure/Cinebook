import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [320, 480, 640, 750, 1080],
    imageSizes: [64, 128, 256, 300, 384],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
