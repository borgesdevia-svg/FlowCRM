"use server";
// Server Actions das automações (só administradores):
//  - guardar os interruptores e os ajustes da página /painel/automacoes;
//  - atribuir um cliente sem responsável (a partir do aviso no sino ou em Notificações).
// As automações em si correm na base de dados (migração 16); aqui só se muda a configuração.
// O RLS volta a confirmar que é um administrador da mesma empresa.

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";

// ---------- guardar a configuração ----------
export async function guardarAutomacoes(estadoAnterior, formData) {
  const { supabase, perfil, eAdmin } = await obterSessao();
  if (!eAdmin) return { erro: "Só os administradores podem mudar as automações." };

  const ligado = (nome) => formData.get(nome) === "on"; // caixa marcada = "on"
  const dias = Number(formData.get("parado_dias"));
  if (!Number.isInteger(dias) || dias < 1 || dias > 90) {
    return { erro: "Escolhe um número de dias entre 1 e 90." };
  }

  // quem fica na roda da distribuição (só ids de pessoas desta empresa: o RLS e a
  // chave estrangeira da tabela recusam qualquer outro)
  const { data: equipa } = await supabase.from("perfis").select("id");
  const idsEquipa = new Set((equipa ?? []).map((p) => p.id));
  const escolhidos = formData.getAll("roda").map(String).filter((id) => idsEquipa.has(id));

  const distribuir = ligado("distribuir_ligada");
  if (distribuir && escolhidos.length === 0) {
    return { erro: "Para distribuir os leads, escolhe pelo menos uma pessoa." };
  }

  const { data, error } = await supabase
    .from("automacoes")
    .update({
      tarefa_ligada: ligado("tarefa_ligada"),
      distribuir_ligada: distribuir,
      parado_ligado: ligado("parado_ligado"),
      parado_dias: dias,
      atualizado_em: new Date().toISOString(),
    })
    .eq("empresa_id", perfil.empresa_id)
    .select("empresa_id");
  if (error || !data?.length) return { erro: "Não foi possível guardar. Tenta outra vez." };

  // roda: tira quem saiu e junta quem entrou (quem fica mantém a sua vez)
  const { data: atuais } = await supabase.from("automacoes_distribuicao").select("perfil_id");
  const naRoda = new Set((atuais ?? []).map((r) => r.perfil_id));
  const sair = [...naRoda].filter((id) => !escolhidos.includes(id));
  const entrar = escolhidos.filter((id) => !naRoda.has(id));

  if (sair.length) {
    await supabase
      .from("automacoes_distribuicao")
      .delete()
      .eq("empresa_id", perfil.empresa_id)
      .in("perfil_id", sair);
  }
  if (entrar.length) {
    await supabase
      .from("automacoes_distribuicao")
      .insert(entrar.map((id) => ({ empresa_id: perfil.empresa_id, perfil_id: id })));
  }

  revalidatePath("/painel/automacoes");
  return { sucesso: "Automações guardadas." };
}

// ---------- atribuir um cliente que está sem responsável ----------
export async function atribuirResponsavel(clienteId, perfilId) {
  const { supabase, eAdmin } = await obterSessao();
  if (!eAdmin) return { erro: "Só os administradores podem atribuir leads." };

  const { data: pessoa } = await supabase.from("perfis").select("id, nome").eq("id", String(perfilId)).maybeSingle();
  if (!pessoa) return { erro: "Essa pessoa não está na equipa." };

  // .is("responsavel_id", null): se outro administrador já o atribuiu, não se sobrepõe
  const { data } = await supabase
    .from("clientes")
    .update({ responsavel_id: pessoa.id })
    .eq("id", String(clienteId))
    .is("responsavel_id", null)
    .select("id");
  if (!data?.length) return { erro: "Este lead já tem responsável." };

  // a base de dados regista "Entregue a …" no histórico e cria a tarefa "Contactar"
  // (se a automação estiver ligada): ver migrações 16 e 21

  revalidatePath("/painel", "layout"); // o sino e os contadores estão no menu de todas as páginas
  return { sucesso: true };
}
