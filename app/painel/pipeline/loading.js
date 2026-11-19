import styles from "../loading.module.css";

// Esqueleto da Pipeline: as 4 colunas, cada uma com alguns cartões.
export default function ACarregarPipeline() {
  return (
    <div className={styles.pagina} aria-busy="true" aria-label="A carregar a pipeline">
      <div className={`${styles.bloco} ${styles.titulo}`}></div>
      <div className={`${styles.bloco} ${styles.linhaCurta}`}></div>
      <div className={styles.colunas}>
        {[3, 2, 2, 1].map((cartoes, i) => (
          <div key={i} className={styles.coluna}>
            {Array.from({ length: cartoes }, (_, j) => (
              <div key={j} className={`${styles.bloco} ${styles.cartao}`}></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
