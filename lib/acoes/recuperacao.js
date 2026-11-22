"use server";
// Server Actions da chave de recuperação (recuperar a password sem email).
// A tabela chaves_recuperacao não se lê pela API (migração 23): só o cliente
// admin (chave secreta) mexe nela, e SEMPRE para a pessoa com sessão iniciada
// ou depois de confirmar email + chave.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { gerarChave, chaveValida, hashChave, hashesIguais } from "@/lib/chaveRecuperacao";

// ---------- criar uma chave nova para quem tem sessão ----------
// A antiga (se havia) deixa de valer. Devolve a chave em texto UMA vez, para a janela a mostrar.
export async function criarChaveNova() {
  const { perfil } = await obterSessao();
  const chave = gerarChave();
  const { error } = await criarClienteAdmin()
    .from("chaves_recuperacao")
    .upsert({ perfil_id: perfil.id, hash: hashChave(chave), guardada: false, criada_em: new Date().toISOString() });
  if (error) return { erro: "Não foi possível criar a chave. Tenta outra vez." };
  return { chave };
}

// ---------- "Já guardei a chave" ----------
// Recebe a chave que a janela mostrou e confirma que é mesmo a que está na base de dados
// (se não for, por exemplo porque se abriu noutro separador, pede para gerar outra).
export async function confirmarChaveGuardada(chave) {
  const { perfil } = await obterSessao();
  const admin = criarClienteAdmin();
  const { data } = await admin.from("chaves_recuperacao").select("hash").eq("perfil_id", perfil.id).maybeSingle();
  if (!data || !hashesIguais(data.hash, hashChave(chave))) {
    return { erro: "Esta chave já não é a mais recente. Gera uma nova." };
  }
  await admin.from("chaves_recuperacao").update({ guardada: true }).eq("perfil_id", perfil.id);
  revalidatePath("/painel", "layout"); // o layout deixa de mostrar a janela
  return { sucesso: true };
}

// ---------- Esqueci-me da password ----------
// Email + chave certos -> password nova, a chave fica gasta e a pessoa entra no painel
// (onde lhe aparece logo uma chave nova para guardar).
const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// a mesma mensagem para email errado e chave errada: assim ninguém descobre que emails têm conta
const ERRO_DADOS = "O email ou a chave de recuperação não estão certos.";

export async function recuperarPassword(estadoAnterior, formData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const chave = String(formData.get("chave") ?? "");
  const nova = String(formData.get("password") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");
  const valores = { email };

  if (!REGEX_EMAIL.test(email)) return { mensagem: "Escreve o email da tua conta.", valores };
  if (!chaveValida(chave)) return { mensagem: "A chave tem 30 letras e números (ex.: K7QM2-XH9PD-…).", valores };
  if (nova.length < 8) return { mensagem: "A password nova precisa de pelo menos 8 caracteres.", valores };
  if (nova !== confirmacao) return { mensagem: "As duas passwords não são iguais.", valores };

  const admin = criarClienteAdmin();
  const { data: perfil } = await admin.from("perfis").select("id").eq("email", email).maybeSingle();
  const { data: linha } = perfil
    ? await admin.from("chaves_recuperacao").select("hash").eq("perfil_id", perfil.id).maybeSingle()
    : { data: null };
  // compara sempre um hash (mesmo sem conta), para a resposta demorar o mesmo nos dois casos
  const certo = hashesIguais(linha?.hash ?? "0".repeat(64), hashChave(chave)) && Boolean(linha);
  if (!certo) return { mensagem: ERRO_DADOS, valores };

  const { error } = await admin.auth.admin.updateUserById(perfil.id, { password: nova });
  if (error) return { mensagem: "Não foi possível mudar a password. Tenta outra vez.", valores };

  // a chave fica gasta: sem linha, o painel gera e mostra uma nova logo ao entrar
  await admin.from("chaves_recuperacao").delete().eq("perfil_id", perfil.id);

  // entra já com a password nova
  const supabase = await criarClienteServidor();
  const { error: erroEntrar } = await supabase.auth.signInWithPassword({ email, password: nova });
  if (erroEntrar) {
    return { sucesso: "A password foi mudada. Já podes entrar com a password nova.", valores: {} };
  }
  redirect("/painel");
}
