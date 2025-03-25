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
  // Configuration pour les routes API avec variables d'environnement
  experimental: {
    serverActions: {
      allowedOrigins: [
        `${process.env.NEXT_PUBLIC_DOMAIN || 'localhost'}:${process.env.PORT || '3000'}`,
        "192.168.1.22:3990" // Garder cette origine pour la compatibilité
      ],
    },
  },
  // Configuration du port d'écoute
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  }
};

module.exports = nextConfig;
