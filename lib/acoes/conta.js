"use server";
// Server Actions da página "A minha conta": perfil (nome, cargo, telefone), texto do e-mail,
// password e sessões.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { erroPassword } from "@/lib/passwords";
import { MAX_MODELO_EMAIL } from "@/lib/linkEmail";

// ---------- o meu perfil: nome, cargo e telefone ----------
// O cargo e o telefone são opcionais (vazio = apagar). A equipa vê-os na página Equipa.
export async function mudarPerfil(estadoAnterior, formData) {
  const { supabase, perfil } = await obterSessao();
  const nome = String(formData.get("nome") ?? "").replace(/\s+/g, " ").trim();
  const cargo = String(formData.get("cargo") ?? "").replace(/\s+/g, " ").trim();
  const telefone = String(formData.get("telefone") ?? "").replace(/\s+/g, " ").trim();
  const valores = { nome, cargo, telefone };

  if (nome.length < 2 || nome.length > 100) return { erro: "Escreve o teu nome (2 a 100 caracteres).", valores };
  if (cargo && (cargo.length < 2 || cargo.length > 60)) return { erro: "O cargo tem de ter 2 a 60 caracteres.", valores };
  if (telefone && !/^\+?[\d\s().-]{6,30}$/.test(telefone)) {
    return { erro: "Escreve um telefone válido (só números, espaços e +).", valores };
  }

  // o RLS só deixa cada pessoa alterar a sua própria linha, e só estas colunas (migração 30)
  const { error } = await supabase
    .from("perfis")
    .update({ nome, cargo: cargo || null, telefone: telefone || null })
    .eq("id", perfil.id);
  if (error) return { erro: "Não foi possível guardar. Tenta outra vez.", valores };

  // o nome aparece no menu lateral de todas as páginas do painel: atualiza o layout
  revalidatePath("/painel", "layout");
  return { sucesso: "Perfil guardado.", valores };
}

// ---------- definições de e-mail: o texto pré-escrito ----------
// O botão de e-mail da ficha abre o Gmail com este texto já escrito (vazio = sem texto).
// As palavras {saudacao}, {nome}, {empresa} e {eu} preenchem-se ao clicar (lib/linkEmail.js).
export async function mudarModeloEmail(estadoAnterior, formData) {
  const { supabase, perfil } = await obterSessao();
  // \r\n (Windows) passa a \n; espaços no fim de cada linha e linhas vazias no fim saem
  const modelo = String(formData.get("modelo") ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trimEnd();
  const valores = { modelo };

  if (modelo.length > MAX_MODELO_EMAIL) {
    return { erro: `O texto é demasiado longo (máximo ${MAX_MODELO_EMAIL} caracteres).`, valores };
  }

  // o RLS só deixa cada pessoa alterar a sua própria linha, e só esta coluna (migração 38)
  const { error } = await supabase
    .from("perfis")
    .update({ email_modelo: modelo.trim() ? modelo : null })
    .eq("id", perfil.id);
  if (error) return { erro: "Não foi possível guardar. Tenta outra vez.", valores };

  // a ficha e o modo fila usam o texto no botão de e-mail
  revalidatePath("/painel", "layout");
  return { sucesso: modelo.trim() ? "Mensagem do início guardada." : "Mensagem do início apagada.", valores };
}

// ---------- sessões ----------
// "outros": termina a sessão em todos os outros dispositivos (esta continua aberta);
// "todos": termina em todo o lado, esta incluída (volta ao Entrar).
export async function terminarSessoes(formData) {
  const { supabase } = await obterSessao();
  const onde = formData.get("onde") === "todos" ? "global" : "others";
  const { error } = await supabase.auth.signOut({ scope: onde });
  if (onde === "global") redirect("/login");
  redirect(error ? "/painel/conta?sessoes=erro" : "/painel/conta?sessoes=ok");
}

// ---------- mudar a password ----------
export async function mudarPassword(estadoAnterior, formData) {
  const { supabase, perfil } = await obterSessao();
  const atual = String(formData.get("atual") ?? "");
  const nova = String(formData.get("nova") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (!atual) return { erro: "Escreve a tua password atual." };
  if (erroPassword(nova)) return { erro: erroPassword(nova) };
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
