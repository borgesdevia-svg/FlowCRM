"use server";
// Server Actions para personalizar a empresa (só o administrador):
// logótipo e perguntas extra do formulário público.
// O RLS e as regras do Storage (migração 08) voltam a confirmar que é o administrador.

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";

const TIPOS_IMAGEM = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_LOGO = 1024 * 1024; // 1 MB
const TIPOS_PERGUNTA = ["texto", "texto_longo", "escolha"];
const MAX_PERGUNTAS = 10;

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

// ---------- perguntas do formulário público ----------
// Recebe a lista inteira (vinda do editor) e guarda-a depois de a validar.
export async function guardarPerguntas(perguntas) {
  const { supabase, perfil, empresa, eAdmin } = await obterSessao();
  if (!eAdmin) return { erro: "Só o administrador pode mudar o formulário." };
  if (!Array.isArray(perguntas)) return { erro: "Lista inválida." };
  if (perguntas.length > MAX_PERGUNTAS) return { erro: `No máximo ${MAX_PERGUNTAS} perguntas.` };

  const limpas = [];
  for (const [i, p] of perguntas.entries()) {
    const texto = String(p?.texto ?? "").trim();
    const tipo = TIPOS_PERGUNTA.includes(p?.tipo) ? p.tipo : "texto";
    if (texto.length < 2 || texto.length > 200) {
      return { erro: `Escreve a pergunta ${i + 1} (2 a 200 caracteres).` };
    }

    const pergunta = {
      id: /^[a-z0-9-]{4,40}$/i.test(String(p?.id ?? "")) ? String(p.id) : crypto.randomUUID(),
      texto,
      tipo,
      obrigatoria: Boolean(p?.obrigatoria),
    };

    if (tipo === "escolha") {
      // opções sem repetições nem linhas vazias
      const opcoes = [...new Set((Array.isArray(p?.opcoes) ? p.opcoes : []).map((o) => String(o).trim()).filter(Boolean))];
      if (opcoes.length < 2) return { erro: `A pergunta ${i + 1} precisa de pelo menos 2 opções.` };
      if (opcoes.length > 12 || opcoes.some((o) => o.length > 100)) {
        return { erro: `A pergunta ${i + 1} tem opções a mais ou demasiado longas.` };
      }
      pergunta.opcoes = opcoes;
    }
    limpas.push(pergunta);
  }

  const { error } = await supabase.from("empresas").update({ perguntas: limpas }).eq("id", perfil.empresa_id);
  if (error) return { erro: "Não foi possível guardar as perguntas." };

  atualizar(empresa.slug);
  return { sucesso: "Formulário guardado.", perguntas: limpas };
}
