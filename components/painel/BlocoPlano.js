// Caixa pequena com o plano da empresa (página Configurações).
// "plano" vem de obterSessao() (lib/planos.js).
import Link from "next/link";
import { textoDiasRestantes } from "@/lib/planos";
import styles from "./AvisoPro.module.css";

export default function BlocoPlano({ plano }) {
  let detalhe;
  if (plano.emTeste) detalhe = `A experimentar: ${textoDiasRestantes(plano.diasRestantes)}.`;
  else if (plano.pago && plano.cancelaNoFim) detalhe = "Cancelado no fim do período.";
  else if (plano.pago) detalhe = plano.ciclo === "anual" ? "Pago por ano." : "Pago por mês.";
  else detalhe = `Até ${plano.pessoas} pessoas.`;

  return (
    <Link href="/painel/plano" className={styles.blocoPlano}>
      <span className={styles.rotuloPlano}>Plano</span>
      <strong className={plano.pro ? styles.nomePro : undefined}>{plano.nome}</strong>
      <small>{detalhe}</small>
    </Link>
  );
}
