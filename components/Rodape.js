import Link from "next/link";
import styles from "./Rodape.module.css";

// Rodapé das páginas públicas, com colunas de links.
const colunas = [
  {
    titulo: "Produto",
    links: [
      { texto: "Funcionalidades", href: "/#funcionalidades" },
      { texto: "Como funciona", href: "/#como-funciona" },
    ],
  },
  {
    titulo: "Conta",
    links: [
      { texto: "Entrar", href: "/login" },
      { texto: "Criar conta", href: "/registo" },
    ],
  },
];

export default function Rodape() {
  // ano atual, calculado quando a página é gerada
  const ano = new Date().getFullYear();

  return (
    <footer className={styles.rodape}>
      <div className={styles.interior}>
        <div className={styles.marca}>
          <Link href="/" className={styles.logo}>
            <span className={styles.simbolo} aria-hidden="true"></span>
            <span>
              Flow<span className={styles.crm}>CRM</span>
            </span>
          </Link>
          <p>Gestão de clientes e automação de emails para pequenas equipas comerciais.</p>
        </div>

        {colunas.map((coluna) => (
          <div key={coluna.titulo} className={styles.coluna}>
            <h4>{coluna.titulo}</h4>
            {coluna.links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.texto}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.fundo}>
        <p>© {ano} FlowCRM</p>
        <p>Projeto PAP · Técnico de Gestão e Programação de Sistemas Informáticos</p>
      </div>
    </footer>
  );
}
