import Link from "next/link";
import { redirect } from "next/navigation";
import Icone from "@/components/Icone";
import SimboloLogo from "@/components/SimboloLogo";
import BotaoPlano from "@/components/painel/BotaoPlano";
import { obterSessao } from "@/lib/sessao";
import { formatarData } from "@/lib/estados";
import { PLANOS, precoPlano, textoDiasRestantes } from "@/lib/planos";
import { lerCobranca, lerMudancaAgendada, sincronizarAssinatura, stripeConfigurada } from "@/lib/pagamentos";
import {
  alterarCartao,
  cancelarAssinatura,
  editarFaturacao,
  removerCartao,
  retomarAssinatura,
} from "@/lib/acoes/pagamentos";
import base from "../plano/plano.module.css";
import styles from "./cobranca.module.css";

// /painel/cobranca — página Cobrança (item próprio no menu, só administradores).
// Um só painel, de cima para baixo (como as páginas de faturação dos grandes serviços):
//  1. o plano (nome, ciclo, preço) com "Mudar de plano";
//  2. uma linha de estado: renova a..., acaba a..., teste até..., oferecido, em pausa;
//  3. Pagamento: o cartão guardado (marca, 4 últimos números, validade) — atualizar ou remover;
//  4. Dados das faturas: nome, email e NIF;
//  5. Faturas: data, total, estado e PDF.
// Cancelar ou remover o cartão NÃO tira o plano: fica até ao fim do período já pago.
// Abre também com a empresa bloqueada (para ver faturas e mudar o cartão).
export const metadata = { title: "Cobrança · FlowCRM" };

const ERROS = {
  "sem-cliente": "Ainda não há pagamentos desta empresa na Stripe.",
  "sem-assinatura": "A empresa não tem nenhuma subscrição ativa.",
};

const MARCAS = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  maestro: "Maestro",
  discover: "Discover",
  unionpay: "UnionPay",
};
// texto curto que aparece no pequeno emblema do cartão
const EMBLEMAS = { visa: "VISA", mastercard: "MC", amex: "AMEX", maestro: "MAES", discover: "DISC", unionpay: "UP" };
const ESTADOS_FATURA = { paid: "Paga", open: "Por pagar", void: "Anulada", uncollectible: "Não cobrada" };

const euros = (valor) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(valor);
const porCiclo = (ciclo) => (ciclo === "anual" ? "por ano" : "por mês");
const nomeCiclo = (ciclo) => (ciclo === "anual" ? "Anual" : "Mensal");

