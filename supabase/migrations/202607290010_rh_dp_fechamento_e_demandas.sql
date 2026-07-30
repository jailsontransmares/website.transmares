-- RH & DP - Fase 5: controle interno de demandas à contabilidade e fechamento mensal.
-- Não calcula folha, tributos ou eventos oficiais; apenas organiza solicitações, prazos e conferências.

insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status)
values ('rh_dp.demandas_contabilidade', 'Demandas à contabilidade', 'aba', 'rh_dp', '/rh-dp/demandas-contabilidade', 67, 'ativo')
on conflict (chave) do update set
  nome = excluded.nome, tipo = excluded.tipo, recurso_pai = excluded.recurso_pai,
  rota = excluded.rota, ordem = excluded.ordem, status = excluded.status, updated_at = now();

with permissoes(recurso_chave, acao) as (
  values
    ('rh_dp.demandas_contabilidade', 'view'),
    ('rh_dp.demandas_contabilidade', 'create'),
    ('rh_dp.demandas_contabilidade', 'update'),
    ('rh_dp.demandas_contabilidade', 'close'),
    ('rh_dp.fechamentos', 'view'),
    ('rh_dp.fechamentos', 'create'),
    ('rh_dp.fechamentos', 'update'),
    ('rh_dp.fechamentos', 'close'),
    ('rh_dp.fechamentos', 'reopen')
)
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select p.id, permissoes.recurso_chave, permissoes.acao, true
from public.perfis p cross join permissoes
where p.slug = 'admin'
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = excluded.permitido, updated_at = now();

create table if not exists public.rh_demandas_contabilidade (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.rh_colaboradores(id) on delete restrict,
  competencia date,
  tipo text not null,
  titulo text not null,
  descricao text,
  prioridade text not null default 'normal',
  prazo date,
  status text not null default 'rascunho',
  enviado_em timestamptz,
  retorno_em timestamptz,
  retorno_resumo text,
  divergencia_descricao text,
  google_drive_web_url text,
  google_drive_file_id text,
  concluido_em timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_demandas_competencia_check check (competencia is null or competencia = date_trunc('month', competencia)::date),
  constraint rh_demandas_tipo_check check (tipo in ('admissao', 'alteracao_cadastral', 'ferias', 'afastamento', 'desligamento', 'beneficio', 'remuneracao', 'outro')),
  constraint rh_demandas_prioridade_check check (prioridade in ('baixa', 'normal', 'alta', 'urgente')),
  constraint rh_demandas_status_check check (status in ('rascunho', 'pronto_para_envio', 'enviado', 'aguardando_retorno', 'retorno_recebido', 'concluido', 'cancelado')),
  constraint rh_demandas_retorno_check check (retorno_em is null or enviado_em is null or retorno_em >= enviado_em),
  constraint rh_demandas_url_check check (google_drive_web_url is null or google_drive_web_url ~* '^https?://')
);

create table if not exists public.rh_competencias (
  id uuid primary key default gen_random_uuid(),
  competencia date not null unique,
  status text not null default 'em_preparacao',
  prazo_envio date,
  enviado_em timestamptz,
  retorno_em timestamptz,
  retorno_resumo text,
  divergencia_descricao text,
  google_drive_web_url text,
  google_drive_file_id text,
  fechado_em timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_competencias_mes_check check (competencia = date_trunc('month', competencia)::date),
  constraint rh_competencias_status_check check (status in ('em_preparacao', 'pronto_para_envio', 'enviado', 'aguardando_retorno', 'em_conferencia', 'concluido', 'com_divergencia')),
  constraint rh_competencias_retorno_check check (retorno_em is null or enviado_em is null or retorno_em >= enviado_em),
  constraint rh_competencias_url_check check (google_drive_web_url is null or google_drive_web_url ~* '^https?://')
);

create table if not exists public.rh_eventos_competencia (
  id uuid primary key default gen_random_uuid(),
  competencia_id uuid not null references public.rh_competencias(id) on delete cascade,
  colaborador_id uuid references public.rh_colaboradores(id) on delete restrict,
  tipo text not null,
  descricao text not null,
  data_referencia date,
  status text not null default 'pendente',
  retorno_resumo text,
  divergencia_descricao text,
  google_drive_web_url text,
  google_drive_file_id text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_eventos_tipo_check check (tipo in ('admissao', 'alteracao_cadastral', 'ferias', 'afastamento', 'desligamento', 'beneficio', 'remuneracao', 'variavel', 'outro')),
  constraint rh_eventos_status_check check (status in ('pendente', 'enviado', 'confirmado', 'divergencia', 'dispensado')),
  constraint rh_eventos_url_check check (google_drive_web_url is null or google_drive_web_url ~* '^https?://')
);

