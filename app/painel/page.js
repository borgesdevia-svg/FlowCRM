import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import BotaoCopiar from "@/components/painel/BotaoCopiar";
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

  // só precisamos do estado e da origem de cada cliente para contar
  const { data: clientes } = await supabase.from("clientes").select("estado, origem");
  const lista = clientes ?? [];

  // quantas pessoas há na equipa (o RLS só deixa contar as da mesma empresa).
  // head: true = só queremos o número, não as linhas.
  const { count: tamanhoEquipa } = await supabase
    .from("perfis")
    .select("id", { count: "exact", head: true });

  // "Primeiros passos": cada passo fica feito quando os dados o confirmam
  const passos = [
    { texto: "Criar a conta da empresa", feito: true },
    // só o admin pode juntar a equipa, por isso só ele vê este passo
    ...(eAdmin
      ? [{ texto: "Adicionar a equipa comercial", feito: (tamanhoEquipa ?? 1) > 1, href: "/painel/equipa" }]
      : []),
    { texto: "Registar o primeiro cliente", feito: lista.length > 0, href: "/painel/clientes/novo" },
    {
      texto: "Receber o primeiro contacto pelo formulário",
      feito: lista.some((c) => c.origem === "formulario"),
    },
  ];

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
          <div className={styles.linhaLink}>
            {/* target="_blank" abre num separador novo, para o painel continuar aberto */}
            <Link href={linkFormulario} target="_blank" className={styles.link}>
              {linkFormulario}
            </Link>
            <BotaoCopiar caminho={linkFormulario} className="botao botao-secundario" />
          </div>
          <small className={styles.nota}>Abre o link para veres o formulário como um visitante.</small>
        </article>

        {/* primeiros passos */}
        <article className={`entrar ${styles.bloco}`} style={{ "--atraso": "350ms" }}>
          <h2>Primeiros passos</h2>
          <ul className={styles.passos}>
            {passos.map((p) => (
              <li key={p.texto} className={p.feito ? styles.feito : ""}>
                {/* passo por fazer com página própria: vira um link para essa página */}
                {!p.feito && p.href ? <Link href={p.href}>{p.texto}</Link> : p.texto}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
