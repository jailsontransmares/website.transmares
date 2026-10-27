begin;

-- Acomodação, coparticipação e código interno descrevem uma grade de preços,
-- não o produto-base.
-- A consolidação preserva cada tabela e seus preços, redirecionando apenas o plano
-- relacionado. Snapshots de cotações são históricos imutáveis e não são alterados.

alter table public.simulador_saude_tabelas_precos
  add column if not exists acomodacao text,
  add column if not exists coparticipacao boolean,
  add column if not exists codigo_interno text;

-- Registra a identidade antiga de cada plano e escolhe um representante estável
-- entre planos que só diferem nos campos que estão sendo movidos.
create temporary table _simsaude_plano_mapa on commit drop as
with ranked as (
  select
    plano.id as plano_antigo_id,
    first_value(plano.id) over identidade as plano_canonico_id,
    plano.acomodacao,
    plano.coparticipacao,
    plano.codigo_interno
  from public.simulador_saude_planos plano
  window identidade as (
    partition by
      plano.operadora_id,
      lower(btrim(plano.nome)),
      lower(btrim(plano.modalidade)),
      lower(btrim(plano.abrangencia))
    order by plano.created_at nulls last, plano.id
  )
)
select plano_antigo_id, plano_canonico_id, acomodacao, coparticipacao, codigo_interno
from ranked;

-- Copia as características para a tabela antes de trocar seu plano relacionado.
update public.simulador_saude_tabelas_precos tabela
set acomodacao = mapa.acomodacao,
    coparticipacao = mapa.coparticipacao,
    codigo_interno = mapa.codigo_interno
from _simsaude_plano_mapa mapa
where tabela.plano_id = mapa.plano_antigo_id;

-- Desliga triggers somente durante a reestruturação para não criar eventos de
-- auditoria que pareçam edições feitas por usuários nem validar grades sem mudança.
alter table public.simulador_saude_planos disable trigger simulador_saude_planos_prepare;
alter table public.simulador_saude_planos disable trigger simulador_saude_planos_audit;
alter table public.simulador_saude_tabelas_precos disable trigger simulador_saude_tabelas_precos_prepare;
alter table public.simulador_saude_tabelas_precos disable trigger simulador_saude_tabelas_precos_validar;
alter table public.simulador_saude_tabelas_precos disable trigger simulador_saude_tabelas_precos_audit;

-- Planos sem nenhuma tabela também têm suas características preservadas numa
-- tabela em revisão, sem preço ou vigência inventados, antes de apagar os campos.
insert into public.simulador_saude_tabelas_precos (
  plano_id, nome, acomodacao, coparticipacao, codigo_interno,
  vigencia_inicio, status, observacoes
)
select
  mapa.plano_canonico_id,
  concat_ws(' · ', 'Tabela pendente', plano.nome, mapa.acomodacao,
    case when mapa.coparticipacao then 'Com coparticipação' else 'Sem coparticipação' end,
    nullif(btrim(mapa.codigo_interno), '')),
  mapa.acomodacao,
  mapa.coparticipacao,
  mapa.codigo_interno,
  null,
  'em_revisao',
  'Criada pela migração para preservar os dados do plano antigo. Informe vigência e preços antes de ativar.'
from _simsaude_plano_mapa mapa
join public.simulador_saude_planos plano on plano.id = mapa.plano_antigo_id
where not exists (
  select 1 from public.simulador_saude_tabelas_precos tabela
  where tabela.plano_id = mapa.plano_antigo_id
);

update public.simulador_saude_tabelas_precos tabela
set plano_id = mapa.plano_canonico_id
from _simsaude_plano_mapa mapa
where tabela.plano_id = mapa.plano_antigo_id
  and mapa.plano_antigo_id <> mapa.plano_canonico_id;

