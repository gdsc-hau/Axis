/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@hau/ui"],
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 768, 1024, 1280, 1536],
  },
};

export default nextConfig;
