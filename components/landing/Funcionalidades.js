import Revelar from "@/components/Revelar";
import Icone from "@/components/Icone";
import CabecalhoSeccao from "./CabecalhoSeccao";
import styles from "./Funcionalidades.module.css";

// Secção de funcionalidades: quatro áreas principais, uma por linha.
// As linhas alternam o lado: texto à esquerda + demonstração à direita, depois ao contrário
// (a classe "invertida" troca a ordem no CSS). Assim a página não fica repetitiva.
// As demonstrações são imitações da interface, feitas em HTML/CSS com dados inventados.
// Animam quando aparecem no ecrã: o <Revelar> acrescenta a classe global "visivel".

const AREAS = [
  {
    icone: "utilizadores",
    sobretitulo: "Gestão de clientes",
    titulo: "Cada cliente com a sua história",
    texto: "Contactos, empresa, valor previsto e todas as interações num só ecrã. Qualquer colega sabe onde o negócio ficou.",
    pontos: ["Pesquisa e filtro por estado", "Notas e histórico partilhados", "Responsável por cada cliente"],
    Demo: DemoClientes,
  },
  {
    icone: "subida",
    sobretitulo: "Pipeline de vendas",
    titulo: "Vê o que está para fechar",
    texto: "Cada negócio está numa fase. Arrasta o cartão para a fase seguinte e toda a equipa vê a mudança.",
    pontos: ["Quatro fases claras", "Valor total em cada fase", "Arrastar ou mudar com um botão"],
    Demo: DemoPipeline,
  },
  {
    icone: "lista",
    sobretitulo: "Tarefas e atividades",
    titulo: "Nada fica esquecido",
    texto: "Lembretes com data ligados a cada cliente. A equipa sabe o que tem de fazer hoje e o que está atrasado.",
    pontos: ["Data limite em cada tarefa", "Atrasadas em destaque", "Marcar como feita num clique"],
    Demo: DemoTarefas,
  },
  {
    icone: "grafico",
    sobretitulo: "Dashboard",
    titulo: "Os números da equipa, num relance",
    texto: "Gráficos e números calculados a partir dos dados reais da empresa, logo na primeira página do painel.",
    pontos: ["Novos clientes por semana", "Taxa de conversão e valor em negociação", "Atividade recente da equipa"],
    Demo: DemoDashboard,
  },
];

// funcionalidades mais pequenas, mostradas em cartões no fim da secção.
// Só entram aqui coisas que a app já faz de verdade.
const EXTRAS = [
  {
    icone: "ligacao",
    titulo: "Formulário público",
    texto: "Cada empresa tem um link próprio. Quem o preenche entra logo no CRM como lead.",
  },
  {
    icone: "pesquisa",
    titulo: "Pesquisa rápida",
    texto: "Encontra qualquer cliente a partir de qualquer página do painel.",
  },
  {
    icone: "sino",
    titulo: "Avisos de tarefas",
    texto: "O sino mostra as tarefas para hoje e as que já estão atrasadas.",
  },
  {
    icone: "folha",
    titulo: "Exportar para Excel",
    texto: "Descarrega a lista de clientes em CSV sempre que precisares.",
  },
];

