"use server";
// Server Actions do interruptor "Avisos de leads novos" em A minha conta (migração 34).
// O browser cria a subscrição; aqui só se guarda (ou apaga) para a pessoa com sessão.

import { obterSessao } from "@/lib/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { subscricaoValida } from "@/lib/subscricao";

export async function ligarAvisos(subscricao) {
  const { perfil } = await obterSessao();
  if (!subscricaoValida(subscricao)) return { erro: "Este browser não devolveu uma subscrição válida." };

  // com a chave secreta porque o mesmo browser pode já ter sido usado por outra pessoa
  // (o endpoint é único): passa a ser desta pessoa, que acabou de ligar os avisos com sessão aberta
  const admin = criarClienteAdmin();
  const { error } = await admin.from("subscricoes_push").upsert(
    {
      perfil_id: perfil.id,
      endpoint: subscricao.endpoint,
      p256dh: subscricao.keys.p256dh,
      auth: subscricao.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { erro: "Não foi possível ligar os avisos. Tenta outra vez." };
  return { sucesso: true };
}

export async function desligarAvisos(endpoint) {
  const { supabase } = await obterSessao();
  if (typeof endpoint !== "string" || endpoint.length > 1000) return { erro: "Pedido inválido." };
  // o RLS só deixa apagar as subscrições da própria pessoa
  await supabase.from("subscricoes_push").delete().eq("endpoint", endpoint);
  return { sucesso: true };
}
