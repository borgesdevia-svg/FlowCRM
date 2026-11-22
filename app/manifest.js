// MANIFEST da aplicação (PWA): é o que deixa instalar o FlowCRM no telemóvel ou no PC.
// O Next serve-o em /manifest.webmanifest e põe o <link> em todas as páginas.
// Os ícones PNG são gerados por scripts/gerar-icones-app.mjs.
export default function manifest() {
  return {
    id: "/painel",
    name: "FlowCRM",
    short_name: "FlowCRM",
    description: "O CRM para pequenas equipas de vendas.",
    lang: "pt-PT",
    // ao tocar no ícone abre o painel (sem sessão, o proxy leva a Entrar), não a landing page
    start_url: "/painel",
    scope: "/",
    display: "standalone", // janela própria, sem barra de endereço nem separadores
    // ecrã de abertura e barra do topo enquanto a app abre: escuros, como o painel
    background_color: "#0f1115",
    theme_color: "#0f1115",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android: cada marca recorta o ícone à sua maneira (círculo, gota...)
      { src: "/icones/icone-mascara-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // carregar no ícone sem largar mostra estes atalhos
    shortcuts: [
      {
        name: "Novo lead",
        url: "/painel/clientes/novo",
        icons: [{ src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Tarefas",
        url: "/painel/tarefas",
        icons: [{ src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
