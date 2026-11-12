import Link from "next/link";
import MockupCRM from "@/components/MockupCRM";
import styles from "./Destaque.module.css";

// Secção de destaque (a primeira coisa que se vê na landing).
// A classe global "entrar" faz cada elemento aparecer ao carregar a página;
// a variável --atraso faz com que apareçam um a seguir ao outro.
export default function Destaque() {
  return (
    <section className={styles.destaque}>
      {/* fundo decorativo: grelha + brilho verde */}
      <div className={styles.fundo} aria-hidden="true"></div>

      <div className={styles.conteudo}>
        <Link href="/#funcionalidades" className={`entrar ${styles.etiqueta}`} style={{ "--atraso": "0ms" }}>
          <span className={styles.ponto}></span>
          Novo: emails de boas-vindas automáticos
          <span className={styles.setaEtiqueta}>→</span>
        </Link>

        <h1 className="entrar" style={{ "--atraso": "100ms" }}>
          O CRM que trabalha
          <br />
          <span className={styles.gradiente}>enquanto tu vendes.</span>
        </h1>

        <p className={`entrar ${styles.descricao}`} style={{ "--atraso": "200ms" }}>
          Clientes, pipeline de vendas e emails automáticos numa só plataforma.
          Cada empresa tem o seu espaço, com os dados totalmente separados.
        </p>

        <div className={`entrar ${styles.botoes}`} style={{ "--atraso": "300ms" }}>
          <Link href="/registo" className="botao">
            Criar conta grátis <span className="seta">→</span>
          </Link>
          <Link href="/#como-funciona" className="botao botao-secundario">
            Ver como funciona
          </Link>
        </div>

        <p className={`entrar ${styles.nota}`} style={{ "--atraso": "400ms" }}>
          Pronto em 2 minutos · Funciona no computador e no telemóvel
        </p>
      </div>

      <div className={styles.mockup}>
        <MockupCRM />
      </div>
    </section>
  );
}
