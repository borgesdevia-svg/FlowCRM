"use client";
// Escrever um e-mail ao lead DENTRO do CRM (PLANO-EMAIL-DOCUMENTOS.md, Fase 2).
// Sai pela conta de e-mail da própria pessoa (A minha conta › Conta de e-mail), por SMTP.
// O texto começa com a mensagem do início da pessoa (página E-mails, com {saudacao}, {nome}...)
// e acaba na assinatura. Pode usar um modelo (página E-mails › Modelos) e anexar documentos do lead.
// Quando é uma resposta (botão "Responder" na conversa), vem com "Re: ..." e o Message-ID
// do e-mail original (emRespostaA), para o programa de e-mail do lead juntar a conversa.

import { useRef, useState } from "react";
import { enviarEmail } from "@/lib/acoes/email";
import { preencherTextoEmail } from "@/lib/linkEmail";
import { textoDoEmail } from "@/lib/emailModelos";
import { formatarTamanho } from "@/lib/documentos";
import Icone from "@/components/Icone";
import styles from "./JanelaEmail.module.css";

export default function JanelaEmail({
  clienteId,
  para,
  nome,
  empresa,
  eu,
  inicio,
  conta,
  documentos,
  modelos = [],
  inicialAssunto = "",
  emRespostaA = null,
  aoCancelarResposta,
}) {
  const dados = { nome, empresa, eu };
  const gerar = (modelo) => textoDoEmail({ inicio, modelo: modelo?.corpo, assinatura: conta.assinatura, ...dados });

  const [assunto, setAssunto] = useState(inicialAssunto);
  const [corpo, setCorpo] = useState(() => gerar(null));
  const [gerado, setGerado] = useState(() => gerar(null)); // o último texto que o CRM escreveu sozinho
  const [modeloId, setModeloId] = useState("");
  const [aTrocar, setATrocar] = useState(null); // modelo à espera de confirmação (já havia texto escrito)
  const [anexos, setAnexos] = useState([]);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);
  const caixa = useRef(null);

  const alternarAnexo = (id) => setAnexos((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  function aplicarModelo(modelo) {
    const texto = gerar(modelo);
    setCorpo(texto);
    setGerado(texto);
    // numa resposta o assunto fica "Re: ..."; num e-mail novo vem o do modelo (se tiver)
    if (modelo && !emRespostaA && modelo.assunto) setAssunto(preencherTextoEmail(modelo.assunto, dados));
    setModeloId(modelo?.id ?? "");
    setATrocar(null);
    caixa.current?.focus();
  }

  function escolherModelo(id) {
    const modelo = modelos.find((m) => m.id === id) ?? null;
    // se a pessoa já escreveu alguma coisa, pede confirmação antes de trocar o texto
    if (corpo !== gerado) {
      setModeloId(id);
      setATrocar(modelo ?? { id: "", nome: "sem modelo" });
      return;
    }
    aplicarModelo(modelo);
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (aEnviar) return;
    setErro("");
    setEnviado(false);
    if (!assunto.trim()) return setErro("Escreve o assunto.");
    if (!corpo.trim()) return setErro("Escreve a mensagem.");
    setAEnviar(true);
    try {
      const r = await enviarEmail({ clienteId, assunto: assunto.trim(), corpo, documentos: anexos, emRespostaA });
      if (r?.erro) return setErro(r.erro);
      const novo = gerar(null);
      setAssunto("");
      setCorpo(novo);
      setGerado(novo);
      setModeloId("");
      setAnexos([]);
      setEnviado(true);
      aoCancelarResposta?.(); // depois de responder, a janela volta a ser de e-mail novo
    } catch {
      setErro("Não foi possível enviar. Tenta outra vez.");
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <form onSubmit={enviar} className={styles.janela}>
      <dl className={styles.cabecalho}>
        <div>
          <dt>De</dt>
          <dd>{conta.nome_remetente ? `${conta.nome_remetente} <${conta.email}>` : conta.email}</dd>
        </div>
        <div>
          <dt>Para</dt>
          <dd>{para}</dd>
        </div>
      </dl>

      {emRespostaA && (
        <p className={styles.resposta}>
          A responder ao e-mail do lead.{" "}
          <button type="button" className={styles.linkBotao} onClick={aoCancelarResposta} disabled={aEnviar}>
            Escrever um e-mail novo
          </button>
        </p>
      )}

      {modelos.length > 0 && (
        <div className="campo">
          <label htmlFor="email-modelo">Usar um modelo</label>
          <select id="email-modelo" value={modeloId} onChange={(e) => escolherModelo(e.target.value)} disabled={aEnviar}>
            <option value="">Sem modelo</option>
            {modelos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {aTrocar && (
        <div className={styles.confirmar} role="alert">
          <p>
            {aTrocar.id
              ? `Já escreveste na mensagem. Trocar o texto pelo modelo "${aTrocar.nome}"?`
              : "Já escreveste na mensagem. Voltar ao texto sem modelo?"}
          </p>
          <div>
            <button type="button" className={styles.sim} onClick={() => aplicarModelo(aTrocar.id ? aTrocar : null)}>
              Sim, trocar
            </button>
            <button
              type="button"
              className={styles.nao}
              onClick={() => {
                setATrocar(null);
                setModeloId("");
              }}
            >
              Não
            </button>
          </div>
        </div>
      )}

      <div className="campo">
        <label htmlFor="email-assunto">Assunto</label>
        <input
          id="email-assunto"
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
          maxLength={300}
          placeholder="Ex.: Proposta para o seu projeto"
          disabled={aEnviar}
        />
      </div>

      <div className="campo">
        <label htmlFor="email-corpo">Mensagem</label>
        <textarea
          ref={caixa}
          id="email-corpo"
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          rows={10}
          maxLength={50000}
          disabled={aEnviar}
        />
      </div>

      {documentos.length > 0 && (
        <fieldset className={styles.anexos} disabled={aEnviar}>
          <legend>Anexar documentos do lead</legend>
          {documentos.map((d) => (
            <label key={d.id}>
              <input type="checkbox" checked={anexos.includes(d.id)} onChange={() => alternarAnexo(d.id)} />
              <span>{d.nome}</span>
              <small>{formatarTamanho(d.tamanho)}</small>
            </label>
          ))}
        </fieldset>
      )}

      {erro && (
        <p className="erro-campo" role="alert">
          {erro}
        </p>
      )}
      {enviado && (
        <p className={styles.enviado} role="status">
          E-mail enviado. Ficou guardado na conversa e no histórico do lead.
        </p>
      )}

      <button type="submit" className={styles.enviar} disabled={aEnviar} aria-busy={aEnviar}>
        <Icone nome="enviar" tamanho={16} />
        {aEnviar ? "A enviar…" : "Enviar"}
      </button>
    </form>
  );
}
