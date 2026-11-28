import { timingSafeEqual } from "node:crypto";
import { sincronizarTodas } from "@/lib/email/receber";

// ROUTE HANDLER: POST /api/emails/receber
// Chamado de 5 em 5 minutos pelo pg_cron do Supabase (migração 42, job "receber-emails"),
// com o cabeçalho "Authorization: Bearer <EMAIL_CRON_SEGREDO>". Vai ver as caixas de entrada
// de todas as contas de e-mail ligadas e guarda as respostas dos leads (lib/email/receber.js).
// Sem o segredo certo responde 401 e não faz nada.

export const maxDuration = 60; // segundos (a sincronização para sozinha aos ~50 s)

function autorizado(cabecalho) {
  const segredo = process.env.EMAIL_CRON_SEGREDO;
  if (!segredo) return false;
  const esperado = Buffer.from(`Bearer ${segredo}`);
  const recebido = Buffer.from(String(cabecalho ?? ""));
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

export async function POST(request) {
  if (!autorizado(request.headers.get("authorization"))) {
    return new Response("Não autorizado.", { status: 401 });
  }
  try {
    const resumo = await sincronizarTodas();
    return Response.json(resumo);
  } catch (e) {
    console.error("E-mail (cron): falhou", e?.message ?? e);
    return Response.json({ erro: "Falhou a sincronização." }, { status: 500 });
  }
}
