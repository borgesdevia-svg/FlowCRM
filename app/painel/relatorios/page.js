import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import AvisoPro from "@/components/painel/AvisoPro";
import { formatarEuros } from "@/lib/estados";
import { PERIODOS, inicioPeriodo, mediaDias, taxaFecho, textoDias } from "@/lib/relatorios";
import Grafico from "@/components/painel/Grafico";
import IndicadorLink from "@/components/painel/IndicadorLink";
import styles from "./relatorios.module.css";

// Rota /painel/relatorios — só administradores (decidido com o aluno a 2026-11-22).
// Como vendeu cada pessoa da equipa num período (30 dias, 90 dias ou este ano):
//  1) totais da equipa em cima;
//  2) gráfico de barras com o valor ganho por pessoa;
//  3) tabela com uma linha por pessoa.
// ESCALA: os números vêm já contados da função relatorio_equipa (migração 22),
// por isso a página não lê os leads nem o histórico todo.
export const metadata = { title: "Relatórios · FlowCRM" };

const numero = (n) => new Intl.NumberFormat("pt-PT").format(n);
const percentagem = (p) => (p === null ? "–" : `${p}%`);

export default async function PaginaRelatorios({ searchParams }) {
  const { supabase, eAdmin, plano } = await obterSessao();
  if (!eAdmin) redirect("/painel");

  // os Relatórios são do CRM Pro: no Essencial, a página explica isso em vez dos números
  if (!plano.pro) {
    return (
      <div className={`entrar ${styles.pagina}`}>
        <header className={styles.cabecalho}>
          <div>
            <h1>Relatórios</h1>
            <p className={styles.resumo}>Como a equipa vende: leads recebidos, ganhos, conversão e tempo até fechar.</p>
          </div>
        </header>
        <AvisoPro
          plano={plano}
          titulo="Os Relatórios da equipa são do CRM Pro"
          texto="Vê, por pessoa, quantos leads recebeu, quantos ganhou e perdeu, o valor ganho, a taxa de conversão e quantos dias demora a fechar um negócio."
        />
      </div>
    );
  }

  const { periodo: pedido = "30" } = await searchParams;
  const periodo = PERIODOS.find((p) => p.chave === pedido) ?? PERIODOS[0];

  const [{ data: membros }, { data: linhas, error }] = await Promise.all([
    supabase.from("perfis").select("id, nome").order("nome"),
    supabase.rpc("relatorio_equipa", { p_desde: inicioPeriodo(periodo.chave) }),
  ]);

  // números de cada pessoa: toda a equipa aparece, mesmo quem está a zero
  const porPessoa = new Map((linhas ?? []).map((l) => [l.perfil_id, l]));
  const vazio = { recebidos: 0, ganhos: 0, perdidos: 0, valor_ganho: 0, fechos_medidos: 0, dias_ate_fechar: 0, registos: 0, tarefas_feitas: 0 };
  const converter = (id, nome, l = vazio) => ({
    id,
    nome,
    recebidos: Number(l.recebidos),
    ganhos: Number(l.ganhos),
    perdidos: Number(l.perdidos),
    valor: Number(l.valor_ganho),
    fechosMedidos: Number(l.fechos_medidos),
    diasAteFechar: Number(l.dias_ate_fechar),
    registos: Number(l.registos),
    tarefas: Number(l.tarefas_feitas),
  });

  const pessoas = (membros ?? []).map((m) => converter(m.id, m.nome, porPessoa.get(m.id)));
  // leads sem responsável: uma linha à parte, só se houver alguma coisa a mostrar
  const semDono = porPessoa.get(null);
  if (semDono && (Number(semDono.recebidos) || Number(semDono.ganhos) || Number(semDono.perdidos))) {
    pessoas.push({ ...converter(null, "Sem responsável", semDono), semDono: true });
  }
  // quem ganhou mais valor primeiro; depois quem ganhou mais negócios; depois pelo nome
  pessoas.sort((a, b) => b.valor - a.valor || b.ganhos - a.ganhos || a.nome.localeCompare(b.nome, "pt"));

  // totais da equipa (somas das linhas)
  const soma = (campo) => pessoas.reduce((t, p) => t + p[campo], 0);
  const total = {
    recebidos: soma("recebidos"),
    ganhos: soma("ganhos"),
    perdidos: soma("perdidos"),
    valor: soma("valor"),
    tempo: mediaDias(soma("diasAteFechar"), soma("fechosMedidos")),
  };
  const conversaoEquipa = taxaFecho(total.ganhos, total.perdidos);

  // o gráfico só mostra pessoas da equipa (não a linha "Sem responsável")
  const noGrafico = pessoas.filter((p) => !p.semDono);
  const haValor = noGrafico.some((p) => p.valor > 0);

  return (
    <div className={`entrar ${styles.pagina}`}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Relatórios</h1>
          <p className={styles.resumo}>Como a equipa vendeu {periodo.frase}.</p>
        </div>

        {/* separadores do período: links normais, o período fica no URL (?periodo=90) */}
        <nav className={styles.segmentos} aria-label="Período">
          {PERIODOS.map((p) => (
            <Link
              key={p.chave}
              href={p.chave === "30" ? "/painel/relatorios" : `/painel/relatorios?periodo=${p.chave}`}
              className={p.chave === periodo.chave ? styles.segmentoAtivo : styles.segmento}
              aria-current={p.chave === periodo.chave ? "page" : undefined}
            >
              {p.texto}
              <IndicadorLink className={styles.aCarregar} classeAtiva={styles.aCarregarAtivo} />
            </Link>
          ))}
        </nav>
      </header>

      {error && <p className={styles.erro}>Não foi possível calcular os relatórios. Tenta outra vez daqui a pouco.</p>}

      {/* ---------- 1) totais da equipa: uma faixa dividida em quatro ---------- */}
      <section className={styles.totais} aria-label="Totais da equipa">
        <div>
          <small>Leads recebidos</small>
          <strong>{numero(total.recebidos)}</strong>
        </div>
        <div>
          <small>Negócios ganhos</small>
          <strong>{numero(total.ganhos)}</strong>
          <span>
            {total.ganhos + total.perdidos > 0
              ? `${percentagem(conversaoEquipa)} de conversão · ${numero(total.perdidos)} ${total.perdidos === 1 ? "perdido" : "perdidos"}`
              : "Ainda nenhum negócio decidido"}
          </span>
        </div>
        <div>
          <small>Valor ganho</small>
          <strong>{formatarEuros(total.valor)}</strong>
        </div>
        <div>
          <small>Tempo médio até fechar</small>
          <strong>{total.tempo === null ? "–" : textoDias(total.tempo)}</strong>
          {total.tempo === null && <span>Sem negócios fechados neste período</span>}
        </div>
      </section>

      {/* ---------- 2) valor ganho por pessoa ---------- */}
      <section className={styles.bloco} aria-label="Valor ganho por pessoa">
        <h2>Valor ganho por pessoa</h2>
        {haValor ? (
          <div className={styles.areaGrafico}>
            <Grafico
              tipo="bar"
              etiquetas={noGrafico.map((p) => p.nome)}
              valores={noGrafico.map((p) => p.valor)}
              cores="var(--cor-destaque)"
              formato="euros"
            />
          </div>
        ) : (
          <p className={styles.vazio}>Ainda não há negócios ganhos {periodo.frase}.</p>
        )}
      </section>

      {/* ---------- 3) tabela: uma linha por pessoa ---------- */}
      <section className={styles.tabelaBloco} aria-label="Números de cada pessoa">
        <div className={styles.rolar}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Pessoa</th>
                <th className={styles.numero}>Recebidos</th>
                <th className={styles.numero}>Ganhos</th>
                <th className={styles.numero}>Perdidos</th>
                <th className={styles.numero}>Conversão</th>
                <th className={styles.numero}>Valor ganho</th>
                <th className={styles.numero}>Até fechar</th>
                <th className={styles.numero}>Registos</th>
                <th className={styles.numero}>Tarefas feitas</th>
              </tr>
            </thead>
            <tbody>
              {pessoas.map((p) => {
                const conversao = taxaFecho(p.ganhos, p.perdidos);
                const tempo = mediaDias(p.diasAteFechar, p.fechosMedidos);
                // número a zero fica mais apagado, para os outros se destacarem
                const celula = (valor, texto = numero(valor)) => (
                  <td className={valor ? styles.numero : `${styles.numero} ${styles.zero}`}>{texto}</td>
                );
                return (
                  <tr key={p.id ?? "sem-dono"}>
                    <td>
                      {p.semDono ? (
                        <span className={styles.semDono}>{p.nome}</span>
                      ) : (
                        <Link href={`/painel/equipa/${p.id}`} className={styles.pessoa}>
                          {p.nome}
                        </Link>
                      )}
                    </td>
                    {celula(p.recebidos)}
                    {celula(p.ganhos)}
                    {celula(p.perdidos)}
                    {celula(conversao, percentagem(conversao))}
                    {celula(p.valor, formatarEuros(p.valor))}
                    {celula(tempo, tempo === null ? "–" : textoDias(tempo))}
                    {celula(p.registos)}
                    {celula(p.tarefas)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className={styles.nota}>
        Ganhos e perdidos contam para o responsável atual de cada lead. Conversão = ganhos ÷ (ganhos + perdidos).
        Registos são as notas, chamadas, emails e reuniões que cada pessoa escreveu. O tempo até fechar só conta leads
        com o histórico de fases, que existe desde 13 de novembro de 2026.
      </p>
    </div>
  );
}
