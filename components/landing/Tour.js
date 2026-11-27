"use client";
// Visita guiada à app, controlada pelo scroll.
//
// Uma janela falsa do browser mostra as páginas da app, uma de cada vez:
// Visão geral -> Leads -> Ficha do lead -> Pipeline -> Tarefas -> Configurações.
//
// Como funciona:
//  - a secção é mais alta do que o ecrã; lá dentro, a janela fica PRESA ao ecrã
//    (position: sticky, no CSS) enquanto o visitante faz scroll;
//  - a janela é quase do tamanho do ecrã (16:10); separadores e legenda ficam dentro dela;
//  - ao fazer scroll, medimos quanto da secção já passou (um número de 0 a 1);
//  - esse número decide qual a página visível (estado "ecra", guardado com useState);
//  - cada página "gasta" pouco scroll (ver --por-pagina no CSS), para não cansar;
//  - clicar num separador leva o scroll até à posição dessa página;
//  - as animações de cada página são feitas em CSS, quando a página fica ativa.
// Os dados são inventados (não são clientes reais).

import { useEffect, useRef, useState } from "react";
import styles from "./Tour.module.css";

const ECRAS = [
  {
    menu: "Visão geral",
    separador: "Visão geral",
    url: "flowcrm.app/painel",
    titulo: "O dia da equipa, num relance",
    texto: "Novos contactos, taxa de conversão e valor em negociação, sempre atualizados.",
  },
  {
    menu: "Leads",
    separador: "Leads",
    url: "flowcrm.app/painel/clientes",
    titulo: "Todos os leads numa lista",
    texto: "Pesquisa pelo nome, filtra por estado e vê quem é o responsável por cada um.",
  },
  {
    menu: "Leads",
    separador: "Ficha",
    url: "flowcrm.app/painel/clientes/marta-silva",
    titulo: "A história de cada lead",
    texto: "Chamadas, reuniões e notas ficam guardadas. Qualquer colega sabe onde o negócio ficou.",
  },
  {
    menu: "Pipeline",
    separador: "Pipeline",
    url: "flowcrm.app/painel/pipeline",
    titulo: "Cada negócio na sua fase",
    texto: "Um clique e o lead avança de fase. A equipa vê logo o que está para fechar.",
  },
  {
    menu: "Tarefas",
    separador: "Tarefas",
    url: "flowcrm.app/painel/tarefas",
    titulo: "Nada fica esquecido",
    texto: "Lembretes com data para cada lead. Riscas quando está feito.",
  },
  {
    menu: "Configurações",
    separador: "Configurações",
    url: "flowcrm.app/painel/configuracoes",
    titulo: "O CRM à maneira da tua empresa",
    texto: "Escolhe o gráfico da Visão geral, o modo claro ou escuro e o nome de cada página do menu. O formulário também leva as tuas perguntas e o teu logótipo.",
  },
];

const MENU = ["Visão geral", "Leads", "Pipeline", "Tarefas", "Configurações"];

const ESTADOS = {
  novo: { texto: "Novo", cor: "var(--cor-estado-novo)" },
  negociacao: { texto: "Em negociação", cor: "var(--cor-estado-negociacao)" },
  ativo: { texto: "Ativo", cor: "var(--cor-estado-ativo)" },
  perdido: { texto: "Perdido", cor: "var(--cor-estado-perdido)" },
};

