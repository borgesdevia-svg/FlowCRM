"use server";
// Server Action: importar clientes de um CSV (página /painel/clientes/importar).
// Recebe o TEXTO do ficheiro e volta a validá-lo aqui (o browser só mostra a pré-visualização).
// Usa o cliente Supabase normal (com a sessão), por isso o RLS aplica-se: o comercial só
// consegue criar clientes de que é responsável, e ninguém cria clientes noutra empresa.

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";
import { eUuid } from "@/lib/validacao";
import { prepararImportacao } from "@/lib/importar";

const BLOCO = 500; // linhas por pedido à base de dados

export async function importarClientes(estadoAnterior, formData) {
  const { supabase, perfil, eAdmin } = await obterSessao();

  const texto = String(formData.get("csv") ?? "");
  const preparado = prepararImportacao(texto);
  if (preparado.erro) return { erro: preparado.erro };

  // responsável: o admin escolhe (ou "por atribuir"); o comercial fica sempre com os seus
  let responsavel = perfil.id;
  if (eAdmin) {
    const escolhido = String(formData.get("responsavel_id") ?? "");
    if (escolhido === "") responsavel = null;
    else if (!eUuid(escolhido)) return { erro: "Escolhe um responsável da tua equipa." };
    else {
      // tem de ser alguém da equipa (o RLS dos perfis só mostra a própria empresa)
      const { data } = await supabase.from("perfis").select("id").eq("id", escolhido).maybeSingle();
      if (!data) return { erro: "Escolhe um responsável da tua equipa." };
      responsavel = data.id;
    }
  }

  // emails que JÁ existem no CRM: esses clientes não são importados outra vez.
  // (o comercial só vê os seus clientes, por isso só esses contam como repetidos para ele)
  const emails = [...new Set(preparado.clientes.map((c) => c.email).filter(Boolean))];
  const existentes = new Set();
  for (let i = 0; i < emails.length; i += 200) {
    const { data, error } = await supabase.from("clientes").select("email").in("email", emails.slice(i, i + 200));
    if (error) return { erro: "Não foi possível confirmar os leads que já existem. Tenta outra vez." };
    for (const c of data) existentes.add(c.email);
  }

  const repetidos = [...preparado.repetidos];
  const novos = [];
  for (const c of preparado.clientes) {
    if (c.email && existentes.has(c.email)) repetidos.push({ linha: c.linha, email: c.email });
    else novos.push(c);
  }

  // grava em blocos. Se um bloco falhar, os anteriores já ficaram gravados: diz-se quantos.
  let importados = 0;
  for (let i = 0; i < novos.length; i += BLOCO) {
    const linhas = novos.slice(i, i + BLOCO).map(({ linha, ...c }) => ({
      ...c,
      empresa_id: perfil.empresa_id,
      responsavel_id: responsavel,
      origem: "manual",
    }));
    const { error } = await supabase.from("clientes").insert(linhas);
    if (error) {
      revalidatePath("/painel", "layout");
      return {
        erro: `A importação parou a meio: ${importados} leads foram gravados, os restantes não. Tenta importar o resto outra vez.`,
        importados,
      };
    }
    importados += linhas.length;
  }

  // os clientes novos aparecem na lista, na pipeline, no Início e nas tarefas automáticas
  revalidatePath("/painel", "layout");

  repetidos.sort((a, b) => a.linha - b.linha);
  return { feito: true, importados, repetidos, invalidos: preparado.invalidos };
}
