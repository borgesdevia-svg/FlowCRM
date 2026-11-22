// Gera os ícones PNG da aplicação instalada (PWA) a partir do "F" do logótipo.
// Correr uma vez (e de novo só se o logótipo mudar):  node scripts/gerar-icones-app.mjs
//
//  public/icones/icone-192.png   e  icone-512.png   -> ícone normal (quadrado escuro)
//  public/icones/icone-mascara-512.png              -> Android: cada marca corta à sua
//      maneira (círculo, gota...), por isso o F fica mais pequeno, dentro da "zona segura"
//  app/apple-icon.png (180)                         -> iPhone (o Next põe o <link> sozinho)
import sharp from "sharp";

const F = `
  <path d="M2.5 26.5C5 14 11 2 19 2H55C55 7 52 13 45 16C38 18.5 24 17 15 19.5C9 21 5 23.5 2.5 26.5Z"/>
  <path d="M5 49C7 38 11 24 21 23.5H43C43 29 40 34 33 36.5C26 38.5 16 38 11 41.5C8 43.5 6 46 5 49Z"/>`;

// escala = largura do F em relação ao ícone (0.6 = 60%)
function svg(escala) {
  const largura = 64 * escala;
  const altura = (largura * 52) / 56;
  const x = (64 - largura) / 2;
  const y = (64 - altura) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <defs><linearGradient id="g" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3cf59a"/><stop offset="1" stop-color="#0fb257"/>
    </linearGradient></defs>
    <rect width="64" height="64" fill="#0f1115"/>
    <svg x="${x}" y="${y}" width="${largura}" height="${altura}" viewBox="0 0 56 52" fill="url(#g)">${F}</svg>
  </svg>`;
}

const ficheiros = [
  ["public/icones/icone-192.png", 192, 0.6],
  ["public/icones/icone-512.png", 512, 0.6],
  ["public/icones/icone-mascara-512.png", 512, 0.46],
  ["app/apple-icon.png", 180, 0.6],
];

for (const [caminho, tamanho, escala] of ficheiros) {
  await sharp(Buffer.from(svg(escala)), { density: 600 }).resize(tamanho, tamanho).png().toFile(caminho);
  console.log("feito:", caminho);
}
