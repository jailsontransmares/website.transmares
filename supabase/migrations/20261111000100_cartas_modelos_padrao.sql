begin;

alter table public.corretora_configuracoes add column if not exists slogan text;

create table if not exists public.cartas_modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo_seguro text not null check (tipo_seguro in ('Seguro Auto', 'Seguro Condominial', 'Seguro Empresarial', 'Seguro Residencial')),
  corpo text not null,
  ativo boolean not null default true,
  created_by uuid references public.usuarios(id) on delete set null default public.app_usuario_atual_id(),
  updated_by uuid references public.usuarios(id) on delete set null default public.app_usuario_atual_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cartas_modelos_nome_tamanho check (char_length(nome) between 1 and 160),
  constraint cartas_modelos_corpo_tamanho check (char_length(corpo) between 1 and 12000)
);

alter table public.cartas_modelos enable row level security;
create policy cartas_modelos_select on public.cartas_modelos
  for select to authenticated using ((select public.app_tem_permissao('operacoes.cartas', 'view')));
create policy cartas_modelos_insert on public.cartas_modelos
  for insert to authenticated with check ((select public.app_tem_permissao('operacoes.cartas', 'create')));
create policy cartas_modelos_update on public.cartas_modelos
  for update to authenticated using ((select public.app_tem_permissao('operacoes.cartas', 'update')))
  with check ((select public.app_tem_permissao('operacoes.cartas', 'update')));
create policy cartas_modelos_delete on public.cartas_modelos
  for delete to authenticated using ((select public.app_tem_permissao('operacoes.cartas', 'delete')));

revoke all on public.cartas_modelos from anon;
grant select, insert, update, delete on public.cartas_modelos to authenticated;
grant select, insert, update, delete on public.cartas_modelos to service_role;

commit;
