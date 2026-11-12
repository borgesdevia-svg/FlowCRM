import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, formatarEuros } from "@/lib/estados";
import { hojeEmPortugal } from "@/lib/datas";
import BotaoCopiar from "@/components/painel/BotaoCopiar";
import ListaTarefas from "@/components/tarefas/ListaTarefas";
import Icone from "@/components/Icone";
import AtividadeRecente from "@/components/painel/AtividadeRecente";
import Grafico from "@/components/painel/Grafico";
import ContarNumero from "@/components/painel/ContarNumero";
import styles from "./inicio.module.css";

// Junta numa só lista os eventos para a "Atividade recente", do mais recente para o mais antigo:
//  - clientes novos (vêm da data de criação de cada cliente)
//  - eventos automáticos guardados nas interações com tipo "sistema"
//    ("Passou para ..." = mudança de fase; "Concluiu a tarefa: ..." = tarefa feita)
function prepararAtividade(clientes, sistema) {
  const eventos = [];

  for (const c of clientes) {
    eventos.push({
      id: `novo-${c.id}`,
      tipo: "novo",
      quando: c.criado_em,
      antes: c.origem === "formulario" ? "Novo lead pelo formulário:" : "Novo cliente:",
      clienteId: c.id,
      clienteNome: c.nome,
    });
  }

  for (const s of sistema) {
    const eFase = s.nota.startsWith("Passou para ");
    eventos.push({
      id: s.id,
      tipo: eFase ? "fase" : "tarefa",
      quando: s.criado_em,
      autor: s.perfis?.nome?.split(" ")[0] ?? "Alguém", // só o primeiro nome
      antes: eFase ? "moveu" : "concluiu uma tarefa de",
      // "Passou para Ativo" -> "para Ativo";  "Concluiu a tarefa: X" -> "· X"
      depois: eFase ? s.nota.replace("Passou para ", "para ") : `· ${s.nota.replace("Concluiu a tarefa: ", "")}`,
      clienteId: s.cliente_id,
      clienteNome: s.clientes?.nome ?? "cliente",
    });
  }

  // ordena por data (as datas ISO comparam-se como texto) e fica com os 10 mais recentes
  return eventos.sort((a, b) => (a.quando < b.quando ? 1 : -1)).slice(0, 10);
}

// Clientes novos em cada uma das últimas 8 semanas (para o gráfico de linha).
// Cada "semana" são 7 dias seguidos a contar para trás a partir de agora.
// Devolve { etiquetas: ["24/9", ...], valores: [2, 0, 5, ...] }, da mais antiga para a mais recente.
const DIA = 24 * 60 * 60 * 1000; // um dia em milissegundos

function leadsPorSemana(clientes) {
  const agora = Date.now();
  const etiquetas = [];
  const valores = [];

  for (let i = 7; i >= 0; i--) {
    const fim = agora - i * 7 * DIA;
    const inicio = fim - 7 * DIA;
    const quantos = clientes.filter((c) => {
      const t = new Date(c.criado_em).getTime();
      return t > inicio && t <= fim;
    }).length;

    const d = new Date(inicio + DIA); // primeiro dia da semana, para a etiqueta
    etiquetas.push(`${d.getDate()}/${d.getMonth() + 1}`);
    valores.push(quantos);
  }
  return { etiquetas, valores };
}

// Rota /painel — página inicial da área privada (componente de servidor).
// Os números vêm da base de dados e já respeitam o RLS:
// o admin conta todos os clientes da empresa, o comercial só os seus.

