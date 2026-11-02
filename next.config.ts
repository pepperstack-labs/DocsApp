import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Write the whole blog to `out/` as static HTML at build time.
  output: 'export',
};

export default nextConfig;
