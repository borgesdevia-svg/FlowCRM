-- 27: decisão do aluno (2026-11-22): ao passar do Pro ao Essencial, a empresa perde os
-- benefícios do Pro EXCETO o formulário público, que fica com o design (e o logótipo) feito no Pro.
-- Só deixa de o poder mudar (o site só grava form_design com o Pro: lib/acoes/empresa.js).
-- "Fez design no Pro" = form_design não está vazio (só se grava com o Pro).
-- Uma empresa que nunca teve Pro tem form_design = '{}' e continua com o formulário simples.

create or replace function public.formulario_publico(p_slug text)
returns json
language sql
stable security definer
set search_path to ''
as $$
  select json_build_object(
    'nome', nome,
    'logo_url', case when privado.tem_pro(id) or form_design <> '{}'::jsonb then logo_url end,
    'design', case when privado.tem_pro(id) or form_design <> '{}'::jsonb then form_design end,
    'perguntas', perguntas,
    'cor', form_cor,
    'titulo', form_titulo,
    'texto', form_texto,
    'obrigado_texto', obrigado_texto,
    'obrigado_botao_texto', obrigado_botao_texto,
    'obrigado_botao_link', obrigado_botao_link
  )
  from public.empresas where slug = p_slug;
$$;
