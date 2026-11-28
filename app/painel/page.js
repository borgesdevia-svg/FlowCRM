import Link from "next/link";
import { obterSessao, obterAparencia } from "@/lib/sessao";
import { ESTADOS, formatarEuros } from "@/lib/estados";
import { hojeEmPortugal } from "@/lib/datas";
import { textoMudancaFase } from "@/lib/eventos";
import { taxaFecho, tempoAteFechar, textoDias } from "@/lib/relatorios";
import TabelaTarefas from "@/components/tarefas/TabelaTarefas";
import Icone from "@/components/Icone";
import AtividadeRecente from "@/components/painel/AtividadeRecente";
import Grafico from "@/components/painel/Grafico";
import ContarNumero from "@/components/painel/ContarNumero";
import MetaMes from "@/components/painel/MetaMes";
import LinkFormulario from "@/components/painel/LinkFormulario";
import { ganhoDoMes, previsaoMes } from "@/lib/metas";
import { nomeCanal } from "@/lib/canais";
import { FUSO, instanteLisboa, somarDias } from "@/lib/marcacoes";
import styles from "./inicio.module.css";

// Junta numa só lista os eventos para a "Atividade recente", do mais recente para o mais antigo:
//  - clientes novos (vêm da data de criação de cada cliente)
//  - eventos automáticos guardados nas interações com tipo "sistema"
//    ("Passou para ..." = mudança de fase; "Concluiu a tarefa: ..." = tarefa feita;
//     "Entregue a ..." = lead entregue a alguém; "Aceitou/Recusou a proposta ..." = resposta do cliente)
//    Sem autor (ex.: o cliente aceitou a proposta, ou um membro que saiu), a frase não tem nome.
function prepararAtividade(clientes, sistema) {
  const eventos = [];

  for (const c of clientes) {
    eventos.push({
      id: `novo-${c.id}`,
      tipo: "novo",
      quando: c.criado_em,
      antes: c.origem === "formulario" ? "Novo lead pelo formulário:" : "Novo lead:",
      clienteId: c.id,
      clienteNome: c.nome,
    });
  }

  for (const s of sistema) {
    const autor = s.perfis?.nome?.split(" ")[0]; // só o primeiro nome
    const base = { id: s.id, quando: s.criado_em, clienteId: s.cliente_id, clienteNome: s.clientes?.nome ?? "lead" };
    const nota = s.nota ?? "";

    if (nota.startsWith("Passou para ")) {
      // "Rui moveu Marta para Ativo" ou, sem autor, "Marta passou para Ativo"
      eventos.push({
        ...base,
        tipo: "fase",
        autor,
        antes: autor ? "moveu" : "",
        depois: autor ? nota.replace("Passou para ", "para ") : nota.replace("Passou para ", "passou para "),
      });
    } else if (nota.startsWith("Concluiu a tarefa: ")) {
      eventos.push({
        ...base,
        tipo: "tarefa",
        autor: autor ?? "Alguém",
        antes: "concluiu uma tarefa de",
        depois: `· ${nota.replace("Concluiu a tarefa: ", "")}`,
      });
    } else if (nota.startsWith("Entregue a ")) {
      // "Marta entregue a Ana"
      eventos.push({ ...base, tipo: "entregue", antes: "", depois: nota.replace("Entregue a ", "entregue a ") });
    } else if (nota.startsWith("Aceitou a proposta") || nota.startsWith("Recusou a proposta")) {
      // "Marta aceitou a proposta "Branqueamento" (300,00 €)" (sem o "assinada por")
      const aceite = nota.startsWith("Aceitou");
      eventos.push({
        ...base,
        tipo: aceite ? "proposta" : "recusada",
        antes: "",
        depois: (aceite ? "aceitou" : "recusou") + nota.slice(7).replace(/, assinada por .*$/, ""),
      });
    } else if (nota.startsWith("Marcou online: ")) {
      // "Marta marcou uma reunião para sexta-feira, 27 de novembro às 09:30" (sem a nota do cliente)
      const quando = nota.replace("Marcou online: ", "").split("\n")[0].replace(/\.$/, "");
      eventos.push({ ...base, tipo: "outro", antes: "", depois: `marcou uma reunião para ${quando}` });
    } else {
      eventos.push({ ...base, tipo: "outro", antes: "", depois: `· ${nota}` });
    }
  }

  // ordena por data (as datas ISO comparam-se como texto) e fica com os 10 mais recentes
  return eventos.sort((a, b) => (a.quando < b.quando ? 1 : -1)).slice(0, 10);
}

