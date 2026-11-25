import Link from "next/link";
import Revelar from "@/components/Revelar";
import styles from "./ChamadaFinal.module.css";

// Última secção da landing: convida o visitante a criar conta.
// Caixa simples sobre o fundo liso: sem brilhos nem decoração, só o texto e os botões.
export default function ChamadaFinal() {
  return (
    <section className={styles.seccao}>
      <Revelar>
        <div className={styles.caixa}>
          <h2>Organiza os clientes da tua equipa a partir de hoje</h2>
          <p className={styles.texto}>Crias a conta da empresa, escolhes o plano e começas logo a usar.</p>
          <div className={styles.botoes}>
            <Link href="/#precos" className="botao">
              Escolher um plano
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
