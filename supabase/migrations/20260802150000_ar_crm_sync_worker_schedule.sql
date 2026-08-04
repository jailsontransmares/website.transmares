create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function private.ar_crm_sync_worker_tick()
returns void
language plpgsql
security definer
set search_path = private, public, extensions, vault
as $$
declare
  worker_token text;
begin
  select decrypted_secret
    into worker_token
  from vault.decrypted_secrets
  where name = 'clickup_worker_token'
  limit 1;

  if nullif(trim(worker_token), '') is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://lmzdtsqhlrosovbxiadx.supabase.co/functions/v1/clickup-sync-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Worker-Token', worker_token
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function private.ar_crm_sync_worker_tick() from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'ar_crm_sync_worker_every_minute';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'ar_crm_sync_worker_every_minute',
    '* * * * *',
    'select private.ar_crm_sync_worker_tick();'
  );
end;
$$;
