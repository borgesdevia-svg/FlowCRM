// Abas no topo da página Plano: "Plano" (escolher o plano) e "Cobrança" (cartão, faturas,
// cancelar). A Cobrança só aparece aos administradores.
import Link from "next/link";
import styles from "@/app/painel/plano/plano.module.css";

export default function AbasPlano({ ativa, eAdmin }) {
  const abas = [
    { id: "plano", nome: "Plano", href: "/painel/plano" },
    ...(eAdmin ? [{ id: "cobranca", nome: "Cobrança", href: "/painel/plano/cobranca" }] : []),
  ];
  if (abas.length < 2) return null;
  return (
    <nav className={styles.abas} aria-label="Plano e cobrança">
      {abas.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          className={a.id === ativa ? styles.abaAtiva : styles.aba}
          aria-current={a.id === ativa ? "page" : undefined}
        >
          {a.nome}
        </Link>
      ))}
    </nav>
  );
}
