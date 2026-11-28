// Documentos do lead (faturas, propostas, contratos...): regras partilhadas pelo servidor e pelo browser.
// Tabela public.documentos e bucket privado "documentos" (migrações 39, 40 e 41).
// Decisões em PLANO-EMAIL-DOCUMENTOS.md (Fase 1).

// Máximo por ficheiro: o mesmo que o bucket aceita (migração 39).
export const MAX_FICHEIRO = 10 * 1024 * 1024; // 10 MB

// Espaço total por empresa. Enquanto o Supabase é o grátis (1 GB para todas as empresas).
// Quando houver Supabase Pro, sobe-se aqui (ex.: 2 * 1024 ** 3 para 2 GB).
export const MAX_EMPRESA = 200 * 1024 * 1024; // 200 MB

// Categorias, pela ordem em que aparecem. "Fatura" é só do Pro (no Essencial nem aparece).
export const CATEGORIAS = [
  { chave: "proposta", texto: "Proposta" },
  { chave: "contrato", texto: "Contrato" },
  { chave: "fatura", texto: "Fatura", soPro: true },
  { chave: "outro", texto: "Outro" },
];

export const categoriasDoPlano = (pro) => CATEGORIAS.filter((c) => pro || !c.soPro);

export function podeCategoria(chave, pro) {
  const categoria = CATEGORIAS.find((c) => c.chave === chave);
  return Boolean(categoria) && (pro || !categoria.soPro);
}

export const nomeCategoria = (chave) => CATEGORIAS.find((c) => c.chave === chave)?.texto ?? "Outro";

// Tipos aceites (os mesmos do bucket) e a extensão com que o ficheiro fica guardado.
export const TIPOS = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
};

// para o <input type="file" accept="...">
export const ACEITA = [...Object.keys(TIPOS), ...new Set(Object.values(TIPOS).map((e) => `.${e}`))].join(",");

// O Windows às vezes não diz o tipo de .csv, .docx ou .zip (vem vazio ou genérico):
// nesse caso adivinha-se pela extensão do nome.
const POR_EXTENSAO = Object.fromEntries(Object.entries(TIPOS).map(([tipo, ext]) => [ext, tipo]));
POR_EXTENSAO.jpeg = "image/jpeg";

export function tipoDoFicheiro(nome, tipo) {
  if (TIPOS[tipo]) return tipo;
  const ext = String(nome ?? "").toLowerCase().split(".").pop();
  return POR_EXTENSAO[ext] ?? null;
}

// Imagens que o servidor converte para WebP (regra do aluno: todas as imagens carregadas em WebP).
export const eImagem = (tipo) => tipo === "image/png" || tipo === "image/jpeg" || tipo === "image/webp";

// PDFs e imagens abrem no browser; o resto (Word, Excel, ZIP...) descarrega.
export const abreNoBrowser = (tipo) => tipo === "application/pdf" || eImagem(tipo);

// Nome mostrado: sem caminhos, sem caracteres de controlo, no máximo 200 caracteres
// (mantendo a extensão no fim quando é preciso cortar).
export function limparNome(nome) {
  const base = String(nome ?? "")
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  if (!base) return "documento";
  if (base.length <= 200) return base;
  const ponto = base.lastIndexOf(".");
  const ext = ponto > 0 && base.length - ponto <= 10 ? base.slice(ponto) : "";
  return base.slice(0, 200 - ext.length) + ext;
}

// "foto.JPG" -> "foto.webp" (depois da conversão)
export function nomeWebp(nome) {
  const ponto = nome.lastIndexOf(".");
  return limparNome(`${ponto > 0 ? nome.slice(0, ponto) : nome}.webp`);
}

// 1536 -> "1,5 KB"; 3_400_000 -> "3,2 MB"
export function formatarTamanho(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const fmt = (v) => new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(v);
  if (n < 1024 * 1024) return `${fmt(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${fmt(n / (1024 * 1024))} MB`;
  return `${fmt(n / (1024 * 1024 * 1024))} GB`;
}

// Caminho no bucket: <empresa>/<lead>/<id aleatório>.<ext>
// (o servidor confirma depois que o caminho que o browser devolve tem esta forma)
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RE_CAMINHO = new RegExp(`^(${UUID})/(${UUID})/(${UUID})\\.([a-z]{2,4})$`);

export function lerCaminho(caminho) {
  const m = RE_CAMINHO.exec(String(caminho ?? ""));
  return m ? { empresaId: m[1], clienteId: m[2], id: m[3], ext: m[4] } : null;
}
