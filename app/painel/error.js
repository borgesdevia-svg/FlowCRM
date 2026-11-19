"use client";
// Erro dentro do painel. Como fica DENTRO do layout do painel, o menu lateral
// continua visível e a pessoa pode ir para outra secção sem recarregar tudo.
// (O app/error.js continua a apanhar erros fora do painel.)
// Props (dadas pelo Next.js 16):
//  - error: o erro que aconteceu
//  - retry: função que tenta desenhar a página outra vez

import Link from "next/link";
import { useEffect } from "react";
import styles from "../estados-pagina.module.css";

export default function ErroPainel({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={`${styles.pagina} ${styles.dentroPainel}`} role="alert">
      <h1>Algo correu mal</h1>
      <p className={styles.texto}>
        Não foi possível mostrar esta página. Pode ter sido uma falha de ligação: tenta outra vez
        ou escolhe outra secção no menu.
      </p>
      <div className={styles.botoes}>
        <button type="button" className="botao" onClick={() => retry()}>
          Tentar outra vez
        </button>
        <Link href="/painel" className="botao botao-secundario">
          Ir para o Início
        </Link>
      </div>
    </div>
  );
}
