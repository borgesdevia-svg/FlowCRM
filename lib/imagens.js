// Conversão de imagens para WebP (só no SERVIDOR).
// Regra do aluno (2026-11-27): TODAS as imagens que as pessoas carregam ficam em WebP,
// qualidade 85 e o lado maior no máximo 2000 px. Os ícones do site/PWA ficam em PNG.
// Usa o "sharp" (a mesma biblioteca que o Next.js usa para otimizar imagens).

import sharp from "sharp";

export const QUALIDADE_WEBP = 85;
export const LADO_MAXIMO = 2000;

// Recebe os bytes de uma imagem PNG/JPG/WebP e devolve os bytes em WebP.
// rotate(): endireita fotos do telemóvel (orientação EXIF) antes de tirar os metadados
// (que podem ter a localização GPS da foto).
export async function paraWebp(bytes) {
  return sharp(Buffer.from(bytes), { limitInputPixels: 100_000_000 })
    .rotate()
    .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALIDADE_WEBP })
    .toBuffer();
}
