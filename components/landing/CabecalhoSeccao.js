import Revelar from "@/components/Revelar";
import styles from "./CabecalhoSeccao.module.css";

// Cabeçalho reutilizado em várias secções da landing.
// Recebe o texto por props, por isso não repetimos o mesmo HTML/CSS em cada secção.
export default function CabecalhoSeccao({ sobretitulo, titulo, subtitulo }) {
  return (
    <Revelar className={styles.cabecalho}>
      {sobretitulo && <p className={styles.sobretitulo}>{sobretitulo}</p>}
      <h2>{titulo}</h2>
      {/* o subtítulo é opcional: só aparece se for passado */}
      {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
    </Revelar>
  );
}
