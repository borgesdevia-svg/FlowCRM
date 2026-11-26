// De onde veio um lead do formulário (migração 35): o "de" no fim do link.
// Ex.: /f/clinica-sol?de=instagram  ->  canal "instagram".
// Funções puras, testadas com npm test.

// os sítios mais comuns, com o nome bonito para mostrar no painel
export const CANAIS = [
  { chave: "instagram", nome: "Instagram" },
  { chave: "facebook", nome: "Facebook" },
  { chave: "whatsapp", nome: "WhatsApp" },
  { chave: "site", nome: "Site" },
  { chave: "tiktok", nome: "TikTok" },
  { chave: "linkedin", nome: "LinkedIn" },
  { chave: "google", nome: "Google" },
  { chave: "email", nome: "Email" },
];

// Limpa o que vem no link: minúsculas, sem acentos, só letras, números e traços, até 30.
// "Instagram" -> "instagram"; "Feira de Março!" -> "feira-de-marco"; "" ou lixo -> null.
export function limparCanal(texto) {
  const limpo = String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
  return limpo || null;
}

// "instagram" -> "Instagram"; "feira-de-marco" -> "Feira de marco"
export function nomeCanal(chave) {
  if (!chave) return null;
  const conhecido = CANAIS.find((c) => c.chave === chave);
  if (conhecido) return conhecido.nome;
  const texto = chave.replace(/-/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
