/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Playwright runs server-side in API routes; keep it out of the bundle.
  serverExternalPackages: ['playwright'],
  images: {
    // Covers are hot-linked from whatever site a series was added from,
    // so we can't enumerate remote hosts — plain <img> is used instead.
    unoptimized: true,
  },
};

export default nextConfig;