// As últimas 8 semanas, para o gráfico "Novos clientes".
// Cada "semana" são 7 dias seguidos a contar para trás a partir de agora.
// Devolve [{ inicio, fim, etiqueta: "24/9" }, ...], da mais antiga para a mais recente;
// a página pede à base de dados quantos clientes entraram em cada uma.
const DIA = 24 * 60 * 60 * 1000; // um dia em milissegundos
const SEMANAS = 8;

function ultimasSemanas() {
  const agora = Date.now();
  const semanas = [];
  for (let i = SEMANAS - 1; i >= 0; i--) {
    const fim = agora - i * 7 * DIA;
    const inicio = fim - 7 * DIA;
    const d = new Date(inicio + DIA); // primeiro dia da semana, para a etiqueta
    semanas.push({
      inicio: new Date(inicio).toISOString(),
      fim: new Date(fim).toISOString(),
      etiqueta: `${d.getDate()}/${d.getMonth() + 1}`,
    });
  }
  return semanas;
}

// Rota /painel — página inicial da área privada (componente de servidor).
// Os números vêm da base de dados e já respeitam o RLS:
// o admin conta todos os clientes da empresa, o comercial só os seus.

export default async function PaginaPainel() {
  const { supabase, perfil, empresa, eAdmin } = await obterSessao();
  // tipo de gráfico de clientes por semana, escolhido em Configurações
  // (o layout já fez este pedido: o cache() devolve o mesmo resultado sem ir outra vez à base de dados)
  const { grafico: tipoGrafico } = await obterAparencia();
  const hoje = hojeEmPortugal();
  // clientes criados desde o dia 1 deste mês ("2026-11-01")
  const inicioMes = hoje.slice(0, 7) + "-01";
  // dia 1 do mês passado ("2026-10-01"); em janeiro, volta a dezembro do ano anterior
  const [ano, mes] = hoje.split("-").map(Number);
  const inicioMesAnterior = mes === 1 ? `${ano - 1}-12-01` : `${ano}-${String(mes - 1).padStart(2, "0")}-01`;
  const semanas = ultimasSemanas();

  // reuniões marcadas online para hoje (migração 36), pedidas ao mesmo tempo que o resto.
  // O RLS mostra ao comercial só as dos seus leads. Sem a tabela, vem um erro e a faixa não aparece.
  const pedidoMarcacoesHoje = supabase
    .from("marcacoes")
    .select("id, inicio, cliente_id, clientes(nome)")
    .eq("estado", "marcada")
    .gte("inicio", instanteLisboa(hoje, 0).toISOString())
    .lt("inicio", instanteLisboa(somarDias(hoje, 1), 0).toISOString())
    .order("inicio")
    .limit(12);

  // ESCALA: a página não lê os clientes todos (com milhares, o Supabase corta em 1000 linhas
  // e os números ficavam errados). Cada número é pedido já contado à base de dados:
  // count: "exact" + head: true devolve só o número, sem as linhas.
  // só os leads aceites (os sem responsável estão na Entrada)
  const contarClientes = () =>
    supabase.from("clientes").select("id", { count: "exact", head: true }).not("responsavel_id", "is", null);

  // tudo ao mesmo tempo com Promise.all (o RLS já filtra: o admin conta a empresa, o comercial os seus)
  const [
    { data: resumo }, // quantos clientes e que valor em cada fase (função resumo_clientes)
    { count: novosEsteMes },
    { data: doFormulario }, // há pelo menos um cliente vindo do formulário? (para os primeiros passos)
    { data: recentes }, // os 10 clientes mais recentes (para a atividade recente)
    { data: equipa, count: tamanhoEquipa }, // a equipa (id, nome e papel)
    { data: minhasTarefas, count: totalTarefas }, // as 6 tarefas mais urgentes + quantas há
    { count: atrasadas }, // quantas das minhas estão em atraso
    { data: sistema }, // os últimos eventos automáticos (mudanças de fase, tarefas feitas)
    { data: fechos }, // cada "Passou para Ativo", para o tempo médio até fechar
    { count: novosMesAnterior }, // leads que entraram no mês passado (para a variação)
    { count: totalFormulario }, // quantos leads vieram do formulário público (origem)
    { data: meta }, // meta de vendas deste mês (migração 32)
    { data: passagensMes }, // cada "Passou para Ativo" deste mês, com o valor do lead (para a meta)
    { data: comCanal }, // leads do formulário com o sítio de onde vieram (?de=instagram, migração 35)
    ...porSemana // um número por semana, para o gráfico
  ] = await Promise.all([
    supabase.rpc("resumo_clientes", { termo: "" }),
    contarClientes().gte("criado_em", inicioMes),
    supabase.from("clientes").select("id").eq("origem", "formulario").limit(1),
    supabase
      .from("clientes")
      .select("id, nome, origem, criado_em")
      .not("responsavel_id", "is", null)
      .order("criado_em", { ascending: false })
      .limit(10),
    supabase.from("perfis").select("id, nome, papel", { count: "exact" }),
    supabase
      .from("tarefas")
      .select("id, cliente_id, responsavel_id, titulo, data_limite, concluida, clientes(nome)", { count: "exact" })
      .eq("responsavel_id", perfil.id)
      .eq("concluida", false)
      .order("data_limite", { ascending: true, nullsFirst: false })
      .limit(6),
    supabase
      .from("tarefas")
      .select("id", { count: "exact", head: true })
      .eq("responsavel_id", perfil.id)
      .eq("concluida", false)
      .lt("data_limite", hoje), // as datas AAAA-MM-DD comparam-se como texto
    supabase
      .from("interacoes")
      .select("id, nota, criado_em, cliente_id, clientes(nome), perfis(nome)")
      .eq("tipo", "sistema")
      .order("criado_em", { ascending: false })
      .limit(10),
    supabase
      .from("interacoes")
      .select("cliente_id, criado_em, clientes(criado_em)")
      .eq("tipo", "sistema")
      .eq("nota", textoMudancaFase("ativo"))
      .order("criado_em", { ascending: false })
      .limit(1000),
    contarClientes().gte("criado_em", inicioMesAnterior).lt("criado_em", inicioMes),
    contarClientes().eq("origem", "formulario"),
    supabase.from("metas").select("valor").eq("mes", inicioMes).maybeSingle(),
    // só o admin vê a meta (o comercial só vê os seus leads, a soma ficaria errada)
    eAdmin
      ? supabase
          .from("interacoes")
          .select("cliente_id, clientes(estado, valor_previsto)")
          .eq("tipo", "sistema")
          .eq("nota", textoMudancaFase("ativo"))
          .gte("criado_em", inicioMes)
          .limit(1000)
      : { data: null },
    // só a coluna "canal" (texto curto); até 5000 chega para uma empresa pequena.
    // Antes da migração 35 a coluna não existe: vem um erro, data fica null e a lista fica como antes.
    supabase.from("clientes").select("canal").eq("origem", "formulario").not("canal", "is", null).limit(5000),
    ...semanas.map((s) => contarClientes().gt("criado_em", s.inicio).lte("criado_em", s.fim)),
  ]);

  const tarefas = minhasTarefas ?? [];
  const { data: marcacoesHoje } = await pedidoMarcacoesHoje;
  const horaLisboa = new Intl.DateTimeFormat("pt-PT", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  // nomes dos administradores ("Ana e Rui"), para o comercial saber a quem pedir clientes
  const nomesAdmins = (equipa ?? []).filter((m) => m.papel === "admin").map((m) => m.nome);
  const quemAtribui =
    nomesAdmins.length <= 1 ? nomesAdmins[0] ?? "o administrador" : `${nomesAdmins.slice(0, -1).join(", ")} e ${nomesAdmins.at(-1)}`;
  const eventos = prepararAtividade(recentes ?? [], sistema ?? []);

  // ---------- contas (a partir do resumo por fase) ----------
  // quantos clientes e que valor há em cada estado: { novo: 3, ativo: 1, ... }
  const contagem = {};
  const valorFase = {};
  for (const r of resumo ?? []) {
    contagem[r.estado] = Number(r.n);
    valorFase[r.estado] = Number(r.soma);
  }
  const totalClientes = Object.values(contagem).reduce((a, b) => a + b, 0);
  // comercial ainda sem clientes: os gráficos estariam todos a zero, por isso não aparecem
  const semDados = !eAdmin && totalClientes === 0;

  // valor total dos clientes em negociação
  const valorNegociacao = valorFase.negociacao ?? 0;

  // ---------- resultados ----------
  const fecho = taxaFecho(contagem.ativo ?? 0, contagem.perdido ?? 0);
  const tempoFecho = tempoAteFechar(fechos);
  // admin: clientes ganhos (Ativo) por cada membro da equipa, do que tem mais para o que tem menos.
  // Um número contado na base de dados por pessoa (a equipa é pequena, e vão todos ao mesmo tempo).
  const ganhosEquipa = eAdmin
    ? (
        await Promise.all(
          (equipa ?? []).map(async (m) => {
            const { count } = await contarClientes().eq("estado", "ativo").eq("responsavel_id", m.id);
            return { id: m.id, nome: m.nome, n: count ?? 0 };
          })
        )
      ).sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, "pt"))
    : null;
  const maisGanhos = Math.max(1, ...(ganhosEquipa ?? []).map((m) => m.n));

  // dados dos gráficos
  const valoresSemanas = porSemana.map((r) => r.count ?? 0);
  const valorPorFase = ESTADOS.map((e) => valorFase[e.chave] ?? 0);

  // variação dos leads novos face ao mês passado (em %); sem leads no mês passado não há comparação
  const variacao =
    (novosMesAnterior ?? 0) > 0 ? Math.round((((novosEsteMes ?? 0) - novosMesAnterior) / novosMesAnterior) * 100) : null;
  const nomeMes = new Intl.DateTimeFormat("pt-PT", { month: "long", timeZone: "Europe/Lisbon" }).format(new Date());
  const porFechar = (contagem.novo ?? 0) + (contagem.negociacao ?? 0);
  const ganhoMes = ganhoDoMes(passagensMes); // valor ganho este mês (para a meta)

  // os 3 cartões grandes do topo (ao estilo da referência Octax):
  //  - em cima, num painel de cor suave: ícone + nome, variação (se houver) e o número grande;
  //  - no rodapé: um detalhe com ícone e o botão "Ver detalhes"
  const numeros = [
    {
      rotulo: "Valor ganho",
      icone: "moedas",
      valor: valorFase.ativo ?? 0,
      formato: "euros",
      iconeRodape: "visto",
      rodape: `${contagem.ativo ?? 0} ${(contagem.ativo ?? 0) === 1 ? "lead ativo" : "leads ativos"}`,
      href: "/painel/clientes?estado=ativo",
    },
    {
      rotulo: "Pipeline em aberto",
      icone: "alvo",
      valor: (valorFase.novo ?? 0) + valorNegociacao,
      formato: "euros",
      iconeRodape: "subida",
      rodape: `${porFechar} ${porFechar === 1 ? "lead por fechar" : "leads por fechar"}`,
      href: "/painel/pipeline",
    },
    {
      rotulo: "Leads este mês",
      icone: "utilizadores",
      valor: novosEsteMes ?? 0,
      variacao,
      iconeRodape: "calendario",
      rodape: `1 – ${Number(hoje.slice(8, 10))} de ${nomeMes}`,
      href: "/painel/clientes",
    },
  ];
  // origem dos leads: formulário público ou adicionados à mão (inclui os importados)
  // o formulário divide-se pelos sítios de onde vieram (Instagram, Facebook…): os 4 com mais leads,
  // cada um com um tom de verde mais claro; o resto do formulário fica em "Formulário público"
  const porCanal = {};
  for (const { canal } of comCanal ?? []) porCanal[canal] = (porCanal[canal] ?? 0) + 1;
  const canaisTopo = Object.entries(porCanal)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([chave, n], i) => ({
      nome: nomeCanal(chave),
      n,
      cor: `color-mix(in srgb, var(--cor-destaque) ${100 - i * 18}%, transparent)`,
    }));
  const noTopo = canaisTopo.reduce((soma, c) => soma + c.n, 0);
  const origens = [
    ...canaisTopo,
    {
      nome: canaisTopo.length ? "Formulário (outros sítios)" : "Formulário público",
      n: Math.max(0, (totalFormulario ?? 0) - noTopo),
      cor: canaisTopo.length ? "color-mix(in srgb, var(--cor-destaque) 25%, transparent)" : "var(--cor-destaque)",
    },
    { nome: "Adicionados à mão", n: Math.max(0, totalClientes - (totalFormulario ?? 0)), cor: "var(--cor-texto-fraco)" },
  ];

  // "Primeiros passos": cada passo fica feito quando os dados o confirmam
  const passos = [
    { texto: "Criar a conta da empresa", feito: true },
    // só o admin pode juntar a equipa, por isso só ele vê este passo
    ...(eAdmin
      ? [{ texto: "Adicionar a equipa comercial", feito: (tamanhoEquipa ?? 1) > 1, href: "/painel/equipa" }]
      : []),
    { texto: "Registar o primeiro lead", feito: totalClientes > 0, href: "/painel/clientes/novo" },
    {
      texto: "Receber o primeiro contacto pelo formulário",
      feito: (doFormulario ?? []).length > 0,
    },
  ];
  const passosFeitos = passos.filter((p) => p.feito).length;
  // só o administrador monta a empresa, por isso só ele vê os "Primeiros passos";
  // quando está tudo feito, o bloco deixa de aparecer (já não ajuda ninguém)
  const mostrarPassos = eAdmin && passosFeitos < passos.length;

  const primeiroNome = perfil.nome.split(" ")[0];
  // "Bom dia" até ao meio-dia, "Boa tarde" até às 20h, depois "Boa noite" (hora de Portugal)
  const hora = Number(
    new Intl.DateTimeFormat("pt-PT", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Lisbon" }).format(new Date())
  );
  const saudacao = hora < 12 ? "Bom dia" : hora < 20 ? "Boa tarde" : "Boa noite";
  const totalSemanas = valoresSemanas.reduce((a, b) => a + b, 0);

  return (
    // "entrar": a página aparece de uma vez ao abrir (uma só animação, não uma por bloco)
    <div className={`entrar ${styles.pagina}`}>
      {/* cabeçalho: saudação à esquerda, ações à direita */}
      <header className={styles.cabecalho}>
        <div>
          <h1>
            {saudacao}, {primeiroNome}
          </h1>
          <p className={styles.subtitulo}>Este é o resumo do CRM da {empresa.nome} para hoje.</p>
          <div className={styles.comprimidos}>
            <span>
              <Icone nome="calendario" tamanho={15} />
              {new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" }).format(new Date())}
            </span>
            <span>
              <Icone nome="utilizadores" tamanho={15} />
              {eAdmin ? "Toda a empresa" : "Os meus leads"}
            </span>
          </div>
        </div>
        <div className={styles.acoes}>
          {/* <a> normal (não <Link>) porque descarrega um ficheiro, não abre uma página */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/painel/clientes/exportar" className="botao botao-secundario">
            <Icone nome="folha" tamanho={16} /> Exportar
          </a>
          <Link href="/painel/clientes/novo" className="botao">
            <Icone nome="mais" tamanho={16} /> Novo lead
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
              Entraste como comercial da equipa. Vês os leads e as tarefas de que és responsável.
              {totalClientes === 0 && ` Ainda não tens leads: pede a ${quemAtribui} para te atribuir, ou adiciona um novo.`}
            </p>
          </div>
          <span className={styles.papelEmpresa}>Comercial</span>
        </section>
      )}

      {/* 3 cartões grandes: painel de cor suave (nome, variação, número) e rodapé com o detalhe e o link */}
      <section className={styles.numeros}>
        {numeros.map((n) => (
          <article key={n.rotulo} className={styles.cartao}>
            <div className={styles.frenteCartao}>
              <div className={styles.topoCartao}>
                <h2>
                  <Icone nome={n.icone} tamanho={18} />
                  {n.rotulo}
                </h2>
                {n.variacao != null && (
                  <span className={n.variacao >= 0 ? styles.tendenciaBoa : styles.tendenciaMa}>
                    <Icone nome={n.variacao >= 0 ? "subida" : "descida"} tamanho={16} />
                    {n.variacao >= 0 ? "+" : ""}
                    {n.variacao}%
                  </span>
                )}
              </div>
              <p className={styles.valor}>
                <strong>
                  <ContarNumero valor={n.valor} formato={n.formato} />
                </strong>
              </p>
            </div>
            <div className={styles.rodapeCartao}>
              <span>
                <Icone nome={n.iconeRodape} tamanho={15} />
                {n.rodape}
              </span>
              <Link href={n.href} className={styles.verDetalhes} aria-label={`Ver detalhes: ${n.rotulo}`}>
                Ver detalhes
              </Link>
            </div>
          </article>
        ))}
      </section>

      {/* reuniões de hoje (marcações online): só aparece quando há */}
      {marcacoesHoje?.length > 0 && (
        <section className={styles.bloco} aria-labelledby="titulo-marcacoes-hoje">
          <header className={styles.topoBloco}>
            <div>
              <h2 id="titulo-marcacoes-hoje">Marcações de hoje</h2>
              <p className={styles.subtitulo}>
                {marcacoesHoje.length === 1 ? "1 reunião marcada online." : `${marcacoesHoje.length} reuniões marcadas online.`}
              </p>
            </div>
            <Link href="/painel/marcacoes" className={`botao botao-secundario ${styles.botaoPequeno}`}>
              Ver marcações
            </Link>
          </header>
          <ul className={styles.listaMarcacoes}>
            {marcacoesHoje.map((m) => (
              <li key={m.id}>
                <Link href={`/painel/clientes/${m.cliente_id}`}>
                  <strong>{horaLisboa.format(new Date(m.inicio))}</strong>
                  <span>{m.clientes?.nome ?? "Lead"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* meta de vendas da empresa este mês (só o admin: é ele que a define e vê a empresa toda) */}
      {eAdmin && (
        <MetaMes
          meta={meta ? Number(meta.valor) : null}
          ganho={ganhoMes}
          nomeMes={nomeMes}
          previsao={
            meta
              ? previsaoMes({
                  ganho: ganhoMes,
                  meta: Number(meta.valor),
                  dia: Number(hoje.slice(8, 10)),
                  diasMes: new Date(ano, mes, 0).getDate(), // dia 0 do mês seguinte = último dia deste
                  negociacao: valorNegociacao,
                })
              : null
          }
        />
      )}

      {/* gráfico grande à esquerda + origem dos leads à direita (como "Sales Overview" e "Lead Source") */}
      {!semDados && (
        <section className={styles.linhaPrincipal}>
          <article className={styles.bloco}>
            <header className={styles.topoBloco}>
              <div>
                <h2 className={styles.tituloIcone}>
                  <Icone nome="grafico" tamanho={18} /> Novos leads
                </h2>
                <p className={styles.subtitulo}>Quantos leads entraram em cada uma das últimas 8 semanas.</p>
              </div>
              <p className={styles.numeroGrande}>{totalSemanas}</p>
            </header>
            <div className={styles.areaGrafico}>
              <Grafico
                tipo={tipoGrafico === "barras" ? "bar" : "line"}
                preencher={tipoGrafico === "area"}
                etiquetas={semanas.map((s) => s.etiqueta)}
                valores={valoresSemanas}
                cores="var(--cor-destaque)"
              />
            </div>
          </article>

          <article className={styles.bloco}>
            <h2 className={styles.tituloIcone}>
              <Icone nome="origem" tamanho={18} /> Origem dos leads
            </h2>
            <div>
              <p className={styles.numeroGrande}>{totalClientes}</p>
              <p className={styles.subtitulo}>Leads no total</p>
            </div>
            <div className={styles.separador}>
              <h3>De onde vêm</h3>
              <p className={styles.subtitulo}>Como cada lead chegou ao CRM.</p>
            </div>
            <ul className={styles.origens}>
              {origens.map((o) => (
                <li key={o.nome}>
                  <i style={{ background: o.cor }}></i>
                  <span>{o.nome}</span>
                  <strong>{o.n}</strong>
                  <span className={styles.barraOrigem} aria-hidden="true">
                    <span style={{ width: `${totalClientes ? (o.n / totalClientes) * 100 : 0}%`, background: o.cor }}></span>
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {/* as minhas tarefas + atividade recente ao lado */}
      <section className={styles.linhaPrincipal}>
      <article className={styles.bloco}>
        <header className={styles.topoBloco}>
          <div>
            <h2>As minhas tarefas</h2>
            <p className={styles.subtitulo}>
              {tarefas.length === 0 ? "Nada por fazer." : "Das mais urgentes para as menos urgentes."}
            </p>
          </div>
          <div className={styles.acoes}>
            {/* o admin vê a equipa toda na página Tarefas: aqui abre já filtrada nas tarefas dele */}
            <Link
              href={eAdmin ? `/painel/tarefas?pessoa=${perfil.id}` : "/painel/tarefas"}
              className={`botao botao-secundario ${styles.botaoPequeno}`}
            >
              Ver todas ({totalTarefas ?? 0})
            </Link>
            <Link href="/painel/tarefas?nova=1" className={`botao botao-secundario ${styles.botaoPequeno}`}>
              <Icone nome="mais" tamanho={15} /> Nova tarefa
            </Link>
          </div>
        </header>
        <TabelaTarefas
          tarefas={tarefas}
          membros={eAdmin ? (equipa ?? []) : null}
          perfilId={perfil.id}
          hoje={hoje}
          mensagemVazia="Não tens tarefas por fazer. Cria tarefas na página Tarefas ou na ficha de cada lead."
        />
      </article>
      <div className={styles.atividade}>
        <AtividadeRecente eventos={eventos} />
      </div>
      </section>

      {/* dois gráficos lado a lado */}
      {!semDados && (
        <section className={styles.grelha}>
          <article className={styles.bloco}>
            <header className={styles.topoBloco}>
              <h2>Leads por estado</h2>
              <Link href="/painel/pipeline" className={styles.verTudo}>
                Ver pipeline
              </Link>
            </header>
            {totalClientes === 0 ? (
              <p className={styles.subtitulo}>
                Ainda não há leads.{" "}
                <Link href="/painel/clientes/novo" className={styles.verTudo}>
                  Adicionar lead
                </Link>
              </p>
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
                    <strong>{totalClientes}</strong>
                    <small>leads</small>
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
            {/* sem valores previstos, o gráfico seria só um eixo vazio "0 € – 1 €" */}
            {valorPorFase.every((v) => !v) ? (
              <p className={styles.subtitulo}>
                {totalClientes === 0 ? "Ainda não há leads." : "Ainda não há valores previstos nos leads."}
              </p>
            ) : (
              <div className={styles.areaGrafico}>
                <Grafico
                  tipo="bar"
                  etiquetas={ESTADOS.map((e) => e.texto)}
                  valores={valorPorFase}
                  cores={ESTADOS.map((e) => e.cor)}
                  formato="euros"
                />
              </div>
            )}
          </article>
        </section>
      )}

      {/* resultados: taxa de fecho, tempo até fechar e (admin) ganhos por membro */}
      {!semDados && (
        <section className={eAdmin ? styles.grelhaTres : styles.grelha} aria-label="Resultados">
          <article className={styles.bloco}>
            <header>
              <h2>Taxa de fecho</h2>
              <p className={styles.subtitulo}>Dos negócios decididos, quantos foram ganhos</p>
            </header>
            {fecho === null ? (
              <p className={styles.subtitulo}>Ainda nenhum lead passou a Ativo ou Perdido.</p>
            ) : (
              <>
                <p className={styles.numeroGrande}>{fecho}%</p>
                {/* barra: verde = ganhos, o resto = perdidos */}
                <div className={styles.barraFecho} aria-hidden="true">
                  <span style={{ width: `${fecho}%` }}></span>
                </div>
                <p className={styles.subtitulo}>
                  {contagem.ativo ?? 0} ganhos · {contagem.perdido ?? 0} perdidos
                </p>
              </>
            )}
          </article>

          <article className={styles.bloco}>
            <header>
              <h2>Tempo até fechar</h2>
              <p className={styles.subtitulo}>Desde que o lead entra até passar a Ativo</p>
            </header>
            {tempoFecho === null ? (
              <p className={styles.subtitulo}>Aparece quando o primeiro lead passar a Ativo na pipeline.</p>
            ) : (
              <>
                <p className={styles.numeroGrande}>{textoDias(tempoFecho.media)}</p>
                <p className={styles.subtitulo}>
                  Em média · metade fecha em {textoDias(tempoFecho.mediana)} ou menos · {tempoFecho.n}{" "}
                  {tempoFecho.n === 1 ? "negócio" : "negócios"}
                </p>
              </>
            )}
          </article>

          {ganhosEquipa && (
            <article className={styles.bloco}>
              <header className={styles.topoBloco}>
                <h2>Ganhos por membro</h2>
                <Link href="/painel/equipa" className={styles.verTudo}>
                  Ver equipa
                </Link>
              </header>
              <ul className={styles.ranking}>
                {ganhosEquipa.map((m) => (
                  <li key={m.id}>
                    <Link href={`/painel/equipa/${m.id}`}>{m.nome}</Link>
                    <strong>{m.n}</strong>
                    <span className={styles.barraRanking} aria-hidden="true">
                      <span style={{ width: `${(m.n / maisGanhos) * 100}%` }}></span>
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </section>
      )}

      {/* formulário público (+ primeiros passos, enquanto não estiverem todos feitos) */}
      <section className={mostrarPassos ? styles.grelha : undefined}>
        <article className={`${styles.bloco} ${styles.blocoFormulario}`}>
          <div>
            <h2>{eAdmin ? "O teu formulário público" : `Formulário da ${empresa.nome}`}</h2>
            <p className={styles.subtitulo}>
              Partilha este link no site, nas redes sociais ou por email. Quem o preencher entra como lead
              &quot;Novo&quot;. Escolhe onde o vais pôr para saberes de onde vêm os leads.
            </p>
          </div>
          {/* o link, com a escolha do sítio onde vai ser partilhado (?de=instagram) */}
          <LinkFormulario slug={empresa.slug} classeBotao={`botao botao-secundario ${styles.botaoPequeno}`} />
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
