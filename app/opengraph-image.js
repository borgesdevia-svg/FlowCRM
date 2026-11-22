import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Imagem de pré-visualização: é o cartão que aparece quando alguém partilha o link do
// FlowCRM no WhatsApp, LinkedIn, Facebook, etc. O Next.js transforma este "HTML" numa
// imagem PNG ao fazer o build e põe as etiquetas <meta property="og:image"> na página.
// Como está na pasta app/, vale para o site todo (cada página pode ter a sua, se quiser).
// Na Vercel, o Next.js usa sozinho o endereço de produção para o link da imagem.
//
// Notas sobre o ImageResponse: só aceita um subconjunto de CSS (flexbox, sem grid),
// e cada <div> com mais de um filho precisa de display: "flex".

export const alt = "FlowCRM: CRM para pequenas equipas de vendas";
export const size = { width: 1200, height: 630 }; // o tamanho que as redes sociais pedem
export const contentType = "image/png";

// Bricolage Grotesque a negrito: a mesma letra dos títulos da landing (ficheiro TTF em
// assets/fonts, licença OFL). É a única letra que passamos, por isso serve para todo o texto.
const bricolage = await readFile(join(process.cwd(), "assets/fonts/BricolageGrotesque-Bold.ttf"));

// cores da app (as mesmas do globals.css, em modo escuro)
const FUNDO = "#0f1115";
const TEXTO = "#e6e8eb";
const TEXTO_SUAVE = "#9aa1ab";
const VERDE = "#22c55e";

// o símbolo do logótipo (o "F" em fluxo), o mesmo desenho do components/SimboloLogo.js
function Simbolo({ tamanho }) {
  return (
    <svg width={tamanho} height={Math.round((tamanho * 52) / 56)} viewBox="0 0 56 52">
      <defs>
        <linearGradient id="g" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3cf59a" />
          <stop offset="1" stopColor="#0fb257" />
        </linearGradient>
      </defs>
      <path fill="url(#g)" d="M2.5 26.5C5 14 11 2 19 2H55C55 7 52 13 45 16C38 18.5 24 17 15 19.5C9 21 5 23.5 2.5 26.5Z" />
      <path fill="url(#g)" d="M5 49C7 38 11 24 21 23.5H43C43 29 40 34 33 36.5C26 38.5 16 38 11 41.5C8 43.5 6 46 5 49Z" />
    </svg>
  );
}

export default function Imagem() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: FUNDO,
          // brilho verde suave no canto, como o brilho do topo da landing (sem quadrados)
          backgroundImage: "radial-gradient(circle at 85% 10%, rgba(34, 197, 94, 0.22), transparent 55%)",
          color: TEXTO,
        }}
      >
        {/* logótipo: símbolo + "Flow" branco e "CRM" verde, como no menu da landing */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Simbolo tamanho={64} />
          <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 50, letterSpacing: -1 }}>
            <span>Flow</span>
            <span style={{ color: VERDE }}>CRM</span>
          </div>
        </div>

        {/* a frase principal do hero */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 84, lineHeight: 1.02, letterSpacing: -2.5, maxWidth: 1000 }}>
            Todos os teus clientes, num só fluxo.
          </div>
          <div style={{ display: "flex", fontSize: 32, color: TEXTO_SUAVE }}>
            O CRM para pequenas equipas de vendas.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Bricolage", data: bricolage, style: "normal", weight: 700 }],
    }
  );
}
