"use client";
// Parte de baixo da proposta pública: o cliente aceita (escrevendo o nome) ou recusa.
// Depois de responder (ou se já tinha respondido) mostra o resultado.

import { useState, useTransition } from "react";
import { responderProposta } from "@/lib/acoes/propostas";
import styles from "@/app/p/[token]/proposta.module.css";

export default function RespostaProposta({ token, estado, aceitePor, respondidaEm, empresa, daEquipa }) {
  const [nome, setNome] = useState("");
  const [aRecusar, setARecusar] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null);
  const [aEnviar, comecar] = useTransition();

  function responder(aceitar) {
    setErro("");
    comecar(async () => {
      const r = await responderProposta(token, aceitar, nome);
      if (r?.erro) setErro(r.erro);
      else setResultado(r.estado);
    });
  }

  const final = resultado ?? estado;

  if (final === "aceite") {
    return (
      <div className={`${styles.resposta} ${styles.aceite}`} role="status">
        <strong>Proposta aceite</strong>
        <p>
          {resultado
            ? `Obrigado, ${nome.trim().split(/\s+/)[0]}! A ${empresa} já foi avisada e vai entrar em contacto consigo.`
            : `Aceite por ${aceitePor}${respondidaEm ? ` a ${respondidaEm}` : ""}.`}
        </p>
      </div>
    );
  }
  if (final === "recusada") {
    return (
      <div className={`${styles.resposta} ${styles.recusada}`} role="status">
        <strong>Proposta recusada</strong>
        <p>
          {resultado
            ? `Obrigado pela resposta. A ${empresa} foi avisada.`
            : `Esta proposta foi recusada${respondidaEm ? ` a ${respondidaEm}` : ""}.`}
        </p>
      </div>
    );
  }
  if (final === "expirada") {
    return (
      <div className={styles.resposta} role="status">
        <strong>A validade desta proposta acabou</strong>
        <p>Fale com a {empresa} para receber uma proposta atualizada.</p>
      </div>
    );
  }

  return (
    <section className={styles.zonaResposta} aria-labelledby="titulo-resposta">
      <h2 id="titulo-resposta">Aceitar a proposta</h2>
      {daEquipa && (
        <p className={styles.avisoEquipa}>
          Estás a ver como membro da equipa. Esta parte é para o cliente: envia-lhe o link.
        </p>
      )}
      <form
        className={styles.formResposta}
        onSubmit={(e) => {
          e.preventDefault();
          responder(true);
        }}
      >
        <div className={styles.campoNome}>
          <label htmlFor="nome-aceite">O seu nome</label>
          <input
            id="nome-aceite"
            value={nome}
            maxLength={120}
            autoComplete="name"
            placeholder="Nome completo"
            onChange={(e) => setNome(e.target.value)}
            disabled={daEquipa || aEnviar}
            required
          />
          <small>Ao escrever o seu nome e aceitar, confirma que concorda com esta proposta.</small>
        </div>
        {erro && (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        )}
        <div className={styles.botoesResposta}>
          <button type="submit" className={styles.aceitar} disabled={daEquipa || aEnviar} aria-busy={aEnviar}>
            {aEnviar && !aRecusar ? "A enviar…" : "Aceitar proposta"}
          </button>
          {aRecusar ? (
            <span className={styles.confirmarRecusa}>
              Tem a certeza?
              <button type="button" className={styles.recusar} onClick={() => responder(false)} disabled={aEnviar}>
                Sim, recusar
              </button>
              <button type="button" className={styles.recusar} onClick={() => setARecusar(false)} disabled={aEnviar}>
                Não
              </button>
            </span>
          ) : (
            <button type="button" className={styles.recusar} onClick={() => setARecusar(true)} disabled={daEquipa || aEnviar}>
              Recusar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
