begin;

-- O cadastro central continua sendo preferencial, mas uma conversa consultiva
-- pode começar antes de existir uma pessoa em cad_pessoas. O snapshot mantém
-- o contexto informado pelo consultor sem criar uma ficha paralela.
alter table public.consultoria_360_atendimentos
  alter column pessoa_id drop not null;

alter table public.consultoria_360_propostas
  drop constraint if exists consultoria_360_propostas_status_check;

alter table public.consultoria_360_propostas
  add constraint consultoria_360_propostas_status_check
  check (status in ('rascunho', 'validada', 'enviada', 'arquivada'));

commit;
