import Link from "next/link";
import { redirect } from "next/navigation";
import Icone from "@/components/Icone";
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
import styles from "../plano/plano.module.css";

// /painel/cobranca — página Cobrança (item próprio no menu, só administradores).
// Tudo o que tem a ver com dinheiro num sítio só:
//  - o estado da subscrição, até que dia está paga e a próxima cobrança (data e valor);
//  - o cartão usado (marca, 4 últimos números, validade): alterar ou remover;
//  - cancelar o plano (o cartão fica) ou retomar;
//  - os dados que aparecem nas faturas (nome, email, NIF) e as faturas em PDF.
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
const ESTADOS_FATURA = { paid: "Paga", open: "Por pagar", void: "Anulada", uncollectible: "Não cobrada" };

const euros = (valor) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(valor);
const porCiclo = (ciclo) => (ciclo === "anual" ? "por ano" : "por mês");

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
  const emAtraso = cobranca?.estado === "past_due" || cobranca?.estado === "unpaid";
  const faturaPorPagar = cobranca?.faturas?.find((f) => f.estado === "open");
  const pagoAte = plano.pago ? plano.proximoPagamento : null;
  // o próximo pagamento já tem o preço do plano agendado, se houver mudança
  const proximo = mudanca ?? (plano.pago ? { plano: plano.chave, ciclo: plano.ciclo } : null);
  const renova = plano.pago && !plano.cancelaNoFim;

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

  // ---------- estado da subscrição ----------
  let estado;
  if (plano.bloqueada) estado = { texto: "Em pausa", classe: styles.estadoPausa };
  else if (plano.emTeste) estado = { texto: "Teste grátis", classe: styles.estadoTeste };
  else if (emAtraso) estado = { texto: "Pagamento em atraso", classe: styles.estadoPausa };
  else if (plano.cancelaNoFim) estado = { texto: "Cancelada", classe: styles.estadoCancelada };
  else if (plano.pago) estado = { texto: "Ativa", classe: styles.estadoAtiva };
  else estado = { texto: "Sem subscrição", classe: styles.estadoCancelada };

  const confirmarCancelar = parametros.cancelar && renova;
  const confirmarRemover = parametros.remover && cartao;

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1>Cobrança</h1>
        <p>A subscrição, o cartão e as faturas da empresa. Os dados do cartão ficam só na Stripe.</p>
      </header>

      {mensagem && (
        <p className={`${styles.mensagem} ${styles[mensagem.tipo]}`} role="status">
          {mensagem.texto}
        </p>
      )}

      {!comStripe && (
        <p className={`${styles.mensagem} ${styles.erro}`}>
          Os pagamentos ainda não estão configurados (falta a STRIPE_SECRET_KEY no ficheiro .env.local).
        </p>
      )}

      {/* ---------- o cartão falhou ---------- */}
      {emAtraso && (
        <section className={`${styles.confirmar} ${styles.confirmarPerigo}`}>
          <h2>O último pagamento falhou</h2>
          <p>
            Não conseguimos cobrar o cartão. A Stripe volta a tentar nos próximos dias; se continuar a falhar, a
            subscrição acaba e o CRM fica em pausa. Muda o cartão ou paga a fatura em atraso.
          </p>
          <div className={styles.acoes}>
            <form action={alterarCartao}>
              <BotaoPlano>Alterar o cartão</BotaoPlano>
            </form>
            {faturaPorPagar?.ver && (
              <a href={faturaPorPagar.ver} target="_blank" rel="noreferrer" className="botao botao-secundario">
                Pagar a fatura ({euros(faturaPorPagar.valor)})
              </a>
            )}
          </div>
        </section>
      )}

      {/* ---------- confirmar o cancelamento (o cartão fica) ---------- */}
      {confirmarCancelar && (
        <section className={`${styles.confirmar} ${styles.confirmarPerigo}`} id="confirmar" aria-labelledby="t-cancelar">
          <h2 id="t-cancelar">Cancelar o plano?</h2>
          <p>
            O plano não é tirado agora: continuas com o <strong>{plano.nome}</strong> até{" "}
            <strong>{formatarData(plano.proximoPagamento)}</strong>, que já está pago. Nesse dia a subscrição acaba, não é
            cobrado mais nada e o CRM fica em pausa até escolheres um plano outra vez. Os dados ficam todos guardados e o
            cartão continua guardado (podes retomar até lá).
          </p>
          {mudanca && <p>A mudança para o {PLANOS[mudanca.plano].nome} que estava agendada também é anulada.</p>}
          <form action={cancelarAssinatura} className={styles.acoes}>
            <BotaoPlano className={`botao ${styles.botaoPerigo}`} aEspera="A cancelar…">
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
        <section className={`${styles.confirmar} ${styles.confirmarPerigo}`} id="confirmar" aria-labelledby="t-remover">
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
          <form action={removerCartao} className={styles.acoes}>
            <BotaoPlano className={`botao ${styles.botaoPerigo}`} aEspera="A remover…">
              Sim, remover o cartão
            </BotaoPlano>
            <Link href="/painel/cobranca" className="botao botao-secundario">
              Não, manter
            </Link>
          </form>
        </section>
      )}

      {/* ---------- resumo da subscrição ---------- */}
      <section className={styles.caixa}>
        <div className={styles.topoCaixa}>
          <h2>Subscrição</h2>
          <span className={`${styles.etiquetaEstado} ${estado.classe}`}>{estado.texto}</span>
        </div>

        <dl className={styles.factos}>
          <div>
            <dt>Plano</dt>
            <dd>
              {plano.bloqueada ? "Nenhum" : plano.nome}
              {plano.pago && <small> · {porCiclo(plano.ciclo)}</small>}
            </dd>
          </div>

          {plano.pago && (
            <div>
              <dt>Valor</dt>
              <dd>
                {euros(precoPlano(plano.chave, plano.ciclo))} <small>{porCiclo(plano.ciclo)}</small>
              </dd>
            </div>
          )}

          {plano.emTeste && (
            <div>
              <dt>Teste grátis até</dt>
              <dd>
                {formatarData(plano.fimTeste)} <small>· {textoDiasRestantes(plano.diasRestantes)}</small>
              </dd>
            </div>
          )}

          {pagoAte && (
            <div>
              <dt>{renova ? "Pago até" : "Ativo até"}</dt>
              <dd>{formatarData(pagoAte)}</dd>
            </div>
          )}

          <div>
            <dt>Próxima cobrança</dt>
            <dd>
              {renova && proximo ? (
                <>
                  {euros(precoPlano(proximo.plano, proximo.ciclo))} <small>a {formatarData(pagoAte)}</small>
                </>
              ) : plano.pago ? (
                "Nenhuma: o plano foi cancelado"
              ) : (
                "Nenhuma"
              )}
            </dd>
          </div>

          {mudanca && (
            <div>
              <dt>Mudança agendada</dt>
              <dd>
                {PLANOS[mudanca.plano].nome} {porCiclo(mudanca.ciclo)} <small>a partir de {formatarData(mudanca.em)}</small>
              </dd>
            </div>
          )}
        </dl>

        <p className={styles.explicacao}>
          {plano.emTeste &&
            "Durante o teste não há nada a pagar e não precisas de cartão. Quando o teste acabar, escolhe um plano para continuar."}
          {plano.bloqueada && "A empresa não tem plano ativo. Escolhe um plano para voltar a usar o CRM; os dados estão guardados."}
          {renova &&
            `A subscrição renova sozinha a ${formatarData(pagoAte)} e cobra o cartão em baixo. Se cancelares, ficas com o plano até esse dia.`}
          {plano.pago &&
            plano.cancelaNoFim &&
            `Cancelada: continuas com o ${plano.nome} até ${formatarData(pagoAte)} e depois não é cobrado mais nada. Até lá podes retomar.`}
        </p>

        <div className={styles.acoes}>
          <Link href="/painel/plano" className={plano.pago ? "botao botao-secundario" : "botao"}>
            {plano.pago ? "Mudar de plano" : "Escolher um plano"}
          </Link>
          {renova && (
            <Link href="/painel/cobranca?cancelar=1#confirmar" className="botao botao-secundario">
              <span className={styles.perigo}>Cancelar o plano</span>
            </Link>
          )}
          {plano.pago && plano.cancelaNoFim && (
            cartao ? (
              <form action={retomarAssinatura}>
                <BotaoPlano aEspera="A retomar…">Retomar a subscrição</BotaoPlano>
              </form>
            ) : (
              <span className={styles.notaPessoas}>Para retomar, adiciona primeiro um cartão.</span>
            )
          )}
        </div>
      </section>

      {temCliente && (
        <div className={styles.cartoes}>
          {/* ---------- o cartão ---------- */}
          <section className={styles.caixa}>
            <h2>Cartão</h2>
            {cartao ? (
              <>
                <div className={styles.cartaoVisual}>
                  <span className={styles.marcaCartao}>{MARCAS[cartao.marca] ?? cartao.marca}</span>
                  <span className={styles.numeroCartao}>•••• •••• •••• {cartao.ultimos}</span>
                  <span className={styles.rodapeCartao}>
                    <span>{cartao.titular ?? ""}</span>
                    <span>
                      {String(cartao.mes).padStart(2, "0")}/{String(cartao.ano).slice(-2)}
                    </span>
                  </span>
                </div>
                {caducaAntes && (
                  <p className={styles.avisoCartao}>
                    Este cartão caduca antes da próxima cobrança ({formatarData(pagoAte)}). Altera-o para a renovação não
                    falhar.
                  </p>
                )}
                {renova && <p>É este cartão que vai ser cobrado a {formatarData(pagoAte)}.</p>}
              </>
            ) : (
              <p>Nenhum cartão guardado.{renova ? " A próxima cobrança vai falhar: adiciona um cartão." : ""}</p>
            )}
            <div className={styles.acoes}>
              <form action={alterarCartao}>
                <BotaoPlano className="botao botao-secundario">
                  <Icone nome="cartao" tamanho={16} /> {cartao ? "Alterar o cartão" : "Adicionar um cartão"}
                </BotaoPlano>
              </form>
              {cartao && (
                <Link href="/painel/cobranca?remover=1#confirmar" className="botao botao-secundario">
                  <span className={styles.perigo}>Remover o cartão</span>
                </Link>
              )}
            </div>
          </section>

          {/* ---------- dados de faturação ---------- */}
          <section className={styles.caixa}>
            <h2>Dados das faturas</h2>
            <dl className={styles.factosLista}>
              <div>
                <dt>Nome</dt>
                <dd>{cobranca?.faturacao?.nome ?? "—"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{cobranca?.faturacao?.email ?? "—"}</dd>
              </div>
              <div>
                <dt>NIF</dt>
                <dd>{cobranca?.faturacao?.nif ?? "—"}</dd>
              </div>
            </dl>
            <form action={editarFaturacao}>
              <BotaoPlano className="botao botao-secundario">Editar os dados</BotaoPlano>
            </form>
          </section>
        </div>
      )}

      {/* ---------- faturas ---------- */}
      {temCliente && (
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
                        {f.pdf && (
                          <a href={f.pdf} target="_blank" rel="noreferrer">
                            PDF
                          </a>
                        )}
                        {f.estado === "open" && f.ver && (
                          <>
                            {f.pdf && " · "}
                            <a href={f.ver} target="_blank" rel="noreferrer">
                              Pagar
                            </a>
                          </>
                        )}
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
      )}

      {/* ---------- como funciona ---------- */}
      <section className={styles.perguntas}>
        <h2>Como funciona a cobrança</h2>
        <ul>
          <li>A subscrição renova sozinha no fim de cada mês (ou ano) e cobra o cartão guardado.</li>
          <li>
            Mudar de plano não custa nada na hora: continuas com o plano que pagaste até ao fim do período e só na
            renovação passas a pagar o plano novo.
          </li>
          <li>Cancelar não tira o plano: fica ativo até ao último dia já pago. Até lá podes retomar.</li>
          <li>Remover o cartão também cancela a renovação (sem cartão não há como cobrar).</li>
          <li>Quando a subscrição acaba, o CRM fica em pausa, mas os dados ficam todos guardados.</li>
          <li>O pagamento é feito na Stripe: o FlowCRM nunca vê o número completo do cartão.</li>
        </ul>
      </section>
    </div>
  );
}
