// Ler valores em euros escritos à mão, como os portugueses os escrevem.
// Função pura, usada no browser e no servidor, testada com npm test.
//
//   "1500"        -> 1500        "12 000 €"   -> 12000
//   "1500,50"     -> 1500.5      "12.000"     -> 12000   (ponto dos milhares)
//   "12.000,50"   -> 12000.5     "1.250.000"  -> 1250000
//   "1500.50"     -> 1500.5      "1.5"        -> 1.5     (ponto decimal à inglesa)
//   "" ou "abc"   -> NaN
export function lerEuros(valor) {
  if (typeof valor === "number") return valor;
  let texto = String(valor ?? "").replace(/[\s€]/g, "");
  if (texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(",", "."); // vírgula = décimas, pontos = milhares
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, ""); // "12.000" ou "1.250.000": pontos dos milhares
  }
  return /^-?\d+(\.\d+)?$/.test(texto) ? Number(texto) : NaN;
}
