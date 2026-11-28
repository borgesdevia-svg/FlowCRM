// Receber e-mails por IMAP (Fase 3 de PLANO-EMAIL-DOCUMENTOS.md). Só SERVIDOR.
// Corre de 5 em 5 minutos (pg_cron -> /api/emails/receber) e no botão "Ver e-mails novos" da ficha.
//
// Para cada conta ligada: abre a caixa de entrada e vê as mensagens novas. Só guarda as que
// vêm do e-mail de um LEAD da empresa; o resto da caixa pessoal é ignorado (nem se descarrega).
// Na 1.ª ligação vai buscar os últimos 30 dias, sem avisos. Depois, cada resposta de um lead:
//   - fica na tabela emails (direcao 'recebido') e no histórico do lead;
//   - os anexos vão para os Documentos do lead (imagens em WebP), se houver espaço;
//   - o responsável do lead (e os admins) recebem um aviso no telemóvel/PC.

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { decifrar } from "@/lib/email/cifra";
import { imapSeguro, traduzirErroLigacao, MAX_ASSUNTO, MAX_CORPO } from "@/lib/email/servidores";
import {
  MAX_TAMANHO_MENSAGEM,
  cortar,
  eAnexoAGuardar,
  emailDoRemetente,
  ePrimeiraImportacao,
  escolherLead,
  htmlParaTexto,
  idDaMensagem,
  inicioDaImportacao,
  uidsParaTratar,
} from "@/lib/email/receberRegras";
import { MAX_EMPRESA, MAX_FICHEIRO, TIPOS, eImagem, limparNome, nomeWebp, tipoDoFicheiro } from "@/lib/documentos";
import { paraWebp } from "@/lib/imagens";
import { enviarAvisos } from "@/lib/avisosPush";

const ESPERA = 15000;
const SITE = "https://flow-crm-blush-psi.vercel.app"; // para os avisos (não há pedido do browser no cron)

function clienteImap(conta, password) {
  const cliente = new ImapFlow({
    host: conta.imap_host,
    port: conta.imap_porta,
    secure: imapSeguro(conta.imap_porta),
    auth: { user: conta.utilizador, pass: password },
    logger: false,
    connectionTimeout: ESPERA,
    greetingTimeout: ESPERA,
    socketTimeout: ESPERA * 4,
  });
  cliente.on("error", (e) => console.error("E-mail (receber): erro na ligação IMAP", e?.message ?? e));
  return cliente;
}

// "%" e "_" são especiais no ilike: escapam-se para comparar o e-mail tal e qual
const paraIlike = (email) => email.replace(/[\\%_]/g, (c) => `\\${c}`);

async function procurarLead(admin, empresaId, email, cache) {
  if (cache.has(email)) return cache.get(email);
  const { data } = await admin
    .from("clientes")
    .select("id, nome, email, responsavel_id, criado_em")
    .eq("empresa_id", empresaId)
    .ilike("email", paraIlike(email))
    .limit(20);
  const lead = escolherLead(data ?? [], email);
  cache.set(email, lead);
  return lead;
}

async function espacoUsado(admin, empresaId) {
  const { data } = await admin.from("documentos").select("tamanho").eq("empresa_id", empresaId).limit(100000);
  return (data ?? []).reduce((s, d) => s + d.tamanho, 0);
}

