import Revelar from "@/components/Revelar";
import CabecalhoSeccao from "./CabecalhoSeccao";
import styles from "./ComoFunciona.module.css";

// Secção "Como funciona": 3 passos ligados por uma linha
// que se "desenha" quando a secção aparece no ecrã.

const passos = [
  { titulo: "Regista a tua empresa", texto: "Cria a conta em poucos minutos. Quem regista fica como administrador." },
  { titulo: "Junta a tua equipa", texto: "Adiciona os comerciais. Cada um vê os seus clientes; o admin vê todos." },
  { titulo: "Recebe e acompanha leads", texto: "Partilha o formulário público e segue cada negócio a partir do painel." },
];

export default function ComoFunciona() {
  return (
    <section id="como-funciona" className={styles.seccao}>
      <CabecalhoSeccao sobretitulo="Como funciona" titulo="Do registo ao primeiro lead em 3 passos" />

      <Revelar>
        <div className={styles.trilho}>
          {/* linha que liga os números (anima quando o <Revelar> fica visível) */}
          <span className={styles.linha} aria-hidden="true"></span>

          <ol className={styles.passos}>
            {passos.map((p, indice) => (
              <li key={p.titulo} style={{ "--atraso": `${300 + indice * 250}ms` }}>
                <span className={styles.numero}>{indice + 1}</span>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </Revelar>
    </section>
  );
}
