import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Enable Web Workers support
    if (!isServer) {
      // eslint-disable-next-line no-param-reassign
      config.output.globalObject = 'self';
    }
    return config;
  },
};

export default nextConfig;
