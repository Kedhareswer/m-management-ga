import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  // Server-only packages that must not be bundled.
  serverExternalPackages: ['playwright', 'undici', '@neondatabase/serverless'],
  images: {
    // Covers are hot-linked from whatever site a series was added from,
    // so we can't enumerate remote hosts — plain <img> is used instead.
    unoptimized: true,
  },
};

export default nextConfig;
