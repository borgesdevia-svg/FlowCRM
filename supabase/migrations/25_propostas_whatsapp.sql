-- 25: Propostas com aceitação online (CRM Pro) e registos de WhatsApp no histórico.
--
-- Propostas: o comercial faz um orçamento para um lead e envia o link (/p/<token>).
-- O cliente abre o link SEM login e aceita (escrevendo o nome) ou recusa.
-- Ao aceitar, o lead passa a "Ativo", o valor previsto fica igual ao total da proposta
-- e o responsável recebe uma tarefa para hoje (aparece nas notificações).

-- ---------- WhatsApp: novo tipo de registo no histórico ----------
alter table public.interacoes drop constraint interacoes_tipo_check;
alter table public.interacoes
  add constraint interacoes_tipo_check
  check (tipo in ('nota', 'chamada', 'email', 'reuniao', 'whatsapp', 'sistema'));

-- ---------- propostas ----------
create table public.propostas (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas (id) on delete cascade,
  cliente_id    uuid not null,
  autor_id      uuid,
  -- o link público: impossível de adivinhar (122 bits aleatórios)
  token         uuid not null unique default gen_random_uuid(),
  titulo        text not null check (char_length(titulo) between 1 and 120),
  -- [{ "descricao": "...", "quantidade": 1, "preco": 10.5 }], validado na app e aqui (tamanho)
  itens         jsonb not null check (jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) between 1 and 30),
  total         numeric(12, 2) not null check (total >= 0),
  notas         text check (notas is null or char_length(notas) <= 2000),
  validade      date,
  estado        text not null default 'enviada' check (estado in ('enviada', 'aceite', 'recusada')),
  respondida_em timestamptz,
  -- nome que o cliente escreveu ao aceitar (vale como "assinatura")
  aceite_por    text check (aceite_por is null or char_length(aceite_por) <= 120),
  criado_em     timestamptz not null default now(),
  foreign key (cliente_id, empresa_id)
    references public.clientes (id, empresa_id) on delete cascade,
  foreign key (autor_id, empresa_id)
    references public.perfis (id, empresa_id) on delete set null (autor_id)
);

create index propostas_cliente_idx on public.propostas (cliente_id, criado_em desc);
create index propostas_empresa_idx on public.propostas (empresa_id);
create index propostas_autor_idx on public.propostas (autor_id);

alter table public.propostas enable row level security;

-- ver: as propostas dos leads que a pessoa consegue ver (o RLS dos clientes decide)
create policy "ver propostas"
  on public.propostas for select to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

-- criar: só no CRM Pro, em nome próprio, num lead que a pessoa vê, sempre "enviada"
create policy "criar propostas"
  on public.propostas for insert to authenticated
  with check (
    empresa_id = (select privado.minha_empresa())
    and autor_id = (select auth.uid())
    and estado = 'enviada'
    and respondida_em is null
    and aceite_por is null
    and privado.tem_pro(empresa_id)
    and exists (select 1 from public.clientes c where c.id = cliente_id)
  );

-- apagar: o autor ou o administrador (as respostas do cliente nunca se editam: não há "update")
create policy "apagar propostas"
  on public.propostas for delete to authenticated
  using (
    empresa_id = (select privado.minha_empresa())
    and (autor_id = (select auth.uid()) or (select privado.sou_admin()))
  );

grant select, insert, delete on public.propostas to authenticated;

-- ---------- página pública da proposta ----------
-- devolve só o necessário para mostrar a proposta (nunca outros dados da empresa ou do lead)
create function public.proposta_publica(p_token uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'titulo', p.titulo,
    'itens', p.itens,
    'total', p.total,
    'notas', p.notas,
    'validade', p.validade,
    'estado', p.estado,
    'respondida_em', p.respondida_em,
    'aceite_por', p.aceite_por,
    'criado_em', p.criado_em,
    'cliente', c.nome,
    'empresa', e.nome,
    'logo_url', e.logo_url,
    'autor', pf.nome
  )
  from public.propostas p
  join public.clientes c on c.id = p.cliente_id
  join public.empresas e on e.id = p.empresa_id
  left join public.perfis pf on pf.id = p.autor_id
  where p.token = p_token;
$$;

-- o cliente aceita ou recusa (uma só vez; depois da validade já não dá para aceitar)
create function public.responder_proposta(p_token uuid, p_aceitar boolean, p_nome text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_p public.propostas;
  v_c public.clientes;
  v_nome text := left(btrim(coalesce(p_nome, '')), 120);
  v_total text;
begin
  select * into v_p from public.propostas where token = p_token for update;
  if not found then
    return 'nao_existe';
  end if;
  if v_p.estado <> 'enviada' then
    return 'ja_respondida';
  end if;
  if p_aceitar and v_p.validade is not null and v_p.validade < privado.hoje_portugal() then
    return 'expirada';
  end if;
  if p_aceitar and char_length(v_nome) < 2 then
    return 'falta_nome';
  end if;

  update public.propostas
     set estado = case when p_aceitar then 'aceite' else 'recusada' end,
         respondida_em = now(),
         aceite_por = case when p_aceitar then v_nome end
   where id = v_p.id;

  select * into v_c from public.clientes where id = v_p.cliente_id;
  v_total := replace(to_char(v_p.total, 'FM999999990.00'), '.', ',') || ' €';

  if p_aceitar then
    -- o lead fica ganho: o gatilho dos clientes regista "Passou para Ativo" no histórico
    update public.clientes
       set estado = 'ativo', valor_previsto = v_p.total
     where id = v_c.id;
    perform privado.registar_evento(v_p.empresa_id, v_c.id,
      left('Aceitou a proposta "' || v_p.titulo || '" (' || v_total || '), assinada por ' || v_nome, 5000));
    -- tarefa para hoje: aparece nas notificações de quem trata do lead
    insert into public.tarefas (empresa_id, cliente_id, responsavel_id, titulo, data_limite)
    values (v_p.empresa_id, v_c.id, coalesce(v_c.responsavel_id, v_p.autor_id),
            left('Proposta aceite: combinar o início com ' || v_c.nome, 200), privado.hoje_portugal());
  else
    perform privado.registar_evento(v_p.empresa_id, v_c.id,
      left('Recusou a proposta "' || v_p.titulo || '" (' || v_total || ')', 5000));
    insert into public.tarefas (empresa_id, cliente_id, responsavel_id, titulo, data_limite)
    values (v_p.empresa_id, v_c.id, coalesce(v_c.responsavel_id, v_p.autor_id),
            left('Proposta recusada: perceber porquê com ' || v_c.nome, 200), privado.hoje_portugal());
  end if;

  return case when p_aceitar then 'aceite' else 'recusada' end;
end;
$$;

revoke all on function public.proposta_publica(uuid) from public;
revoke all on function public.responder_proposta(uuid, boolean, text) from public;
grant execute on function public.proposta_publica(uuid) to anon, authenticated;
grant execute on function public.responder_proposta(uuid, boolean, text) to anon, authenticated;
