"use client";
// Página de erro geral. Tem de ser um componente de CLIENTE: é uma
// "barreira de erros" do React que apanha falhas enquanto a página é desenhada
// e mostra isto em vez de um ecrã partido.
// Props (dadas pelo Next.js 16):
//  - error: o erro que aconteceu
//  - retry: função que tenta desenhar a página outra vez

import Link from "next/link";
import { useEffect } from "react";
import styles from "./estados-pagina.module.css";

export default function Erro({ error, retry }) {
  // escreve o erro na consola do browser, para quem está a programar o ver
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.pagina}>
      <h1>Algo correu mal</h1>
      <p className={styles.texto}>
        Não foi possível mostrar esta página. Tenta outra vez; se o problema continuar,
        volta ao início.
      </p>
      <div className={styles.botoes}>
        <button type="button" className="botao" onClick={() => retry()}>
          Tentar outra vez
        </button>
        <Link href="/" className="botao botao-secundario">
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
