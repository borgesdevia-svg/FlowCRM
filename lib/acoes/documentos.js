"use server";
// Server Actions dos Documentos do lead (Fase 1 de PLANO-EMAIL-DOCUMENTOS.md).
//
// Como se carrega um ficheiro (até 10 MB):
//   1. prepararDocumento: o servidor confirma tudo (lead, tipo, tamanho, categoria, espaço da
//      empresa) e devolve um "link de envio" do Storage, válido só para um caminho.
//   2. O browser envia o ficheiro DIRETAMENTE para o Storage com esse link. Não passa pelo
//      nosso servidor porque a Vercel não aceita pedidos maiores do que 4,5 MB.
//   3. confirmarDocumento: o servidor vê o que chegou de facto (tamanho e tipo reais), converte
//      as imagens para WebP e só então cria a linha na tabela (com o RLS do utilizador).
//
// O bucket "documentos" é privado e não tem políticas no Storage: ninguém lê nem escreve lá com a
// sessão normal. Tudo passa pelo cliente com a chave secreta, SEMPRE depois de confirmar pelo RLS
// que a pessoa pode ver o lead (ou o documento).

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { eUuid } from "@/lib/validacao";
import { paraWebp } from "@/lib/imagens";
import {
  MAX_EMPRESA,
  MAX_FICHEIRO,
  TIPOS,
  eImagem,
  formatarTamanho,
  lerCaminho,
  limparNome,
  nomeWebp,
  podeCategoria,
  tipoDoFicheiro,
} from "@/lib/documentos";

const BUCKET = "documentos";

// Espaço usado por TODA a empresa (o RLS só mostraria ao comercial os documentos dos seus leads,
// por isso soma-se com a chave secreta; devolve só um número).
async function espacoUsado(empresaId) {
  const { data, error } = await criarClienteAdmin()
    .from("documentos")
    .select("tamanho")
    .eq("empresa_id", empresaId)
    .limit(100000);
  if (error) throw error;
  return (data ?? []).reduce((soma, d) => soma + d.tamanho, 0);
}

const semEspaco = (usado) =>
  `Não há espaço: a empresa já usa ${formatarTamanho(usado)} de ${formatarTamanho(MAX_EMPRESA)}. Apaga documentos antigos para libertar espaço.`;

// ---------- 1. preparar o envio ----------
export async function prepararDocumento({ clienteId, nome, tipo, tamanho, categoria }) {
  const { supabase, perfil, plano } = await obterSessao();

  if (!eUuid(clienteId)) return { erro: "Lead não encontrado." };
  const tipoReal = tipoDoFicheiro(nome, tipo);
  if (!tipoReal) return { erro: "Este tipo de ficheiro não é aceite. Usa PDF, imagem, Word, Excel, texto, CSV ou ZIP." };
  const bytes = Number(tamanho);
  if (!Number.isFinite(bytes) || bytes <= 0) return { erro: "O ficheiro está vazio." };
  if (bytes > MAX_FICHEIRO) return { erro: `O ficheiro é demasiado grande (máximo ${formatarTamanho(MAX_FICHEIRO)}).` };
  if (!podeCategoria(categoria, plano.pro)) return { erro: "Escolhe uma categoria." };

  // o RLS só devolve o lead se a pessoa o pode ver
  const { data: lead } = await supabase.from("clientes").select("id").eq("id", clienteId).maybeSingle();
  if (!lead) return { erro: "Lead não encontrado." };

  try {
    const usado = await espacoUsado(perfil.empresa_id);
    // as imagens ficam mais pequenas em WebP; só os outros ficheiros contam já pelo tamanho todo
    if (!eImagem(tipoReal) && usado + bytes > MAX_EMPRESA) return { erro: semEspaco(usado) };
  } catch (e) {
    console.error("Documentos: não foi possível ver o espaço usado", e);
    return { erro: "Não foi possível carregar o ficheiro. Tenta outra vez." };
  }

  const caminho = `${perfil.empresa_id}/${clienteId}/${crypto.randomUUID()}.${TIPOS[tipoReal]}`;
  const { data, error } = await criarClienteAdmin().storage.from(BUCKET).createSignedUploadUrl(caminho);
  if (error) {
    console.error("Documentos: não foi possível criar o link de envio", error);
    return { erro: "Não foi possível carregar o ficheiro. Tenta outra vez." };
  }
  return { caminho, token: data.token, tipo: tipoReal };
}

