import Revelar from "@/components/Revelar";
import Icone from "@/components/Icone";
import CabecalhoSeccao from "./CabecalhoSeccao";
import styles from "./Vantagens.module.css";

// Secção "Vantagens": as razões para uma empresa usar o FlowCRM.
// Grelha de cartões com ícone, numa faixa com fundo ligeiramente diferente
// (--cor-fundo-2), para separar esta secção das outras.

const vantagens = [
  {
    icone: "grelha",
    titulo: "Tudo num só sítio",
    texto: "Contactos, fase de cada negócio e valor previsto, sempre atualizados para toda a equipa.",
  },
  {
    icone: "raio",
    titulo: "Os contactos chegam sozinhos",
    texto: "Partilhas o link do teu formulário e cada pedido entra no CRM, sem copiar nada à mão.",
  },
  {
    icone: "olho",
    titulo: "Cada pessoa vê o que deve",
    texto: "O administrador vê todos os clientes. Cada comercial vê só aqueles por que é responsável.",
  },
  {
    icone: "cadeado",
    titulo: "Dados protegidos",
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
    texto: "Só o que uma pequena equipa precisa, com nomes claros. Não é preciso formação para começar.",
  },
];

export default function Vantagens() {
  return (
    <section id="vantagens" className={styles.faixa}>
      <div className={styles.interior}>
        <CabecalhoSeccao
          sobretitulo="Vantagens"
          titulo="Porquê usar o FlowCRM"
          subtitulo="Feito para empresas pequenas que querem organizar as vendas sem ferramentas complicadas."
        />

        <div className={styles.grelha}>
          {vantagens.map((v, i) => (
            // atraso diferente por coluna (i % 3): os cartões da mesma linha aparecem em cascata
            <Revelar key={v.titulo} atraso={(i % 3) * 100}>
              <article className={styles.cartao}>
                <span className={styles.icone}>
                  <Icone nome={v.icone} />
                </span>
                <h3>{v.titulo}</h3>
                <p>{v.texto}</p>
              </article>
            </Revelar>
          ))}
        </div>
      </div>
    </section>
  );
}
