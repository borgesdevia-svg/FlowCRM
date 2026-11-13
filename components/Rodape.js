import Link from "next/link";
import Icone from "@/components/Icone";
import styles from "./Rodape.module.css";
import SimboloLogo from "@/components/SimboloLogo";

// Rodapé das páginas públicas: marca, colunas de links, contactos e informação legal.
// ATENÇÃO: o email de contacto é um exemplo (o domínio flowcrm.pt não é nosso).
// Antes da defesa, trocar por um email real do projeto ou retirar.
const EMAIL_CONTACTO = "contacto@flowcrm.pt";

const colunas = [
  {
    titulo: "Produto",
    links: [
      { texto: "O que é", href: "/#o-que-e" },
      { texto: "Funcionalidades", href: "/#funcionalidades" },
      { texto: "Como funciona", href: "/#como-funciona" },
      { texto: "Perguntas frequentes", href: "/#perguntas" },
    ],
  },
  {
    titulo: "Conta",
    links: [
      { texto: "Entrar", href: "/login" },
      { texto: "Começar grátis", href: "/registo" },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { texto: "Privacidade", href: "/privacidade" },
      { texto: "Termos de utilização", href: "/privacidade#termos" },
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
            <SimboloLogo tamanho={20} className={styles.simbolo} />
            <span>
              Flow<span className={styles.crm}>CRM</span>
            </span>
          </Link>
          <p>Gestão de clientes e vendas para pequenas equipas comerciais.</p>

          {/* contacto: "mailto:" abre o programa de email de quem clica */}
          <a href={`mailto:${EMAIL_CONTACTO}`} className={styles.contacto}>
            <Icone nome="email" tamanho={16} />
            {EMAIL_CONTACTO}
          </a>
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
        <p>© {ano} FlowCRM. Todos os direitos reservados.</p>
        <p>Feito em Portugal</p>
      </div>
    </footer>
  );
}
