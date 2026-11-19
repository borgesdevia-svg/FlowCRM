"use client";
// Caixa de pesquisa da Pipeline: filtra os cartões de todas as colunas enquanto se escreve.
// A pesquisa vive no URL (?q=...), como na lista de clientes: a página (servidor) volta a
// pedir os clientes já filtrados pela base de dados, por isso funciona com milhares de clientes.
// Espera 300 ms depois da última tecla antes de pesquisar, para não fazer um pedido por letra.

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Icone from "@/components/Icone";
import styles from "./PesquisaPipeline.module.css";

const ESPERA = 300;

export default function PesquisaPipeline({ inicial }) {
  const router = useRouter();
  const caminho = usePathname();
  const [texto, setTexto] = useState(inicial);
  const [aPesquisar, iniciar] = useTransition();
  const temporizador = useRef(null);

  // limpa o temporizador se se sair da página a meio
  useEffect(() => () => clearTimeout(temporizador.current), []);

  function pesquisar(valor) {
    const termo = valor.trim();
    iniciar(() => {
      // replace (e não push): cada letra não fica no histórico do botão "Voltar"
      router.replace(termo ? `${caminho}?q=${encodeURIComponent(termo)}` : caminho, { scroll: false });
    });
  }

  function mudar(valor) {
    setTexto(valor);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => pesquisar(valor), ESPERA);
  }

  function limpar() {
    clearTimeout(temporizador.current);
    setTexto("");
    pesquisar("");
  }

  return (
    <form
      className={styles.pesquisa}
      role="search"
      onSubmit={(e) => {
        // Enter pesquisa logo, sem esperar
        e.preventDefault();
        clearTimeout(temporizador.current);
        pesquisar(texto);
      }}
    >
      <Icone nome="pesquisa" tamanho={16} className={styles.lupa} />
      <input
        type="search"
        name="q"
        value={texto}
        onChange={(e) => mudar(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && texto && limpar()}
        placeholder="Pesquisar na pipeline (nome ou email)"
        aria-label="Pesquisar leads na pipeline"
        maxLength={80}
        autoComplete="off"
      />
      {aPesquisar && <span className={styles.aCarregar} aria-label="A pesquisar" />}
      {texto && !aPesquisar && (
        <button type="button" className={styles.limpar} onClick={limpar} aria-label="Limpar pesquisa">
          <Icone nome="cruz" tamanho={14} />
        </button>
      )}
    </form>
  );
}
