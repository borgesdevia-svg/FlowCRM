import Link from "next/link";
import styles from "./BarraTopo.module.css";

// Barra no topo das páginas públicas (landing, login, registo).
// <Link> é o link do Next.js: muda de página sem recarregar o site todo.
export default function BarraTopo() {
  return (
    <header className={styles.barra}>
      <Link href="/" className={styles.logo}>
        Flow<span>CRM</span>
      </Link>

      {/* links para secções da própria landing (#id) — escondidos no telemóvel */}
      <nav className={styles.menu}>
        <Link href="/#funcionalidades">Funcionalidades</Link>
        <Link href="/#como-funciona">Como funciona</Link>
      </nav>

      <div className={styles.acoes}>
        <Link href="/login" className={styles.entrar}>
          Entrar
        </Link>
        <Link href="/registo" className="botao">
          Criar conta
        </Link>
      </div>
    </header>
  );
}
