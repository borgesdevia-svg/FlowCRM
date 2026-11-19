"use client";
// Barra no topo do conteúdo do painel (estilo Octax): à esquerda o "caminho" da página
// atual (ex.: Clientes › Importar), à direita o sino e o atalho para a conta.
// É de cliente porque lê o endereço atual com usePathname().
// Props:
//  - itens: [{ href, nome }] do menu (com os nomes escolhidos em Configurações)
//  - children: o que fica à direita (o sino, feito no servidor com os dados)

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icone from "@/components/Icone";
import styles from "./BarraTopo.module.css";

// nomes das subpáginas (o resto do endereço depois do item do menu)
const SUBPAGINAS = {
  novo: "Novo",
  importar: "Importar",
  calendario: "Calendário",
  fila: "Fila",
};

export default function BarraTopo({ itens, children }) {
  const caminho = usePathname();

  // o item do menu com o endereço mais comprido que encaixa no atual
  // ("/painel/clientes/123" -> "Clientes"; "/painel" só na própria página)
  const atual = itens
    .filter((i) => (i.href === "/painel" ? caminho === "/painel" : caminho.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const resto = atual && atual.href !== "/painel" ? caminho.slice(atual.href.length).split("/").filter(Boolean) : [];
  // um id (ex.: ficha de um cliente) aparece como "Detalhe"
  const sub = resto[0] ? (SUBPAGINAS[resto[0]] ?? "Detalhe") : null;

  return (
    <header className={styles.barra}>
      <nav aria-label="Onde estás" className={styles.caminho}>
        <Link href="/painel" className={styles.casa} aria-label="Início">
          <Icone nome="grelha" tamanho={16} />
        </Link>
        {atual && (
          <>
            <Icone nome="direita" tamanho={14} className={styles.seta} />
            {sub ? (
              <Link href={atual.href} className={styles.passo}>
                {atual.nome}
              </Link>
            ) : (
              <span className={styles.passoAtual} aria-current="page">
                {atual.nome}
              </span>
            )}
          </>
        )}
        {sub && (
          <>
            <Icone nome="direita" tamanho={14} className={styles.seta} />
            <span className={styles.passoAtual} aria-current="page">
              {sub}
            </span>
          </>
        )}
      </nav>
      <div className={styles.acoes}>{children}</div>
    </header>
  );
}
