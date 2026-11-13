"use client";
// Pequeno sinal de "a carregar" dentro de um <Link>.
// Assim que se clica, o Link fica "pendente" até a página nova chegar;
// este componente lê esse estado (useLinkStatus) e liga a classe "classeAtiva".
// Usado nos separadores da página Clientes: o traço verde aparece logo no clique.
import { useLinkStatus } from "next/link";

export default function IndicadorLink({ className, classeAtiva }) {
  const { pending } = useLinkStatus();
  return <em aria-hidden="true" className={pending ? `${className} ${classeAtiva}` : className}></em>;
}
