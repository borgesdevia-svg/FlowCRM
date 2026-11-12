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
