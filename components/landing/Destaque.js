import Link from "next/link";
import styles from "./Destaque.module.css";

// Secção de destaque: a primeira coisa que se vê na landing.
// Tem de responder logo a "o que é isto?" e "para quem é?".
// O fundo tem duas manchas de cor a deslizar devagar (no CSS). Logo por baixo vem a janela da app (componente Tour).
// A classe global "entrar" faz cada elemento aparecer ao carregar a página;
// a variável --atraso faz com que apareçam um a seguir ao outro.
export default function Destaque() {
  return (
    <section className={styles.destaque}>
      <div className={styles.conteudo}>
        <h1 className="entrar">
          Todos os teus clientes, num só fluxo.
        </h1>

        <p className={`entrar ${styles.descricao}`} style={{ "--atraso": "100ms" }}>
          O CRM para pequenas equipas de vendas. Organiza os clientes, acompanha cada
          negócio e recebe os novos contactos do teu site, sem folhas de Excel.
        </p>

        <div className={`entrar ${styles.botoes}`} style={{ "--atraso": "200ms" }}>
          <Link href="/#precos" className="botao">
            Escolher um plano
          </Link>
          <Link href="/#demonstracao" className="botao botao-secundario">
            Explorar plataforma
          </Link>
        </div>
      </div>
    </section>
  );
}
