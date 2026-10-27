begin;

-- Catálogo compartilhado pela corretora; não pertence a uma empresa específica.
create table if not exists public.simulador_saude_operadoras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulador_saude_operadoras_nome_check check (length(btrim(nome)) > 0),
  constraint simulador_saude_operadoras_status_check check (status in ('ativo', 'inativo'))
);

create unique index if not exists simulador_saude_operadoras_nome_uidx
  on public.simulador_saude_operadoras (lower(btrim(nome)));

create table if not exists public.simulador_saude_planos (
  id uuid primary key default gen_random_uuid(),
  operadora_id uuid not null references public.simulador_saude_operadoras(id) on delete restrict,
  nome text not null,
  modalidade text not null,
  acomodacao text not null,
  coparticipacao boolean not null default false,
  abrangencia text not null,
  codigo_interno text,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulador_saude_planos_nome_check check (length(btrim(nome)) > 0),
  constraint simulador_saude_planos_modalidade_check check (
    length(btrim(modalidade)) > 0 and modalidade !~* 'odont'
  ),
  constraint simulador_saude_planos_acomodacao_check check (acomodacao in ('Apartamento', 'Enfermaria')),
  constraint simulador_saude_planos_abrangencia_check check (length(btrim(abrangencia)) > 0),
  constraint simulador_saude_planos_status_check check (status in ('ativo', 'inativo'))
);

create unique index if not exists simulador_saude_planos_identidade_uidx
  on public.simulador_saude_planos (
    operadora_id,
    lower(btrim(nome)),
    lower(btrim(modalidade)),
    acomodacao,
    coparticipacao,
    lower(btrim(abrangencia))
  );
create index if not exists simulador_saude_planos_operadora_status_idx
  on public.simulador_saude_planos (operadora_id, status, nome);

create table if not exists public.simulador_saude_tabelas_precos (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null references public.simulador_saude_planos(id) on delete restrict,
  nome text not null,
  vigencia_inicio date not null,
  vigencia_fim date,
  status text not null default 'em_revisao',
  observacoes text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulador_saude_tabelas_precos_nome_check check (length(btrim(nome)) > 0),
  constraint simulador_saude_tabelas_precos_vigencia_check check (
    vigencia_fim is null or vigencia_fim >= vigencia_inicio
  ),
  constraint simulador_saude_tabelas_precos_status_check check (
    status in ('vigente', 'em_revisao', 'inativo')
  )
);

create index if not exists simulador_saude_tabelas_precos_plano_vigencia_idx
  on public.simulador_saude_tabelas_precos (plano_id, vigencia_inicio desc, vigencia_fim);
create index if not exists simulador_saude_tabelas_precos_status_vigencia_idx
  on public.simulador_saude_tabelas_precos (status, vigencia_inicio, vigencia_fim);

comment on column public.simulador_saude_tabelas_precos.status is
  'Status persistido: vigente, em_revisao ou inativo. Vencido é derivado da vigencia_fim e nunca substitui inativo.';

create table if not exists public.simulador_saude_precos_faixa (
  id uuid primary key default gen_random_uuid(),
  tabela_preco_id uuid not null references public.simulador_saude_tabelas_precos(id) on delete restrict,
  faixa_etaria text not null,
  valor numeric(12, 2) not null,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulador_saude_precos_faixa_tabela_faixa_key unique (tabela_preco_id, faixa_etaria),
  constraint simulador_saude_precos_faixa_etaria_check check (
    faixa_etaria in ('0-18', '19-23', '24-28', '29-33', '34-38', '39-43', '44-48', '49-53', '54-58', '59+')
  ),
  constraint simulador_saude_precos_faixa_valor_check check (valor >= 0)
);

create table if not exists public.simulador_saude_catalogo_historico (
  id uuid primary key default gen_random_uuid(),
  entidade text not null,
  registro_id uuid not null,
  acao text not null,
  usuario_id uuid references public.usuarios(id) on delete set null,
  dados_anteriores jsonb,
  dados_posteriores jsonb,
  created_at timestamptz not null default now(),
  constraint simulador_saude_catalogo_historico_entidade_check check (
    entidade in (
      'simulador_saude_operadoras',
      'simulador_saude_planos',
      'simulador_saude_tabelas_precos',
      'simulador_saude_precos_faixa'
    )
  ),
  constraint simulador_saude_catalogo_historico_acao_check check (
    acao in ('criar', 'editar', 'inativar', 'excluir', 'importar', 'duplicar')
  )
);

