"use server";
// Server Actions das marcações online (migração 36):
//  - marcar: a página pública /m/[slug] (visitantes SEM login);
//  - guardarHorario: o horário da empresa (só administradores);
//  - cancelarMarcacao: no painel (quem vê o lead).
//
// marcar usa a chave secreta (criarClienteAdmin) porque o visitante não tem sessão:
// por isso valida TUDO aqui, e volta a calcular os horários livres no servidor
// (o browser só diz que hora escolheu; nunca se confia nisso).

import { after } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { obterSessao, papelNaEmpresaDoFormulario } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { eEmail, eSlug, eTelefone, eUuid } from "@/lib/validacao";
import { hashIp, ipDoPedido } from "@/lib/ipVisitante";
import { enviarAvisos } from "@/lib/avisosPush";
import { DURACOES, diaEmLisboa, horarioValido, minutos, normalizarConfig, textoMarcacao } from "@/lib/marcacoes";

const campo = (formData, nome) => String(formData.get(nome) ?? "").trim();

// endereço do site, para identificar quem envia os avisos
async function origemDoSite() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

// ---------- marcar (página pública) ----------
export async function marcar(estadoAnterior, formData) {
  // campo "armadilha" para robôs: uma pessoa nunca o preenche
  if (campo(formData, "website") !== "") return { sucesso: true, texto: "" };

  const slug = campo(formData, "slug");
  if (!eSlug(slug)) return { mensagem: "Esta página de marcações já não existe." };

  const valores = {
    nome: campo(formData, "nome"),
    email: campo(formData, "email").toLowerCase(),
    telefone: campo(formData, "telefone"),
    nota: campo(formData, "nota").slice(0, 1000),
    inicio: campo(formData, "inicio"),
  };
  const erros = {};
  if (!valores.inicio) erros.inicio = "Escolhe o dia e a hora.";
  if (valores.nome.length < 2 || valores.nome.length > 150) erros.nome = "Escreve o teu nome.";
  if (!eEmail(valores.email)) erros.email = "Escreve um email válido, por exemplo nome@gmail.com.";
  if (!eTelefone(valores.telefone)) erros.telefone = "Escreve um telefone válido, por exemplo 912 345 678.";
  if (Object.keys(erros).length) return { erros, valores };

  // um comercial da empresa não marca na própria empresa (como no formulário)
  const supabase = await criarClienteServidor();
  if ((await papelNaEmpresaDoFormulario(supabase, slug)) === "comercial") {
    return { mensagem: "Já fazes parte desta equipa: esta página é para os clientes.", valores };
  }

  const admin = criarClienteAdmin();
  const { data: empresa } = await admin.from("empresas").select("id").eq("slug", slug).maybeSingle();
  if (!empresa) return { mensagem: "Esta página de marcações já não existe." };
  const { data: bruto } = await admin.from("marcacoes_config").select("*").eq("empresa_id", empresa.id).maybeSingle();
  const config = normalizarConfig(bruto);
  if (!bruto || !config.ligada) return { mensagem: "As marcações online estão desligadas de momento.", valores };

  // a hora escolhida ainda está livre e dentro do horário? (marcações à volta desse dia)
  const escolhido = new Date(valores.inicio);
  if (Number.isNaN(escolhido.getTime())) return { erros: { inicio: "Escolhe o dia e a hora." }, valores };
  const { data: ocupados } = await admin
    .from("marcacoes")
    .select("inicio, fim")
    .eq("empresa_id", empresa.id)
    .eq("estado", "marcada")
    .gte("inicio", new Date(escolhido.getTime() - 86400000).toISOString())
    .lte("inicio", new Date(escolhido.getTime() + 86400000).toISOString());
  const horario = horarioValido({ config, inicio: valores.inicio, ocupados: ocupados ?? [] });
  if (!horario) {
    return { erros: { inicio: "Essa hora já não está livre. Escolhe outra." }, valores: { ...valores, inicio: "" }, recarregar: true };
  }

  // limite contra spam: o mesmo do formulário público (10 por IP em cada hora)
  const { data: podeEnviar, error: erroLimite } = await admin.rpc("limite_formulario", {
    p_ip_hash: hashIp(ipDoPedido(await headers())),
  });
  if (erroLimite) console.error("limite_formulario:", erroLimite.message);
  if (podeEnviar === false) {
    return { mensagem: "Já fizeste vários pedidos há pouco. Espera um pouco e tenta outra vez.", valores };
  }

  // o lead: se já existe um com este email na empresa, a marcação fica nesse; senão cria-se
  let { data: lead } = await admin
    .from("clientes")
    .select("id, nome, responsavel_id")
    .eq("empresa_id", empresa.id)
    .eq("email", valores.email)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const leadNovo = !lead;
  if (leadNovo) {
    const { data: criado, error } = await admin
      .from("clientes")
      .insert({
        empresa_id: empresa.id,
        nome: valores.nome,
        email: valores.email,
        telefone: valores.telefone,
        estado: "novo",
        origem: "formulario", // as automações (distribuir, boas-vindas) tratam-no como um lead do formulário
        canal: "marcacoes",
      })
      .select("id, nome, responsavel_id")
      .single();
    if (error) return { mensagem: "Não foi possível marcar. Tenta outra vez.", valores };
    lead = criado;
    // como no formulário: a automação de boas-vindas trata do lead novo
    await admin.from("automacoes_log").insert({ empresa_id: empresa.id, cliente_id: lead.id, tipo: "boas_vindas", estado: "pendente" });
  }

  // a marcação. O índice único da base de dados recusa duas marcações à mesma hora
  // (se duas pessoas carregarem em "Confirmar" ao mesmo tempo, só a primeira fica).
  const { error: erroMarcacao } = await admin.from("marcacoes").insert({
    empresa_id: empresa.id,
    cliente_id: lead.id,
    inicio: horario.inicio,
    fim: horario.fim,
    nota: valores.nota || null,
  });
  if (erroMarcacao) {
    if (erroMarcacao.code === "23505") {
      return { erros: { inicio: "Alguém marcou essa hora agora mesmo. Escolhe outra." }, valores: { ...valores, inicio: "" }, recarregar: true };
    }
    return { mensagem: "Não foi possível marcar. Tenta outra vez.", valores };
  }

  const quando = textoMarcacao(horario.inicio);
  // no histórico do lead e uma tarefa para o dia (aparece nas Tarefas, no calendário e no modo fila)
  await Promise.all([
    admin.from("interacoes").insert({
      empresa_id: empresa.id,
      cliente_id: lead.id,
      tipo: "reuniao",
      nota: `Marcou online: ${quando}.${valores.nota ? `\n\n${valores.nota}` : ""}`,
    }),
    admin.from("tarefas").insert({
      empresa_id: empresa.id,
      cliente_id: lead.id,
      responsavel_id: lead.responsavel_id,
      titulo: `Reunião marcada: ${quando}`.slice(0, 200),
      data_limite: diaEmLisboa(horario.inicio),
    }),
  ]);

  // aviso no telemóvel/PC, depois de responder (o cliente não fica à espera)
  const origem = await origemDoSite();
  after(() =>
    enviarAvisos({
      empresaId: empresa.id,
      responsavelId: lead.responsavel_id,
      origem,
      mensagem: (paraMim) => ({
        titulo: `Nova marcação: ${lead.nome}`,
        texto: `${quando[0].toUpperCase()}${quando.slice(1)}${paraMim ? " (é teu)" : ""}.${leadNovo ? " Lead novo." : ""}`,
        url: `/painel/clientes/${lead.id}`,
      }),
    }),
  );

  return { sucesso: true, texto: quando, inicio: horario.inicio, fim: horario.fim };
}

