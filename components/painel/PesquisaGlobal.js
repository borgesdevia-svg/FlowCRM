"use client";
// Caixa de pesquisa do menu lateral: mostra clientes enquanto se escreve.
// É de cliente porque reage a cada tecla. Quem procura na base de dados é a
// Server Action "pesquisarClientes" (no servidor).
//
//  - espera 250 ms depois da última tecla antes de pesquisar (não faz um pedido por tecla)
//  - Enter: abre a lista de clientes filtrada por esse texto
//  - Ctrl+K (ou ⌘K no Mac): põe o cursor na caixa, de qualquer página
//  - Esc: fecha os resultados

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pesquisarClientes } from "@/lib/acoes/pesquisa";
import { obterEstado } from "@/lib/estados";
import { iniciais } from "@/lib/texto";
import Icone from "@/components/Icone";
import styles from "./PesquisaGlobal.module.css";

export default function PesquisaGlobal() {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState([]);
  const [aberto, setAberto] = useState(false);
  const refCaixa = useRef(null);
  const refContentor = useRef(null);
  const router = useRouter();

  // pesquisa com atraso: cada tecla cancela o temporizador anterior
  useEffect(() => {
    const termo = texto.trim();
    let cancelado = false; // evita mostrar respostas antigas que cheguem atrasadas
    const temporizador = setTimeout(async () => {
      const lista = termo.length >= 2 ? await pesquisarClientes(termo) : [];
      if (!cancelado) setResultados(lista);
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [texto]);

  // atalho Ctrl+K / ⌘K e fechar ao clicar fora da caixa
  useEffect(() => {
    function tecla(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); // o browser usa Ctrl+K para outra coisa
        refCaixa.current?.focus();
      }
    }
    function clique(e) {
      if (!refContentor.current?.contains(e.target)) setAberto(false);
    }
    window.addEventListener("keydown", tecla);
    document.addEventListener("mousedown", clique);
    return () => {
      window.removeEventListener("keydown", tecla);
      document.removeEventListener("mousedown", clique);
    };
  }, []);

  // Enter: vai para a lista de clientes com a pesquisa feita
  function submeter(e) {
    e.preventDefault();
    const termo = texto.trim();
    if (!termo) return;
    setAberto(false);
    router.push(`/painel/clientes?q=${encodeURIComponent(termo)}`);
  }

  // ao escolher um resultado: limpa e fecha
  function escolher() {
    setTexto("");
    setAberto(false);
  }

  const mostrar = aberto && texto.trim().length >= 2;

  return (
    <div ref={refContentor} className={styles.pesquisa}>
      <form onSubmit={submeter} role="search">
        <Icone nome="pesquisa" tamanho={16} className={styles.lupa} />
        <input
          ref={refCaixa}
          type="search"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={(e) => e.key === "Escape" && setAberto(false)}
          placeholder="Pesquisar clientes…"
          aria-label="Pesquisar clientes"
          autoComplete="off"
        />
        <kbd className={styles.atalho} aria-hidden="true">
          Ctrl K
        </kbd>
      </form>

      {mostrar && (
        <div className={styles.resultados}>
          {resultados.length === 0 ? (
            <p className={styles.nada}>Nenhum cliente encontrado.</p>
          ) : (
            <ul>
              {resultados.map((c) => {
                const est = obterEstado(c.estado);
                return (
                  <li key={c.id}>
                    <Link href={`/painel/clientes/${c.id}`} onClick={escolher} className={styles.resultado}>
                      <b>{iniciais(c.nome)}</b>
                      <span className={styles.nomeEmail}>
                        <strong>{c.nome}</strong>
                        <small>{c.email ?? "Sem email"}</small>
                      </span>
                      <i style={{ background: est.cor }} title={est.texto}></i>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <p className={styles.dica}>Enter para ver todos os resultados</p>
        </div>
      )}
    </div>
  );
}
