import Link from "next/link";
import styles from "./MolduraAuth.module.css";
import SimboloLogo from "@/components/SimboloLogo";

// Moldura comum às páginas de login e registo:
// fundo com brilho verde (sem grelha) e um cartão central.
// Props: titulo, subtitulo, children (o formulário) e rodape (link para a outra página).
export default function MolduraAuth({ titulo, subtitulo, children, rodape }) {
  return (
    <main className={styles.pagina}>

      <Link href="/" className={`entrar ${styles.logo}`}>
        <SimboloLogo tamanho={26} className={styles.simbolo} />
        <span>
          Flow<span className={styles.crm}>CRM</span>
        </span>
      </Link>

      <div className={`entrar ${styles.cartao}`} style={{ "--atraso": "50ms" }}>
        <h1>{titulo}</h1>
        <p className={styles.subtitulo}>{subtitulo}</p>
        {children}
      </div>

      <p className={`entrar ${styles.rodape}`} style={{ "--atraso": "100ms" }}>
        {rodape}
      </p>
    </main>
  );
}
