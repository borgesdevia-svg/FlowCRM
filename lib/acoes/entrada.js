"use server";
// Server Actions da Entrada (/painel/entrada): os leads sem responsável ficam lá até o
// administrador os ACEITAR (escolher quem da equipa fica com eles, ou "À vez pela equipa"
// no Pro com a distribuição ligada) ou REJEITAR (spam, engano). Decidido com o aluno a 2026-11-28.

import { after } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { eUuid } from "@/lib/validacao";
import { atribuirResponsavel } from "@/lib/acoes/automacoes";
import { enviarAvisos } from "@/lib/avisosPush";

// valor da opção "À vez pela equipa" na lista de pessoas (igual em components/entrada/AcoesEntrada.js;
// um ficheiro "use server" só pode exportar funções)
const A_VEZ = "a-vez";

async function origemDoSite() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

// ---------- aceitar: entrega o lead a uma pessoa (escolhida ou à vez) ----------
export async function aceitarLead(clienteId, escolha) {
  const { supabase, perfil, eAdmin } = await obterSessao();
  if (!eAdmin) return { erro: "Só os administradores podem aceitar leads." };
  const id = String(clienteId ?? "");
  if (!eUuid(id)) return { erro: "Lead não encontrado." };

  let responsavelId;
  if (escolha === A_VEZ) {
    // a roleta do Pro (migração 45): escolhe a próxima pessoa e entrega-lhe o lead
    const { data, error } = await supabase.rpc("aceitar_lead_a_vez", { p_cliente: id });
    if (error || !data) {
      return { erro: "Não foi possível entregar à vez. Vê se a distribuição está ligada em Automações, ou escolhe uma pessoa." };
    }
    responsavelId = data;
    revalidatePath("/painel", "layout");
  } else {
    const r = await atribuirResponsavel(id, escolha);
    if (r.erro) return r;
    responsavelId = String(escolha);
  }

  // aviso push só para quem ficou com ele (se não foi o próprio admin a ficar)
  if (responsavelId !== perfil.id) {
    const { data: lead } = await supabase.from("clientes").select("nome").eq("id", id).maybeSingle();
    const origem = await origemDoSite();
    after(() =>
      enviarAvisos({
        empresaId: perfil.empresa_id,
        responsavelId,
        soResponsavel: true,
        origem,
        mensagem: () => ({
          titulo: `Lead novo: ${lead?.nome ?? "sem nome"}`,
          texto: "Ficou para ti.",
          url: `/painel/clientes/${id}`,
        }),
      }),
    );
  }
  return { sucesso: true };
}

// ---------- rejeitar: apaga o lead (só se ainda estiver na Entrada) ----------
export async function rejeitarLead(clienteId) {
  const { supabase, eAdmin } = await obterSessao();
  if (!eAdmin) return { erro: "Só os administradores podem rejeitar leads." };
  const id = String(clienteId ?? "");
  if (!eUuid(id)) return { erro: "Lead não encontrado." };

  // ficheiros dos Documentos (ex.: anexos de um e-mail): as linhas vão com o lead, os ficheiros não
  const { data: documentos } = await supabase.from("documentos").select("caminho").eq("cliente_id", id).limit(1000);

  // .is("responsavel_id", null): se outro admin o aceitou entretanto, não se apaga
  const { data } = await supabase.from("clientes").delete().eq("id", id).is("responsavel_id", null).select("id");
  if (!data?.length) return { erro: "Este lead já foi aceite por outra pessoa." };

  if (documentos?.length) {
    const { error } = await criarClienteAdmin()
      .storage.from("documentos")
      .remove(documentos.map((d) => d.caminho));
    if (error) console.error("Rejeitar lead: os ficheiros dos documentos ficaram no Storage", error);
  }

  revalidatePath("/painel", "layout"); // o número da Entrada e o sino estão no menu de todas as páginas
  return { sucesso: true };
}
