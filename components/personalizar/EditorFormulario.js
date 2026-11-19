"use client";
// Editor do formulário público (página Personalizar), a toda a largura:
//  - à esquerda, três separadores: Marca · Perguntas · Depois de enviar;
//  - à direita, o formulário tal como o cliente o vê, atualizado enquanto se mexe
//    (usa os MESMOS componentes da página pública: CartaoFormulario e FormLead).
// Só grava quando se carrega em "Guardar" (Server Action guardarFormulario).
// O logótipo é a exceção: grava logo ao escolher (FormLogo).

import { useEffect, useState, useTransition } from "react";
import { guardarFormulario } from "@/lib/acoes/empresa";
import {
  LIMITES,
  MAX_OPCOES,
  MAX_PERGUNTAS,
  MODELOS,
  TEXTOS_PADRAO,
  TIPOS,
  TIPOS_COM_OPCOES,
} from "@/lib/formulario";
import CartaoFormulario from "@/components/formulario/CartaoFormulario";
import FormLead from "@/components/formulario/FormLead";
import FormLogo from "./FormLogo";
import Icone from "@/components/Icone";
import estilosPerguntas from "./Personalizar.module.css";
import styles from "./EditorFormulario.module.css";

const SEPARADORES = [
  { chave: "marca", texto: "Marca" },
  { chave: "perguntas", texto: "Perguntas" },
  { chave: "depois", texto: "Depois de enviar" },
];

// as opções vivem sempre na pergunta (mesmo nas que não são de escolha),
// para não se perderem ao mudar o tipo; a ajuda é sempre um texto
function prepararPergunta(p) {
  return { ...p, ajuda: p.ajuda ?? "", opcoes: p.opcoes?.length ? p.opcoes : ["", ""] };
}

function preparar(dados) {
  return {
    marca: { ...dados.marca },
    perguntas: dados.perguntas.map(prepararPergunta),
    depois: { ...dados.depois },
  };
}

// versão "limpa", sempre com as chaves pela mesma ordem: é a que se envia ao
// servidor e a que se compara para saber se há alterações por guardar
function limpar(dados) {
  return {
    marca: { cor: dados.marca.cor, titulo: dados.marca.titulo.trim(), texto: dados.marca.texto.trim() },
    perguntas: dados.perguntas.map((p) => ({
      id: p.id,
      texto: p.texto,
      tipo: p.tipo,
      obrigatoria: Boolean(p.obrigatoria),
      ajuda: p.ajuda.trim(),
      ...(TIPOS_COM_OPCOES.includes(p.tipo) ? { opcoes: p.opcoes } : {}),
    })),
    depois: {
      mensagem: dados.depois.mensagem.trim(),
      botaoTexto: dados.depois.botaoTexto.trim(),
      botaoLink: dados.depois.botaoLink.trim(),
    },
  };
}

function novaPergunta() {
  return { id: crypto.randomUUID(), texto: "", tipo: "texto", obrigatoria: false, ajuda: "", opcoes: ["", ""] };
}

// perguntas de um modelo, com ids novos
function perguntasDoModelo(modelo) {
  return modelo.perguntas.map((p) => prepararPergunta({ ...p, id: crypto.randomUUID() }));
}

