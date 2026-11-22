-- 22: números da página Relatórios da equipa (2026-11-22), contados na base de dados
--
-- Uma linha por pessoa (responsável ou autor), com o que aconteceu DESDE p_desde:
--   recebidos      leads que entraram (criado_em) e de que a pessoa é responsável
--   ganhos         leads cuja última decisão no período foi "Passou para Ativo"
--   perdidos       leads cuja última decisão no período foi "Passou para Perdido"
--   valor_ganho    soma do valor previsto dos ganhos
--   fechos_medidos / dias_ate_fechar
--                  para o tempo médio até fechar: dias entre o lead entrar e passar a
--                  Ativo pela PRIMEIRA vez, quando essa primeira vez foi no período
--                  (o site divide um pelo outro). Leads importados ou criados já Ativos
--                  não têm o evento, por isso não contam.
--   registos       notas, chamadas, emails e reuniões que a pessoa escreveu
--   tarefas_feitas tarefas que a pessoa concluiu ("Concluiu a tarefa: ...")
--
-- Ganhos e perdidos contam para o responsável ATUAL do lead. A linha com perfil_id vazio
-- são leads sem responsável.
-- Os eventos "Passou para ..." são escritos pelos triggers da migração 21; os textos têm
-- de ser iguais aos de privado.texto_estado.
--
-- "security invoker": corre com as permissões de quem chama, por isso o RLS aplica-se
-- (só conta dados da empresa de quem pede). A página só a usa para administradores.

create or replace function public.relatorio_equipa(p_desde timestamptz)
returns table (
  perfil_id uuid,
  recebidos bigint,
  ganhos bigint,
  perdidos bigint,
  valor_ganho numeric,
  fechos_medidos bigint,
  dias_ate_fechar numeric,
  registos bigint,
  tarefas_feitas bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with
  recebidos as (
    select c.responsavel_id as perfil_id, count(*) as n
    from public.clientes c
    where c.criado_em >= p_desde
    group by c.responsavel_id
  ),
  -- a ÚLTIMA decisão (Ativo ou Perdido) de cada lead dentro do período
  decisao as (
    select distinct on (i.cliente_id) i.cliente_id, i.nota
    from public.interacoes i
    where i.tipo = 'sistema'
      and i.criado_em >= p_desde
      and i.nota in ('Passou para Ativo', 'Passou para Perdido')
    order by i.cliente_id, i.criado_em desc
  ),
  -- a PRIMEIRA vez que cada lead passou a Ativo (desde sempre)
  primeiro_ativo as (
    select i.cliente_id, min(i.criado_em) as quando
    from public.interacoes i
    where i.tipo = 'sistema' and i.nota = 'Passou para Ativo'
    group by i.cliente_id
  ),
  decisoes as (
    select
      c.responsavel_id as perfil_id,
      count(*) filter (where d.nota = 'Passou para Ativo') as ganhos,
      count(*) filter (where d.nota = 'Passou para Perdido') as perdidos,
      coalesce(sum(c.valor_previsto) filter (where d.nota = 'Passou para Ativo'), 0) as valor_ganho,
      count(*) filter (where d.nota = 'Passou para Ativo' and pa.quando >= p_desde) as fechos_medidos,
      coalesce(
        sum(greatest(0, extract(epoch from (pa.quando - c.criado_em)) / 86400))
          filter (where d.nota = 'Passou para Ativo' and pa.quando >= p_desde),
        0
      ) as dias_ate_fechar
    from decisao d
    join public.clientes c on c.id = d.cliente_id
    left join primeiro_ativo pa on pa.cliente_id = d.cliente_id
    group by c.responsavel_id
  ),
  atividade as (
    select
      i.autor_id as perfil_id,
      count(*) filter (where i.tipo <> 'sistema') as registos,
      count(*) filter (where i.tipo = 'sistema' and i.nota like 'Concluiu a tarefa: %') as tarefas_feitas
    from public.interacoes i
    where i.criado_em >= p_desde and i.autor_id is not null
    group by i.autor_id
  ),
  -- todas as pessoas que aparecem em alguma das contas (union junta e tira repetidos)
  pessoas as (
    select r.perfil_id from recebidos r
    union
    select d.perfil_id from decisoes d
    union
    select a.perfil_id from atividade a
  )
  select
    p.perfil_id,
    coalesce(r.n, 0),
    coalesce(d.ganhos, 0),
    coalesce(d.perdidos, 0),
    coalesce(d.valor_ganho, 0),
    coalesce(d.fechos_medidos, 0),
    coalesce(d.dias_ate_fechar, 0),
    coalesce(a.registos, 0),
    coalesce(a.tarefas_feitas, 0)
  from pessoas p
  -- "is not distinct from" para a linha sem responsável (perfil_id vazio) também juntar
  left join recebidos r on r.perfil_id is not distinct from p.perfil_id
  left join decisoes d on d.perfil_id is not distinct from p.perfil_id
  left join atividade a on a.perfil_id is not distinct from p.perfil_id
$$;

revoke execute on function public.relatorio_equipa(timestamptz) from public, anon;
grant execute on function public.relatorio_equipa(timestamptz) to authenticated;
