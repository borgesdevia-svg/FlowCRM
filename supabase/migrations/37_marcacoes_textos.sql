-- 37: título e texto da página pública de marcações, escritos pela empresa
-- (ex.: uma clínica escreve "Marcar consulta"). Vazios = os textos padrão.

alter table public.marcacoes_config
  add column titulo text check (titulo is null or char_length(titulo) between 1 and 80),
  add column texto  text check (texto is null or char_length(texto) between 1 and 300);
