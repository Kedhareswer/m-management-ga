/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Server-only packages that must not be bundled.
  serverExternalPackages: ['playwright', 'undici', '@neondatabase/serverless'],
  images: {
    // Covers are hot-linked from whatever site a series was added from,
    // so we can't enumerate remote hosts — plain <img> is used instead.
    unoptimized: true,
  },
};

export default nextConfig;
