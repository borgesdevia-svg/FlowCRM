import { obterSessao } from "@/lib/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { eUuid } from "@/lib/validacao";
import { abreNoBrowser } from "@/lib/documentos";

// ROUTE HANDLER: GET /painel/clientes/<lead>/documentos/<documento>
// Abre um documento do lead. O bucket é privado: aqui confirma-se pelo RLS que a pessoa pode ver
// o documento e manda-se o browser para um link do Storage que só vale 60 segundos
// (assim não fica nenhum link permanente a circular).
// PDFs e imagens abrem no browser; Word, Excel, ZIP... descarregam com o nome original.

export async function GET(request, { params }) {
  const { supabase } = await obterSessao(); // sem sessão, manda para o login
  const { id, documento } = await params;
  if (!eUuid(id) || !eUuid(documento)) return new Response("Documento não encontrado.", { status: 404 });

  const { data: doc } = await supabase
    .from("documentos")
    .select("caminho, nome, tipo_mime")
    .eq("id", documento)
    .eq("cliente_id", id)
    .maybeSingle();
  if (!doc) return new Response("Documento não encontrado.", { status: 404 });

  const { data, error } = await criarClienteAdmin()
    .storage.from("documentos")
    .createSignedUrl(doc.caminho, 60, abreNoBrowser(doc.tipo_mime) ? undefined : { download: doc.nome });
  if (error || !data?.signedUrl) return new Response("Não foi possível abrir o documento.", { status: 500 });

  return Response.redirect(data.signedUrl, 302);
}
