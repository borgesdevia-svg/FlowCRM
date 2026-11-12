import { obterEstado } from "@/lib/estados";

// Regista um EVENTO AUTOMÁTICO no histórico de um cliente (tipo "sistema").
// Ex.: "Passou para Em negociação", "Concluiu a tarefa: Enviar proposta".
// Estes eventos aparecem na ficha do cliente e na "Atividade recente" do painel.
//
// Só é chamada pelo código de servidor (Server Actions), nunca pelo browser.
// Se falhar, não faz mal: a ação principal (mudar de fase, concluir a tarefa)
// já foi feita, e não a queremos desfazer só porque o registo falhou.
export async function registarEvento(supabase, perfil, clienteId, texto) {
  await supabase.from("interacoes").insert({
    empresa_id: perfil.empresa_id,
    cliente_id: clienteId,
    autor_id: perfil.id, // quem fez a ação
    tipo: "sistema",
    nota: texto,
  });
}

// texto do evento de mudança de fase: "Passou para Em negociação"
export function textoMudancaFase(estado) {
  return `Passou para ${obterEstado(estado).texto}`;
}
