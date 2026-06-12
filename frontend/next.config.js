/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Salida autocontenida para Docker (copia sólo lo necesario al runtime).
  output: 'standalone',
  experimental: {
    typedRoutes: false,
  },
};
module.exports = nextConfig;
