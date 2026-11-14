"use server";
// Server Actions das tarefas/lembretes.
// O RLS garante que só se mexe em tarefas de clientes que a pessoa pode ver.

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";
import { registarEvento } from "@/lib/eventos";
import { hojeEmPortugal } from "@/lib/datas";

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/; // AAAA-MM-DD (o que o <input type="date"> envia)
const REGEX_UUID = /^[0-9a-f-]{36}$/i;

// atualiza as páginas onde as tarefas aparecem: ficha do cliente, Tarefas (e as suas
// subpáginas Fila e Calendário: "layout" inclui tudo o que está dentro de /painel/tarefas),
// Notificações e painel inicial
function atualizarPaginas(clienteId) {
  if (clienteId) revalidatePath(`/painel/clientes/${clienteId}`);
  revalidatePath("/painel/tarefas", "layout");
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

// ---------- adiar: passa a data limite para amanhã ou para daqui a 7 dias ----------
// adiarTarefa: um botão do modo fila (formulário com id e dias)
// adiarTarefas: a barra de seleção (lista de ids)
const DIAS_ADIAR = [1, 7];

export async function adiarTarefa(formData) {
  await adiarTarefas([String(formData.get("id") ?? "")], Number(formData.get("dias")));
}

export async function adiarTarefas(ids, dias) {
  const { supabase } = await obterSessao();
  const lista = (Array.isArray(ids) ? ids : []).map(String).filter((id) => REGEX_UUID.test(id)).slice(0, 200);
  // só aceitamos os valores dos botões (nunca confiamos no browser)
  if (lista.length === 0 || !DIAS_ADIAR.includes(Number(dias))) return { adiadas: 0 };

  // a nova data conta a partir de HOJE em Portugal (não da data antiga, que pode estar em atraso)
  const nova = new Date(`${hojeEmPortugal()}T00:00:00Z`);
  nova.setUTCDate(nova.getUTCDate() + Number(dias));

  // só as que estão por fazer (adiar uma tarefa feita não faz sentido)
  const { data } = await supabase
    .from("tarefas")
    .update({ data_limite: nova.toISOString().slice(0, 10) })
    .in("id", lista)
    .eq("concluida", false)
    .select("cliente_id");
  const adiadas = data ?? [];

  for (const clienteId of new Set(adiadas.map((t) => t.cliente_id))) revalidatePath(`/painel/clientes/${clienteId}`);
  atualizarPaginas(null);
  return { adiadas: adiadas.length };
}

// ---------- editar uma tarefa (título, data e, só para o admin, o responsável) ----------
// O comercial só edita as SUAS tarefas; o admin edita qualquer uma da empresa.
export async function editarTarefa(estadoAnterior, formData) {
  const { supabase, perfil, eAdmin } = await obterSessao();

  const id = String(formData.get("id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const dataLimite = String(formData.get("data_limite") ?? "");
  const pedidoResponsavel = String(formData.get("responsavel_id") ?? "");

  if (!REGEX_UUID.test(id)) return { erro: "Tarefa inválida." };
  if (titulo.length < 1) return { erro: "Escreve o que é preciso fazer." };
  if (titulo.length > 200) return { erro: "Texto demasiado longo (máximo 200 caracteres)." };
  if (dataLimite && !REGEX_DATA.test(dataLimite)) return { erro: "Data inválida." };

  const alteracoes = { titulo, data_limite: dataLimite || null };
  // o responsável só muda se for o admin a pedir (a base de dados confirma que é da mesma empresa)
  if (eAdmin && REGEX_UUID.test(pedidoResponsavel)) alteracoes.responsavel_id = pedidoResponsavel;

  let consulta = supabase.from("tarefas").update(alteracoes).eq("id", id);
  if (!eAdmin) consulta = consulta.eq("responsavel_id", perfil.id);
  const { data, error } = await consulta.select("cliente_id");

  if (error || !data?.length) return { erro: "Não foi possível guardar a tarefa. Tenta outra vez." };

  atualizarPaginas(data[0].cliente_id);
  return { guardado: Date.now() }; // o painel fecha-se quando este valor muda
}

// ---------- concluir várias de uma vez (página Notificações) ----------
// Recebe uma lista de ids. Só conclui as que ainda estão por fazer e que o RLS deixa mexer.
export async function concluirTarefas(ids) {
  const { supabase, perfil } = await obterSessao();
  const lista = (Array.isArray(ids) ? ids : []).map(String).filter((id) => REGEX_UUID.test(id)).slice(0, 200);
  if (lista.length === 0) return { concluidas: 0 };

  const { data } = await supabase
    .from("tarefas")
    .update({ concluida: true })
    .in("id", lista)
    .eq("concluida", false)
    .select("cliente_id, titulo");
  const feitas = data ?? [];

  // fica registado no histórico de cada cliente, como quando se conclui uma a uma
  if (feitas.length > 0) {
    await supabase.from("interacoes").insert(
      feitas.map((t) => ({
        empresa_id: perfil.empresa_id,
        cliente_id: t.cliente_id,
        autor_id: perfil.id,
        tipo: "sistema",
        nota: `Concluiu a tarefa: ${t.titulo}`,
      }))
    );
  }

  for (const clienteId of new Set(feitas.map((t) => t.cliente_id))) revalidatePath(`/painel/clientes/${clienteId}`);
  atualizarPaginas(null);
  return { concluidas: feitas.length };
}

// ---------- voltar a pôr por fazer (tarefas feitas selecionadas) ----------
export async function reabrirTarefas(ids) {
  const { supabase } = await obterSessao();
  const lista = (Array.isArray(ids) ? ids : []).map(String).filter((id) => REGEX_UUID.test(id)).slice(0, 200);
  if (lista.length === 0) return { reabertas: 0 };

  const { data } = await supabase
    .from("tarefas")
    .update({ concluida: false })
    .in("id", lista)
    .eq("concluida", true)
    .select("cliente_id");
  const reabertas = data ?? [];

  for (const clienteId of new Set(reabertas.map((t) => t.cliente_id))) revalidatePath(`/painel/clientes/${clienteId}`);
  atualizarPaginas(null);
  return { reabertas: reabertas.length };
}

// ---------- apagar várias de uma vez (seleção nas listas de tarefas) ----------
// O RLS garante que só se apagam tarefas a que esta pessoa tem acesso.
export async function apagarTarefas(ids) {
  const { supabase } = await obterSessao();
  const lista = (Array.isArray(ids) ? ids : []).map(String).filter((id) => REGEX_UUID.test(id)).slice(0, 200);
  if (lista.length === 0) return { apagadas: 0 };

  const { data } = await supabase.from("tarefas").delete().in("id", lista).select("cliente_id");
  const apagadas = data ?? [];

  for (const clienteId of new Set(apagadas.map((t) => t.cliente_id))) revalidatePath(`/painel/clientes/${clienteId}`);
  atualizarPaginas(null);
  return { apagadas: apagadas.length };
}

// ---------- apagar ----------
export async function apagarTarefa(formData) {
  const { supabase } = await obterSessao();
  const id = String(formData.get("id") ?? "");
  const clienteId = String(formData.get("cliente_id") ?? "");

  await supabase.from("tarefas").delete().eq("id", id);
  atualizarPaginas(clienteId);
}