create index if not exists simulador_saude_catalogo_historico_created_at_idx
  on public.simulador_saude_catalogo_historico (created_at desc);
create index if not exists simulador_saude_catalogo_historico_entidade_registro_idx
  on public.simulador_saude_catalogo_historico (entidade, registro_id, created_at desc);

create or replace function private.simulador_saude_preparar_registro()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_usuario_id uuid := public.app_usuario_atual_id();
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    new.created_by := v_usuario_id;
    new.updated_by := v_usuario_id;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := v_usuario_id;
  end if;

  return new;
end;
$$;

create or replace function private.simulador_saude_validar_tabela_vigente()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_faixas integer;
begin
  if new.status <> 'vigente' then
    return new;
  end if;

  select count(*)::integer
    into v_faixas
  from public.simulador_saude_precos_faixa preco
  where preco.tabela_preco_id = new.id;

  if v_faixas <> 10 then
    raise exception 'Uma tabela só pode ficar vigente quando contiver preços nas 10 faixas etárias.';
  end if;

  return new;
end;
$$;

create or replace function private.simulador_saude_proteger_precos_vigentes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tabela_origem_id uuid;
  v_tabela_destino_id uuid;
  v_status text;
begin
  if tg_op <> 'INSERT' then
    v_tabela_origem_id := old.tabela_preco_id;
  end if;
  if tg_op <> 'DELETE' then
    v_tabela_destino_id := new.tabela_preco_id;
  end if;

  select tabela.status
    into v_status
  from public.simulador_saude_tabelas_precos tabela
  where tabela.id = v_tabela_origem_id;

  if v_status = 'vigente' then
    raise exception 'Coloque a tabela em revisão antes de alterar seus preços por faixa etária.';
  end if;

  if v_tabela_destino_id is not null
     and v_tabela_destino_id is distinct from v_tabela_origem_id then
    select tabela.status
      into v_status
    from public.simulador_saude_tabelas_precos tabela
    where tabela.id = v_tabela_destino_id;

    if v_status = 'vigente' then
      raise exception 'Coloque a tabela em revisão antes de alterar seus preços por faixa etária.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function private.simulador_saude_auditar_catalogo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes jsonb;
  v_depois jsonb;
  v_registro_id uuid;
  v_acao text;
