// Funções auxiliares para texto.

// Iniciais de um nome, para os "avatares": "Ana Costa" -> "AC", "Rui" -> "R".
// filter(Boolean) tira os bocados vazios (ex.: dois espaços seguidos).
export function iniciais(nome) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

// Texto de pesquisa no mesmo formato da coluna "pesquisa" dos clientes (migração 07):
// minúsculas e sem acentos ("Clínica" -> "clinica"). Também tira os caracteres que
// têm significado especial nas pesquisas (% _ , ( ) \) e corta textos muito longos.
export function termoPesquisa(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira os acentos
    .toLowerCase()
    .replace(/[%_,()\\]/g, "")
    .trim()
    .slice(0, 80);
}

// Telefone para mostrar: números portugueses ficam em grupos de 3 ("912345678" -> "912 345 678",
// "+351912345678" -> "+351 912 345 678"). Outros formatos ficam como foram escritos.
export function formatarTelefone(telefone) {
  const texto = String(telefone ?? "").trim();
  const digitos = texto.replace(/[\s()-]/g, "");
  const m = /^(\+351|00351)?(\d{9})$/.exec(digitos);
  if (!m) return texto;
  const grupos = m[2].replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
  return m[1] ? `+351 ${grupos}` : grupos;
}

// Endereço "tel:" (só dígitos e o "+"), para o telemóvel ligar ao carregar no número
export function linkTelefone(telefone) {
  return `tel:${String(telefone ?? "").replace(/[^\d+]/g, "")}`;
}
