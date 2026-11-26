"use client";
// Caixa "Ordenar" da lista de leads. A ordem vive no URL (?ordem=valor), como a pesquisa
// e o filtro: ao escolher, muda o URL e a página (de servidor) volta a pedir a lista.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ORDENS_LEADS } from "@/lib/ordemLeads";
import styles from "./OrdenarLeads.module.css";

export default function OrdenarLeads({ ordem }) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();

  function mudar(nova) {
    const params = new URLSearchParams(parametros);
    if (nova === ORDENS_LEADS[0].chave) params.delete("ordem");
    else params.set("ordem", nova);
    params.delete("pagina"); // nova ordem: volta à primeira página
    const texto = params.toString();
    router.push(`${caminho}${texto ? `?${texto}` : ""}`);
  }

  return (
    <label className={styles.ordenar}>
      <span>Ordenar</span>
      <select value={ordem} onChange={(e) => mudar(e.target.value)}>
        {ORDENS_LEADS.map((o) => (
          <option key={o.chave} value={o.chave}>
            {o.texto}
          </option>
        ))}
      </select>
    </label>
  );
}
