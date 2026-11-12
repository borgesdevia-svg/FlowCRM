import Revelar from "@/components/Revelar";
import CabecalhoSeccao from "./CabecalhoSeccao";
import styles from "./Problema.module.css";

// Secção "Antes / Com o FlowCRM": explica O PROBLEMA que resolvemos,
// comparando o dia a dia de uma equipa sem e com a aplicação.
// Cada linha da coluna "antes" tem a resposta na mesma linha da coluna "depois".

const comparacao = [
  {
    antes: "Os contactos estão espalhados por folhas de Excel, cadernos e telemóveis.",
    depois: "Todos os clientes da empresa ficam num só sítio, com pesquisa e filtros.",
  },
  {
    antes: "Quem preenche o formulário do site fica perdido na caixa de email.",
    depois: "Cada pedido de contacto entra sozinho no CRM como um cliente novo.",
  },
  {
    antes: "Ninguém sabe ao certo em que ponto está cada negócio.",
    depois: "Cada cliente tem um estado: novo, em negociação, ativo ou perdido.",
  },
  {
    antes: "Quando alguém sai da equipa, os contactos dessa pessoa vão embora também.",
    depois: "Os clientes pertencem à empresa. O administrador vê e reatribui tudo.",
  },
];

export default function Problema() {
  return (
    <section id="o-que-e" className={styles.seccao}>
      <CabecalhoSeccao
        titulo="Um só sítio para os clientes da tua equipa"
        subtitulo="Um CRM (gestão de relação com clientes) é onde a empresa guarda e acompanha os seus clientes. O FlowCRM faz isso sem complicações."
      />

      <Revelar>
        <div className={styles.tabela}>
          <div className={styles.titulos} aria-hidden="true">
            <span>Sem o FlowCRM</span>
            <span className={styles.tituloDepois}>Com o FlowCRM</span>
          </div>

          {/* em cada linha: o problema à esquerda e a solução à direita */}
          {comparacao.map((linha) => (
            <div key={linha.antes} className={styles.linha}>
              <p className={styles.antes}>
                <span className={styles.rotuloMovel}>Sem o FlowCRM</span>
                {linha.antes}
              </p>
              <p className={styles.depois}>
                <span className={styles.rotuloMovel}>Com o FlowCRM</span>
                {linha.depois}
              </p>
            </div>
          ))}
        </div>
      </Revelar>
    </section>
  );
}
