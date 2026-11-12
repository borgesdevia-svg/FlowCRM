-- =====================================================================
-- FlowCRM · 02 · Segurança: RLS (Row Level Security)
-- RLS = regras que o Postgres aplica a CADA linha. Mesmo que o site tenha
-- um erro, a base de dados só devolve as linhas que a pessoa pode ver.
--
-- Regras principais:
--  - Ninguém vê dados de outra empresa.
--  - O admin vê todos os clientes da empresa; o comercial só os seus.
--  - Visitantes sem login (anon) não acedem a nenhuma tabela.
-- =====================================================================

-- ---------- funções auxiliares ----------
-- Ficam num schema "privado", que NÃO é exposto pela API do Supabase.
-- "security definer" = correm com permissões do dono, para poderem ler a
-- tabela perfis sem ficarem presas nas próprias regras RLS (evita um ciclo).
create schema if not exists privado;
grant usage on schema privado to authenticated;

-- empresa do utilizador com login (auth.uid() = id do utilizador atual)
create function privado.minha_empresa()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select empresa_id from public.perfis where id = (select auth.uid());
$$;

-- o utilizador atual é admin?
create function privado.sou_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'admin'
  );
$$;

revoke all on function privado.minha_empresa() from public;
revoke all on function privado.sou_admin() from public;
grant execute on function privado.minha_empresa() to authenticated;
grant execute on function privado.sou_admin() to authenticated;

-- ---------- ligar o RLS em todas as tabelas ----------
alter table public.empresas       enable row level security;
alter table public.perfis         enable row level security;
alter table public.clientes       enable row level security;
alter table public.interacoes     enable row level security;
alter table public.tarefas        enable row level security;
alter table public.automacoes_log enable row level security;

-- visitantes sem login não tocam em nenhuma tabela
-- (o formulário público usa uma função própria, no ficheiro 03)
revoke all on public.empresas, public.perfis, public.clientes,
              public.interacoes, public.tarefas, public.automacoes_log
from anon;

-- ---------- empresas ----------
create policy "ver a minha empresa"
  on public.empresas for select to authenticated
  using (id = (select privado.minha_empresa()));

create policy "admin edita a sua empresa"
  on public.empresas for update to authenticated
  using (id = (select privado.minha_empresa()) and (select privado.sou_admin()))
  with check (id = (select privado.minha_empresa()));
-- (criar empresa: só pelo registo, no ficheiro 03. Apagar: não permitido)

-- ---------- perfis ----------
create policy "ver os colegas da minha empresa"
  on public.perfis for select to authenticated
  using (empresa_id = (select privado.minha_empresa()));

-- cada um só pode mudar o SEU nome. O papel e a empresa ficam protegidos:
-- sem isto, um comercial podia promover-se a admin.
revoke update on public.perfis from authenticated;
grant update (nome) on public.perfis to authenticated;

create policy "editar o meu nome"
  on public.perfis for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- (criar/apagar membros da equipa: feito no servidor pelo admin, na Fase 3)

-- ---------- clientes ----------
-- admin: todos os clientes da empresa | comercial: só aqueles de que é responsável
create policy "ver clientes"
  on public.clientes for select to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and ((select privado.sou_admin()) or responsavel_id = (select auth.uid()))
  );

create policy "criar clientes"
  on public.clientes for insert to authenticated
  with check (
    empresa_id = (select privado.minha_empresa())
    and ((select privado.sou_admin()) or responsavel_id = (select auth.uid()))
  );

create policy "editar clientes"
  on public.clientes for update to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and ((select privado.sou_admin()) or responsavel_id = (select auth.uid()))
  )
  with check (
    empresa_id = (select privado.minha_empresa())
    and ((select privado.sou_admin()) or responsavel_id = (select auth.uid()))
  );

create policy "apagar clientes"
  on public.clientes for delete to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and ((select privado.sou_admin()) or responsavel_id = (select auth.uid()))
  );

-- ---------- interações ----------
-- Só se veem/criam interações de clientes que a pessoa consegue ver.
-- (o "exists" sobre clientes já aplica as regras dos clientes acima)
create policy "ver interacoes"
  on public.interacoes for select to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

create policy "criar interacoes"
  on public.interacoes for insert to authenticated
  with check (
    empresa_id = (select privado.minha_empresa())
    and autor_id = (select auth.uid())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

-- só o autor (ou o admin) altera/apaga uma nota
create policy "editar interacoes"
  on public.interacoes for update to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and (autor_id = (select auth.uid()) or (select privado.sou_admin()))
  )
  with check (
    empresa_id = (select privado.minha_empresa())
    and (autor_id = (select auth.uid()) or (select privado.sou_admin()))
  );

create policy "apagar interacoes"
  on public.interacoes for delete to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and (autor_id = (select auth.uid()) or (select privado.sou_admin()))
  );

-- ---------- tarefas ----------
create policy "ver tarefas"
  on public.tarefas for select to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

create policy "criar tarefas"
  on public.tarefas for insert to authenticated
  with check (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

create policy "editar tarefas"
  on public.tarefas for update to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  )
  with check (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

create policy "apagar tarefas"
  on public.tarefas for delete to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

-- ---------- registo das automações ----------
-- só o admin consulta; quem escreve é o próprio sistema (funções/servidor)
create policy "admin ve o registo de automacoes"
  on public.automacoes_log for select to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and (select privado.sou_admin())
  );
