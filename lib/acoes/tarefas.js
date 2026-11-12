"use server";
// Server Actions das tarefas/lembretes de um cliente.
// O RLS garante que só se mexe em tarefas de clientes que a pessoa pode ver.

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/; // AAAA-MM-DD (o que o <input type="date"> envia)

// atualiza a ficha do cliente e o painel inicial (onde aparecem "As minhas tarefas")
function atualizarPaginas(clienteId) {
  if (clienteId) revalidatePath(`/painel/clientes/${clienteId}`);
  revalidatePath("/painel");
}

// ---------- adicionar ----------
export async function adicionarTarefa(estadoAnterior, formData) {
  const { supabase, perfil } = await obterSessao();

  const clienteId = String(formData.get("cliente_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const dataLimite = String(formData.get("data_limite") ?? "");

  if (titulo.length < 1) return { erro: "Escreve o que é preciso fazer.", titulo, dataLimite };
  if (titulo.length > 200) return { erro: "Texto demasiado longo (máximo 200 caracteres).", titulo, dataLimite };
  if (dataLimite && !REGEX_DATA.test(dataLimite)) return { erro: "Data inválida.", titulo };

  const { error } = await supabase.from("tarefas").insert({
    empresa_id: perfil.empresa_id,
    cliente_id: clienteId,
    responsavel_id: perfil.id, // a tarefa fica para quem a cria
    titulo,
    data_limite: dataLimite || null,
  });

  if (error) return { erro: "Não foi possível guardar a tarefa. Tenta outra vez.", titulo, dataLimite };

  atualizarPaginas(clienteId);
  return { versao: Date.now() }; // muda a key do formulário para ele ficar vazio
}

// ---------- marcar como feita / por fazer ----------
export async function alternarTarefa(formData) {
  const { supabase } = await obterSessao();
  const id = String(formData.get("id") ?? "");
  const clienteId = String(formData.get("cliente_id") ?? "");
  // o formulário envia o valor ATUAL; gravamos o contrário
  const estavaConcluida = formData.get("concluida") === "true";

  await supabase.from("tarefas").update({ concluida: !estavaConcluida }).eq("id", id);
  atualizarPaginas(clienteId);
}

// ---------- apagar ----------
export async function apagarTarefa(formData) {
  const { supabase } = await obterSessao();
  const id = String(formData.get("id") ?? "");
  const clienteId = String(formData.get("cliente_id") ?? "");

  await supabase.from("tarefas").delete().eq("id", id);
  atualizarPaginas(clienteId);
}
