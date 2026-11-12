"use client";
// Demonstração com scroll ("scroll storytelling"):
// à esquerda, os passos de texto passam com o scroll; à direita, uma janela da app
// fica FIXA no ecrã (position: sticky) e muda conforme o passo que está a ser lido.
//
// Como funciona:
//  - useState guarda o número do passo atual (0, 1, 2 ou 3);
//  - um IntersectionObserver avisa quando um bloco de texto passa pelo MEIO do ecrã;
//  - quando o passo muda, o React volta a desenhar a janela e o CSS anima a mudança.

import { useEffect, useRef, useState } from "react";
import styles from "./DemoScroll.module.css";

const passos = [
  {
    titulo: "Um visitante preenche o teu formulário",
    texto: "Partilhas o link do formulário no teu site ou nas redes sociais. Quem estiver interessado deixa o nome e o contacto.",
  },
  {
    titulo: "Entra logo no CRM como cliente novo",
    texto: "Ninguém tem de copiar nada. O contacto aparece na lista de clientes, marcado como novo e à espera de um responsável.",
  },
  {
    titulo: "A equipa acompanha o negócio",
    texto: "O administrador atribui o cliente a um comercial, que o passa para negociação. Toda a equipa vê em que ponto está.",
  },
  {
    titulo: "Negócio fechado",
    texto: "Quando a venda acontece, o cliente passa a ativo e os números da empresa atualizam-se sozinhos.",
  },
];

// clientes que já estavam na lista (não mudam)
const clientesFixos = [
  { nome: "Padaria Central", resp: "Ana", estado: "novo" },
  { nome: "Oficina Lopes", resp: "Rui", estado: "negociacao" },
  { nome: "Studio Mar", resp: "Ana", estado: "ativo" },
];

// como está a cliente "Marta Silva" em cada passo (no passo 0 ainda não existe)
const martaPorPasso = [
  null,
  { estado: "novo", resp: null },
  { estado: "negociacao", resp: "Rui" },
  { estado: "ativo", resp: "Rui" },
];

const ESTADOS = {
  novo: { texto: "Novo", cor: "var(--cor-estado-novo)" },
  negociacao: { texto: "Em negociação", cor: "var(--cor-estado-negociacao)" },
  ativo: { texto: "Ativo", cor: "var(--cor-estado-ativo)" },
};

export default function DemoScroll() {
  const [passo, setPasso] = useState(0);
  // lista de referências para os blocos de texto (um por passo)
  const refsPassos = useRef([]);

  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) setPasso(Number(entrada.target.dataset.indice));
        });
      },
      // a "zona de deteção" é uma faixa fina entre 65% e 75% da altura do ecrã
      // (mais abaixo do meio para, no telemóvel, o texto ativo não ficar debaixo da janela)
      { rootMargin: "-65% 0px -25% 0px" }
    );

    refsPassos.current.forEach((elemento) => elemento && observador.observe(elemento));
    return () => observador.disconnect();
  }, []);

  const marta = martaPorPasso[passo];

  // contagem por estado para a barra colorida (muda quando a Marta muda de estado)
  const contagem = { novo: 0, negociacao: 0, ativo: 0 };
  clientesFixos.forEach((c) => contagem[c.estado]++);
  if (marta) contagem[marta.estado]++;

  return (
    <section id="demonstracao" className={styles.seccao}>
      <div className={styles.cabecalho}>
        <h2>Vê o FlowCRM a trabalhar</h2>
        <p>Faz scroll e acompanha um cliente desde o primeiro contacto até à venda.</p>
      </div>

      <div className={styles.demo}>
        {/* coluna dos textos: cada bloco ocupa quase um ecrã de altura */}
        <div className={styles.textos}>
          {passos.map((p, i) => (
            <div
              key={p.titulo}
              ref={(elemento) => {
                refsPassos.current[i] = elemento;
              }}
              data-indice={i}
              className={i === passo ? `${styles.passo} ${styles.passoAtivo}` : styles.passo}
            >
              <span className={styles.numero}>{i + 1}</span>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </div>
          ))}
        </div>

        {/* coluna da janela: fica presa no ecrã enquanto os textos passam */}
        <div className={styles.palco} aria-hidden="true">
          <div className={styles.janela}>
            <div className={styles.barraJanela}>
              <span className={styles.pontos}>
                <i></i>
                <i></i>
                <i></i>
              </span>
              <span className={styles.endereco}>
                {passo === 0 ? "flowcrm.app/f/a-tua-empresa" : "flowcrm.app/painel/clientes"}
              </span>
            </div>

            <div className={styles.ecras}>
              {/* ECRÃ 1: formulário público (só no passo 0) */}
              <div className={passo === 0 ? `${styles.ecra} ${styles.ecraVisivel}` : styles.ecra}>
                <div className={styles.formulario}>
                  <span className={styles.inicial}>A</span>
                  <strong className={styles.tituloForm}>Acme, Lda.</strong>
                  <small>Deixa o teu contacto e respondemos em breve.</small>
                  <div className={styles.campoFalso}>
                    <small>Nome</small>
                    <span className={styles.escrito}>Marta Silva</span>
                  </div>
                  <div className={styles.campoFalso}>
                    <small>Email</small>
                    <span className={styles.escrito} style={{ animationDelay: "0.9s" }}>
                      marta@exemplo.pt
                    </span>
                  </div>
                  <span className={styles.botaoFalso}>Enviar pedido de contacto</span>
                </div>
              </div>

              {/* ECRÃ 2: lista de clientes (passos 1 a 3) */}
              <div className={passo > 0 ? `${styles.ecra} ${styles.ecraVisivel}` : styles.ecra}>
                <div className={styles.lista}>
                  <div className={styles.topoLista}>
                    <strong>Clientes</strong>
                    <small>{clientesFixos.length + (marta ? 1 : 0)} no total</small>
                  </div>

                  {/* barra de distribuição: cada segmento cresce com flex-grow */}
                  <div className={styles.barra}>
                    {Object.entries(contagem).map(([chave, n]) => (
                      <span key={chave} style={{ flexGrow: n, background: ESTADOS[chave].cor }}></span>
                    ))}
                  </div>

                  {/* linha da Marta: aparece no passo 1 e muda nos passos seguintes */}
                  <div className={marta ? `${styles.linha} ${styles.linhaNova}` : `${styles.linha} ${styles.linhaEscondida}`}>
                    <span className={styles.cliente}>
                      <b>MS</b>
                      Marta Silva
                      <em>formulário</em>
                    </span>
                    <span className={marta?.resp ? styles.resp : styles.semResp}>
                      {marta?.resp ?? "Por atribuir"}
                    </span>
                    {marta && (
                      // key: quando o estado muda, a etiqueta "renasce" e faz uma pequena animação
                      <span key={marta.estado} className={styles.estado} style={{ background: ESTADOS[marta.estado].cor }}>
                        {ESTADOS[marta.estado].texto}
                      </span>
                    )}
                  </div>

                  {clientesFixos.map((c) => (
                    <div key={c.nome} className={styles.linha}>
                      <span className={styles.cliente}>
                        <b>{c.nome.split(" ").map((p) => p[0]).join("")}</b>
                        {c.nome}
                      </span>
                      <span className={styles.resp}>{c.resp}</span>
                      <span className={styles.estado} style={{ background: ESTADOS[c.estado].cor }}>
                        {ESTADOS[c.estado].texto}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* indicador de progresso: um traço por passo */}
          <div className={styles.progresso}>
            {passos.map((p, i) => (
              <span key={p.titulo} className={i <= passo ? styles.progressoFeito : ""}></span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