export default function Funcionalidades() {
  return (
    <section id="funcionalidades" className={styles.seccao}>
      <CabecalhoSeccao
        titulo="Tudo o que a tua equipa precisa para vender"
        subtitulo="Quatro áreas que trabalham em conjunto, desde o primeiro contacto até ao cliente ativo."
      />

      <div className={styles.areas}>
        {AREAS.map((a, i) => (
          <Revelar key={a.titulo} className={i % 2 === 1 ? `${styles.area} ${styles.invertida}` : styles.area}>
            <div className={styles.texto}>
              <p className={styles.sobretitulo}>
                <span className={styles.iconeArea}>
                  <Icone nome={a.icone} tamanho={18} />
                </span>
                {a.sobretitulo}
              </p>
              <h3>{a.titulo}</h3>
              <p className={styles.descricao}>{a.texto}</p>
              <ul className={styles.pontos}>
                {a.pontos.map((p) => (
                  <li key={p}>
                    <Icone nome="visto" tamanho={16} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* a "janela" com a demonstração */}
            <div className={styles.moldura} aria-hidden="true">
              <a.Demo />
            </div>
          </Revelar>
        ))}
      </div>

      <div className={styles.extras}>
        {EXTRAS.map((e, i) => (
          <Revelar key={e.titulo} atraso={i * 100}>
            <article className={styles.extra}>
              <span className={styles.iconeArea}>
                <Icone nome={e.icone} />
              </span>
              <div>
                <h3>{e.titulo}</h3>
                <p>{e.texto}</p>
              </div>
            </article>
          </Revelar>
        ))}
      </div>
    </section>
  );
}

// ---------- Demonstrações (só decoração) ----------
// A variável --i dá a ordem de entrada de cada elemento (0 primeiro, 1 depois...).

const ESTADOS = {
  novo: { texto: "Novo", cor: "var(--cor-estado-novo)" },
  negociacao: { texto: "Em negociação", cor: "var(--cor-estado-negociacao)" },
  ativo: { texto: "Ativo", cor: "var(--cor-estado-ativo)" },
  perdido: { texto: "Perdido", cor: "var(--cor-estado-perdido)" },
};

function Estado({ estado }) {
  return (
    <span className={styles.estado} style={{ "--cor": ESTADOS[estado].cor }}>
      {ESTADOS[estado].texto}
    </span>
  );
}

function DemoClientes() {
  const historico = [
    { tipo: "Formulário", texto: "Pediu contacto através do site.", quando: "há 5 dias" },
    { tipo: "Chamada", texto: "Quer orçamento para 3 lojas.", quando: "há 3 dias" },
    { tipo: "Reunião", texto: "Proposta apresentada. Gostou do plano anual.", quando: "ontem" },
  ];
  return (
    <div className={styles.demo}>
      <div className={`${styles.cabecaCliente} ${styles.entra}`} style={{ "--i": 0 }}>
        <b className={styles.avatar}>MS</b>
        <div>
          <strong>Marta Silva</strong>
          <small>marta@exemplo.pt · 912 345 678</small>
        </div>
        <Estado estado="negociacao" />
      </div>

      <div className={`${styles.dados} ${styles.entra}`} style={{ "--i": 1 }}>
        <div>
          <small>Responsável</small>
          <span>Rui Pereira</span>
        </div>
        <div>
          <small>Valor previsto</small>
          <span>2 400 €</span>
        </div>
        <div>
          <small>Origem</small>
          <span>Site</span>
        </div>
      </div>

      <div className={styles.linhaTempo}>
        {historico.map((h, i) => (
          <div key={h.tipo} className={`${styles.evento} ${styles.entra}`} style={{ "--i": i + 2 }}>
            <span className={styles.ponto}></span>
            <small>
              {h.tipo} · {h.quando}
            </small>
            <p>{h.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoPipeline() {
  // o cartão com "move: true" desliza para a coluna seguinte (animação em ciclo)
  const colunas = [
    { estado: "novo", valor: "3,6 k€", cartoes: [{ nome: "Padaria Central", valor: "1 200 €" }, { nome: "Marta Silva", valor: "2 400 €", move: true }] },
    { estado: "negociacao", valor: "3,5 k€", vaga: true, cartoes: [{ nome: "Oficina Lopes", valor: "3 500 €" }] },
    { estado: "ativo", valor: "3,4 k€", cartoes: [{ nome: "Studio Mar", valor: "2 800 €" }, { nome: "Café Ribeira", valor: "650 €" }] },
  ];
  return (
    <div className={`${styles.demo} ${styles.pipeline}`}>
      {colunas.map((col, i) => (
        <div key={col.estado} className={`${styles.coluna} ${styles.entra}`} style={{ "--i": i }}>
          <div className={styles.tituloColuna}>
            <span style={{ background: ESTADOS[col.estado].cor }}></span>
            <b>{ESTADOS[col.estado].texto}</b>
            {/* o total da coluna vai para a linha de baixo, para nunca sair da coluna */}
            <em>{col.valor}</em>
          </div>
          {col.cartoes.map((c) => (
            <div key={c.nome} className={c.move ? `${styles.negocio} ${styles.aMover}` : styles.negocio}>
              <strong>{c.nome}</strong>
              <small>{c.valor}</small>
            </div>
          ))}
          {/* lugar vazio onde o cartão que se move vai "aterrar". Tem o mesmo conteúdo
              (invisível) para ter exatamente a mesma altura, e assim a coluna cresce
              e o cartão fica dentro dela. Aparece a tracejado enquanto o cartão vem. */}
          {col.vaga && (
            <div className={`${styles.negocio} ${styles.vaga}`}>
              <strong>Marta Silva</strong>
              <small>2 400 €</small>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DemoTarefas() {
  const tarefas = [
    { titulo: "Ligar à Marta Silva", cliente: "Marta Silva", data: "Hoje", feita: true },
    { titulo: "Enviar proposta revista", cliente: "Oficina Lopes", data: "Hoje", feita: true },
    { titulo: "Reunião de apresentação", cliente: "Padaria Central", data: "Amanhã" },
    { titulo: "Pedir feedback do serviço", cliente: "Studio Mar", data: "Ontem", atrasada: true },
  ];
  return (
    <div className={styles.demo}>
      <div className={`${styles.topoDemo} ${styles.entra}`} style={{ "--i": 0 }}>
        <strong>Tarefas</strong>
        <small>2 para hoje · 1 atrasada</small>
      </div>
      {tarefas.map((t, i) => {
        let classe = `${styles.tarefa} ${styles.entra}`;
        if (t.feita) classe += ` ${styles.feita}`;
        return (
          // --visto: quando a caixa é marcada (cada tarefa feita um pouco depois da outra)
          <div key={t.titulo} className={classe} style={{ "--i": i + 1, "--visto": `${0.9 + i * 0.45}s` }}>
            <span className={styles.caixa}></span>
            <div>
              <strong>{t.titulo}</strong>
              <small>{t.cliente}</small>
            </div>
            <span className={t.atrasada ? `${styles.data} ${styles.atrasada}` : styles.data}>{t.data}</span>
          </div>
        );
      })}
    </div>
  );
}

function DemoDashboard() {
  const numeros = [
    { rotulo: "Novos leads", valor: "24", variacao: "+18%" },
    { rotulo: "Conversão", valor: "38%", variacao: "+4%" },
    { rotulo: "Em negociação", valor: "48 k€", variacao: "+12%" },
  ];
  const porEstado = [
    { estado: "novo", n: 9 },
    { estado: "negociacao", n: 6 },
    { estado: "ativo", n: 12 },
    { estado: "perdido", n: 3 },
  ];
  return (
    <div className={styles.demo}>
      <div className={styles.numeros}>
        {numeros.map((n, i) => (
          <div key={n.rotulo} className={`${styles.numero} ${styles.entra}`} style={{ "--i": i }}>
            <small>{n.rotulo}</small>
            <strong>{n.valor}</strong>
            <em>{n.variacao}</em>
          </div>
        ))}
      </div>
      <div className={`${styles.cartaoGrafico} ${styles.entra}`} style={{ "--i": 3 }}>
        <small>Clientes por estado</small>
        <div className={styles.barras}>
          {porEstado.map((b, i) => (
            <div key={b.estado}>
              {/* altura da barra em % do maior valor (12) */}
              <span style={{ height: `${(b.n / 12) * 100}%`, background: ESTADOS[b.estado].cor, "--i": 4 + i }}></span>
              <small>{ESTADOS[b.estado].texto}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
