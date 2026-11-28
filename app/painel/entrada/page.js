import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { tempoRelativo, urgenciaSemResponsavel } from "@/lib/datas";
import { formatarTelefone } from "@/lib/texto";
import { nomeCanal } from "@/lib/canais";
import AcoesEntrada from "@/components/entrada/AcoesEntrada";
import styles from "@/components/entrada/Entrada.module.css";

// Rota /painel/entrada — os leads novos que ainda não têm responsável (formulário, marcações
// online ou criados sem responsável) ficam aqui até o administrador os ACEITAR (escolher quem
// da equipa fica com eles) ou REJEITAR. Enquanto estão aqui não aparecem em Leads nem no Pipeline.
// Com a distribuição do CRM Pro ligada, ao aceitar pode escolher-se "À vez pela equipa" (migração 45).
// Só o administrador vê esta página (decidido com o aluno a 2026-11-28).
export const metadata = { title: "Entrada · FlowCRM" };

const MOSTRAR = 100;

// de onde veio: "Formulário (Instagram)", "Marcação online", "Adicionado à mão"
function textoOrigem(origem, canal) {
  if (canal === "marcacoes") return "Marcação online";
  if (origem === "formulario") return canal ? `Formulário (${nomeCanal(canal)})` : "Formulário";
  return "Adicionado à mão";
}

const ESPERA = { amarelo: "À espera há mais de 4 horas", vermelho: "À espera há mais de um dia" };

export default async function PaginaEntrada() {
  const { supabase, eAdmin, plano } = await obterSessao();
  if (!eAdmin) redirect("/painel/clientes");

  const [{ data, count }, { data: equipa }, { data: automacoes }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nome, email, telefone, origem, canal, respostas, criado_em", { count: "exact" })
      .is("responsavel_id", null)
      .order("criado_em", { ascending: true }) // os que esperam há mais tempo primeiro
      .limit(MOSTRAR),
    supabase.from("perfis").select("id, nome").order("nome"),
    plano.pro ? supabase.from("automacoes").select("distribuir_ligada").maybeSingle() : { data: null },
  ]);
  // Pro com a distribuição ligada: ao aceitar, a opção "À vez pela equipa" vem escolhida (migração 45)
  const aVez = Boolean(automacoes?.distribuir_ligada);
  const leads = data ?? [];
  const total = count ?? 0;


  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <h1>Entrada</h1>
        <p className={styles.resumo}>
          {total === 0
            ? "Não há leads à espera. Os novos aparecem aqui até escolheres quem fica com eles."
            : `${total === 1 ? "1 lead à espera" : `${total} leads à espera`} de ser aceite. Escolhe quem da equipa fica com cada um, ou rejeita o que for spam.`}
        </p>
      </header>

      {leads.length > 0 && (
        <ul className={styles.lista}>
          {leads.map((l) => {
            const espera = ESPERA[urgenciaSemResponsavel(l.criado_em)];
            return (
              <li key={l.id} className={styles.lead}>
                <div className={styles.dados}>
                  <div className={styles.linhaNome}>
                    <Link href={`/painel/clientes/${l.id}`} className={styles.nome}>
                      {l.nome}
                    </Link>
                    <small>
                      {textoOrigem(l.origem, l.canal)} · {tempoRelativo(l.criado_em)}
                    </small>
                  </div>
                  <p className={styles.contactos}>
                    {[l.email, l.telefone && formatarTelefone(l.telefone)].filter(Boolean).join(" · ") || "Sem contactos"}
                  </p>
                  {espera && <p className={styles.espera}>{espera}</p>}
                  {l.respostas?.length > 0 && (
                    <dl className={styles.respostas}>
                      {l.respostas.slice(0, 3).map((r, i) => (
                        <div key={i}>
                          <dt>{r.pergunta}</dt>
                          <dd>{r.resposta}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
                <AcoesEntrada clienteId={l.id} membros={equipa ?? []} aVez={aVez} />
              </li>
            );
          })}
        </ul>
      )}

      {total > leads.length && (
        <p className={styles.resumo}>Mostram-se os {MOSTRAR} que esperam há mais tempo. Aceita estes para veres os outros.</p>
      )}
    </div>
  );
}
