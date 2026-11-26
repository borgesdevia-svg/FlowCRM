import { obterSessao } from "@/lib/sessao";
import { eUuid } from "@/lib/validacao";
import { obterEstado } from "@/lib/estados";

// ROUTE HANDLER: GET /painel/clientes/<id>/dados
// Descarrega num ficheiro JSON tudo o que o CRM guarda sobre UM lead (direito de acesso do RGPD:
// a pessoa pode pedir à empresa uma cópia dos seus dados). Inclui os dados do lead, as respostas
// ao formulário, o histórico, as tarefas e as propostas.
// O RLS aplica-se: só descarrega quem pode ver o lead (admin da empresa ou o comercial responsável).

const semIds = ({ id, cliente_id, empresa_id, autor_id, responsavel_id, token, ...resto }) => resto; // tira os ids internos (não dizem nada à pessoa)

export async function GET(request, { params }) {
  const { supabase } = await obterSessao(); // sem sessão, manda para o login
  const { id } = await params;
  if (!eUuid(id)) return new Response("Lead não encontrado.", { status: 404 });

  const { data: lead } = await supabase
    .from("clientes")
    .select("id, nome, email, telefone, estado, valor_previsto, origem, respostas, criado_em, perfis(nome)")
    .eq("id", id)
    .maybeSingle();
  if (!lead) return new Response("Lead não encontrado.", { status: 404 });

  const [{ data: historico }, { data: tarefas }, { data: propostas }] = await Promise.all([
    supabase.from("interacoes").select("tipo, nota, criado_em").eq("cliente_id", id).order("criado_em").limit(5000),
    supabase.from("tarefas").select("titulo, data_limite, concluida, criado_em").eq("cliente_id", id).order("criado_em").limit(5000),
    supabase
      .from("propostas")
      .select("titulo, total, estado, validade, criado_em, respondida_em, aceite_por")
      .eq("cliente_id", id)
      .order("criado_em")
      .limit(500),
  ]);

  const dados = {
    exportado_em: new Date().toISOString(),
    lead: {
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone,
      estado: obterEstado(lead.estado).texto,
      valor_previsto: lead.valor_previsto,
      origem: lead.origem === "formulario" ? "Formulário público" : "Adicionado à mão",
      responsavel: lead.perfis?.nome ?? null,
      criado_em: lead.criado_em,
    },
    respostas_formulario: lead.respostas ?? [],
    historico: (historico ?? []).map(semIds),
    tarefas: (tarefas ?? []).map(semIds),
    propostas: (propostas ?? []).map(semIds),
  };

  // nome do ficheiro: "dados-marta-silva.json" (só letras simples, números e traços)
  const nomeFicheiro = `dados-${lead.nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "lead"}.json`;

  return new Response(JSON.stringify(dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeFicheiro}"`,
      "Cache-Control": "no-store",
    },
  });
}
