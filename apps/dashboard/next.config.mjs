/** @type {import('next').NextConfig} */
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sentinel/shared'],

  experimental: {
    serverComponentsExternalPackages: ['@libsql/client'],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
