import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, formatarEuros } from "@/lib/estados";
import { hojeEmPortugal } from "@/lib/datas";
import BotaoCopiar from "@/components/painel/BotaoCopiar";
import ListaTarefas from "@/components/tarefas/ListaTarefas";
import Icone from "@/components/Icone";
import styles from "./inicio.module.css";

// Rota /painel — página inicial da área privada (componente de servidor).
// Os números vêm da base de dados e já respeitam o RLS:
// o admin conta todos os clientes da empresa, o comercial só os seus.

export default async function PaginaPainel() {
  const { supabase, perfil, empresa, eAdmin } = await obterSessao();

  // Três consultas independentes, feitas ao mesmo tempo com Promise.all:
  //  1) os clientes (só os campos precisos para as contas)
  //  2) quantas pessoas há na equipa (head: true = só o número)
  //  3) as minhas tarefas por fazer, por data limite (clientes(nome) junta o nome do cliente)
  const [{ data: clientes }, { count: tamanhoEquipa }, { data: minhasTarefas }] = await Promise.all([
    supabase.from("clientes").select("estado, origem, valor_previsto, criado_em"),
    supabase.from("perfis").select("id", { count: "exact", head: true }),
    supabase
      .from("tarefas")
      .select("id, cliente_id, titulo, data_limite, concluida, clientes(nome)")
      .eq("responsavel_id", perfil.id)
      .eq("concluida", false)
      .order("data_limite", { ascending: true, nullsFirst: false }),
  ]);
  const lista = clientes ?? [];
  const tarefas = minhasTarefas ?? [];

  // ---------- contas ----------
  // quantos clientes há em cada estado: { novo: 3, ativo: 1, ... }
  const contagem = {};
  for (const c of lista) contagem[c.estado] = (contagem[c.estado] ?? 0) + 1;

  // clientes criados desde o dia 1 deste mês ("2026-11-01")
  const inicioMes = hojeEmPortugal().slice(0, 7) + "-01";
  const novosEsteMes = lista.filter((c) => c.criado_em >= inicioMes).length;

  // valor total dos clientes em negociação
  const valorNegociacao = lista
    .filter((c) => c.estado === "negociacao")
    .reduce((soma, c) => soma + (Number(c.valor_previsto) || 0), 0);

  // taxa de conversão = clientes ativos ÷ total de clientes (em %)
  const conversao = lista.length ? Math.round(((contagem.ativo ?? 0) / lista.length) * 100) : 0;

  // tarefas em atraso: data limite anterior a hoje (as datas AAAA-MM-DD comparam-se como texto)
  const hoje = hojeEmPortugal();
  const atrasadas = tarefas.filter((t) => t.data_limite && t.data_limite < hoje).length;

  // os 4 cartões de números: "extra" é o texto pequeno à direita do valor
  const numeros = [
    {
      rotulo: "Total de clientes",
      icone: "utilizadores",
      valor: lista.length,
      extra: novosEsteMes ? `+${novosEsteMes} este mês` : "nenhum novo este mês",
      positivo: novosEsteMes > 0,
    },
    {
      rotulo: "Em negociação",
      icone: "subida",
      valor: contagem.negociacao ?? 0,
      extra: formatarEuros(valorNegociacao),
    },
    {
      rotulo: "Taxa de conversão",
      icone: "grafico",
      valor: `${conversao}%`,
      extra: `${contagem.ativo ?? 0} ativos`,
    },
    {
      rotulo: "Tarefas por fazer",
      icone: "lista",
      valor: tarefas.length,
      extra: atrasadas ? `${atrasadas} em atraso` : "nada em atraso",
      negativo: atrasadas > 0,
      positivo: atrasadas === 0,
    },
  ];

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
  const passosFeitos = passos.filter((p) => p.feito).length;

  const primeiroNome = perfil.nome.split(" ")[0];
  const linkFormulario = `/f/${empresa.slug}`;

  return (
    <div className={styles.pagina}>
      {/* cabeçalho: título + resumo numa linha (como "Pipeline." na referência) */}
      <header className={`entrar ${styles.cabecalho}`}>
        <div>
          <h1>Olá, {primeiroNome}.</h1>
          <p className={styles.resumo}>
            {lista.length} {lista.length === 1 ? "cliente" : "clientes"}
            <span>·</span>
            {formatarEuros(valorNegociacao)} em negociação
            <span>·</span>
            {tarefas.length} {tarefas.length === 1 ? "tarefa" : "tarefas"} por fazer
          </p>
        </div>
        <Link href="/painel/clientes/novo" className="botao">
          <Icone nome="mais" tamanho={16} /> Novo cliente
        </Link>
      </header>

      {/* cartões de números */}
      <section className={styles.numeros}>
        {numeros.map((n, i) => {
          let classeExtra = styles.extra;
          if (n.positivo) classeExtra += ` ${styles.positivo}`;
          if (n.negativo) classeExtra += ` ${styles.negativo}`;
          return (
            <article key={n.rotulo} className={`entrar ${styles.cartao}`} style={{ "--atraso": `${60 + i * 50}ms` }}>
              <p className={styles.rotulo}>
                {n.rotulo}
                <Icone nome={n.icone} tamanho={16} />
              </p>
              {/* caixa interior mais escura com o valor, como na referência */}
              <div className={styles.valor}>
                <strong>{n.valor}</strong>
                <span className={classeExtra}>{n.extra}</span>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.grelha}>
        {/* as minhas tarefas */}
        <article className={`entrar ${styles.bloco}`} style={{ "--atraso": "260ms" }}>
          <header className={styles.topoBloco}>
            <h2>
              As minhas tarefas <span>{tarefas.length}</span>
            </h2>
          </header>
          <ListaTarefas
            tarefas={tarefas.slice(0, 8)}
            mostrarCliente
            mensagemVazia="Não tens tarefas por fazer. Cria tarefas na ficha de cada cliente."
          />
        </article>

        {/* clientes por estado: barras horizontais com largura proporcional */}
        <article className={`entrar ${styles.bloco}`} style={{ "--atraso": "300ms" }}>
          <header className={styles.topoBloco}>
            <h2>Clientes por estado</h2>
            <Link href="/painel/pipeline" className={styles.verTudo}>
              Ver pipeline
            </Link>
          </header>
          <ul className={styles.estados}>
            {ESTADOS.map((e) => {
              const n = contagem[e.chave] ?? 0;
              // percentagem do total (0 se ainda não houver clientes)
              const pct = lista.length ? (n / lista.length) * 100 : 0;
              return (
                <li key={e.chave}>
                  <span className={styles.nomeEstado}>
                    <i style={{ background: e.cor }}></i>
                    {e.texto}
                  </span>
                  <strong>{n}</strong>
                  <span className={styles.trilho}>
                    <span style={{ width: `${pct}%`, background: e.cor }}></span>
                  </span>
                </li>
              );
            })}
          </ul>
        </article>
      </section>

      <section className={styles.grelha}>
        {/* link do formulário público */}
        <article className={`entrar ${styles.bloco}`} style={{ "--atraso": "340ms" }}>
          <header className={styles.topoBloco}>
            <h2>O teu formulário público</h2>
          </header>
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
        </article>

        {/* primeiros passos, com barra de progresso (como "Team quota" na referência) */}
        <article className={`entrar ${styles.bloco}`} style={{ "--atraso": "380ms" }}>
          <header className={styles.topoBloco}>
            <h2>Primeiros passos</h2>
            <strong className={styles.percentagem}>{Math.round((passosFeitos / passos.length) * 100)}%</strong>
          </header>
          <span className={styles.progresso}>
            <span style={{ width: `${(passosFeitos / passos.length) * 100}%` }}></span>
          </span>
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
