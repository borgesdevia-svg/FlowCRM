import Link from "next/link";
import styles from "./BarraTopo.module.css";
import SimboloLogo from "@/components/SimboloLogo";

// Barra no topo das páginas públicas (landing, login, registo).
// Fica fixa ao fazer scroll, com fundo transparente desfocado (efeito "vidro").
// <Link> é o link do Next.js: muda de página sem recarregar o site todo.
export default function BarraTopo() {
  return (
    <header className={styles.barra}>
      <div className={styles.interior}>
        <Link href="/" className={styles.logo}>
          <SimboloLogo tamanho={22} className={styles.simbolo} />
          <span>
            Flow<span className={styles.crm}>CRM</span>
          </span>
        </Link>

        {/* links para secções da própria landing (#id) — escondidos no telemóvel */}
        <nav className={styles.menu}>
          <Link href="/#o-que-e">O que é</Link>
          <Link href="/#funcionalidades">Funcionalidades</Link>
          <Link href="/#como-funciona">Como funciona</Link>
          <Link href="/#perguntas">Perguntas</Link>
        </nav>

        <div className={styles.acoes}>
          <Link href="/login" className={styles.entrar}>
            Entrar
          </Link>
          <Link href="/registo" className="botao">
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  );
}