export default async function PaginaPainel() {
  const { supabase, perfil, empresa, eAdmin } = await obterSessao();

  // Três consultas independentes, feitas ao mesmo tempo com Promise.all:
  //  1) os clientes (só os campos precisos para as contas)
  //  2) quantas pessoas há na equipa (head: true = só o número)
  //  3) as minhas tarefas por fazer, por data limite (clientes(nome) junta o nome do cliente)
  //  4) os últimos eventos automáticos (para a atividade recente)
  const [{ data: clientes }, { count: tamanhoEquipa }, { data: minhasTarefas }, { data: sistema }] = await Promise.all([
    supabase.from("clientes").select("id, nome, estado, origem, valor_previsto, criado_em"),
    supabase.from("perfis").select("id", { count: "exact", head: true }),
    supabase
      .from("tarefas")
      .select("id, cliente_id, titulo, data_limite, concluida, clientes(nome)")
      .eq("responsavel_id", perfil.id)
      .eq("concluida", false)
      .order("data_limite", { ascending: true, nullsFirst: false }),
    supabase
      .from("interacoes")
      .select("id, nota, criado_em, cliente_id, clientes(nome), perfis(nome)")
      .eq("tipo", "sistema")
      .order("criado_em", { ascending: false })
      .limit(10),
  ]);
  const lista = clientes ?? [];
  const tarefas = minhasTarefas ?? [];
  const eventos = prepararAtividade(lista, sistema ?? []);

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

  // dados dos gráficos
  const semanas = leadsPorSemana(lista);
  const valorPorFase = ESTADOS.map((e) =>
    lista.filter((c) => c.estado === e.chave).reduce((soma, c) => soma + (Number(c.valor_previsto) || 0), 0)
  );

  // os 4 cartões de números: "extra" é o texto pequeno à direita do valor;
  // "sufixo" é o que vem depois do número (ex.: "%")
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
      valor: conversao,
      sufixo: "%",
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

      {/* conteúdo principal à esquerda + atividade recente à direita */}
      <div className={styles.layout}>
        <div className={styles.principal}>
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
                    <strong>
                      <ContarNumero valor={n.valor} sufixo={n.sufixo} />
                    </strong>
                    <span className={classeExtra}>{n.extra}</span>
                  </div>
                </article>
              );
            })}
          </section>

          <section className={styles.grelha}>
            {/* gráfico de linha: clientes novos por semana */}
            <article className={`entrar ${styles.bloco}`} style={{ "--atraso": "260ms" }}>
              <header className={styles.topoBloco}>
                <h2>
                  Novos clientes <span>últimas 8 semanas</span>
                </h2>
                <strong className={styles.totalGrafico}>{semanas.valores.reduce((a, b) => a + b, 0)}</strong>
              </header>
              <div className={styles.areaGrafico}>
                <Grafico
                  tipo="line"
                  etiquetas={semanas.etiquetas}
                  valores={semanas.valores}
                  cores="var(--cor-destaque)"
                />
              </div>
            </article>

            {/* gráfico circular: clientes por estado, com a legenda em HTML ao lado */}
            <article className={`entrar ${styles.bloco}`} style={{ "--atraso": "300ms" }}>
              <header className={styles.topoBloco}>
                <h2>Clientes por estado</h2>
                <Link href="/painel/pipeline" className={styles.verTudo}>
                  Ver pipeline
                </Link>
              </header>
              {lista.length === 0 ? (
                <p>Ainda não há clientes.</p>
              ) : (
                <div className={styles.donut}>
                  <div className={styles.areaDonut}>
                    <Grafico
                      tipo="doughnut"
                      etiquetas={ESTADOS.map((e) => e.texto)}
                      valores={ESTADOS.map((e) => contagem[e.chave] ?? 0)}
                      cores={ESTADOS.map((e) => e.cor)}
                    />
                    {/* total no buraco do meio */}
                    <span className={styles.centroDonut}>
                      <strong>{lista.length}</strong>
                      <small>clientes</small>
                    </span>
                  </div>
                  <ul className={styles.legenda}>
                    {ESTADOS.map((e) => (
                      <li key={e.chave}>
                        <i style={{ background: e.cor }}></i>
                        {e.texto}
                        <strong>{contagem[e.chave] ?? 0}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          </section>

          <section className={styles.grelha}>
            {/* as minhas tarefas */}
            <article className={`entrar ${styles.bloco}`} style={{ "--atraso": "320ms" }}>
              <header className={styles.topoBloco}>
                <h2>
                  As minhas tarefas <span>{tarefas.length}</span>
                </h2>
                <Link href="/painel/tarefas" className={styles.verTudo}>
                  Ver todas
                </Link>
              </header>
              <ListaTarefas
                tarefas={tarefas.slice(0, 6)}
                mostrarCliente
                mensagemVazia="Não tens tarefas por fazer. Cria tarefas na página Tarefas ou na ficha de cada cliente."
              />
            </article>

            {/* gráfico de barras: valor previsto em cada fase */}
            <article className={`entrar ${styles.bloco}`} style={{ "--atraso": "340ms" }}>
              <header className={styles.topoBloco}>
                <h2>Valor por fase</h2>
              </header>
              <div className={styles.areaGrafico}>
                <Grafico
                  tipo="bar"
                  etiquetas={ESTADOS.map((e) => e.texto)}
                  valores={valorPorFase}
                  cores={ESTADOS.map((e) => e.cor)}
                  formato="euros"
                />
              </div>
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

        <aside className={`entrar ${styles.lateral}`} style={{ "--atraso": "200ms" }}>
          <AtividadeRecente eventos={eventos} />
        </aside>
      </div>
    </div>
  );
}
