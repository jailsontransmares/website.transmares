begin;

alter table public.simulador_saude_tabelas_precos
  add column if not exists acomodacoes text[] not null default '{}'::text[];

update public.simulador_saude_tabelas_precos
set acomodacoes = array[acomodacao]
where cardinality(acomodacoes) = 0;

alter table public.simulador_saude_tabelas_precos
  drop constraint if exists simulador_saude_tabelas_precos_acomodacoes_check,
  add constraint simulador_saude_tabelas_precos_acomodacoes_check
    check (
      cardinality(acomodacoes) > 0
      and acomodacoes <@ array['Apartamento', 'Enfermaria', 'Ambulatorial']::text[]
    );

create or replace function private.simulador_saude_sincronizar_acomodacoes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if cardinality(new.acomodacoes) = 0 then
      new.acomodacoes := array[new.acomodacao];
    end if;
  elsif new.acomodacao is distinct from old.acomodacao
     and new.acomodacoes is not distinct from old.acomodacoes then
    -- Mantém compatibilidade com clientes antigos, que só conhecem a coluna singular.
    new.acomodacoes := array[new.acomodacao];
  end if;

  select array_agg(distinct item order by item)
    into new.acomodacoes
  from unnest(new.acomodacoes) as item
  where item = any (array['Apartamento', 'Enfermaria', 'Ambulatorial']::text[]);

  if cardinality(new.acomodacoes) = 0 then
    raise exception 'Selecione ao menos uma acomodação para a tabela.';
  end if;
  if not (new.acomodacao = any(new.acomodacoes)) then
    raise exception 'A acomodação principal precisa estar incluída na tabela.';
  end if;

  return new;
end;
$$;

drop trigger if exists simulador_saude_tabelas_precos_sincronizar_acomodacoes
  on public.simulador_saude_tabelas_precos;
create trigger simulador_saude_tabelas_precos_sincronizar_acomodacoes
before insert or update on public.simulador_saude_tabelas_precos
for each row execute function private.simulador_saude_sincronizar_acomodacoes();

create table if not exists public.simulador_saude_precos_faixa_acomodacao (
  id uuid primary key default gen_random_uuid(),
  tabela_preco_id uuid not null references public.simulador_saude_tabelas_precos(id) on delete cascade,
  acomodacao text not null,
  faixa_etaria text not null,
  regra_vidas text not null,
  valor numeric(12, 2) not null,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulador_saude_precos_faixa_acomodacao_check
    check (acomodacao in ('Apartamento', 'Enfermaria', 'Ambulatorial')),
  constraint simulador_saude_precos_faixa_acomodacao_faixa_check
    check (faixa_etaria in ('0-18', '19-23', '24-28', '29-33', '34-38', '39-43', '44-48', '49-53', '54-58', '59+')),
  constraint simulador_saude_precos_faixa_acomodacao_regra_check
    check (regra_vidas in ('uma_vida', 'duas_ou_mais', 'geral')),
  constraint simulador_saude_precos_faixa_acomodacao_valor_check
    check (valor >= 0),
  constraint simulador_saude_precos_faixa_acomodacao_unique
    unique (tabela_preco_id, acomodacao, faixa_etaria, regra_vidas)
);

create index if not exists simulador_saude_precos_faixa_acomodacao_tabela_idx
  on public.simulador_saude_precos_faixa_acomodacao (tabela_preco_id, acomodacao);
create index if not exists simulador_saude_precos_faixa_acomodacao_created_by_idx
  on public.simulador_saude_precos_faixa_acomodacao (created_by);
create index if not exists simulador_saude_precos_faixa_acomodacao_updated_by_idx
  on public.simulador_saude_precos_faixa_acomodacao (updated_by);

create or replace function private.simulador_saude_validar_preco_faixa_acomodacao()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_acomodacao_principal text;
  v_acomodacoes text[];
  v_tipo_contratacao text;
begin
  select tabela.acomodacao, tabela.acomodacoes, tabela.tipo_contratacao
    into v_acomodacao_principal, v_acomodacoes, v_tipo_contratacao
  from public.simulador_saude_tabelas_precos tabela
  where tabela.id = new.tabela_preco_id;

  if not found then
    raise exception 'Tabela de preços não encontrada.';
  end if;
  if new.acomodacao = v_acomodacao_principal then
    raise exception 'Os preços da acomodação principal devem ser salvos na grade padrão.';
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

drop trigger if exists simulador_saude_precos_faixa_acomodacao_prepare
  on public.simulador_saude_precos_faixa_acomodacao;
create trigger simulador_saude_precos_faixa_acomodacao_prepare
before insert or update on public.simulador_saude_precos_faixa_acomodacao
for each row execute function private.simulador_saude_preparar_registro();

drop trigger if exists simulador_saude_precos_faixa_acomodacao_validar
  on public.simulador_saude_precos_faixa_acomodacao;
create trigger simulador_saude_precos_faixa_acomodacao_validar
before insert or update on public.simulador_saude_precos_faixa_acomodacao
for each row execute function private.simulador_saude_validar_preco_faixa_acomodacao();

