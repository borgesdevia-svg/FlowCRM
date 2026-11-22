import Link from "next/link";
import { redirect } from "next/navigation";
import Icone from "@/components/Icone";
import BotaoPlano from "@/components/painel/BotaoPlano";
import { obterSessao } from "@/lib/sessao";
import { formatarData } from "@/lib/estados";
import { DIAS_TESTE, FUNCOES, MESES_PAGOS_NO_ANUAL, PLANOS, precoPlano, textoDiasRestantes } from "@/lib/planos";
import { confirmarPagamento, sincronizarAssinatura, stripeConfigurada } from "@/lib/pagamentos";
import { escolherPlano, gerirPagamento } from "@/lib/acoes/pagamentos";
import styles from "./plano.module.css";

// /painel/plano — o plano da empresa: escolher o Essencial ou o Pro, por mês ou por ano,
// e pagar com a Stripe (lib/pagamentos.js). Com a empresa bloqueada (o teste acabou sem
// pagar), é a única página do painel que abre, além de A minha conta.
export const metadata = { title: "Plano · FlowCRM" };

const ERROS = {
  "so-admin": "Só os administradores podem mudar o plano.",
  "sem-stripe": "Os pagamentos ainda não estão configurados (falta a chave da Stripe).",
  invalido: "Esse plano não existe.",
  pessoas: `O CRM Essencial dá para ${PLANOS.essencial.pessoas} pessoas. Remove pessoas da equipa antes de mudar.`,
  "sem-cliente": "Ainda não há pagamentos desta empresa na Stripe.",
  pagamento: "Não conseguimos confirmar o pagamento. Se foi cobrado, o plano muda dentro de alguns minutos.",
};

