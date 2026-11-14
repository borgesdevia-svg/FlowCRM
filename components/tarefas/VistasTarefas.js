import Link from "next/link";
import Icone from "@/components/Icone";
import styles from "./VistasTarefas.module.css";

// Controlo "Lista | Calendário | Fila", igual no topo das três páginas das tarefas:
// mostra em que vista se está e passa para outra com um clique.
// "atual" = "lista", "calendario" ou "fila".
const VISTAS = [
  { chave: "lista", texto: "Lista", href: "/painel/tarefas", icone: "lista" },
  { chave: "calendario", texto: "Calendário", href: "/painel/tarefas/calendario", icone: "calendario" },
  { chave: "fila", texto: "Fila", href: "/painel/tarefas/fila", icone: "tocar" },
];

export default function VistasTarefas({ atual }) {
  return (
    <nav className={styles.vistas} aria-label="Vistas das tarefas">
      {VISTAS.map((v) => (
        <Link
          key={v.chave}
          href={v.href}
          className={v.chave === atual ? styles.ativa : styles.vista}
          aria-current={v.chave === atual ? "page" : undefined}
        >
          <Icone nome={v.icone} tamanho={15} />
          {v.texto}
        </Link>
      ))}
    </nav>
  );
}
