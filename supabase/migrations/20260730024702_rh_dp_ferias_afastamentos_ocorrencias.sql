-- RH & DP — Fase 7: controle interno de férias, afastamentos e ocorrências.
-- A contabilidade permanece como fonte oficial de férias e afastamentos.

create table if not exists public.rh_ferias (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.rh_colaboradores(id) on delete restrict,
  periodo_aquisitivo_inicio date not null,
  periodo_aquisitivo_fim date not null,
  inicio_gozo date not null,
  fim_gozo date not null,
  dias_gozo smallint not null,
  abono_pecuniario boolean not null default false,
  observacoes text,
  status text not null default 'rascunho',
  enviado_em timestamptz,
  retorno_em timestamptz,
  retorno_resumo text,
  divergencia_descricao text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_ferias_periodo_check check (periodo_aquisitivo_fim >= periodo_aquisitivo_inicio),
  constraint rh_ferias_gozo_check check (fim_gozo >= inicio_gozo),
  constraint rh_ferias_dias_check check (dias_gozo between 1 and 30),
  constraint rh_ferias_status_check check (status in ('rascunho','pendente_envio','enviado_contabilidade','aguardando_retorno','confirmado_contabilidade','divergente','cancelado')),
  constraint rh_ferias_retorno_check check (retorno_em is null or enviado_em is null or retorno_em >= enviado_em)
);

create table if not exists public.rh_afastamentos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.rh_colaboradores(id) on delete restrict,
  tipo text not null,
  motivo text not null,
  inicio_em date not null,
  previsao_retorno_em date,
  retorno_em date,
  cid_referencia text,
  comunicacao_emitida boolean not null default false,
  observacoes text,
  status text not null default 'rascunho',
  enviado_em timestamptz,
  retorno_em_contabilidade timestamptz,
  retorno_resumo text,
  divergencia_descricao text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_afastamentos_tipo_check check (tipo in ('atestado_medico','acidente_trabalho','doenca_ocupacional','licenca_maternidade','licenca_paternidade','outro')),
  constraint rh_afastamentos_datas_check check ((previsao_retorno_em is null or previsao_retorno_em >= inicio_em) and (retorno_em is null or retorno_em >= inicio_em)),
  constraint rh_afastamentos_status_check check (status in ('rascunho','pendente_envio','enviado_contabilidade','aguardando_retorno','afastado','retorno_confirmado','divergente','cancelado')),
  constraint rh_afastamentos_retorno_contabilidade_check check (retorno_em_contabilidade is null or enviado_em is null or retorno_em_contabilidade >= enviado_em)
);

create table if not exists public.rh_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.rh_colaboradores(id) on delete restrict,
  categoria text not null,
  data_ocorrencia date not null,
  titulo text not null,
  descricao text not null,
  providencias text,
  requer_acompanhamento boolean not null default false,
  encerrada_em date,
  status text not null default 'aberta',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_ocorrencias_categoria_check check (categoria in ('acidente_trabalho','doenca_ocupacional','disciplinar','seguranca','administrativa','outro')),
  constraint rh_ocorrencias_status_check check (status in ('aberta','em_acompanhamento','encerrada','cancelada')),
  constraint rh_ocorrencias_encerramento_check check (encerrada_em is null or encerrada_em >= data_ocorrencia)
);

create index if not exists rh_ferias_colaborador_inicio_idx on public.rh_ferias (colaborador_id, inicio_gozo desc);
create index if not exists rh_ferias_status_inicio_idx on public.rh_ferias (status, inicio_gozo desc) where status <> 'cancelado';
create index if not exists rh_afastamentos_colaborador_inicio_idx on public.rh_afastamentos (colaborador_id, inicio_em desc);
create index if not exists rh_afastamentos_status_idx on public.rh_afastamentos (status, inicio_em desc) where status <> 'cancelado';
create index if not exists rh_ocorrencias_colaborador_data_idx on public.rh_ocorrencias (colaborador_id, data_ocorrencia desc);
create index if not exists rh_ocorrencias_abertas_idx on public.rh_ocorrencias (status, data_ocorrencia desc) where status <> 'encerrada';

