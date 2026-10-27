begin;

-- Cada tarifa passa a identificar diretamente sua acomodação. A acomodação
-- singular na tabela de preços deixa de servir como referência obrigatória.
alter table public.simulador_saude_precos_faixa
  add column if not exists acomodacao text;

-- Esta migração apenas move os mesmos valores para a estrutura normalizada;
-- os gatilhos de edição/histórico não devem interpretar isso como alteração de tarifa.
alter table public.simulador_saude_precos_faixa
  disable trigger simulador_saude_precos_faixa_proteger_vigente,
  disable trigger simulador_saude_precos_faixa_audit;

update public.simulador_saude_precos_faixa preco
set acomodacao = tabela.acomodacao
from public.simulador_saude_tabelas_precos tabela
where tabela.id = preco.tabela_preco_id
  and preco.acomodacao is null;

alter table public.simulador_saude_precos_faixa
  alter column acomodacao set not null,
  drop constraint if exists simulador_saude_precos_faixa_tabela_faixa_regra_key,
  add constraint simulador_saude_precos_faixa_acomodacao_check
    check (acomodacao in ('Apartamento', 'Enfermaria', 'Ambulatorial')),
  add constraint simulador_saude_precos_faixa_tabela_acomodacao_faixa_regra_key
    unique (tabela_preco_id, acomodacao, faixa_etaria, regra_vidas);

insert into public.simulador_saude_precos_faixa (
  tabela_preco_id, acomodacao, faixa_etaria, regra_vidas, valor,
  created_by, updated_by, created_at, updated_at
)
select
  preco.tabela_preco_id, preco.acomodacao, preco.faixa_etaria, preco.regra_vidas,
  preco.valor, preco.created_by, preco.updated_by, preco.created_at, preco.updated_at
from public.simulador_saude_precos_faixa_acomodacao preco
on conflict (tabela_preco_id, acomodacao, faixa_etaria, regra_vidas)
do update set
  valor = excluded.valor,
  updated_by = excluded.updated_by,
  updated_at = excluded.updated_at;

alter table public.simulador_saude_precos_faixa
  enable trigger simulador_saude_precos_faixa_proteger_vigente,
  enable trigger simulador_saude_precos_faixa_audit;

grant delete on table public.simulador_saude_precos_faixa to authenticated;
drop policy if exists simulador_saude_precos_faixa_delete
  on public.simulador_saude_precos_faixa;
create policy simulador_saude_precos_faixa_delete
  on public.simulador_saude_precos_faixa for delete to authenticated
  using (
    ((select public.app_tem_permissao('simulador_saude.catalogo', 'update'))
      or (select public.app_tem_permissao('simulador_saude.catalogo', 'delete')))
    and exists (
      select 1
      from public.simulador_saude_tabelas_precos tabela
      where tabela.id = tabela_preco_id
    )
  );

create or replace function private.simulador_saude_sincronizar_acomodacoes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select array_agg(distinct item order by item)
    into new.acomodacoes
  from unnest(coalesce(new.acomodacoes, '{}'::text[])) as item
  where item = any (array['Apartamento', 'Enfermaria', 'Ambulatorial']::text[]);

  if coalesce(cardinality(new.acomodacoes), 0) = 0 then
    raise exception 'Selecione ao menos uma acomodação para a tabela.';
  end if;

  return new;
end;
$$;

create or replace function private.simulador_saude_validar_preco_faixa_acomodacao()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_acomodacoes text[];
  v_tipo_contratacao text;
begin
  select tabela.acomodacoes, tabela.tipo_contratacao
    into v_acomodacoes, v_tipo_contratacao
  from public.simulador_saude_tabelas_precos tabela
  where tabela.id = new.tabela_preco_id;

  if not found then
    raise exception 'Tabela de preços não encontrada.';
  end if;
  if not (new.acomodacao = any(v_acomodacoes)) then
    raise exception 'A acomodação precisa estar selecionada na tabela.';
  end if;
  if v_tipo_contratacao = 'Individual' and new.regra_vidas not in ('uma_vida', 'duas_ou_mais') then
    raise exception 'Uma tabela Individual exige regras de preço por quantidade de vidas.';
  end if;
  if v_tipo_contratacao = 'Empresarial (PJ)' and new.regra_vidas <> 'geral' then
    raise exception 'Uma tabela Empresarial exige a regra geral de preços.';
  end if;
  return new;
end;
$$;

drop trigger if exists simulador_saude_precos_faixa_validar_acomodacao
  on public.simulador_saude_precos_faixa;
create trigger simulador_saude_precos_faixa_validar_acomodacao
before insert or update on public.simulador_saude_precos_faixa
for each row execute function private.simulador_saude_validar_preco_faixa_acomodacao();

create or replace function private.simulador_saude_validar_tabela_vigente()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_acomodacao text;
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
  if coalesce(cardinality(new.acomodacoes), 0) = 0 then
    raise exception 'Selecione ao menos uma acomodação para ativar a tabela.';
  end if;
  if exists (
    select 1
    from public.simulador_saude_precos_faixa preco
    where preco.tabela_preco_id = new.id
      and not (preco.acomodacao = any(new.acomodacoes))
  ) then
    raise exception 'Remova os preços de acomodações desmarcadas antes de ativar a tabela.';
  end if;

  foreach v_acomodacao in array new.acomodacoes loop
    select
      count(*) filter (where preco.regra_vidas = 'uma_vida')::integer,
      count(*) filter (where preco.regra_vidas = 'duas_ou_mais')::integer,
      count(*) filter (where preco.regra_vidas = 'geral')::integer
    into v_precos_uma_vida, v_precos_duas_ou_mais, v_precos_gerais
    from public.simulador_saude_precos_faixa preco
    where preco.tabela_preco_id = new.id
      and preco.acomodacao = v_acomodacao;

    if new.tipo_contratacao = 'Individual' then
      if v_precos_uma_vida <> 10 then
        raise exception 'Uma tabela Individual vigente precisa dos preços nas 10 faixas para 1 vida em %.', v_acomodacao;
      end if;
      if v_precos_duas_ou_mais not in (0, 10) then
        raise exception 'Preencha as 10 faixas da tarifa para 2 ou mais vidas em %, ou deixe toda essa coluna vazia.', v_acomodacao;
      end if;
      if v_precos_gerais <> 0 then
        raise exception 'Use as tarifas de 1 vida e 2 ou mais vidas em tabelas Individuais.';
      end if;
    else
      if v_precos_gerais <> 10 or v_precos_uma_vida <> 0 or v_precos_duas_ou_mais <> 0 then
        raise exception 'Uma tabela Empresarial vigente precisa dos preços nas 10 faixas para %.', v_acomodacao;
      end if;
    end if;
  end loop;

  return new;
end;
$$;

alter table public.simulador_saude_tabelas_precos
  drop column acomodacao;

drop table public.simulador_saude_precos_faixa_acomodacao;

comment on column public.simulador_saude_tabelas_precos.acomodacoes is
  'Acomodações oferecidas pela tabela.';
comment on column public.simulador_saude_precos_faixa.acomodacao is
  'Acomodação à qual esta tarifa pertence.';

commit;
