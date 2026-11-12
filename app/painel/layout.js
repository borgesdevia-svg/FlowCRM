import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { sair } from "@/lib/acoes/autenticacao";
import LinkMenu from "@/components/painel/LinkMenu";
import styles from "./painel.module.css";

// LAYOUT do painel: envolve TODAS as páginas dentro de /painel
// (o menu lateral aparece em todas sem o repetirmos em cada página).
export const metadata = { title: "Painel · FlowCRM" };

export default async function LayoutPainel({ children }) {
  const { perfil, empresa, eAdmin } = await obterSessao();

  // itens do menu; "breve" = ainda não feito (fases seguintes)
  const menu = [
    { texto: "Painel", href: "/painel" },
    { texto: "Clientes", href: "/painel/clientes" },
    // a página da equipa só aparece ao admin
    ...(eAdmin ? [{ texto: "Equipa", href: "/painel/equipa" }] : []),
  ];

  // iniciais para o "avatar" (ex.: "Ana Costa" -> "AC")
  const iniciais = perfil.nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");

  return (
    <div className={styles.estrutura}>
      <aside className={styles.lateral}>
        <Link href="/painel" className={styles.logo}>
          <span className={styles.simbolo} aria-hidden="true"></span>
          <span>
            Flow<span className={styles.crm}>CRM</span>
          </span>
        </Link>

        <div className={styles.empresa}>
          <span className={styles.logoEmpresa}>{empresa.nome[0].toUpperCase()}</span>
          <span className={styles.nomeEmpresa}>{empresa.nome}</span>
        </div>

        <nav className={styles.menu}>
          {menu.map((item) =>
            item.breve ? (
              <span key={item.href} className={`${styles.itemMenu} ${styles.desativado}`}>
                {item.texto} <small>em breve</small>
              </span>
            ) : (
              <LinkMenu key={item.href} href={item.href} className={styles.itemMenu} classeAtiva={styles.itemAtivo}>
                {item.texto}
              </LinkMenu>
            )
          )}
        </nav>

        <div className={styles.utilizador}>
          {/* o avatar e o nome levam à página "A minha conta" */}
          <Link href="/painel/conta" className={styles.linkConta} title="A minha conta">
            <span className={styles.avatar}>{iniciais}</span>
            <span className={styles.dadosUtilizador}>
              <strong>{perfil.nome}</strong>
              <small>{eAdmin ? "Administrador" : "Comercial"}</small>
            </span>
          </Link>
          {/* logout: o formulário chama a Server Action "sair" */}
          <form action={sair}>
            <button type="submit" className={styles.sair} title="Terminar sessão">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className={styles.conteudo}>{children}</main>
    </div>
  );
}
