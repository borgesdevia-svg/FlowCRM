import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { tempoRelativo } from "@/lib/datas";
import FormAutomacoes from "@/components/automacoes/FormAutomacoes";
import styles from "./automacoes.module.css";

// Rota /painel/automacoes — só administradores.
// Em cima: os interruptores de cada automação (o que o CRM faz sozinho).
// Em baixo: o Registo, com as últimas coisas que as automações fizeram.
// As automações correm na base de dados (migração 16); esta página só as configura e mostra.
export const metadata = { title: "Automações · FlowCRM" };

const MOSTRAR_REGISTO = 30;

// frase de cada linha do registo, a partir do tipo
function frase(linha) {
  const cliente = linha.clientes?.nome ?? "um cliente apagado";
  const pessoa = linha.perfis?.nome;
  switch (linha.tipo) {
    case "tarefa_novo_cliente":
      return { titulo: `Tarefa “Contactar ${cliente}”`, detalhe: pessoa ? `para ${pessoa}` : null };
    case "distribuir":
      return { titulo: `Lead ${cliente} entregue`, detalhe: pessoa ? `a ${pessoa}` : null };
    case "cliente_parado":
      return { titulo: `${cliente} estava parado`, detalhe: pessoa ? `tarefa para ${pessoa}` : null };
    default:
      return null;
  }
}

export default async function PaginaAutomacoes() {
  const { supabase, perfil, eAdmin } = await obterSessao();
  if (!eAdmin) redirect("/painel");

  const [{ data: config }, { data: roda }, { data: equipa }, { data: registo }] = await Promise.all([
    supabase.from("automacoes").select("*").eq("empresa_id", perfil.empresa_id).maybeSingle(),
    supabase.from("automacoes_distribuicao").select("perfil_id"),
    supabase.from("perfis").select("id, nome, papel").order("nome"),
    // o email de boas-vindas ainda não existe: as linhas "boas_vindas" ficam de fora
    supabase
      .from("automacoes_log")
      .select("id, tipo, criado_em, cliente_id, clientes(nome), perfis(nome)")
      .neq("tipo", "boas_vindas")
      .order("criado_em", { ascending: false })
      .limit(MOSTRAR_REGISTO),
  ]);

  // empresa sem linha de configuração (não devia acontecer): valores por defeito
  const valores = config ?? { tarefa_ligada: true, distribuir_ligada: false, parado_ligado: false, parado_dias: 7 };
  const linhas = (registo ?? []).map((l) => ({ ...l, texto: frase(l) })).filter((l) => l.texto);

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <h1>Automações</h1>
        <p className={styles.resumo}>Trabalho que o CRM faz sozinho, para nenhum cliente ficar esquecido.</p>
      </header>

      <FormAutomacoes
        inicial={{
          tarefa_ligada: valores.tarefa_ligada,
          distribuir_ligada: valores.distribuir_ligada,
          parado_ligado: valores.parado_ligado,
          parado_dias: valores.parado_dias,
          roda: (roda ?? []).map((r) => r.perfil_id),
        }}
        equipa={(equipa ?? []).map((p) => ({ id: p.id, nome: p.nome, admin: p.papel === "admin" }))}
      />

      <section className={styles.registo} aria-labelledby="titulo-registo">
        <h2 id="titulo-registo">Registo</h2>
        <p className={styles.explicacao}>O que as automações fizeram, das mais recentes para as mais antigas.</p>

        {linhas.length === 0 ? (
          <p className={styles.vazio}>Ainda nada. Quando uma automação fizer alguma coisa, aparece aqui.</p>
        ) : (
          <ul className={styles.lista}>
            {linhas.map((l) => (
              <li key={l.id} className={styles.linha}>
                <i className={styles[`ponto_${l.tipo}`]} aria-hidden="true"></i>
                <span className={styles.textoLinha}>
                  {l.cliente_id ? (
                    <Link href={`/painel/clientes/${l.cliente_id}`}>{l.texto.titulo}</Link>
                  ) : (
                    <strong>{l.texto.titulo}</strong>
                  )}
                  {l.texto.detalhe && <small>{l.texto.detalhe}</small>}
                </span>
                <time dateTime={l.criado_em} className={styles.quando}>
                  {tempoRelativo(l.criado_em)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