drop trigger if exists simulador_saude_precos_faixa_acomodacao_proteger_vigente
  on public.simulador_saude_precos_faixa_acomodacao;
create trigger simulador_saude_precos_faixa_acomodacao_proteger_vigente
before insert or update or delete on public.simulador_saude_precos_faixa_acomodacao
for each row execute function private.simulador_saude_proteger_precos_vigentes();

drop trigger if exists simulador_saude_precos_faixa_acomodacao_audit
  on public.simulador_saude_precos_faixa_acomodacao;
create trigger simulador_saude_precos_faixa_acomodacao_audit
after insert or update or delete on public.simulador_saude_precos_faixa_acomodacao
for each row execute function private.simulador_saude_auditar_catalogo();

alter table public.simulador_saude_precos_faixa_acomodacao enable row level security;
revoke all on table public.simulador_saude_precos_faixa_acomodacao from anon, authenticated;
grant select, insert, update, delete on table public.simulador_saude_precos_faixa_acomodacao to authenticated;

drop policy if exists simulador_saude_precos_faixa_acomodacao_select
  on public.simulador_saude_precos_faixa_acomodacao;
create policy simulador_saude_precos_faixa_acomodacao_select
  on public.simulador_saude_precos_faixa_acomodacao for select to authenticated
  using ((select public.app_tem_permissao('simulador_saude.catalogo', 'view')));

drop policy if exists simulador_saude_precos_faixa_acomodacao_insert
  on public.simulador_saude_precos_faixa_acomodacao;
create policy simulador_saude_precos_faixa_acomodacao_insert
  on public.simulador_saude_precos_faixa_acomodacao for insert to authenticated
  with check (
    ((select public.app_tem_permissao('simulador_saude.catalogo', 'create'))
      or (select public.app_tem_permissao('simulador_saude.catalogo', 'update')))
    and exists (select 1 from public.simulador_saude_tabelas_precos tabela where tabela.id = tabela_preco_id)
  );

drop policy if exists simulador_saude_precos_faixa_acomodacao_update
  on public.simulador_saude_precos_faixa_acomodacao;
create policy simulador_saude_precos_faixa_acomodacao_update
  on public.simulador_saude_precos_faixa_acomodacao for update to authenticated
  using (
    (select public.app_tem_permissao('simulador_saude.catalogo', 'update'))
    and exists (select 1 from public.simulador_saude_tabelas_precos tabela where tabela.id = tabela_preco_id)
  )
  with check (
    (select public.app_tem_permissao('simulador_saude.catalogo', 'update'))
    and exists (select 1 from public.simulador_saude_tabelas_precos tabela where tabela.id = tabela_preco_id)
  );

drop policy if exists simulador_saude_precos_faixa_acomodacao_delete
  on public.simulador_saude_precos_faixa_acomodacao;
create policy simulador_saude_precos_faixa_acomodacao_delete
  on public.simulador_saude_precos_faixa_acomodacao for delete to authenticated
  using (
    ((select public.app_tem_permissao('simulador_saude.catalogo', 'update'))
      or (select public.app_tem_permissao('simulador_saude.catalogo', 'delete')))
    and exists (select 1 from public.simulador_saude_tabelas_precos tabela where tabela.id = tabela_preco_id)
  );

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
  if cardinality(new.acomodacoes) = 0 or not (new.acomodacao = any(new.acomodacoes)) then
    raise exception 'Selecione a acomodação principal e ao menos uma acomodação para ativar a tabela.';
  end if;
  if exists (
    select 1 from public.simulador_saude_precos_faixa_acomodacao preco
    where preco.tabela_preco_id = new.id and not (preco.acomodacao = any(new.acomodacoes))
  ) then
    raise exception 'Remova os preços de acomodações desmarcadas antes de ativar a tabela.';
  end if;

  foreach v_acomodacao in array new.acomodacoes loop
    if v_acomodacao = new.acomodacao then
      select
        count(*) filter (where preco.regra_vidas = 'uma_vida')::integer,
        count(*) filter (where preco.regra_vidas = 'duas_ou_mais')::integer,
        count(*) filter (where preco.regra_vidas = 'geral')::integer
      into v_precos_uma_vida, v_precos_duas_ou_mais, v_precos_gerais
      from public.simulador_saude_precos_faixa preco
      where preco.tabela_preco_id = new.id;
    else
      select
        count(*) filter (where preco.regra_vidas = 'uma_vida')::integer,
        count(*) filter (where preco.regra_vidas = 'duas_ou_mais')::integer,
        count(*) filter (where preco.regra_vidas = 'geral')::integer
      into v_precos_uma_vida, v_precos_duas_ou_mais, v_precos_gerais
      from public.simulador_saude_precos_faixa_acomodacao preco
      where preco.tabela_preco_id = new.id and preco.acomodacao = v_acomodacao;
    end if;

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

comment on column public.simulador_saude_tabelas_precos.acomodacoes is
  'Acomodações oferecidas pela tabela; acomodacao mantém a opção principal para compatibilidade.';
comment on table public.simulador_saude_precos_faixa_acomodacao is
  'Faixas de preços para acomodações adicionais à acomodação principal da tabela.';

commit;