export default async function PaginaPlano({ searchParams }) {
  const { supabase, perfil, plano, eAdmin } = await obterSessao();
  const parametros = await searchParams;

  // ---------- voltar da Stripe ----------
  // depois de pagar: confirma o pagamento e aplica o plano logo (não espera pelo webhook)
  if (parametros.sessao && stripeConfigurada()) {
    const ok = await confirmarPagamento(String(parametros.sessao), perfil.empresa_id).catch(() => false);
    redirect(ok ? "/painel/plano?pago=1" : "/painel/plano?erro=pagamento");
  }
  // depois do portal (cancelar, mudar o cartão): lê a assinatura outra vez
  if (parametros.voltou && stripeConfigurada()) {
    const { data } = await supabase.from("empresas").select("stripe_assinatura").eq("id", perfil.empresa_id).single();
    await sincronizarAssinatura(data?.stripe_assinatura).catch(() => false);
    redirect("/painel/plano");
  }

  const ciclo = parametros.ciclo === "anual" ? "anual" : parametros.ciclo === "mensal" ? "mensal" : (plano.ciclo ?? "mensal");
  const { count: pessoas } = await supabase.from("perfis").select("id", { count: "exact", head: true });
  const modoTeste = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_");

  // mensagem no topo (depois de pagar, mudar ou cancelar)
  let mensagem = null;
  if (parametros.pago) mensagem = { tipo: "ok", texto: `Pagamento feito. A empresa está no ${plano.nome}. Obrigado!` };
  else if (parametros.mudou) mensagem = { tipo: "ok", texto: `Plano mudado: a empresa está no ${plano.nome}.` };
  else if (parametros.cancelado) mensagem = { tipo: "info", texto: "Pagamento cancelado. Nada foi cobrado." };
  else if (ERROS[parametros.erro]) mensagem = { tipo: "erro", texto: ERROS[parametros.erro] };

  let estado;
  if (plano.bloqueada) {
    estado = "Sem plano ativo. Escolhe um plano para voltar a usar o CRM.";
  } else if (plano.emTeste) {
    estado = `A experimentar o CRM Pro: ${textoDiasRestantes(plano.diasRestantes)} (até ${formatarData(plano.fimTeste)}). Depois, escolhe um plano para continuar.`;
  } else if (plano.pago && plano.cancelaNoFim) {
    estado = `Cancelado: o plano fica ativo até ${formatarData(plano.proximoPagamento)}. Depois, o CRM fica bloqueado.`;
  } else if (plano.pago) {
    estado = `Pago ${plano.ciclo === "anual" ? "por ano" : "por mês"} · ${precoPlano(plano.chave, plano.ciclo)} €. Próximo pagamento a ${formatarData(plano.proximoPagamento)}.`;
  } else {
    estado = plano.pro ? "A empresa tem o CRM Pro, com todas as funções." : "A empresa está no CRM Essencial.";
  }

  const perdas = FUNCOES.filter((f) => f.perde);
  const limite = plano.pessoas;

  // texto do botão de cada plano
  function botao(p) {
    const igual = plano.pago && !plano.cancelaNoFim && plano.chave === p.chave && plano.ciclo === ciclo;
    if (igual) return null; // é o plano atual: não há nada para escolher
    if (plano.pago) {
      if (plano.chave === p.chave) return ciclo === "anual" ? "Passar a pagar por ano" : "Passar a pagar por mês";
      return `Mudar para o ${p.nome}`;
    }
    return `Escolher o ${p.nome}`;
  }

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1>Plano</h1>
        <p>O plano da empresa e o que cada um inclui. O preço é por empresa, não por pessoa.</p>
      </header>

      {mensagem && (
        <p className={`${styles.mensagem} ${styles[mensagem.tipo]}`} role="status">
          {mensagem.texto}
        </p>
      )}

      {/* ---------- empresa bloqueada ---------- */}
      {plano.bloqueada && (
        <section className={styles.bloqueio}>
          <Icone nome="cadeado" tamanho={22} />
          <div>
            <h2>O CRM está em pausa</h2>
            <p>
              {plano.fimTeste && !plano.pago
                ? `Os ${DIAS_TESTE} dias grátis acabaram a ${formatarData(plano.fimTeste)} sem um plano escolhido.`
                : "A empresa não tem nenhum plano ativo."}{" "}
              Os dados estão todos guardados e o formulário público continua a receber leads.{" "}
              {eAdmin
                ? "Escolhe um plano em baixo para voltar a usar o CRM."
                : "Pede a um administrador da empresa para escolher um plano."}
            </p>
            <a href="/painel/clientes/exportar" className="botao botao-secundario" download>
              <Icone nome="documento" tamanho={16} /> Exportar os leads (CSV)
            </a>
          </div>
        </section>
      )}

      {/* ---------- o plano atual ---------- */}
      {!plano.bloqueada && (
        <section className={`${styles.atual} ${plano.pro ? styles.atualPro : ""}`}>
          <div className={styles.atualTexto}>
            <span className={styles.rotulo}>O teu plano</span>
            <strong>{plano.nome}</strong>
            <p>{estado}</p>
            {eAdmin && plano.pago && (
              <form action={gerirPagamento} className={styles.gerir}>
                <BotaoPlano className="botao botao-secundario">
                  <Icone nome="definicoes" tamanho={16} /> Cartão, faturas e cancelar
                </BotaoPlano>
              </form>
            )}
          </div>
          <div className={styles.pessoas}>
            <span className={styles.rotulo}>Pessoas na equipa</span>
            <strong>
              {pessoas ?? 0} <small>de {limite}</small>
            </strong>
            <span className={styles.barra} aria-hidden="true">
              <span style={{ width: `${Math.min(100, ((pessoas ?? 0) / limite) * 100)}%` }} />
            </span>
          </div>
        </section>
      )}

      {/* ---------- mensal ou anual ---------- */}
      <div className={styles.topoPlanos}>
        <h2>{plano.pago ? "Mudar de plano" : "Escolher um plano"}</h2>
        <nav className={styles.ciclos} aria-label="Pagar por mês ou por ano">
          <Link href="/painel/plano?ciclo=mensal" className={ciclo === "mensal" ? styles.cicloAtivo : styles.ciclo} scroll={false}>
            Por mês
          </Link>
          <Link href="/painel/plano?ciclo=anual" className={ciclo === "anual" ? styles.cicloAtivo : styles.ciclo} scroll={false}>
            Por ano <span className={styles.desconto}>2 meses grátis</span>
          </Link>
        </nav>
      </div>

      {/* ---------- os dois planos lado a lado ---------- */}
      <div className={styles.planos}>
        {[PLANOS.essencial, PLANOS.pro].map((p) => {
          const eOAtual = !plano.bloqueada && !plano.emTeste && p.chave === plano.chave;
          const ePro = p.chave === "pro";
          const textoBotao = botao(p);
          const demasiadasPessoas = (pessoas ?? 0) > p.pessoas;
          return (
            <article key={p.chave} className={`${styles.plano} ${ePro ? styles.pro : ""}`}>
              <div className={styles.topoPlano}>
                <h2>{p.nome}</h2>
                {eOAtual && <span className={styles.atualEtiqueta}>O teu plano</span>}
              </div>
              <p className={styles.descricao}>{p.descricao}</p>
              <p className={styles.preco}>
                <strong>{precoPlano(p.chave, ciclo)} €</strong> <span>{ciclo === "anual" ? "/ano" : "/mês"}</span>
              </p>
              <p className={styles.notaPreco}>
                Até {p.pessoas} pessoas ·{" "}
                {ciclo === "anual"
                  ? `${p.mensal} €/mês se pagares por mês`
                  : `ou ${p.mensal * MESES_PAGOS_NO_ANUAL} € por ano (2 meses grátis)`}
              </p>

              {eAdmin && textoBotao && (
                <form action={escolherPlano} className={styles.escolher}>
                  <input type="hidden" name="plano" value={p.chave} />
                  <input type="hidden" name="ciclo" value={ciclo} />
                  {demasiadasPessoas ? (
                    <p className={styles.notaPessoas}>
                      A equipa tem {pessoas} pessoas; este plano dá para {p.pessoas}.
                    </p>
                  ) : (
                    <BotaoPlano className={ePro ? "botao botao-largo" : "botao botao-secundario botao-largo"}>
                      {textoBotao}
                    </BotaoPlano>
                  )}
                </form>
              )}

              <ul className={styles.itens}>
                {FUNCOES.map((f) => {
                  const tem = ePro || !f.soPro;
                  return (
                    <li key={f.texto} className={tem ? undefined : styles.naoTem}>
                      <Icone nome={tem ? "visto" : "cruz"} tamanho={16} />
                      {f.texto}
                      <span className="so-leitores">{tem ? " (incluído)" : " (não incluído)"}</span>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>

      {/* ---------- como se paga ---------- */}
      <section className={styles.mudar}>
        <Icone nome="cadeado" tamanho={22} />
        <div>
          <h2>Pagamento seguro com a Stripe</h2>
          <p>
            O pagamento é feito na página da Stripe: o FlowCRM nunca vê os dados do cartão. Renova sozinho todos os
            meses (ou todos os anos) e podes cancelar quando quiseres; o plano fica até ao fim do período pago.
            {!eAdmin && " Só os administradores podem mudar o plano."}
          </p>
          {modoTeste && (
            <p className={styles.notaTeste}>
              Modo de teste: não há dinheiro real. Usa o cartão 4242 4242 4242 4242, uma data futura e qualquer CVC.
            </p>
          )}
        </div>
      </section>

      {/* ---------- o que acontece ao passar do Pro ao Essencial ---------- */}
      <section className={styles.perguntas}>
        <h2>Quando a empresa passa do Pro ao Essencial</h2>
        <p>
          A empresa perde logo todos os benefícios do Pro. Nada se apaga: os leads, as tarefas, o histórico e as
          propostas ficam todos. A única exceção é o formulário público, que fica com o design que fizeste no Pro.
        </p>
        <ul>
          {perdas.map((f) => (
            <li key={f.texto}>{f.perde}</li>
          ))}
          <li>
            A equipa pode ter até {PLANOS.essencial.pessoas} pessoas. Para mudar, a equipa não pode ter mais pessoas do
            que isso.
          </li>
        </ul>
      </section>
    </div>
  );
}
