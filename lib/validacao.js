// Validações pequenas usadas por várias Server Actions.
// Funções puras (sem base de dados), para se poderem testar com npm test.

// Um id do Supabase (UUID), ex.: "3f2a9c1e-8b7d-4e6f-9a1b-2c3d4e5f6a7b".
// Tudo o que vem do browser é confirmado aqui antes de ir à base de dados:
// o RLS já impede mexer em dados de outras empresas, mas assim um id estragado
// nem chega a ser enviado.
const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function eUuid(valor) {
  return typeof valor === "string" && REGEX_UUID.test(valor);
}

// O endereço do formulário público de cada empresa (/f/padaria-central).
// A mesma regra da base de dados (migração 01): letras minúsculas e números, separados por "-".
const REGEX_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function eSlug(valor) {
  return typeof valor === "string" && valor.length <= 80 && REGEX_SLUG.test(valor);
}

// Um email a sério: "nome@dominio.pt", "ana.silva+crm@empresa.com.br", "x@sub.dominio.io".
// Recusa "João", "ana@", "ana@empresa", "ana@empresa.", "ana@@x.pt", "ana@.pt", "a..b@x.pt".
// Regras: uma só @; antes dela letras/números e . _ % + - (sem começar, acabar ou repetir pontos);
// depois um domínio com pelo menos um ponto e a terminação (.pt, .com, .online…) só com letras,
// 2 ou mais. Aceita domínios com acentos (ex.: café.pt).
const REGEX_LOCAL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const REGEX_ETIQUETA = /^[\p{L}\p{N}]([\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?$/u;
const REGEX_TERMINACAO = /^(\p{L}{2,63}|xn--[a-z0-9-]{1,59})$/u;

export function eEmail(valor) {
  if (typeof valor !== "string" || valor.length > 254) return false;
  const partes = valor.split("@");
  if (partes.length !== 2) return false;
  const [local, dominio] = partes;
  if (!local || local.length > 64 || !REGEX_LOCAL.test(local)) return false;
  const etiquetas = dominio.split(".");
  if (etiquetas.length < 2) return false;
  if (!etiquetas.every((e) => REGEX_ETIQUETA.test(e))) return false;
  return REGEX_TERMINACAO.test(etiquetas.at(-1));
}

// Um telefone: "912 345 678", "+351 912 345 678", "(21) 123-4567", "00351912345678".
// Só algarismos, espaços, pontos, traços e parênteses, com o "+" apenas no início;
// entre 6 e 15 algarismos (o máximo internacional). Recusa "((((((" ou "------".
export function eTelefone(valor) {
  if (typeof valor !== "string" || valor.length > 20) return false;
  if (!/^\+?[0-9 ().-]+$/.test(valor)) return false;
  const digitos = valor.replace(/\D/g, "").length;
  return digitos >= 6 && digitos <= 15;
}

// Um link de site: "https://empresa.pt", "www.empresa.pt/loja", "empresa.pt".
// Sem "https://" acrescenta-se (as pessoas raramente o escrevem). O domínio tem de ter um ponto
// e uma terminação só com letras. Devolve o link completo, ou null se não for um link.
export function lerLink(valor) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!texto || texto.length > 300 || /\s/.test(texto)) return null;
  const completo = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`;
  try {
    const url = new URL(completo);
    const etiquetas = url.hostname.split(".");
    if (etiquetas.length < 2 || !/^\p{L}{2,63}$/u.test(etiquetas.at(-1))) return null;
    return url.href;
  } catch {
    return null;
  }
}
