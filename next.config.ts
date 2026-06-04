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

  // firebase-admin (gRPC + native) sunucuda bundle edilmesin — build hızlanır,
  // bundling kaynaklı sorunlar önlenir.
  serverExternalPackages: ['firebase-admin'],

  experimental: {
    // Tree-shake + barrel import optimizasyonu. Yalnız barrel-export'u olan ve
    // gerçekten fayda sağlayan paketler bırakıldı (firebase/auth, firebase/app,
    // zod, react-hook-form gibi etkisiz/kaldırılmış girişler temizlendi).
    optimizePackageImports: ['lucide-react', 'sonner', 'firebase/firestore'],
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
