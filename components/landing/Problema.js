import Icone from "@/components/Icone";
import CabecalhoSeccao from "./CabecalhoSeccao";
import styles from "./Problema.module.css";

// Secção "Sem / Com o FlowCRM": explica O PROBLEMA que resolvemos,
// comparando o dia a dia de uma equipa sem e com a aplicação.
// Cada linha da coluna "sem" tem a resposta na mesma linha da coluna "com".

const comparacao = [
  {
    icone: "folha",
    antes: "Os contactos estão espalhados por folhas de Excel, cadernos e telemóveis.",
    depois: "Todos os clientes da empresa ficam num só sítio, com pesquisa e filtros.",
  },
  {
    icone: "caixaEntrada",
    antes: "Quem preenche o formulário do site fica perdido na caixa de email.",
    depois: "Cada pedido de contacto entra sozinho no CRM como um cliente novo.",
  },
  {
    icone: "pergunta",
    antes: "Ninguém sabe ao certo em que ponto está cada negócio.",
    depois: "Cada cliente tem uma fase: novo, em negociação, ativo ou perdido.",
  },
  {
    icone: "utilizadorSai",
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

      <div className={styles.tabela}>
        <div className={styles.titulos} aria-hidden="true">
          <span>
            <Icone nome="cruz" tamanho={16} /> Sem o FlowCRM
          </span>
          <span className={styles.tituloDepois}>
            <Icone nome="visto" tamanho={16} /> Com o FlowCRM
          </span>
        </div>

        {/* em cada linha: o problema à esquerda e a solução à direita */}
        {comparacao.map((linha) => (
          <div key={linha.antes} className={styles.linha}>
            <div className={styles.antes}>
              <span className={styles.iconeAntes}>
                <Icone nome={linha.icone} />
              </span>
              <p>
                <span className={styles.rotuloMovel}>Sem o FlowCRM</span>
                {linha.antes}
              </p>
            </div>
            <div className={styles.depois}>
              <span className={styles.iconeDepois}>
                <Icone nome="visto" />
              </span>
              <p>
                <span className={styles.rotuloMovel}>Com o FlowCRM</span>
                {linha.depois}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
