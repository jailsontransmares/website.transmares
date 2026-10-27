begin;

alter table public.simulador_saude_planos
  add column if not exists detalhes jsonb not null default '{}'::jsonb;

alter table public.simulador_saude_planos
  drop constraint if exists simulador_saude_planos_detalhes_object_check,
  add constraint simulador_saude_planos_detalhes_object_check
    check (jsonb_typeof(detalhes) = 'object');

comment on column public.simulador_saude_planos.detalhes is
  'Condições padrão reutilizáveis do plano: coberturas, rede, coparticipação, carências e adicionais.';

-- Move the latest non-empty table conditions to the parent plan while keeping
-- the original table snapshots intact for existing quotes and audit history.
with latest_conditions as (
  select distinct on (plano_id) plano_id, condicoes
  from public.simulador_saude_tabelas_precos
  where condicoes <> '{}'::jsonb
  order by plano_id, vigencia_inicio desc, updated_at desc, created_at desc
)
update public.simulador_saude_planos plan
set detalhes = latest_conditions.condicoes
from latest_conditions
where plan.id = latest_conditions.plano_id
  and plan.detalhes = '{}'::jsonb;

commit;
