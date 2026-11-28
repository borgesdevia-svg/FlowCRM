// Contas de e-mail ligadas ao CRM (Fase 2 de PLANO-EMAIL-DOCUMENTOS.md): regras sem segredos,
// usadas no servidor e no browser.

// Escolha rápida no formulário de ligar a conta. "outro" = e-mail da empresa (a pessoa escreve
// os servidores que o fornecedor lhe deu; as portas mais comuns vêm já preenchidas).
export const ATALHOS = {
  gmail: { smtp_host: "smtp.gmail.com", smtp_porta: 465, imap_host: "imap.gmail.com", imap_porta: 993 },
  outro: { smtp_host: "", smtp_porta: 465, imap_host: "", imap_porta: 993 },
};

export const LINK_PASSWORD_APP_GMAIL = "https://myaccount.google.com/apppasswords";

// Limite de e-mails enviados pelo CRM, por pessoa e por dia (decisão do aluno, 2026-11-27).
// O Gmail grátis corta perto dos 500 por dia (contando também os enviados fora do CRM).
export const LIMITES_DIA = { essencial: 100, pro: 400 };
export const limiteDia = (pro) => (pro ? LIMITES_DIA.pro : LIMITES_DIA.essencial);

// Tamanhos máximos (os mesmos da migração 39)
export const MAX = { email: 254, nome: 100, host: 253, utilizador: 254, password: 500, assinatura: 1000 };
export const MAX_ASSUNTO = 300;
export const MAX_CORPO = 50000;
export const MAX_ANEXOS = 20 * 1024 * 1024; // 20 MB no total por e-mail

// Contas pessoais da Microsoft: desde 16/09/2024 só aceitam OAuth (sem password), por isso
// não dá para as ligar por SMTP/IMAP. As contas Microsoft 365 de empresas usam domínio próprio.
const MICROSOFT = /^(outlook|hotmail|live|msn)\.[a-z.]{2,}$/i;

export const AVISO_MICROSOFT =
  "O Outlook.com/Hotmail já não permite esta ligação (a Microsoft só aceita OAuth desde setembro de 2024). Usa o e-mail da empresa ou um Gmail.";

export function dominioBloqueado(email) {
  const dominio = String(email ?? "").trim().toLowerCase().split("@")[1] ?? "";
  return MICROSOFT.test(dominio) ? AVISO_MICROSOFT : null;
}

// SSL direto nestas portas; nas outras (587, 143) começa sem e passa a TLS (STARTTLS)
export const smtpSeguro = (porta) => Number(porta) === 465;
export const imapSeguro = (porta) => Number(porta) === 993;

export const ePorta = (valor) => Number.isInteger(Number(valor)) && Number(valor) >= 1 && Number(valor) <= 65535;

// servidor: letras, números, pontos e traços (ex.: mail.empresa.pt)
export const eServidor = (valor) =>
  typeof valor === "string" && valor.length >= 3 && valor.length <= MAX.host && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(valor);

// Início do dia de hoje em Lisboa, como data ISO (para contar os e-mails enviados "hoje").
export function inicioDoDiaLisboa(agora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Lisbon",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(agora)
      .map((p) => [p.type, p.value]),
  );
  // diferença entre a hora de Lisboa e UTC neste momento (0 no inverno, 1 h no verão)
  const lisboaComoUtc = Date.UTC(partes.year, partes.month - 1, partes.day, partes.hour, partes.minute, partes.second);
  const diferenca = lisboaComoUtc - Math.floor(agora.getTime() / 1000) * 1000;
  return new Date(Date.UTC(partes.year, partes.month - 1, partes.day) - diferenca).toISOString();
}

// Erros de ligação traduzidos para português (nodemailer e imapflow)
export function traduzirErroLigacao(erro, onde) {
  const texto = `${erro?.code ?? ""} ${erro?.responseCode ?? ""} ${erro?.message ?? ""} ${erro?.responseText ?? ""} ${erro?.authenticationFailed ? "AUTH" : ""}`;
  if (/EAUTH|AUTH|535|534|Invalid credentials|authenticat|LOGIN failed|Username and Password not accepted/i.test(texto)) {
    return "Email ou password errados. No Gmail tens de usar uma password de aplicação (precisa da verificação em 2 passos).";
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(texto)) {
    return `Não encontrámos o servidor ${onde}. Confirma o endereço (ex.: mail.empresa.pt).`;
  }
  if (/ETIMEDOUT|ETIMEOUT|timeout|ECONNREFUSED|ECONNRESET/i.test(texto)) {
    return `O servidor ${onde} não respondeu. Confirma o endereço e a porta.`;
  }
  if (/certificate|SSL|TLS|wrong version/i.test(texto)) {
    return `Problema de segurança (SSL) com o servidor ${onde}. Experimenta a outra porta (${onde === "SMTP" ? "465 ou 587" : "993 ou 143"}).`;
  }
  return `Não foi possível ligar ao servidor ${onde}. Confirma os dados e tenta outra vez.`;
}
