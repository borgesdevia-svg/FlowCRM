import Link from "next/link";
import { redirect } from "next/navigation";
import Icone from "@/components/Icone";
import BotaoPlano from "@/components/painel/BotaoPlano";
import AbasPlano from "@/components/painel/AbasPlano";
import { obterSessao } from "@/lib/sessao";
import { formatarData } from "@/lib/estados";
import { PLANOS, precoPlano } from "@/lib/planos";
import { lerCobranca, lerMudancaAgendada, sincronizarAssinatura, stripeConfigurada } from "@/lib/pagamentos";
import { alterarCartao, cancelarAssinatura, retomarAssinatura } from "@/lib/acoes/pagamentos";
import styles from "../plano.module.css";

// /painel/plano/cobranca — aba Cobrança (só administradores de empresas que já pagam):
//  - o próximo pagamento (data e valor, já com a mudança de plano agendada, se houver);
//  - o cartão (marca, 4 últimos números, validade) e o botão para o mudar na Stripe;
//  - as últimas faturas, com o PDF;
//  - cancelar a subscrição. Cancelar NÃO tira o plano: fica até ao fim do período já pago
//    e só nesse dia acaba. Até lá dá para voltar atrás ("Retomar").
export const metadata = { title: "Cobrança · FlowCRM" };

const ERROS = {
  "sem-cliente": "Ainda não há pagamentos desta empresa na Stripe.",
  "sem-assinatura": "A empresa não tem nenhuma assinatura ativa.",
};

const MARCAS = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", maestro: "Maestro" };
const ESTADOS_FATURA = { paid: "Paga", open: "Por pagar", void: "Anulada", uncollectible: "Não cobrada" };

const euros = (valor) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(valor);

