import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import FormMembro from "@/components/equipa/FormMembro";
import Icone from "@/components/Icone";
import styles from "../equipa.module.css";

// Rota /painel/equipa/novo — o administrador adiciona alguém à equipa.
// Está numa página à parte da tabela, para a lista da equipa ficar com a largura toda.
export const metadata = { title: "Adicionar membro · FlowCRM" };

// o que cada papel pode fazer (ajuda a escolher o papel do membro novo)
const PAPEIS = [
  {
    nome: "Dono",
    itens: ["Quem criou a empresa no FlowCRM", "Pode fazer tudo o que um administrador faz", "Ninguém o pode remover"],
  },
  {
    nome: "Administrador",
    itens: ["Vê todos os leads da empresa", "Atribui leads aos comerciais", "Gere a equipa e personaliza o CRM"],
  },
  {
    nome: "Comercial",
    itens: ["Vê só os leads de que é responsável", "Gere as suas tarefas e notas"],
  },
];

export default async function PaginaNovoMembro() {
  const { eAdmin } = await obterSessao();
  // proteção no servidor: um comercial que escreva o endereço à mão volta ao painel
  if (!eAdmin) redirect("/painel");

  return (
    <div className={`entrar ${styles.pagina} ${styles.paginaEstreita}`}>
      <header className={styles.cabecalho}>
        <Link href="/painel/equipa" className={styles.voltar}>
          Equipa
        </Link>
        <h1>Adicionar membro</h1>
        <p className={styles.resumo}>A conta fica logo ativa. Depois, partilha o email e a password com essa pessoa.</p>
      </header>

      <div className={styles.grelhaNovo}>
        <section className={styles.bloco}>
          <h2>
            <Icone nome="utilizadorMais" tamanho={19} /> Dados do membro
          </h2>
          <p className={styles.ajuda}>Podes mudar o papel mais tarde, na tabela da equipa.</p>
          <FormMembro />
        </section>

        <section className={styles.bloco}>
          <h2>
            <Icone nome="cadeado" tamanho={18} /> Papéis
          </h2>
          <div className={styles.papeis}>
            {PAPEIS.map((p) => (
              <div key={p.nome}>
                <h3>{p.nome}</h3>
                <ul>
                  {p.itens.map((item) => (
                    <li key={item}>
                      <Icone nome="visto" tamanho={15} className={styles.visto} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
