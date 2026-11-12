"use client";
// Link do menu lateral que fica realçado quando estamos nessa página.
// É de cliente porque usa usePathname(), que lê o endereço atual no browser.

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LinkMenu({ href, className, classeAtiva, children }) {
  const caminho = usePathname();

  // "/painel" só fica ativo na própria página; os outros também nas subpáginas
  // (ex.: /painel/clientes/123 mantém "Clientes" realçado)
  const ativo = href === "/painel" ? caminho === href : caminho.startsWith(href);

  return (
    <Link
      href={href}
      className={ativo ? `${className} ${classeAtiva}` : className}
      // aria-current diz aos leitores de ecrã qual é a página atual
      aria-current={ativo ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
