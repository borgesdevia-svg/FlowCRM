"use server";
// Server Action da meta de vendas do mês (só administradores; migração 32).
// Uma meta por empresa e por mês: guardar outra vez no mesmo mês substitui o valor.
// O RLS volta a confirmar que é um administrador da mesma empresa e que a empresa está ativa.

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";
import { hojeEmPortugal } from "@/lib/datas";
import { lerValorMeta } from "@/lib/metas";

export async function guardarMeta(estadoAnterior, formData) {
  const { supabase, perfil, eAdmin } = await obterSessao();
  if (!eAdmin) return { erro: "Só os administradores podem mudar a meta." };

  const valor = lerValorMeta(formData.get("valor"));
  if (valor === null) return { erro: "Escreve um valor em euros, por exemplo 12 000." };

  // a meta é sempre do mês atual (dia 1, como pede a tabela)
  const mes = hojeEmPortugal().slice(0, 7) + "-01";
  const { error } = await supabase
    .from("metas")
    .upsert({ empresa_id: perfil.empresa_id, mes, valor }, { onConflict: "empresa_id,mes" });
  if (error) return { erro: "Não foi possível guardar a meta. Tenta outra vez." };

  revalidatePath("/painel");
  return { sucesso: true };
}
