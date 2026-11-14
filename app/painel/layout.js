import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { sair } from "@/lib/acoes/autenticacao";
import { hojeEmPortugal } from "@/lib/datas";
import { iniciais } from "@/lib/texto";
import LinkMenu from "@/components/painel/LinkMenu";
import Icone from "@/components/Icone";
import PesquisaGlobal from "@/components/painel/PesquisaGlobal";
import Sino from "@/components/painel/Sino";
import styles from "./painel.module.css";
import SimboloLogo from "@/components/SimboloLogo";

// LAYOUT do painel: envolve TODAS as páginas dentro de /painel
// (o menu lateral aparece em todas sem o repetirmos em cada página).
export const metadata = { title: "Painel · FlowCRM" };

export default async function LayoutPainel({ children }) {
  const { supabase, perfil, empresa, eAdmin } = await obterSessao();

  // Números para os contadores do menu. As duas consultas são independentes,
  // por isso o Promise.all faz as duas ao mesmo tempo (mais rápido do que uma a seguir à outra).
  // head: true = só queremos o número, não as linhas. O RLS já filtra por empresa/comercial.
  const hoje = hojeEmPortugal();
  const [{ count: nClientes }, { count: nAtrasadas }, { data: avisos, count: nAvisos }] = await Promise.all([
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
  ]);

  // Menu dividido em secções. "contador" aparece à direita do item;
  // "alerta: true" pinta-o de vermelho (tarefas em atraso).
  const seccoes = [
    {
      titulo: "Menu principal",
      itens: [
        { texto: "Painel", href: "/painel", icone: "casa" },
        { texto: "Clientes", href: "/painel/clientes", icone: "utilizadores", contador: nClientes ?? null },
        { texto: "Pipeline", href: "/painel/pipeline", icone: "subida" },
        { texto: "Tarefas", href: "/painel/tarefas", icone: "lista", contador: nAtrasadas || null, alerta: true },
        { texto: "Notificações", href: "/painel/notificacoes", icone: "sino", contador: nAvisos || null },
      ],
    },
    {
      titulo: "Empresa",
      itens: [
        // as páginas Equipa e Personalizar só aparecem ao administrador
        ...(eAdmin
          ? [
              { texto: "Equipa", href: "/painel/equipa", icone: "utilizadorMais" },
              { texto: "Personalizar", href: "/painel/personalizar", icone: "pincel" },
            ]
          : []),
        { texto: "A minha conta", href: "/painel/conta", icone: "utilizador" },
      ],
    },
  ];

  return (
    <div className={styles.estrutura}>
      <aside className={styles.lateral}>
        {/* cabeça: logótipo + empresa numa caixa, e o sino de notificações ao lado */}
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
              <strong>{empresa.nome}</strong>
              <small>
                <SimboloLogo tamanho={11} />
                <span>
                  Flow<span className={styles.crm}>CRM</span>
                </span>
              </small>
            </span>
          </Link>
          <Sino tarefas={avisos ?? []} total={nAvisos ?? 0} hoje={hoje} />
        </div>

        {/* pesquisa global de clientes (componente de cliente) */}
        <div className={styles.zonaPesquisa}>
          <PesquisaGlobal />
        </div>

        <nav className={styles.menu}>
          {seccoes.map((seccao) => (
            <div key={seccao.titulo} className={styles.seccao}>
              <p className={styles.tituloSeccao}>{seccao.titulo}</p>
              {seccao.itens.map((item) => (
                <LinkMenu key={item.href} href={item.href} className={styles.itemMenu} classeAtiva={styles.itemAtivo}>
                  <Icone nome={item.icone} tamanho={19} />
                  <span className={styles.textoItem}>{item.texto}</span>
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
            <Link href={`/f/${empresa.slug}`} target="_blank" className={styles.itemMenu}>
              <Icone nome="ligacao" tamanho={19} />
              <span className={styles.textoItem}>Formulário público</span>
              <Icone nome="externo" tamanho={14} className={styles.iconeExterno} />
            </Link>
          </div>
        </nav>

        {/* cartão do utilizador no fundo do menu */}
        <div className={styles.utilizador}>
          {/* o avatar e o nome levam à página "A minha conta" */}
          <Link href="/painel/conta" className={styles.linkConta} title="A minha conta">
            <span className={styles.avatar}>{iniciais(perfil.nome)}</span>
            <span className={styles.dadosUtilizador}>
              <strong>{perfil.nome}</strong>
              <small>{eAdmin ? "Administrador" : "Comercial"}</small>
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

      <main className={styles.conteudo}>{children}</main>
    </div>
  );
}
