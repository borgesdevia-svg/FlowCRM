import styles from "./MockupCRM.module.css";

// "Ecrã falso" do CRM para a landing page, feito só com HTML e CSS.
// Os dados são inventados (não são clientes reais).
const clientesExemplo = [
  { nome: "Padaria Central", valor: "1 200 €", estado: "novo" },
  { nome: "Oficina Lopes", valor: "3 500 €", estado: "negociacao" },
  { nome: "Studio Mar", valor: "2 800 €", estado: "ativo" },
  { nome: "Clínica Sol", valor: "900 €", estado: "perdido" },
];

// texto que aparece em cada etiqueta de estado
const nomesEstados = {
  novo: "Novo",
  negociacao: "Em negociação",
  ativo: "Ativo",
  perdido: "Perdido",
};

export default function MockupCRM() {
  return (
    // aria-hidden: é só decoração, os leitores de ecrã ignoram
    <div className={styles.janela} aria-hidden="true">
      {/* os 3 pontos de uma janela */}
      <div className={styles.topo}>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div className={styles.numeros}>
        <div>
          <strong>24</strong>
          <small>Novos leads</small>
        </div>
        <div>
          <strong>38%</strong>
          <small>Conversão</small>
        </div>
        <div>
          <strong>12</strong>
          <small>Ativos</small>
        </div>
      </div>

      {/* .map() cria uma linha por cada cliente da lista */}
      <ul className={styles.lista}>
        {clientesExemplo.map((cliente) => (
          <li key={cliente.nome}>
            <span className={styles.nome}>{cliente.nome}</span>
            <span className={styles.valor}>{cliente.valor}</span>
            <span className={`${styles.estado} ${styles[cliente.estado]}`}>
              {nomesEstados[cliente.estado]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