// ---------- horário da empresa (só administradores) ----------
export async function guardarHorario(estadoAnterior, formData) {
  const { supabase, perfil, eAdmin } = await obterSessao();
  if (!eAdmin) return { erro: "Só os administradores podem mudar o horário." };

  const dias = formData.getAll("dias").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const inicio = minutos(campo(formData, "hora_inicio"));
  const fim = minutos(campo(formData, "hora_fim"));
  const duracao = Number(campo(formData, "duracao"));
  const antecedencia = Number(campo(formData, "antecedencia_horas"));
  const diasFrente = Number(campo(formData, "dias_frente"));

  if (!dias.length) return { erro: "Escolhe pelo menos um dia da semana." };
  if (Number.isNaN(inicio) || Number.isNaN(fim)) return { erro: "Escolhe a hora de início e a de fim." };
  if (fim <= inicio) return { erro: "A hora de fim tem de ser depois da hora de início." };
  if (!DURACOES.includes(duracao)) return { erro: "Escolhe a duração de cada marcação." };
  if (fim - inicio < duracao) return { erro: "O horário é mais curto do que uma marcação." };
  if (!Number.isInteger(antecedencia) || antecedencia < 0 || antecedencia > 168) {
    return { erro: "A antecedência tem de ser entre 0 e 168 horas (7 dias)." };
  }
  if (!Number.isInteger(diasFrente) || diasFrente < 1 || diasFrente > 90) {
    return { erro: "Escolhe até quantos dias à frente se pode marcar (1 a 90)." };
  }

  const config = normalizarConfig({
    ligada: formData.get("ligada") === "on",
    dias,
    hora_inicio: `${Math.floor(inicio / 60)}:${String(inicio % 60).padStart(2, "0")}`,
    hora_fim: `${Math.floor(fim / 60)}:${String(fim % 60).padStart(2, "0")}`,
    duracao,
    antecedencia_horas: antecedencia,
    dias_frente: diasFrente,
  });
  const { error } = await supabase
    .from("marcacoes_config")
    .upsert({ empresa_id: perfil.empresa_id, ...config, atualizado_em: new Date().toISOString() }, { onConflict: "empresa_id" });
  if (error) return { erro: "Não foi possível guardar. Tenta outra vez." };

  revalidatePath("/painel/marcacoes");
  return { sucesso: config.ligada ? "Horário guardado. A página de marcações está ligada." : "Horário guardado. A página de marcações está desligada." };
}

