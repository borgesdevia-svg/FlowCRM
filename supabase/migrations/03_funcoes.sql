-- =====================================================================
-- FlowCRM · 03 · Funções: registo automático e formulário público
-- =====================================================================

-- ---------- gerar um slug a partir do nome da empresa ----------
-- "Padaria São João, Lda." -> "padaria-sao-joao-lda"
create function privado.gerar_slug(texto text)
returns text
language sql immutable
set search_path = ''
as $$
  select trim(both '-' from
    regexp_replace(
      translate(lower(texto),
        'áàâãäéèêëíìîïóòôõöúùûüçñ',
        'aaaaaeeeeiiiiooooouuuucn'),
      '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------- quando um utilizador é criado no Supabase Auth ----------
-- Caso 1 (registo no site): cria a EMPRESA e o perfil ADMIN.
--   Os dados vêm de user_metadata: { nome, nome_empresa }.
-- Caso 2 (admin cria um comercial, Fase 3): só cria o perfil COMERCIAL.
--   O empresa_id vem de app_metadata, que SÓ o servidor (chave secreta)
--   consegue escrever. Nunca confiamos num empresa_id vindo do browser.
create function privado.novo_utilizador()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_nome          text := nullif(trim(new.raw_user_meta_data ->> 'nome'), '');
  v_nome_empresa  text := nullif(trim(new.raw_user_meta_data ->> 'nome_empresa'), '');
  v_empresa_id    uuid;
  v_slug          text;
begin
  -- se não houver nome, usa a parte antes do @ do email
  v_nome := coalesce(v_nome, split_part(new.email, '@', 1));

  -- Caso 2: criado pelo admin (empresa definida pelo servidor)
  if new.raw_app_meta_data ? 'empresa_id' then
    insert into public.perfis (id, empresa_id, nome, email, papel)
    values (new.id, (new.raw_app_meta_data ->> 'empresa_id')::uuid, v_nome, new.email, 'comercial');
    return new;
  end if;

  -- Caso 1: registo de uma nova empresa
  if v_nome_empresa is null or char_length(v_nome_empresa) < 2 then
    raise exception 'O nome da empresa é obrigatório.';
  end if;

  -- slug único: se já existir, acrescenta 4 caracteres aleatórios
  v_slug := coalesce(nullif(privado.gerar_slug(v_nome_empresa), ''), 'empresa');
  while exists (select 1 from public.empresas where slug = v_slug) loop
    v_slug := privado.gerar_slug(v_nome_empresa) || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.empresas (nome, slug)
  values (v_nome_empresa, v_slug)
  returning id into v_empresa_id;

  insert into public.perfis (id, empresa_id, nome, email, papel)
  values (new.id, v_empresa_id, v_nome, new.email, 'admin');

  return new;
end;
$$;

create trigger ao_criar_utilizador
  after insert on auth.users
  for each row execute function privado.novo_utilizador();

-- ---------- formulário público: criar um lead ----------
-- Chamada pelo formulário /f/[slug] por visitantes SEM login.
-- "security definer": consegue inserir apesar do RLS, mas SÓ faz isto:
-- valida os dados, encontra a empresa pelo slug e cria um cliente "novo".
-- Não devolve nada, por isso um visitante nunca consegue ler dados.
create function public.criar_lead(
  p_slug     text,
  p_nome     text,
  p_email    text,
  p_telefone text default null
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid;
  v_cliente_id uuid;
begin
  -- limpar os dados recebidos
  p_nome     := trim(p_nome);
  p_email    := lower(trim(p_email));
  p_telefone := nullif(trim(p_telefone), '');

  -- validar (o site também valida, mas nunca confiamos só no front-end)
  if p_nome is null or char_length(p_nome) < 2 or char_length(p_nome) > 150 then
    raise exception 'Nome inválido.';
  end if;
  if p_email is null or char_length(p_email) > 254
     or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email inválido.';
  end if;
  if p_telefone is not null and p_telefone !~ '^[0-9 +()-]{6,20}$' then
    raise exception 'Telefone inválido.';
  end if;

  select id into v_empresa_id from public.empresas where slug = p_slug;
  if v_empresa_id is null then
    raise exception 'Formulário não encontrado.';
  end if;

  -- o lead entra sem responsável: o admin vê-o e atribui-o a um comercial
  insert into public.clientes (empresa_id, nome, email, telefone, estado, origem)
  values (v_empresa_id, p_nome, p_email, p_telefone, 'novo', 'formulario')
  returning id into v_cliente_id;

  -- fica registado que é preciso enviar o email de boas-vindas (Fase 6)
  insert into public.automacoes_log (empresa_id, cliente_id, tipo, estado)
  values (v_empresa_id, v_cliente_id, 'boas_vindas', 'pendente');
end;
$$;

revoke all on function public.criar_lead(text, text, text, text) from public;
grant execute on function public.criar_lead(text, text, text, text) to anon, authenticated;

-- ---------- formulário público: nome da empresa ----------
-- A página /f/[slug] precisa de mostrar "Contacta a Padaria Central".
-- Devolve SÓ o nome (nunca outros dados), ou nada se o slug não existir.
create function public.nome_empresa_publico(p_slug text)
returns text
language sql stable security definer
set search_path = ''
as $$
  select nome from public.empresas where slug = p_slug;
$$;

revoke all on function public.nome_empresa_publico(text) from public;
grant execute on function public.nome_empresa_publico(text) to anon, authenticated;

-- as funções internas do schema privado não podem ser chamadas por ninguém de fora
revoke all on function privado.gerar_slug(text) from public;
revoke all on function privado.novo_utilizador() from public;
