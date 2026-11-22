import Icone from "@/components/Icone";
import { obterSessao } from "@/lib/sessao";
import { formatarData } from "@/lib/estados";
import { DIAS_TESTE, FUNCOES, MESES_PAGOS_NO_ANUAL, PLANOS, textoDiasRestantes } from "@/lib/planos";
import styles from "./plano.module.css";

// /painel/plano — o plano da empresa e a comparação entre o Essencial e o Pro.
// Os pagamentos ainda não existem (chegam com o Stripe): por agora a página explica
// os planos e o que muda; o botão de pagar entra aqui depois.
export const metadata = { title: "Plano · FlowCRM" };

export default async function PaginaPlano() {
  const { supabase, plano } = await obterSessao();
  const { count: pessoas } = await supabase.from("perfis").select("id", { count: "exact", head: true });

  let estado;
  if (plano.emTeste) {
    estado = `A experimentar o CRM Pro: ${textoDiasRestantes(plano.diasRestantes)} (até ${formatarData(plano.fimTeste)}). Depois, a empresa passa ao CRM Essencial.`;
  } else if (plano.testeAcabou) {
    estado = `Os ${DIAS_TESTE} dias a experimentar o CRM Pro acabaram a ${formatarData(plano.fimTeste)}. Os dados ficam todos guardados.`;
  } else if (plano.pro) {
    estado = "A empresa tem o CRM Pro, com todas as funções.";
  } else {
    estado = "A empresa está no CRM Essencial.";
  }

  const perdas = FUNCOES.filter((f) => f.perde);
  const limite = plano.pessoas;

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1>Plano</h1>
        <p>O plano da empresa e o que cada um inclui. O preço é por empresa, não por pessoa.</p>
      </header>

      {/* ---------- o plano atual ---------- */}
      <section className={`${styles.atual} ${plano.pro ? styles.atualPro : ""}`}>
        <div className={styles.atualTexto}>
          <span className={styles.rotulo}>O teu plano</span>
          <strong>{plano.nome}</strong>
          <p>{estado}</p>
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

      {/* ---------- os dois planos lado a lado ---------- */}
      <div className={styles.planos}>
        {[PLANOS.essencial, PLANOS.pro].map((p) => {
          const eOAtual = p.chave === plano.chave;
          const ePro = p.chave === "pro";
          return (
            <article key={p.chave} className={`${styles.plano} ${ePro ? styles.pro : ""}`}>
              <div className={styles.topoPlano}>
                <h2>{p.nome}</h2>
                {eOAtual && <span className={styles.atualEtiqueta}>O teu plano</span>}
              </div>
              <p className={styles.descricao}>{p.descricao}</p>
              <p className={styles.preco}>
                <strong>{p.mensal} €</strong> <span>/mês</span>
              </p>
              <p className={styles.notaPreco}>Até {p.pessoas} pessoas · ou {p.mensal * MESES_PAGOS_NO_ANUAL} € por ano (2 meses grátis)</p>

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

      {/* ---------- mudar de plano: os pagamentos ainda não existem ---------- */}
      <section className={styles.mudar}>
        <Icone nome="moedas" tamanho={22} />
        <div>
          <h2>Mudar de plano</h2>
          <p>
            Os pagamentos online estão a chegar. Quando estiverem prontos, mudas de plano aqui mesmo, por mês ou por ano.
          </p>
        </div>
      </section>

      {/* ---------- o que acontece ao passar do Pro ao Essencial ---------- */}
      <section className={styles.perguntas}>
        <h2>Quando a empresa passa do Pro ao Essencial</h2>
        <p>Nada se apaga: os leads, as tarefas, o histórico e as propostas ficam todos. Muda só isto:</p>
        <ul>
          {perdas.map((f) => (
            <li key={f.texto}>{f.perde}</li>
          ))}
          <li>
            A equipa pode ter até {PLANOS.essencial.pessoas} pessoas. Quem já está continua a entrar; só não se juntam
            pessoas novas acima do limite.
          </li>
        </ul>
      </section>
    </div>
  );
}
