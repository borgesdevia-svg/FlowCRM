import styles from "./loading.module.css";

// O Next.js mostra este ficheiro AUTOMATICAMENTE enquanto uma página do painel
// está a carregar (por exemplo, à espera da base de dados).
// Mostra "esqueletos": blocos cinzentos com a forma do conteúdo que vai aparecer.
export default function ACarregar() {
  return (
    <div className={styles.pagina} aria-busy="true" aria-label="A carregar">
      <div className={`${styles.bloco} ${styles.titulo}`}></div>
      <div className={`${styles.bloco} ${styles.linhaCurta}`}></div>
      <div className={styles.grelha}>
        <div className={styles.bloco}></div>
        <div className={styles.bloco}></div>
        <div className={styles.bloco}></div>
      </div>
      <div className={`${styles.bloco} ${styles.grande}`}></div>
    </div>
  );
}
