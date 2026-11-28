"use server";
// Server Actions dos modelos de e-mail (página /painel/emails, migração 43).
// Usam a sessão da pessoa: o RLS garante que cada um só cria, edita e apaga os SEUS modelos.

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";
import { eUuid } from "@/lib/validacao";
import { MAX_MODELOS, validarModelo } from "@/lib/emailModelos";

function atualizar() {
  revalidatePath("/painel/emails");
  revalidatePath("/painel/clientes", "layout"); // a janela de escrever da ficha lista os modelos
}

const ler = (formData) => ({
  nome: formData.get("nome"),
  assunto: formData.get("assunto"),
  corpo: formData.get("corpo"),
});

// criar (para useActionState). Também serve para "Adicionar" uma sugestão.
export async function criarModelo(estadoAnterior, formData) {
  const { supabase, perfil } = await obterSessao();
  const { erro, valores } = validarModelo(ler(formData));
  if (erro) return { erro, valores };

  const { count } = await supabase
    .from("email_modelos")
    .select("id", { count: "exact", head: true })
    .eq("perfil_id", perfil.id);
  if ((count ?? 0) >= MAX_MODELOS) return { erro: `Já tens ${MAX_MODELOS} modelos. Apaga um para criares outro.`, valores };

  const { error } = await supabase
    .from("email_modelos")
    .insert({ ...valores, empresa_id: perfil.empresa_id, perfil_id: perfil.id });
  if (error) {
    console.error("Modelos de e-mail: não foi possível criar", error);
    return { erro: "Não foi possível guardar o modelo. Tenta outra vez.", valores };
  }
  atualizar();
  return { sucesso: `Modelo "${valores.nome}" guardado.`, versao: Date.now() };
}

// editar (para useActionState): o id vai num campo escondido
export async function editarModelo(estadoAnterior, formData) {
  const { supabase } = await obterSessao();
  const id = String(formData.get("id") ?? "");
  if (!eUuid(id)) return { erro: "Modelo não encontrado." };
  const { erro, valores } = validarModelo(ler(formData));
  if (erro) return { erro, valores };

  const { data, error } = await supabase
    .from("email_modelos")
    .update({ ...valores, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { erro: "Não foi possível guardar o modelo. Tenta outra vez.", valores };
  atualizar();
  return { sucesso: "Modelo guardado.", valores };
}

export async function apagarModelo(id) {
  const { supabase } = await obterSessao();
  if (!eUuid(id)) return { erro: "Modelo não encontrado." };
  const { data, error } = await supabase.from("email_modelos").delete().eq("id", id).select("id");
  if (error || !data?.length) return { erro: "Não foi possível apagar o modelo." };
  atualizar();
  return { sucesso: true };
}
