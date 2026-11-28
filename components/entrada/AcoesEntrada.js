"use client";
// Botões de um lead na Entrada: escolher quem fica com ele + "Aceitar", ou "Rejeitar"
// (em dois toques, porque apaga o lead).

import { useState } from "react";
import { aceitarLead, rejeitarLead } from "@/lib/acoes/entrada";
import styles from "./Entrada.module.css";

const A_VEZ = "a-vez"; // igual em lib/acoes/entrada.js

// aVez = CRM Pro com a distribuição ligada: a opção "À vez pela equipa" vem escolhida
export default function AcoesEntrada({ clienteId, membros, aVez = false }) {
  const [pessoa, setPessoa] = useState(aVez ? A_VEZ : "");
  const [aRejeitar, setARejeitar] = useState(false);
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState("");

  async function correr(accao) {
    setPendente(true);
    setErro("");
    try {
      const r = await accao();
      if (r?.erro) setErro(r.erro);
    } catch {
      setErro("Não foi possível. Tenta outra vez.");
    } finally {
      setPendente(false);
    }
  }

  return (
    <div className={styles.acoes}>
      {!aRejeitar ? (
        <>
          <div className="campo">
            <label htmlFor={`pessoa-${clienteId}`} className="so-leitores">
              Quem fica com este lead
            </label>
            <select id={`pessoa-${clienteId}`} value={pessoa} onChange={(e) => setPessoa(e.target.value)} disabled={pendente}>
              <option value="">Escolher quem fica com ele</option>
              {aVez && <option value={A_VEZ}>À vez pela equipa</option>}
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="botao"
            disabled={!pessoa || pendente}
            onClick={() => correr(() => aceitarLead(clienteId, pessoa))}
          >
            {pendente ? "A aceitar…" : "Aceitar"}
          </button>
          <button type="button" className={styles.rejeitar} onClick={() => setARejeitar(true)} disabled={pendente}>
            Rejeitar
          </button>
        </>
      ) : (
        <>
          <span className={styles.pergunta}>Rejeitar apaga o lead. Tens a certeza?</span>
          <button type="button" className={styles.confirmar} disabled={pendente} onClick={() => correr(() => rejeitarLead(clienteId))}>
            {pendente ? "A apagar…" : "Sim, rejeitar"}
          </button>
          <button type="button" className={styles.rejeitar} onClick={() => setARejeitar(false)} disabled={pendente}>
            Não
          </button>
        </>
      )}
      {erro && (
        <p className="erro-campo" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
