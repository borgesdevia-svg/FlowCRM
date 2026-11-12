import Revelar from "@/components/Revelar";
import CabecalhoSeccao from "./CabecalhoSeccao";
import styles from "./Funcionalidades.module.css";

// Secção de funcionalidades em grelha "bento" (cartões de tamanhos diferentes).
// Cada cartão tem uma mini-ilustração feita em HTML/CSS.

// --- Mini-ilustrações (só decoração) ---

function VisualClientes() {
  return (
    <div className={styles.visual} aria-hidden="true">
      <div className={styles.pesquisa}>
        <span className={styles.lupa}></span>
        <span className={styles.escrever}>Oficina</span>
      </div>
      <div className={styles.filtros}>
        <span className={styles.filtroAtivo}>Todos</span>
        <span>Novo</span>
        <span>Em negociação</span>
        <span>Ativo</span>
      </div>
      <div className={styles.resultado}>
        <b>OL</b> Oficina Lopes <em className={styles.negociacao}>Em negociação</em>
      </div>
      <div className={`${styles.resultado} ${styles.apagado}`}>
        <b>OM</b> Oficina Moura <em className={styles.novo}>Novo</em>
      </div>
    </div>
  );
}

function VisualPipeline() {
  const colunas = [
    { nome: "Novo", cor: "var(--cor-estado-novo)", cartoes: 2 },
    { nome: "Negociação", cor: "var(--cor-estado-negociacao)", cartoes: 1 },
    { nome: "Ativo", cor: "var(--cor-estado-ativo)", cartoes: 2 },
  ];
  return (
    <div className={`${styles.visual} ${styles.pipeline}`} aria-hidden="true">
      {colunas.map((col, i) => (
        <div key={col.nome} className={styles.coluna}>
          <small style={{ color: col.cor }}>{col.nome}</small>
          {/* Array.from cria uma lista com N elementos, para desenhar N cartões */}
          {Array.from({ length: col.cartoes }).map((_, j) => (
            <span
              key={j}
              className={i === 1 && j === 0 ? `${styles.cartaoMini} ${styles.aMover}` : styles.cartaoMini}
              style={{ borderLeftColor: col.cor }}
            ></span>
          ))}
        </div>
      ))}
    </div>
  );
}

function VisualFormulario() {
  return (
    <div className={styles.visual} aria-hidden="true">
      <div className={styles.link}>flowcrm.app/f/a-tua-empresa</div>
      <div className={styles.campo}>Nome</div>
      <div className={styles.campo}>Email</div>
      <div className={styles.enviar}>Enviar pedido</div>
    </div>
  );
}

function VisualEmails() {
  return (
    <div className={`${styles.visual} ${styles.fluxo}`} aria-hidden="true">
      <div className={styles.passoFluxo}>
        <span className={styles.iconeFluxo}>+</span>
        Novo lead
      </div>
      <div className={styles.linhaFluxo}></div>
      <div className={styles.passoFluxo}>
        <span className={styles.iconeFluxo}>⚡</span>
        Automação
      </div>
      <div className={styles.linhaFluxo}></div>
      <div className={`${styles.passoFluxo} ${styles.final}`}>
        <span className={styles.iconeFluxo}>✓</span>
        Email enviado
      </div>
      <div className={styles.email}>
        <small>Para: marta@exemplo.pt</small>
        <strong>Bem-vinda, Marta!</strong>
        <p>Obrigado pelo teu contacto. Vamos responder-te em breve.</p>
      </div>
    </div>
  );
}

// --- Lista de cartões ---
// "grande: true" = o cartão ocupa 2 colunas da grelha
const cartoes = [
  {
    titulo: "Todos os clientes, organizados",
    texto: "Contactos, estados e notas de cada cliente num só lugar. Pesquisa e filtra em segundos.",
    visual: <VisualClientes />,
    grande: true,
  },
  {
    titulo: "Pipeline por fases",
    texto: "Vê em que fase está cada negócio e muda-o de fase com um clique.",
    visual: <VisualPipeline />,
  },
  {
    titulo: "Formulário público",
    texto: "Cada empresa tem um link próprio. Quem o preenche entra logo como lead.",
    visual: <VisualFormulario />,
  },
  {
    titulo: "Emails automáticos",
    texto: "Cada novo lead recebe um email de boas-vindas, sem ninguém ter de o enviar.",
    visual: <VisualEmails />,
    grande: true,
  },
];

export default function Funcionalidades() {
  return (
    <section id="funcionalidades" className={styles.seccao}>
      <CabecalhoSeccao
        titulo="O que podes fazer com o FlowCRM"
        subtitulo="Quatro ferramentas que trabalham em conjunto, desde o primeiro contacto até ao cliente ativo."
      />

      <div className={styles.grelha}>
        {cartoes.map((c, i) => (
          <Revelar key={c.titulo} atraso={i * 100} className={c.grande ? styles.grande : ""}>
            <article className={styles.cartao}>
              {c.visual}
              <h3>{c.titulo}</h3>
              <p>{c.texto}</p>
            </article>
          </Revelar>
        ))}
      </div>
    </section>
  );
}
