"use server";
// "use server" = todas as funções deste ficheiro são SERVER ACTIONS:
// correm só no servidor, mas os formulários podem chamá-las diretamente.
// Por isso aqui validamos tudo outra vez: o browser pode ser manipulado.

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Traduz as mensagens de erro do Supabase (em inglês) para português
function traduzirErro(mensagem = "") {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou password incorretos.";
  if (m.includes("already registered")) return "Já existe uma conta com este email.";
  if (m.includes("email not confirmed")) return "Ainda não confirmaste o teu email. Vê a tua caixa de correio.";
  if (m.includes("password should be")) return "A password é demasiado fraca. Usa pelo menos 8 caracteres.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiadas tentativas. Espera um pouco e tenta outra vez.";
  if (m.includes("database error")) return "Não foi possível criar a conta. Verifica os dados e tenta outra vez.";
  return "Ocorreu um erro inesperado. Tenta outra vez.";
}

// Lê um campo do formulário como texto limpo (sem espaços nas pontas)
function campo(formData, nome) {
  return String(formData.get(nome) ?? "").trim();
}

// ---------- Registo de empresa (cria a conta do admin) ----------
// "estadoAnterior" é passado pelo useActionState; não precisamos dele aqui.
export async function registar(estadoAnterior, formData) {
  const valores = {
    nome: campo(formData, "nome"),
    nome_empresa: campo(formData, "nome_empresa"),
    email: campo(formData, "email").toLowerCase(),
  };
  const password = String(formData.get("password") ?? "");

  // validação no servidor (cada erro fica associado ao seu campo)
  const erros = {};
  if (valores.nome.length < 2) erros.nome = "Escreve o teu nome.";
  if (valores.nome_empresa.length < 2) erros.nome_empresa = "Escreve o nome da empresa.";
  if (valores.nome.length > 100) erros.nome = "Nome demasiado longo.";
  if (valores.nome_empresa.length > 100) erros.nome_empresa = "Nome demasiado longo.";
  if (!REGEX_EMAIL.test(valores.email)) erros.email = "Email inválido.";
  if (password.length < 8) erros.password = "A password precisa de pelo menos 8 caracteres.";

  // devolvemos os valores para o formulário não ficar vazio depois de um erro
  if (Object.keys(erros).length > 0) return { erros, valores };

  const supabase = await criarClienteServidor();

  // nome e nome_empresa vão como "user_metadata": o trigger da base de dados
  // (ficheiro supabase/migrations/03_funcoes.sql) usa-os para criar a empresa e o perfil admin
  const { data, error } = await supabase.auth.signUp({
    email: valores.email,
    password,
    options: { data: { nome: valores.nome, nome_empresa: valores.nome_empresa } },
  });

  if (error) return { mensagem: traduzirErro(error.message), valores };

  // Se a confirmação de email estiver ligada no Supabase, ainda não há sessão
  if (!data.session) {
    return {
      sucesso: "Conta criada! Enviámos-te um email: confirma-o e depois entra.",
      valores: {},
    };
  }

  // redirect() envia o utilizador para outra página (tem de ficar fora de try/catch)
  redirect("/painel");
}

// ---------- Login ----------
export async function entrar(estadoAnterior, formData) {
  const valores = { email: campo(formData, "email").toLowerCase() };
  const password = String(formData.get("password") ?? "");

  if (!REGEX_EMAIL.test(valores.email) || password.length === 0) {
    return { mensagem: "Preenche o email e a password.", valores };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email: valores.email, password });

  if (error) return { mensagem: traduzirErro(error.message), valores };

  redirect("/painel");
}

// ---------- Logout ----------
export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
