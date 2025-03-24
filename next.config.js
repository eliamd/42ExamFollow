/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Si vous utilisez des images externes, ajoutez les domaines autorisés ici
  images: {
    domains: ['cdn.intra.42.fr'],
  },
  // Désactiver les vérifications ESLint pour la production
  eslint: {
    // Avertir mais ne pas échouer en production
    ignoreDuringBuilds: true,
  },
  // Désactiver la génération statique pour les pages utilisant useSearchParams
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

module.exports = nextConfig;
