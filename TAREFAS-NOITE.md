# Trabalho da noite (2026-11-26/27): Marcações online

O aluno foi descansar e pediu "algo maior". Função escolhida: **Marcações online**.
O cliente abre um link público (`/m/<slug>`), escolhe o dia e a hora livres e deixa o contacto.
A marcação entra no CRM: lead novo (ou o mesmo lead, se já existir), tarefa "Reunião" para o
responsável, aviso no telemóvel e uma página no painel com as próximas marcações.

## Como experimentar
1. Painel > **Marcações** (novo, no menu Vendas) > em "Horário", ligar "Aceitar marcações online",
   escolher dias e horas e carregar em **Guardar horário**.
2. Copiar o "Link para marcar" (`/m/<slug-da-empresa>`) e abri-lo noutro separador.
3. Escolher dia, hora, preencher e **Confirmar marcação**.
4. No painel: a reunião aparece em Marcações, na ficha do lead (cartão "Reuniões"), nas Tarefas
   e, se for hoje, na Visão geral ("Marcações de hoje").

## Decisões (tomadas por mim, fáceis de mudar)
- Disponível nos dois planos (Essencial e Pro).
- Horário da empresa: dias da semana, hora de início e de fim, duração de cada marcação
  (15 a 120 min), antecedência mínima (horas) e até quantos dias à frente se pode marcar.
- Fuso horário: sempre o de Portugal (Europe/Lisbon), também na mudança da hora.
- Os leads que chegam por marcação ficam com origem "formulário" e canal "marcacoes"
  (aparecem como "Marcações" na Origem dos leads e "Chegou pelas marcações online" na ficha).
- Se o email já existe na empresa, a marcação fica nesse lead (não cria repetidos).
- Duas marcações nunca ficam à mesma hora (a base de dados recusa a segunda).
- Contra spam: o mesmo limite por IP do formulário (10 por hora).
- A equipa também marca na ficha do lead ("Marcar reunião"), nas mesmas horas livres, mas sem
  antecedência mínima e mesmo com a página pública desligada.
- Cancelar pede confirmação ("Sim, cancelar"), fica no histórico e apaga a tarefa da reunião.

## Passos
- [x] 1. Migração 36: tabelas `marcacoes_config` e `marcacoes`, com RLS (aplicada)
- [x] 2. `lib/marcacoes.js`: horários livres (com testes, incluindo a mudança da hora)
- [x] 3. Página pública `/m/[slug]`: escolher dia, hora e deixar o contacto
- [x] 4. Server Action de marcar (validação, limite por IP, lead, tarefa, aviso no telemóvel)
- [x] 5. Painel `/painel/marcacoes`: próximas marcações + horário (admin) + cancelar
- [x] 6. Menu, ficha do lead, "Marcações de hoje" na Visão geral, Atividade recente
- [x] 7. Testado no browser (página pública e painel, computador e telemóvel)
- [x] 8. Lint, testes (97), build, commits e push (deploy em sucesso)
- [x] Extra: "Adicionar ao calendário" (.ics) e Google Calendar depois de marcar
- [x] Extra: a equipa marca reuniões na ficha do lead
- [x] Extra: landing com "Marcações online" e "Meta do mês"
- [x] Extra: tirado o brilho verde do login/registo/recuperação

## Notas
- Testado na empresa de teste (teste-qa-lda): email inválido recusado, marcação criada com lead,
  tarefa e histórico, hora ocupada sai da lista, o mesmo email junta-se ao lead existente,
  cancelar, guardar o horário (com erro e sem erro), marcar pela ficha. Os dados de teste foram
  apagados; a página de marcações dessa empresa ficou ligada.
- RLS testado com SQL: outra empresa não vê nada; o comercial só vê as marcações dos seus leads;
  ninguém cria nem muda a hora pela API (só cancela); o comercial não muda o horário.
- O erro "enviarAvisos is not a function" era cache do `npm run dev`: depois de reiniciar desapareceu.
  Se aparecer no teu PC, reinicia o `npm run dev`.
- Ainda não há email para o cliente (confirmação/lembrete): fica para quando houver Resend.
