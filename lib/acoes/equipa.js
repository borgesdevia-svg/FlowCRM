"use server";
// Server Actions da página Equipa (só para o admin).
// Usam o cliente com a chave secreta, por isso a PRIMEIRA coisa que fazem
// é confirmar no servidor que quem pede é admin.

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ---------- adicionar um comercial ----------
export async function criarMembro(estadoAnterior, formData) {
  const { perfil, eAdmin } = await obterSessao();
  if (!eAdmin) return { mensagem: "Só o administrador pode adicionar membros." };

  const valores = {
    nome: String(formData.get("nome") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  };
  const password = String(formData.get("password") ?? "");

  const erros = {};
  if (valores.nome.length < 2 || valores.nome.length > 100) erros.nome = "Escreve o nome (2 a 100 caracteres).";
  if (!REGEX_EMAIL.test(valores.email)) erros.email = "Email inválido.";
  if (password.length < 8) erros.password = "A password precisa de pelo menos 8 caracteres.";
  // a confirmação é verificada no servidor (não confiamos só no browser)
  if (String(formData.get("confirmacao") ?? "") !== password) erros.confirmacao = "As passwords não são iguais.";
  if (Object.keys(erros).length > 0) return { erros, valores };

  let admin;
  try {
    admin = criarClienteAdmin();
  } catch {
    return { mensagem: "O servidor não está configurado (falta a chave secreta no .env.local).", valores };
  }

  // app_metadata só pode ser escrito com a chave secreta: é daqui que o trigger
  // da base de dados lê a empresa do novo membro (o browser não a consegue falsificar).
  const { error } = await admin.auth.admin.createUser({
    email: valores.email,
    password,
    email_confirm: true, // a conta fica logo ativa
    user_metadata: { nome: valores.nome },
    app_metadata: { empresa_id: perfil.empresa_id },
  });

  if (error) {
    const jaExiste = error.message.toLowerCase().includes("already");
    return {
      mensagem: jaExiste ? "Já existe uma conta com este email." : "Não foi possível criar o membro. Tenta outra vez.",
      valores,
    };
  }

  // volta a carregar a lista da equipa com o novo membro
  revalidatePath("/painel/equipa");
  return { sucesso: `${valores.nome} já faz parte da equipa. Partilha o email e a password com essa pessoa.` };
}

// ---------- remover um membro ----------
export async function removerMembro(formData) {
  const { supabase, perfil, eAdmin } = await obterSessao();
  if (!eAdmin) return;

  const id = String(formData.get("id") ?? "");
  if (!id || id === perfil.id) return; // o admin não se pode remover a si próprio

  // Confirma (com o cliente normal, sujeito ao RLS) que o membro é da MESMA empresa.
  // Sem isto, um admin podia apagar utilizadores de outras empresas enviando outro id.
  const { data: membro } = await supabase.from("perfis").select("id").eq("id", id).single();
  if (!membro) return;

  // apagar o utilizador do Auth apaga também o perfil (on delete cascade);
  // os clientes dele ficam sem responsável (o admin pode reatribuí-los)
  await criarClienteAdmin().auth.admin.deleteUser(id);

  revalidatePath("/painel/equipa");
}
