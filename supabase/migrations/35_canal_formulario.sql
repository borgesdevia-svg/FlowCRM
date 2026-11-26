-- 35: de onde veio cada lead do formulário (Instagram, Facebook, site, …).
--
-- A empresa partilha o link do formulário com um "de" no fim, por exemplo
--   /f/clinica-sol?de=instagram   (na bio do Instagram)
--   /f/clinica-sol?de=facebook    (numa publicação do Facebook)
-- e o lead fica com canal = 'instagram' ou 'facebook'. A Visão geral mostra quantos vieram de cada sítio.
--
-- Quem preenche a coluna é o servidor (Server Action enviarLead, com a chave secreta), logo a seguir
-- a criar_lead. Os utilizadores não a podem mudar (a migração 18 só deixa mudar colunas escolhidas).
-- Só letras minúsculas, números e traços, até 30 (o servidor já limpa o que vem no link).

alter table public.clientes
  add column canal text check (canal is null or canal ~ '^[a-z0-9-]{1,30}$');
