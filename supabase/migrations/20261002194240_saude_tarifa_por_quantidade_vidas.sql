begin;

alter table public.simulador_saude_precos_faixa
  add column if not exists regra_vidas text not null default 'geral';

update public.simulador_saude_precos_faixa preco
set regra_vidas = case tabela.tipo_contratacao
  when 'Individual' then 'uma_vida'
  when 'Familiar' then 'duas_ou_mais'
  else 'geral'
end
from public.simulador_saude_tabelas_precos tabela
where tabela.id = preco.tabela_preco_id;

alter table public.simulador_saude_precos_faixa
  drop constraint if exists simulador_saude_precos_faixa_tabela_faixa_key,
  add constraint simulador_saude_precos_faixa_tabela_faixa_regra_key
    unique (tabela_preco_id, faixa_etaria, regra_vidas),
  add constraint simulador_saude_precos_faixa_regra_vidas_check
    check (regra_vidas in ('uma_vida', 'duas_ou_mais', 'geral'));

-- Move as tarifas familiares para a grade individual equivalente do mesmo plano e vigência.
update public.simulador_saude_precos_faixa familiar
set tabela_preco_id = individual.id,
    regra_vidas = 'duas_ou_mais'
from public.simulador_saude_tabelas_precos tabela_familiar
cross join public.simulador_saude_tabelas_precos individual
where tabela_familiar.id = familiar.tabela_preco_id
  and tabela_familiar.tipo_contratacao = 'Familiar'
  and individual.tipo_contratacao = 'Individual'
  and individual.plano_id = tabela_familiar.plano_id
  and individual.vigencia_inicio is not distinct from tabela_familiar.vigencia_inicio
  and individual.vigencia_fim is not distinct from tabela_familiar.vigencia_fim
  and individual.nome = replace(tabela_familiar.nome, 'Familiar', 'Individual');

-- Mantém a trilha das linhas antigas sem oferecê-las como tabelas ativas.
update public.simulador_saude_tabelas_precos
set status = 'inativo',
    nome = 'LEGADO · ' || nome,
    tipo_contratacao = 'Individual',
    min_vidas = 1
where tipo_contratacao = 'Familiar';

alter table public.simulador_saude_tabelas_precos
  drop constraint if exists simulador_saude_tabelas_precos_tipo_contratacao_check,
  add constraint simulador_saude_tabelas_precos_tipo_contratacao_check
    check (tipo_contratacao in ('Individual', 'Empresarial (PJ)')),
  drop constraint if exists simulador_saude_tabelas_precos_min_vidas_check,
  add constraint simulador_saude_tabelas_precos_min_vidas_check
    check (min_vidas >= 1);

comment on column public.simulador_saude_tabelas_precos.tipo_contratacao is
  'Modalidade da tabela: Individual ou Empresarial (PJ).';
comment on column public.simulador_saude_precos_faixa.regra_vidas is
  'Individual usa uma_vida para uma vida e duas_ou_mais a partir de duas vidas; Empresarial usa geral.';

create or replace function private.simulador_saude_validar_tabela_vigente()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_precos_uma_vida integer;
  v_precos_duas_ou_mais integer;
  v_precos_gerais integer;
begin
  if new.status <> 'vigente' then
    return new;
  end if;

  if new.vigencia_inicio is null then
    raise exception 'Informe o início da vigência antes de ativar a tabela.';
  end if;

  select
    count(*) filter (where preco.regra_vidas = 'uma_vida')::integer,
    count(*) filter (where preco.regra_vidas = 'duas_ou_mais')::integer,
    count(*) filter (where preco.regra_vidas = 'geral')::integer
  into v_precos_uma_vida, v_precos_duas_ou_mais, v_precos_gerais
  from public.simulador_saude_precos_faixa preco
  where preco.tabela_preco_id = new.id;

  if new.tipo_contratacao = 'Individual' then
    if v_precos_uma_vida <> 10 then
      raise exception 'Uma tabela Individual vigente precisa dos preços nas 10 faixas etárias para 1 vida.';
    end if;
    if v_precos_duas_ou_mais not in (0, 10) then
      raise exception 'Preencha as 10 faixas da tarifa para 2 ou mais vidas, ou deixe toda essa coluna vazia.';
    end if;
    if v_precos_gerais <> 0 then
      raise exception 'Use as tarifas de 1 vida e 2 ou mais vidas em tabelas Individuais.';
    end if;
  else
    if v_precos_gerais <> 10 or v_precos_uma_vida <> 0 or v_precos_duas_ou_mais <> 0 then
      raise exception 'Uma tabela Empresarial vigente precisa dos preços nas 10 faixas etárias.';
    end if;
  end if;

  return new;
end;
$$;

commit;
