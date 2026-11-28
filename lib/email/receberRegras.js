// Regras puras da receção de e-mails por IMAP (Fase 3 de PLANO-EMAIL-DOCUMENTOS.md).
// Sem ligações a servidores: testadas em testes/emailReceber.test.mjs.

export const DIAS_PRIMEIRA_IMPORTACAO = 30; // na 1.ª ligação vai buscar os últimos 30 dias
export const MAX_POR_EXECUCAO = 100; // mensagens novas tratadas por conta em cada passagem
export const MAX_TAMANHO_MENSAGEM = 30 * 1024 * 1024; // mensagens maiores são ignoradas

// endereço do remetente em minúsculas, ou "" (envelope.from do imapflow = [{ name, address }])
export function emailDoRemetente(from) {
  const endereco = Array.isArray(from) ? from[0]?.address : from?.address;
  return String(endereco ?? "").trim().toLowerCase();
}

// vários leads com o mesmo e-mail: fica o mais recente
export function escolherLead(leads, email) {
  const alvo = String(email ?? "").trim().toLowerCase();
  if (!alvo) return null;
  return (
    (leads ?? [])
      .filter((l) => String(l.email ?? "").trim().toLowerCase() === alvo)
      .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)))[0] ?? null
  );
}

// É a 1.ª importação? (nunca sincronizou, ou a caixa foi recriada e os números das mensagens mudaram)
// Na 1.ª importação vai-se buscar os últimos 30 dias e NÃO se mandam avisos.
export function ePrimeiraImportacao(conta, uidValidade) {
  if (conta?.imap_ultimo_uid == null || conta?.imap_uid_validade == null) return true;
  return String(conta.imap_uid_validade) !== String(uidValidade);
}

export function inicioDaImportacao(agora = new Date()) {
  return new Date(agora.getTime() - DIAS_PRIMEIRA_IMPORTACAO * 86400000);
}

// das mensagens encontradas: só as que ainda não foram vistas, as mais antigas primeiro, no máximo N
// (o "N:*" do IMAP devolve sempre a última mensagem, mesmo que já tenha sido vista)
export function uidsParaTratar(uids, ultimoUid, maximo = MAX_POR_EXECUCAO) {
  const desde = ultimoUid == null ? -1 : Number(ultimoUid);
  return [...new Set((uids ?? []).map(Number))]
    .filter((u) => Number.isFinite(u) && u > desde)
    .sort((a, b) => a - b)
    .slice(0, maximo);
}

// HTML -> texto simples (para e-mails que só vêm em HTML)
export function htmlParaTexto(html) {
  return String(html ?? "")
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const cortar = (texto, maximo) => String(texto ?? "").slice(0, maximo);

// identificador da mensagem: o Message-ID, ou um estável a partir da caixa (se o e-mail não tiver)
export function idDaMensagem(messageId, uidValidade, uid) {
  const id = String(messageId ?? "").trim();
  return (id || `<uid-${uidValidade}-${uid}@flowcrm>`).slice(0, 500);
}

// anexos "inline" (ex.: o logótipo na assinatura) não vão para os Documentos
export const eAnexoAGuardar = (anexo) => !(anexo?.related || (anexo?.contentDisposition === "inline" && anexo?.cid));
