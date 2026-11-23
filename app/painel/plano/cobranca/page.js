import { redirect } from "next/navigation";

// A Cobrança passou a ser uma página própria no menu: /painel/cobranca
export default function CobrancaAntiga() {
  redirect("/painel/cobranca");
}