// guarda um anexo nos Documentos do lead; devolve o tamanho guardado ou 0 (não guardado)
async function guardarAnexo(admin, { conta, lead, anexo, espaco }) {
  const tipo = tipoDoFicheiro(anexo.filename, anexo.contentType);
  if (!tipo || !anexo.content?.length || anexo.content.length > MAX_FICHEIRO) return 0;

  let bytes = anexo.content;
  let tipoFinal = tipo;
  let nome = limparNome(anexo.filename || "anexo");
  if (eImagem(tipo)) {
    try {
      bytes = await paraWebp(bytes);
      tipoFinal = "image/webp";
      nome = nomeWebp(nome);
    } catch {
      return 0; // imagem estragada: fica só o nome
    }
  }
  if (espaco.usado + bytes.length > MAX_EMPRESA) return 0;

  const caminho = `${conta.empresa_id}/${lead.id}/${crypto.randomUUID()}.${TIPOS[tipoFinal]}`;
  const { error: erroEnvio } = await admin.storage.from("documentos").upload(caminho, bytes, { contentType: tipoFinal });
  if (erroEnvio) return 0;
  const { error } = await admin.from("documentos").insert({
    empresa_id: conta.empresa_id,
    cliente_id: lead.id,
    autor_id: conta.perfil_id,
    categoria: "outro",
    nome,
    caminho,
    tamanho: bytes.length,
    tipo_mime: tipoFinal,
  });
  if (error) {
    await admin.storage.from("documentos").remove([caminho]);
    return 0;
  }
  espaco.usado += bytes.length;
  return bytes.length;
}

