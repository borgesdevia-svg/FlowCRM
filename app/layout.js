import { Bricolage_Grotesque, Geist } from "next/font/google";
import "./globals.css";

// O layout raiz envolve TODAS as páginas do site (é o <html> e o <body>).
// Tudo o que puseres aqui aparece em todas as rotas.

// Tipo de letra Geist, carregado pelo próprio Next.js (não depende do Google em tempo real)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Bricolage Grotesque: letra só dos títulos (h1 e h2), com mais personalidade.
// É uma letra "variável": muda o desenho conforme o tamanho (eixo opsz),
// mais apertada nos títulos grandes e mais calma nos pequenos.
const bricolage = Bricolage_Grotesque({
  variable: "--font-titulo",
  subsets: ["latin"],
  axes: ["opsz"],
});

// Título e descrição que aparecem no separador do browser e nos motores de pesquisa
export const metadata = {
  title: "FlowCRM",
  description: "Gestão de clientes e vendas para pequenas equipas comerciais.",
};

export default function RootLayout({ children }) {
  return (
    // data-scroll-behavior: diz ao Next que o scroll suave (globals.css) é de propósito,
    // para ele o desligar ao mudar de página (sem isto aparece um aviso no terminal)
    <html lang="pt" className={`${geistSans.variable} ${bricolage.variable}`} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
