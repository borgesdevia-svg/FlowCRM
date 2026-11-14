"use client";
// Editor das perguntas extra do formulário público.
// À esquerda: a lista de perguntas (texto, tipo, opções, obrigatória, mudar de ordem, apagar).
// À direita: como o visitante vai ver o formulário, atualizado enquanto se escreve.
// Só grava quando se carrega em "Guardar formulário" (Server Action guardarPerguntas).

import { useState, useTransition } from "react";
import { guardarPerguntas } from "@/lib/acoes/empresa";
import Icone from "@/components/Icone";
import styles from "./Personalizar.module.css";

const MAX = 10;
const TIPOS = [
  { valor: "texto", texto: "Resposta curta" },
  { valor: "texto_longo", texto: "Resposta longa" },
  { valor: "escolha", texto: "Escolha entre opções" },
];

// versão "limpa" de cada pergunta, sempre com as chaves pela mesma ordem
// (serve para enviar ao servidor e para saber se há alterações por guardar)
function limpar(lista) {
  return lista.map((p) => ({
    id: p.id,
    texto: p.texto,
    tipo: p.tipo,
    obrigatoria: Boolean(p.obrigatoria),
    ...(p.tipo === "escolha" ? { opcoes: p.opcoes ?? [] } : {}),
  }));
}

function novaPergunta() {
  return { id: crypto.randomUUID(), texto: "", tipo: "texto", obrigatoria: false, opcoes: ["", ""] };
}

