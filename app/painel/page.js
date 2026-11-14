import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { ESTADOS, formatarEuros } from "@/lib/estados";
import { hojeEmPortugal } from "@/lib/datas";
import BotaoCopiar from "@/components/painel/BotaoCopiar";
import TabelaTarefas from "@/components/tarefas/TabelaTarefas";
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
  const [{ data: clientes }, { data: equipa, count: tamanhoEquipa }, { data: minhasTarefas }, { data: sistema }] =
    await Promise.all([
    supabase.from("clientes").select("id, nome, estado, origem, valor_previsto, criado_em"),
    // a equipa toda (só id, nome e papel): o tamanho e os nomes dos administradores
    supabase.from("perfis").select("id, nome, papel", { count: "exact" }),
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
  // nomes dos administradores ("Ana e Rui"), para o comercial saber a quem pedir clientes
  const nomesAdmins = (equipa ?? []).filter((m) => m.papel === "admin").map((m) => m.nome);
  const quemAtribui =
    nomesAdmins.length <= 1 ? nomesAdmins[0] ?? "o administrador" : `${nomesAdmins.slice(0, -1).join(", ")} e ${nomesAdmins.at(-1)}`;
  // comercial ainda sem clientes: os gráficos estariam todos a zero, por isso não aparecem
  const semDados = !eAdmin && lista.length === 0;
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


  // os 4 cartões de números (estilo da referência B):
  //  - "etiqueta" é o comprimido no canto (verde = bom, vermelho = atenção, cinzento = neutro)
  //  - "detalhe" é o texto pequeno ao lado do número
  const numeros = [
    {
      rotulo: "Clientes",
      valor: lista.length,
      etiqueta: { texto: `+${novosEsteMes} este mês`, tipo: novosEsteMes > 0 ? "bom" : "neutro" },
    },
    {
      rotulo: "Em negociação",
      valor: contagem.negociacao ?? 0,
      detalhe: formatarEuros(valorNegociacao),
    },
    {
      rotulo: "Conversão",
      valor: conversao,
      sufixo: "%",
      detalhe: `${contagem.ativo ?? 0} ${(contagem.ativo ?? 0) === 1 ? "cliente ativo" : "clientes ativos"}`,
    },
    {
      rotulo: "Tarefas",
      valor: tarefas.length,
      etiqueta: atrasadas ? { texto: `${atrasadas} em atraso`, tipo: "mau" } : { texto: "Em dia", tipo: "bom" },
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
  // só o administrador monta a empresa, por isso só ele vê os "Primeiros passos";
  // quando está tudo feito, o bloco deixa de aparecer (já não ajuda ninguém)
  const mostrarPassos = eAdmin && passosFeitos < passos.length;

  const primeiroNome = perfil.nome.split(" ")[0];
  const linkFormulario = `/f/${empresa.slug}`;
  const totalSemanas = semanas.valores.reduce((a, b) => a + b, 0);

  return (
    // "entrar": a página aparece de uma vez ao abrir (uma só animação, não uma por bloco)
    <div className={`entrar ${styles.pagina}`}>
      {/* cabeçalho: saudação à esquerda, ações à direita */}
      <header className={styles.cabecalho}>
        <h1>Olá, {primeiroNome}!</h1>
        <div className={styles.acoes}>
          {/* <a> normal (não <Link>) porque descarrega um ficheiro, não abre uma página */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/painel/clientes/exportar" className="botao botao-secundario">
            <Icone nome="folha" tamanho={16} /> Exportar
          </a>
          <Link href="/painel/clientes/novo" className="botao">
            <Icone nome="mais" tamanho={16} /> Novo cliente
          </Link>
        </div>
      </header>

      {/* comercial: cartão que diz em que CRM está, com que papel e a quem pedir clientes */}
      {!eAdmin && (
        <section className={styles.cartaoEmpresa} aria-label={`CRM da ${empresa.nome}`}>
          {empresa.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={empresa.logo_url} alt="" className={styles.logoEmpresa} />
          ) : (
            <span className={styles.inicialEmpresa} aria-hidden="true">
              {empresa.nome[0].toUpperCase()}
            </span>
          )}
          <div className={styles.textoEmpresa}>
            <h2>Estás no CRM da {empresa.nome}</h2>
            <p>
              Entraste como comercial da equipa. Vês os clientes e as tarefas de que és responsável.
              {lista.length === 0 && ` Ainda não tens clientes: pede a ${quemAtribui} para te atribuir, ou adiciona um novo.`}
            </p>
          </div>
          <span className={styles.papelEmpresa}>Comercial</span>
        </section>
      )}

      {/* cartões de números: nome + etiqueta em cima, número grande em baixo */}
      <section className={styles.numeros}>
        {numeros.map((n) => (
          <article key={n.rotulo} className={styles.cartao}>
            <div className={styles.topoCartao}>
              <h2>{n.rotulo}</h2>
              {n.etiqueta && (
                <span className={`${styles.etiqueta} ${styles[n.etiqueta.tipo]}`}>{n.etiqueta.texto}</span>
              )}
            </div>
            <p className={styles.valor}>
              <strong>
                <ContarNumero valor={n.valor} sufixo={n.sufixo} />
              </strong>
              {n.detalhe && <span>{n.detalhe}</span>}
            </p>
          </article>
        ))}
      </section>

      {/* gráfico grande à esquerda + atividade recente à direita */}
      {!semDados && (
        <section className={styles.linhaPrincipal}>
          <article className={styles.bloco}>
            <header className={styles.topoBloco}>
              <div>
                <h2>Novos clientes</h2>
                <p className={styles.subtitulo}>Nas últimas 8 semanas</p>
              </div>
              <p className={styles.numeroGrande}>{totalSemanas}</p>
            </header>
            <div className={styles.areaGrafico}>
              <Grafico tipo="line" etiquetas={semanas.etiquetas} valores={semanas.valores} cores="var(--cor-destaque)" />
            </div>
          </article>

          <div className={styles.atividade}>
            <AtividadeRecente eventos={eventos} />
          </div>
        </section>
      )}

      {/* as minhas tarefas, numa tabela a toda a largura */}
      <article className={styles.bloco}>
        <header className={styles.topoBloco}>
          <div>
            <h2>As minhas tarefas</h2>
            <p className={styles.subtitulo}>
              {tarefas.length === 0 ? "Nada por fazer." : "Das mais urgentes para as menos urgentes."}
            </p>
          </div>
          <div className={styles.acoes}>
            <Link href="/painel/tarefas" className={`botao botao-secundario ${styles.botaoPequeno}`}>
              Ver todas ({tarefas.length})
            </Link>
            <Link href="/painel/tarefas?nova=1" className={`botao botao-secundario ${styles.botaoPequeno}`}>
              <Icone nome="mais" tamanho={15} /> Nova tarefa
            </Link>
          </div>
        </header>
        <TabelaTarefas
          tarefas={tarefas.slice(0, 6)}
          hoje={hoje}
          mensagemVazia="Não tens tarefas por fazer. Cria tarefas na página Tarefas ou na ficha de cada cliente."
        />
      </article>

      {/* dois gráficos lado a lado */}
      {!semDados && (
        <section className={styles.grelha}>
          <article className={styles.bloco}>
            <header className={styles.topoBloco}>
              <h2>Clientes por estado</h2>
              <Link href="/painel/pipeline" className={styles.verTudo}>
                Ver pipeline
              </Link>
            </header>
            {lista.length === 0 ? (
              <p className={styles.subtitulo}>Ainda não há clientes.</p>
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

          <article className={styles.bloco}>
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
      )}

      {/* formulário público (+ primeiros passos, enquanto não estiverem todos feitos) */}
      <section className={mostrarPassos ? styles.grelha : undefined}>
        <article className={`${styles.bloco} ${styles.blocoFormulario}`}>
          <div>
            <h2>{eAdmin ? "O teu formulário público" : `Formulário da ${empresa.nome}`}</h2>
            <p className={styles.subtitulo}>
              Partilha este link no site, nas redes sociais ou por email. Quem o preencher entra como cliente
              &quot;Novo&quot;.
            </p>
          </div>
          <div className={styles.linhaLink}>
            {/* target="_blank" abre num separador novo, para o painel continuar aberto */}
            <Link href={linkFormulario} target="_blank" className={styles.link}>
              {linkFormulario}
            </Link>
            <BotaoCopiar caminho={linkFormulario} className={`botao botao-secundario ${styles.botaoPequeno}`} />
          </div>
        </article>

        {mostrarPassos && (
          <article className={styles.bloco}>
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
        )}
      </section>
    </div>
  );
}
