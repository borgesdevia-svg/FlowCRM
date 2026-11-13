import Link from "next/link";
import styles from "./Destaque.module.css";

// Secção de destaque: a primeira coisa que se vê na landing.
// Tem de responder logo a "o que é isto?" e "para quem é?".
// O fundo é o preto da página, sem decoração. Logo por baixo vem a janela da app (componente Tour).
// A classe global "entrar" faz cada elemento aparecer ao carregar a página;
// a variável --atraso faz com que apareçam um a seguir ao outro.
export default function Destaque() {
  return (
    <section className={styles.destaque}>
      <div className={styles.conteudo}>
        <p className={`entrar ${styles.etiqueta}`}>CRM para pequenas equipas de vendas</p>

        <h1 className="entrar" style={{ "--atraso": "80ms" }}>
          Todos os teus clientes, num só fluxo.
        </h1>

        <p className={`entrar ${styles.descricao}`} style={{ "--atraso": "160ms" }}>
          Organiza os clientes, acompanha cada negócio e recebe os novos contactos
          do teu site. Tudo num só sítio, sem folhas de Excel.
        </p>

        <div className={`entrar ${styles.botoes}`} style={{ "--atraso": "240ms" }}>
          <Link href="/registo" className={`botao ${styles.botaoVidro}`}>
            Começar grátis
          </Link>
          <Link href="/#demonstracao" className="botao botao-secundario">
            Explorar plataforma
          </Link>
        </div>
      </div>
    </section>
  );
}
