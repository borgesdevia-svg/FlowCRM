import Link from "next/link";
import styles from "./MolduraAuth.module.css";

// Moldura comum às páginas de login e registo:
// fundo com grelha e brilho (igual à landing) e um cartão central.
// Props: titulo, subtitulo, children (o formulário) e rodape (link para a outra página).
export default function MolduraAuth({ titulo, subtitulo, children, rodape }) {
  return (
    <main className={styles.pagina}>
      <div className={styles.fundo} aria-hidden="true"></div>

      <Link href="/" className={`entrar ${styles.logo}`}>
        <span className={styles.simbolo} aria-hidden="true"></span>
        <span>
          Flow<span className={styles.crm}>CRM</span>
        </span>
      </Link>

      <div className={`entrar ${styles.cartao}`} style={{ "--atraso": "100ms" }}>
        <h1>{titulo}</h1>
        <p className={styles.subtitulo}>{subtitulo}</p>
        {children}
      </div>

      <p className={`entrar ${styles.rodape}`} style={{ "--atraso": "200ms" }}>
        {rodape}
      </p>
    </main>
  );
}
