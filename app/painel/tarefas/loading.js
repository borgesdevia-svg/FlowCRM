import styles from "../loading.module.css";

// Esqueleto das Tarefas (lista, fila e calendário): título e algumas linhas.
export default function ACarregarTarefas() {
  return (
    <div className={styles.pagina} aria-busy="true" aria-label="A carregar tarefas">
      <div className={`${styles.bloco} ${styles.titulo}`}></div>
      <div className={`${styles.bloco} ${styles.linhaCurta}`}></div>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={`${styles.bloco} ${styles.linha}`}></div>
      ))}
    </div>
  );
}
