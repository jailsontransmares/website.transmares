create table if not exists public.rh_google_sheets_sync_queue (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id uuid not null,
  colaborador_id uuid not null,
  target text not null check (target in ('colaborador', 'alteracao')),
  action text not null check (action in ('upsert', 'delete')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'success', 'error')),
  version bigint not null default 1,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_table, source_id)
);

create index if not exists rh_google_sheets_sync_queue_pending_idx
  on public.rh_google_sheets_sync_queue (available_at, created_at)
  where status = 'pending';

alter table public.rh_google_sheets_sync_queue enable row level security;
revoke all on table public.rh_google_sheets_sync_queue from public, anon, authenticated;
grant all on table public.rh_google_sheets_sync_queue to service_role;

create or replace function private.rh_queue_google_sheet_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  v_collaborator_id uuid;
  v_source_id uuid;
  v_source_table text;
  v_target text;
  v_action text;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_source_table := tg_table_name;
  v_source_id := (row_data ->> 'id')::uuid;

  if tg_table_name in (
    'rh_colaboradores',
    'rh_documentos_cadastrais',
    'rh_vinculos_profissionais',
    'rh_dependentes'
  ) then
    v_target := 'colaborador';
    v_collaborator_id := case
      when tg_table_name = 'rh_colaboradores' then v_source_id
      else (row_data ->> 'colaborador_id')::uuid
    end;
    v_source_table := 'rh_colaboradores';
    v_source_id := v_collaborator_id;
    v_action := 'upsert';
  else
    v_target := 'alteracao';
    v_collaborator_id := (row_data ->> 'colaborador_id')::uuid;
    v_action := case when tg_op = 'DELETE' then 'delete' else 'upsert' end;
  end if;

  if v_source_id is null or v_collaborator_id is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  insert into public.rh_google_sheets_sync_queue as current_queue (
    source_table, source_id, colaborador_id, target, action,
    status, version, attempts, available_at, locked_at, last_error, updated_at
  ) values (
    v_source_table, v_source_id, v_collaborator_id, v_target, v_action,
    'pending', 1, 0, now(), null, null, now()
  )
  on conflict (source_table, source_id) do update
    set colaborador_id = excluded.colaborador_id,
        target = excluded.target,
        action = excluded.action,
        status = 'pending',
        version = current_queue.version + 1,
        attempts = 0,
        available_at = now(),
        locked_at = null,
        last_error = null,
        updated_at = now();

  if tg_table_name = 'rh_desligamentos' then
    insert into public.rh_google_sheets_sync_queue as current_queue (
      source_table, source_id, colaborador_id, target, action,
      status, version, attempts, available_at, locked_at, last_error, updated_at
    ) values (
      'rh_colaboradores', v_collaborator_id, v_collaborator_id, 'colaborador', 'upsert',
      'pending', 1, 0, now(), null, null, now()
    )
    on conflict (source_table, source_id) do update
      set colaborador_id = excluded.colaborador_id,
          target = excluded.target,
          action = excluded.action,
          status = 'pending',
          version = current_queue.version + 1,
          attempts = 0,
          available_at = now(),
          locked_at = null,
          last_error = null,
          updated_at = now();
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.rh_queue_google_sheet_sync() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'rh_colaboradores',
    'rh_documentos_cadastrais',
    'rh_vinculos_profissionais',
    'rh_dependentes',
    'rh_movimentacoes_colaboradores',
    'rh_ferias',
    'rh_afastamentos',
    'rh_desligamentos'
  ] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_google_sheets_sync', table_name);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.rh_queue_google_sheet_sync()',
      table_name || '_google_sheets_sync', table_name
    );
  end loop;
end;
$$;

insert into public.rh_google_sheets_sync_queue as current_queue (
  source_table, source_id, colaborador_id, target, action
)
select 'rh_colaboradores', colaborador.id, colaborador.id, 'colaborador', 'upsert'
from public.rh_colaboradores as colaborador
union all
select 'rh_movimentacoes_colaboradores', movimentacao.id, movimentacao.colaborador_id, 'alteracao', 'upsert'
from public.rh_movimentacoes_colaboradores as movimentacao
union all
select 'rh_ferias', ferias.id, ferias.colaborador_id, 'alteracao', 'upsert'
from public.rh_ferias as ferias
union all
select 'rh_afastamentos', afastamento.id, afastamento.colaborador_id, 'alteracao', 'upsert'
from public.rh_afastamentos as afastamento
union all
select 'rh_desligamentos', desligamento.id, desligamento.colaborador_id, 'alteracao', 'upsert'
from public.rh_desligamentos as desligamento
on conflict (source_table, source_id) do update
set colaborador_id = excluded.colaborador_id,
    target = excluded.target,
    action = excluded.action,
    status = 'pending',
    version = current_queue.version + 1,
    attempts = 0,
    available_at = now(),
    locked_at = null,
    last_error = null,
    updated_at = now();

create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function private.rh_google_sheets_worker_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker_token text;
begin
  select decrypted_secret
    into worker_token
  from vault.decrypted_secrets
  where name = 'rh_google_sheets_worker_token'
  limit 1;

  if nullif(trim(worker_token), '') is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://lmzdtsqhlrosovbxiadx.supabase.co/functions/v1/rh-google-sheets-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Worker-Token', worker_token
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function private.rh_google_sheets_worker_tick() from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'rh_google_sheets_sync_worker_every_minute';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'rh_google_sheets_sync_worker_every_minute',
    '* * * * *',
    'select private.rh_google_sheets_worker_tick();'
  );
end;
$$;