// ---------- cancelar uma marcação (painel) ----------
export async function cancelarMarcacao(formData) {
  const { supabase, perfil } = await obterSessao();
  const id = String(formData.get("id") ?? "");
  if (!eUuid(id)) return;

  // o RLS só deixa cancelar marcações de leads que a pessoa vê
  const { data } = await supabase
    .from("marcacoes")
    .update({ estado: "cancelada" })
    .eq("id", id)
    .eq("estado", "marcada")
    .select("cliente_id, inicio")
    .maybeSingle();
  if (data) {
    const quando = textoMarcacao(data.inicio);
    await Promise.all([
      // fica no histórico do lead quem cancelou e qual era a hora
      supabase.from("interacoes").insert({
        empresa_id: perfil.empresa_id,
        cliente_id: data.cliente_id,
        autor_id: perfil.id,
        tipo: "reuniao",
        nota: `Marcação cancelada: ${quando}.`,
      }),
      // a tarefa da reunião (criada ao marcar) deixa de fazer sentido. Se ainda estiver por fazer
      // e esta pessoa a puder apagar (admin ou responsável, pelo RLS), sai das Tarefas.
      supabase
        .from("tarefas")
        .delete()
        .eq("cliente_id", data.cliente_id)
        .eq("concluida", false)
        .eq("titulo", `Reunião marcada: ${quando}`.slice(0, 200)),
    ]);
    revalidatePath(`/painel/clientes/${data.cliente_id}`);
    revalidatePath("/painel/tarefas");
  }
  revalidatePath("/painel/marcacoes");
}
