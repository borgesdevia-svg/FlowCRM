-- 08 · Personalizar o CRM de cada empresa
--   1) logótipo da empresa (guardado no Storage, bucket "logos")
--   2) perguntas extra no formulário público, escolhidas pelo administrador
--   3) as respostas a essas perguntas ficam guardadas no cliente

-- ---------- colunas novas ----------
alter table public.empresas
  add column logo_url  text check (logo_url is null or char_length(logo_url) <= 500),
  -- lista de perguntas: [{ "id": "...", "texto": "...", "tipo": "texto|texto_longo|escolha",
  --                        "opcoes": ["..."], "obrigatoria": true }]
  add column perguntas jsonb not null default '[]'::jsonb
    check (jsonb_typeof(perguntas) = 'array' and jsonb_array_length(perguntas) <= 10);

-- respostas do formulário: [{ "pergunta": "texto da pergunta", "resposta": "..." }]
-- (guarda-se o TEXTO da pergunta: se o admin a mudar depois, a resposta antiga continua a fazer sentido)
alter table public.clientes
  add column respostas jsonb
    check (respostas is null or jsonb_typeof(respostas) = 'array');

-- ---------- Storage: bucket público só de leitura para os logótipos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- cada empresa só escreve na sua pasta: logos/<empresa_id>/...  e só o admin
create policy "admin envia o logótipo da empresa"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select privado.minha_empresa())::text
    and (select privado.sou_admin())
  );

create policy "admin substitui o logótipo da empresa"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select privado.minha_empresa())::text
    and (select privado.sou_admin())
  );

create policy "admin apaga o logótipo da empresa"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select privado.minha_empresa())::text
    and (select privado.sou_admin())
  );

-- ---------- formulário público: nome, logótipo e perguntas ----------
-- Devolve SÓ o que a página pública precisa de mostrar (nunca outros dados da empresa).
create function public.formulario_publico(p_slug text)
returns json
language sql stable security definer
set search_path = ''
as $$
  select json_build_object('nome', nome, 'logo_url', logo_url, 'perguntas', perguntas)
  from public.empresas where slug = p_slug;
$$;

revoke all on function public.formulario_publico(text) from public;
grant execute on function public.formulario_publico(text) to anon, authenticated;

-- ---------- criar_lead passa a aceitar as respostas ----------
drop function public.criar_lead(text, text, text, text);

create function public.criar_lead(
  p_slug      text,
  p_nome      text,
  p_email     text,
  p_telefone  text default null,
  p_respostas jsonb default '{}'::jsonb   -- { "<id da pergunta>": "resposta" }
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid;
  v_perguntas  jsonb;
  v_cliente_id uuid;
  v_pergunta   jsonb;
  v_resposta   text;
  v_respostas  jsonb := '[]'::jsonb;
begin
  -- limpar os dados recebidos
  p_nome      := trim(p_nome);
  p_email     := lower(trim(p_email));
  p_telefone  := nullif(trim(p_telefone), '');
  p_respostas := coalesce(p_respostas, '{}'::jsonb);

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
  if jsonb_typeof(p_respostas) <> 'object' then
    raise exception 'Respostas inválidas.';
  end if;

  select id, perguntas into v_empresa_id, v_perguntas from public.empresas where slug = p_slug;
  if v_empresa_id is null then
    raise exception 'Formulário não encontrado.';
  end if;

  -- só se guardam respostas às perguntas que a empresa tem (o resto é ignorado)
  for v_pergunta in select * from jsonb_array_elements(v_perguntas) loop
    v_resposta := nullif(trim(p_respostas ->> (v_pergunta ->> 'id')), '');

    if v_resposta is null then
      if coalesce((v_pergunta ->> 'obrigatoria')::boolean, false) then
        raise exception 'Falta responder a uma pergunta obrigatória.';
      end if;
      continue;
    end if;

    if char_length(v_resposta) > 2000 then
      raise exception 'Resposta demasiado longa.';
    end if;
    -- numa pergunta de escolha, a resposta tem de ser uma das opções
    if v_pergunta ->> 'tipo' = 'escolha'
       and not (coalesce(v_pergunta -> 'opcoes', '[]'::jsonb) ? v_resposta) then
      raise exception 'Opção inválida.';
    end if;

    v_respostas := v_respostas || jsonb_build_array(
      jsonb_build_object('pergunta', v_pergunta ->> 'texto', 'resposta', v_resposta)
    );
  end loop;

  -- o lead entra sem responsável: o administrador vê-o e atribui-o a um comercial
  insert into public.clientes (empresa_id, nome, email, telefone, estado, origem, respostas)
  values (v_empresa_id, p_nome, p_email, p_telefone, 'novo', 'formulario',
          nullif(v_respostas, '[]'::jsonb))
  returning id into v_cliente_id;

  -- fica registado que é preciso enviar o email de boas-vindas
  insert into public.automacoes_log (empresa_id, cliente_id, tipo, estado)
  values (v_empresa_id, v_cliente_id, 'boas_vindas', 'pendente');
end;
$$;

revoke all on function public.criar_lead(text, text, text, text, jsonb) from public;
grant execute on function public.criar_lead(text, text, text, text, jsonb) to anon, authenticated;
