"use server";
// Server Actions das propostas (CRM Pro).
// Criar e apagar: na ficha do lead, com login (o RLS confirma a empresa, o lead e o plano Pro).
// Responder: na página pública /p/[token], sem login (função responder_proposta da base de dados).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { eUuid } from "@/lib/validacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { LIMITES_PROPOSTA, calcularTotal, normalizarItens } from "@/lib/propostas";

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

// ---------- criar ----------
// dados = { clienteId, titulo, itens: [{descricao, quantidade, preco}], notas, validade }
export async function criarProposta(dados) {
  const { supabase, perfil, plano } = await obterSessao();
  if (!plano.pro) return { erro: "As propostas são do CRM Pro." };

  const clienteId = String(dados?.clienteId ?? "");
  if (!eUuid(clienteId)) return { erro: "Lead inválido." };

  const titulo = String(dados?.titulo ?? "").trim().replace(/\s+/g, " ");
  if (!titulo) return { erro: "Dá um título à proposta (ex.: Site novo)." };
  if (titulo.length > LIMITES_PROPOSTA.titulo) return { erro: "O título é demasiado longo." };

  const resultado = normalizarItens(dados?.itens);
  if (resultado.erro) return { erro: resultado.erro };

  const notas = String(dados?.notas ?? "").trim();
  if (notas.length > LIMITES_PROPOSTA.notas) return { erro: "As notas são demasiado longas." };

  const validade = String(dados?.validade ?? "");
  if (validade && !REGEX_DATA.test(validade)) return { erro: "A data de validade não é válida." };

  const { error } = await supabase.from("propostas").insert({
    empresa_id: perfil.empresa_id,
    cliente_id: clienteId,
    autor_id: perfil.id,
    titulo,
    itens: resultado.itens,
    total: calcularTotal(resultado.itens), // o total é sempre calculado aqui
    notas: notas || null,
    validade: validade || null,
  });
  if (error) return { erro: "Não foi possível criar a proposta. Tenta outra vez." };

  revalidatePath(`/painel/clientes/${clienteId}`);
  redirect(`/painel/clientes/${clienteId}?proposta=nova#propostas`);
}

// ---------- apagar (o autor ou o admin; o RLS confirma) ----------
export async function apagarProposta(formData) {
  const { supabase } = await obterSessao();
  const id = String(formData.get("id") ?? "");
  const clienteId = String(formData.get("cliente_id") ?? "");
  if (!eUuid(id) || !eUuid(clienteId)) return;
  await supabase.from("propostas").delete().eq("id", id);
  revalidatePath(`/painel/clientes/${clienteId}`);
}

// ---------- o cliente responde (página pública, sem login) ----------
const MENSAGENS = {
  nao_existe: "Esta proposta já não existe.",
  ja_respondida: "Esta proposta já tinha sido respondida.",
  expirada: "A validade desta proposta já acabou. Fale com a empresa para receber uma nova.",
  falta_nome: "Escreva o seu nome para aceitar.",
};

export async function responderProposta(token, aceitar, nome) {
  if (!eUuid(String(token ?? ""))) return { erro: MENSAGENS.nao_existe };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("responder_proposta", {
    p_token: token,
    p_aceitar: Boolean(aceitar),
    p_nome: String(nome ?? "").slice(0, 120),
  });
  if (error) return { erro: "Não foi possível enviar a resposta. Tente outra vez." };
  if (MENSAGENS[data]) return { erro: MENSAGENS[data] };
  revalidatePath(`/p/${token}`);
  return { ok: true, estado: data };
}
