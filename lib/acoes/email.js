"use server";
// Server Actions do e-mail no CRM (Fase 2 de PLANO-EMAIL-DOCUMENTOS.md): ligar a conta de cada
// pessoa (SMTP para enviar, IMAP para guardar em "Enviados" e, na Fase 3, receber) e enviar.
//
// A tabela contas_email não tem acesso pelo browser (migração 39): lê-se e escreve-se com a
// chave secreta, mas sempre só a linha da PRÓPRIA pessoa (perfil.id da sessão).
// A password fica cifrada com a EMAIL_CHAVE (lib/email/cifra.js) e nunca volta ao browser.

import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";
import { ImapFlow } from "imapflow";
import { obterSessao } from "@/lib/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { eEmail, eUuid } from "@/lib/validacao";
import { cifrar, decifrar } from "@/lib/email/cifra";
import { sincronizarConta } from "@/lib/email/receber";
import {
  MAX,
  MAX_ANEXOS,
  MAX_ASSUNTO,
  MAX_CORPO,
  dominioBloqueado,
  ePorta,
  eServidor,
  imapSeguro,
  inicioDoDiaLisboa,
  limiteDia,
  smtpSeguro,
  traduzirErroLigacao,
} from "@/lib/email/servidores";

const ESPERA = 15000; // 15 s para cada servidor responder

// ---------- ligações aos servidores ----------
function transporteSmtp(conta, password) {
  return nodemailer.createTransport({
    host: conta.smtp_host,
    port: conta.smtp_porta,
    secure: smtpSeguro(conta.smtp_porta),
    auth: { user: conta.utilizador, pass: password },
    connectionTimeout: ESPERA,
    greetingTimeout: ESPERA,
    socketTimeout: ESPERA * 2,
  });
}

function clienteImap(conta, password) {
  const cliente = new ImapFlow({
    host: conta.imap_host,
    port: conta.imap_porta,
    secure: imapSeguro(conta.imap_porta),
    auth: { user: conta.utilizador, pass: password },
    logger: false,
    connectionTimeout: ESPERA,
    greetingTimeout: ESPERA,
    socketTimeout: ESPERA * 2,
  });
  cliente.on("error", (e) => console.error("E-mail: erro na ligação IMAP", e?.message ?? e)); // sem isto um erro de rede derrubava o servidor
  return cliente;
}

async function testarLigacao(conta, password) {
  const smtp = transporteSmtp(conta, password);
  try {
    await smtp.verify();
  } catch (e) {
    return traduzirErroLigacao(e, "SMTP");
  } finally {
    smtp.close();
  }

  const imap = clienteImap(conta, password);
  try {
    await imap.connect();
    await imap.logout();
  } catch (e) {
    imap.close();
    return traduzirErroLigacao(e, "IMAP");
  }
  return null;
}

const texto = (formData, nome) => String(formData.get(nome) ?? "").trim();

