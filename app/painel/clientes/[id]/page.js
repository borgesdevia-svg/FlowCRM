import Link from "next/link";
import { notFound } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { obterEstado, formatarData } from "@/lib/estados";
import FormCliente from "@/components/clientes/FormCliente";
import BotaoApagarCliente from "@/components/clientes/BotaoApagarCliente";
import Historico from "@/components/clientes/Historico";
import FormTarefa from "@/components/tarefas/FormTarefa";
import ListaTarefas from "@/components/tarefas/ListaTarefas";
import styles from "../ficha.module.css";

// Rota DINÂMICA /painel/clientes/[id] — a pasta [id] apanha qualquer valor no URL.
// Ex.: /painel/clientes/3f2a...  ->  params.id = "3f2a..."
export const metadata = { title: "Cliente · FlowCRM" };

const REGEX_UUID = /^[0-9a-f-]{36}$/i;

export default async function PaginaCliente({ params }) {
  const { id } = await params;
  if (!REGEX_UUID.test(id)) notFound();

  const { supabase, perfil, eAdmin } = await obterSessao();

  // se o cliente não existir OU for de outra empresa/de outro comercial,
  // o RLS não o devolve e mostramos a página "não encontrado"
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nome, email, telefone, estado, valor_previsto, responsavel_id, origem, criado_em")
    .eq("id", id)
    .maybeSingle();

  if (!cliente) notFound();

  let membros = null;
  if (eAdmin) {
    const { data } = await supabase.from("perfis").select("id, nome").order("nome");
    membros = data ?? [];
  }

  // notas deste cliente, da mais recente para a mais antiga, com o nome do autor
  const { data: interacoes } = await supabase
    .from("interacoes")
    .select("id, tipo, nota, criado_em, autor_id, perfis(nome)")
    .eq("cliente_id", id)
    .order("criado_em", { ascending: false });

  // tarefas deste cliente: primeiro as por fazer, depois por data limite
  const { data: tarefas } = await supabase
    .from("tarefas")
    .select("id, cliente_id, titulo, data_limite, concluida")
    .eq("cliente_id", id)
    .order("concluida")
    .order("data_limite", { ascending: true, nullsFirst: false });

  const est = obterEstado(cliente.estado);

  return (
    <div className={styles.pagina}>
      <Link href="/painel/clientes" className={styles.voltar}>
        Clientes
      </Link>

      <h1>{cliente.nome}</h1>
      <p className={styles.meta}>
        <span className={styles.estado}>
          <i style={{ background: est.cor }}></i>
          {est.texto}
        </span>
        <span>
          {cliente.origem === "formulario" ? "Chegou pelo formulário público" : "Adicionado à mão"} em{" "}
          {formatarData(cliente.criado_em)}
        </span>
      </p>

      {/* duas colunas em ecrãs largos: dados do cliente | histórico */}
      <div className={styles.colunas}>
        <div>
          <FormCliente cliente={cliente} membros={membros} />

          <div className={styles.zonaPerigo}>
            <div>
              <strong>Apagar este cliente</strong>
              <p>Não dá para desfazer.</p>
            </div>
            <BotaoApagarCliente id={cliente.id} nome={cliente.nome} />
          </div>
        </div>

        <div className={styles.colunaLateral}>
          <section className={styles.blocoTarefas}>
            <h2>Tarefas</h2>
            <FormTarefa clienteId={cliente.id} />
            <ListaTarefas tarefas={tarefas ?? []} mensagemVazia="Sem tarefas para este cliente." />
          </section>

          <Historico clienteId={cliente.id} interacoes={interacoes ?? []} perfilId={perfil.id} eAdmin={eAdmin} />
        </div>
      </div>
    </div>
  );
}
