// Leads duplicados: o mesmo email ou o mesmo telefone noutro lead da empresa.
// Funções puras (sem base de dados), para se poderem testar com npm test.
// Quem as usa: lib/acoes/clientes.js (aviso antes de guardar um lead).

// Só os algarismos do telefone, sem o indicativo de Portugal:
// "+351 912 345 678", "00351912345678" e "912-345-678" dão todos "912345678".
export function normalizarTelefone(telefone) {
  let digitos = String(telefone ?? "").replace(/\D/g, "");
  if (digitos.startsWith("00")) digitos = digitos.slice(2);
  if (digitos.startsWith("351") && digitos.length === 12) digitos = digitos.slice(3);
  return digitos;
}

// Dois telefones são o mesmo se tiverem os mesmos algarismos (ignorando espaços e o +351).
// Números muito curtos (menos de 6 algarismos) nunca contam como iguais.
export function mesmoTelefone(a, b) {
  const x = normalizarTelefone(a);
  const y = normalizarTelefone(b);
  return x.length >= 6 && x === y;
}

// Emails comparam-se sem maiúsculas e sem espaços nas pontas.
export function mesmoEmail(a, b) {
  const x = String(a ?? "").trim().toLowerCase();
  const y = String(b ?? "").trim().toLowerCase();
  return x !== "" && x === y;
}

// Procura, numa lista de leads, o primeiro que repete o email ou o telefone do lead novo.
// "ignorarId": na edição, o próprio lead não conta.
// Devolve { id, nome, campo: "email" | "telefone" } ou null.
export function encontrarDuplicado(lead, candidatos, ignorarId = null) {
  for (const c of candidatos) {
    if (ignorarId && c.id === ignorarId) continue;
    if (mesmoEmail(lead.email, c.email)) return { id: c.id, nome: c.nome, campo: "email" };
    if (mesmoTelefone(lead.telefone, c.telefone)) return { id: c.id, nome: c.nome, campo: "telefone" };
  }
  return null;
}

// Para a pesquisa na base de dados: os últimos 3 algarismos do telefone, que costumam
// estar juntos mesmo em números escritos com espaços ("912 345 678" acaba em "678").
export function fimDoTelefone(telefone) {
  const digitos = normalizarTelefone(telefone);
  return digitos.length >= 6 ? digitos.slice(-3) : null;
}

// Escapa os caracteres especiais do ILIKE (% e _), para o email ser comparado à letra.
export function escaparIlike(texto) {
  return String(texto).replace(/[\\%_]/g, (c) => `\\${c}`);
}
