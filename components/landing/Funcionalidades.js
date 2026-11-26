import Icone from "@/components/Icone";
import CabecalhoSeccao from "./CabecalhoSeccao";
import styles from "./Funcionalidades.module.css";

// Secção de funcionalidades: uma lista simples, com linhas finas, em duas colunas.
// Antes tinha cinco "demonstrações" da app, mas repetiam o que o Tour (lá em cima)
// já mostra com as páginas verdadeiras, e o formato título + ✓ + imagem, cinco vezes,
// parecia um modelo de site feito por IA. Aqui fica só o texto: o que a app faz.
// Só entram coisas que a app já faz de verdade.

const FUNCIONALIDADES = [
  {
    icone: "utilizador",
    titulo: "Ficha de cada lead",
    texto: "Contactos, valor previsto, responsável e todas as interações num só ecrã. Qualquer colega sabe onde o negócio ficou.",
  },
  {
    icone: "lista",
    titulo: "Pipeline com quatro fases",
    texto: "Arrasta o cartão para a fase seguinte ou muda com um botão. Cada coluna mostra o valor total.",
  },
  {
    icone: "calendario",
    titulo: "Tarefas com data",
    texto: "Lembretes ligados a cada lead, em lista, calendário ou modo fila. Marca várias como feitas de uma vez.",
  },
  {
    icone: "grafico",
    titulo: "Visão geral da equipa",
    texto: "Novos leads por semana, taxa de conversão e valor em negociação, calculados a partir dos dados reais.",
  },
  {
    icone: "raio",
    titulo: "Automações",
    texto: "Quando entra um lead, o CRM entrega-o a alguém da equipa e cria a tarefa de contacto. Avisa quando um lead fica parado.",
  },
  {
    icone: "documento",
    titulo: "Propostas aceites online",
    texto: "Envias o orçamento por link. O cliente aceita com o nome e o lead passa sozinho a Ativo. (CRM Pro)",
  },
  {
    icone: "conversa",
    titulo: "WhatsApp num clique",
    texto: "Mensagens prontas com o nome do cliente. Abre o WhatsApp e a conversa fica no histórico do lead.",
  },
  {
    icone: "ligacao",
    titulo: "Formulário público",
    texto: "Cada empresa tem um link próprio, com as suas perguntas. Quem o preenche entra logo no CRM como lead.",
  },
  {
    icone: "relogio",
    titulo: "Marcações online",
    texto: "Os clientes escolhem o dia e a hora livres no teu horário. A reunião entra no CRM com o lead e a tarefa para esse dia.",
  },
  {
    icone: "alvo",
    titulo: "Meta do mês",
    texto: "Define quanto queres vender este mês e vê quanto falta, o ritmo necessário e o que ainda está em negociação.",
  },
  {
    icone: "caixaEntrada",
    titulo: "Importar e exportar",
    texto: "Traz os contactos que já tens num ficheiro CSV, com pré-visualização. E exporta para Excel quando precisares.",
  },
  {
    icone: "utilizadorMais",
    titulo: "Papéis na equipa",
    texto: "Administradores veem tudo; cada comercial vê só os seus leads.",
  },
  {
    icone: "sino",
    titulo: "Avisos no sino",
    texto: "Tarefas para hoje, atrasadas e leads que ainda não têm responsável. A pesquisa encontra qualquer lead.",
  },
  {
    icone: "telemovel",
    titulo: "App no telemóvel",
    texto: "Instala o FlowCRM no ecrã inicial do telemóvel ou do computador, sem passar por nenhuma loja.",
  },
];

export default function Funcionalidades() {
  return (
    <section id="funcionalidades" className={styles.seccao}>
      <CabecalhoSeccao titulo="O que o FlowCRM faz" subtitulo="Do primeiro contacto ao cliente ativo." />

      <ul className={styles.lista}>
        {FUNCIONALIDADES.map((f) => (
          <li key={f.titulo} className={styles.item}>
            <Icone nome={f.icone} className={styles.icone} />
            <div>
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
