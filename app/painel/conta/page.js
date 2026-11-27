import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { sair } from "@/lib/acoes/autenticacao";
import { terminarSessoes } from "@/lib/acoes/conta";
import { iniciais } from "@/lib/texto";
import { FormPerfil, FormModeloEmail, FormPassword } from "@/components/conta/FormsConta";
import BotaoCopiar from "@/components/painel/BotaoCopiar";
import BlocoChave from "@/components/conta/BlocoChave";
import InterruptorAvisos from "@/components/conta/InterruptorAvisos";
import Icone from "@/components/Icone";
import styles from "./conta.module.css";

// Rota /painel/conta — dados da própria pessoa (qualquer papel pode entrar).
// Duas colunas: à esquerda o perfil e a password; à direita as sessões,
// a chave de recuperação e o link do formulário.
export const metadata = { title: "A minha conta · FlowCRM" };

const dataHora = (iso) =>
  iso
    ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" }).format(
        new Date(iso),
      )
    : "—";

export default async function PaginaConta({ searchParams }) {
  const { supabase, perfil, empresa, eAdmin, eDono } = await obterSessao();
  const parametros = await searchParams;

  // os MEUS números: clientes de que sou responsável e tarefas que tenho por fazer
  // (só números: count + head, sem trazer os clientes, para funcionar com milhares)
  const meus = (tabela) =>
    supabase.from(tabela).select("id", { count: "exact", head: true }).eq("responsavel_id", perfil.id);
  const [{ count: nClientes }, { count: nAtivos }, { count: nTarefas }, { data: extra }, { data: auth }] =
    await Promise.all([
      meus("clientes"),
      meus("clientes").eq("estado", "ativo"),
      meus("tarefas").eq("concluida", false),
      supabase.from("perfis").select("cargo, telefone").eq("id", perfil.id).single(),
      supabase.auth.getUser(),
    ]);
  const utilizador = auth?.user;

  const papel = eDono ? "Dono" : eAdmin ? "Administrador" : "Comercial";
  const linkFormulario = `/f/${empresa.slug}`;
  // nome da empresa no fim de uma frase: se já acabar em "." (ex.: "Lda."), não pomos outro
  const empresaFimFrase = empresa.nome.endsWith(".") ? empresa.nome : `${empresa.nome}.`;

  return (
    <div className={`entrar ${styles.pagina}`}>
      {/* ---------- quem sou ---------- */}
      <header className={styles.cabecalho}>
        <span className={styles.avatar} aria-hidden="true">
          {iniciais(perfil.nome)}
        </span>
        <div className={styles.quem}>
          <h1>{perfil.nome}</h1>
          <p>
            {extra?.cargo ? `${extra.cargo} · ` : ""}
            {papel} da {empresa.nome.replace(/\.$/, "")} · {perfil.email}
          </p>
        </div>
        <form action={sair}>
          <button type="submit" className="botao botao-secundario">
            <Icone nome="sair" tamanho={15} /> Terminar sessão
          </button>
        </form>
      </header>

      {/* ---------- os meus números ---------- */}
      <section className={styles.numeros} aria-label="Os meus números">
        <Link href="/painel/clientes" className={styles.numero}>
          <span>Os meus leads</span>
          <strong>{nClientes ?? 0}</strong>
        </Link>
        <Link href="/painel/clientes" className={styles.numero}>
          <span>Ativos</span>
          <strong>{nAtivos ?? 0}</strong>
        </Link>
        <Link href="/painel/tarefas" className={styles.numero}>
          <span>Tarefas por fazer</span>
          <strong>{nTarefas ?? 0}</strong>
        </Link>
      </section>

      {parametros.sessoes === "ok" && (
        <p className="alerta alerta-sucesso" role="status">
          Sessão terminada em todos os outros dispositivos. Este continua com a sessão aberta.
        </p>
      )}
      {parametros.sessoes === "erro" && (
        <p className="alerta alerta-erro" role="alert">
          Não foi possível terminar as outras sessões. Tenta outra vez.
        </p>
      )}

      <div className={styles.grelha}>
        {/* ================= coluna da esquerda ================= */}
        <div className={styles.coluna}>
          <section className={styles.cartao} aria-labelledby="t-perfil">
            <div className={styles.topoCartao}>
              <h2 id="t-perfil">Perfil</h2>
              <p>O nome, o cargo e o telefone que a tua equipa vê nos leads, nas tarefas e na página Equipa.</p>
            </div>
            <FormPerfil perfil={{ nome: perfil.nome, cargo: extra?.cargo, telefone: extra?.telefone }} />
          </section>

          <section className={styles.cartao} aria-labelledby="t-email">
            <div className={styles.topoCartao}>
              <h2 id="t-email">Definições de e-mail</h2>
              <p>
                O que escreves sempre no início dos e-mails. Ao carregar no email de um lead, o Gmail abre com este
                texto já escrito: só tens de escrever o resto.
              </p>
            </div>
            <FormModeloEmail modelo={perfil.email_modelo} />
          </section>

          <section className={styles.cartao} aria-labelledby="t-password">
            <div className={styles.topoCartao}>
              <h2 id="t-password">Password</h2>
              <p>Pedimos a password atual antes de a mudar. Usa 8 ou mais caracteres, com maiúscula, minúscula, número e símbolo.</p>
            </div>
            <FormPassword />
          </section>
        </div>

        {/* ================= coluna da direita ================= */}
        <div className={styles.coluna}>
          <section className={styles.cartao} aria-labelledby="t-sessoes">
            <div className={styles.topoCartao}>
              <h2 id="t-sessoes">Sessões e segurança</h2>
              <p>Se entraste num computador que não é teu, termina a sessão nos outros dispositivos.</p>
            </div>
            <dl className={styles.factos}>
              <div>
                <dt>Último acesso</dt>
                <dd>{dataHora(utilizador?.last_sign_in_at)}</dd>
              </div>
              <div>
                <dt>Conta criada</dt>
                <dd>{dataHora(utilizador?.created_at)}</dd>
              </div>
            </dl>
            <form action={terminarSessoes} className={styles.acoes}>
              <button type="submit" name="onde" value="outros" className="botao botao-secundario">
                Terminar nos outros dispositivos
              </button>
              <button type="submit" name="onde" value="todos" className={styles.botaoPerigo}>
                Terminar em todos
              </button>
            </form>
          </section>

          <section className={styles.cartao} aria-labelledby="t-avisos">
            <div className={styles.topoCartao}>
              <h2 id="t-avisos">Avisos</h2>
              <p>Recebe um aviso no telemóvel ou no computador mesmo com o FlowCRM fechado.</p>
            </div>
            <InterruptorAvisos />
          </section>

          <section className={styles.cartao} aria-labelledby="t-chave">
            <div className={styles.topoCartao}>
              <h2 id="t-chave">Chave de recuperação</h2>
              <p>Serve para recuperar a password em Entrar › Esqueci-me da password. Se a perdeste, gera uma nova.</p>
            </div>
            <BlocoChave email={perfil.email} />
          </section>

          <section className={styles.cartao} aria-labelledby="t-link">
            <div className={styles.topoCartao}>
              <h2 id="t-link">Formulário público</h2>
              <p>Quem o preencher entra como lead novo no CRM da {empresaFimFrase}</p>
            </div>
            <div className={styles.link}>
              <code>{linkFormulario}</code>
              <div className={styles.acoes}>
                <BotaoCopiar caminho={linkFormulario} className="botao botao-secundario" />
                <Link href={linkFormulario} target="_blank" className="botao botao-secundario">
                  Abrir <Icone nome="externo" tamanho={14} />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
