-- 05 — Atividade recente
-- Os eventos automáticos (ex.: "passou para Em negociação", "concluiu a tarefa X")
-- passam a ser guardados na tabela interacoes, com o tipo novo 'sistema'.
-- Assim aparecem no histórico da ficha do cliente e na "Atividade recente" do painel,
-- sem precisarmos de uma tabela nova (as regras RLS das interações continuam a valer).

-- Uma regra CHECK não se pode editar: apaga-se e cria-se de novo, agora com 'sistema'.
alter table public.interacoes drop constraint interacoes_tipo_check;

alter table public.interacoes
  add constraint interacoes_tipo_check
  check (tipo in ('nota', 'chamada', 'email', 'reuniao', 'sistema'));
