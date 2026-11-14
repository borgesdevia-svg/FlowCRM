"use server";
// Server Actions das notas/interações de um cliente.
// O RLS garante que só se escrevem notas em clientes que a pessoa pode ver,
// sempre em nome da própria pessoa, e que só o autor (ou o admin) as apaga.

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";

// (num ficheiro "use server" só se podem exportar funções async, por isso isto não é exportado)
const TIPOS_INTERACAO = ["nota", "chamada", "email", "reuniao"];

// ---------- adicionar uma nota ----------
export async function adicionarInteracao(estadoAnterior, formData) {
  const { supabase, perfil } = await obterSessao();

  const clienteId = String(formData.get("cliente_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "nota");
  const nota = String(formData.get("nota") ?? "").trim();

  if (!TIPOS_INTERACAO.includes(tipo)) return { erro: "Escolhe o tipo de registo." };
  if (nota.length < 1) return { erro: "Escreve o que aconteceu.", nota };
  if (nota.length > 5000) return { erro: "O texto é demasiado longo (máximo 5000 caracteres).", nota };

  const { error } = await supabase.from("interacoes").insert({
    empresa_id: perfil.empresa_id,
    cliente_id: clienteId,
    autor_id: perfil.id, // sempre em nome de quem está com sessão iniciada
    tipo,
    nota,
  });

  if (error) return { erro: "Não foi possível guardar. Tenta outra vez.", nota };

  revalidatePath(`/painel/clientes/${clienteId}`);
  revalidatePath("/painel/tarefas/fila"); // o modo fila mostra o último registo do cliente
  // "versao" muda a cada nota guardada: o formulário usa-a como key para ficar vazio
  return { versao: Date.now() };
}

// ---------- apagar uma nota ----------
export async function apagarInteracao(formData) {
  const { supabase } = await obterSessao();
  const id = String(formData.get("id") ?? "");
  const clienteId = String(formData.get("cliente_id") ?? "");

  await supabase.from("interacoes").delete().eq("id", id);
  revalidatePath(`/painel/clientes/${clienteId}`);
  revalidatePath("/painel/tarefas/fila"); // o modo fila mostra o último registo do cliente
}
