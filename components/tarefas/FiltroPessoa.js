"use client";
// Lista de escolha "Toda a equipa / Eu / Ana / ..." (só para o admin), usada na
// página Tarefas e no Calendário. Ao escolher, muda o ?pessoa= do endereço
// (e volta à primeira página); o servidor faz o resto.
// É de cliente porque reage à escolha sem ser preciso carregar num botão.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./FiltroPessoa.module.css";

export default function FiltroPessoa({ membros, perfilId, atual }) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();

  function escolher(evento) {
    const novos = new URLSearchParams(parametros);
    if (evento.target.value) novos.set("pessoa", evento.target.value);
    else novos.delete("pessoa");
    novos.delete("pagina");
    const texto = novos.toString();
    router.push(texto ? `${caminho}?${texto}` : caminho);
  }

  return (
    <div className={`campo ${styles.filtro}`}>
      <label htmlFor="filtro-pessoa" className={styles.escondido}>
        Responsável
      </label>
      <select id="filtro-pessoa" value={atual} onChange={escolher}>
        <option value="">Toda a equipa</option>
        {membros.map((m) => (
          <option key={m.id} value={m.id}>
            {m.id === perfilId ? "Eu" : m.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