export default async function PaginaCobranca({ searchParams }) {
  const { supabase, perfil, plano, eAdmin } = await obterSessao();
  if (!eAdmin) redirect("/painel/plano?erro=so-admin");
  const parametros = await searchParams;
  const comStripe = stripeConfigurada();

  const { data: dados } = await supabase
    .from("empresas")
    .select("stripe_cliente, stripe_assinatura")
    .eq("id", perfil.empresa_id)
    .single();

  // voltou da Stripe (cartão ou dados de faturação): lê a assinatura outra vez
  if ((parametros.cartao || parametros.voltou) && comStripe) {
    await sincronizarAssinatura(dados?.stripe_assinatura).catch(() => false);
    redirect(parametros.cartao ? "/painel/cobranca?cartaoMudado=1" : "/painel/cobranca");
  }

  const temCliente = comStripe && Boolean(dados?.stripe_cliente);
  const assinaturaId = plano.pago ? dados?.stripe_assinatura : null;
  const [cobranca, mudanca] = temCliente
    ? await Promise.all([
        lerCobranca(dados.stripe_cliente, assinaturaId).catch((erro) => {
          console.error("Cobrança: não foi possível ler a Stripe", erro);
          return null;
        }),
        assinaturaId ? lerMudancaAgendada(assinaturaId).catch(() => null) : null,
      ])
    : [null, null];

  const cartao = cobranca?.cartao ?? null;
  const faturas = cobranca?.faturas ?? [];
  const emAtraso = cobranca?.estado === "past_due" || cobranca?.estado === "unpaid";
  const faturaPorPagar = faturas.find((f) => f.estado === "open");
  const pagoAte = plano.pago ? plano.proximoPagamento : null;
  // o próximo pagamento já tem o preço do plano agendado, se houver mudança
  const proximo = mudanca ?? (plano.pago ? { plano: plano.chave, ciclo: plano.ciclo } : null);
  const renova = plano.pago && !plano.cancelaNoFim;
  // plano ativo sem subscrição na Stripe (ex.: o Pro oferecido à empresa do FlowCRM)
  const semCobranca = !plano.pago && !plano.emTeste && !plano.bloqueada;

  // o cartão caduca antes da próxima cobrança?
  const fimValidade = cartao ? new Date(cartao.ano, cartao.mes, 1) : null; // 1.º dia do mês seguinte
  const caducaAntes = renova && fimValidade && pagoAte && fimValidade <= new Date(pagoAte);

  // ---------- mensagem no topo ----------
  let mensagem = null;
  if (parametros.cancelou)
    mensagem = {
      tipo: "info",
      texto: `Plano cancelado. Continuas com o ${plano.nome} até ${formatarData(plano.proximoPagamento)}; depois disso não é cobrado mais nada.`,
    };
  else if (parametros.removido)
    mensagem = {
      tipo: "info",
      texto: plano.pago
        ? `Cartão removido. Sem cartão não há renovação: continuas com o ${plano.nome} até ${formatarData(plano.proximoPagamento)}.`
        : "Cartão removido.",
    };
  else if (parametros.retomou) mensagem = { tipo: "ok", texto: "Subscrição retomada: continua a renovar como antes." };
  else if (parametros.cartaoMudado) mensagem = { tipo: "ok", texto: "Cartão atualizado." };
  else if (ERROS[parametros.erro]) mensagem = { tipo: "erro", texto: ERROS[parametros.erro] };
  else if (temCliente && !cobranca)
    mensagem = { tipo: "erro", texto: "Não conseguimos falar com a Stripe agora. Tenta outra vez daqui a pouco." };

  // ---------- por baixo do nome do plano ----------
  let subtitulo;
  if (plano.bloqueada) subtitulo = "Sem plano ativo";
  else if (plano.emTeste) subtitulo = `Teste grátis · ${textoDiasRestantes(plano.diasRestantes)}`;
  else if (plano.pago) subtitulo = `${nomeCiclo(plano.ciclo)} · ${euros(precoPlano(plano.chave, plano.ciclo))} ${porCiclo(plano.ciclo)}`;
  else subtitulo = "Sem pagamentos";

  // ---------- a linha de estado (com o botão que lhe corresponde) ----------
  let estado;
  if (plano.bloqueada)
    estado = {
      tom: styles.avisoLinha,
      texto: "O CRM está em pausa. Escolhe um plano para voltar a usá-lo; os dados estão todos guardados.",
    };
  else if (emAtraso)
    estado = {
      tom: styles.perigoLinha,
      texto: "O último pagamento falhou. A Stripe volta a tentar nos próximos dias: atualiza o cartão.",
    };
  else if (plano.emTeste)
    estado = {
      texto: `Estás a experimentar o CRM Pro até ${formatarData(plano.fimTeste)}. Não há nada a pagar até lá.`,
    };
  else if (plano.pago && plano.cancelaNoFim)
    estado = {
      tom: styles.avisoLinha,
      texto: `A subscrição foi cancelada e acaba a ${formatarData(pagoAte)}. Até lá continuas com o ${plano.nome}.`,
      retomar: true,
    };
  else if (renova && proximo)
    estado = {
      texto: mudanca
        ? `A ${formatarData(mudanca.em)} passas ao ${PLANOS[mudanca.plano].nome} ${porCiclo(mudanca.ciclo)} e são cobrados ${euros(precoPlano(proximo.plano, proximo.ciclo))}.`
        : `A subscrição renova a ${formatarData(pagoAte)}: são cobrados ${euros(precoPlano(proximo.plano, proximo.ciclo))}.`,
    };
  else if (semCobranca)
    estado = { texto: `O ${plano.nome} desta empresa não tem pagamentos nem data de fim.` };

  // para o resumo ao lado: quanto já foi pago e desde quando
  const pagas = faturas.filter((f) => f.estado === "paid");
  const totalPago = pagas.reduce((soma, f) => soma + f.valor, 0);
  const clienteDesde = pagas.length ? pagas[pagas.length - 1].data : null;

  const confirmarCancelar = parametros.cancelar && renova;
  const confirmarRemover = parametros.remover && cartao;

  return (
    <div className={styles.pagina}>
      <header className={base.cabecalho}>
        <h1>Cobrança</h1>
        <p>O plano, o cartão e as faturas da empresa. Os dados do cartão ficam só na Stripe.</p>
      </header>

      {mensagem && (
        <p className={`${base.mensagem} ${base[mensagem.tipo]}`} role="status">
          {mensagem.texto}
        </p>
      )}

      {!comStripe && (
        <p className={`${base.mensagem} ${base.erro}`}>
          Os pagamentos ainda não estão configurados (falta a STRIPE_SECRET_KEY no ficheiro .env.local).
        </p>
      )}

      {/* ---------- confirmar o cancelamento (o cartão fica) ---------- */}
      {confirmarCancelar && (
        <section className={`${base.confirmar} ${base.confirmarPerigo}`} id="confirmar" aria-labelledby="t-cancelar">
          <h2 id="t-cancelar">Cancelar o plano?</h2>
          <p>
            O plano não é tirado agora: continuas com o <strong>{plano.nome}</strong> até{" "}
            <strong>{formatarData(plano.proximoPagamento)}</strong>, que já está pago. Nesse dia a subscrição acaba, não é
            cobrado mais nada e o CRM fica em pausa até escolheres um plano outra vez. Os dados ficam todos guardados e o
            cartão continua guardado (podes retomar até lá).
          </p>
          {mudanca && <p>A mudança para o {PLANOS[mudanca.plano].nome} que estava agendada também é anulada.</p>}
          <form action={cancelarAssinatura} className={base.acoes}>
            <BotaoPlano className={`botao ${base.botaoPerigo}`} aEspera="A cancelar…">
              Sim, cancelar o plano
            </BotaoPlano>
            <Link href="/painel/cobranca" className="botao botao-secundario">
              Não, manter
            </Link>
          </form>
        </section>
      )}

      {/* ---------- confirmar remover o cartão ---------- */}
      {confirmarRemover && (
        <section className={`${base.confirmar} ${base.confirmarPerigo}`} id="confirmar" aria-labelledby="t-remover">
          <h2 id="t-remover">
            Remover o cartão {MARCAS[cartao.marca] ?? cartao.marca} •••• {cartao.ultimos}?
          </h2>
          {renova ? (
            <p>
              Sem cartão não há como cobrar a renovação, por isso <strong>o plano também é cancelado</strong>. Continuas
              com o {plano.nome} até <strong>{formatarData(plano.proximoPagamento)}</strong>, que já está pago; depois o
              CRM fica em pausa. Se só queres cancelar e manter o cartão, usa “Cancelar o plano”.
            </p>
          ) : (
            <p>O cartão é apagado da Stripe. Para voltar a pagar, adicionas um cartão novo.</p>
          )}
          <form action={removerCartao} className={base.acoes}>
            <BotaoPlano className={`botao ${base.botaoPerigo}`} aEspera="A remover…">
              Sim, remover o cartão
            </BotaoPlano>
            <Link href="/painel/cobranca" className="botao botao-secundario">
              Não, manter
            </Link>
          </form>
        </section>
      )}

      <div className={styles.grelha}>
        <div className={styles.coluna}>
          {/* ---------- 1. o plano e a linha de estado ---------- */}
          <section className={styles.cartao} aria-label="Plano">
            <div className={styles.plano}>
              <SimboloLogo tamanho={40} className={styles.simbolo} />
              <div className={styles.planoTexto}>
                <h2>{plano.bloqueada ? "Nenhum plano" : plano.nome}</h2>
                <p>{subtitulo}</p>
              </div>
              <Link
                href="/painel/plano"
                className={`botao ${plano.bloqueada ? "" : "botao-secundario"} ${styles.botaoPequeno}`}
              >
                {plano.bloqueada ? "Escolher um plano" : "Mudar de plano"}
              </Link>
            </div>

            {estado && (
              <div className={`${styles.estado} ${estado.tom ?? ""}`}>
                <Icone nome="calendario" tamanho={16} />
                <p>{estado.texto}</p>
                {estado.retomar &&
                  (cartao ? (
                    <form action={retomarAssinatura}>
                      <BotaoPlano className={`botao botao-secundario ${styles.botaoPequeno}`} aEspera="A retomar…">
                        Retomar
                      </BotaoPlano>
                    </form>
                  ) : (
                    <span className={styles.nota}>Para retomar, adiciona primeiro um cartão.</span>
                  ))}
                {emAtraso && faturaPorPagar?.ver && (
                  <a href={faturaPorPagar.ver} target="_blank" rel="noreferrer" className={`botao ${styles.botaoPequeno}`}>
                    Pagar {euros(faturaPorPagar.valor)}
                  </a>
                )}
              </div>
            )}
          </section>

          {/* ---------- 2. pagamento ---------- */}
          <section className={styles.cartao} aria-labelledby="t-pagamento">
            <div className={styles.topoSeccao}>
              <div>
                <h2 id="t-pagamento">Pagamento</h2>
                <p>
                  {temCliente
                    ? "O cartão que é cobrado em cada renovação."
                    : "O cartão é pedido quando escolhes um plano pago."}
                </p>
              </div>
              {temCliente && !cartao && (
                <form action={alterarCartao}>
                  <BotaoPlano className={`botao botao-secundario ${styles.botaoPequeno}`}>Adicionar cartão</BotaoPlano>
                </form>
              )}
            </div>

            {cartao ? (
              <div className={styles.linha}>
                <span className={styles.emblema} aria-hidden="true">
                  {EMBLEMAS[cartao.marca] ?? cartao.marca.slice(0, 4).toUpperCase()}
                </span>
                <div className={styles.linhaTexto}>
                  <strong>
                    {MARCAS[cartao.marca] ?? cartao.marca} •••• {cartao.ultimos}
                    {renova && <span className={styles.principal}>Principal</span>}
                  </strong>
                  <span>
                    Expira em {String(cartao.mes).padStart(2, "0")}/{cartao.ano}
                  </span>
                  {caducaAntes && (
                    <span className={styles.caduca}>Caduca antes da renovação de {formatarData(pagoAte)}.</span>
                  )}
                </div>
                <div className={styles.linhaAcoes}>
                  <Link href="/painel/cobranca?remover=1#confirmar" className={styles.ligacaoPerigo}>
                    Remover
                  </Link>
                  <form action={alterarCartao}>
                    <BotaoPlano className={`botao botao-secundario ${styles.botaoPequeno}`}>Atualizar</BotaoPlano>
                  </form>
                </div>
              </div>
            ) : (
              <p className={styles.vazio}>
                {renova ? "Nenhum cartão guardado: a próxima renovação vai falhar." : "Nenhum cartão guardado."}
              </p>
            )}
          </section>

          {/* ---------- 3. dados das faturas ---------- */}
          <section className={styles.cartao} aria-labelledby="t-faturacao">
            <div className={styles.topoSeccao}>
              <div>
                <h2 id="t-faturacao">Dados das faturas</h2>
                <p>O nome, o email e o NIF que aparecem nas faturas.</p>
              </div>
            </div>

            {temCliente ? (
              <div className={styles.linha}>
                <div className={styles.linhaTexto}>
                  <strong>{cobranca?.faturacao?.nif ? `NIF ${cobranca.faturacao.nif}` : "Nenhum NIF"}</strong>
                  <span>
                    {[cobranca?.faturacao?.nome, cobranca?.faturacao?.email].filter(Boolean).join(" · ") ||
                      "Sem nome nem email nas faturas."}
                  </span>
                </div>
                <div className={styles.linhaAcoes}>
                  <form action={editarFaturacao}>
                    <BotaoPlano className={`botao botao-secundario ${styles.botaoPequeno}`}>
                      {cobranca?.faturacao?.nif ? "Editar" : "Adicionar"}
                    </BotaoPlano>
                  </form>
                </div>
              </div>
            ) : (
              <p className={styles.vazio}>Ficam disponíveis depois do primeiro pagamento.</p>
            )}
          </section>
        </div>

        {/* ---------- resumo, ao lado ---------- */}
        <aside className={`${styles.cartao} ${styles.resumo}`} aria-label="Resumo">
          <div className={styles.destaque}>
            <span>Próxima cobrança</span>
            <strong>{renova && proximo ? euros(precoPlano(proximo.plano, proximo.ciclo)) : "—"}</strong>
            <small>
              {renova && proximo
                ? `a ${formatarData(pagoAte)}`
                : plano.emTeste
                  ? `teste grátis até ${formatarData(plano.fimTeste)}`
                  : "sem renovação"}
            </small>
          </div>
          <dl className={styles.factos}>
            <div>
              <dt>Ciclo</dt>
              <dd>{plano.pago ? nomeCiclo(plano.ciclo) : "—"}</dd>
            </div>
            <div>
              <dt>{renova ? "Pago até" : "Ativo até"}</dt>
              <dd>{pagoAte ? formatarData(pagoAte) : plano.emTeste ? formatarData(plano.fimTeste) : "—"}</dd>
            </div>
            <div>
              <dt>Total pago</dt>
              <dd>{euros(totalPago)}</dd>
            </div>
            <div>
              <dt>Cliente desde</dt>
              <dd>{clienteDesde ? formatarData(clienteDesde) : "—"}</dd>
            </div>
          </dl>
          {renova && (
            <div className={styles.cancelar}>
              <p>Cancelar não tira o plano: fica ativo até {formatarData(pagoAte)}.</p>
              <Link href="/painel/cobranca?cancelar=1#confirmar" className={styles.ligacaoPerigo}>
                Cancelar o plano
              </Link>
            </div>
          )}
        </aside>

        {/* ---------- faturas, a toda a largura ---------- */}
        <section className={`${styles.cartao} ${styles.largo}`} aria-labelledby="t-faturas">
          <h2 id="t-faturas">Faturas</h2>
          {faturas.length ? (
            <div className={styles.tabelaCaixa}>
              <table className={styles.tabela}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th className={styles.opcional}>Número</th>
                    <th className={styles.numero}>Total</th>
                    <th>Estado</th>
                    <th>
                      <span className="so-leitores">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {faturas.map((f) => (
                    <tr key={f.id}>
                      <td>{formatarData(f.data)}</td>
                      <td className={styles.opcional}>{f.numero ?? "—"}</td>
                      <td className={styles.numero}>{euros(f.valor)}</td>
                      <td>
                        <span className={f.estado === "paid" ? styles.paga : styles.porPagar}>
                          {ESTADOS_FATURA[f.estado] ?? f.estado}
                        </span>
                      </td>
                      <td className={styles.acoesFatura}>
                        {f.estado === "open" && f.ver && (
                          <a href={f.ver} target="_blank" rel="noreferrer">
                            Pagar
                          </a>
                        )}
                        {f.pdf && (
                          <a href={f.pdf} target="_blank" rel="noreferrer">
                            Descarregar PDF
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.vazio}>Ainda não há faturas.</p>
          )}
        </section>
      </div>
    </div>
  );
}
