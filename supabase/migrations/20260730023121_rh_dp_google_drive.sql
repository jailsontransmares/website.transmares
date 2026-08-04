-- Fase 6: integração privada com Google Drive. O conteúdo não passa pelo banco.

alter table public.rh_arquivos_colaboradores
  add column if not exists versao_atual integer not null default 1,
  add column if not exists sha256_atual text,
  add column if not exists descartado_motivo text,
  add column if not exists descartado_drive_at timestamptz;

alter table public.rh_arquivos_colaboradores
  drop constraint if exists rh_arquivos_versao_atual_check;
alter table public.rh_arquivos_colaboradores
  add constraint rh_arquivos_versao_atual_check check (versao_atual >= 1);

create table if not exists public.rh_drive_pastas (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null unique references public.rh_colaboradores(id) on delete restrict,
  google_drive_folder_id text not null unique,
  nome_pasta text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rh_arquivos_colaboradores_versoes (
  id uuid primary key default gen_random_uuid(),
  arquivo_id uuid not null references public.rh_arquivos_colaboradores(id) on delete restrict,
  versao integer not null,
  google_drive_file_id text not null unique,
  nome_arquivo text not null,
  mime_type text,
  tamanho_bytes bigint not null check (tamanho_bytes >= 0),
  sha256 text not null,
  enviado_por uuid references public.usuarios(id) on delete set null,
  enviado_at timestamptz not null default now(),
  unique (arquivo_id, versao)
);

create table if not exists public.rh_drive_operacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios(id) on delete set null,
  colaborador_id uuid references public.rh_colaboradores(id) on delete set null,
  arquivo_id uuid references public.rh_arquivos_colaboradores(id) on delete set null,
  acao text not null check (acao in ('upload', 'nova_versao', 'visualizar', 'baixar', 'descartar', 'erro')),
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rh_arquivos_versoes_arquivo_idx on public.rh_arquivos_colaboradores_versoes (arquivo_id, versao desc);
create index if not exists rh_drive_operacoes_arquivo_created_idx on public.rh_drive_operacoes (arquivo_id, created_at desc);
create index if not exists rh_drive_operacoes_colaborador_created_idx on public.rh_drive_operacoes (colaborador_id, created_at desc);

alter table public.rh_drive_pastas enable row level security;
alter table public.rh_arquivos_colaboradores_versoes enable row level security;
alter table public.rh_drive_operacoes enable row level security;

revoke all on public.rh_drive_pastas, public.rh_arquivos_colaboradores_versoes, public.rh_drive_operacoes from anon, authenticated;
grant select on public.rh_arquivos_colaboradores_versoes to authenticated;
grant select on public.rh_drive_operacoes to authenticated;

drop policy if exists rh_arquivos_versoes_select_permission on public.rh_arquivos_colaboradores_versoes;
create policy rh_arquivos_versoes_select_permission
on public.rh_arquivos_colaboradores_versoes for select to authenticated
using (
  (select public.app_tem_permissao('rh_dp.colaboradores', 'view'))
  and (select public.app_tem_permissao('rh_dp.documentos', 'view'))
);

drop policy if exists rh_drive_operacoes_select_permission on public.rh_drive_operacoes;
create policy rh_drive_operacoes_select_permission
on public.rh_drive_operacoes for select to authenticated
using ((select public.app_tem_permissao('rh_dp.auditoria', 'view')));

drop trigger if exists rh_drive_pastas_prepare_update on public.rh_drive_pastas;
create trigger rh_drive_pastas_prepare_update
before update on public.rh_drive_pastas for each row execute function private.rh_preparar_atualizacao();

drop trigger if exists rh_drive_pastas_audit on public.rh_drive_pastas;
create trigger rh_drive_pastas_audit
after insert or update or delete on public.rh_drive_pastas for each row execute function private.rh_auditar_linha();

drop trigger if exists rh_arquivos_versoes_audit on public.rh_arquivos_colaboradores_versoes;
create trigger rh_arquivos_versoes_audit
after insert or update or delete on public.rh_arquivos_colaboradores_versoes for each row execute function private.rh_auditar_linha();

drop trigger if exists rh_drive_operacoes_audit on public.rh_drive_operacoes;
create trigger rh_drive_operacoes_audit
after insert or update or delete on public.rh_drive_operacoes for each row execute function private.rh_auditar_linha();
;
