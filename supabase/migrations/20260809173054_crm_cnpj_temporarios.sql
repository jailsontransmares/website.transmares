create table if not exists public.crm_oportunidades_pj_temporarios (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id text not null,
  versao integer not null check (versao > 0),
  status text not null default 'ativo' check (status in ('ativo', 'substituido', 'descartado', 'convertido')),
  cnpj text not null check (cnpj ~ '^[0-9]{14}$'),
  razao_social text not null default '',
  situacao text not null default '',
  endereco text not null default '',
  numero text not null default '',
  complemento text not null default '',
  cep text not null default '',
  bairro text not null default '',
  municipio text not null default '',
  uf text not null default '',
  fonte text not null default 'manual' check (fonte in ('api', 'manual')),
  consultado_em timestamptz,
  confirmado_em timestamptz,
  descartado_em timestamptz,
  expira_em timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_oportunidades_pj_temporarios_produtos (
  temporario_id uuid not null references public.crm_oportunidades_pj_temporarios(id) on delete cascade,
  oportunidade_id text not null,
  produto_id text not null,
  created_at timestamptz not null default now(),
  primary key (temporario_id, produto_id),
  unique (oportunidade_id, produto_id)
);

create unique index if not exists crm_cnpj_temporarios_ativo_oportunidade_cnpj_idx
  on public.crm_oportunidades_pj_temporarios (oportunidade_id, cnpj)
  where status = 'ativo';

create index if not exists crm_cnpj_temporarios_oportunidade_idx
  on public.crm_oportunidades_pj_temporarios (oportunidade_id, versao desc);

create index if not exists crm_cnpj_temporarios_produtos_oportunidade_idx
  on public.crm_oportunidades_pj_temporarios_produtos (oportunidade_id, produto_id);

alter table public.crm_oportunidades_pj_temporarios enable row level security;
alter table public.crm_oportunidades_pj_temporarios_produtos enable row level security;

grant select, insert, update on table public.crm_oportunidades_pj_temporarios to authenticated;
grant select, insert, update, delete on table public.crm_oportunidades_pj_temporarios_produtos to authenticated;

drop policy if exists crm_cnpj_temporarios_select_permission on public.crm_oportunidades_pj_temporarios;
create policy crm_cnpj_temporarios_select_permission
  on public.crm_oportunidades_pj_temporarios
  for select to authenticated
  using (public.app_tem_permissao('painel_ar', 'view'));

drop policy if exists crm_cnpj_temporarios_insert_permission on public.crm_oportunidades_pj_temporarios;
create policy crm_cnpj_temporarios_insert_permission
  on public.crm_oportunidades_pj_temporarios
  for insert to authenticated
  with check (public.app_tem_permissao('painel_ar', 'update'));

drop policy if exists crm_cnpj_temporarios_update_permission on public.crm_oportunidades_pj_temporarios;
create policy crm_cnpj_temporarios_update_permission
  on public.crm_oportunidades_pj_temporarios
  for update to authenticated
  using (public.app_tem_permissao('painel_ar', 'update'))
  with check (public.app_tem_permissao('painel_ar', 'update'));

drop policy if exists crm_cnpj_temporarios_produtos_select_permission on public.crm_oportunidades_pj_temporarios_produtos;
create policy crm_cnpj_temporarios_produtos_select_permission
  on public.crm_oportunidades_pj_temporarios_produtos
  for select to authenticated
  using (public.app_tem_permissao('painel_ar', 'view'));

drop policy if exists crm_cnpj_temporarios_produtos_insert_permission on public.crm_oportunidades_pj_temporarios_produtos;
create policy crm_cnpj_temporarios_produtos_insert_permission
  on public.crm_oportunidades_pj_temporarios_produtos
  for insert to authenticated
  with check (public.app_tem_permissao('painel_ar', 'update'));

drop policy if exists crm_cnpj_temporarios_produtos_update_permission on public.crm_oportunidades_pj_temporarios_produtos;
create policy crm_cnpj_temporarios_produtos_update_permission
  on public.crm_oportunidades_pj_temporarios_produtos
  for update to authenticated
  using (public.app_tem_permissao('painel_ar', 'update'))
  with check (public.app_tem_permissao('painel_ar', 'update'));

drop policy if exists crm_cnpj_temporarios_produtos_delete_permission on public.crm_oportunidades_pj_temporarios_produtos;
create policy crm_cnpj_temporarios_produtos_delete_permission
  on public.crm_oportunidades_pj_temporarios_produtos
  for delete to authenticated
  using (public.app_tem_permissao('painel_ar', 'update'));

create or replace function public.crm_salvar_cnpj_temporario(
  p_oportunidade_id text,
  p_produto_id text,
  p_cnpj text,
  p_razao_social text default '',
  p_situacao text default '',
  p_endereco text default '',
  p_numero text default '',
  p_complemento text default '',
  p_cep text default '',
  p_bairro text default '',
  p_municipio text default '',
  p_uf text default '',
  p_fonte text default 'manual',
  p_consultado_em timestamptz default null,
  p_reconsultar boolean default false
)
returns public.crm_oportunidades_pj_temporarios
language plpgsql
set search_path = public
as $$
declare
  v_cnpj text := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  v_temporario public.crm_oportunidades_pj_temporarios;
  v_old_id uuid;
  v_versao integer;
begin
  if not public.app_tem_permissao('painel_ar', 'update') then
    raise exception 'Usuário sem permissão para salvar o PJ temporário.' using errcode = '42501';
  end if;
  if nullif(trim(p_oportunidade_id), '') is null or nullif(trim(p_produto_id), '') is null then
    raise exception 'Oportunidade e produto são obrigatórios.' using errcode = '22023';
  end if;
  if v_cnpj !~ '^[0-9]{14}$' then
    raise exception 'CNPJ inválido.' using errcode = '22023';
  end if;
  if coalesce(p_fonte, '') not in ('api', 'manual') then
    raise exception 'Fonte inválida.' using errcode = '22023';
  end if;

  select * into v_temporario
    from public.crm_oportunidades_pj_temporarios
   where oportunidade_id = trim(p_oportunidade_id)
     and cnpj = v_cnpj
     and status = 'ativo'
   for update;

  if v_temporario.id is not null and not p_reconsultar then
    insert into public.crm_oportunidades_pj_temporarios_produtos (temporario_id, oportunidade_id, produto_id)
    values (v_temporario.id, trim(p_oportunidade_id), trim(p_produto_id))
    on conflict (oportunidade_id, produto_id) do update
      set temporario_id = excluded.temporario_id;
    return v_temporario;
  end if;

  if v_temporario.id is not null then
    v_old_id := v_temporario.id;
    update public.crm_oportunidades_pj_temporarios
       set status = 'substituido', expira_em = now() + interval '2 years', updated_at = now(), updated_by = public.app_usuario_atual_id()
     where id = v_temporario.id;
    select coalesce(max(versao), 0) + 1 into v_versao
      from public.crm_oportunidades_pj_temporarios
     where oportunidade_id = trim(p_oportunidade_id) and cnpj = v_cnpj;
  else
    select coalesce(max(versao), 0) + 1 into v_versao
      from public.crm_oportunidades_pj_temporarios
     where oportunidade_id = trim(p_oportunidade_id) and cnpj = v_cnpj;
  end if;

  insert into public.crm_oportunidades_pj_temporarios (
    oportunidade_id, versao, cnpj, razao_social, situacao, endereco, numero,
    complemento, cep, bairro, municipio, uf, fonte, consultado_em,
    created_by, updated_by
  ) values (
    trim(p_oportunidade_id), v_versao, v_cnpj, coalesce(trim(p_razao_social), ''),
    coalesce(trim(p_situacao), ''), coalesce(trim(p_endereco), ''),
    coalesce(trim(p_numero), ''), coalesce(trim(p_complemento), ''),
    coalesce(trim(p_cep), ''), coalesce(trim(p_bairro), ''),
    coalesce(trim(p_municipio), ''), upper(coalesce(trim(p_uf), '')),
    coalesce(p_fonte, 'manual'), p_consultado_em,
    public.app_usuario_atual_id(), public.app_usuario_atual_id()
  ) returning * into v_temporario;

  update public.crm_oportunidades_pj_temporarios_produtos
     set temporario_id = v_temporario.id
   where temporario_id = v_old_id;
  update public.crm_oportunidades_pj_temporarios_produtos
     set temporario_id = v_temporario.id
   where oportunidade_id = trim(p_oportunidade_id)
     and produto_id = trim(p_produto_id);
  insert into public.crm_oportunidades_pj_temporarios_produtos (temporario_id, oportunidade_id, produto_id)
  values (v_temporario.id, trim(p_oportunidade_id), trim(p_produto_id))
  on conflict (oportunidade_id, produto_id) do update
    set temporario_id = excluded.temporario_id;

  return v_temporario;
end;
$$;

revoke execute on function public.crm_salvar_cnpj_temporario(text, text, text, text, text, text, text, text, text, text, text, text, text, timestamptz, boolean) from public;
grant execute on function public.crm_salvar_cnpj_temporario(text, text, text, text, text, text, text, text, text, text, text, text, text, timestamptz, boolean) to authenticated;

create schema if not exists private;

create or replace function private.limpar_crm_cnpj_temporarios()
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_total integer;
begin
  delete from public.crm_oportunidades_pj_temporarios
   where status in ('descartado', 'substituido', 'convertido')
     and expira_em is not null
     and expira_em <= now();
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke execute on function private.limpar_crm_cnpj_temporarios() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute 'select cron.unschedule(jobid) from cron.job where jobname = ''crm-cnpj-temporarios-limpeza''';
    execute 'select cron.schedule(''crm-cnpj-temporarios-limpeza'', ''15 3 * * *'', ''select private.limpar_crm_cnpj_temporarios();'')';
  end if;
exception when undefined_table or undefined_function then
  null;
end;
$$;
