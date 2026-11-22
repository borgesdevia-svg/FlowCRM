import CabecalhoSeccao from "./CabecalhoSeccao";
import styles from "./Perguntas.module.css";

// Perguntas frequentes. Usa <details> e <summary>, elementos do próprio HTML:
// clicar na pergunta abre/fecha a resposta, sem precisar de JavaScript.

const perguntas = [
  {
    pergunta: "O que é um CRM?",
    resposta:
      "CRM quer dizer gestão de relação com clientes. É a ferramenta onde a empresa guarda os contactos dos clientes e acompanha cada negócio, do primeiro contacto à venda.",
  },
  {
    pergunta: "Os dados da minha empresa estão seguros?",
    resposta:
      "Sim. As passwords são guardadas encriptadas e a base de dados tem regras que separam as empresas: cada utilizador só consegue ler os leads da sua empresa, mesmo que tente aceder de outra forma.",
  },
  {
    pergunta: "Preciso de instalar alguma coisa?",
    resposta:
      "Não. O FlowCRM funciona no browser, no computador ou no telemóvel. Basta criar a conta.",
  },
  {
    pergunta: "Como junto a minha equipa?",
    resposta:
      "Quem cria a conta fica como dono da empresa. Na página Equipa adicionas cada pessoa com o email e uma password inicial, e escolhes se é administrador ou comercial.",
  },
  {
    pergunta: "E se me esquecer da password?",
    resposta:
      "Ao entrar pela primeira vez recebes uma chave de recuperação, que guardas no teu computador. Em Entrar › Esqueci-me da password escreves o email e a chave e escolhes uma password nova. Não precisas de esperar por nenhum email.",
  },
  {
    pergunta: "Como funciona o formulário público?",
    resposta:
      "Cada empresa recebe um link próprio, por exemplo flowcrm.app/f/a-tua-empresa. Podes pô-lo no teu site ou nas redes sociais. Quem o preencher aparece no CRM como um lead novo. Na página Formulário escolhes as perguntas, a cor e o logótipo da empresa.",
  },
  {
    pergunta: "Posso tirar os meus leads do FlowCRM?",
    resposta:
      "Sim. Na página Leads há um botão para exportar a lista em CSV, um ficheiro que abre no Excel ou no Google Sheets. Os dados são sempre da tua empresa.",
  },
];

export default function Perguntas() {
  return (
    <section id="perguntas" className={styles.seccao}>
      <CabecalhoSeccao titulo="Perguntas frequentes" />

      <div className={styles.lista}>
        {perguntas.map((p) => (
          <details key={p.pergunta} className={styles.item}>
            <summary>{p.pergunta}</summary>
            <p>{p.resposta}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
