import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const config: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86_400, // 1 gün — logo gibi nadir değişen görsellere
  },

  experimental: {
    // Tree-shake + barrel import optimizasyonu — bundle'ı küçültür, ilk
    // JS yüklenmesini hızlandırır.
    optimizePackageImports: [
      'lucide-react',
      'sonner',
      'firebase/firestore',
      'firebase/auth',
      'firebase/app',
      '@hookform/resolvers',
      'react-hook-form',
      'zod',
    ],
  },

  webpack: (webpackConfig, { isServer }) => {
    if (isServer) {
      webpackConfig.externals = [
        ...(Array.isArray(webpackConfig.externals) ? webpackConfig.externals : []),
        '@grpc/grpc-js',
        '@grpc/proto-loader',
      ];
    }
    return webpackConfig;
  },
};

export default bundleAnalyzer(config);
