"use client";
// Tutorial de boas-vindas do painel.
//
// Na primeira vez que alguém entra no CRM, o ecrã fica escuro e só uma parte do menu
// fica iluminada, com um cartão ao lado a explicar para que serve (em linguagem simples,
// para quem nunca usou um CRM). "Seguinte" passa para a parte seguinte.
//
// Como funciona:
//  - cada parte do menu que queremos mostrar tem um atributo data-tutorial="nome"
//    (ex.: data-tutorial="clientes"); assim encontramo-la com querySelector;
//  - o "foco" é uma caixa transparente por cima dessa parte, com uma sombra ENORME à volta
//    (box-shadow de 9999px): a sombra é que escurece o resto do ecrã;
//  - quando o tutorial acaba (ou a pessoa o salta), guardamos "tutorial_visto" na conta
//    (user_metadata do Supabase), para não voltar a aparecer, nem noutro computador;
//  - este componente também desenha o botão "Ver tutorial" do menu, para rever quando quiser.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icone from "@/components/Icone";
import { criarClienteBrowser } from "@/lib/supabase/cliente";
import styles from "./Tutorial.module.css";

// espaço à volta da parte iluminada e distância entre ela e o cartão (em píxeis)
const FOLGA = 6;
const DISTANCIA = 14;
const MARGEM = 16; // o cartão nunca fica colado à borda do ecrã

// guardado também no browser: se a gravação na conta falhar, não aparece outra vez já a seguir
const CHAVE_LOCAL = "flowcrm-tutorial-visto";

// Os passos do tutorial. "alvo" = o valor do data-tutorial (null = cartão ao centro).
// "so" = só aparece a administradores ou só a comerciais.
function criarPassos(nome, eAdmin) {
  const primeiroNome = nome?.split(" ")[0] || "";
  return [
    {
      alvo: null,
      titulo: primeiroNome ? `Olá, ${primeiroNome}!` : "Olá!",
      texto:
        "Um CRM é o sítio onde guardas os teus leads e tudo o que tens de fazer com cada um, para nenhum negócio ficar esquecido. Vamos ver as partes principais. Demora menos de um minuto.",
    },
    {
      alvo: "painel",
      titulo: "Painel",
      texto:
        "O resumo do teu dia: quantos leads tens, gráficos com a evolução e o que aconteceu há pouco. É a primeira página que vês quando entras.",
    },
    {
      alvo: "clientes",
      titulo: "Leads",
      texto: eAdmin
        ? "Todas as pessoas e empresas com quem a tua empresa fala: os leads. Um lead é um contacto que pode vir a comprar (ou que já comprou). Abre um lead para veres a ficha: contactos, notas, tudo o que já aconteceu, o botão do WhatsApp e as propostas."
        : "Os leads que te foram entregues. Um lead é um contacto que pode vir a comprar (ou que já comprou). Abre um lead para veres a ficha: contactos, notas, tudo o que já aconteceu, o botão do WhatsApp e as propostas.",
    },
    {
      alvo: "pipeline",
      titulo: "Pipeline",
      texto:
        "O caminho de cada negócio, dividido em fases: Novo, Em negociação, Ativo (negócio fechado) e Perdido. Quando um negócio avança, arrasta o lead para a coluna seguinte.",
    },
    {
      alvo: "tarefas",
      titulo: "Tarefas",
      texto:
        "As coisas que tens de fazer, cada uma com data: ligar a um lead, enviar uma proposta, marcar uma reunião. Se aqui aparecer um número vermelho, tens tarefas em atraso.",
    },
    {
      alvo: "sino",
      titulo: "Avisos",
      texto: eAdmin
        ? "O sino lembra-te das tarefas que acabam hoje, das que já passaram do prazo e dos leads que ainda não têm responsável."
        : "O sino lembra-te das tarefas que acabam hoje e das que já passaram do prazo.",
    },
    {
      alvo: "pesquisa",
      titulo: "Pesquisa",
      texto: "Escreve o nome ou o email de um lead e encontra-lo logo, sem andares à procura na lista.",
    },
    {
      alvo: "formulario",
      titulo: "Formulário público",
      texto: eAdmin
        ? "Um link para pores no site ou nas redes sociais da empresa. Quem o preencher entra sozinho na lista como lead novo, sem teres de escrever nada."
        : "O link que a empresa partilha no site e nas redes sociais. Quem o preenche entra sozinho no CRM como lead novo.",
    },
    {
      alvo: "equipa",
      so: "admin",
      titulo: "Equipa",
      texto:
        "Aqui adicionas as pessoas que vendem contigo. Cada comercial só vê os leads e as tarefas que lhe dás; tu, como administrador, vês tudo.",
    },
    {
      alvo: "automacoes",
      so: "admin",
      titulo: "Automações",
      texto:
        "Trabalho que o CRM faz sozinho: criar a tarefa de contactar cada lead novo, entregar os leads à equipa e lembrar leads esquecidos. Ligas e desligas cada uma.",
    },
    {
      alvo: "relatorios",
      so: "admin",
      titulo: "Relatórios",
      texto:
        "Como vendeu cada pessoa da equipa: leads recebidos, negócios ganhos e perdidos, valor ganho e quanto tempo demora a fechar.",
    },
    {
      alvo: "personalizar",
      so: "admin",
      titulo: "Formulário",
      texto:
        "Escolhe as perguntas do formulário público e, no CRM Pro, o design: disposição, cor, fundo e logótipo da empresa.",
    },
    {
      alvo: "configuracoes",
      so: "admin",
      titulo: "Configurações",
      texto:
        "Muda o aspeto do CRM para toda a equipa: claro ou escuro, o gráfico do Início e o nome e a ordem de cada item deste menu. Também vês aqui o teu plano.",
    },
    {
      alvo: "ajuda",
      titulo: "Já está!",
      texto: "Se te esqueceres de alguma coisa, carrega em “Ver tutorial” e vês isto outra vez.",
    },
  ].filter((p) => !p.so || (p.so === "admin") === eAdmin);
}