create or replace function private.rh_preparar_fase7()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := public.app_usuario_atual_id();
    new.created_at := now();
  end if;
  new.updated_by := public.app_usuario_atual_id();
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.rh_preparar_fase7() from public, anon, authenticated;

do $$
declare tabela text;
begin
  foreach tabela in array array['rh_ferias','rh_afastamentos','rh_ocorrencias'] loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('revoke all on table public.%I from anon, authenticated', tabela);
    execute format('grant select, insert, update on table public.%I to authenticated', tabela);
    execute format('drop trigger if exists rh_fase7_prepare on public.%I', tabela);
    execute format('create trigger rh_fase7_prepare before insert or update on public.%I for each row execute function private.rh_preparar_fase7()', tabela);
    execute format('drop trigger if exists rh_fase7_audit on public.%I', tabela);
    execute format('create trigger rh_fase7_audit after insert or update or delete on public.%I for each row execute function private.rh_auditar_linha()', tabela);
  end loop;
end $$;

drop policy if exists rh_ferias_select_permission on public.rh_ferias;
create policy rh_ferias_select_permission on public.rh_ferias for select to authenticated
using ((select public.app_tem_permissao('rh_dp.ferias', 'view')));
drop policy if exists rh_ferias_insert_permission on public.rh_ferias;
create policy rh_ferias_insert_permission on public.rh_ferias for insert to authenticated
with check ((select public.app_tem_permissao('rh_dp.ferias', 'create')) and status = 'rascunho');
drop policy if exists rh_ferias_update_permission on public.rh_ferias;
create policy rh_ferias_update_permission on public.rh_ferias for update to authenticated
using ((select public.app_tem_permissao('rh_dp.ferias', 'update')) or ((select public.app_tem_permissao('rh_dp.ferias', 'cancel')) and status in ('rascunho','pendente_envio','enviado_contabilidade','aguardando_retorno','divergente')))
with check ((select public.app_tem_permissao('rh_dp.ferias', 'update')) or ((select public.app_tem_permissao('rh_dp.ferias', 'cancel')) and status = 'cancelado'));

drop policy if exists rh_afastamentos_select_permission on public.rh_afastamentos;
create policy rh_afastamentos_select_permission on public.rh_afastamentos for select to authenticated
using ((select public.app_tem_permissao('rh_dp.ocorrencias', 'view')));
drop policy if exists rh_afastamentos_insert_permission on public.rh_afastamentos;
create policy rh_afastamentos_insert_permission on public.rh_afastamentos for insert to authenticated
with check ((select public.app_tem_permissao('rh_dp.ocorrencias', 'create')) and status = 'rascunho');
drop policy if exists rh_afastamentos_update_permission on public.rh_afastamentos;
create policy rh_afastamentos_update_permission on public.rh_afastamentos for update to authenticated
using ((select public.app_tem_permissao('rh_dp.ocorrencias', 'update')))
with check ((select public.app_tem_permissao('rh_dp.ocorrencias', 'update')));

drop policy if exists rh_ocorrencias_select_permission on public.rh_ocorrencias;
create policy rh_ocorrencias_select_permission on public.rh_ocorrencias for select to authenticated
using ((select public.app_tem_permissao('rh_dp.ocorrencias', 'view')));
drop policy if exists rh_ocorrencias_insert_permission on public.rh_ocorrencias;
create policy rh_ocorrencias_insert_permission on public.rh_ocorrencias for insert to authenticated
with check ((select public.app_tem_permissao('rh_dp.ocorrencias', 'create')) and status = 'aberta');
drop policy if exists rh_ocorrencias_update_permission on public.rh_ocorrencias;
create policy rh_ocorrencias_update_permission on public.rh_ocorrencias for update to authenticated
using ((select public.app_tem_permissao('rh_dp.ocorrencias', 'update')))
with check ((select public.app_tem_permissao('rh_dp.ocorrencias', 'update')));
;
