import Icone from "@/components/Icone";
import styles from "./Vantagens.module.css";

// Secção "Vantagens": porque é que uma equipa pequena escolhe o FlowCRM.
// Layout diferente do resto da página, de propósito: título à esquerda (fica preso
// ao ecrã enquanto se lê, no computador) e uma lista à direita, separada por linhas
// finas, sem cartões. Assim esta secção não parece mais uma grelha de caixas.
// Só entram razões que as outras secções ainda não disseram.

const vantagens = [
  {
    icone: "olho",
    titulo: "Cada pessoa vê o que deve",
    texto: "O administrador vê todos os clientes. Cada comercial vê só aqueles por que é responsável.",
  },
  {
    icone: "cadeado",
    titulo: "Os dados de cada empresa ficam separados",
    texto: "A base de dados separa as empresas linha a linha: nenhuma empresa vê os clientes de outra.",
  },
  {
    icone: "telemovel",
    titulo: "Sem instalar nada",
    texto: "Abre no browser do computador ou do telemóvel. Entras com email e password e está pronto.",
  },
  {
    icone: "mensagem",
    titulo: "Simples e em português",
    texto: "Nomes claros e só o que se usa todos os dias. Não é preciso formação para começar.",
  },
];

export default function Vantagens() {
  return (
    <section id="vantagens" className={styles.faixa}>
      <div className={styles.interior}>
        <div className={styles.cabecalho}>
          <h2>Pensado para equipas pequenas</h2>
          <p>
            O FlowCRM faz menos do que os CRM das grandes empresas, de propósito: só o que uma
            equipa de vendas pequena usa no dia a dia.
          </p>
        </div>

        <ul className={styles.lista}>
          {vantagens.map((v) => (
            <li key={v.titulo}>
              <Icone nome={v.icone} />
              <div>
                <h3>{v.titulo}</h3>
                <p>{v.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