export default function Tour() {
  const [ecra, setEcra] = useState(0); // número da página visível (0 a 5)
  const refSeccao = useRef(null); // "ref" = ligação direta ao elemento <section> no browser
  const refSeparadores = useRef(null);

  // no telemóvel os separadores não cabem todos: a fila desliza para mostrar o ativo
  // (só mexe na fila, nunca no scroll da página)
  useEffect(() => {
    const fila = refSeparadores.current;
    const botao = fila?.children[ecra];
    if (!botao || fila.scrollWidth <= fila.clientWidth) return;
    const f = fila.getBoundingClientRect();
    const b = botao.getBoundingClientRect();
    // põe o separador ativo ao meio da fila
    fila.scrollTo({ left: fila.scrollLeft + (b.left - f.left) - (f.width - b.width) / 2, behavior: "smooth" });
  }, [ecra]);

  // O useEffect corre uma vez, depois de o componente aparecer no browser.
  // Aqui: fica a "ouvir" o scroll e calcula que página mostrar.
  useEffect(() => {
    const seccao = refSeccao.current;
    let pedido = null;

    function medir() {
      pedido = null;
      const caixa = seccao.getBoundingClientRect(); // posição da secção no ecrã
      // percurso: quanto scroll "cabe" dentro da secção enquanto a janela está presa
      const percurso = caixa.height - window.innerHeight;
      // progresso: 0 quando a secção chega ao topo do ecrã, 1 quando acaba
      const progresso = Math.min(0.999, Math.max(0, -caixa.top / percurso));
      setEcra(Math.floor(progresso * ECRAS.length)); // se o valor não mudar, o React não redesenha
    }

    // requestAnimationFrame: mede no máximo uma vez por imagem desenhada (fica suave)
    function aoMexer() {
      if (pedido === null) pedido = requestAnimationFrame(medir);
    }

    medir();
    window.addEventListener("scroll", aoMexer, { passive: true });
    window.addEventListener("resize", aoMexer);
    // limpeza: quando o componente sai da página, deixamos de ouvir o scroll
    return () => {
      window.removeEventListener("scroll", aoMexer);
      window.removeEventListener("resize", aoMexer);
      if (pedido !== null) cancelAnimationFrame(pedido);
    };
  }, []);

  // clicar num separador leva o scroll até ao meio do troço dessa página
  function irPara(i) {
    const seccao = refSeccao.current;
    const percurso = seccao.offsetHeight - window.innerHeight;
    const topo = seccao.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: topo + ((i + 0.5) / ECRAS.length) * percurso, behavior: "smooth" });
  }

  const atual = ECRAS[ecra];
  // classe de cada página: a ativa aparece, as outras escondem-se
  const classeEcra = (i) => (i === ecra ? `${styles.ecra} ${styles.ativo}` : styles.ecra);

  // "movimento-suave": com "menos movimento" ligado, os fades continuam (ver globals.css)
  return (
    <section
      id="demonstracao"
      ref={refSeccao}
      className={`${styles.tour} movimento-suave`}
      style={{ "--n": ECRAS.length }}
    >
      {/* esta parte fica presa ao ecrã enquanto a secção passa */}
      <div className={styles.fixo}>
        {/* a janela entra ao carregar a página, depois do título e dos botões, e sobe mais (40px) */}
        <div className={`${styles.palco} entrar`} style={{ "--atraso": "350ms", "--subida": "40px" }}>
          <div className={styles.janela}>
            <div className={styles.barraJanela} aria-hidden="true">
              <span className={styles.pontos}>
                <i></i>
                <i></i>
                <i></i>
              </span>
              <span className={styles.endereco}>{atual.url}</span>
            </div>

            {/* separadores: ficam no topo da janela, como os de um browser.
                Mostram em que página vamos; clicar salta para essa página */}
            <div ref={refSeparadores} className={styles.separadores} role="tablist" aria-label="Páginas da app">
              {ECRAS.map((e, i) => (
                <button
                  key={e.separador}
                  type="button"
                  role="tab"
                  aria-selected={i === ecra}
                  onClick={() => irPara(i)}
                  className={i === ecra ? styles.separadorAtivo : ""}
                >
                  {e.separador}
                </button>
              ))}
            </div>

            <div className={styles.corpo} aria-hidden="true">
              {/* menu lateral: o fundo verde desliza até ao item da página atual */}
              <aside className={styles.lateral}>
                <div className={styles.empresa}>
                  <span>A</span>
                  Acme, Lda.
                </div>
                <div className={styles.menu} style={{ "--item": MENU.indexOf(atual.menu) }}>
                  <span className={styles.marcador}></span>
                  {MENU.map((item) => (
                    <div key={item} className={item === atual.menu ? styles.itemAtivo : ""}>
                      {item}
                    </div>
                  ))}
                </div>
              </aside>

              <div className={styles.principal}>
                <div className={classeEcra(0)}>
                  <EcraPainel />
                </div>
                <div className={classeEcra(1)}>
                  <EcraClientes />
                </div>
                <div className={classeEcra(2)}>
                  <EcraFicha />
                </div>
                <div className={classeEcra(3)}>
                  <EcraPipeline />
                </div>
                <div className={classeEcra(4)}>
                  <EcraTarefas />
                </div>
                <div className={classeEcra(5)}>
                  <EcraPersonalizar />
                </div>
              </div>
            </div>

            {/* legenda: faixa no fundo da janela.
                A "key" faz o React recriar o bloco, o que repete a animação de entrada */}
            <div key={ecra} className={styles.legenda} aria-live="polite">
              <h2>{atual.titulo}</h2>
              <p>{atual.texto}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- As páginas falsas da app ----------
// Cada elemento com a classe "anima" aparece quando a página fica ativa.
// A variável --i dá a ordem: o 1.º aparece primeiro, o 2.º um pouco depois, etc.

function EcraPainel() {
  const numeros = [
    { rotulo: "Novos leads", valor: "24", variacao: "+18%" },
    { rotulo: "Conversão", valor: "38%", variacao: "+4%" },
    { rotulo: "Em negociação", valor: "48 k€", variacao: "+12%" },
  ];
  const porEstado = [
    { estado: "novo", n: 9 },
    { estado: "negociacao", n: 6 },
    { estado: "ativo", n: 12 },
    { estado: "perdido", n: 3 },
  ];

  return (
    <>
      <div className={`${styles.topo} ${styles.anima}`} style={{ "--i": 0 }}>
        <div>
          <small>Bom dia, Ana</small>
          <strong>Visão geral</strong>
        </div>
        <span className={styles.botaoFalso}>+ Novo lead</span>
      </div>

      <div className={styles.numeros}>
        {numeros.map((n, i) => (
          <div key={n.rotulo} className={`${styles.cartao} ${styles.anima}`} style={{ "--i": i + 1 }}>
            <small>{n.rotulo}</small>
            <strong>{n.valor}</strong>
            <em>{n.variacao} esta semana</em>
          </div>
        ))}
      </div>

      <div className={styles.graficos}>
        {/* gráfico de linha: a linha "desenha-se" sozinha (stroke-dashoffset em CSS) */}
        <div className={`${styles.cartao} ${styles.anima}`} style={{ "--i": 4 }}>
          <small>Novos leads · últimos 14 dias</small>
          <svg viewBox="0 0 300 90" className={styles.graficoLinha} preserveAspectRatio="none">
            <path
              className={styles.area}
              d="M0 70 L23 62 L46 66 L69 50 L92 54 L115 40 L138 46 L161 32 L184 38 L207 24 L230 30 L253 16 L276 20 L300 8 L300 90 L0 90 Z"
            />
            <path
              className={styles.traco}
              pathLength="1"
              d="M0 70 L23 62 L46 66 L69 50 L92 54 L115 40 L138 46 L161 32 L184 38 L207 24 L230 30 L253 16 L276 20 L300 8"
            />
          </svg>
        </div>

        {/* barras por estado: cada barra cresce de baixo para cima */}
        <div className={`${styles.cartao} ${styles.anima}`} style={{ "--i": 5 }}>
          <small>Leads por estado</small>
          <div className={styles.barras}>
            {porEstado.map((b, i) => (
              <div key={b.estado}>
                <span style={{ height: `${(b.n / 12) * 100}%`, background: ESTADOS[b.estado].cor, "--i": 6 + i }}></span>
                <small>{b.n}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function EcraClientes() {
  const clientes = [
    { nome: "Marta Silva", resp: "Rui", valor: "2 400 €", estado: "negociacao" },
    { nome: "Padaria Central", resp: "Ana", valor: "1 200 €", estado: "novo" },
    { nome: "Oficina Lopes", resp: "Rui", valor: "3 500 €", estado: "negociacao" },
    { nome: "Studio Mar", resp: "Ana", valor: "2 800 €", estado: "ativo" },
    { nome: "Clínica Sol", resp: "Rui", valor: "900 €", estado: "perdido" },
  ];

  return (
    <>
      <div className={`${styles.topo} ${styles.anima}`} style={{ "--i": 0 }}>
        <div>
          <small>30 leads</small>
          <strong>Leads</strong>
        </div>
        <span className={styles.botaoFalso}>+ Novo lead</span>
      </div>

      <div className={`${styles.ferramentas} ${styles.anima}`} style={{ "--i": 1 }}>
        <span className={styles.pesquisa}>
          <span className={styles.escrito}>Mar</span>
        </span>
        {["Todos", "Novo", "Em negociação", "Ativo"].map((f, i) => (
          <span key={f} className={i === 0 ? `${styles.filtro} ${styles.filtroAtivo}` : styles.filtro}>
            {f}
          </span>
        ))}
      </div>

      <div className={styles.tabela}>
        {clientes.map((c, i) => (
          <div
            key={c.nome}
            className={i === 0 ? `${styles.linha} ${styles.linhaRealce} ${styles.anima}` : `${styles.linha} ${styles.anima}`}
            style={{ "--i": i + 2 }}
          >
            <span className={styles.cliente}>
              <b>{c.nome.split(" ").map((p) => p[0]).join("")}</b>
              {c.nome}
            </span>
            <span className={styles.suave}>{c.resp}</span>
            <span className={styles.suave}>{c.valor}</span>
            <span className={styles.estado} style={{ "--cor": ESTADOS[c.estado].cor }}>
              {ESTADOS[c.estado].texto}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function EcraFicha() {
  const historico = [
    { tipo: "Formulário", texto: "Pediu contacto através do site.", quando: "há 5 dias" },
    { tipo: "Chamada", texto: "Quer orçamento para 3 lojas.", quando: "há 3 dias" },
    { tipo: "Reunião", texto: "Proposta apresentada. Gostou do plano anual.", quando: "ontem" },
  ];

  return (
    <div className={styles.ficha}>
      <div className={`${styles.cabecaFicha} ${styles.anima}`} style={{ "--i": 0 }}>
        <div>
          <strong>Marta Silva</strong>
          <small>marta@exemplo.pt · 912 345 678</small>
        </div>
        <span className={styles.estado} style={{ "--cor": ESTADOS.negociacao.cor }}>
          Em negociação
        </span>
      </div>

      <div className={styles.colunasFicha}>
        <div className={`${styles.cartao} ${styles.dados} ${styles.anima}`} style={{ "--i": 1 }}>
          <small>Responsável</small>
          <span>Rui Pereira</span>
          <small>Valor previsto</small>
          <span>2 400 €</span>
          <small>Origem</small>
          <span>Formulário do site</span>
        </div>

        <div className={styles.linhaTempo}>
          {historico.map((h, i) => (
            <div key={h.tipo} className={`${styles.evento} ${styles.anima}`} style={{ "--i": i + 2 }}>
              <span className={styles.ponto}></span>
              <div>
                <small>
                  {h.tipo} · {h.quando}
                </small>
                <p>{h.texto}</p>
              </div>
            </div>
          ))}
          {/* nota a ser escrita "agora" */}
          <div className={`${styles.novaNota} ${styles.anima}`} style={{ "--i": 5 }}>
            <span className={styles.escrito}>Enviar contrato até sexta.</span>
            <span className={styles.botaoFalso}>Guardar nota</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EcraPipeline() {
  // a cliente "Marta Silva" começa em "Novo" e desliza para "Em negociação"
  const colunas = [
    { estado: "novo", cartoes: [{ nome: "Padaria Central", valor: "1 200 €" }, { nome: "Marta Silva", valor: "2 400 €", move: true }] },
    { estado: "negociacao", cartoes: [{ nome: "Oficina Lopes", valor: "3 500 €" }] },
    { estado: "ativo", cartoes: [{ nome: "Studio Mar", valor: "2 800 €" }, { nome: "Café Ribeira", valor: "650 €" }] },
    { estado: "perdido", cartoes: [{ nome: "Clínica Sol", valor: "900 €" }] },
  ];

  return (
    <>
      <div className={`${styles.topo} ${styles.anima}`} style={{ "--i": 0 }}>
        <div>
          <small>48 k€ em negociação</small>
          <strong>Pipeline</strong>
        </div>
      </div>

      <div className={styles.pipeline}>
        {colunas.map((col, i) => (
          <div key={col.estado} className={`${styles.coluna} ${styles.anima}`} style={{ "--i": i + 1 }}>
            <div className={styles.tituloColuna}>
              <span style={{ background: ESTADOS[col.estado].cor }}></span>
              {ESTADOS[col.estado].texto}
            </div>
            {col.cartoes.map((c) => (
              <div key={c.nome} className={c.move ? `${styles.negocio} ${styles.aMover}` : styles.negocio}>
                <strong>{c.nome}</strong>
                <small>{c.valor}</small>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function EcraTarefas() {
  const tarefas = [
    { titulo: "Ligar à Marta Silva", cliente: "Marta Silva", data: "Hoje", feita: true },
    { titulo: "Enviar proposta revista", cliente: "Oficina Lopes", data: "Hoje", feita: true },
    { titulo: "Reunião de apresentação", cliente: "Padaria Central", data: "Amanhã" },
    { titulo: "Pedir feedback do serviço", cliente: "Studio Mar", data: "Sexta" },
  ];

  return (
    <>
      <div className={`${styles.topo} ${styles.anima}`} style={{ "--i": 0 }}>
        <div>
          <small>2 para hoje</small>
          <strong>Tarefas</strong>
        </div>
        <span className={styles.botaoFalso}>+ Nova tarefa</span>
      </div>

      <div className={styles.tarefas}>
        {tarefas.map((t, i) => (
          <div
            key={t.titulo}
            className={t.feita ? `${styles.tarefa} ${styles.feita} ${styles.anima}` : `${styles.tarefa} ${styles.anima}`}
            style={{ "--i": i + 1, "--visto": `${0.55 + i * 0.35}s` }}
          >
            <span className={styles.caixa}></span>
            <div>
              <strong>{t.titulo}</strong>
              <small>{t.cliente}</small>
            </div>
            <span className={styles.data}>{t.data}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// Página 6: Configurações. O gráfico da direita vai trocando sozinho entre Barras, Linha e
// Área, e a opção escolhida à esquerda acompanha-o (as duas animações têm o mesmo tempo).
function EcraPersonalizar() {
  const semanas = [3, 5, 4, 7, 6, 9, 8, 11]; // leads novos em cada semana (inventado)
  const maximo = 12;
  // pontos da linha, num desenho de 300 x 100
  const pontos = semanas.map((n, i) => `${(i / (semanas.length - 1)) * 300} ${100 - (n / maximo) * 100}`);
  const linha = `M${pontos.join(" L")}`;
  const area = `${linha} L300 100 L0 100 Z`;
  const tipos = ["Barras", "Linha", "Área"];

  return (
    <>
      <div className={`${styles.topo} ${styles.anima}`} style={{ "--i": 0 }}>
        <div>
          <small>Aparência</small>
          <strong>Configurações</strong>
        </div>
        <span className={styles.botaoFalso}>Guardar</span>
      </div>

      <div className={styles.personalizar}>
        <div className={`${styles.cartao} ${styles.opcoes} ${styles.anima}`} style={{ "--i": 1 }}>
          <small>Gráfico na Visão geral</small>
          <div className={styles.listaOpcoes}>
            {tipos.map((t, k) => (
              <span key={t} className={k === 0 ? `${styles.opcao} ${styles.primeiro}` : styles.opcao} style={{ "--k": k }}>
                {t}
              </span>
            ))}
          </div>

          <small className={styles.extraOpcao}>Aspeto</small>
          <div className={`${styles.modos} ${styles.extraOpcao}`}>
            <span className={styles.modoAtivo}>Escuro</span>
            <span>Claro</span>
          </div>

          <small className={styles.extraOpcao}>Nome no menu</small>
          <span className={`${styles.campoFalso} ${styles.extraOpcao}`}>
            <span className={styles.escrito}>Contactos</span>
          </span>
        </div>

        <div className={`${styles.cartao} ${styles.anima}`} style={{ "--i": 2 }}>
          <small>Leads novos por semana</small>
          <div className={styles.previsao}>
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" className={`${styles.ciclo} ${styles.primeiro}`} style={{ "--k": 0 }}>
              {semanas.map((n, i) => (
                <rect
                  key={i}
                  x={i * 37.5 + 6}
                  y={100 - (n / maximo) * 100}
                  width="25.5"
                  height={(n / maximo) * 100}
                  rx="3"
                  className={styles.barraPrevisao}
                />
              ))}
            </svg>
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" className={styles.ciclo} style={{ "--k": 1 }}>
              <path d={linha} className={styles.linhaPrevisao} />
            </svg>
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" className={styles.ciclo} style={{ "--k": 2 }}>
              <path d={area} className={styles.areaPrevisao} />
              <path d={linha} className={styles.linhaPrevisao} />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}
