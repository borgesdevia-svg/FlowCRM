"use client";
// Separadores de página (ficha do lead, A minha conta...). A página carrega TODAS as secções uma
// vez e aqui só se escolhe qual se vê: trocar de separador é instantâneo (não pede a página ao
// servidor outra vez).
// O separador escolhido vai no URL (?sec=emails) com window.history.pushState: o "voltar" do
// browser funciona, os links de fora abrem o separador certo e um refresh mantém-no.
// As secções escondidas continuam montadas (não se perde o que se escreveu).
// Links antigos com âncora (ex.: /painel/conta#email) também abrem o separador com essa chave.
//
// Uso (na página, componente de servidor):
//   <Separadores seccoes={[{ chave, texto, numero? }]} inicial="atividade" rotulo="Secções do lead">
//     <Painel chave="atividade">...</Painel>
//     ...
//   </Separadores>

import { createContext, useContext, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./Separadores.module.css";

const SeparadorAtivo = createContext("");

// muda o ?sec= do URL sem ir ao servidor (o Next.js atualiza o useSearchParams)
function irPara(chave, { substituir = false } = {}) {
  const novos = new URLSearchParams(window.location.search);
  novos.set("sec", chave);
  novos.delete("proposta"); // o destaque de "proposta nova" (ficha do lead) só vale na primeira vez
  const url = `${window.location.pathname}?${novos.toString()}`;
  if (substituir) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

// Ctrl/Cmd + clique ou clique do meio: deixa o browser abrir noutro separador
const cliqueEspecial = (e) => e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0;

export function Separadores({ seccoes, inicial, rotulo = "Secções", children }) {
  const params = useSearchParams();
  const pedido = params.get("sec");
  const ativa = seccoes.some((s) => s.chave === pedido) ? pedido : inicial;

  // link antigo com âncora (#email): passa a ?sec=email
  useEffect(() => {
    const ancora = window.location.hash.slice(1);
    if (!pedido && ancora && seccoes.some((s) => s.chave === ancora)) irPara(ancora, { substituir: true });
  }, [pedido, seccoes]);

  function escolher(evento, chave) {
    if (cliqueEspecial(evento)) return;
    evento.preventDefault();
    if (chave !== ativa) irPara(chave);
  }

  return (
    <SeparadorAtivo.Provider value={ativa}>
      <nav className={styles.separadores} aria-label={rotulo}>
        {seccoes.map((s) => (
          <a
            key={s.chave}
            href={`?sec=${s.chave}`}
            onClick={(e) => escolher(e, s.chave)}
            aria-current={s.chave === ativa ? "page" : undefined}
            className={styles.separador}
          >
            {s.texto}
            {s.numero > 0 && <span>{s.numero}</span>}
          </a>
        ))}
      </nav>
      {children}
    </SeparadorAtivo.Provider>
  );
}

// Uma secção: só se vê quando o seu separador está escolhido.
// (Ao aparecer, as animações "entrar" dos cartões lá dentro voltam a correr.)
export function Painel({ chave, children }) {
  const ativa = useContext(SeparadorAtivo);
  return (
    <div hidden={chave !== ativa} className={styles.painel}>
      {children}
    </div>
  );
}

// Link para um separador a partir de outro sítio da mesma página
// (ex.: o e-mail no cabeçalho da ficha abre "E-mails"). Troca no browser, sem ir ao servidor.
export function LinkSeparador({ chave, className, children }) {
  function abrir(evento) {
    if (cliqueEspecial(evento)) return;
    evento.preventDefault();
    irPara(chave);
  }
  return (
    <a href={`?sec=${chave}`} onClick={abrir} className={className}>
      {children}
    </a>
  );
}