begin
  if tg_op = 'INSERT' then
    v_depois := to_jsonb(new);
    v_registro_id := (v_depois ->> 'id')::uuid;
    v_acao := 'criar';
  elsif tg_op = 'UPDATE' then
    if old is not distinct from new then
      return new;
    end if;

    v_antes := to_jsonb(old);
    v_depois := to_jsonb(new);
    v_registro_id := (v_depois ->> 'id')::uuid;
    v_acao := case
      when v_antes ->> 'status' is distinct from v_depois ->> 'status'
        and v_depois ->> 'status' = 'inativo' then 'inativar'
      else 'editar'
    end;
  else
    v_antes := to_jsonb(old);
    v_registro_id := (v_antes ->> 'id')::uuid;
    v_acao := 'excluir';
  end if;

  insert into public.simulador_saude_catalogo_historico (
    entidade,
    registro_id,
    acao,
    usuario_id,
    dados_anteriores,
    dados_posteriores
  ) values (
    tg_table_name,
    v_registro_id,
    v_acao,
    public.app_usuario_atual_id(),
    v_antes,
    v_depois
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.simulador_saude_preparar_registro() from public, anon, authenticated;
revoke all on function private.simulador_saude_validar_tabela_vigente() from public, anon, authenticated;
revoke all on function private.simulador_saude_proteger_precos_vigentes() from public, anon, authenticated;
revoke all on function private.simulador_saude_auditar_catalogo() from public, anon, authenticated;

drop trigger if exists simulador_saude_operadoras_prepare on public.simulador_saude_operadoras;
create trigger simulador_saude_operadoras_prepare
before insert or update on public.simulador_saude_operadoras
for each row execute function private.simulador_saude_preparar_registro();
drop trigger if exists simulador_saude_operadoras_audit on public.simulador_saude_operadoras;
create trigger simulador_saude_operadoras_audit
after insert or update or delete on public.simulador_saude_operadoras
for each row execute function private.simulador_saude_auditar_catalogo();

drop trigger if exists simulador_saude_planos_prepare on public.simulador_saude_planos;
create trigger simulador_saude_planos_prepare
before insert or update on public.simulador_saude_planos
for each row execute function private.simulador_saude_preparar_registro();
drop trigger if exists simulador_saude_planos_audit on public.simulador_saude_planos;
create trigger simulador_saude_planos_audit
after insert or update or delete on public.simulador_saude_planos
for each row execute function private.simulador_saude_auditar_catalogo();

drop trigger if exists simulador_saude_tabelas_precos_prepare on public.simulador_saude_tabelas_precos;
create trigger simulador_saude_tabelas_precos_prepare
before insert or update on public.simulador_saude_tabelas_precos
for each row execute function private.simulador_saude_preparar_registro();
drop trigger if exists simulador_saude_tabelas_precos_validar on public.simulador_saude_tabelas_precos;
create trigger simulador_saude_tabelas_precos_validar
before insert or update on public.simulador_saude_tabelas_precos
for each row execute function private.simulador_saude_validar_tabela_vigente();
drop trigger if exists simulador_saude_tabelas_precos_audit on public.simulador_saude_tabelas_precos;
create trigger simulador_saude_tabelas_precos_audit
after insert or update or delete on public.simulador_saude_tabelas_precos
for each row execute function private.simulador_saude_auditar_catalogo();

drop trigger if exists simulador_saude_precos_faixa_prepare on public.simulador_saude_precos_faixa;
create trigger simulador_saude_precos_faixa_prepare
before insert or update on public.simulador_saude_precos_faixa
for each row execute function private.simulador_saude_preparar_registro();
drop trigger if exists simulador_saude_precos_faixa_proteger_vigente on public.simulador_saude_precos_faixa;
create trigger simulador_saude_precos_faixa_proteger_vigente
before insert or update or delete on public.simulador_saude_precos_faixa
for each row execute function private.simulador_saude_proteger_precos_vigentes();
drop trigger if exists simulador_saude_precos_faixa_audit on public.simulador_saude_precos_faixa;
create trigger simulador_saude_precos_faixa_audit
after insert or update or delete on public.simulador_saude_precos_faixa
for each row execute function private.simulador_saude_auditar_catalogo();

alter table public.simulador_saude_operadoras enable row level security;
alter table public.simulador_saude_planos enable row level security;
alter table public.simulador_saude_tabelas_precos enable row level security;
alter table public.simulador_saude_precos_faixa enable row level security;
alter table public.simulador_saude_catalogo_historico enable row level security;

revoke all on table public.simulador_saude_operadoras from anon, authenticated;
revoke all on table public.simulador_saude_planos from anon, authenticated;
revoke all on table public.simulador_saude_tabelas_precos from anon, authenticated;
revoke all on table public.simulador_saude_precos_faixa from anon, authenticated;
revoke all on table public.simulador_saude_catalogo_historico from anon, authenticated;

grant select, insert, update on table public.simulador_saude_operadoras to authenticated;
grant select, insert, update on table public.simulador_saude_planos to authenticated;
grant select, insert, update on table public.simulador_saude_tabelas_precos to authenticated;
grant select, insert, update on table public.simulador_saude_precos_faixa to authenticated;
grant select on table public.simulador_saude_catalogo_historico to authenticated;

drop policy if exists simulador_saude_operadoras_select on public.simulador_saude_operadoras;
create policy simulador_saude_operadoras_select on public.simulador_saude_operadoras
  for select to authenticated
  using ((select public.app_tem_permissao('simulador_saude.catalogo', 'view')));
drop policy if exists simulador_saude_operadoras_insert on public.simulador_saude_operadoras;
create policy simulador_saude_operadoras_insert on public.simulador_saude_operadoras
  for insert to authenticated
  with check ((select public.app_tem_permissao('simulador_saude.catalogo', 'create')));
drop policy if exists simulador_saude_operadoras_update on public.simulador_saude_operadoras;
create policy simulador_saude_operadoras_update on public.simulador_saude_operadoras
  for update to authenticated
  using ((select public.app_tem_permissao('simulador_saude.catalogo', 'update')))
  with check ((select public.app_tem_permissao('simulador_saude.catalogo', 'update')));

drop policy if exists simulador_saude_planos_select on public.simulador_saude_planos;
create policy simulador_saude_planos_select on public.simulador_saude_planos
  for select to authenticated
  using ((select public.app_tem_permissao('simulador_saude.catalogo', 'view')));
drop policy if exists simulador_saude_planos_insert on public.simulador_saude_planos;
create policy simulador_saude_planos_insert on public.simulador_saude_planos
  for insert to authenticated
  with check ((select public.app_tem_permissao('simulador_saude.catalogo', 'create')));
drop policy if exists simulador_saude_planos_update on public.simulador_saude_planos;
create policy simulador_saude_planos_update on public.simulador_saude_planos
  for update to authenticated
  using ((select public.app_tem_permissao('simulador_saude.catalogo', 'update')))
  with check ((select public.app_tem_permissao('simulador_saude.catalogo', 'update')));

drop policy if exists simulador_saude_tabelas_precos_select on public.simulador_saude_tabelas_precos;
create policy simulador_saude_tabelas_precos_select on public.simulador_saude_tabelas_precos
  for select to authenticated
  using ((select public.app_tem_permissao('simulador_saude.catalogo', 'view')));
drop policy if exists simulador_saude_tabelas_precos_insert on public.simulador_saude_tabelas_precos;
create policy simulador_saude_tabelas_precos_insert on public.simulador_saude_tabelas_precos
  for insert to authenticated
  with check ((select public.app_tem_permissao('simulador_saude.catalogo', 'create')));
drop policy if exists simulador_saude_tabelas_precos_update on public.simulador_saude_tabelas_precos;
create policy simulador_saude_tabelas_precos_update on public.simulador_saude_tabelas_precos
  for update to authenticated
  using ((select public.app_tem_permissao('simulador_saude.catalogo', 'update')))
  with check ((select public.app_tem_permissao('simulador_saude.catalogo', 'update')));

drop policy if exists simulador_saude_precos_faixa_select on public.simulador_saude_precos_faixa;
create policy simulador_saude_precos_faixa_select on public.simulador_saude_precos_faixa
  for select to authenticated
  using ((select public.app_tem_permissao('simulador_saude.catalogo', 'view')));
drop policy if exists simulador_saude_precos_faixa_insert on public.simulador_saude_precos_faixa;
create policy simulador_saude_precos_faixa_insert on public.simulador_saude_precos_faixa
  for insert to authenticated
  with check (
    (
      (select public.app_tem_permissao('simulador_saude.catalogo', 'create'))
      or (select public.app_tem_permissao('simulador_saude.catalogo', 'update'))
    )
    and exists (
      select 1
      from public.simulador_saude_tabelas_precos tabela
      where tabela.id = tabela_preco_id
    )
  );
drop policy if exists simulador_saude_precos_faixa_update on public.simulador_saude_precos_faixa;
create policy simulador_saude_precos_faixa_update on public.simulador_saude_precos_faixa
  for update to authenticated
  using (
    (select public.app_tem_permissao('simulador_saude.catalogo', 'update'))
    and exists (
      select 1
      from public.simulador_saude_tabelas_precos tabela
      where tabela.id = tabela_preco_id
    )
  )
  with check (
    (select public.app_tem_permissao('simulador_saude.catalogo', 'update'))
    and exists (
      select 1
      from public.simulador_saude_tabelas_precos tabela
      where tabela.id = tabela_preco_id
    )
  );

drop policy if exists simulador_saude_catalogo_historico_select on public.simulador_saude_catalogo_historico;
create policy simulador_saude_catalogo_historico_select on public.simulador_saude_catalogo_historico
  for select to authenticated
  using ((select public.app_tem_permissao('simulador_saude.catalogo', 'view')));

commit;
