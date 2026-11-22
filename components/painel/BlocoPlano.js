// Caixa pequena com o plano da empresa (página Configurações).
// "plano" vem de obterSessao() (lib/planos.js).
import Link from "next/link";
import { textoDiasRestantes } from "@/lib/planos";
import styles from "./AvisoPro.module.css";

export default function BlocoPlano({ plano }) {
  let detalhe;
  if (plano.emTeste) detalhe = `A experimentar: ${textoDiasRestantes(plano.diasRestantes)}.`;
  else if (plano.testeAcabou) detalhe = "Os 14 dias do CRM Pro acabaram.";
  else detalhe = `Até ${plano.pessoas} pessoas.`;

  return (
    <Link href="/painel/plano" className={styles.blocoPlano}>
      <span className={styles.rotuloPlano}>Plano</span>
      <strong className={plano.pro ? styles.nomePro : undefined}>{plano.nome}</strong>
      <small>{detalhe}</small>
    </Link>
  );
}
