create schema if not exists private;

revoke all on schema private from public;

create or replace function private.hub_responsavel_usuario(p_responsavel text)
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select u.id
  from public.usuarios u
  where u.status::text = 'ativo'
    and (
      lower(trim(coalesce(u.email, ''))) = lower(trim(coalesce(p_responsavel, '')))
      or lower(trim(coalesce(u.nome, ''))) = lower(trim(coalesce(p_responsavel, '')))
    )
  order by u.id
  limit 1;
$$;

create or replace function private.hub_inserir_notificacao(
  p_usuario_id uuid,
  p_tipo text,
  p_titulo text,
  p_descricao text,
  p_modulo text,
  p_registro_tipo text,
  p_registro_id text,
  p_rota text,
  p_dedupe_key text,
  p_metadados jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions, private
as $$
begin
  if p_usuario_id is null then return; end if;

  insert into public.hub_notificacoes (
    usuario_id, tipo, titulo, descricao, modulo, registro_tipo,
    registro_id, rota, dedupe_key, metadados
  ) values (
    p_usuario_id, p_tipo, p_titulo, p_descricao, p_modulo, p_registro_tipo,
    p_registro_id, p_rota, p_dedupe_key, coalesce(p_metadados, '{}'::jsonb)
  )
  on conflict (usuario_id, dedupe_key) do nothing;
end;
$$;

create or replace function private.hub_notificar_mencao()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, private
as $$
begin
  if new.user_id is not null and new.user_id is distinct from new.created_by then
    perform private.hub_inserir_notificacao(
      new.user_id,
      'mencao',
      'Você foi mencionado',
      coalesce(new.display_name, 'Você foi mencionado em um comentário do CRM.'),
      'painel_ar.crm',
      'ar_crm_task',
      new.task_id,
      '/hub/painel-ar/crm?task=' || new.task_id,
      'mencao:' || new.task_id || ':' || new.clickup_comment_id || ':' || new.user_id,
      jsonb_build_object('clickup_comment_id', new.clickup_comment_id)
    );
  end if;
  return new;
end;
$$;

create or replace function private.hub_notificar_comentario()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  responsavel_id uuid;
begin
  select private.hub_responsavel_usuario(i.responsavel)
    into responsavel_id
  from public.ar_crm_items i
  join public.ar_crm_clickup_mapping m on m.item_id = i.id
  where m.task_id = new.task_id
  limit 1;

  if responsavel_id is not null and responsavel_id is distinct from new.created_by then
    perform private.hub_inserir_notificacao(
      responsavel_id,
      'comentario',
      'Novo comentário no CRM',
      'Foi adicionado um comentário ou resposta em uma atividade atribuída a você.',
      'painel_ar.crm',
      'ar_crm_task',
      new.task_id,
      '/hub/painel-ar/crm?task=' || new.task_id,
      'comentario:' || new.task_id || ':' || new.clickup_comment_id || ':' || responsavel_id
    );
  end if;
  return new;
end;
$$;

create or replace function private.hub_notificar_item_crm()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  responsavel_id uuid;
begin
  responsavel_id := private.hub_responsavel_usuario(new.responsavel);

  if responsavel_id is not null
     and (tg_op = 'INSERT' or old.responsavel is distinct from new.responsavel) then
    perform private.hub_inserir_notificacao(
      responsavel_id,
      'atribuicao',
      'Atividade atribuída a você',
      coalesce(new.nome, 'Uma atividade foi atribuída a você.'),
      'painel_ar.crm',
      'ar_crm_item',
      new.id::text,
      '/hub/painel-ar/crm?task=' || coalesce((select task_id from public.ar_crm_clickup_mapping where item_id = new.id limit 1), new.id::text),
      'atribuicao:' || new.id || ':' || coalesce(new.responsavel, '')
    );
  end if;

  if tg_op = 'UPDATE' and responsavel_id is not null and old.status is distinct from new.status then
    perform private.hub_inserir_notificacao(
      responsavel_id,
      'status',
      'Status da atividade alterado',
      coalesce(new.nome, 'Uma atividade atribuída a você teve o status alterado.') || ': ' || coalesce(new.status, 'sem status'),
      'painel_ar.crm',
      'ar_crm_item',
      new.id::text,
      '/hub/painel-ar/crm?task=' || coalesce((select task_id from public.ar_crm_clickup_mapping where item_id = new.id limit 1), new.id::text),
      'status:' || new.id || ':' || coalesce(new.status, '') || ':' || to_char(new.updated_at, 'YYYYMMDDHH24MISSMS')
    );
  end if;

  return new;
end;
$$;

create or replace function private.hub_notificar_erro_sync()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  usuario record;
begin
  if new.status = 'error' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    for usuario in select id from public.usuarios where status::text = 'ativo' loop
      perform private.hub_inserir_notificacao(
        usuario.id,
        'erro',
        'Erro na integração do CRM',
        coalesce(new.mensagem_erro, 'A sincronização do CRM apresentou um erro.'),
        'painel_ar.crm',
        'ar_crm_sync_run',
        new.id::text,
        '/hub/painel-ar/crm',
        'erro:sync:' || new.id || ':' || usuario.id
      );
    end loop;
  end if;
  return new;
end;
$$;

create or replace function private.hub_rotina_notificacoes()
returns void
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  item record;
  responsavel_id uuid;
  situacao text;
begin
  delete from public.hub_notificacoes
  where arquivada_em is not null
    and arquivada_em < now() - interval '15 days';

  for item in
    select i.*, m.task_id
    from public.ar_crm_items i
    left join public.ar_crm_clickup_mapping m on m.item_id = i.id
    where i.data_vencimento is not null
      and i.data_vencimento <= current_date + 2
      and coalesce(lower(i.status), '') not in ('concluído', 'concluido', 'cancelado', 'fechado')
  loop
    responsavel_id := private.hub_responsavel_usuario(item.responsavel);
    if responsavel_id is null then continue; end if;

    situacao := case when item.data_vencimento < current_date then 'atrasado' else 'próximo' end;
    perform private.hub_inserir_notificacao(
      responsavel_id,
      'prazo',
      case when situacao = 'atrasado' then 'Prazo atrasado' else 'Prazo próximo' end,
      coalesce(item.nome, 'Uma atividade atribuída a você') || ' · vencimento em ' || to_char(item.data_vencimento, 'DD/MM/YYYY'),
      'painel_ar.crm',
      'ar_crm_item',
      item.id::text,
      '/hub/painel-ar/crm?task=' || coalesce(item.task_id, item.id::text),
      'prazo:' || item.id || ':' || item.data_vencimento || ':' || situacao
    );
  end loop;
end;
$$;

revoke all on function private.hub_responsavel_usuario(text) from public, anon, authenticated;
revoke all on function private.hub_inserir_notificacao(uuid, text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function private.hub_rotina_notificacoes() from public, anon, authenticated;

drop trigger if exists hub_notificacoes_mencao_insert on public.ar_crm_comment_mentions;
create trigger hub_notificacoes_mencao_insert
after insert on public.ar_crm_comment_mentions
for each row execute function private.hub_notificar_mencao();

drop trigger if exists hub_notificacoes_comentario_insert on public.ar_crm_comment_links;
create trigger hub_notificacoes_comentario_insert
after insert on public.ar_crm_comment_links
for each row execute function private.hub_notificar_comentario();

drop trigger if exists hub_notificacoes_item_change on public.ar_crm_items;
create trigger hub_notificacoes_item_change
after insert or update of responsavel, status on public.ar_crm_items
for each row execute function private.hub_notificar_item_crm();

drop trigger if exists hub_notificacoes_sync_error on public.ar_crm_sync_runs;
create trigger hub_notificacoes_sync_error
after insert or update of status, mensagem_erro on public.ar_crm_sync_runs
for each row execute function private.hub_notificar_erro_sync();

create extension if not exists pg_cron;

do $$
declare
  job_id bigint;
begin
  select jobid into job_id from cron.job where jobname = 'hub_notificacoes_rotina_diaria';
  if job_id is not null then perform cron.unschedule(job_id); end if;
  perform cron.schedule('hub_notificacoes_rotina_diaria', '0 11 * * *', $job$select private.hub_rotina_notificacoes()$job$);
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hub_notificacoes'
  ) then
    alter publication supabase_realtime add table public.hub_notificacoes;
  end if;
end;
$$;
