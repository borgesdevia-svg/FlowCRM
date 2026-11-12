import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { sair } from "@/lib/acoes/autenticacao";
import { iniciais } from "@/lib/texto";
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

  return (
    <div className={styles.pagina}>
      {/* ---------- cartão de perfil ---------- */}
      <header className={`entrar ${styles.perfil}`}>
        <span className={styles.avatar}>{iniciais(perfil.nome)}</span>
        <div className={styles.quem}>
          <span className={eAdmin ? styles.papelAdmin : styles.papel}>
            {eAdmin ? "Administrador" : "Comercial"}
          </span>
          <h1>{perfil.nome}</h1>
          <p>
            {perfil.email} <span>·</span> {empresa.nome}
          </p>
        </div>

        {/* os meus números */}
        <dl className={styles.numeros}>
          <div>
            <dt>Os meus clientes</dt>
            <dd>{nClientes}</dd>
          </div>
          <div>
            <dt>Ativos</dt>
            <dd>{nAtivos}</dd>
          </div>
          <div>
            <dt>Tarefas por fazer</dt>
            <dd>{nTarefas ?? 0}</dd>
          </div>
        </dl>
      </header>

      {/* ---------- blocos: descrição à esquerda, formulário à direita ---------- */}
      <section className={`entrar ${styles.bloco}`} style={{ "--atraso": "80ms" }}>
        <div className={styles.descricao}>
          <h2>
            <Icone nome="utilizador" tamanho={18} /> Nome
          </h2>
          <p>É o nome que a tua equipa vê nos clientes, nas tarefas e no histórico.</p>
        </div>
        <FormNome nomeAtual={perfil.nome} />
      </section>

      <section className={`entrar ${styles.bloco}`} style={{ "--atraso": "130ms" }}>
        <div className={styles.descricao}>
          <h2>
            <Icone nome="cadeado" tamanho={18} /> Password
          </h2>
          <p>Para tua segurança, pedimos a password atual antes de a mudar. Usa pelo menos 8 caracteres.</p>
        </div>
        <FormPassword />
      </section>

      <section className={`entrar ${styles.bloco}`} style={{ "--atraso": "180ms" }}>
        <div className={styles.descricao}>
          <h2>
            <Icone nome="ligacao" tamanho={18} /> Formulário público
          </h2>
          <p>Partilha este link: quem o preencher entra como cliente novo no CRM da {empresa.nome}.</p>
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

      <section className={`entrar ${styles.bloco}`} style={{ "--atraso": "230ms" }}>
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