// ---------- 3. confirmar (depois de o browser enviar) ----------
export async function confirmarDocumento({ clienteId, caminho, nome, categoria }) {
  const { supabase, perfil, plano } = await obterSessao();
  const admin = criarClienteAdmin();
  const storage = admin.storage.from(BUCKET);
  const desistir = async (erro, caminhos = [caminho]) => {
    await storage.remove(caminhos);
    return { erro };
  };

  // o caminho tem de ser um dos que o passo 1 cria, desta empresa e deste lead
  const partes = lerCaminho(caminho);
  if (!partes || partes.empresaId !== perfil.empresa_id || partes.clienteId !== clienteId) {
    return { erro: "Não foi possível carregar o ficheiro. Tenta outra vez." };
  }
  if (!podeCategoria(categoria, plano.pro)) return desistir("Escolhe uma categoria.");

  // o que chegou de facto ao Storage (não confiar no tamanho/tipo que o browser disse)
  const { data: info, error: erroInfo } = await storage.info(caminho);
  if (erroInfo || !info) return { erro: "O ficheiro não chegou. Tenta outra vez." };

  let tipo = info.contentType ?? info.metadata?.mimetype;
  let tamanho = info.size ?? info.metadata?.size ?? 0;
  let caminhoFinal = caminho;
  let nomeFinal = limparNome(nome);
  if (!TIPOS[tipo]) return desistir("Este tipo de ficheiro não é aceite.");

  // imagens: sempre em WebP (qualidade 85, no máximo 2000 px)
  if (eImagem(tipo)) {
    try {
      const { data: original, error } = await storage.download(caminho);
      if (error) throw error;
      const webp = await paraWebp(await original.arrayBuffer());
      caminhoFinal = caminho.replace(/\.[a-z]+$/, ".webp");
      const { error: erroEnvio } = await storage.upload(caminhoFinal, webp, {
        contentType: "image/webp",
        upsert: caminhoFinal === caminho, // já era .webp: substitui pelo convertido
      });
      if (erroEnvio) throw erroEnvio;
      if (caminhoFinal !== caminho) await storage.remove([caminho]);
      tipo = "image/webp";
      tamanho = webp.length;
      nomeFinal = nomeWebp(nomeFinal);
    } catch (e) {
      console.error("Documentos: não foi possível converter a imagem para WebP", e);
      return desistir("Não foi possível ler esta imagem. Experimenta guardá-la outra vez como JPG ou PNG.", [
        caminho,
        caminho.replace(/\.[a-z]+$/, ".webp"),
      ]);
    }
  }

  // espaço da empresa, já com o tamanho real
  try {
    const usado = await espacoUsado(perfil.empresa_id);
    if (usado + tamanho > MAX_EMPRESA) return desistir(semEspaco(usado), [caminhoFinal]);
  } catch (e) {
    console.error("Documentos: não foi possível ver o espaço usado", e);
    return desistir("Não foi possível carregar o ficheiro. Tenta outra vez.", [caminhoFinal]);
  }

  // a linha é criada com a sessão da pessoa: o RLS confirma a empresa, o lead e (migração 41)
  // que só o Pro guarda faturas
  const { error } = await supabase.from("documentos").insert({
    empresa_id: perfil.empresa_id,
    cliente_id: clienteId,
    autor_id: perfil.id,
    categoria,
    nome: nomeFinal,
    caminho: caminhoFinal,
    tamanho,
    tipo_mime: tipo,
  });
  if (error) {
    console.error("Documentos: não foi possível guardar", error);
    return desistir("Não foi possível guardar o documento. Tenta outra vez.", [caminhoFinal]);
  }

  revalidatePath(`/painel/clientes/${clienteId}`);
  return { sucesso: true };
}

// ---------- apagar ----------
export async function apagarDocumento(id) {
  const { supabase } = await obterSessao();
  if (!eUuid(id)) return { erro: "Documento não encontrado." };

  // o RLS só deixa apagar a quem carregou ou ao admin; .select() diz se apagou mesmo
  const { data, error } = await supabase.from("documentos").delete().eq("id", id).select("caminho, cliente_id");
  if (error || !data?.length) return { erro: "Não foi possível apagar. Só quem carregou o documento ou o administrador o pode apagar." };

  const { error: erroStorage } = await criarClienteAdmin().storage.from(BUCKET).remove([data[0].caminho]);
  if (erroStorage) console.error("Documentos: a linha foi apagada mas o ficheiro ficou no Storage", erroStorage);

  revalidatePath(`/painel/clientes/${data[0].cliente_id}`);
  return { sucesso: true };
}
