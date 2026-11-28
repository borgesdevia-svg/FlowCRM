"use client";
// Separador "E-mails" da ficha do lead: escrever (esquerda) e a conversa (direita).
// Junta as duas partes num componente de cliente para o botão "Responder" de um e-mail recebido
// abrir logo a janela com "Re: ..." sem pedir a página ao servidor.
// "alternativa" = o que aparece no lugar da janela quando o lead não tem e-mail ou a pessoa
// ainda não ligou a conta (vem pronto da página).

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import JanelaEmail from "./JanelaEmail";
import { sincronizarAgora } from "@/lib/acoes/email";
import { assuntoResposta } from "@/lib/emailModelos";
import { tempoRelativo } from "@/lib/datas";
import styles from "@/app/painel/clientes/ficha.module.css";

export default function EmailsLead({
  clienteId,
  para,
  nome,
  empresa,
  eu,
  inicio,
  conta,
  documentos,
  modelos,
  emails,
  sincronizacao,
  alternativa,
}) {
  const [resposta, setResposta] = useState(null); // { id, assunto, messageId } do e-mail a que se responde
  const [aVerificar, setAVerificar] = useState(false);
  const [resultado, setResultado] = useState(null); // { texto, erro? }
  const janela = useRef(null);
  const router = useRouter();
  const podeEscrever = Boolean(para && conta);

  function responder(email) {
    setResposta({ id: email.id, assunto: assuntoResposta(email.assunto), messageId: email.message_id });
    // leva a janela para a vista (no telemóvel as colunas ficam uma por baixo da outra)
    requestAnimationFrame(() => janela.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function verNovos() {
    setAVerificar(true);
    setResultado(null);
    try {
      const r = await sincronizarAgora();
      if (r?.erro) setResultado({ texto: r.erro, erro: true });
      else {
        const n = r?.novos ?? 0;
        setResultado({ texto: n === 0 ? "Sem e-mails novos." : n === 1 ? "1 e-mail novo." : `${n} e-mails novos.` });
        if (n > 0) router.refresh();
      }
    } catch {
      setResultado({ texto: "Não foi possível ver os e-mails novos. Tenta outra vez.", erro: true });
    } finally {
      setAVerificar(false);
    }
  }

  return (
    <div className={styles.colunas}>
      <section ref={janela} className={`entrar ${styles.cartao}`} style={{ scrollMarginTop: 60 }}>
        <header className={styles.topoCartao}>
          <h2>{resposta ? "Responder" : "Escrever e-mail"}</h2>
        </header>
        {podeEscrever ? (
          <JanelaEmail
            // key: ao carregar em "Responder" a janela recomeça com o assunto da resposta
            key={resposta?.id ?? "novo"}
            clienteId={clienteId}
            para={para}
            nome={nome}
            empresa={empresa}
            eu={eu}
            inicio={inicio}
            conta={conta}
            documentos={documentos}
            modelos={modelos}
            inicialAssunto={resposta?.assunto ?? ""}
            emRespostaA={resposta?.messageId ?? null}
            aoCancelarResposta={() => setResposta(null)}
          />
        ) : (
          alternativa
        )}
      </section>

      <section className={`entrar ${styles.cartao}`} style={{ "--atraso": "40ms" }}>
        <header className={`${styles.topoCartao} ${styles.topoComBotao}`}>
          <h2>
            Conversa {emails.length > 0 && <span>{emails.length}</span>}
          </h2>
          {conta && (
            <button type="button" className="botao botao-secundario" onClick={verNovos} disabled={aVerificar}>
              {aVerificar ? "A ver…" : "Ver e-mails novos"}
            </button>
          )}
        </header>

        {conta && (sincronizacao?.erro || sincronizacao?.em || resultado) && (
          <p className={resultado?.erro || (!resultado && sincronizacao?.erro) ? "erro-campo" : styles.notaTarefas} role="status">
            {resultado
              ? resultado.texto
              : sincronizacao.erro
                ? `Não foi possível ver a caixa de e-mail: ${sincronizacao.erro}`
                : `Caixa de e-mail vista ${tempoRelativo(sincronizacao.em)}.`}
          </p>
        )}

        {emails.length === 0 ? (
          <p className={styles.notaTarefas}>Ainda não há e-mails com este lead.</p>
        ) : (
          <ol className={styles.emails}>
            {emails.map((m) => (
              <li key={m.id} data-direcao={m.direcao}>
                <details>
                  <summary>
                    <strong>{m.assunto || "(sem assunto)"}</strong>
                    <small>
                      {m.direcao === "enviado" ? `Enviado por ${m.perfis?.nome ?? m.de}` : `Recebido de ${m.de}`} ·{" "}
                      {tempoRelativo(m.enviado_em)}
                      {m.anexos?.length > 0 && ` · ${m.anexos.length} ${m.anexos.length === 1 ? "anexo" : "anexos"}`}
                    </small>
                  </summary>
                  <p className={styles.corpoEmail}>{m.corpo}</p>
                  {m.anexos?.length > 0 && (
                    <p className={styles.notaTarefas}>Anexos: {m.anexos.map((a) => a.nome).join(", ")}</p>
                  )}
                </details>
                {m.direcao === "recebido" && podeEscrever && (
                  <button type="button" className={styles.responder} onClick={() => responder(m)}>
                    Responder
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
