import styles from "@/app/estados-pagina.module.css";

// Proposta que não existe (link errado ou proposta apagada pela empresa).
// Quem chega aqui é o cliente: sem "Ir para o painel".
export default function PropostaNaoEncontrada() {
  return (
    <main className={styles.pagina}>
      <h1>Esta proposta não existe</h1>
      <p className={styles.texto}>
        O link pode estar errado ou a proposta ter sido retirada. Fala com a empresa que ta enviou.
      </p>
    </main>
  );
}
