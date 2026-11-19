import styles from "../loading.module.css";

// Esqueleto da lista de clientes: título, barra de pesquisa e linhas da tabela.
export default function ACarregarClientes() {
  return (
    <div className={styles.pagina} aria-busy="true" aria-label="A carregar clientes">
      <div className={`${styles.bloco} ${styles.titulo}`}></div>
      <div className={`${styles.bloco} ${styles.linhaCurta}`}></div>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className={`${styles.bloco} ${styles.linha}`}></div>
      ))}
    </div>
  );
}
