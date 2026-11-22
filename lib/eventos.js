import { obterEstado } from "@/lib/estados";

// EVENTOS AUTOMÁTICOS do histórico de um cliente (interações do tipo "sistema").
// Ex.: "Passou para Em negociação", "Concluiu a tarefa: Enviar proposta", "Entregue a Ana".
//
// Quem os escreve é a BASE DE DADOS (triggers da migração 21), quando a coisa acontece
// mesmo. O site já não os insere: assim ninguém consegue inventar um evento falso.
// Este ficheiro só tem o texto, para o site o poder procurar (ex.: no Início).

// texto do evento de mudança de fase: "Passou para Em negociação"
// (tem de ser igual ao que a função privado.evento_mudanca_fase escreve)
export function textoMudancaFase(estado) {
  return `Passou para ${obterEstado(estado).texto}`;
}
