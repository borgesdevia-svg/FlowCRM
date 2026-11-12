import styles from "./MockupCRM.module.css";

// "Ecrã falso" do CRM para a landing page, feito só com HTML e CSS.
// Imita o painel que vamos construir. Os dados são inventados (não são clientes reais).

const menu = ["Painel", "Clientes", "Pipeline", "Tarefas", "Equipa"];

// cartões de números; "barras" = alturas (%) do mini-gráfico
const numeros = [
  { rotulo: "Novos leads", valor: "24", variacao: "+18%", barras: [30, 45, 35, 60, 50, 80, 95] },
  { rotulo: "Conversão", valor: "38%", variacao: "+4%", barras: [40, 38, 50, 45, 60, 58, 70] },
  { rotulo: "Valor previsto", valor: "48 k€", variacao: "+12%", barras: [20, 35, 50, 40, 65, 75, 85] },
];

const clientes = [
  { nome: "Padaria Central", iniciais: "PC", responsavel: "Ana", valor: "1 200 €", estado: "novo" },
  { nome: "Oficina Lopes", iniciais: "OL", responsavel: "Rui", valor: "3 500 €", estado: "negociacao" },
  { nome: "Studio Mar", iniciais: "SM", responsavel: "Ana", valor: "2 800 €", estado: "ativo" },
  { nome: "Clínica Sol", iniciais: "CS", responsavel: "Rui", valor: "900 €", estado: "perdido" },
];

const nomesEstados = {
  novo: "Novo",
  negociacao: "Em negociação",
  ativo: "Ativo",
  perdido: "Perdido",
};

export default function MockupCRM() {
  return (
    // aria-hidden: é só decoração, os leitores de ecrã ignoram
    <div className={styles.palco} aria-hidden="true">
      <div className={styles.janela}>
        {/* barra da "janela" do browser */}
        <div className={styles.barraJanela}>
          <span className={styles.pontos}>
            <i></i>
            <i></i>
            <i></i>
          </span>
          <span className={styles.endereco}>flowcrm.app/painel</span>
        </div>

        <div className={styles.corpo}>
          {/* menu lateral */}
          <aside className={styles.lateral}>
            <div className={styles.empresa}>
              <span className={styles.logoEmpresa}>A</span>
              Acme, Lda.
            </div>
            {menu.map((item, i) => (
              <div key={item} className={i === 0 ? `${styles.itemMenu} ${styles.itemAtivo}` : styles.itemMenu}>
                <span className={styles.iconeMenu}></span>
                {item}
              </div>
            ))}
          </aside>

          {/* área principal */}
          <div className={styles.principal}>
            <div className={styles.cabecalho}>
              <div>
                <small>Bom dia, Ana</small>
                <strong>Painel</strong>
              </div>
              <span className={styles.botaoFalso}>+ Novo cliente</span>
            </div>

            <div className={styles.numeros}>
              {numeros.map((n) => (
                <div key={n.rotulo} className={styles.cartaoNumero}>
                  <small>{n.rotulo}</small>
                  <div className={styles.linhaValor}>
                    <strong>{n.valor}</strong>
                    <em>{n.variacao}</em>
                  </div>
                  {/* mini-gráfico de barras: cada barra cresce com um pequeno atraso */}
                  <div className={styles.barras}>
                    {n.barras.map((altura, i) => (
                      <span key={i} style={{ height: `${altura}%`, "--atraso": `${900 + i * 60}ms` }}></span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.tabela}>
              <div className={`${styles.linha} ${styles.titulos}`}>
                <span>Cliente</span>
                <span>Responsável</span>
                <span>Valor</span>
                <span>Estado</span>
              </div>
              {clientes.map((c, i) => (
                <div key={c.nome} className={styles.linha} style={{ "--atraso": `${1100 + i * 120}ms` }}>
                  <span className={styles.cliente}>
                    <b className={styles.avatar}>{c.iniciais}</b>
                    {c.nome}
                  </span>
                  <span className={styles.suave}>{c.responsavel}</span>
                  <span className={styles.suave}>{c.valor}</span>
                  <span>
                    <span className={`${styles.estado} ${styles[c.estado]}`}>{nomesEstados[c.estado]}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* notificações a flutuar por cima: mostram a automação a funcionar */}
      <div className={`${styles.notificacao} ${styles.n1}`}>
        <span className={styles.iconeNotif}>+</span>
        <div>
          <strong>Novo lead recebido</strong>
          <small>Marta Silva · Formulário público</small>
        </div>
      </div>

      <div className={`${styles.notificacao} ${styles.n2}`}>
        <span className={styles.iconeNotif}>✓</span>
        <div>
          <strong>Email de boas-vindas enviado</strong>
          <small>Automático · há 2 segundos</small>
        </div>
      </div>
    </div>
  );
}
