// O formulário público (também usado na pré-visualização da página Formulário).
// Por defeito é uma "folha de documento": logótipo e nome da empresa, título, texto de
// entrada e, por baixo, as perguntas (children = FormLead), a preto e cinzento.
// No CRM Pro a empresa muda o design (lib/formularioDesign.js): disposição (folha, cartão,
// dividido, aberto), posição do logótipo, cor, cantos, letra e alinhamento.
// É o MESMO componente na página pública (/f/[slug]) e no editor: o administrador vê
// exatamente o que o lead vai ver. Sem "use client": funciona no servidor e no browser.
//
// CenaFormulario (em baixo) é o fundo à volta do formulário (cinzento, cor da marca, escuro...).

import { TEXTOS_PADRAO } from "@/lib/formulario";
import { atributosDesign, normalizarDesign, variaveisDesign } from "@/lib/formularioDesign";
import styles from "./CartaoFormulario.module.css";

export default function CartaoFormulario({ nome, logo, titulo, texto, design, children, className = "" }) {
  const d = normalizarDesign(design);
  const mostrarEmpresa = d.logo !== "escondido";

  return (
    <div className={`${styles.folha} ${className}`} {...atributosDesign(d)} style={variaveisDesign(d)}>
      <header className={styles.cabeca}>
        {mostrarEmpresa && (
          <div className={styles.empresa}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={`Logótipo da ${nome}`} className={styles.logo} />
            ) : (
              <span className={styles.inicial} aria-hidden="true">
                {nome[0]?.toUpperCase()}
              </span>
            )}
            <p className={styles.nome}>{nome}</p>
          </div>
        )}
        <h1 className={styles.titulo}>{titulo || TEXTOS_PADRAO.titulo}</h1>
        <p className={styles.texto}>{texto || TEXTOS_PADRAO.texto}</p>
      </header>
      <div className={styles.corpo}>{children}</div>
    </div>
  );
}

// o fundo da página à volta do formulário (na página pública é o <main>)
export function CenaFormulario({ design, as: Elemento = "div", className = "", children }) {
  const d = normalizarDesign(design);
  return (
    <Elemento className={`${styles.cena} ${className}`} {...atributosDesign(d)} style={variaveisDesign(d)}>
      {children}
    </Elemento>
  );
}
