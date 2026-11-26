// Procura outro lead da empresa com o mesmo email ou telefone (usado ao guardar um lead
// e na ficha do lead). Fica fora de lib/acoes/ de propósito: lá, cada função exportada
// passava a poder ser chamada pelo browser.
// Usa o cliente com sessão, por isso o RLS aplica-se: o comercial só vê os seus leads.
// Devolve { id, nome, campo } ou null. Se a pesquisa falhar, não avisa.
import { encontrarDuplicado, escaparIlike, fimDoTelefone } from "@/lib/duplicados";

export async function procurarDuplicado(supabase, dados, ignorarId) {
  const pedidos = [];
  if (dados.email) {
    pedidos.push(supabase.from("clientes").select("id, nome, email, telefone").ilike("email", escaparIlike(dados.email)).limit(5));
  }
  const fim = fimDoTelefone(dados.telefone);
  if (fim) {
    // primeiro filtra pelos últimos algarismos na base de dados; a comparação exata é feita em JS
    pedidos.push(supabase.from("clientes").select("id, nome, email, telefone").ilike("telefone", `%${fim}`).limit(50));
  }
  const respostas = await Promise.all(pedidos);
  const candidatos = respostas.flatMap((r) => r.data ?? []);
  return encontrarDuplicado(dados, candidatos, ignorarId || null);
}
