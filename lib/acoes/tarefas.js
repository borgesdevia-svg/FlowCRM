"use server";
// Server Actions das tarefas/lembretes.
// O RLS garante que só se mexe em tarefas de clientes que a pessoa pode ver.

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";
import { registarEvento } from "@/lib/eventos";

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/; // AAAA-MM-DD (o que o <input type="date"> envia)
const REGEX_UUID = /^[0-9a-f-]{36}$/i;

// atualiza as páginas onde as tarefas aparecem: ficha do cliente, Tarefas, Notificações e painel inicial
function atualizarPaginas(clienteId) {
  if (clienteId) revalidatePath(`/painel/clientes/${clienteId}`);
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/notificacoes");
  revalidatePath("/painel");
}

// ---------- adicionar ----------
// Usado na ficha do cliente (cliente_id vem escondido) e na página Tarefas
// (cliente_id e, para o admin, responsavel_id vêm de listas de escolha).
export async function adicionarTarefa(estadoAnterior, formData) {
  const { supabase, perfil, eAdmin } = await obterSessao();

  const clienteId = String(formData.get("cliente_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const dataLimite = String(formData.get("data_limite") ?? "");
  const pedidoResponsavel = String(formData.get("responsavel_id") ?? "");

  // devolvemos o que foi escrito, para o formulário não ficar vazio depois de um erro
  const valores = { titulo, dataLimite, clienteId };

  if (!REGEX_UUID.test(clienteId)) return { erro: "Escolhe o cliente.", ...valores };
  if (titulo.length < 1) return { erro: "Escreve o que é preciso fazer.", ...valores };
  if (titulo.length > 200) return { erro: "Texto demasiado longo (máximo 200 caracteres).", ...valores };
  if (dataLimite && !REGEX_DATA.test(dataLimite)) return { erro: "Data inválida.", ...valores };

  // Só o admin pode dar a tarefa a outra pessoa. Nunca confiamos no browser:
  // se um comercial enviar outro responsável, a tarefa fica na mesma para ele.
  // (a base de dados também garante que o responsável é da mesma empresa)
  let responsavelId = perfil.id;
  if (eAdmin && REGEX_UUID.test(pedidoResponsavel)) responsavelId = pedidoResponsavel;

  const { error } = await supabase.from("tarefas").insert({
    empresa_id: perfil.empresa_id,
    cliente_id: clienteId,
    responsavel_id: responsavelId,
    titulo,
    data_limite: dataLimite || null,
  });

  if (error) return { erro: "Não foi possível guardar a tarefa. Tenta outra vez.", ...valores };

  atualizarPaginas(clienteId);
  return { versao: Date.now() }; // muda a key do formulário para ele ficar vazio
}

// ---------- marcar como feita / por fazer ----------
export async function alternarTarefa(formData) {
  const { supabase, perfil } = await obterSessao();
  const id = String(formData.get("id") ?? "");
  // o formulário envia o valor ATUAL; gravamos o contrário
  const estavaConcluida = formData.get("concluida") === "true";

  // .select() devolve a tarefa alterada (vazio se o RLS não deixou)
  const { data } = await supabase
    .from("tarefas")
    .update({ concluida: !estavaConcluida })
    .eq("id", id)
    .select("cliente_id, titulo");
  const tarefa = data?.[0];

  // ao CONCLUIR, fica registado no histórico do cliente (atividade recente).
  // O cliente vem da base de dados, não do formulário (não confiamos no browser).
  if (tarefa && !estavaConcluida) {
    await registarEvento(supabase, perfil, tarefa.cliente_id, `Concluiu a tarefa: ${tarefa.titulo}`);
  }
  atualizarPaginas(tarefa?.cliente_id);
}

// ---------- apagar ----------
export async function apagarTarefa(formData) {
  const { supabase } = await obterSessao();
  const id = String(formData.get("id") ?? "");
  const clienteId = String(formData.get("cliente_id") ?? "");

  await supabase.from("tarefas").delete().eq("id", id);
  atualizarPaginas(clienteId);
}
