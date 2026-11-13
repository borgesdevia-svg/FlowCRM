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
