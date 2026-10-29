create table if not exists public.fin_cobrancas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete cascade,
  cliente_nome text not null,
  produto text not null,
  descricao text not null,
  data_vencimento date not null,
  status text not null default 'aberta',
  responsavel_id uuid references public.usuarios(id) on delete set null,
  responsavel_nome text not null,
  created_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_cobrancas_produto_check check (produto in ('AUTO','RESIDENCIA','CONDOMINIO','EMPRESARIAL','VIDA','PREVIDENCIA','CONSÓRCIO')),
  constraint fin_cobrancas_status_check check (status in ('aberta','em_negociacao','concluida','cancelada')),
  constraint fin_cobrancas_cliente_check check (length(btrim(cliente_nome)) > 0),
  constraint fin_cobrancas_descricao_check check (length(btrim(descricao)) > 0)
);

create index if not exists fin_cobrancas_empresa_vencimento_idx on public.fin_cobrancas (empresa_id, data_vencimento);
create index if not exists fin_cobrancas_empresa_responsavel_idx on public.fin_cobrancas (empresa_id, responsavel_id);

alter table public.fin_cobrancas enable row level security;
grant select, insert on table public.fin_cobrancas to authenticated;

create policy fin_cobrancas_select on public.fin_cobrancas for select to authenticated using (
  (select public.app_tem_permissao('financeiro.lancamentos', 'view'))
  and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = (select public.app_usuario_atual_id()) and acesso.status = 'ativo')
);
create policy fin_cobrancas_insert on public.fin_cobrancas for insert to authenticated with check (
  (select public.app_tem_permissao('financeiro.lancamentos', 'create'))
  and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = (select public.app_usuario_atual_id()) and acesso.status = 'ativo')
  and created_by = (select public.app_usuario_atual_id())
);

alter table public.fin_cobranca_interacoes alter column parcela_id drop not null;
alter table public.fin_cobranca_interacoes add column if not exists cobranca_id uuid references public.fin_cobrancas(id) on delete cascade;
alter table public.fin_cobranca_interacoes drop constraint if exists fin_cobranca_interacoes_parcela_empresa_fkey;
alter table public.fin_cobranca_interacoes add constraint fin_cobranca_interacoes_parcela_empresa_fkey
  foreign key (parcela_id, empresa_id) references public.fin_lancamento_parcelas(id, empresa_id) on delete cascade;
alter table public.fin_cobranca_interacoes add constraint fin_cobranca_interacoes_alvo_check check (parcela_id is not null or cobranca_id is not null);
create index if not exists fin_cobranca_interacoes_cobranca_data_idx on public.fin_cobranca_interacoes (empresa_id, cobranca_id, created_at desc);
