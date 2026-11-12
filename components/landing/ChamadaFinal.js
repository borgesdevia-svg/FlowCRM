import Link from "next/link";
import Revelar from "@/components/Revelar";
import styles from "./ChamadaFinal.module.css";

// Última secção da landing: convida o visitante a criar conta.
// Repete o visual do topo (grelha + horizonte brilhante), para a página
// "fechar" com a mesma imagem com que abriu.
export default function ChamadaFinal() {
  return (
    <section className={styles.seccao}>
      <Revelar>
        <div className={styles.caixa}>
          {/* horizonte brilhante no fundo da caixa (só decoração) */}
          <div className={styles.horizonte} aria-hidden="true"></div>

          <p className={styles.etiqueta}>Pronto para começar?</p>
          <h2>Organiza os clientes da tua equipa a partir de hoje</h2>
          <p className={styles.texto}>Criar a conta da empresa demora dois minutos. Não precisas de cartão.</p>
          <div className={styles.botoes}>
            <Link href="/registo" className={`botao ${styles.principal}`}>
              Começar grátis
            </Link>
            <Link href="/login" className="botao botao-secundario">
              Já tenho conta
            </Link>
          </div>
        </div>
      </Revelar>
    </section>
  );
}
