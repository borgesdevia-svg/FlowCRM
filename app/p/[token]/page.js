import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eUuid } from "@/lib/validacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { formatarData, formatarEuros } from "@/lib/estados";
import { estadoProposta, totalLinha } from "@/lib/propostas";
import RespostaProposta from "@/components/propostas/RespostaProposta";
import styles from "./proposta.module.css";

// Rota PÚBLICA /p/[token] — a proposta que o cliente recebe por link (sem login).
// O token é aleatório e impossível de adivinhar; a função proposta_publica só devolve
// o que aparece nesta página (nunca outros dados da empresa ou do lead).


const obterProposta = cache(async function obterProposta(token) {
  if (!eUuid(token)) return null;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("proposta_publica", { p_token: token });
  return data;
});

export async function generateMetadata({ params }) {
  const { token } = await params;
  const p = await obterProposta(token);
  return {
    title: p ? `Proposta · ${p.empresa}` : "Proposta não encontrada",
    robots: { index: false, follow: false }, // os links das propostas nunca aparecem no Google
  };
}

export default async function PaginaProposta({ params }) {
  const { token } = await params;
  const p = await obterProposta(token);
  if (!p) notFound();

  // quem é da equipa da empresa vê a proposta, mas não responde por engano em nome do cliente
  // (o RLS só deixa ler a proposta a quem é da empresa)
  const supabase = await criarClienteServidor();
  const { data: daEquipa } = await supabase.from("propostas").select("id").eq("token", token).maybeSingle();

  const estado = estadoProposta(p);

  return (
    <main className={styles.pagina}>
      <article className={styles.folha}>
        <header className={styles.cabeca}>
          <div className={styles.empresa}>
            {p.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.logo_url} alt={`Logótipo da ${p.empresa}`} className={styles.logo} />
            ) : (
              <span className={styles.inicial} aria-hidden="true">
                {p.empresa[0]?.toUpperCase()}
              </span>
            )}
            <div>
              <p className={styles.nomeEmpresa}>{p.empresa}</p>
              {p.autor && <p className={styles.autor}>Preparada por {p.autor}</p>}
            </div>
          </div>
          <dl className={styles.datas}>
            <div>
              <dt>Data</dt>
              <dd>{formatarData(p.criado_em)}</dd>
            </div>
            {p.validade && (
              <div>
                <dt>Válida até</dt>
                <dd>{formatarData(p.validade)}</dd>
              </div>
            )}
          </dl>
        </header>

        <div className={styles.titulo}>
          <p>Proposta para {p.cliente}</p>
          <h1>{p.titulo}</h1>
        </div>

        <table className={styles.tabela}>
          <thead>
            <tr>
              <th scope="col">Descrição</th>
              <th scope="col" className={styles.num}>
                Qtd.
              </th>
              <th scope="col" className={styles.num}>
                Preço
              </th>
              <th scope="col" className={styles.num}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {p.itens.map((item, i) => (
              <tr key={i}>
                <td>{item.descricao}</td>
                <td className={styles.num}>{String(item.quantidade).replace(".", ",")}</td>
                <td className={styles.num}>{formatarEuros(item.preco)}</td>
                <td className={styles.num}>{formatarEuros(totalLinha(item))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>
                Total
              </th>
              <td className={styles.num}>{formatarEuros(p.total)}</td>
            </tr>
          </tfoot>
        </table>

        {p.notas && (
          <section className={styles.notas}>
            <h2>Notas</h2>
            <p>{p.notas}</p>
          </section>
        )}

        <RespostaProposta
          token={token}
          estado={estado}
          aceitePor={p.aceite_por}
          respondidaEm={p.respondida_em ? formatarData(p.respondida_em) : null}
          empresa={p.empresa}
          daEquipa={Boolean(daEquipa)}
        />
      </article>

      <p className={styles.marca}>
        Proposta enviada com <Link href="/">FlowCRM</Link>
      </p>
    </main>
  );
}
