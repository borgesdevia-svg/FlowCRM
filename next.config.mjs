/** @type {import('next').NextConfig} */
// Configuração do Next.js.
// Desligámos "cacheComponents" e "partialPrefetching" (vinham ligados por defeito)
// para usar o modelo clássico, mais simples: as páginas que leem a sessão
// são geradas no servidor a cada pedido, sem precisarem de <Suspense> obrigatório.
const nextConfig = {};

export default nextConfig;
