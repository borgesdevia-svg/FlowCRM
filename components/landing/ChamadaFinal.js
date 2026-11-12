import Link from "next/link";
import Revelar from "@/components/Revelar";
import styles from "./ChamadaFinal.module.css";

// Última secção da landing: convida o visitante a criar conta.
export default function ChamadaFinal() {
  return (
    <section className={styles.seccao}>
      <Revelar>
        <div className={styles.caixa}>
          {/* brilho animado atrás do conteúdo */}
          <div className={styles.brilho} aria-hidden="true"></div>

          <h2>Organiza os clientes da tua equipa a partir de hoje</h2>
          <p>Criar a conta da empresa demora dois minutos.</p>
          <div className={styles.botoes}>
            <Link href="/registo" className="botao">
              Criar conta
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
