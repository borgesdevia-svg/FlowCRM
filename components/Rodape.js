import styles from "./Rodape.module.css";

// Rodapé das páginas públicas.
export default function Rodape() {
  // ano atual, calculado no servidor quando a página é gerada
  const ano = new Date().getFullYear();

  return (
    <footer className={styles.rodape}>
      <p>© {ano} FlowCRM · Projeto PAP — Técnico de Gestão e Programação de Sistemas Informáticos</p>
    </footer>
  );
}