// Sincroniza UMA conta (linha de contas_email com a password cifrada).
// Devolve { novos, erro? }. Nunca lança erro: guarda-o em contas_email.erro_sincronizacao.
export async function sincronizarConta(conta, { avisar = true } = {}) {
  const admin = criarClienteAdmin();
  let novos = 0;
  let password;
  try {
    password = decifrar(conta.password_cifrada);
  } catch {
    const erro = "Liga outra vez a tua conta de e-mail em A minha conta.";
    await admin.from("contas_email").update({ erro_sincronizacao: erro }).eq("perfil_id", conta.perfil_id);
    return { novos, erro };
  }

  const imap = clienteImap(conta, password);
  let uidValidade = null;
  let ultimoUid = conta.imap_ultimo_uid;
  try {
    await imap.connect();
    const tranca = await imap.getMailboxLock("INBOX");
    try {
      uidValidade = String(imap.mailbox.uidValidity);
      const primeira = ePrimeiraImportacao(conta, uidValidade);
      if (primeira) ultimoUid = null;

      // 1) que mensagens há para ver
      const encontrados = primeira
        ? await imap.search({ since: inicioDaImportacao() }, { uid: true })
        : await imap.search({ uid: `${Number(conta.imap_ultimo_uid) + 1}:*` }, { uid: true });
      const uids = uidsParaTratar(encontrados || [], ultimoUid);

      if (uids.length) {
        // 2) só o envelope (remetente, tamanho): o resto da caixa nunca é descarregado
        const envelopes = [];
        for await (const m of imap.fetch(uids, { uid: true, envelope: true, size: true }, { uid: true })) {
          envelopes.push({ uid: m.uid, de: emailDoRemetente(m.envelope?.from), tamanho: m.size ?? 0 });
        }
        envelopes.sort((a, b) => a.uid - b.uid);

        const cacheLeads = new Map();
        const espaco = { usado: await espacoUsado(admin, conta.empresa_id) };

        for (const env of envelopes) {
          ultimoUid = env.uid;
          if (!env.de || env.de === String(conta.email).toLowerCase() || env.tamanho > MAX_TAMANHO_MENSAGEM) continue;
          const lead = await procurarLead(admin, conta.empresa_id, env.de, cacheLeads);
          if (!lead) continue;

          // 3) é de um lead: descarrega e lê a mensagem
          const msg = await imap.fetchOne(String(env.uid), { source: true }, { uid: true });
          if (!msg?.source) continue;
          const lido = await simpleParser(msg.source);
          const messageId = idDaMensagem(lido.messageId, uidValidade, env.uid);

          // já guardada (ex.: a caixa foi recriada e voltou a aparecer)?
          const { data: existe } = await admin
            .from("emails")
            .select("id")
            .eq("cliente_id", lead.id)
            .eq("message_id", messageId)
            .maybeSingle();
          if (existe) continue;

          const assunto = cortar((lido.subject ?? "").trim(), MAX_ASSUNTO);
          const corpo = cortar((lido.text || htmlParaTexto(lido.html)).trim(), MAX_CORPO);
          const data = lido.date instanceof Date && !Number.isNaN(lido.date.getTime()) ? lido.date : new Date();

          const anexos = [];
          for (const a of (lido.attachments ?? []).filter(eAnexoAGuardar)) {
            const guardado = await guardarAnexo(admin, { conta, lead, anexo: a, espaco });
            anexos.push({ nome: limparNome(a.filename || "anexo"), tamanho: a.size ?? a.content?.length ?? 0, guardado: guardado > 0 });
          }

          // ignoreDuplicates + select: se outra passagem (cron e botão ao mesmo tempo) já o guardou,
          // não vem nenhuma linha e não se repete o histórico nem o aviso
          const { data: guardados, error: erroEmail } = await admin.from("emails").upsert(
            {
              empresa_id: conta.empresa_id,
              cliente_id: lead.id,
              autor_id: null,
              direcao: "recebido",
              de: cortar(env.de, 320),
              para: cortar(conta.email, 1000),
              assunto,
              corpo,
              message_id: messageId,
              em_resposta_a: lido.inReplyTo ? cortar(String(lido.inReplyTo), 500) : null,
              anexos,
              enviado_em: data.toISOString(),
            },
            { onConflict: "cliente_id,message_id", ignoreDuplicates: true },
          ).select("id");
          if (erroEmail) {
            console.error("E-mail (receber): não foi possível guardar", erroEmail.message);
            continue;
          }
          if (!guardados?.length) continue;

          // no histórico aparece com o nome de quem recebeu (o dono da conta)
          await admin.from("interacoes").insert({
            empresa_id: conta.empresa_id,
            cliente_id: lead.id,
            autor_id: conta.perfil_id,
            tipo: "email",
            nota: cortar(`E-mail recebido: ${assunto || "(sem assunto)"}`, 5000),
            criado_em: data.toISOString(),
          });
          novos += 1;

          if (avisar && !primeira) {
            await enviarAvisos({
              empresaId: conta.empresa_id,
              responsavelId: lead.responsavel_id,
              origem: SITE,
              mensagem: () => ({
                titulo: `${lead.nome} respondeu`,
                texto: assunto || "Novo e-mail",
                url: `/painel/clientes/${lead.id}?sec=emails`,
              }),
            });
          }
        }
      }
    } finally {
      tranca.release();
    }
    await imap.logout();

    await admin
      .from("contas_email")
      .update({
        imap_uid_validade: uidValidade,
        imap_ultimo_uid: ultimoUid,
        sincronizada_em: new Date().toISOString(),
        erro_sincronizacao: null,
      })
      .eq("perfil_id", conta.perfil_id);
    return { novos };
  } catch (e) {
    imap.close();
    console.error("E-mail (receber): falhou", conta.perfil_id, e?.message ?? e);
    const erro = cortar(traduzirErroLigacao(e, "IMAP"), 500);
    // guarda o que já ficou tratado, para não repetir na próxima passagem
    const atualizar = { erro_sincronizacao: erro, sincronizada_em: new Date().toISOString() };
    if (uidValidade && ultimoUid != null) Object.assign(atualizar, { imap_uid_validade: uidValidade, imap_ultimo_uid: ultimoUid });
    await admin.from("contas_email").update(atualizar).eq("perfil_id", conta.perfil_id);
    return { novos, erro };
  }
}

// Todas as contas ligadas, uma de cada vez, até ~50 s (o pedido do cron tem 60 s).
// As que ficarem por ver passam na próxima (começa pelas sincronizadas há mais tempo).
export async function sincronizarTodas({ limiteMs = 50000 } = {}) {
  const inicio = Date.now();
  const { data: contas, error } = await criarClienteAdmin()
    .from("contas_email")
    .select("*")
    .order("sincronizada_em", { ascending: true, nullsFirst: true })
    .limit(500);
  if (error) throw error;

  const resumo = { contas: contas?.length ?? 0, vistas: 0, novos: 0, erros: 0, porVer: 0 };
  for (const conta of contas ?? []) {
    if (Date.now() - inicio > limiteMs) {
      resumo.porVer += 1;
      continue;
    }
    const r = await sincronizarConta(conta);
    resumo.vistas += 1;
    resumo.novos += r.novos;
    if (r.erro) resumo.erros += 1;
  }
  return resumo;
}
