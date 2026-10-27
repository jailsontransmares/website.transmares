create table if not exists public.login_nome_usuario_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  attempt_count integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint login_nome_usuario_rate_limits_key_check check (rate_key ~ '^[0-9a-f]{64}$'),
  constraint login_nome_usuario_rate_limits_attempts_check check (attempt_count >= 0)
);

create index if not exists login_nome_usuario_rate_limits_updated_at_idx
  on public.login_nome_usuario_rate_limits (window_started_at);

alter table public.login_nome_usuario_rate_limits enable row level security;
revoke all on table public.login_nome_usuario_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.login_nome_usuario_rate_limits to service_role;

create or replace function public.app_consumir_limite_login_nome_usuario(
  p_ip_key text,
  p_login_key text,
  p_account_key text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_key text;
  v_limit integer;
  v_window_started_at timestamptz;
  v_attempt_count integer;
  v_blocked_until timestamptz;
begin
  if p_ip_key !~ '^[0-9a-f]{64}$' or p_login_key !~ '^[0-9a-f]{64}$' or p_account_key !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid login rate-limit key.';
  end if;

  for v_key, v_limit in
    select candidate.rate_key, candidate.bucket_limit
    from (values (p_ip_key, 60), (p_login_key, 10), (p_account_key, 30)) as candidate(rate_key, bucket_limit)
    order by candidate.rate_key
  loop
    insert into public.login_nome_usuario_rate_limits (rate_key, window_started_at, attempt_count, updated_at)
    values (v_key, v_now, 0, v_now)
    on conflict (rate_key) do nothing;

    select limits.window_started_at, limits.attempt_count, limits.blocked_until
    into v_window_started_at, v_attempt_count, v_blocked_until
    from public.login_nome_usuario_rate_limits as limits
    where limits.rate_key = v_key
    for update;

    if v_blocked_until > v_now then
      return false;
    end if;

    if v_window_started_at <= v_now - interval '15 minutes' then
      update public.login_nome_usuario_rate_limits
      set window_started_at = v_now,
          attempt_count = 1,
          blocked_until = null,
          updated_at = v_now
      where rate_key = v_key;
    elsif v_attempt_count >= v_limit then
      update public.login_nome_usuario_rate_limits
      set blocked_until = v_window_started_at + interval '15 minutes',
          updated_at = v_now
      where rate_key = v_key;
      return false;
    else
      update public.login_nome_usuario_rate_limits
      set attempt_count = v_attempt_count + 1,
          updated_at = v_now
      where rate_key = v_key;
    end if;
  end loop;

  delete from public.login_nome_usuario_rate_limits
  where window_started_at < v_now - interval '1 day';

  return true;
end;
$$;

revoke all on function public.app_consumir_limite_login_nome_usuario(text, text, text) from public, anon, authenticated;
grant execute on function public.app_consumir_limite_login_nome_usuario(text, text, text) to service_role;

comment on table public.login_nome_usuario_rate_limits is
  'Buckets temporários de tentativas do login por nome de usuário; acessíveis apenas pela Edge Function de autenticação.';
