create table if not exists public.fin_cobranca_itens_estado (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete cascade,
  parcela_id uuid,
  cobranca_id uuid references public.fin_cobrancas(id) on delete cascade,
  estado text not null check (estado in ('arquivada', 'excluida')),
  updated_by uuid references public.usuarios(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint fin_cobranca_itens_estado_alvo_check check ((parcela_id is null) <> (cobranca_id is null)),
  constraint fin_cobranca_itens_estado_parcela_empresa_fkey foreign key (parcela_id, empresa_id)
    references public.fin_lancamento_parcelas(id, empresa_id) on delete cascade,
  constraint fin_cobranca_itens_estado_parcela_unique unique (empresa_id, parcela_id),
  constraint fin_cobranca_itens_estado_cobranca_unique unique (empresa_id, cobranca_id)
);

alter table public.fin_cobranca_itens_estado enable row level security;
grant select, insert, update on public.fin_cobranca_itens_estado to authenticated;

create policy fin_cobranca_itens_estado_select on public.fin_cobranca_itens_estado
for select to authenticated using (
  (select public.app_tem_permissao('financeiro.lancamentos', 'view'))
  and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = (select public.app_usuario_atual_id()) and acesso.status = 'ativo')
);

create policy fin_cobranca_itens_estado_insert on public.fin_cobranca_itens_estado
for insert to authenticated with check (
  (select public.app_tem_permissao('financeiro.lancamentos', 'update'))
  and updated_by = (select public.app_usuario_atual_id())
  and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = (select public.app_usuario_atual_id()) and acesso.status = 'ativo')
);

create policy fin_cobranca_itens_estado_update on public.fin_cobranca_itens_estado
for update to authenticated using (
  (select public.app_tem_permissao('financeiro.lancamentos', 'update'))
  and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = (select public.app_usuario_atual_id()) and acesso.status = 'ativo')
) with check (
  (select public.app_tem_permissao('financeiro.lancamentos', 'update'))
  and updated_by = (select public.app_usuario_atual_id())
  and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = (select public.app_usuario_atual_id()) and acesso.status = 'ativo')
);
