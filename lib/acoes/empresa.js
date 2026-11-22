"use server";
// Server Actions para personalizar a empresa (só o administrador):
// logótipo e formulário público (cor, textos, perguntas e mensagem depois de enviar).
// O RLS e as regras do Storage (migração 08) voltam a confirmar que é o administrador.

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";
import { CORES, LIMITES, MAX_OPCOES, MAX_PERGUNTAS, TIPOS, TIPOS_COM_OPCOES } from "@/lib/formulario";
import { normalizarAparencia } from "@/lib/aparencia";
import { normalizarDesign } from "@/lib/formularioDesign";

const TIPOS_IMAGEM = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_LOGO = 1024 * 1024; // 1 MB

function atualizar(slug) {
  revalidatePath("/painel", "layout"); // a barra lateral mostra o logótipo em todas as páginas
  if (slug) revalidatePath(`/f/${slug}`);
}

// ---------- logótipo ----------
export async function guardarLogo(estadoAnterior, formData) {
  const { supabase, perfil, empresa, eAdmin } = await obterSessao();
  if (!eAdmin) return { erro: "Só o administrador pode mudar o logótipo." };

  const ficheiro = formData.get("logo");
  if (!ficheiro || typeof ficheiro === "string" || ficheiro.size === 0) return { erro: "Escolhe uma imagem." };
  const extensao = TIPOS_IMAGEM[ficheiro.type];
  if (!extensao) return { erro: "A imagem tem de ser PNG, JPG ou WebP." };
  if (ficheiro.size > MAX_LOGO) return { erro: "A imagem é demasiado grande (máximo 1 MB)." };

  // um nome novo a cada envio: assim o browser não mostra a imagem antiga guardada em cache
  const caminho = `${perfil.empresa_id}/logo-${Date.now()}.${extensao}`;
  const { error: erroEnvio } = await supabase.storage
    .from("logos")
    .upload(caminho, ficheiro, { contentType: ficheiro.type, upsert: false });
  if (erroEnvio) return { erro: "Não foi possível enviar a imagem. Tenta outra vez." };

  const { data: publico } = supabase.storage.from("logos").getPublicUrl(caminho);
  const { error } = await supabase.from("empresas").update({ logo_url: publico.publicUrl }).eq("id", perfil.empresa_id);
  if (error) return { erro: "Não foi possível guardar o logótipo." };

  await apagarLogosAntigos(supabase, perfil.empresa_id, caminho);
  atualizar(empresa.slug);
  return { sucesso: "Logótipo atualizado." };
}

export async function removerLogo() {
  const { supabase, perfil, empresa, eAdmin } = await obterSessao();
  if (!eAdmin) return;

  await supabase.from("empresas").update({ logo_url: null }).eq("id", perfil.empresa_id);
  await apagarLogosAntigos(supabase, perfil.empresa_id, null);
  atualizar(empresa.slug);
}

// apaga as imagens antigas da pasta da empresa (menos a que se quer manter)
async function apagarLogosAntigos(supabase, empresaId, manter) {
  const { data } = await supabase.storage.from("logos").list(empresaId);
  const antigos = (data ?? []).map((f) => `${empresaId}/${f.name}`).filter((c) => c !== manter);
  if (antigos.length > 0) await supabase.storage.from("logos").remove(antigos);
}

// ---------- formulário público: tudo de uma vez ----------
// Recebe { marca, perguntas, depois } vindo do editor e guarda depois de validar.
// Devolve a versão limpa (é a que o editor passa a mostrar como "guardada").

// texto opcional: tira espaços; vazio = null (usa o texto por defeito); demasiado longo = erro
function textoOpcional(valor, maximo) {
  const texto = String(valor ?? "").trim();
  if (!texto) return { valor: null };
  if (texto.length > maximo) return { erro: true };
  return { valor: texto };
}

function validarPerguntas(perguntas) {
  if (!Array.isArray(perguntas)) return { erro: "Lista de perguntas inválida." };
  if (perguntas.length > MAX_PERGUNTAS) return { erro: `No máximo ${MAX_PERGUNTAS} perguntas.` };
  const tiposValidos = TIPOS.map((t) => t.valor);

  const limpas = [];
  for (const [i, p] of perguntas.entries()) {
    const texto = String(p?.texto ?? "").trim();
    const tipo = tiposValidos.includes(p?.tipo) ? p.tipo : "texto";
    if (texto.length < 2 || texto.length > 200) {
      return { erro: `Escreve a pergunta ${i + 1} (2 a 200 caracteres).` };
    }
    const ajuda = String(p?.ajuda ?? "").trim();
    if (ajuda.length > LIMITES.ajuda) return { erro: `A ajuda da pergunta ${i + 1} é demasiado longa.` };

    const pergunta = {
      id: /^[a-z0-9-]{2,40}$/i.test(String(p?.id ?? "")) ? String(p.id) : crypto.randomUUID(),
      texto,
      tipo,
      obrigatoria: Boolean(p?.obrigatoria),
      ...(ajuda ? { ajuda } : {}),
    };

    if (TIPOS_COM_OPCOES.includes(tipo)) {
      // opções sem repetições nem linhas vazias
      const opcoes = [...new Set((Array.isArray(p?.opcoes) ? p.opcoes : []).map((o) => String(o).trim()).filter(Boolean))];
      if (opcoes.length < 2) return { erro: `A pergunta ${i + 1} precisa de pelo menos 2 opções.` };
      if (opcoes.length > MAX_OPCOES || opcoes.some((o) => o.length > 100)) {
        return { erro: `A pergunta ${i + 1} tem opções a mais ou demasiado longas.` };
      }
      pergunta.opcoes = opcoes;
    }
    limpas.push(pergunta);
  }
  return { perguntas: limpas };
}

