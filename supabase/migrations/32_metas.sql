-- 32: metas de vendas por mês (PREPARADA, AINDA NÃO APLICADA — precisa da autorização do aluno).
--
-- Uma meta = quanto a empresa quer fechar (em euros) num mês.
-- Ex.: em dezembro de 2026, 12 000 €. A Visão geral compara com o valor dos leads
-- que passaram a "Ativo" nesse mês.
--
-- Regras:
--  - cada empresa tem no máximo uma meta por mês (unique empresa_id + mes);
--  - "mes" guarda sempre o dia 1 desse mês (ex.: 2026-12-01), para não haver duas datas no mesmo mês;
--  - toda a equipa VÊ as metas da sua empresa; só os administradores criam, mudam ou apagam;
--  - com a empresa bloqueada (sem plano ativo) ninguém escreve, como no resto do CRM.

create table public.metas (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  mes         date not null check (extract(day from mes) = 1),
  valor       numeric(12, 2) not null check (valor > 0 and valor <= 99999999),
  criado_em   timestamptz not null default now(),
  unique (empresa_id, mes)
);

alter table public.metas enable row level security;

create policy "ver metas"
  on public.metas for select to authenticated
  using (empresa_id = (select privado.minha_empresa()));

create policy "criar metas"
  on public.metas for insert to authenticated
  with check (
    empresa_id = (select privado.minha_empresa())
    and (select privado.sou_admin())
    and (select privado.minha_empresa_ativa())
  );

create policy "editar metas"
  on public.metas for update to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and (select privado.sou_admin())
    and (select privado.minha_empresa_ativa())
  )
  with check (empresa_id = (select privado.minha_empresa()));

create policy "apagar metas"
  on public.metas for delete to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and (select privado.sou_admin())
    and (select privado.minha_empresa_ativa())
  );
