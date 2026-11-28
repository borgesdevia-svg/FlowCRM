"use client";
// Editor do formulário público (página Formulário), em duas colunas:
//  - à esquerda (a coluna larga), a EDIÇÃO: separadores Textos, Perguntas, Design (CRM Pro)
//    e Depois de enviar. Nas Perguntas, cada pergunta é uma linha que se abre ali mesmo
//    para a editar (arrastar ou as setas mudam a ordem); os Modelos prontos abrem-se
//    por cima da lista;
//  - à direita, mais pequena e presa ao ecrã, a pré-visualização: o formulário tal como o
//    lead o vê, em telemóvel ou computador (usa os MESMOS componentes da página pública:
//    CartaoFormulario e FormLead), encolhido para caber na coluna.
// Em ecrãs estreitos a pré-visualização passa para baixo e só abre com "Pré-visualizar".
// Só grava quando se carrega em "Guardar" (Server Action guardarFormulario).

import { useEffect, useRef, useState, useTransition } from "react";
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
import { CORES_DESIGN, DESIGN_PADRAO, MAX_TEXTO_BOTAO, OPCOES_DESIGN, TEXTO_BOTAO_PADRAO, normalizarDesign } from "@/lib/formularioDesign";
import CartaoFormulario, { CenaFormulario } from "@/components/formulario/CartaoFormulario";
import AvisoPro from "@/components/painel/AvisoPro";
import FormLead from "@/components/formulario/FormLead";
import Link from "next/link";
import Icone from "@/components/Icone";
import styles from "./EditorFormulario.module.css";

const nomeTipo = (tipo) => TIPOS.find((t) => t.valor === tipo)?.texto ?? tipo;

// os separadores da coluna de edição
const SEPARADORES = [
  { chave: "textos", texto: "Textos" },
  { chave: "perguntas", texto: "Perguntas" },
  { chave: "design", texto: "Design", pro: true },
  { chave: "depois", texto: "Depois de enviar" },
];

// largura "verdadeira" de cada aparelho na pré-visualização (depois encolhe para caber)
const LARGURA_APARELHO = { telemovel: 390, computador: 1100 };

// as opções vivem sempre na pergunta (mesmo nas que não são de escolha),
// para não se perderem ao mudar o tipo; a ajuda é sempre um texto
function prepararPergunta(p) {
  return { ...p, ajuda: p.ajuda ?? "", opcoes: p.opcoes?.length ? p.opcoes : ["", ""] };
}

function preparar(dados) {
  return {
    marca: { ...dados.marca },
    design: normalizarDesign(dados.design),
    perguntas: dados.perguntas.map(prepararPergunta),
    depois: { ...dados.depois },
  };
}

