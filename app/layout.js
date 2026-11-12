import { Geist } from "next/font/google";
import "./globals.css";

// O layout raiz envolve TODAS as páginas do site (é o <html> e o <body>).
// Tudo o que puseres aqui aparece em todas as rotas.

// Tipo de letra Geist, carregado pelo próprio Next.js (não depende do Google em tempo real)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Título e descrição que aparecem no separador do browser e nos motores de pesquisa
export const metadata = {
  title: "FlowCRM",
  description: "Gestão de clientes e automação de emails para empresas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt" className={geistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
