"use client";
// Bloco "Meta de <mês>" da Visão geral (só o administrador o vê).
// Mostra quanto já se ganhou este mês contra a meta da empresa, e deixa definir ou mudar a meta.

import { useActionState, useState } from "react";
import { guardarMeta } from "@/lib/acoes/metas";
import { formatarEuros } from "@/lib/estados";
import styles from "./MetaMes.module.css";

export default function MetaMes({ meta, ganho, nomeMes }) {
  const [estado, accao, pendente] = useActionState(guardarMeta, {});
  // sem meta, a caixa aparece logo; com meta, só depois de carregar em "Mudar meta"
  const [aEditar, setAEditar] = useState(!meta);

  // depois de guardar, fecha a caixa (compara com a última resposta, durante o render, sem useEffect)
  const [ultimaResposta, setUltimaResposta] = useState(estado);
  if (estado !== ultimaResposta) {
    setUltimaResposta(estado);
    if (estado.sucesso) setAEditar(false);
  }

  const percentagem = meta ? Math.round((ganho / meta) * 100) : 0;

  return (
    <article className={styles.bloco}>
      <header className={styles.topo}>
        <div>
          <h2>Meta de {nomeMes}</h2>
          <p className={styles.subtitulo}>Valor dos leads que passaram a Ativo este mês.</p>
        </div>
        {meta && !aEditar && (
          <button type="button" className={`botao botao-secundario ${styles.botaoPequeno}`} onClick={() => setAEditar(true)}>
            Mudar meta
          </button>
        )}
      </header>

      {meta && (
        <>
          <p className={styles.valores}>
            <strong>{formatarEuros(ganho)}</strong> de {formatarEuros(meta)} <span>({percentagem}%)</span>
          </p>
          {/* a barra enche até 100%, mesmo que a meta seja ultrapassada */}
          <div
            className={styles.barra}
            role="progressbar"
            aria-label={`Meta de ${nomeMes}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, percentagem)}
          >
            <span style={{ width: `${Math.min(100, percentagem)}%` }}></span>
          </div>
        </>
      )}

      {aEditar && (
        <form action={accao} className={styles.formulario}>
          {!meta && <p className={styles.subtitulo}>Ainda não há meta para este mês. Quanto quer a empresa fechar?</p>}
          {estado.erro && (
            <p className="alerta alerta-erro" role="alert">
              {estado.erro}
            </p>
          )}
          <div className={styles.linha}>
            {/* "campo" dá à caixa o mesmo aspeto das outras do CRM */}
            <div className={`campo ${styles.caixa}`}>
              <input
                name="valor"
                aria-label="Meta em euros"
                inputMode="decimal"
                placeholder="12 000 €"
                defaultValue={meta ? String(meta).replace(".", ",") : ""}
                autoComplete="off"
                required
              />
            </div>
            <button type="submit" className={`botao ${styles.botaoPequeno}`} disabled={pendente}>
              {pendente ? "A guardar" : "Guardar"}
            </button>
            {meta && (
              <button type="button" className={`botao botao-secundario ${styles.botaoPequeno}`} onClick={() => setAEditar(false)}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
    </article>
  );
}
