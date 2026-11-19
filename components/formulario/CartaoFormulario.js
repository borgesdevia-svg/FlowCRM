// Formulário público em estilo "documento" (como uma folha de Word):
//  - em cima, o logótipo e o nome da empresa, uma linha fina, o título e o texto de entrada;
//  - por baixo, as perguntas numeradas (children = FormLead), sem cores: só preto, branco e cinzentos.
// É o MESMO componente na página pública (/f/[slug]) e na pré-visualização da página
// Formulário: assim o administrador vê exatamente o que o cliente vai ver.
// Sem "use client": funciona tanto no servidor como dentro de componentes de cliente.
// (A cor que as empresas escolhiam antes deixou de ser usada: o aspeto é igual para todas.)

import { TEXTOS_PADRAO } from "@/lib/formulario";
import styles from "./CartaoFormulario.module.css";

export default function CartaoFormulario({ nome, logo, titulo, texto, children, className = "" }) {
  return (
    <div className={`${styles.folha} ${className}`}>
      <header className={styles.cabeca}>
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
        <h1 className={styles.titulo}>{titulo || TEXTOS_PADRAO.titulo}</h1>
        <p className={styles.texto}>{texto || TEXTOS_PADRAO.texto}</p>
      </header>
      {children}
    </div>
  );
}
