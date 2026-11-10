begin;

insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status)
values ('operacoes.cartas', 'Cartas', 'aba', null, '/operacoes/cartas', 134, 'ativo')
on conflict (chave) do update set
  nome = excluded.nome,
  tipo = excluded.tipo,
  rota = excluded.rota,
  ordem = excluded.ordem,
  status = excluded.status,
  updated_at = now();

insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select p.id, 'operacoes.cartas', 'view', true
from public.perfis p
where p.slug in ('admin', 'usuario', 'especial', 'consulta')
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = true, updated_at = now();

insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select p.id, 'operacoes.cartas', a.acao, true
from public.perfis p
cross join (values ('create'), ('update'), ('manage_certificate'), ('sign')) as a(acao)
where p.slug in ('admin', 'usuario', 'especial')
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = true, updated_at = now();

insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select p.id, 'operacoes.cartas', 'delete', true
from public.perfis p
where p.slug = 'admin'
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = true, updated_at = now();

create table if not exists public.cartas_certificados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('ecpf', 'ecnpj')),
  titular text not null,
  validade_ate timestamptz,
  fingerprint text,
  pfx_path text not null,
  senha_path text not null,
  enviado_por_auth_uid uuid not null,
  ativo boolean not null default true,
  created_by uuid references public.usuarios(id) on delete set null default public.app_usuario_atual_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cartas_certificado_nome_tamanho check (char_length(nome) between 1 and 120),
  constraint cartas_certificado_titular_tamanho check (char_length(titular) between 1 and 180)
);

create table if not exists public.cartas_documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  destinatario text not null,
  assunto text not null,
  corpo text not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'assinado', 'cancelado')),
  arquivo_path text,
  sha256 text,
  certificado_id uuid references public.cartas_certificados(id) on delete set null,
  signatario_auth_uid uuid,
  assinado_em timestamptz,
  created_by uuid references public.usuarios(id) on delete set null default public.app_usuario_atual_id(),
  updated_by uuid references public.usuarios(id) on delete set null default public.app_usuario_atual_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cartas_titulo_tamanho check (char_length(titulo) between 1 and 160),
  constraint cartas_destinatario_tamanho check (char_length(destinatario) between 1 and 200),
  constraint cartas_assunto_tamanho check (char_length(assunto) between 1 and 200),
  constraint cartas_corpo_tamanho check (char_length(corpo) between 1 and 12000)
);

create table if not exists public.cartas_auditoria (
  id bigint generated always as identity primary key,
  tipo text not null,
  documento_id uuid references public.cartas_documentos(id) on delete set null,
  certificado_id uuid references public.cartas_certificados(id) on delete set null,
  auth_uid uuid not null,
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.cartas_certificados enable row level security;
alter table public.cartas_documentos enable row level security;
alter table public.cartas_auditoria enable row level security;

create policy cartas_certificados_select on public.cartas_certificados
  for select to authenticated using ((select public.app_tem_permissao('operacoes.cartas', 'view')));

create policy cartas_documentos_select on public.cartas_documentos
  for select to authenticated using ((select public.app_tem_permissao('operacoes.cartas', 'view')));
create policy cartas_documentos_insert on public.cartas_documentos
  for insert to authenticated with check (
    (select public.app_tem_permissao('operacoes.cartas', 'create'))
    and status = 'rascunho' and arquivo_path is null and assinado_em is null and certificado_id is null
  );
create policy cartas_documentos_update on public.cartas_documentos
  for update to authenticated using (
    status = 'rascunho' and (select public.app_tem_permissao('operacoes.cartas', 'update'))
  ) with check (
    status = 'rascunho' and (select public.app_tem_permissao('operacoes.cartas', 'update'))
  );
create policy cartas_documentos_delete on public.cartas_documentos
  for delete to authenticated using (
    status = 'rascunho' and (select public.app_tem_permissao('operacoes.cartas', 'delete'))
  );

create policy cartas_auditoria_select on public.cartas_auditoria
  for select to authenticated using ((select public.app_tem_permissao('operacoes.cartas', 'view')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cartas-private', 'cartas-private', false, 10485760, array['application/octet-stream', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['application/octet-stream', 'application/pdf'];

-- O bucket não recebe políticas para authenticated: só a Edge Function com service role o acessa.
revoke all on public.cartas_certificados, public.cartas_documentos, public.cartas_auditoria from anon;
grant select on public.cartas_certificados to authenticated;
grant select, insert, update, delete on public.cartas_documentos to authenticated;
grant select on public.cartas_auditoria to authenticated;
grant select, insert, update, delete on public.cartas_certificados, public.cartas_documentos to service_role;
grant insert, select on public.cartas_auditoria to service_role;
grant usage, select on sequence public.cartas_auditoria_id_seq to service_role;

commit;