export async function guardarFormulario(dados) {
  const { supabase, perfil, empresa, eAdmin, plano } = await obterSessao();
  if (!eAdmin) return { erro: "Só o administrador pode mudar o formulário." };

  const marca = dados?.marca ?? {};
  const depois = dados?.depois ?? {};

  // ---- marca ----
  if (!CORES.some((c) => c.chave === marca.cor)) return { erro: "Escolhe uma das cores." };
  const titulo = textoOpcional(marca.titulo, LIMITES.titulo);
  const texto = textoOpcional(marca.texto, LIMITES.texto);
  if (titulo.erro) return { erro: `O título tem no máximo ${LIMITES.titulo} caracteres.` };
  if (texto.erro) return { erro: `O texto de entrada tem no máximo ${LIMITES.texto} caracteres.` };

  // ---- perguntas ----
  const resultado = validarPerguntas(dados?.perguntas);
  if (resultado.erro) return { erro: resultado.erro };

  // ---- depois de enviar ----
  const obrigado = textoOpcional(depois.mensagem, LIMITES.obrigado);
  const botaoTexto = textoOpcional(depois.botaoTexto, LIMITES.botaoTexto);
  let botaoLink = textoOpcional(depois.botaoLink, LIMITES.botaoLink);
  if (obrigado.erro) return { erro: `A mensagem tem no máximo ${LIMITES.obrigado} caracteres.` };
  if (botaoTexto.erro) return { erro: `O texto do botão tem no máximo ${LIMITES.botaoTexto} caracteres.` };
  if (botaoLink.erro) return { erro: "O link do botão é demasiado longo." };
  // "www.site.pt" ou "instagram.com/empresa" ganham "https://" à frente
  if (botaoLink.valor && !/^https?:\/\//i.test(botaoLink.valor)) botaoLink = { valor: `https://${botaoLink.valor}` };
  if (botaoLink.valor && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(botaoLink.valor)) {
    return { erro: "O link do botão não parece um endereço válido (ex.: https://www.o-teu-site.pt)." };
  }
  // o botão precisa das duas coisas: texto e link
  if (Boolean(botaoTexto.valor) !== Boolean(botaoLink.valor)) {
    return { erro: "Para mostrar o botão, escreve o texto e o link (ou deixa os dois vazios)." };
  }

  // ---- design (só no CRM Pro; sem Pro, o que estava guardado fica como está) ----
  const design = normalizarDesign(dados?.design);

  const { error } = await supabase
    .from("empresas")
    .update({
      ...(plano.pro ? { form_design: design } : {}),
      form_cor: marca.cor,
      form_titulo: titulo.valor,
      form_texto: texto.valor,
      perguntas: resultado.perguntas,
      obrigado_texto: obrigado.valor,
      obrigado_botao_texto: botaoTexto.valor,
      obrigado_botao_link: botaoLink.valor,
    })
    .eq("id", perfil.empresa_id);
  if (error) return { erro: "Não foi possível guardar. Tenta outra vez." };

  atualizar(empresa.slug);
  return {
    sucesso: "Formulário guardado.",
    guardado: {
      marca: { cor: marca.cor, titulo: titulo.valor ?? "", texto: texto.valor ?? "" },
      design: plano.pro ? design : normalizarDesign(dados?.design),
      perguntas: resultado.perguntas,
      depois: { mensagem: obrigado.valor ?? "", botaoTexto: botaoTexto.valor ?? "", botaoLink: botaoLink.valor ?? "" },
    },
  };
}

// ---------- aparência do painel (página Configurações) ----------
// Recebe { modelo, cor, grafico, menu } do browser. normalizarAparencia() deita fora tudo
// o que não estiver nas listas de lib/aparencia.js e corta os nomes do menu ao tamanho máximo.
export async function guardarAparencia(dados) {
  const { supabase, perfil, eAdmin } = await obterSessao();
  if (!eAdmin) return { erro: "Só o administrador pode mudar as configurações." };

  const aparencia = normalizarAparencia(dados);
  const { error } = await supabase.from("empresas").update({ aparencia }).eq("id", perfil.empresa_id);
  if (error) {
    // 42703 = coluna inexistente: a migração 20 ainda não foi aplicada na base de dados
    if (error.code === "42703") return { erro: "Falta atualizar a base de dados (migração 20_aparencia) para poder guardar." };
    return { erro: "Não foi possível guardar. Tenta outra vez." };
  }

  revalidatePath("/painel", "layout"); // o menu e as cores aparecem em todas as páginas do painel
  return { sucesso: "Configurações guardadas.", guardado: aparencia };
}