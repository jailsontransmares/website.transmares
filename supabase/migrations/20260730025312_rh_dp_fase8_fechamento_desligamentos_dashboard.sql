-- RH & DP — Fase 8: fechamento mensal, desligamentos e indicadores internos.
-- O Hub não calcula verbas, não transmite eventos oficiais e não substitui a contabilidade.

create table if not exists public.rh_desligamentos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.rh_colaboradores(id) on delete restrict,
  tipo text not null,
  motivo_resumo text not null,
  comunicado_em date,
  ultimo_dia_trabalho date,
  competencia date not null,
  aviso_previo text,
  observacoes text,
  status text not null default 'rascunho',
  enviado_em timestamptz,
  retorno_em timestamptz,
  retorno_resumo text,
  divergencia_descricao text,
  concluido_em timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_desligamentos_tipo_check check (tipo in ('pedido_colaborador','iniciativa_empresa','termino_contrato','acordo','aposentadoria','outro')),
  constraint rh_desligamentos_competencia_check check (competencia = date_trunc('month', competencia)::date),
  constraint rh_desligamentos_aviso_check check (aviso_previo is null or aviso_previo in ('trabalhado','indenizado','dispensado','nao_aplicavel')),
  constraint rh_desligamentos_status_check check (status in ('rascunho','pendente_envio','enviado_contabilidade','aguardando_retorno','confirmado_contabilidade','divergente','concluido','cancelado')),
  constraint rh_desligamentos_datas_check check (ultimo_dia_trabalho is null or comunicado_em is null or ultimo_dia_trabalho >= comunicado_em),
  constraint rh_desligamentos_retorno_check check (retorno_em is null or enviado_em is null or retorno_em >= enviado_em)
);

create table if not exists public.rh_checklist_desligamento (
  id uuid primary key default gen_random_uuid(),
  desligamento_id uuid not null references public.rh_desligamentos(id) on delete restrict,
  item_chave text not null,
  status text not null default 'pendente',
  concluido_em timestamptz,
  observacoes text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_checklist_desligamento_item_check check (item_chave in ('contabilidade','acessos','equipamentos','beneficios','documentos','comunicacao_interna')),
  constraint rh_checklist_desligamento_status_check check (status in ('pendente','concluido','nao_aplicavel')),
  constraint rh_checklist_desligamento_conclusao_check check ((status = 'concluido' and concluido_em is not null) or status <> 'concluido'),
  unique (desligamento_id, item_chave)
);

create index if not exists rh_desligamentos_colaborador_idx on public.rh_desligamentos (colaborador_id, competencia desc);
create index if not exists rh_desligamentos_status_competencia_idx on public.rh_desligamentos (status, competencia desc) where status not in ('concluido', 'cancelado');
create index if not exists rh_checklist_desligamento_registro_idx on public.rh_checklist_desligamento (desligamento_id, status);

create or replace function private.rh_preparar_desligamento()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := public.app_usuario_atual_id();
    new.created_at := now();
  end if;
  new.updated_by := public.app_usuario_atual_id();
  new.updated_at := now();
  if tg_table_name = 'rh_desligamentos' and new.status = 'concluido' and new.concluido_em is null then
    new.concluido_em := now();
  end if;
  if tg_table_name = 'rh_checklist_desligamento' and new.status = 'concluido' and new.concluido_em is null then
    new.concluido_em := now();
  end if;
  return new;
end;
$$;

create or replace function private.rh_validar_fechamento_competencia()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'concluido' and old.status is distinct from 'concluido' and exists (
    select 1 from public.rh_eventos_competencia evento
    where evento.competencia_id = new.id
      and evento.status in ('pendente', 'enviado', 'divergencia')
  ) then
    raise exception 'Não é possível concluir a competência enquanto houver eventos pendentes ou divergentes.';
  end if;
  return new;
end;
$$;

revoke all on function private.rh_preparar_desligamento() from public, anon, authenticated;
revoke all on function private.rh_validar_fechamento_competencia() from public, anon, authenticated;

drop trigger if exists rh_competencias_validar_conclusao on public.rh_competencias;
create trigger rh_competencias_validar_conclusao
before update on public.rh_competencias
for each row execute function private.rh_validar_fechamento_competencia();

do $$
declare tabela text;
begin
  foreach tabela in array array['rh_desligamentos', 'rh_checklist_desligamento'] loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('revoke all on table public.%I from anon, authenticated', tabela);
    execute format('grant select, insert, update on table public.%I to authenticated', tabela);
    execute format('drop trigger if exists rh_desligamento_prepare on public.%I', tabela);
    execute format('create trigger rh_desligamento_prepare before insert or update on public.%I for each row execute function private.rh_preparar_desligamento()', tabela);
    execute format('drop trigger if exists rh_desligamento_audit on public.%I', tabela);
    execute format('create trigger rh_desligamento_audit after insert or update or delete on public.%I for each row execute function private.rh_auditar_linha()', tabela);
  end loop;
end $$;

drop policy if exists rh_desligamentos_select_permission on public.rh_desligamentos;
create policy rh_desligamentos_select_permission on public.rh_desligamentos for select to authenticated
using ((select public.app_tem_permissao('rh_dp.desligamentos', 'view')));
drop policy if exists rh_desligamentos_insert_permission on public.rh_desligamentos;
create policy rh_desligamentos_insert_permission on public.rh_desligamentos for insert to authenticated
with check ((select public.app_tem_permissao('rh_dp.desligamentos', 'create')) and status = 'rascunho');
drop policy if exists rh_desligamentos_update_permission on public.rh_desligamentos;
create policy rh_desligamentos_update_permission on public.rh_desligamentos for update to authenticated
using ((select public.app_tem_permissao('rh_dp.desligamentos', 'update')))
with check ((select public.app_tem_permissao('rh_dp.desligamentos', 'update')));

drop policy if exists rh_checklist_desligamento_select_permission on public.rh_checklist_desligamento;
create policy rh_checklist_desligamento_select_permission on public.rh_checklist_desligamento for select to authenticated
using ((select public.app_tem_permissao('rh_dp.desligamentos', 'view')));
drop policy if exists rh_checklist_desligamento_insert_permission on public.rh_checklist_desligamento;
create policy rh_checklist_desligamento_insert_permission on public.rh_checklist_desligamento for insert to authenticated
with check ((select public.app_tem_permissao('rh_dp.desligamentos', 'create')));
drop policy if exists rh_checklist_desligamento_update_permission on public.rh_checklist_desligamento;
create policy rh_checklist_desligamento_update_permission on public.rh_checklist_desligamento for update to authenticated
using ((select public.app_tem_permissao('rh_dp.desligamentos', 'update')))
with check ((select public.app_tem_permissao('rh_dp.desligamentos', 'update')));;
