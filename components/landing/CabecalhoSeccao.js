import styles from "./CabecalhoSeccao.module.css";

// Cabeçalho reutilizado em várias secções da landing.
// Recebe o texto por props, por isso não repetimos o mesmo HTML/CSS em cada secção.
// Não tem animação de entrada: os títulos aparecem logo. As animações ficam guardadas
// para as demonstrações da app, que é onde mostram alguma coisa.
export default function CabecalhoSeccao({ sobretitulo, titulo, subtitulo }) {
  return (
    <div className={styles.cabecalho}>
      {sobretitulo && <p className={styles.sobretitulo}>{sobretitulo}</p>}
      <h2>{titulo}</h2>
      {/* o subtítulo é opcional: só aparece se for passado */}
      {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
    </div>
  );
}
