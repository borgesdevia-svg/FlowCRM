// Formulário público em estilo "página de formulário" (como um Google Forms):
//  - bloco de cima com uma faixa na cor da empresa, o logótipo por cima da faixa,
//    o nome da empresa, o título e o texto de entrada;
//  - por baixo, o formulário (children), com cada pergunta no seu bloco (FormLead).
// É o MESMO componente na página pública (/f/[slug]) e na pré-visualização da página
// Personalizar: assim o administrador vê exatamente o que o cliente vai ver.
// Sem "use client": funciona tanto no servidor como dentro de componentes de cliente.

import { TEXTOS_PADRAO, estiloCor } from "@/lib/formulario";
import styles from "./CartaoFormulario.module.css";

export default function CartaoFormulario({ nome, logo, cor, titulo, texto, children, className = "" }) {
  return (
    // a cor escolhida entra como variáveis CSS (ver estiloCor em lib/formulario.js)
    <div className={`${styles.cartao} ${className}`} style={estiloCor(cor)}>
      <header className={styles.cabeca}>
        <div className={styles.faixa} aria-hidden="true"></div>
        <div className={styles.conteudoCabeca}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={`Logótipo da ${nome}`} className={styles.logo} />
          ) : (
            <span className={styles.inicial} aria-hidden="true">
              {nome[0]?.toUpperCase()}
            </span>
          )}
          <p className={styles.nome}>{nome}</p>
          <h1 className={styles.titulo}>{titulo || TEXTOS_PADRAO.titulo}</h1>
          <p className={styles.texto}>{texto || TEXTOS_PADRAO.texto}</p>
        </div>
      </header>
      {children}
    </div>
  );
}
