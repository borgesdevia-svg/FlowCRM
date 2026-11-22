// Aviso mostrado no lugar de uma função que é só do CRM Pro (Relatórios, Automações,
// design do formulário...). Explica o que é e porque não está disponível.
// "plano" vem de obterSessao() (lib/planos.js). "compacto" = versão mais pequena, dentro de uma página.
import Icone from "@/components/Icone";
import styles from "./AvisoPro.module.css";

export default function AvisoPro({ titulo, texto, plano, compacto = false }) {
  return (
    <section className={compacto ? `${styles.aviso} ${styles.compacto}` : styles.aviso}>
      <span className={styles.icone} aria-hidden="true">
        <Icone nome="cadeado" tamanho={compacto ? 18 : 22} />
      </span>
      <div className={styles.textos}>
        <h2>{titulo}</h2>
        <p>{texto}</p>
        <p className={styles.plano}>
          {plano?.testeAcabou
            ? "Os 14 dias a experimentar o CRM Pro acabaram e a empresa passou para o CRM Essencial. Os teus dados ficam todos guardados."
            : `A empresa está no ${plano?.nome ?? "CRM Essencial"}.`}{" "}
          Em breve vais poder mudar para o CRM Pro aqui no painel.
        </p>
      </div>
    </section>
  );
}

// etiqueta "Pro" pequena (no menu, nos separadores...)
export function EtiquetaPro({ className = "" }) {
  return <span className={`${styles.etiqueta} ${className}`}>Pro</span>;
}
