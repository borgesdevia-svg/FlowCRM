import { redirect } from "next/navigation";

// Endereço antigo: a página "Personalizar" passou a chamar-se "Formulário".
// Quem tiver o link guardado vai parar ao sítio novo.
export default function PaginaPersonalizarAntiga() {
  redirect("/painel/formulario");
}