export default function EditorFormulario({ inicial, nomeEmpresa, logo }) {
  const [dados, setDados] = useState(() => preparar(inicial));
  const [guardado, setGuardado] = useState(() => JSON.stringify(limpar(preparar(inicial))));
  const [separador, setSeparador] = useState("marca");
  const [mensagem, setMensagem] = useState(null); // { tipo: "erro" | "sucesso", texto }
  const [modeloPendente, setModeloPendente] = useState(null); // modelo à espera de "Substituir / Juntar"
  const [aGuardar, iniciar] = useTransition();

  const paraGuardar = limpar(dados);
  const alterado = JSON.stringify(paraGuardar) !== guardado;

  // aviso do browser ao sair da página com alterações por guardar
  useEffect(() => {
    if (!alterado) return;
    const avisar = (e) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterado]);

  // ---------- mudar os dados ----------
  function mudarMarca(campos) {
    setMensagem(null);
    setDados((d) => ({ ...d, marca: { ...d.marca, ...campos } }));
  }
  function mudarDepois(campos) {
    setMensagem(null);
    setDados((d) => ({ ...d, depois: { ...d.depois, ...campos } }));
  }
  function mudarPerguntas(funcao) {
    setMensagem(null);
    setDados((d) => ({ ...d, perguntas: funcao(d.perguntas) }));
  }
  const mudarPergunta = (id, campos) => mudarPerguntas((lista) => lista.map((p) => (p.id === id ? { ...p, ...campos } : p)));

  function mover(indice, passo) {
    mudarPerguntas((lista) => {
      const nova = [...lista];
      const [p] = nova.splice(indice, 1);
      nova.splice(indice + passo, 0, p);
      return nova;
    });
  }

  // ---------- modelos ----------
  function escolherModelo(modelo) {
    if (dados.perguntas.length === 0) return aplicarModelo(modelo, "substituir");
    setModeloPendente(modelo); // já há perguntas: pergunta primeiro o que fazer
  }

  function aplicarModelo(modelo, modo) {
    const novas = perguntasDoModelo(modelo);
    mudarPerguntas((lista) => (modo === "juntar" ? [...lista, ...novas].slice(0, MAX_PERGUNTAS) : novas));
    // o título do modelo só entra se ainda não houver um escrito
    if (!dados.marca.titulo.trim()) mudarMarca({ titulo: modelo.titulo });
    if (modo === "juntar" && dados.perguntas.length + novas.length > MAX_PERGUNTAS) {
      setMensagem({ tipo: "erro", texto: `Só cabem ${MAX_PERGUNTAS} perguntas: as últimas do modelo ficaram de fora.` });
    }
    setModeloPendente(null);
  }

  // ---------- guardar / descartar ----------
  function guardar() {
    iniciar(async () => {
      const resposta = await guardarFormulario(paraGuardar);
      if (resposta?.erro) return setMensagem({ tipo: "erro", texto: resposta.erro });
      const novo = preparar(resposta.guardado);
      setDados(novo);
      setGuardado(JSON.stringify(limpar(novo)));
      setMensagem({ tipo: "sucesso", texto: resposta.sucesso });
    });
  }

  function descartar() {
    setDados(preparar(JSON.parse(guardado)));
    setMensagem(null);
    setModeloPendente(null);
  }

  return (
    <div className={styles.editor}>
      {/* ================= coluna das opções ================= */}
      <div className={styles.colunaOpcoes}>
        <div className={styles.separadores} role="tablist" aria-label="Partes do formulário">
          {SEPARADORES.map((s) => (
            <button
              key={s.chave}
              type="button"
              role="tab"
              id={`sep-${s.chave}`}
              aria-selected={separador === s.chave}
              aria-controls={`painel-${s.chave}`}
              className={separador === s.chave ? styles.separadorAtivo : styles.separador}
              onClick={() => setSeparador(s.chave)}
            >
              {s.texto}
              {s.chave === "perguntas" && <span className={styles.contagem}>{dados.perguntas.length}</span>}
            </button>
          ))}
        </div>

        <div className={styles.painel} role="tabpanel" id={`painel-${separador}`} aria-labelledby={`sep-${separador}`}>
          {/* ---------- Marca ---------- */}
          {separador === "marca" && (
            <>
              <section className={styles.seccao}>
                <h2>Logótipo</h2>
                <p className={styles.explicacao}>
                  Aparece em destaque no topo do formulário e no menu do CRM. PNG, JPG ou WebP, até 1 MB. Fica guardado
                  logo que o escolhes.
                </p>
                <FormLogo logoAtual={logo} nomeEmpresa={nomeEmpresa} />
              </section>

              <section className={styles.seccao}>
                <h2>Textos de entrada</h2>
                <div className="campo">
                  <label htmlFor="form-titulo">Título</label>
                  <input
                    id="form-titulo"
                    value={dados.marca.titulo}
                    maxLength={LIMITES.titulo}
                    placeholder={TEXTOS_PADRAO.titulo}
                    onChange={(e) => mudarMarca({ titulo: e.target.value })}
                  />
                </div>
                <div className="campo">
                  <label htmlFor="form-texto">Texto por baixo do título</label>
                  <textarea
                    id="form-texto"
                    rows={3}
                    value={dados.marca.texto}
                    maxLength={LIMITES.texto}
                    placeholder={TEXTOS_PADRAO.texto}
                    onChange={(e) => mudarMarca({ texto: e.target.value })}
                  />
                  <small className={styles.contador}>
                    {dados.marca.texto.length}/{LIMITES.texto} · vazio usa o texto que aparece a cinzento
                  </small>
                </div>
              </section>
            </>
          )}

          {/* ---------- Perguntas ---------- */}
          {separador === "perguntas" && (
            <>
              <section className={styles.seccao}>
                <h2>Começar de um modelo</h2>
                <p className={styles.explicacao}>Perguntas já feitas para o teu tipo de negócio. Depois podes mudar tudo.</p>
                <div className={styles.modelos}>
                  {MODELOS.map((m) => (
                    <button key={m.chave} type="button" className={styles.modelo} onClick={() => escolherModelo(m)}>
                      <strong>{m.nome}</strong>
                      <small>{m.perguntas.length} perguntas</small>
                    </button>
                  ))}
                </div>

                {/* já havia perguntas: o que fazer com as do modelo? */}
                {modeloPendente && (
                  <div className={styles.confirmarModelo} role="alertdialog" aria-labelledby="confirmar-modelo">
                    <p id="confirmar-modelo">
                      Já tens {dados.perguntas.length} {dados.perguntas.length === 1 ? "pergunta" : "perguntas"}. O que
                      fazemos com as do modelo <strong>{modeloPendente.nome}</strong>?
                    </p>
                    <div className={styles.botoesModelo}>
                      <button type="button" className="botao" onClick={() => aplicarModelo(modeloPendente, "substituir")}>
                        Substituir as minhas
                      </button>
                      <button
                        type="button"
                        className="botao botao-secundario"
                        onClick={() => aplicarModelo(modeloPendente, "juntar")}
                      >
                        Juntar às minhas
                      </button>
                      <button type="button" className={styles.cancelar} onClick={() => setModeloPendente(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section className={styles.seccao}>
                <h2>As tuas perguntas</h2>
                <p className={styles.explicacao}>
                  Nome, email e telefone estão sempre no formulário. Junta até {MAX_PERGUNTAS} perguntas tuas: as
                  respostas aparecem na ficha do cliente.
                </p>

                {dados.perguntas.length === 0 && (
                  <p className={estilosPerguntas.semPerguntas}>
                    Ainda não tens perguntas. Escolhe um modelo em cima ou junta a primeira.
                  </p>
                )}

                <ol className={estilosPerguntas.perguntas}>
                  {dados.perguntas.map((p, i) => (
                    <EditorPergunta
                      key={p.id}
                      pergunta={p}
                      indice={i}
                      total={dados.perguntas.length}
                      mudar={(campos) => mudarPergunta(p.id, campos)}
                      mover={(passo) => mover(i, passo)}
                      apagar={() => mudarPerguntas((lista) => lista.filter((x) => x.id !== p.id))}
                    />
                  ))}
                </ol>

                {dados.perguntas.length < MAX_PERGUNTAS ? (
                  <button
                    type="button"
                    className={estilosPerguntas.adicionar}
                    onClick={() => mudarPerguntas((lista) => [...lista, novaPergunta()])}
                  >
                    <Icone nome="mais" tamanho={16} /> Juntar pergunta
                  </button>
                ) : (
                  <p className={estilosPerguntas.semPerguntas}>Chegaste ao máximo de {MAX_PERGUNTAS} perguntas.</p>
                )}
              </section>
            </>
          )}

          {/* ---------- Depois de enviar ---------- */}
          {separador === "depois" && (
            <>
              <section className={styles.seccao}>
                <h2>Mensagem</h2>
                <p className={styles.explicacao}>O que o cliente lê depois de carregar em Enviar.</p>
                <div className="campo">
                  <label htmlFor="obrigado-texto" className="so-leitores">
                    Mensagem depois de enviar
                  </label>
                  <textarea
                    id="obrigado-texto"
                    rows={3}
                    value={dados.depois.mensagem}
                    maxLength={LIMITES.obrigado}
                    placeholder={TEXTOS_PADRAO.obrigado(nomeEmpresa)}
                    onChange={(e) => mudarDepois({ mensagem: e.target.value })}
                  />
                  <small className={styles.contador}>
                    {dados.depois.mensagem.length}/{LIMITES.obrigado} · ex.: “Obrigado! Ligamos-te hoje até às 18h.”
                  </small>
                </div>
              </section>

              <section className={styles.seccao}>
                <h2>Botão (opcional)</h2>
                <p className={styles.explicacao}>
                  Leva o cliente para o teu site, Instagram ou WhatsApp. Deixa os dois campos vazios para não mostrar.
                </p>
                <div className={styles.linhaBotao}>
                  <div className="campo">
                    <label htmlFor="obrigado-botao">Texto do botão</label>
                    <input
                      id="obrigado-botao"
                      value={dados.depois.botaoTexto}
                      maxLength={LIMITES.botaoTexto}
                      placeholder="Ver o nosso Instagram"
                      onChange={(e) => mudarDepois({ botaoTexto: e.target.value })}
                    />
                  </div>
                  <div className="campo">
                    <label htmlFor="obrigado-link">Link</label>
                    <input
                      id="obrigado-link"
                      type="url"
                      inputMode="url"
                      value={dados.depois.botaoLink}
                      maxLength={LIMITES.botaoLink}
                      placeholder="https://instagram.com/a-tua-empresa"
                      onChange={(e) => mudarDepois({ botaoLink: e.target.value })}
                    />
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* ================= pré-visualização ================= */}
      <aside className={styles.previa} aria-label="Pré-visualização do formulário">
        <p className={styles.tituloPrevia}>
          {separador === "depois" ? "O que o cliente vê depois de enviar" : "Como o cliente vê o formulário"}
        </p>
        {/* o formulário público é sempre uma folha branca sobre cinzento-claro, como na página real */}
        <div className={styles.moldura}>
          <CartaoFormulario
            nome={nomeEmpresa}
            logo={logo}
            titulo={dados.marca.titulo.trim()}
            texto={dados.marca.texto.trim()}
            className={styles.cartaoPrevia}
          >
            <FormLead
              previa
              mostrarObrigado={separador === "depois"}
              nomeEmpresa={nomeEmpresa}
              perguntas={dados.perguntas.map((p) => ({ ...p, opcoes: p.opcoes.filter((o) => o.trim()) }))}
              obrigado={{
                texto: dados.depois.mensagem.trim(),
                botaoTexto: dados.depois.botaoTexto.trim(),
                botaoLink: dados.depois.botaoLink.trim(),
              }}
            />
          </CartaoFormulario>
        </div>
      </aside>

      {/* ================= barra de guardar ================= */}
      {(alterado || mensagem) && (
        <div className={styles.barraGuardar} role="region" aria-label="Guardar alterações">
          {mensagem ? (
            <p role={mensagem.tipo === "erro" ? "alert" : "status"} className={mensagem.tipo === "erro" ? styles.erro : styles.ok}>
              {mensagem.texto}
            </p>
          ) : (
            <p>Tens alterações por guardar.</p>
          )}
          {alterado && (
            <div className={styles.botoesGuardar}>
              <button type="button" className={styles.cancelar} onClick={descartar} disabled={aGuardar}>
                Descartar
              </button>
              <button type="button" className="botao" onClick={guardar} disabled={aGuardar} aria-busy={aGuardar}>
                {aGuardar ? "A guardar…" : "Guardar"}
              </button>
            </div>
          )}
          {!alterado && (
            <button type="button" className={styles.cancelar} onClick={() => setMensagem(null)} aria-label="Fechar aviso">
              <Icone nome="cruz" tamanho={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- uma pergunta no editor ----------
function EditorPergunta({ pergunta: p, indice: i, total, mudar, mover, apagar }) {
  const comOpcoes = TIPOS_COM_OPCOES.includes(p.tipo);
  const s = estilosPerguntas;
  return (
    <li className={s.pergunta}>
      <div className={s.topoPergunta}>
        <span className={s.numero}>Pergunta {i + 1}</span>
        <div className={s.botoesPergunta}>
          <button type="button" onClick={() => mover(-1)} disabled={i === 0} aria-label={`Subir a pergunta ${i + 1}`}>
            <Icone nome="cima" tamanho={16} />
          </button>
          <button type="button" onClick={() => mover(1)} disabled={i === total - 1} aria-label={`Descer a pergunta ${i + 1}`}>
            <Icone nome="baixo" tamanho={16} />
          </button>
          <button type="button" onClick={apagar} aria-label={`Apagar a pergunta ${i + 1}`} className={s.apagarPergunta}>
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
          onChange={(e) => mudar({ texto: e.target.value })}
        />
      </div>

      <div className={s.linhaTipo}>
        <div className="campo">
          <label htmlFor={`tipo-${p.id}`} className="so-leitores">
            Tipo de resposta
          </label>
          <select id={`tipo-${p.id}`} value={p.tipo} onChange={(e) => mudar({ tipo: e.target.value })}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
          </select>
        </div>

        {/* interruptor "Obrigatória", como os da Apple */}
        <label className={s.interruptor}>
          <input type="checkbox" role="switch" checked={p.obrigatoria} onChange={(e) => mudar({ obrigatoria: e.target.checked })} />
          <span aria-hidden="true"></span>
          Obrigatória
        </label>
      </div>

      {comOpcoes && (
        <div className={s.opcoes}>
          {p.opcoes.map((o, j) => (
            <div key={j} className={s.opcao}>
              {/* bolinha (uma escolha), quadrado (várias) ou número (lista) */}
              <span
                className={`${s.bolinha} ${p.tipo === "varias" ? styles.quadrado : ""} ${p.tipo === "lista" ? styles.semMarca : ""}`}
                aria-hidden="true"
              ></span>
              <input
                value={o}
                maxLength={100}
                placeholder={`Opção ${j + 1}`}
                aria-label={`Opção ${j + 1} da pergunta ${i + 1}`}
                onChange={(e) => mudar({ opcoes: p.opcoes.map((x, k) => (k === j ? e.target.value : x)) })}
              />
              {p.opcoes.length > 2 && (
                <button
                  type="button"
                  className={s.tirarOpcao}
                  aria-label={`Tirar a opção ${j + 1}`}
                  onClick={() => mudar({ opcoes: p.opcoes.filter((_, k) => k !== j) })}
                >
                  <Icone nome="cruz" tamanho={14} />
                </button>
              )}
            </div>
          ))}
          {p.opcoes.length < MAX_OPCOES && (
            <button type="button" className={s.botaoTexto} onClick={() => mudar({ opcoes: [...p.opcoes, ""] })}>
              <Icone nome="mais" tamanho={14} /> Juntar opção
            </button>
          )}
        </div>
      )}

      <div className="campo">
        <label htmlFor={`ajuda-${p.id}`} className={styles.etiquetaAjuda}>
          Ajuda (opcional)
        </label>
        <input
          id={`ajuda-${p.id}`}
          value={p.ajuda}
          maxLength={LIMITES.ajuda}
          placeholder="Ex.: Indica o melhor horário para te ligarmos."
          onChange={(e) => mudar({ ajuda: e.target.value })}
        />
      </div>
    </li>
  );
}
