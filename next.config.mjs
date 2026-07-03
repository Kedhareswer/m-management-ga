/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    // Covers are hot-linked from whatever site a series was added from,
    // so we can't enumerate remote hosts — plain <img> is used instead.
    unoptimized: true,
  },
};

export default nextConfig;
