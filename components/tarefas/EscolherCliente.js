"use client";
// Campo "Cliente" do formulário de tarefas: em vez de uma lista com todos os
// clientes (impossível de usar com centenas), é uma caixa de pesquisa.
//  - sem nada escrito mostra os clientes mais recentes (vêm da página)
//  - a partir de 2 letras procura na base de dados (Server Action pesquisarClientes)
//  - setas ↑ ↓ para andar, Enter para escolher, Esc para fechar
// O id escolhido vai num <input type="hidden" name="cliente_id"> para a Server Action.

import { useEffect, useId, useRef, useState } from "react";
import { pesquisarClientes } from "@/lib/acoes/pesquisa";
import { obterEstado } from "@/lib/estados";
import Icone from "@/components/Icone";
import styles from "./EscolherCliente.module.css";

export default function EscolherCliente({ sugestoes = [], inicial = null }) {
  const [escolhido, setEscolhido] = useState(inicial); // { id, nome } ou null
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0); // posição realçada com as setas
  const [resultadosDe, setResultadosDe] = useState(""); // termo a que os resultados pertencem
  const refContentor = useRef(null);
  const refCaixa = useRef(null);
  const idLista = useId();

  const termo = texto.trim();
  const pesquisa = termo.length >= 2;
  // enquanto a resposta não chega para o termo atual, mostramos "A procurar…"
  const aProcurar = pesquisa && resultadosDe !== termo;
  const lista = pesquisa && !aProcurar ? resultados : pesquisa ? [] : sugestoes;

  // pesquisa com atraso de 250 ms (não faz um pedido por tecla)
  useEffect(() => {
    if (!pesquisa) return;
    let cancelado = false;
    const temporizador = setTimeout(async () => {
      const r = await pesquisarClientes(termo);
      if (!cancelado) {
        setResultados(r);
        setResultadosDe(termo);
        setAtivo(0);
      }
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [termo, pesquisa]);

  // fechar ao clicar fora
  useEffect(() => {
    function clique(e) {
      if (!refContentor.current?.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", clique);
    return () => document.removeEventListener("mousedown", clique);
  }, []);

  function escolher(c) {
    setEscolhido({ id: c.id, nome: c.nome });
    setTexto("");
    setAberto(false);
  }

  function mudar() {
    setEscolhido(null);
    setAberto(true);
    // espera o campo de pesquisa aparecer para pôr lá o cursor
    requestAnimationFrame(() => refCaixa.current?.focus());
  }

  function tecla(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAberto(true);
      setAtivo((i) => Math.min(i + 1, lista.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Enter escolhe o cliente realçado em vez de enviar o formulário
      if (aberto && lista[ativo]) {
        e.preventDefault();
        escolher(lista[ativo]);
      }
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  return (
    <div ref={refContentor} className={styles.contentor}>
      <input type="hidden" name="cliente_id" value={escolhido?.id ?? ""} />

      {escolhido ? (
        // cliente já escolhido: mostra o nome e um botão para trocar
        <div className={styles.escolhido}>
          <span>{escolhido.nome}</span>
          <button type="button" onClick={mudar}>
            Mudar
          </button>
        </div>
      ) : (
        <div className={styles.caixa}>
          <Icone nome="pesquisa" tamanho={16} className={styles.lupa} />
          <input
            ref={refCaixa}
            id="cliente_id"
            type="text"
            role="combobox"
            aria-expanded={aberto}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-activedescendant={aberto && lista[ativo] ? `${idLista}-${ativo}` : undefined}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setAberto(true);
              setAtivo(0);
            }}
            onFocus={() => setAberto(true)}
            onKeyDown={tecla}
            placeholder="Pesquisar cliente…"
            autoComplete="off"
          />
        </div>
      )}

      {aberto && !escolhido && (
        <div className={styles.resultados}>
          {!pesquisa && sugestoes.length > 0 && <p className={styles.titulo}>Mais recentes</p>}

          {lista.length > 0 ? (
            <ul id={idLista} role="listbox" aria-label="Clientes">
              {lista.map((c, i) => (
                <li
                  key={c.id}
                  id={`${idLista}-${i}`}
                  role="option"
                  aria-selected={i === ativo}
                  className={i === ativo ? `${styles.opcao} ${styles.ativa}` : styles.opcao}
                  // mousedown em vez de click: escolhe antes de a caixa perder o foco
                  onMouseDown={(e) => {
                    e.preventDefault();
                    escolher(c);
                  }}
                  onMouseEnter={() => setAtivo(i)}
                >
                  <span className={styles.nomeEmail}>
                    <strong>{c.nome}</strong>
                    {c.email && <small>{c.email}</small>}
                  </span>
                  <i style={{ background: obterEstado(c.estado).cor }} title={obterEstado(c.estado).texto}></i>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.nada}>
              {pesquisa
                ? aProcurar
                  ? "A procurar…"
                  : "Nenhum cliente com esse nome."
                : "Escreve pelo menos 2 letras do nome ou email."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
