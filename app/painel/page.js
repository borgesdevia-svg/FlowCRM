import { obterSessao } from "@/lib/sessao";
import styles from "./inicio.module.css";

// Rota /painel — página inicial da área privada (componente de servidor).
// Os números vêm da base de dados e já respeitam o RLS:
// o admin conta todos os clientes da empresa, o comercial só os seus.

const ESTADOS = [
  { chave: "novo", texto: "Novos", cor: "var(--cor-estado-novo)" },
  { chave: "negociacao", texto: "Em negociação", cor: "var(--cor-estado-negociacao)" },
  { chave: "ativo", texto: "Ativos", cor: "var(--cor-estado-ativo)" },
  { chave: "perdido", texto: "Perdidos", cor: "var(--cor-estado-perdido)" },
];

export default async function PaginaPainel() {
  const { supabase, perfil, empresa, eAdmin } = await obterSessao();

  // só precisamos do estado de cada cliente para contar
  const { data: clientes } = await supabase.from("clientes").select("estado");
  const lista = clientes ?? [];

  // conta quantos clientes há em cada estado: { novo: 3, ativo: 1, ... }
  const contagem = {};
  for (const cliente of lista) {
    contagem[cliente.estado] = (contagem[cliente.estado] ?? 0) + 1;
  }

  const primeiroNome = perfil.nome.split(" ")[0];
  const linkFormulario = `/f/${empresa.slug}`;

  return (
    <div className={styles.pagina}>
      <header className={`entrar ${styles.cabecalho}`}>
        <p className={styles.data}>{empresa.nome}</p>
        <h1>Olá, {primeiroNome}</h1>
        <p className={styles.subtitulo}>
          {eAdmin
            ? "Aqui tens o resumo de toda a empresa."
            : "Aqui tens o resumo dos teus clientes."}
        </p>
      </header>

      {/* cartões de números */}
      <section className={styles.numeros}>
        <article className={`entrar ${styles.cartao}`} style={{ "--atraso": "50ms" }}>
          <small>Total de clientes</small>
          <strong>{lista.length}</strong>
        </article>
        {ESTADOS.map((estado, i) => (
          <article
            key={estado.chave}
            className={`entrar ${styles.cartao}`}
            style={{ "--atraso": `${100 + i * 50}ms` }}
          >
            <small>
              <span className={styles.ponto} style={{ background: estado.cor }}></span>
              {estado.texto}
            </small>
            <strong>{contagem[estado.chave] ?? 0}</strong>
          </article>
        ))}
      </section>

      <section className={styles.grelha}>
        {/* link do formulário público */}
        <article className={`entrar ${styles.bloco}`} style={{ "--atraso": "300ms" }}>
          <h2>O teu formulário público</h2>
          <p>
            Partilha este link (site, redes sociais, email). Quem o preencher entra
            automaticamente como cliente &quot;Novo&quot;.
          </p>
          <code className={styles.link}>{linkFormulario}</code>
          <small className={styles.nota}>A página do formulário fica pronta na Fase 5.</small>
        </article>

        {/* primeiros passos */}
        <article className={`entrar ${styles.bloco}`} style={{ "--atraso": "350ms" }}>
          <h2>Primeiros passos</h2>
          <ul className={styles.passos}>
            <li className={styles.feito}>Criar a conta da empresa</li>
            {eAdmin && <li>Adicionar a equipa comercial</li>}
            <li>Registar o primeiro cliente</li>
            <li>Partilhar o formulário público</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
