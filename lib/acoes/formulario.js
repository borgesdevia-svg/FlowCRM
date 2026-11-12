"use server";
// Server Action do formulário público /f/[slug] (visitantes SEM login).
// Valida os dados e chama a função "criar_lead" da base de dados
// (supabase/migrations/03_funcoes.sql), que volta a validar tudo e cria o cliente.

import { criarClienteServidor } from "@/lib/supabase/servidor";

const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const REGEX_TELEFONE = /^[0-9 +()-]{6,20}$/;

export async function enviarLead(estadoAnterior, formData) {
  // Campo "armadilha" (honeypot): está escondido, por isso uma pessoa nunca o preenche.
  // Se vier preenchido, foi um robô de spam: fingimos sucesso e não guardamos nada.
  if (String(formData.get("website") ?? "") !== "") {
    return { sucesso: true };
  }

  const slug = String(formData.get("slug") ?? "");
  const valores = {
    nome: String(formData.get("nome") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    telefone: String(formData.get("telefone") ?? "").trim(),
  };

  const erros = {};
  if (valores.nome.length < 2 || valores.nome.length > 150) erros.nome = "Escreve o teu nome.";
  if (!REGEX_EMAIL.test(valores.email) || valores.email.length > 254) erros.email = "Escreve um email válido.";
  if (valores.telefone && !REGEX_TELEFONE.test(valores.telefone)) erros.telefone = "Telefone inválido.";
  if (Object.keys(erros).length > 0) return { erros, valores };

  const supabase = await criarClienteServidor();

  // .rpc() chama uma função da base de dados pelo nome
  const { error } = await supabase.rpc("criar_lead", {
    p_slug: slug,
    p_nome: valores.nome,
    p_email: valores.email,
    p_telefone: valores.telefone || null,
  });

  if (error) {
    return { mensagem: "Não foi possível enviar o pedido. Confirma os dados e tenta outra vez.", valores };
  }

  return { sucesso: true };
}