update public.simulador_saude_catalogo_historico historico
set registro_id = mapa.plano_canonico_id
from _simsaude_plano_mapa mapa
where historico.entidade = 'simulador_saude_planos'
  and historico.registro_id = mapa.plano_antigo_id
  and mapa.plano_antigo_id <> mapa.plano_canonico_id;

-- Mantém o status ativo se qualquer variante anterior estava ativa e combina
-- detalhes sem substituir chaves do plano canônico por valores de uma variante.
with grupos as (
  select plano_canonico_id, bool_or(plano.status = 'ativo') as algum_ativo
  from _simsaude_plano_mapa mapa
  join public.simulador_saude_planos plano on plano.id = mapa.plano_antigo_id
  group by plano_canonico_id
), detalhes as (
  select escolhidos.plano_canonico_id,
         coalesce(jsonb_object_agg(escolhidos.chave, escolhidos.valor), '{}'::jsonb) as dados
  from (
    select distinct on (mapa.plano_canonico_id, detalhe.key)
      mapa.plano_canonico_id, detalhe.key as chave, detalhe.value as valor
    from _simsaude_plano_mapa mapa
    join public.simulador_saude_planos plano on plano.id = mapa.plano_antigo_id
    cross join lateral jsonb_each(coalesce(plano.detalhes, '{}'::jsonb)) detalhe
    order by mapa.plano_canonico_id, detalhe.key,
             (mapa.plano_antigo_id = mapa.plano_canonico_id) desc,
             plano.updated_at desc nulls last, mapa.plano_antigo_id
  ) escolhidos
  group by escolhidos.plano_canonico_id
)
update public.simulador_saude_planos canonico
set status = case when grupos.algum_ativo then 'ativo' else 'inativo' end,
    detalhes = coalesce(detalhes.dados, canonico.detalhes, '{}'::jsonb)
from grupos
left join detalhes using (plano_canonico_id)
where canonico.id = grupos.plano_canonico_id;

delete from public.simulador_saude_planos plano
using _simsaude_plano_mapa mapa
where plano.id = mapa.plano_antigo_id
  and mapa.plano_antigo_id <> mapa.plano_canonico_id;

alter table public.simulador_saude_planos enable trigger simulador_saude_planos_prepare;
alter table public.simulador_saude_planos enable trigger simulador_saude_planos_audit;
alter table public.simulador_saude_tabelas_precos enable trigger simulador_saude_tabelas_precos_prepare;
alter table public.simulador_saude_tabelas_precos enable trigger simulador_saude_tabelas_precos_validar;
alter table public.simulador_saude_tabelas_precos enable trigger simulador_saude_tabelas_precos_audit;

alter table public.simulador_saude_tabelas_precos
  alter column acomodacao set not null,
  alter column coparticipacao set default false,
  alter column coparticipacao set not null,
  alter column codigo_interno drop not null,
  drop constraint if exists simulador_saude_tabelas_precos_acomodacao_check,
  add constraint simulador_saude_tabelas_precos_acomodacao_check
    check (acomodacao in ('Apartamento', 'Enfermaria', 'Ambulatorial'));

drop index if exists public.simulador_saude_planos_identidade_uidx;
alter table public.simulador_saude_planos
  drop constraint if exists simulador_saude_planos_acomodacao_check,
  drop column acomodacao,
  drop column coparticipacao,
  drop column codigo_interno;

create unique index simulador_saude_planos_identidade_uidx
  on public.simulador_saude_planos (
    operadora_id,
    lower(btrim(nome)),
    lower(btrim(modalidade)),
    lower(btrim(abrangencia))
  );

comment on column public.simulador_saude_tabelas_precos.acomodacao is
  'Tipo de acomodação oferecido por esta tabela de preços.';
comment on column public.simulador_saude_tabelas_precos.coparticipacao is
  'Indica se esta tabela de preços prevê coparticipação.';
comment on column public.simulador_saude_tabelas_precos.codigo_interno is
  'Código de registro interno associado a esta tabela de preços.';

commit;
