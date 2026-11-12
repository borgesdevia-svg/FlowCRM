import Revelar from "@/components/Revelar";
import CabecalhoSeccao from "./CabecalhoSeccao";
import styles from "./Vantagens.module.css";

// Secção "Vantagens": as razões para uma empresa usar o FlowCRM.
// Lista simples em duas colunas (não são mais cartões): título curto + explicação.

const vantagens = [
  {
    titulo: "Tudo num só sítio",
    texto: "Contactos, estado de cada negócio e valor previsto, sempre atualizados para toda a equipa.",
  },
  {
    titulo: "Os contactos chegam sozinhos",
    texto: "Partilhas o link do teu formulário e cada pedido entra no CRM, sem copiar nada à mão.",
  },
  {
    titulo: "Cada pessoa vê o que deve",
    texto: "O administrador vê todos os clientes. Cada comercial vê só aqueles por que é responsável.",
  },
  {
    titulo: "Dados protegidos",
    texto: "A base de dados separa as empresas linha a linha: nenhuma empresa consegue ver os clientes de outra.",
  },
  {
    titulo: "Sem instalar nada",
    texto: "Abre no browser do computador ou do telemóvel. Entras com email e password e está pronto.",
  },
  {
    titulo: "Simples e em português",
    texto: "Só o que uma pequena equipa precisa, com nomes claros. Não é preciso formação para começar.",
  },
];

export default function Vantagens() {
  return (
    <section id="vantagens" className={styles.seccao}>
      <CabecalhoSeccao
        titulo="Porquê usar o FlowCRM"
        subtitulo="Feito para empresas pequenas que querem organizar as vendas sem ferramentas complicadas."
      />

      <Revelar>
        <ul className={styles.lista}>
          {vantagens.map((v) => (
            <li key={v.titulo}>
              <h3>{v.titulo}</h3>
              <p>{v.texto}</p>
            </li>
          ))}
        </ul>
      </Revelar>
    </section>
  );
}
