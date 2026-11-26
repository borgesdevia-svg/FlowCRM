# Trabalho da noite (2026-11-26/27): Marcações online

O aluno foi descansar e pediu "algo maior". Função escolhida: **Marcações online**.
O cliente abre um link público (`/m/<slug>`), escolhe o dia e a hora livres e deixa o contacto.
A marcação entra no CRM: lead novo (ou o mesmo lead, se já existir), tarefa "Reunião" para o
responsável, aviso no telemóvel e uma página no painel com as próximas marcações.

## Decisões (tomadas por mim, fáceis de mudar)
- Disponível nos dois planos (Essencial e Pro).
- Horário da empresa: dias da semana, hora de início e de fim, duração de cada marcação
  (15 a 120 min), antecedência mínima (horas) e até quantos dias à frente se pode marcar.
- Fuso horário: sempre o de Portugal (Europe/Lisbon), também na mudança da hora.
- Os leads que chegam por marcação ficam com origem "formulário" e canal "marcacoes"
  (aparecem como "Marcações" na Origem dos leads).
- Duas marcações nunca ficam à mesma hora (a base de dados recusa a segunda).
- Contra spam: o mesmo limite por IP do formulário (10 por hora).

## Passos
- [x] 1. Migração 36: tabelas `marcacoes_config` e `marcacoes`, com RLS
- [x] 2. `lib/marcacoes.js`: horários livres de um dia (com testes, incluindo a mudança da hora)
- [ ] 3. Página pública `/m/[slug]`: escolher dia, hora e deixar o contacto
- [ ] 4. Server Action de marcar (validação, limite por IP, lead, tarefa, aviso)
- [ ] 5. Painel `/painel/marcacoes`: próximas marcações + horário (admin) + cancelar
- [ ] 6. Menu, ficha do lead (marcações do lead), link na Visão geral
- [ ] 7. Testar no browser (página pública, computador e telemóvel)
- [ ] 8. Rever erros, lint, testes, build, commit e push

## Notas