export default function Tutorial({ mostrarAoEntrar, nome, eAdmin, className }) {
  const [passos, setPassos] = useState([]); // vazio = tutorial fechado
  const [indice, setIndice] = useState(0);
  const [caixa, setCaixa] = useState(null); // posição da parte iluminada (null = cartão ao centro)
  const [posCartao, setPosCartao] = useState(null);
  const refCartao = useRef(null);
  const refSeguinte = useRef(null);

  const aberto = passos.length > 0;
  const passo = passos[indice];

  // abre o tutorial só com os passos cuja parte existe mesmo no ecrã
  const abrir = useCallback(() => {
    const visiveis = criarPassos(nome, eAdmin).filter(
      (p) => !p.alvo || document.querySelector(`[data-tutorial="${p.alvo}"]`)
    );
    setIndice(0);
    setPassos(visiveis);
  }, [nome, eAdmin]);

  // na primeira entrada, abre sozinho (um pouco depois, para o painel acabar de aparecer)
  useEffect(() => {
    if (!mostrarAoEntrar) return;
    let jaVisto = false;
    try {
      jaVisto = localStorage.getItem(CHAVE_LOCAL) === "1";
    } catch {}
    if (jaVisto) return;
    const t = setTimeout(abrir, 600);
    return () => clearTimeout(t);
  }, [mostrarAoEntrar, abrir]);

  // fechar (no fim ou ao saltar): guarda que já foi visto
  const fechar = useCallback(() => {
    setPassos([]);
    try {
      localStorage.setItem(CHAVE_LOCAL, "1");
    } catch {}
    if (!mostrarAoEntrar) return; // já estava guardado na conta
    const supabase = criarClienteBrowser();
    // updateUser grava na conta; refreshSession pede um token novo, que já leva o
    // "tutorial_visto", para o servidor também o saber logo na próxima página
    supabase.auth
      .updateUser({ data: { tutorial_visto: true } })
      .then(() => supabase.auth.refreshSession())
      .catch(() => {}); // se falhar, fica pelo menos o aviso no browser
  }, [mostrarAoEntrar]);

  // mede onde está a parte a iluminar. Corre ao mudar de passo e quando a página
  // faz scroll ou muda de tamanho (a parte mexe-se, o foco tem de ir atrás).
  useLayoutEffect(() => {
    if (!aberto) return;

    function medir() {
      const el = passo.alvo && document.querySelector(`[data-tutorial="${passo.alvo}"]`);
      if (!el) {
        setCaixa(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setCaixa({
        top: r.top - FOLGA,
        left: r.left - FOLGA,
        width: r.width + FOLGA * 2,
        height: r.height + FOLGA * 2,
      });
    }

    // no telemóvel o menu desliza para o lado: trazemos a parte para dentro do ecrã primeiro
    const el = passo.alvo && document.querySelector(`[data-tutorial="${passo.alvo}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center" });
    medir();

    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true); // true = também o scroll do menu lateral
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [aberto, passo]);

  // decide onde fica o cartão: à direita da parte iluminada se couber;
  // senão por baixo; senão por cima. Sem parte iluminada, fica ao centro.
  useLayoutEffect(() => {
    if (!aberto || !refCartao.current) return;
    const { offsetWidth: w, offsetHeight: h } = refCartao.current;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const prender = (v, min, max) => Math.max(min, Math.min(v, max));

    if (!caixa) {
      setPosCartao({ top: (H - h) / 2, left: (W - w) / 2 });
    } else if (caixa.left + caixa.width + DISTANCIA + w <= W - MARGEM) {
      setPosCartao({
        top: prender(caixa.top, MARGEM, H - h - MARGEM),
        left: caixa.left + caixa.width + DISTANCIA,
      });
    } else if (caixa.top + caixa.height + DISTANCIA + h <= H - MARGEM) {
      setPosCartao({
        top: caixa.top + caixa.height + DISTANCIA,
        left: prender(caixa.left, MARGEM, W - w - MARGEM),
      });
    } else {
      setPosCartao({
        top: Math.max(MARGEM, caixa.top - DISTANCIA - h),
        left: prender(caixa.left, MARGEM, W - w - MARGEM),
      });
    }
  }, [aberto, caixa, indice]);

  // teclado: Esc salta o tutorial, setas andam para a frente e para trás
  useEffect(() => {
    if (!aberto) return;
    function tecla(e) {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowRight") setIndice((i) => Math.min(i + 1, passos.length - 1));
      if (e.key === "ArrowLeft") setIndice((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberto, passos.length, fechar]);

  // o botão "Seguinte" recebe o foco em cada passo (Enter avança logo)
  useEffect(() => {
    if (aberto) refSeguinte.current?.focus({ preventScroll: true });
  }, [aberto, indice]);

  const ultimo = indice === passos.length - 1;

  return (
    <>
      {/* botão do menu para rever o tutorial (é também o último passo) */}
      <button type="button" className={`${className} ${styles.botaoMenu}`} onClick={abrir} data-tutorial="ajuda">
        <Icone nome="pergunta" tamanho={19} />
        <span>Ver tutorial</span>
      </button>

      {aberto &&
        createPortal(
          <div className={styles.camada}>
            {/* apanha os cliques fora do cartão, para não se mexer no painel durante o tutorial */}
            <div className={styles.bloqueio} />

            {/* o foco: a sombra à volta escurece o resto do ecrã */}
            <div
              className={caixa ? styles.foco : `${styles.foco} ${styles.focoCentro}`}
              style={caixa ?? undefined}
              aria-hidden="true"
            />

            <div
              ref={refCartao}
              className={styles.cartao}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tutorial-titulo"
              aria-describedby="tutorial-texto"
              // enquanto não sabemos onde fica, o cartão está invisível (evita um salto)
              style={posCartao ?? { visibility: "hidden" }}
            >
              {/* key: ao mudar de passo, o texto volta a fazer a animação de entrada */}
              <div key={indice} className={styles.conteudo}>
                <p className={styles.contagem}>
                  {indice + 1} de {passos.length}
                </p>
                <h2 id="tutorial-titulo" className={styles.titulo}>
                  {passo.titulo}
                </h2>
                <p id="tutorial-texto" className={styles.texto}>
                  {passo.texto}
                </p>
              </div>

              {/* barra de progresso: um traço por passo */}
              <div className={styles.progresso} aria-hidden="true">
                {passos.map((p, i) => (
                  <span key={p.alvo ?? "inicio"} className={i <= indice ? styles.tracoFeito : styles.traco} />
                ))}
              </div>

              <div className={styles.botoes}>
                {!ultimo && (
                  <button type="button" className={styles.saltar} onClick={fechar}>
                    Saltar
                  </button>
                )}
                <span className={styles.espaco} />
                {indice > 0 && (
                  <button type="button" className="botao botao-secundario" onClick={() => setIndice(indice - 1)}>
                    Anterior
                  </button>
                )}
                <button
                  ref={refSeguinte}
                  type="button"
                  className="botao"
                  onClick={ultimo ? fechar : () => setIndice(indice + 1)}
                >
                  {indice === 0 ? "Começar" : ultimo ? "Terminar" : "Seguinte"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
