/** @type {import('next').NextConfig} */
// Configuração do Next.js.
const nextConfig = {
  experimental: {
    serverActions: {
      // o logótipo da empresa pode ter até 1 MB; deixamos folga para o resto do pedido
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
