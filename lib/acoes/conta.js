"use server";
// Server Actions da página "A minha conta": mudar o nome e a password.

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";

// ---------- mudar o nome ----------
export async function mudarNome(estadoAnterior, formData) {
  const { supabase, perfil } = await obterSessao();
  const nome = String(formData.get("nome") ?? "").trim();

  if (nome.length < 2 || nome.length > 100) {
    return { erro: "Escreve o teu nome (2 a 100 caracteres).", nome };
  }

  // o RLS só deixa cada pessoa alterar a sua própria linha, e só a coluna "nome"
  const { error } = await supabase.from("perfis").update({ nome }).eq("id", perfil.id);
  if (error) return { erro: "Não foi possível guardar o nome. Tenta outra vez.", nome };

  // o nome aparece no menu lateral de todas as páginas do painel: atualiza o layout
  revalidatePath("/painel", "layout");
  return { sucesso: "Nome guardado." };
}

// ---------- mudar a password ----------
export async function mudarPassword(estadoAnterior, formData) {
  const { supabase, perfil } = await obterSessao();
  const atual = String(formData.get("atual") ?? "");
  const nova = String(formData.get("nova") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (!atual) return { erro: "Escreve a tua password atual." };
  if (nova.length < 8) return { erro: "A nova password precisa de pelo menos 8 caracteres." };
  if (nova !== confirmacao) return { erro: "As duas passwords novas não são iguais." };
  if (nova === atual) return { erro: "A nova password tem de ser diferente da atual." };

  // Confirma a password atual: se alguém deixar a sessão aberta num computador,
  // outra pessoa não consegue trocar-lhe a password.
  const { error: erroAtual } = await supabase.auth.signInWithPassword({
    email: perfil.email,
    password: atual,
  });
  if (erroAtual) return { erro: "A password atual está errada." };

  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) return { erro: "Não foi possível mudar a password. Tenta outra vez." };

  return { sucesso: "Password alterada." };
}