// versão "limpa", sempre com as chaves pela mesma ordem: é a que se envia ao
// servidor e a que se compara para saber se há alterações por guardar
function limpar(dados) {
  return {
    marca: { cor: dados.marca.cor, titulo: dados.marca.titulo.trim(), texto: dados.marca.texto.trim() },
    design: normalizarDesign(dados.design),
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

export default function EditorFormulario({ inicial, nomeEmpresa, logo, plano, designGuardado = false }) {
  const [dados, setDados] = useState(() => preparar(inicial));
  const [guardado, setGuardado] = useState(() => JSON.stringify(limpar(preparar(inicial))));
  const [separador, setSeparador] = useState("textos"); // o separador aberto na coluna de edição
  const [aberta, setAberta] = useState(null); // id da pergunta aberta para editar (só uma de cada vez)
  const [focar, setFocar] = useState(null); // id da pergunta nova: o cursor vai logo para o texto dela
  const [modelosAbertos, setModelosAbertos] = useState(false);
  const [aparelho, setAparelho] = useState("telemovel"); // pré-visualização: "telemovel" | "computador"
  const [previaAberta, setPreviaAberta] = useState(false); // só conta nos ecrãs estreitos
  const [aArrastar, setAArrastar] = useState(null); // índice da pergunta que está a ser arrastada
  const [mensagem, setMensagem] = useState(null); // { tipo: "erro" | "sucesso", texto }
  const [modeloPendente, setModeloPendente] = useState(null); // modelo à espera de "Substituir / Juntar"
  const [aGuardar, iniciar] = useTransition();
  const refsSeparadores = useRef({});

  const paraGuardar = limpar(dados);
  // igual à página pública: com o Pro, ou com um design feito no Pro (fica mesmo no Essencial)
  const comDesign = plano.pro || designGuardado;
  const designPrevia = comDesign ? dados.design : DESIGN_PADRAO;
  const alterado = JSON.stringify(paraGuardar) !== guardado;
  const total = dados.perguntas.length;

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
  function mudarDesign(campos) {
    setMensagem(null);
    setDados((d) => ({ ...d, design: { ...d.design, ...campos } }));
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

  // tira a pergunta de "de" e põe-na em "para" (setas e arrastar)
  function moverPara(de, para) {
    if (de === null || de === para || para < 0 || para >= total) return;
    mudarPerguntas((lista) => {
      const nova = [...lista];
      const [p] = nova.splice(de, 1);
      nova.splice(para, 0, p);
      return nova;
    });
  }

  function juntarPergunta() {
    const nova = novaPergunta();
    mudarPerguntas((lista) => [...lista, nova]);
    setAberta(nova.id);
    setFocar(nova.id);
  }

  function duplicarPergunta(indice) {
    const copia = { ...dados.perguntas[indice], id: crypto.randomUUID(), opcoes: [...dados.perguntas[indice].opcoes] };
    mudarPerguntas((lista) => [...lista.slice(0, indice + 1), copia, ...lista.slice(indice + 1)]);
    setAberta(copia.id);
    setFocar(copia.id);
  }

  function apagarPergunta(indice) {
    mudarPerguntas((lista) => lista.filter((_, k) => k !== indice));
    setAberta(null);
  }

  // ---------- separadores (com as setas do teclado, como manda a regra dos "tabs") ----------
  function teclaSeparador(evento, i) {
    const passo = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
    let destino = null;
    if (passo) destino = (i + passo + SEPARADORES.length) % SEPARADORES.length;
    if (evento.key === "Home") destino = 0;
    if (evento.key === "End") destino = SEPARADORES.length - 1;
    if (destino === null) return;
    evento.preventDefault();
    const chave = SEPARADORES[destino].chave;
    setSeparador(chave);
    refsSeparadores.current[chave]?.focus();
  }

  // ---------- modelos ----------
  function escolherModelo(modelo) {
    if (total === 0) return aplicarModelo(modelo, "substituir");
    setModeloPendente(modelo); // já há perguntas: pergunta primeiro o que fazer
  }

  function aplicarModelo(modelo, modo) {
    const novas = perguntasDoModelo(modelo);
    mudarPerguntas((lista) => (modo === "juntar" ? [...lista, ...novas].slice(0, MAX_PERGUNTAS) : novas));
    // o título do modelo só entra se ainda não houver um escrito
    if (!dados.marca.titulo.trim()) mudarMarca({ titulo: modelo.titulo });
    if (modo === "juntar" && total + novas.length > MAX_PERGUNTAS) {
      setMensagem({ tipo: "erro", texto: `Só cabem ${MAX_PERGUNTAS} perguntas: as últimas do modelo ficaram de fora.` });
    }
    setModeloPendente(null);
    setModelosAbertos(false);
    setAberta(null);
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
      {/* ================= coluna da edição ================= */}
      <div className={styles.colunaEdicao}>
        <div className={styles.separadores} role="tablist" aria-label="Partes do formulário">
          {SEPARADORES.map((s, i) => (
            <button
              key={s.chave}
              ref={(el) => {
                refsSeparadores.current[s.chave] = el;
              }}
              type="button"
              role="tab"
              id={`sep-${s.chave}`}
              aria-selected={separador === s.chave}
              aria-controls={`painel-${s.chave}`}
              tabIndex={separador === s.chave ? 0 : -1}
              className={styles.separador}
              onClick={() => setSeparador(s.chave)}
              onKeyDown={(e) => teclaSeparador(e, i)}
            >
              {s.texto}
              {s.chave === "perguntas" && <span className={styles.numeroSeparador}>{total}</span>}
              {/* cadeado: esta parte é do CRM Pro */}
              {s.pro && !plano.pro && (
                <>
                  <Icone nome="cadeado" tamanho={13} />
                  <span className="so-leitores">(CRM Pro)</span>
                </>
              )}
            </button>
          ))}
        </div>

        <div className={styles.painel} role="tabpanel" id={`painel-${separador}`} aria-labelledby={`sep-${separador}`}>
          {/* ---------- Textos ---------- */}
          {separador === "textos" && (
            <>
              <section className={styles.seccao}>
                <div className={styles.cabecaSeccao}>
                  <h2>Textos de entrada</h2>
                  <p className={styles.explicacao}>O que o lead lê no topo do formulário, antes das perguntas.</p>
                </div>
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
                    rows={4}
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

              <section className={styles.seccao}>
                <div className={styles.cabecaSeccao}>
                  <h2>Logótipo</h2>
                  <p className={styles.explicacao}>
                    {logo ? "O formulário usa o logótipo da empresa." : "Ainda não há logótipo."} Muda-se em{" "}
                    <Link href="/painel/configuracoes">Configurações</Link>, junto com o do menu do CRM.
                  </p>
                </div>
                {!plano.pro && (
                  <p className={styles.notaPro}>
                    <Icone nome="cadeado" tamanho={14} />
                    {designGuardado
                      ? "O formulário mantém o logótipo e o design que fizeste no CRM Pro."
                      : "No CRM Essencial o logótipo aparece no menu do CRM. No formulário, só com o CRM Pro."}
                  </p>
                )}
              </section>
            </>
          )}

          {/* ---------- Perguntas ---------- */}
          {separador === "perguntas" && (
            <section className={styles.seccao}>
              <div className={styles.topoPerguntas}>
                <div className={styles.cabecaSeccao}>
                  <h2>Perguntas</h2>
                  <p className={styles.explicacao}>
                    {total} de {MAX_PERGUNTAS}. As respostas aparecem na ficha do lead. Arrasta ou usa as setas para
                    mudar a ordem.
                  </p>
                </div>
                <div className={styles.acoesPerguntas}>
                  <button
                    type="button"
                    className="botao botao-secundario"
                    aria-expanded={modelosAbertos}
                    aria-controls="modelos-prontos"
                    onClick={() => {
                      setModelosAbertos((v) => !v);
                      setModeloPendente(null);
                    }}
                  >
                    <Icone nome="documento" tamanho={16} /> Modelos prontos
                  </button>
                  {total < MAX_PERGUNTAS && (
                    <button type="button" className="botao" onClick={juntarPergunta}>
                      <Icone nome="mais" tamanho={16} /> Juntar pergunta
                    </button>
                  )}
                </div>
              </div>

              {/* ---------- Modelos prontos (abrem-se por cima da lista) ---------- */}
              {modelosAbertos && (
                <div id="modelos-prontos" className={styles.caixaModelos}>
                  <div className={styles.topoModelos}>
                    <div>
                      <h3>Começar de um modelo</h3>
                      <p className={styles.explicacao}>Perguntas já feitas para o teu tipo de negócio. Depois podes mudar tudo.</p>
                    </div>
                    <button
                      type="button"
                      className={styles.botaoIcone}
                      aria-label="Fechar os modelos prontos"
                      onClick={() => {
                        setModelosAbertos(false);
                        setModeloPendente(null);
                      }}
                    >
                      <Icone nome="cruz" tamanho={16} />
                    </button>
                  </div>
                  {!plano.pro && (
                    <p className={styles.notaPro}>
                      <Icone nome="cadeado" tamanho={14} /> Os modelos prontos são do CRM Pro. Podes sempre escrever as
                      tuas perguntas.
                    </p>
                  )}
                  <div className={styles.modelos}>
                    {MODELOS.map((m) => (
                      <button
                        key={m.chave}
                        type="button"
                        className={styles.modelo}
                        onClick={() => escolherModelo(m)}
                        disabled={!plano.pro}
                      >
                        <strong>{m.nome}</strong>
                        <small>{m.perguntas.length} perguntas</small>
                      </button>
                    ))}
                  </div>

                  {/* já havia perguntas: o que fazer com as do modelo? */}
                  {modeloPendente && (
                    <div className={styles.confirmarModelo} role="alertdialog" aria-labelledby="confirmar-modelo">
                      <p id="confirmar-modelo">
                        Já tens {total} {total === 1 ? "pergunta" : "perguntas"}. O que fazemos com as do modelo{" "}
                        <strong>{modeloPendente.nome}</strong>?
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
                        <button type="button" className={styles.botaoTexto} onClick={() => setModeloPendente(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* os três campos que estão sempre no formulário (não se mudam) */}
              <p className={styles.camposFixos}>
                <Icone nome="cadeado" tamanho={14} />
                Nome, Email e Telefone aparecem sempre no início do formulário.
              </p>

              {total === 0 ? (
                <p className={styles.semPerguntas}>
                  Ainda não há perguntas tuas. Junta uma ou começa de um modelo pronto.
                </p>
              ) : (
                <ol className={styles.listaPerguntas}>
                  {dados.perguntas.map((p, i) => {
                    const estaAberta = aberta === p.id;
                    return (
                      <li
                        key={p.id}
                        className={`${styles.pergunta} ${estaAberta ? styles.perguntaAberta : ""} ${aArrastar === i ? styles.aArrastar : ""}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          moverPara(aArrastar, i);
                          setAArrastar(null);
                        }}
                      >
                        {/* a linha inteira arrasta-se com o rato; no teclado usam-se as setas ao lado */}
                        <div
                          className={styles.linhaPergunta}
                          draggable
                          onDragStart={() => setAArrastar(i)}
                          onDragEnd={() => setAArrastar(null)}
                        >
                          <span className={styles.pega} title="Arrasta para mudar a ordem" aria-hidden="true">
                            ⋮⋮
                          </span>
                          <button
                            type="button"
                            className={styles.abrirPergunta}
                            aria-expanded={estaAberta}
                            aria-controls={`editar-${p.id}`}
                            onClick={() => setAberta(estaAberta ? null : p.id)}
                          >
                            <span className={styles.numeroPergunta}>{i + 1}.</span>
                            <span className={styles.textoPergunta}>
                              <strong>{p.texto.trim() || <em>Pergunta sem texto</em>}</strong>
                              <small>
                                {nomeTipo(p.tipo)}
                                {p.obrigatoria ? " · Obrigatória" : " · Opcional"}
                              </small>
                            </span>
                            {/* diz o que o clique faz (uma seta aqui confundia-se com as de mudar a ordem) */}
                            <span className={styles.acaoPergunta} aria-hidden="true">
                              {estaAberta ? "Fechar" : "Editar"}
                            </span>
                          </button>
                          <div className={styles.botoesOrdem}>
                            <button
                              type="button"
                              className={styles.botaoIcone}
                              onClick={() => moverPara(i, i - 1)}
                              disabled={i === 0}
                              aria-label={`Subir a pergunta ${i + 1}`}
                            >
                              <Icone nome="cima" tamanho={16} />
                            </button>
                            <button
                              type="button"
                              className={styles.botaoIcone}
                              onClick={() => moverPara(i, i + 1)}
                              disabled={i === total - 1}
                              aria-label={`Descer a pergunta ${i + 1}`}
                            >
                              <Icone nome="baixo" tamanho={16} />
                            </button>
                          </div>
                        </div>

                        {estaAberta && (
                          <EditorPergunta
                            pergunta={p}
                            indice={i}
                            focar={focar === p.id}
                            podeDuplicar={total < MAX_PERGUNTAS}
                            mudar={(campos) => mudarPergunta(p.id, campos)}
                            duplicar={() => duplicarPergunta(i)}
                            apagar={() => apagarPergunta(i)}
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}

              {total >= MAX_PERGUNTAS && (
                <p className={styles.explicacao}>Chegaste ao máximo de {MAX_PERGUNTAS} perguntas.</p>
              )}
            </section>
          )}

          {/* ---------- Design (CRM Pro) ---------- */}
          {separador === "design" && (
            <>
              {!plano.pro && (
                <AvisoPro
                  compacto
                  plano={plano}
                  titulo="O design do formulário é do CRM Pro"
                  texto={
                    designGuardado
                      ? "O formulário público continua com o design que fizeste no Pro. Para o mudares, volta ao CRM Pro."
                      : "Muda a disposição, o sítio do logótipo, a cor, o fundo, os cantos, a letra e o texto do botão."
                  }
                />
              )}
              <fieldset className={styles.grupoDesign} disabled={!plano.pro}>
                <legend className="so-leitores">Design do formulário</legend>
                <section className={styles.seccao}>
                  <h2>Disposição</h2>
                  <div className={styles.disposicoes}>
                    {OPCOES_DESIGN.disposicao.map((o) => (
                      <button
                        key={o.valor}
                        type="button"
                        aria-pressed={dados.design.disposicao === o.valor}
                        className={styles.disposicao}
                        onClick={() => mudarDesign({ disposicao: o.valor })}
                      >
                        <span className={styles.esquema} data-esquema={o.valor} aria-hidden="true">
                          <i></i>
                          <i></i>
                        </span>
                        <strong>{o.nome}</strong>
                        <small>{o.descricao}</small>
                      </button>
                    ))}
                  </div>
                </section>

                <section className={styles.seccao}>
                  <div className={styles.cabecaSeccao}>
                    <h2>Cor da marca</h2>
                    <p className={styles.explicacao}>
                      Pinta o botão e as opções escolhidas. No fundo da página e na disposição dividida, pinta também a
                      página.
                    </p>
                  </div>
                  <div className={styles.cores} role="radiogroup" aria-label="Cor da marca">
                    {CORES_DESIGN.map((c) => (
                      <button
                        key={c.chave}
                        type="button"
                        role="radio"
                        aria-checked={dados.design.cor === c.chave}
                        aria-label={c.nome}
                        title={c.nome}
                        className={styles.amostraCor}
                        style={{ "--amostra": c.cor }}
                        onClick={() => mudarDesign({ cor: c.chave })}
                      />
                    ))}
                  </div>
                </section>

                {/* as escolhas simples, em duas colunas quando há espaço */}
                <div className={styles.grelhaEscolhas}>
                  <EscolhasDesign titulo="Logótipo" chave="logo" valor={dados.design.logo} mudar={mudarDesign} />
                  <EscolhasDesign titulo="Fundo da página" chave="fundo" valor={dados.design.fundo} mudar={mudarDesign} />
                  <EscolhasDesign titulo="Título e texto" chave="alinhamento" valor={dados.design.alinhamento} mudar={mudarDesign} />
                  <EscolhasDesign titulo="Cantos" chave="cantos" valor={dados.design.cantos} mudar={mudarDesign} />
                  <EscolhasDesign titulo="Letra" chave="letra" valor={dados.design.letra} mudar={mudarDesign} />
                </div>

                <section className={styles.seccao}>
                  <h2>Botão de enviar</h2>
                  <div className="campo">
                    <label htmlFor="form-botao">Texto do botão</label>
                    <input
                      id="form-botao"
                      value={dados.design.botao}
                      maxLength={MAX_TEXTO_BOTAO}
                      placeholder={TEXTO_BOTAO_PADRAO}
                      onChange={(e) => mudarDesign({ botao: e.target.value })}
                    />
                    <small className={styles.contador}>
                      {dados.design.botao.length}/{MAX_TEXTO_BOTAO} · vazio usa o texto que aparece a cinzento
                    </small>
                  </div>
                </section>
              </fieldset>
            </>
          )}

          {/* ---------- Depois de enviar ---------- */}
          {separador === "depois" && (
            <>
              <section className={styles.seccao}>
                <div className={styles.cabecaSeccao}>
                  <h2>Mensagem</h2>
                  <p className={styles.explicacao}>O que o lead lê depois de carregar em Enviar.</p>
                </div>
                <div className="campo">
                  <label htmlFor="obrigado-texto">Mensagem depois de enviar</label>
                  <textarea
                    id="obrigado-texto"
                    rows={4}
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
                <div className={styles.cabecaSeccao}>
                  <h2>Botão (opcional)</h2>
                  <p className={styles.explicacao}>
                    Leva o lead para o teu site, Instagram ou WhatsApp. Deixa os dois campos vazios para não mostrar.
                  </p>
                </div>
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

        {/* ================= barra de guardar (presa ao fundo do ecrã, só nesta coluna) ================= */}
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
                <button type="button" className={styles.botaoTexto} onClick={descartar} disabled={aGuardar}>
                  Descartar
                </button>
                <button type="button" className="botao" onClick={guardar} disabled={aGuardar} aria-busy={aGuardar}>
                  {aGuardar ? "A guardar…" : "Guardar"}
                </button>
              </div>
            )}
            {!alterado && (
              <button type="button" className={styles.botaoIcone} onClick={() => setMensagem(null)} aria-label="Fechar aviso">
                <Icone nome="cruz" tamanho={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================= pré-visualização ================= */}
      <aside className={styles.previa} aria-label="Pré-visualização do formulário" data-aberta={previaAberta}>
        <div className={styles.topoPrevia}>
          <div>
            <h2 className={styles.tituloPrevia}>Pré-visualização</h2>
            <p className={styles.subtituloPrevia}>
              {separador === "depois" ? "O que o lead vê depois de enviar" : "Como o lead vê o formulário"}
            </p>
          </div>
          {/* só nos ecrãs estreitos: a pré-visualização fica fechada até se pedir */}
          <button
            type="button"
            className={`botao botao-secundario ${styles.botaoPrevia}`}
            aria-expanded={previaAberta}
            aria-controls="ecra-previa"
            onClick={() => setPreviaAberta((v) => !v)}
          >
            <Icone nome="olho" tamanho={16} /> {previaAberta ? "Esconder" : "Pré-visualizar"}
          </button>
        </div>

        <div className={styles.corpoPrevia} id="ecra-previa">
          <div className={styles.aparelhos} role="radiogroup" aria-label="Tamanho da pré-visualização">
            {[
              { chave: "telemovel", nome: "Telemóvel", icone: "telemovel" },
              { chave: "computador", nome: "Computador", icone: "grelha" },
            ].map((a) => (
              <button
                key={a.chave}
                type="button"
                role="radio"
                aria-checked={aparelho === a.chave}
                className={styles.aparelho}
                onClick={() => setAparelho(a.chave)}
              >
                <Icone nome={a.icone} tamanho={15} /> {a.nome}
              </button>
            ))}
          </div>

          <Ecra aparelho={aparelho}>
            {/* o mesmo fundo e o mesmo design da página real (sem o Pro, o design de sempre) */}
            <CenaFormulario design={designPrevia} className={styles.moldura}>
              <CartaoFormulario
                design={designPrevia}
                nome={nomeEmpresa}
                logo={comDesign ? logo : null}
                titulo={dados.marca.titulo.trim()}
                texto={dados.marca.texto.trim()}
                className={styles.cartaoPrevia}
              >
                <FormLead
                  previa
                  mostrarObrigado={separador === "depois"}
                  nomeEmpresa={nomeEmpresa}
                  textoBotao={designPrevia.botao}
                  perguntas={dados.perguntas.map((p) => ({ ...p, opcoes: p.opcoes.filter((o) => o.trim()) }))}
                  obrigado={{
                    texto: dados.depois.mensagem.trim(),
                    botaoTexto: dados.depois.botaoTexto.trim(),
                    botaoLink: dados.depois.botaoLink.trim(),
                  }}
                />
              </CartaoFormulario>
            </CenaFormulario>
          </Ecra>
        </div>
      </aside>
    </div>
  );
}

// ---------- o "ecrã" da pré-visualização ----------
// O formulário é desenhado com a largura verdadeira do aparelho (390px no telemóvel, 1100px
// no computador) e depois encolhido com "zoom" para caber na coluna. Assim vê-se o formulário
// inteiro, com as proporções certas, sem ocupar o ecrã todo.
function Ecra({ aparelho, children }) {
  const ref = useRef(null);
  const [escala, setEscala] = useState(1);
  const largura = LARGURA_APARELHO[aparelho];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // mede a largura disponível sempre que a coluna muda de tamanho
    const medir = () => setEscala(Math.min(1, el.clientWidth / largura));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [largura]);

  return (
    <div ref={ref} className={styles.ecra} data-aparelho={aparelho}>
      <div className={styles.conteudoEcra} style={{ width: largura, zoom: escala }}>
        {children}
      </div>
    </div>
  );
}

// ---------- os campos de uma pergunta (aparecem quando se abre a pergunta na lista) ----------
function EditorPergunta({ pergunta: p, indice: i, focar, podeDuplicar, mudar, duplicar, apagar }) {
  const comOpcoes = TIPOS_COM_OPCOES.includes(p.tipo);
  const refTexto = useRef(null);

  // pergunta acabada de criar: o cursor vai logo para o texto
  useEffect(() => {
    if (focar) refTexto.current?.focus();
  }, [focar]);

  return (
    <div className={styles.corpoPergunta} id={`editar-${p.id}`}>
      <div className="campo">
        <label htmlFor={`texto-${p.id}`}>Pergunta</label>
        <input
          ref={refTexto}
          id={`texto-${p.id}`}
          value={p.texto}
          maxLength={200}
          placeholder="Escreve a pergunta"
          onChange={(e) => mudar({ texto: e.target.value })}
        />
      </div>

      <div className={styles.linhaTipo}>
        <div className="campo">
          <label htmlFor={`tipo-${p.id}`}>Tipo de resposta</label>
          <select id={`tipo-${p.id}`} value={p.tipo} onChange={(e) => mudar({ tipo: e.target.value })}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
          </select>
        </div>

        {/* interruptor "Obrigatória", como os da Apple */}
        <label className={styles.interruptor}>
          <input type="checkbox" role="switch" checked={p.obrigatoria} onChange={(e) => mudar({ obrigatoria: e.target.checked })} />
          <span aria-hidden="true"></span>
          Obrigatória
        </label>
      </div>

      {comOpcoes && (
        <fieldset className={styles.opcoes}>
          <legend>Opções de resposta</legend>
          {p.opcoes.map((o, j) => (
            <div key={j} className={styles.opcao}>
              {/* bolinha (uma escolha), quadradinho (várias) ou nada (lista) */}
              <span
                className={`${styles.bolinha} ${p.tipo === "varias" ? styles.quadrado : ""} ${p.tipo === "lista" ? styles.semMarca : ""}`}
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
                  className={styles.botaoIcone}
                  aria-label={`Tirar a opção ${j + 1}`}
                  onClick={() => mudar({ opcoes: p.opcoes.filter((_, k) => k !== j) })}
                >
                  <Icone nome="cruz" tamanho={15} />
                </button>
              )}
            </div>
          ))}
          {p.opcoes.length < MAX_OPCOES && (
            <button type="button" className={styles.botaoDestaque} onClick={() => mudar({ opcoes: [...p.opcoes, ""] })}>
              <Icone nome="mais" tamanho={15} /> Juntar opção
            </button>
          )}
        </fieldset>
      )}

      <div className="campo">
        <label htmlFor={`ajuda-${p.id}`}>Ajuda (opcional)</label>
        <input
          id={`ajuda-${p.id}`}
          value={p.ajuda}
          maxLength={LIMITES.ajuda}
          placeholder="Ex.: Indica o melhor horário para te ligarmos."
          onChange={(e) => mudar({ ajuda: e.target.value })}
        />
        <small className={styles.contador}>Aparece em letra pequena por baixo da pergunta.</small>
      </div>

      <div className={styles.rodapePergunta}>
        {podeDuplicar && (
          <button type="button" className={styles.botaoTexto} onClick={duplicar}>
            <Icone nome="copiar" tamanho={15} /> Duplicar
          </button>
        )}
        <button type="button" className={styles.botaoApagar} onClick={apagar}>
          <Icone nome="lixo" tamanho={15} /> Apagar pergunta
        </button>
      </div>
    </div>
  );
}

// ---------- um grupo de escolhas do design (Logótipo, Fundo, Cantos...) ----------
function EscolhasDesign({ titulo, chave, valor, mudar }) {
  return (
    <section className={styles.seccaoEscolhas}>
      <h3 id={`escolha-${chave}`}>{titulo}</h3>
      <div className={styles.escolhas} role="group" aria-labelledby={`escolha-${chave}`}>
        {OPCOES_DESIGN[chave].map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={valor === o.valor}
            className={styles.escolha}
            onClick={() => mudar({ [chave]: o.valor })}
          >
            {o.nome}
          </button>
        ))}
      </div>
    </section>
  );
}
