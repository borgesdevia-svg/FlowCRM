import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { sair } from "@/lib/acoes/autenticacao";
import { FormNome, FormPassword } from "@/components/conta/FormsConta";
import BotaoCopiar from "@/components/painel/BotaoCopiar";
import Icone from "@/components/Icone";
import styles from "./conta.module.css";

// Rota /painel/conta — dados da própria pessoa (qualquer papel pode entrar).
export const metadata = { title: "A minha conta · FlowCRM" };

export default async function PaginaConta() {
  const { supabase, perfil, empresa, eAdmin } = await obterSessao();

  // os MEUS números: clientes de que sou responsável e tarefas que tenho por fazer
  const [{ data: meusClientes }, { count: nTarefas }] = await Promise.all([
    supabase.from("clientes").select("estado").eq("responsavel_id", perfil.id),
    supabase
      .from("tarefas")
      .select("id", { count: "exact", head: true })
      .eq("responsavel_id", perfil.id)
      .eq("concluida", false),
  ]);
  const nClientes = meusClientes?.length ?? 0;
  const nAtivos = (meusClientes ?? []).filter((c) => c.estado === "ativo").length;

  const linkFormulario = `/f/${empresa.slug}`;
  // nome da empresa no fim de uma frase: se já acabar em "." (ex.: "Lda."), não pomos outro
  const empresaFimFrase = empresa.nome.endsWith(".") ? empresa.nome : `${empresa.nome}.`;

  return (
    <div className={`entrar ${styles.pagina}`}>
      {/* cabeçalho igual ao das outras páginas: quem sou e em que empresa */}
      <header className={styles.cabecalho}>
        <div>
          <h1>A minha conta</h1>
          <p className={styles.resumo}>
            Entras com {perfil.email}, como {eAdmin ? "admin" : "comercial"} da {empresaFimFrase}
          </p>
        </div>
      </header>

      {/* os meus números, como os contadores da página Tarefas */}
      <section className={styles.contadores} aria-label="Os meus números">
        <div className={styles.contador}>
          <strong>{nClientes}</strong>
          <span>Os meus clientes</span>
        </div>
        <div className={styles.contador}>
          <strong>{nAtivos}</strong>
          <span>Ativos</span>
        </div>
        <div className={styles.contador}>
          <strong>{nTarefas ?? 0}</strong>
          <span>Tarefas por fazer</span>
        </div>
      </section>

      {/* ---------- blocos: descrição à esquerda, formulário à direita ---------- */}
      <section className={styles.bloco}>
        <div className={styles.descricao}>
          <h2>
            <Icone nome="utilizador" tamanho={18} /> Nome
          </h2>
          <p>É o nome que a tua equipa vê nos clientes, nas tarefas e no histórico.</p>
        </div>
        <FormNome nomeAtual={perfil.nome} />
      </section>

      <section className={styles.bloco}>
        <div className={styles.descricao}>
          <h2>
            <Icone nome="cadeado" tamanho={18} /> Password
          </h2>
          <p>Para tua segurança, pedimos a password atual antes de a mudar. Usa pelo menos 8 caracteres.</p>
        </div>
        <FormPassword />
      </section>

      <section className={styles.bloco}>
        <div className={styles.descricao}>
          <h2>
            <Icone nome="ligacao" tamanho={18} /> Formulário público
          </h2>
          <p>Partilha este link: quem o preencher entra como cliente novo no CRM da {empresaFimFrase}</p>
        </div>
        <div className={styles.link}>
          <code>{linkFormulario}</code>
          <div className={styles.acoesLink}>
            <BotaoCopiar caminho={linkFormulario} className="botao" />
            <Link href={linkFormulario} target="_blank" className="botao botao-secundario">
              Abrir <Icone nome="externo" tamanho={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.bloco}>
        <div className={styles.descricao}>
          <h2>
            <Icone nome="sair" tamanho={18} /> Sessão
          </h2>
          <p>Termina a sessão neste dispositivo, por exemplo num computador partilhado.</p>
        </div>
        {/* logout: o formulário chama a Server Action "sair" */}
        <form action={sair} className={styles.formSair}>
          <button type="submit" className={styles.botaoSair}>
            <Icone nome="sair" tamanho={16} /> Terminar sessão
          </button>
        </form>
      </section>
    </div>
  );
}