export default function EditorPerguntas({ inicial, nomeEmpresa, logo }) {
  // as opções vivem sempre na pergunta (mesmo nas que não são de escolha), para não se perderem ao mudar o tipo
  const [perguntas, setPerguntas] = useState(() => inicial.map((p) => ({ ...p, opcoes: p.opcoes ?? ["", ""] })));
  const [guardado, setGuardado] = useState(() => JSON.stringify(limpar(inicial)));
  const [mensagem, setMensagem] = useState(null); // { tipo: "erro" | "sucesso", texto }
  const [aGuardar, iniciar] = useTransition();

  // há alterações por guardar? (compara com a última versão guardada)
  const paraGuardar = limpar(perguntas);
  const alterado = JSON.stringify(paraGuardar) !== guardado;

  function mudar(id, campos) {
    setMensagem(null);
    setPerguntas((lista) => lista.map((p) => (p.id === id ? { ...p, ...campos } : p)));
  }

  function mover(indice, passo) {
    setMensagem(null);
    setPerguntas((lista) => {
      const nova = [...lista];
      const [p] = nova.splice(indice, 1);
      nova.splice(indice + passo, 0, p);
      return nova;
    });
  }

  function apagar(id) {
    setMensagem(null);
    setPerguntas((lista) => lista.filter((p) => p.id !== id));
  }

  function adicionar() {
    setMensagem(null);
    setPerguntas((lista) => [...lista, novaPergunta()]);
  }

  function guardar() {
    iniciar(async () => {
      const resposta = await guardarPerguntas(paraGuardar);
      if (resposta?.erro) return setMensagem({ tipo: "erro", texto: resposta.erro });
      setGuardado(JSON.stringify(limpar(resposta.perguntas)));
      setPerguntas(resposta.perguntas.map((p) => ({ ...p, opcoes: p.opcoes ?? ["", ""] })));
      setMensagem({ tipo: "sucesso", texto: resposta.sucesso });
    });
  }

  return (
    <div className={styles.editor}>
      <div className={styles.colunaEditor}>
        {perguntas.length === 0 && (
          <p className={styles.semPerguntas}>
            Ainda não tens perguntas extra. Por exemplo: “Que serviço procura?” ou “Qual é o seu orçamento?”.
          </p>
        )}

        <ol className={styles.perguntas}>
          {perguntas.map((p, i) => (
            <li key={p.id} className={styles.pergunta}>
              <div className={styles.topoPergunta}>
                <span className={styles.numero}>Pergunta {i + 1}</span>
                <div className={styles.botoesPergunta}>
                  <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir a pergunta ${i + 1}`}>
                    <Icone nome="cima" tamanho={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    disabled={i === perguntas.length - 1}
                    aria-label={`Descer a pergunta ${i + 1}`}
                  >
                    <Icone nome="baixo" tamanho={16} />
                  </button>
                  <button type="button" onClick={() => apagar(p.id)} aria-label={`Apagar a pergunta ${i + 1}`} className={styles.apagarPergunta}>
                    <Icone nome="lixo" tamanho={16} />
                  </button>
                </div>
              </div>

              <div className="campo">
                <label htmlFor={`texto-${p.id}`} className="so-leitores">
                  Texto da pergunta {i + 1}
                </label>
                <input
                  id={`texto-${p.id}`}
                  value={p.texto}
                  maxLength={200}
                  placeholder="Escreve a pergunta"
                  onChange={(e) => mudar(p.id, { texto: e.target.value })}
                />
              </div>

              <div className={styles.linhaTipo}>
                <div className="campo">
                  <label htmlFor={`tipo-${p.id}`} className="so-leitores">
                    Tipo de resposta
                  </label>
                  <select id={`tipo-${p.id}`} value={p.tipo} onChange={(e) => mudar(p.id, { tipo: e.target.value })}>
                    {TIPOS.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.texto}
                      </option>
                    ))}
                  </select>
                </div>

                {/* interruptor "Obrigatória", como os da Apple */}
                <label className={styles.interruptor}>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={p.obrigatoria}
                    onChange={(e) => mudar(p.id, { obrigatoria: e.target.checked })}
                  />
                  <span aria-hidden="true"></span>
                  Obrigatória
                </label>
              </div>

              {p.tipo === "escolha" && (
                <div className={styles.opcoes}>
                  {p.opcoes.map((o, j) => (
                    <div key={j} className={styles.opcao}>
                      <span className={styles.bolinha} aria-hidden="true"></span>
                      <input
                        value={o}
                        maxLength={100}
                        placeholder={`Opção ${j + 1}`}
                        aria-label={`Opção ${j + 1} da pergunta ${i + 1}`}
                        onChange={(e) => mudar(p.id, { opcoes: p.opcoes.map((x, k) => (k === j ? e.target.value : x)) })}
                      />
                      {p.opcoes.length > 2 && (
                        <button
                          type="button"
                          className={styles.tirarOpcao}
                          aria-label={`Tirar a opção ${j + 1}`}
                          onClick={() => mudar(p.id, { opcoes: p.opcoes.filter((_, k) => k !== j) })}
                        >
                          <Icone nome="cruz" tamanho={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {p.opcoes.length < 12 && (
                    <button type="button" className={styles.botaoTexto} onClick={() => mudar(p.id, { opcoes: [...p.opcoes, ""] })}>
                      <Icone nome="mais" tamanho={14} /> Juntar opção
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>

        {perguntas.length < MAX ? (
          <button type="button" className={styles.adicionar} onClick={adicionar}>
            <Icone nome="mais" tamanho={16} /> Juntar pergunta
          </button>
        ) : (
          <p className={styles.semPerguntas}>Chegaste ao máximo de {MAX} perguntas.</p>
        )}

        {/* barra de guardar: fica presa em baixo enquanto há alterações */}
        <div className={alterado ? `${styles.guardar} ${styles.guardarAtivo}` : styles.guardar}>
          {mensagem ? (
            <p role={mensagem.tipo === "erro" ? "alert" : "status"} className={mensagem.tipo === "erro" ? styles.erro : styles.ok}>
              {mensagem.texto}
            </p>
          ) : (
            <p>{alterado ? "Tens alterações por guardar." : "Está tudo guardado."}</p>
          )}
          <button type="button" className="botao" onClick={guardar} disabled={!alterado || aGuardar}>
            {aGuardar ? "A guardar…" : "Guardar formulário"}
          </button>
        </div>
      </div>

      {/* pré-visualização: o que o visitante vê */}
      <aside className={styles.previa} aria-label="Pré-visualização do formulário">
        <p className={styles.tituloPrevia}>Como o visitante vê</p>
        <div className={styles.cartaoPrevia} inert>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className={styles.logoPrevia} />
          ) : (
            <span className={styles.inicialPrevia}>{nomeEmpresa[0].toUpperCase()}</span>
          )}
          <strong className={styles.nomePrevia}>{nomeEmpresa}</strong>
          <div className={styles.camposPrevia}>
            <CampoPrevia texto="Nome" />
            <CampoPrevia texto="Email" />
            <CampoPrevia texto="Telefone (opcional)" />
            {perguntas.map((p) => (
              <CampoPrevia
                key={p.id}
                texto={(p.texto.trim() || "Pergunta sem texto") + (p.obrigatoria ? "" : " (opcional)")}
                tipo={p.tipo}
                opcoes={p.opcoes.filter((o) => o.trim())}
              />
            ))}
          </div>
          <span className={styles.botaoPrevia}>Enviar pedido de contacto</span>
        </div>
      </aside>
    </div>
  );
}

function CampoPrevia({ texto, tipo = "texto", opcoes = [] }) {
  return (
    <div className={styles.campoPrevia}>
      <span>{texto}</span>
      {tipo === "escolha" ? (
        <div className={styles.opcoesPrevia}>
          {(opcoes.length ? opcoes : ["Opção 1", "Opção 2"]).map((o, i) => (
            <span key={i}>
              <i aria-hidden="true"></i>
              {o}
            </span>
          ))}
        </div>
      ) : (
        <div className={tipo === "texto_longo" ? styles.caixaLonga : styles.caixa}></div>
      )}
    </div>
  );
}
