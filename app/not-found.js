import Link from "next/link";
import styles from "./estados-pagina.module.css";

// Página 404: aparece quando o endereço não existe
// ou quando uma página chama notFound() (ex.: cliente que não existe).
export const metadata = { title: "Página não encontrada · FlowCRM" };

export default function NaoEncontrado() {
  return (
    <main className={styles.pagina}>
      <p className={styles.codigo}>404</p>
      <h1>Esta página não existe</h1>
      <p className={styles.texto}>
        O endereço pode estar errado ou a página pode ter sido apagada.
      </p>
      <div className={styles.botoes}>
        <Link href="/" className="botao">
          Ir para o início
        </Link>
        <Link href="/painel" className="botao botao-secundario">
          Ir para o painel
        </Link>
      </div>
    </main>
  );
}
