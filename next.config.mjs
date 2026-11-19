/** @type {import('next').NextConfig} */
// Configuração do Next.js.
const nextConfig = {
  experimental: {
    serverActions: {
      // o logótipo da empresa pode ter até 1 MB; deixamos folga para o resto do pedido
      bodySizeLimit: "2mb",
    },
  },
  // Endereço antigo: a página "Personalizar" passou a chamar-se "Formulário".
  // Quem tiver o link guardado vai parar ao sítio novo.
  async redirects() {
    return [{ source: "/painel/personalizar", destination: "/painel/formulario", permanent: true }];
  },
};

export default nextConfig;
