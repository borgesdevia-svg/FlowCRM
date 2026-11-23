import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { obterSessao, obterAparencia } from "@/lib/sessao";
import { SECCOES_MENU, cssAparencia, itensDoMenu, varianteDe } from "@/lib/aparencia";
import { sair } from "@/lib/acoes/autenticacao";
import { hojeEmPortugal } from "@/lib/datas";
import { iniciais } from "@/lib/texto";
import LinkMenu from "@/components/painel/LinkMenu";
import Icone from "@/components/Icone";
import PesquisaGlobal from "@/components/painel/PesquisaGlobal";
import Sino from "@/components/painel/Sino";
import styles from "./painel.module.css";
import SimboloLogo from "@/components/SimboloLogo";
import Tutorial from "@/components/painel/Tutorial";
import BarraTopo from "@/components/painel/BarraTopo";
import JanelaChave from "@/components/painel/JanelaChave";
import BotaoInstalar from "@/components/painel/BotaoInstalar";
import { EtiquetaPro } from "@/components/painel/AvisoPro";
import { precisaDeChave } from "@/lib/estadoChave";
import AvisoTeste from "@/components/painel/AvisoTeste";
import { COOKIE_AVISO_TESTE, avisoPlano, textoDiasRestantes } from "@/lib/planos";
import { formatarData } from "@/lib/estados";

// páginas que abrem com a empresa bloqueada (o resto manda para o Plano)
const PAGINAS_COM_BLOQUEIO = ["/painel/plano", "/painel/cobranca", "/painel/conta"];
const ITEM_PLANO = { id: "plano", nome: "Plano", href: "/painel/plano", icone: "moedas" };

// LAYOUT do painel: envolve TODAS as páginas dentro de /painel
// (o menu lateral aparece em todas sem o repetirmos em cada página).
export const metadata = { title: "Painel · FlowCRM" };

// Na app instalada, a barra do topo (hora, bateria) fica da cor do fundo do painel:
// clara ou escura, conforme o tema que a empresa escolheu em Configurações.
// (obterAparencia tem cache: o layout reaproveita a mesma consulta)
export async function generateViewport() {
  const aparencia = await obterAparencia();
  return { themeColor: varianteDe(aparencia).conteudo["--cor-fundo"] ?? "#0f1115" };
}

