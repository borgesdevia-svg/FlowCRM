import Link from "next/link";
import MockupCRM from "@/components/MockupCRM";
import styles from "./Destaque.module.css";

// Secção de destaque: a primeira coisa que se vê na landing.
// Tem de responder logo a "o que é isto?" e "para quem é?".
// A classe global "entrar" faz cada elemento aparecer ao carregar a página;
// a variável --atraso faz com que apareçam um a seguir ao outro.
export default function Destaque() {
  return (
    <section className={styles.destaque}>
      {/* fundo decorativo: grelha + brilho verde */}
      <div className={styles.fundo} aria-hidden="true"></div>

      <div className={styles.conteudo}>
        <h1 className="entrar">O CRM simples para pequenas equipas de vendas.</h1>

        <p className={`entrar ${styles.descricao}`} style={{ "--atraso": "100ms" }}>
          O FlowCRM guarda os clientes da tua empresa num só sítio, mostra em que fase
          está cada negócio e recebe sozinho os novos contactos do teu site. Sem folhas
          de Excel, cadernos ou mensagens perdidas.
        </p>

        <div className={`entrar ${styles.botoes}`} style={{ "--atraso": "200ms" }}>
          <Link href="/registo" className="botao">
            Criar conta grátis
          </Link>
          <Link href="/#como-funciona" className="botao botao-secundario">
            Ver como funciona
          </Link>
        </div>

        {/* três respostas rápidas às dúvidas mais comuns */}
        <ul className={`entrar ${styles.garantias}`} style={{ "--atraso": "300ms" }}>
          <li>Não precisas de instalar nada</li>
          <li>Funciona no computador e no telemóvel</li>
          <li>Os dados de cada empresa ficam separados</li>
        </ul>
      </div>

      <div className={styles.mockup}>
        <MockupCRM />
      </div>
    </section>
  );
}
