import { obterSessao } from "@/lib/sessao";
import { ESTADOS, obterEstado } from "@/lib/estados";

// ROUTE HANDLER: em vez de uma página, este ficheiro devolve um ficheiro CSV para descarregar.
// Rota: GET /painel/clientes/exportar?q=...&estado=...
// Exporta os mesmos clientes que a lista mostra (mesma pesquisa e mesmo filtro).
// O RLS aplica-se: o admin exporta os da empresa, o comercial só os seus.

// Prepara um valor para uma célula do CSV.
function celula(valor) {
  let texto = valor === null || valor === undefined ? "" : String(valor);

  // Segurança ("CSV injection"): no Excel, uma célula que começa por = + - @ é uma FÓRMULA.
  // Como os nomes podem vir do formulário público (qualquer pessoa escreve lá),
  // pomos um apóstrofo antes, para o Excel mostrar o texto em vez de o executar.
  if (/^[=+\-@\t\r]/.test(texto)) texto = "'" + texto;

  // aspas, ponto e vírgula ou mudanças de linha obrigam a pôr o texto entre aspas
  // (e as aspas de dentro escrevem-se a dobrar)
  if (/[";\n\r]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export async function GET(request) {
  const { supabase } = await obterSessao(); // sem sessão, manda para o login

  // os mesmos filtros da lista de clientes
  const parametros = request.nextUrl.searchParams;
  const estado = parametros.get("estado") ?? "";
  const termo = (parametros.get("q") ?? "").replace(/[%,()]/g, "").trim();

  let consulta = supabase
    .from("clientes")
    .select("nome, email, telefone, estado, valor_previsto, origem, criado_em, perfis(nome)")
    .order("criado_em", { ascending: false });
  if (ESTADOS.some((e) => e.chave === estado)) consulta = consulta.eq("estado", estado);
  if (termo) consulta = consulta.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%`);

  const { data } = await consulta;

  // uma linha de títulos + uma linha por cliente; colunas separadas por ";"
  const titulos = ["Nome", "Email", "Telefone", "Estado", "Valor previsto (€)", "Responsável", "Origem", "Criado em"];
  const linhas = (data ?? []).map((c) =>
    [
      c.nome,
      c.email,
      c.telefone,
      obterEstado(c.estado).texto,
      c.valor_previsto !== null ? String(c.valor_previsto).replace(".", ",") : "", // vírgula decimal (PT)
      c.perfis?.nome ?? "Por atribuir",
      c.origem === "formulario" ? "Formulário" : "Manual",
      c.criado_em.slice(0, 10), // só a data, AAAA-MM-DD
    ]
      .map(celula)
      .join(";")
  );

  // "\uFEFF" (BOM) no início diz ao Excel que o ficheiro é UTF-8: assim os acentos aparecem bem.
  // "\r\n" é a mudança de linha que o Excel espera.
  const csv = "\uFEFF" + [titulos.join(";"), ...linhas].join("\r\n");
  const hoje = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // "attachment" = o browser descarrega o ficheiro em vez de o mostrar
      "Content-Disposition": `attachment; filename="clientes-${hoje}.csv"`,
      "Cache-Control": "no-store", // dados privados: não guardar em cache
    },
  });
}
