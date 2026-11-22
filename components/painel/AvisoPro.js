// Aviso mostrado no lugar de uma função que é só do CRM Pro (Relatórios, Automações,
// design do formulário...). Explica o que é e porque não está disponível.
// "plano" vem de obterSessao() (lib/planos.js). "compacto" = versão mais pequena, dentro de uma página.
import Link from "next/link";
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
          {`A empresa está no ${plano?.nome ?? "CRM Essencial"}.`}{" "}
          <Link href="/painel/plano">Ver os planos</Link>
        </p>
      </div>
    </section>
  );
}

// etiqueta "Pro" pequena (no menu, nos separadores...)
export function EtiquetaPro({ className = "" }) {
  return <span className={`${styles.etiqueta} ${className}`}>Pro</span>;
}
