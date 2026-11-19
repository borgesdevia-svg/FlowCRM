import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import ImportarClientes from "@/components/clientes/ImportarClientes";
import styles from "./importar.module.css";

// Rota /painel/clientes/importar — trazer clientes de um ficheiro CSV (Excel, Google Sheets
// ou o próprio "Exportar" do FlowCRM).
export const metadata = { title: "Importar clientes · FlowCRM" };

export default async function PaginaImportar() {
  const { supabase, perfil, eAdmin } = await obterSessao();

  // o admin escolhe quem fica responsável pelos clientes importados
  let membros = null;
  if (eAdmin) {
    const { data } = await supabase.from("perfis").select("id, nome").order("nome");
    membros = (data ?? []).map((m) => (m.id === perfil.id ? { ...m, nome: `${m.nome} (eu)` } : m));
  }

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <Link href="/painel/clientes" className={styles.voltar}>
          Clientes
        </Link>
        <h1>Importar clientes</h1>
        <p className={styles.resumo}>
          Escolhe um ficheiro CSV. Antes de gravar, vês quantos clientes entram e que linhas têm problemas.
        </p>
      </header>

      <ImportarClientes membros={membros} perfilId={perfil.id} />
    </div>
  );
}