// ---------- ligar (ou atualizar) a conta ----------
export async function ligarContaEmail(estadoAnterior, formData) {
  const { perfil } = await obterSessao();
  const admin = criarClienteAdmin();

  const email = texto(formData, "email").toLowerCase();
  const valores = {
    email,
    nome_remetente: texto(formData, "nome_remetente"),
    smtp_host: texto(formData, "smtp_host").toLowerCase(),
    smtp_porta: Number(texto(formData, "smtp_porta")),
    imap_host: texto(formData, "imap_host").toLowerCase(),
    imap_porta: Number(texto(formData, "imap_porta")),
    utilizador: texto(formData, "utilizador") || email,
    assinatura: String(formData.get("assinatura") ?? "").trim(),
  };
  // a password não se tira espaços: há passwords com espaços (as de aplicação do Gmail vêm
  // em 4 grupos com espaços, e o Gmail aceita-as com ou sem eles)
  const passwordNova = String(formData.get("password") ?? "");
  const erro = (mensagem) => ({ erro: mensagem, valores });

  if (!eEmail(email) || email.length > MAX.email) return erro("Escreve um email válido.");
  const bloqueado = dominioBloqueado(email);
  if (bloqueado) return erro(bloqueado);
  if (valores.nome_remetente.length > MAX.nome) return erro(`O nome tem no máximo ${MAX.nome} caracteres.`);
  if (!eServidor(valores.smtp_host)) return erro("Escreve o servidor SMTP (ex.: mail.empresa.pt).");
  if (!eServidor(valores.imap_host)) return erro("Escreve o servidor IMAP (ex.: mail.empresa.pt).");
  if (!ePorta(valores.smtp_porta) || !ePorta(valores.imap_porta)) return erro("As portas são números entre 1 e 65535.");
  if (valores.utilizador.length > MAX.utilizador) return erro("O utilizador é demasiado longo.");
  if (valores.assinatura.length > MAX.assinatura) return erro(`A assinatura tem no máximo ${MAX.assinatura} caracteres.`);
  if (passwordNova.length > MAX.password) return erro("A password é demasiado longa.");

  // sem password nova: usa a que já estava guardada (para mudar só a assinatura, por exemplo)
  let password = passwordNova;
  if (!password) {
    const { data: atual } = await admin.from("contas_email").select("password_cifrada").eq("perfil_id", perfil.id).maybeSingle();
    if (!atual) return erro("Escreve a password.");
    try {
      password = decifrar(atual.password_cifrada);
    } catch (e) {
      console.error("E-mail: não foi possível ler a password guardada", e);
      return erro("Escreve a password outra vez.");
    }
  }

  const falhou = await testarLigacao(valores, password);
  if (falhou) return erro(falhou);

  let cifrada;
  try {
    cifrada = cifrar(password);
  } catch (e) {
    console.error("E-mail: falta a EMAIL_CHAVE", e);
    return erro("O servidor ainda não está preparado para guardar contas de e-mail. Avisa o administrador do FlowCRM.");
  }

  const { error } = await admin.from("contas_email").upsert(
    {
      perfil_id: perfil.id,
      empresa_id: perfil.empresa_id,
      ...valores,
      nome_remetente: valores.nome_remetente || null,
      assinatura: valores.assinatura || null,
      password_cifrada: cifrada,
      ligada_em: new Date().toISOString(),
    },
    { onConflict: "perfil_id" },
  );
  if (error) {
    console.error("E-mail: não foi possível guardar a conta", error);
    return erro("Não foi possível guardar. Tenta outra vez.");
  }

  revalidatePath("/painel/conta");
  revalidatePath("/painel/clientes", "layout");
  return { sucesso: `Conta ligada: ${email}. Já podes enviar e-mails pelo CRM.` };
}

// ---------- desligar ----------
export async function desligarContaEmail() {
  const { perfil } = await obterSessao();
  const { error } = await criarClienteAdmin().from("contas_email").delete().eq("perfil_id", perfil.id);
  if (error) console.error("E-mail: não foi possível desligar a conta", error);
  revalidatePath("/painel/conta");
  revalidatePath("/painel/clientes", "layout");
}

// ---------- guardar uma cópia em "Enviados" (IMAP) ----------
function montarMensagem(mensagem) {
  return new Promise((resolve, reject) => {
    new MailComposer(mensagem).compile().build((e, bytes) => (e ? reject(e) : resolve(bytes)));
  });
}

async function guardarEmEnviados(conta, password, mensagem) {
  const imap = clienteImap(conta, password);
  try {
    await imap.connect();
    const caixas = await imap.list();
    const enviados =
      caixas.find((c) => c.specialUse === "\\Sent") ??
      caixas.find((c) => ["sent", "enviados", "inbox.sent", "sent items", "itens enviados"].includes(c.path.toLowerCase()));
    if (!enviados) throw new Error("Pasta de enviados não encontrada");
    await imap.append(enviados.path, await montarMensagem(mensagem), ["\\Seen"]);
    await imap.logout();
  } catch (e) {
    imap.close();
    console.error("E-mail: enviado, mas não foi possível guardar a cópia em Enviados", e?.message ?? e);
  }
}