export default async function LayoutPainel({ children }) {
  const { supabase, perfil, empresa, eAdmin, eDono, tutorialVisto, plano } = await obterSessao();

  // Empresa bloqueada (acabou o teste ou a assinatura sem pagar): só abre o Plano
  // (escolher e pagar, exportar os leads) e A minha conta. A base de dados também
  // recusa mudanças (migração 29), isto é para a pessoa ver logo o que fazer.
  const bloqueada = plano.bloqueada;
  const caminho = (await headers()).get("x-caminho") ?? "";
  if (bloqueada && caminho && !PAGINAS_COM_BLOQUEIO.some((p) => caminho.startsWith(p))) {
    redirect("/painel/plano");
  }

  // aviso do teste do Pro: nos últimos dias antes de acabar (lib/planos.js)
  const dadosAviso = eAdmin ? avisoPlano(plano) : null;
  const avisoFechado = (await cookies()).get(COOKIE_AVISO_TESTE)?.value;
  const aviso =
    dadosAviso && dadosAviso.chave !== avisoFechado
      ? {
          ...dadosAviso,
          texto: `O teste do CRM Pro acaba a ${formatarData(plano.fimTeste)} (${textoDiasRestantes(plano.diasRestantes)}). Escolhe um plano para continuar a usar o CRM; os dados ficam todos.`,
        }
      : null;
  const pedidoAparencia = obterAparencia(); // começa já, em paralelo com as contagens

  // Números para os contadores do menu. As duas consultas são independentes,
  // por isso o Promise.all faz as duas ao mesmo tempo (mais rápido do que uma a seguir à outra).
  // head: true = só queremos o número, não as linhas. O RLS já filtra por empresa/comercial.
  const hoje = hojeEmPortugal();
  const [
    { count: nClientes },
    { count: nAtrasadas },
    { data: avisos, count: nAvisos },
    { data: semResponsavel, count: nSemResponsavel },
    { data: equipa },
    mostrarChave, // ainda não tem chave de recuperação guardada? (mostra a janela)
  ] = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase
      .from("tarefas")
      .select("id", { count: "exact", head: true })
      .eq("responsavel_id", perfil.id)
      .eq("concluida", false)
      .lt("data_limite", hoje), // lt = "less than": data limite anterior a hoje
    // para o sino: as minhas tarefas por fazer em atraso OU que acabam hoje
    // (lte = "less than or equal": até hoje, inclusive). As mais antigas primeiro.
    // Só vêm 5 (o sino é pequeno); o total vem no count e as outras estão em /painel/notificacoes
    supabase
      .from("tarefas")
      .select("id, titulo, data_limite, cliente_id, clientes(nome)", { count: "exact" })
      .eq("responsavel_id", perfil.id)
      .eq("concluida", false)
      .lte("data_limite", hoje)
      .order("data_limite", { ascending: true })
      .limit(5),
    // só para administradores: clientes que chegaram SEM responsável (os que esperam há
    // mais tempo primeiro) e a equipa, para os poderem entregar a alguém ali mesmo no sino
    eAdmin
      ? supabase
          .from("clientes")
          .select("id, nome, criado_em", { count: "exact" })
          .is("responsavel_id", null)
          .order("criado_em", { ascending: true })
          .limit(5)
      : { data: [], count: 0 },
    eAdmin ? supabase.from("perfis").select("id, nome").order("nome") : { data: [] },
    precisaDeChave(perfil.id),
  ]);
  const aparencia = await pedidoAparencia;
  const totalAvisos = (nAvisos ?? 0) + (nSemResponsavel ?? 0);

  // Menu dividido em secções. O nome e a ordem de cada item vêm das Configurações
  // da empresa (lib/aparencia.js). "contador" aparece à direita do item;
  // "alerta: true" pinta-o de vermelho (tarefas em atraso).
  const contadores = {
    clientes: { contador: nClientes ?? null },
    tarefas: { contador: nAtrasadas || null, alerta: true },
    notificacoes: { contador: totalAvisos || null },
  };
  const seccoes = bloqueada
    ? [{ titulo: "Empresa", itens: [ITEM_PLANO, ...itensDoMenu(aparencia, "empresa").filter((i) => i.id === "conta" || (eAdmin && i.id === "cobranca"))] }]
    : SECCOES_MENU.map(({ chave, titulo }) => ({
        titulo,
        itens: itensDoMenu(aparencia, chave)
          // Equipa, Automações, Formulário e Configurações só aparecem ao administrador
          .filter((item) => eAdmin || !item.admin)
          .map((item) => ({ ...item, ...contadores[item.id] })),
      }));

  return (
    <div className={styles.estrutura}>
      {/* cores do modelo de design e da cor de destaque escolhidos em Configurações.
          Só existe enquanto se está no painel: ao sair para o site, volta o aspeto normal.
          O CSS é montado a partir de listas fixas (lib/aparencia.js), nunca de texto escrito pelo utilizador. */}
      <style>{cssAparencia(aparencia)}</style>
      <aside className={`painel-lateral ${styles.lateral}`}>
        {/* cabeça: o "espaço de trabalho" (logótipo + nome da empresa), ao estilo do Linear */}
        <div className={styles.topoMenu}>
          <Link href="/painel" className={styles.marca}>
            {/* logótipo da empresa (se o administrador o enviou) ou a inicial do nome */}
            {empresa.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={empresa.logo_url} alt="" className={styles.logoEmpresa} />
            ) : (
              <span className={styles.simbolo} aria-hidden="true">
                {empresa.nome[0].toUpperCase()}
              </span>
            )}
            <span className={styles.textoMarca}>
              <strong title={empresa.nome}>{empresa.nome}</strong>
              <small>
                <SimboloLogo tamanho={11} />
                <span>
                  Flow<span className={styles.crm}>CRM</span>
                </span>
              </small>
            </span>
          </Link>
        </div>

        {/* pesquisa global de clientes (componente de cliente) */}
        {!bloqueada && (
          <div className={styles.zonaPesquisa} data-tutorial="pesquisa">
            <PesquisaGlobal />
          </div>
        )}

        <nav className={styles.menu}>
          {seccoes.map((seccao) => (
            <div key={seccao.titulo} className={styles.seccao}>
              <p className={styles.tituloSeccao}>{seccao.titulo}</p>
              {seccao.itens.map((item) => (
                <LinkMenu key={item.href} href={item.href} className={styles.itemMenu} classeAtiva={styles.itemAtivo} tutorial={item.tutorial}>
                  <Icone nome={item.icone} tamanho={19} />
                  <span className={styles.textoItem}>{item.nome}</span>
                  {/* função do CRM Pro numa empresa que não o tem */}
                  {item.pro && !plano.pro && <EtiquetaPro />}
                  {item.contador ? (
                    <span className={item.alerta ? `${styles.contador} ${styles.contadorAlerta}` : styles.contador}>
                      {item.contador}
                    </span>
                  ) : null}
                </LinkMenu>
              ))}
            </div>
          ))}

          {/* link para o formulário público: abre num separador novo (target="_blank") */}
          <div className={styles.seccao}>
            <p className={styles.tituloSeccao}>Ferramentas</p>
            <Link href={`/f/${empresa.slug}`} target="_blank" className={styles.itemMenu} data-tutorial="formulario">
              <Icone nome="ligacao" tamanho={19} />
              <span className={styles.textoItem}>Formulário público</span>
              <Icone nome="externo" tamanho={14} className={styles.iconeExterno} />
            </Link>
            {/* tutorial de boas-vindas: abre sozinho na primeira entrada; o botão deixa revê-lo */}
            {/* (só depois de a chave de recuperação estar guardada, para as duas janelas não chocarem) */}
            {!bloqueada && (
              <Tutorial mostrarAoEntrar={!tutorialVisto && !mostrarChave} nome={perfil.nome} eAdmin={eAdmin} className={styles.itemMenu} />
            )}
            {/* só aparece se o browser deixar instalar (ou no iPhone, com os passos) */}
            <BotaoInstalar className={styles.itemMenu} />
          </div>
        </nav>

        {/* cartão do utilizador no fundo do menu */}
        <div className={styles.utilizador}>
          {/* o avatar e o nome levam à página "A minha conta" */}
          <Link href="/painel/conta" className={styles.linkConta} title="A minha conta">
            <span className={styles.avatar}>{iniciais(perfil.nome)}</span>
            <span className={styles.dadosUtilizador}>
              <strong>{perfil.nome}</strong>
              <small>{eDono ? "Dono" : eAdmin ? "Administrador" : "Comercial"}</small>
            </span>
          </Link>
          {/* logout: o formulário chama a Server Action "sair" */}
          <form action={sair}>
            <button type="submit" className={styles.sair} title="Terminar sessão" aria-label="Terminar sessão">
              <Icone nome="sair" tamanho={17} />
            </button>
          </form>
        </div>
      </aside>

      <div className={styles.coluna}>
        {/* barra de topo: onde estou (Clientes › Importar) + sino + conta */}
        <BarraTopo
          itens={[
            ...seccoes.flatMap((s) => s.itens).map(({ href, nome }) => ({ href, nome })),
            // fora do menu (abre-se em Configurações e nos avisos); bloqueada já está no menu
            ...(bloqueada ? [] : [{ href: "/painel/plano", nome: "Plano" }]),
          ]}
        >
          {!bloqueada && (
            <>
              <Link href="/painel/clientes/novo" className={`botao ${styles.botaoTopo}`} data-tutorial="novoLead">
                <Icone nome="mais" tamanho={16} /> Novo lead
              </Link>
              <Sino
                tarefas={avisos ?? []}
                semResponsavel={semResponsavel ?? []}
                nSemResponsavel={nSemResponsavel ?? 0}
                equipa={equipa ?? []}
                total={totalAvisos}
                hoje={hoje}
              />
            </>
          )}
          <Link href="/painel/conta" className={styles.avatarTopo} title="A minha conta" aria-label="A minha conta">
            {iniciais(perfil.nome)}
          </Link>
        </BarraTopo>

        {/* "painel-conteudo": usa a animação de entrada curta (globals.css) */}
        <main className={`painel-conteudo ${styles.conteudo}`}>
          {/* aviso do fim do teste do CRM Pro (só administradores, até o fecharem) */}
          {aviso && <AvisoTeste tipo={aviso.tipo} chave={aviso.chave} texto={aviso.texto} />}
          {children}
        </main>
      </div>

      {/* chave de recuperação da password: aparece até a pessoa confirmar que a guardou */}
      {mostrarChave && <JanelaChave email={perfil.email} />}
    </div>
  );
}
