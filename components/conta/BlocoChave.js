"use client";
// A minha conta > Chave de recuperação: gerar uma chave nova (se a antiga se perdeu).
// Pede confirmação primeiro, porque a chave antiga deixa logo de funcionar.

import { useState } from "react";
import JanelaChave from "@/components/painel/JanelaChave";
import styles from "@/app/painel/conta/conta.module.css";

export default function BlocoChave({ email }) {
  const [passo, setPasso] = useState("inicio"); // "inicio" -> "confirmar" -> "janela" -> "feito"

  return (
    <div className={styles.chave}>
      {passo === "feito" && (
        <p className="alerta alerta-sucesso" role="status">
          Chave nova guardada. A antiga já não funciona.
        </p>
      )}

      {passo === "confirmar" ? (
        <>
          <p className={styles.avisoChave}>A chave que tens agora deixa de funcionar. Queres mesmo gerar uma nova?</p>
          <div className={styles.botoesChave}>
            <button type="button" className="botao" onClick={() => setPasso("janela")}>
              Gerar chave nova
            </button>
            <button type="button" className="botao botao-secundario" onClick={() => setPasso("inicio")}>
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="botao botao-secundario" onClick={() => setPasso("confirmar")}>
          Gerar chave nova
        </button>
      )}

      {passo === "janela" && <JanelaChave email={email} modo="nova" aoFechar={() => setPasso("feito")} />}
    </div>
  );
}