export default async function PaginaCobranca({ searchParams }) {
  const { supabase, perfil, empresa, plano, eAdmin } = await obterSessao();
  if (!eAdmin) redirect("/painel/plano?erro=so-admin");
  const parametros = await searchParams;

  const { data: dados } = await supabase
    .from("empresas")
    .select("stripe_cliente, stripe_assinatura")
    .eq("id", perfil.empresa_id)
    .single();

  // voltou da Stripe depois de mudar o cartão: lê a assinatura outra vez
  if (parametros.cartao && stripeConfigurada()) {
    await sincronizarAssinatura(dados?.stripe_assinatura).catch(() => false);
    redirect("/painel/plano/cobranca?cartaoMudado=1");
  }

  if (!stripeConfigurada() || !dados?.stripe_cliente) {
    return (
      <div className={styles.pagina}>
        <header className={styles.cabecalho}>
          <h1>Cobrança</h1>
        </header>
        <AbasPlano ativa="cobranca" eAdmin={eAdmin} />
        <p className={`${styles.mensagem} ${styles.info}`}>
          Ainda não há pagamentos desta empresa. Escolhe um plano na aba{" "}
          <Link href="/painel/plano">Plano</Link> para começar.
        </p>
      </div>
    );
  }

  const assinaturaId = plano.pago ? empresa?.stripe_assinatura : null;
  const [cobranca, mudanca] = await Promise.all([
    lerCobranca(dados.stripe_cliente, assinaturaId).catch(() => null),
    assinaturaId ? lerMudancaAgendada(assinaturaId).catch(() => null) : null,
  ]);

  let mensagem = null;
  if (parametros.cancelou)
    mensagem = {
      tipo: "info",
      texto: `Subscrição cancelada. Continuas com o ${plano.nome} até ${formatarData(plano.proximoPagamento)}; depois disso não é cobrado mais nada.`,
    };
  else if (parametros.retomou) mensagem = { tipo: "ok", texto: "Subscrição retomada: continua a renovar como antes." };
  else if (parametros.cartaoMudado) mensagem = { tipo: "ok", texto: "Cartão atualizado." };
  else if (ERROS[parametros.erro]) mensagem = { tipo: "erro", texto: ERROS[parametros.erro] };
  if (!cobranca && !mensagem)
    mensagem = { tipo: "erro", texto: "Não conseguimos falar com a Stripe agora. Tenta outra vez daqui a pouco." };

  // o próximo pagamento: com uma mudança agendada, já é o preço do plano novo
  const proximo = mudanca ?? (plano.pago ? { plano: plano.chave, ciclo: plano.ciclo } : null);
  const pedirConfirmacao = parametros.cancelar && plano.pago && !plano.cancelaNoFim;
  const cartao = cobranca?.cartao;

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1>Cobrança</h1>
        <p>O cartão, as faturas e a subscrição da empresa. Os dados do cartão ficam só na Stripe.</p>
      </header>

      <AbasPlano ativa="cobranca" eAdmin={eAdmin} />

      {mensagem && (
        <p className={`${styles.mensagem} ${styles[mensagem.tipo]}`} role="status">
          {mensagem.texto}
        </p>
      )}

      {/* ---------- confirmar o cancelamento ---------- */}
      {pedirConfirmacao && (
        <section className={`${styles.confirmar} ${styles.confirmarPerigo}`} aria-labelledby="titulo-cancelar">
          <h2 id="titulo-cancelar">Cancelar a subscrição?</h2>
          <p>
            O plano não é tirado agora: continuas com o <strong>{plano.nome}</strong> até{" "}
            <strong>{formatarData(plano.proximoPagamento)}</strong>, que já está pago. Nesse dia a subscrição acaba, não
            é cobrado mais nada e o CRM fica em pausa até escolheres um plano outra vez. Os dados ficam todos guardados.
          </p>
          {mudanca && <p>A mudança para o {PLANOS[mudanca.plano].nome} que estava agendada também é anulada.</p>}
          <form action={cancelarAssinatura} className={styles.acoes}>
            <BotaoPlano className="botao botao-secundario" aEspera="A cancelar…">
              <span className={styles.perigo}>Sim, cancelar</span>
            </BotaoPlano>
            <Link href="/painel/plano/cobranca" className="botao">
              Não, manter a subscrição
            </Link>
          </form>
        </section>
      )}

      <div className={styles.cartoes}>
        {/* ---------- a subscrição ---------- */}
        <section className={styles.caixa}>
          <span className={styles.rotulo}>Subscrição</span>
          {!plano.pago ? (
            <>
              <h2>Sem subscrição ativa</h2>
              <p>
                Escolhe um plano na aba <Link href="/painel/plano">Plano</Link> para voltar a usar o CRM.
              </p>
            </>
          ) : plano.cancelaNoFim ? (
            <>
              <h2>{plano.nome} · cancelado</h2>
              <p>
                Continuas com o {plano.nome} até {formatarData(plano.proximoPagamento)}. Depois disso a subscrição acaba
                e não é cobrado mais nada.
              </p>
              <form action={retomarAssinatura}>
                <BotaoPlano aEspera="A retomar…">Retomar a subscrição</BotaoPlano>
              </form>
            </>
          ) : (
            <>
              <h2>
                {plano.nome} · {plano.ciclo === "anual" ? "por ano" : "por mês"}
              </h2>
              <p>
                Próximo pagamento a <strong>{formatarData(plano.proximoPagamento)}</strong>:{" "}
                <strong>{euros(precoPlano(proximo.plano, proximo.ciclo))}</strong>
                {mudanca && ` (já no ${PLANOS[mudanca.plano].nome}, ${mudanca.ciclo === "anual" ? "por ano" : "por mês"})`}.
              </p>
              <div className={styles.acoes}>
                <Link href="/painel/plano" className="botao botao-secundario">
                  Mudar de plano
                </Link>
                <Link href="/painel/plano/cobranca?cancelar=1" className="botao botao-secundario">
                  <span className={styles.perigo}>Cancelar a subscrição</span>
                </Link>
              </div>
            </>
          )}
        </section>

        {/* ---------- o cartão ---------- */}
        <section className={styles.caixa}>
          <span className={styles.rotulo}>Cartão</span>
          {cartao ? (
            <>
              <p className={styles.numeroCartao}>
                <Icone nome="cartao" tamanho={20} />
                {MARCAS[cartao.marca] ?? cartao.marca} •••• {cartao.ultimos}
              </p>
              <p>
                Validade {String(cartao.mes).padStart(2, "0")}/{String(cartao.ano).slice(-2)}
              </p>
            </>
          ) : (
            <p>Nenhum cartão guardado.</p>
          )}
          <form action={alterarCartao}>
            <BotaoPlano className="botao botao-secundario">{cartao ? "Alterar o cartão" : "Adicionar um cartão"}</BotaoPlano>
          </form>
        </section>
      </div>

      {/* ---------- faturas ---------- */}
      <section className={styles.caixa}>
        <h2>Faturas</h2>
        {cobranca?.faturas?.length ? (
          <div className={styles.tabelaFaturas}>
            <table className={styles.faturas}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th className={styles.opcional}>Número</th>
                  <th>Valor</th>
                  <th>Estado</th>
                  <th>
                    <span className="so-leitores">Ver</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cobranca.faturas.map((f) => (
                  <tr key={f.id}>
                    <td>{formatarData(f.data)}</td>
                    <td className={styles.opcional}>{f.numero ?? "—"}</td>
                    <td>{euros(f.valor)}</td>
                    <td>
                      <span className={`${styles.estadoFatura} ${f.estado === "paid" ? styles.paga : ""}`}>
                        {ESTADOS_FATURA[f.estado] ?? f.estado}
                      </span>
                    </td>
                    <td>
                      {f.pdf ? (
                        <a href={f.pdf} target="_blank" rel="noreferrer">
                          PDF
                        </a>
                      ) : f.ver ? (
                        <a href={f.ver} target="_blank" rel="noreferrer">
                          Ver
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Ainda não há faturas.</p>
        )}
      </section>
    </div>
  );
}
