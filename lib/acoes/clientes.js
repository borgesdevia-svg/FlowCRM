"use server";
// Server Actions dos clientes: criar, editar e apagar.
// Usam o cliente Supabase NORMAL (com a sessão do utilizador), por isso o RLS
// aplica-se: mesmo que alguém manipule o formulário, a base de dados só deixa
// mexer em clientes da sua empresa (e, se for comercial, só nos seus).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS } from "@/lib/estados";
import { registarEvento, textoMudancaFase } from "@/lib/eventos";

const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const REGEX_TELEFONE = /^[0-9 +()-]{6,20}$/;

function campo(formData, nome) {
  return String(formData.get(nome) ?? "").trim();
}

// ---------- criar ou editar (se vier um id, é edição) ----------
export async function guardarCliente(estadoAnterior, formData) {
  const { supabase, perfil, eAdmin } = await obterSessao();

  const id = campo(formData, "id");
  const valores = {
    nome: campo(formData, "nome"),
    email: campo(formData, "email").toLowerCase(),
    telefone: campo(formData, "telefone"),
    estado: campo(formData, "estado"),
    valor_previsto: campo(formData, "valor_previsto").replace(",", "."), // aceita "1200,50"
    responsavel_id: campo(formData, "responsavel_id"),
  };

  // validação no servidor
  const erros = {};
  if (valores.nome.length < 1 || valores.nome.length > 150) erros.nome = "Escreve o nome do cliente.";
  if (valores.email && !REGEX_EMAIL.test(valores.email)) erros.email = "Email inválido.";
  if (valores.telefone && !REGEX_TELEFONE.test(valores.telefone)) erros.telefone = "Telefone inválido.";
  if (!ESTADOS.some((e) => e.chave === valores.estado)) erros.estado = "Escolhe um estado.";
  const valor = valores.valor_previsto === "" ? null : Number(valores.valor_previsto);
  if (valor !== null && (Number.isNaN(valor) || valor < 0)) erros.valor_previsto = "Escreve um valor positivo (ex.: 1500).";

  if (Object.keys(erros).length > 0) return { erros, valores };

  const dados = {
    nome: valores.nome,
    email: valores.email || null,
    telefone: valores.telefone || null,
    estado: valores.estado,
    valor_previsto: valor,
    // o admin escolhe o responsável; o comercial fica sempre responsável pelos seus
    responsavel_id: eAdmin ? valores.responsavel_id || null : perfil.id,
  };

  if (id) {
    // estado ANTES de guardar, para sabermos se a fase mudou
    const { data: antes } = await supabase.from("clientes").select("estado").eq("id", id).maybeSingle();

    // .select() devolve as linhas alteradas: se vier vazio, o RLS não deixou
    const { data, error } = await supabase.from("clientes").update(dados).eq("id", id).select("id");
    if (error || data.length === 0) {
      return { mensagem: "Não foi possível guardar. Confirma que tens acesso a este cliente.", valores };
    }

    // se a fase mudou, fica registado no histórico (atividade recente)
    if (antes && antes.estado !== dados.estado) {
      await registarEvento(supabase, perfil, id, textoMudancaFase(dados.estado));
    }
  } else {
    const { error } = await supabase
      .from("clientes")
      .insert({ ...dados, empresa_id: perfil.empresa_id, origem: "manual" });
    if (error) return { mensagem: "Não foi possível adicionar o cliente. Tenta outra vez.", valores };
  }

  // atualiza a lista e volta para ela com uma mensagem de confirmação
  revalidatePath("/painel/clientes");
  redirect(`/painel/clientes?aviso=${id ? "guardado" : "adicionado"}`);
}

// ---------- apagar ----------
export async function apagarCliente(formData) {
  const { supabase } = await obterSessao();
  const id = campo(formData, "id");

  // o RLS só deixa apagar clientes a que o utilizador tem acesso
  await supabase.from("clientes").delete().eq("id", id);

  revalidatePath("/painel/clientes");
  redirect("/painel/clientes?aviso=apagado");
}

// ---------- mudar só o estado (usado nos botões do pipeline) ----------
export async function mudarEstado(formData) {
  const { supabase, perfil } = await obterSessao();
  const id = campo(formData, "id");
  const estado = campo(formData, "estado");

  // só aceita um dos 4 estados conhecidos (nunca confiar no que vem do browser)
  if (!ESTADOS.some((e) => e.chave === estado)) return;

  // o RLS garante que só se muda o estado de clientes a que a pessoa tem acesso.
  // .neq("estado", estado) = só muda se for diferente (evita registar "mudanças" repetidas)
  const { data } = await supabase
    .from("clientes")
    .update({ estado })
    .eq("id", id)
    .neq("estado", estado)
    .select("id");

  // se mudou mesmo, fica registado no histórico (atividade recente)
  if (data?.length) await registarEvento(supabase, perfil, id, textoMudancaFase(estado));

  // o estado aparece no pipeline, na lista de clientes, na ficha e nos números do painel
  revalidatePath("/painel/pipeline");
  revalidatePath("/painel/clientes");
  revalidatePath(`/painel/clientes/${id}`);
  revalidatePath("/painel");
}