// ---------- enviar um e-mail a um lead ----------
// documentos = ids de documentos DESTE lead para ir em anexo (pode ser vazio)
// emRespostaA = Message-ID de um e-mail recebido do lead (botão "Responder"): opcional;
// mantém a conversa junta no programa de e-mail do lead (cabeçalhos In-Reply-To e References)
export async function enviarEmail({ clienteId, assunto, corpo, documentos = [], emRespostaA = null }) {
  const { supabase, perfil, plano } = await obterSessao();
  const admin = criarClienteAdmin();

  if (!eUuid(String(clienteId ?? ""))) return { erro: "Lead não encontrado." };
  const titulo = String(assunto ?? "").trim();
  const mensagemTexto = String(corpo ?? "").replace(/\r\n/g, "\n").trimEnd();
  if (!titulo) return { erro: "Escreve o assunto." };
  if (titulo.length > MAX_ASSUNTO) return { erro: `O assunto tem no máximo ${MAX_ASSUNTO} caracteres.` };
  if (!mensagemTexto.trim()) return { erro: "Escreve a mensagem." };
  if (mensagemTexto.length > MAX_CORPO) return { erro: "A mensagem é demasiado longa." };
  const respostaA = emRespostaA ? String(emRespostaA).trim() : "";
  if (respostaA.length > 500 || /[\r\n]/.test(respostaA)) return { erro: "Não foi possível responder a este e-mail." };
  const idsAnexos = Array.isArray(documentos) ? [...new Set(documentos.map(String))] : [];
  if (idsAnexos.some((id) => !eUuid(id)) || idsAnexos.length > 20) return { erro: "Anexos inválidos." };

  // o RLS só devolve o lead se a pessoa o pode ver
  const { data: lead } = await supabase.from("clientes").select("id, nome, email").eq("id", clienteId).maybeSingle();
  if (!lead) return { erro: "Lead não encontrado." };
  if (!eEmail(lead.email ?? "")) return { erro: "Este lead não tem um email válido." };

  const { data: conta } = await admin.from("contas_email").select("*").eq("perfil_id", perfil.id).maybeSingle();
  if (!conta) return { erro: "Liga primeiro a tua conta de e-mail em A minha conta." };

  // limite por pessoa e por dia (hora de Lisboa)
  const limite = limiteDia(plano.pro);
  const { count, error: erroContagem } = await admin
    .from("emails")
    .select("id", { count: "exact", head: true })
    .eq("autor_id", perfil.id)
    .eq("direcao", "enviado")
    .gte("enviado_em", inicioDoDiaLisboa());
  if (erroContagem) {
    console.error("E-mail: não foi possível contar os envios de hoje", erroContagem);
    return { erro: "Não foi possível enviar. Tenta outra vez." };
  }
  if ((count ?? 0) >= limite) {
    return {
      erro: `Chegaste ao limite de ${limite} e-mails por dia${plano.pro ? "" : " do CRM Essencial (no CRM Pro são 400)"}. Amanhã podes enviar outra vez.`,
    };
  }

  // anexos: só documentos deste lead que a pessoa consegue ver (RLS)
  let anexos = [];
  if (idsAnexos.length) {
    const { data: docs } = await supabase
      .from("documentos")
      .select("id, nome, caminho, tamanho, tipo_mime")
      .in("id", idsAnexos)
      .eq("cliente_id", clienteId);
    if (!docs || docs.length !== idsAnexos.length) return { erro: "Um dos anexos já não existe. Fecha e abre a janela outra vez." };
    if (docs.reduce((s, d) => s + d.tamanho, 0) > MAX_ANEXOS) return { erro: "Os anexos passam dos 20 MB. Escolhe menos ficheiros." };
    try {
      anexos = await Promise.all(
        docs.map(async (d) => {
          const { data, error } = await admin.storage.from("documentos").download(d.caminho);
          if (error) throw error;
          return { filename: d.nome, content: Buffer.from(await data.arrayBuffer()), contentType: d.tipo_mime, tamanho: d.tamanho };
        }),
      );
    } catch (e) {
      console.error("E-mail: não foi possível ler os anexos", e);
      return { erro: "Não foi possível juntar os anexos. Tenta outra vez." };
    }
  }

  let password;
  try {
    password = decifrar(conta.password_cifrada);
  } catch (e) {
    console.error("E-mail: não foi possível ler a password guardada", e);
    return { erro: "Liga outra vez a tua conta de e-mail em A minha conta." };
  }

  const de = conta.nome_remetente ? { name: conta.nome_remetente, address: conta.email } : conta.email;
  const mensagem = {
    from: de,
    to: { name: lead.nome, address: lead.email },
    subject: titulo,
    text: mensagemTexto,
    attachments: anexos.map(({ filename, content, contentType }) => ({ filename, content, contentType })),
    ...(respostaA ? { inReplyTo: respostaA, references: [respostaA] } : {}),
  };

  const smtp = transporteSmtp(conta, password);
  let info;
  try {
    info = await smtp.sendMail(mensagem);
  } catch (e) {
    console.error("E-mail: o envio falhou", e?.message ?? e);
    return { erro: traduzirErroLigacao(e, "SMTP") };
  } finally {
    smtp.close();
  }

  // cópia em "Enviados" (o Gmail já a guarda sozinho); uma falha aqui não desfaz o envio
  if (conta.smtp_host !== "smtp.gmail.com") {
    await guardarEmEnviados(conta, password, { ...mensagem, messageId: info.messageId, date: new Date() });
  }

  // registo: na tabela emails (o browser não escreve nela, migração 40) e no histórico do lead
  const { error: erroRegisto } = await admin.from("emails").insert({
    empresa_id: perfil.empresa_id,
    cliente_id: lead.id,
    autor_id: perfil.id,
    direcao: "enviado",
    de: conta.email,
    para: lead.email,
    assunto: titulo,
    corpo: mensagemTexto,
    message_id: info.messageId ?? null,
    em_resposta_a: respostaA || null,
    anexos: anexos.map((a) => ({ nome: a.filename, tamanho: a.tamanho })),
  });
  if (erroRegisto) console.error("E-mail: enviado, mas não ficou registado na tabela emails", erroRegisto);

  const { error: erroHistorico } = await supabase.from("interacoes").insert({
    empresa_id: perfil.empresa_id,
    cliente_id: lead.id,
    autor_id: perfil.id,
    tipo: "email",
    nota: `E-mail enviado: ${titulo}`.slice(0, 5000),
  });
  if (erroHistorico) console.error("E-mail: enviado, mas não ficou no histórico", erroHistorico);

  revalidatePath(`/painel/clientes/${lead.id}`);
  revalidatePath("/painel/tarefas/fila");
  return { sucesso: true };
}

// ---------- ver já se há e-mails novos (botão na ficha) ----------
// O cron faz isto de 5 em 5 minutos para todas as contas; aqui é só a conta da própria pessoa.
// Devolve { novos: n } ou { erro }.
export async function sincronizarAgora() {
  const { perfil } = await obterSessao();
  const { data: conta } = await criarClienteAdmin().from("contas_email").select("*").eq("perfil_id", perfil.id).maybeSingle();
  if (!conta) return { erro: "Liga primeiro a tua conta de e-mail em A minha conta." };

  const r = await sincronizarConta(conta);
  revalidatePath("/painel/clientes", "layout");
  return r.erro ? { erro: r.erro } : { novos: r.novos };
}
