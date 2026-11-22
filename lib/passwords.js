// Regras das passwords novas, iguais às do Supabase
// (Authentication > Sign In / Providers > Email: mínimo 8, com minúsculas, maiúsculas, números e símbolos).
// Se mudares a regra no Supabase, muda também aqui (EXIGE_SIMBOLO).
// Verificamos aqui primeiro para mostrar a mensagem em português, antes de o Supabase recusar em inglês.
// Usado no registo, em "A minha conta", ao criar um membro da equipa e na recuperação da password.

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72; // o Supabase (bcrypt) só usa os primeiros 72 bytes

export const EXIGE_SIMBOLO = true;
// os símbolos que o Supabase aceita
const SIMBOLOS = /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/;

export const DICA_PASSWORD = "8 ou mais, com maiúscula, minúscula, número e símbolo";

// devolve a mensagem de erro, ou null se a password serve
export function erroPassword(password) {
  const p = String(password ?? "");
  if (p.length < MIN_PASSWORD) return `A password precisa de pelo menos ${MIN_PASSWORD} caracteres.`;
  if (new TextEncoder().encode(p).length > MAX_PASSWORD) return "A password é demasiado longa.";
  const falta = [];
  if (!/[a-z]/.test(p)) falta.push("uma letra minúscula");
  if (!/[A-Z]/.test(p)) falta.push("uma letra maiúscula");
  if (!/\d/.test(p)) falta.push("um número");
  if (EXIGE_SIMBOLO && !SIMBOLOS.test(p)) falta.push("um símbolo (ex.: ! ? # @)");
  if (falta.length === 0) return null;
  const lista = falta.length === 1 ? falta[0] : `${falta.slice(0, -1).join(", ")} e ${falta.at(-1)}`;
  return `A password precisa de ter pelo menos ${lista}.`;
}