create index if not exists rh_demandas_status_prazo_idx on public.rh_demandas_contabilidade (status, prazo) where status not in ('concluido', 'cancelado');
create index if not exists rh_demandas_colaborador_idx on public.rh_demandas_contabilidade (colaborador_id, created_at desc);
create index if not exists rh_eventos_competencia_idx on public.rh_eventos_competencia (competencia_id, status);
create index if not exists rh_eventos_colaborador_idx on public.rh_eventos_competencia (colaborador_id, data_referencia desc);

create or replace function private.rh_preparar_registro_controle()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := public.app_usuario_atual_id();
    new.created_at := now();
  end if;
  new.updated_by := public.app_usuario_atual_id();
  new.updated_at := now();
  if tg_table_name = 'rh_demandas_contabilidade' and new.status = 'concluido' and new.concluido_em is null then new.concluido_em := now(); end if;
  if tg_table_name = 'rh_competencias' and new.status = 'concluido' and new.fechado_em is null then new.fechado_em := now(); end if;
  return new;
end;
$$;

revoke all on function private.rh_preparar_registro_controle() from public, anon, authenticated;

do $$
declare tabela text;
begin
  foreach tabela in array array['rh_demandas_contabilidade', 'rh_competencias', 'rh_eventos_competencia'] loop
    execute format('drop trigger if exists rh_controle_prepare on public.%I', tabela);
    execute format('create trigger rh_controle_prepare before insert or update on public.%I for each row execute function private.rh_preparar_registro_controle()', tabela);
    execute format('drop trigger if exists rh_controle_audit on public.%I', tabela);
    execute format('create trigger rh_controle_audit after insert or update or delete on public.%I for each row execute function private.rh_auditar_linha()', tabela);
    execute format('alter table public.%I enable row level security', tabela);
    execute format('revoke all on table public.%I from anon, authenticated', tabela);
    execute format('grant select, insert, update on table public.%I to authenticated', tabela);
  end loop;
end $$;

create policy rh_demandas_select_permission on public.rh_demandas_contabilidade for select to authenticated using ((select public.app_tem_permissao('rh_dp.demandas_contabilidade', 'view')));
create policy rh_demandas_insert_permission on public.rh_demandas_contabilidade for insert to authenticated with check ((select public.app_tem_permissao('rh_dp.demandas_contabilidade', 'create')) and status = 'rascunho');
create policy rh_demandas_update_permission on public.rh_demandas_contabilidade for update to authenticated using ((select public.app_tem_permissao('rh_dp.demandas_contabilidade', 'update')) or ((select public.app_tem_permissao('rh_dp.demandas_contabilidade', 'close')) and status in ('retorno_recebido', 'enviado', 'aguardando_retorno'))) with check ((select public.app_tem_permissao('rh_dp.demandas_contabilidade', 'update')) or ((select public.app_tem_permissao('rh_dp.demandas_contabilidade', 'close')) and status in ('concluido', 'cancelado')));

create policy rh_competencias_select_permission on public.rh_competencias for select to authenticated using ((select public.app_tem_permissao('rh_dp.fechamentos', 'view')));
create policy rh_competencias_insert_permission on public.rh_competencias for insert to authenticated with check ((select public.app_tem_permissao('rh_dp.fechamentos', 'create')) and status = 'em_preparacao');
create policy rh_competencias_update_permission on public.rh_competencias for update to authenticated using ((select public.app_tem_permissao('rh_dp.fechamentos', 'update')) or ((select public.app_tem_permissao('rh_dp.fechamentos', 'close')) and status in ('em_conferencia', 'com_divergencia', 'aguardando_retorno')) or ((select public.app_tem_permissao('rh_dp.fechamentos', 'reopen')) and status = 'concluido')) with check ((select public.app_tem_permissao('rh_dp.fechamentos', 'update')) or ((select public.app_tem_permissao('rh_dp.fechamentos', 'close')) and status = 'concluido') or ((select public.app_tem_permissao('rh_dp.fechamentos', 'reopen')) and status = 'em_preparacao'));
create policy rh_eventos_select_permission on public.rh_eventos_competencia for select to authenticated using ((select public.app_tem_permissao('rh_dp.fechamentos', 'view')));
create policy rh_eventos_insert_permission on public.rh_eventos_competencia for insert to authenticated with check ((select public.app_tem_permissao('rh_dp.fechamentos', 'create')));
create policy rh_eventos_update_permission on public.rh_eventos_competencia for update to authenticated using ((select public.app_tem_permissao('rh_dp.fechamentos', 'update'))) with check ((select public.app_tem_permissao('rh_dp.fechamentos', 'update')));
