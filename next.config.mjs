/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      '@coinbase/cdp-sdk': false,
      '@base-org/account': false,
      '@x402/evm': false,
      '@x402/core': false,
      '@x402/svm': false,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    return config;
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
    if (
      backendUrl &&
      backendUrl.startsWith('http') &&
      !backendUrl.includes('localhost') &&
      !backendUrl.includes('127.0.0.1')
    ) {
      return [
        {
          source: '/api/external/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
