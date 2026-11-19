"use server";
// Server Action do formulário público /f/[slug] (visitantes SEM login).
// Valida os dados e chama a função "criar_lead" da base de dados
// (supabase/migrations/03_funcoes.sql), que volta a validar tudo e cria o cliente.

import { criarClienteServidor } from "@/lib/supabase/servidor";
import { papelNaEmpresaDoFormulario } from "@/lib/sessao";

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

  const supabase = await criarClienteServidor();

  // um comercial da própria empresa não pode enviar (a página já esconde o formulário,
  // mas o pedido pode ser feito à mão, por isso confirmamos aqui no servidor)
  if ((await papelNaEmpresaDoFormulario(supabase, slug)) === "comercial") {
    return { mensagem: "Já fazes parte desta equipa: o formulário é para os clientes.", valores, respostas };
  }

  // as perguntas atuais da empresa, para avisar logo das obrigatórias que faltam
  const { data: formulario } = await supabase.rpc("formulario_publico", { p_slug: slug });
  const perguntas = formulario?.perguntas ?? [];

  // respostas às perguntas extra: os campos chamam-se "resposta_<id da pergunta>".
  // Nas de várias escolhas vêm vários valores com o mesmo nome: guardamos uma lista.
  const respostas = {};
  for (const p of perguntas) {
    const nome = `resposta_${p.id}`;
    if (p.tipo === "varias") {
      const marcadas = formData.getAll(nome).map((v) => String(v).trim()).filter(Boolean).slice(0, 12);
      if (marcadas.length) respostas[p.id] = marcadas;
    } else {
      const valor = String(formData.get(nome) ?? "").trim().slice(0, 2000);
      if (valor) respostas[p.id] = valor;
    }
  }

  const erros = {};
  for (const p of perguntas) {
    const r = respostas[p.id];
    if (p.obrigatoria && !r) erros[`resposta_${p.id}`] = "Responde a esta pergunta.";
    else if (r && p.tipo === "numero" && !/^-?\d{1,12}([.,]\d{1,4})?$/.test(r)) erros[`resposta_${p.id}`] = "Escreve só um número.";
    else if (r && p.tipo === "data" && !/^\d{4}-\d{2}-\d{2}$/.test(r)) erros[`resposta_${p.id}`] = "Escolhe uma data.";
  }
  if (valores.nome.length < 2 || valores.nome.length > 150) erros.nome = "Escreve o teu nome.";
  if (!REGEX_EMAIL.test(valores.email) || valores.email.length > 254) erros.email = "Escreve um email válido.";
  if (!valores.telefone) erros.telefone = "Escreve o teu telefone.";
  else if (!REGEX_TELEFONE.test(valores.telefone)) erros.telefone = "Telefone inválido.";
  if (Object.keys(erros).length > 0) return { erros, valores, respostas };

  // .rpc() chama uma função da base de dados pelo nome
  const { error } = await supabase.rpc("criar_lead", {
    p_slug: slug,
    p_nome: valores.nome,
    p_email: valores.email,
    p_telefone: valores.telefone || null,
    p_respostas: respostas,
  });

  if (error) {
    return { mensagem: "Não foi possível enviar o pedido. Confirma os dados e tenta outra vez.", valores, respostas };
  }

  return { sucesso: true };
}
