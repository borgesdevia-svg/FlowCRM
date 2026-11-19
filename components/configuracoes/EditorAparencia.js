"use client";
// Editor da página Configurações (só o administrador):
//   - aspeto claro ou escuro e gráfico do Início;
//   - nome e ordem de cada item do menu lateral.
// Enquanto se mexe, o painel inteiro muda logo de aspeto (pré-visualização ao vivo:
// um <style> com as cores do rascunho por cima das guardadas). Só grava ao carregar
// em "Guardar" (Server Action guardarAparencia); "Descartar" ou sair da página repõe o aspeto guardado.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GRAFICOS,
  MAX_NOME_MENU,
  MENU,
  MODELOS,
  MODOS,
  PADRAO,
  SECCOES_MENU,
  cssAparencia,
  normalizarAparencia,
} from "@/lib/aparencia";
import { guardarAparencia } from "@/lib/acoes/empresa";
import Icone from "@/components/Icone";
import styles from "./EditorAparencia.module.css";

// versão a enviar e a comparar (nomes sem espaços a mais; vazio = nome de origem)
function limpar(a) {
  return normalizarAparencia(a);
}

const base = (seccao, id) => MENU[seccao].find((b) => b.id === id);

export default function EditorAparencia({ inicial }) {
  const router = useRouter();
  const [dados, setDados] = useState(() => normalizarAparencia(inicial));
  const [guardado, setGuardado] = useState(() => JSON.stringify(normalizarAparencia(inicial)));
  const [mensagem, setMensagem] = useState(null); // { tipo: "erro" | "sucesso", texto }
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

  function mudar(campos) {
    setMensagem(null);
    setDados((d) => ({ ...d, ...campos }));
  }

  // ---------- menu ----------
  function mudarMenu(seccao, funcao) {
    setMensagem(null);
    setDados((d) => ({ ...d, menu: { ...d.menu, [seccao]: funcao(d.menu[seccao]) } }));
  }

  function renomear(seccao, id, nome) {
    mudarMenu(seccao, (lista) => lista.map((i) => (i.id === id ? { ...i, nome } : i)));
  }

  function mover(seccao, indice, passo) {
    mudarMenu(seccao, (lista) => {
      const nova = [...lista];
      const [item] = nova.splice(indice, 1);
      nova.splice(indice + passo, 0, item);
      return nova;
    });
  }

  function reporMenu() {
    mudar({ menu: normalizarAparencia({}).menu });
  }

  function reporTudo() {
    setMensagem(null);
    setDados(normalizarAparencia(PADRAO));
  }

  // ---------- guardar / descartar ----------
  function guardar() {
    iniciar(async () => {
      const resposta = await guardarAparencia(paraGuardar);
      if (resposta?.erro) return setMensagem({ tipo: "erro", texto: resposta.erro });
      setDados(resposta.guardado);
      setGuardado(JSON.stringify(resposta.guardado));
      setMensagem({ tipo: "sucesso", texto: resposta.sucesso });
      router.refresh(); // o menu lateral (feito no servidor) passa a mostrar os nomes e a ordem novos
    });
  }

  function descartar() {
    setDados(JSON.parse(guardado));
    setMensagem(null);
  }

  return (
    <div className={styles.editor}>
      {/* pré-visualização ao vivo: as cores do rascunho por cima das guardadas.
          Fica sempre, mesmo sem alterações: logo depois de guardar, o layout ainda traz as cores
          antigas até o router.refresh() acabar, e sem isto o tema antigo voltava 1–2 segundos. */}
      <style>{cssAparencia(paraGuardar)}</style>

      <div className={styles.colunaOpcoes}>
        {/* ---------- aspeto: claro ou escuro ---------- */}
        <section className={styles.seccao} aria-labelledby="titulo-modelo">
          <header className={styles.cabecaSeccao}>
            <h2 id="titulo-modelo">Aspeto</h2>
            <p className={styles.explicacao}>
              Claro ou escuro, para toda a equipa. Vês a mudança logo, antes de guardar.
            </p>
          </header>
          <div className={styles.grelhaModelos} role="radiogroup" aria-labelledby="titulo-modelo">
            {MODOS.map((modo) => {
              const ativo = dados.modo === modo.chave;
              const a = MODELOS[0][modo.chave].amostra;
              return (
                <div key={modo.chave} className={ativo ? styles.modeloAtivo : styles.modelo}>
                  <label className={styles.escolherModelo}>
                    <input
                      type="radio"
                      name="modo"
                      value={modo.chave}
                      checked={ativo}
                      onChange={() => mudar({ modo: modo.chave })}
                      className="so-leitores"
                    />
                    {/* miniatura do painel com as cores deste modo */}
                    <span className={styles.miniatura} style={{ background: a.fundo }} aria-hidden="true">
                      <span className={styles.miniLateral} style={{ background: a.lateral }}>
                        <span style={{ background: a.destaqueLateral }} />
                        <span style={{ background: a.fraco }} />
                        <span style={{ background: a.fraco }} />
                        <span style={{ background: a.fraco }} />
                      </span>
                      <span className={styles.miniConteudo}>
                        <span className={styles.miniTitulo} style={{ background: a.texto }} />
                        <span className={styles.miniCartoes}>
                          <span style={{ background: a.cartao }}>
                            <i style={{ background: a.destaque }} />
                          </span>
                          <span style={{ background: a.cartao }}>
                            <i style={{ background: a.fraco }} />
                          </span>
                        </span>
                        <span className={styles.miniBotao} style={{ background: a.destaque }} />
                      </span>
                    </span>
                    <span className={styles.nomeModelo}>
                      <strong>
                        <Icone nome={modo.icone} tamanho={15} /> {modo.nome}
                        {modo.chave === PADRAO.modo && <small className={styles.etiqueta}>Padrão</small>}
                      </strong>
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------- gráfico do Início ---------- */}
        <section className={styles.seccao} aria-labelledby="titulo-grafico">
          <header className={styles.cabecaSeccao}>
            <h2 id="titulo-grafico">Gráfico no Início</h2>
            <p className={styles.explicacao}>Como aparece o gráfico de clientes novos por semana.</p>
          </header>
          <div className={styles.graficos} role="radiogroup" aria-labelledby="titulo-grafico">
            {GRAFICOS.map((g) => (
              <label key={g.chave} className={dados.grafico === g.chave ? styles.graficoAtivo : styles.grafico}>
                <input
                  type="radio"
                  name="grafico"
                  value={g.chave}
                  checked={dados.grafico === g.chave}
                  onChange={() => mudar({ grafico: g.chave })}
                  className="so-leitores"
                />
                <MiniGrafico tipo={g.chave} />
                <span className={styles.nomeModelo}>
                  <strong>{g.nome}</strong>
                  <small>{g.descricao}</small>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* ---------- menu lateral ---------- */}
        <section className={styles.seccao} aria-labelledby="titulo-menu">
          <header className={`${styles.cabecaSeccao} ${styles.cabecaComBotao}`}>
            <div>
              <h2 id="titulo-menu">Menu lateral</h2>
              <p className={styles.explicacao}>
                Dá a cada página o nome que a tua equipa usa e põe-nas pela ordem que preferes. Os links não mudam.
              </p>
            </div>
            <button type="button" className={styles.botaoTexto} onClick={reporMenu}>
              Repor nomes e ordem
            </button>
          </header>

          {SECCOES_MENU.map(({ chave, titulo }) => (
            <div key={chave} className={styles.grupoMenu}>
              <p className={styles.tituloGrupo}>{titulo}</p>
              <ol className={styles.listaMenu}>
                {dados.menu[chave].map((item, i) => {
                  const original = base(chave, item.id);
                  return (
                    <li key={item.id} className={styles.itemMenu}>
                      <span className={styles.iconeItem} aria-hidden="true">
                        <Icone nome={original.icone} tamanho={18} />
                      </span>
                      <input
                        type="text"
                        value={item.nome}
                        maxLength={MAX_NOME_MENU}
                        placeholder={original.nome}
                        aria-label={`Nome no menu de "${original.nome}"`}
                        onChange={(e) => renomear(chave, item.id, e.target.value)}
                        className={styles.campoNome}
                      />
                      {original.admin && <span className={styles.soAdmin}>só administradores</span>}
                      {item.nome.trim() !== original.nome && (
                        <button
                          type="button"
                          className={styles.botaoIcone}
                          onClick={() => renomear(chave, item.id, original.nome)}
                          title={`Voltar a "${original.nome}"`}
                          aria-label={`Voltar ao nome "${original.nome}"`}
                        >
                          <Icone nome="cruz" tamanho={15} />
                        </button>
                      )}
                      <span className={styles.setas}>
                        <button
                          type="button"
                          className={styles.botaoIcone}
                          onClick={() => mover(chave, i, -1)}
                          disabled={i === 0}
                          aria-label={`Subir "${item.nome || original.nome}"`}
                        >
                          <Icone nome="cima" tamanho={16} />
                        </button>
                        <button
                          type="button"
                          className={styles.botaoIcone}
                          onClick={() => mover(chave, i, 1)}
                          disabled={i === dados.menu[chave].length - 1}
                          aria-label={`Descer "${item.nome || original.nome}"`}
                        >
                          <Icone nome="baixo" tamanho={16} />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </section>

        {/* ---------- guardar ---------- */}
        <div className={styles.barraGuardar} role="status">
          <span className={mensagem?.tipo === "erro" ? styles.textoErro : styles.textoEstado}>
            {mensagem?.texto ?? (alterado ? "Tens alterações por guardar." : "Tudo guardado.")}
          </span>
          <span className={styles.botoesBarra}>
            <button type="button" className={styles.botaoTexto} onClick={reporTudo} disabled={aGuardar}>
              Repor tudo
            </button>
            {alterado && (
              <button type="button" className="botao botao-secundario" onClick={descartar} disabled={aGuardar}>
                Descartar
              </button>
            )}
            <button type="button" className="botao" onClick={guardar} disabled={!alterado || aGuardar} aria-busy={aGuardar}>
              {aGuardar ? "A guardar…" : "Guardar"}
            </button>
          </span>
        </div>
      </div>

      {/* ================= pré-visualização do menu ================= */}
      <aside className={styles.previa} aria-label="Pré-visualização do menu">
        <p className={styles.tituloPrevia}>Como fica o menu</p>
        <div className={`painel-lateral ${styles.moldura}`}>
          {SECCOES_MENU.map(({ chave, titulo }) => (
            <div key={chave} className={styles.previaSeccao}>
              <p className={styles.previaTitulo}>{titulo}</p>
              {dados.menu[chave].map((item, i) => {
                const original = base(chave, item.id);
                return (
                  <span key={item.id} className={chave === "principal" && i === 0 ? styles.previaAtivo : styles.previaItem}>
                    <Icone nome={original.icone} tamanho={17} />
                    {item.nome.trim() || original.nome}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <p className={styles.nota}>Os comerciais só veem os itens que não dizem “só administradores”.</p>
      </aside>
    </div>
  );
}

// desenho pequeno de cada tipo de gráfico (só decoração)
function MiniGrafico({ tipo }) {
  const pontos = [22, 30, 18, 26, 10, 14];
  const caminho = pontos.map((y, i) => `${i === 0 ? "M" : "L"}${6 + i * 16} ${y}`).join(" ");
  return (
    <svg className={styles.miniGrafico} viewBox="0 0 92 40" aria-hidden="true">
      {tipo === "barras" ? (
        pontos.map((y, i) => <rect key={i} x={3 + i * 15} y={y} width="10" height={36 - y} rx="2" />)
      ) : (
        <>
          {tipo === "area" && <path d={`${caminho} L86 36 L6 36 Z`} className={styles.miniArea} />}
          <path d={caminho} className={styles.miniLinha} />
        </>
      )}
    </svg>
  );
}
