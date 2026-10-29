-- Operações / Cobrança: histórico imutável das interações por parcela a receber.
create table if not exists public.fin_cobranca_interacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete cascade,
  parcela_id uuid not null,
  tipo text not null,
  anotacao text not null,
  resultado text,
  proxima_acao_em date,
  usuario_id uuid references public.usuarios(id) on delete set null,
  usuario_nome text not null,
  created_at timestamptz not null default now(),
  constraint fin_cobranca_interacoes_parcela_empresa_fkey
    foreign key (parcela_id, empresa_id)
    references public.fin_lancamento_parcelas(id, empresa_id)
    on delete cascade,
  constraint fin_cobranca_interacoes_tipo_check
    check (tipo in ('contato', 'comentario', 'agendamento', 'cobranca_enviada')),
  constraint fin_cobranca_interacoes_resultado_check
    check (resultado is null or resultado in ('aguardando_retorno', 'em_negociacao', 'promessa_pagamento')),
  constraint fin_cobranca_interacoes_anotacao_check
    check (length(btrim(anotacao)) > 0)
);

create index if not exists fin_cobranca_interacoes_empresa_parcela_data_idx
  on public.fin_cobranca_interacoes (empresa_id, parcela_id, created_at desc);
create index if not exists fin_cobranca_interacoes_proxima_acao_idx
  on public.fin_cobranca_interacoes (empresa_id, proxima_acao_em)
  where proxima_acao_em is not null;

alter table public.fin_cobranca_interacoes enable row level security;
grant select, insert on table public.fin_cobranca_interacoes to authenticated;

drop policy if exists fin_cobranca_interacoes_select on public.fin_cobranca_interacoes;
create policy fin_cobranca_interacoes_select
  on public.fin_cobranca_interacoes
  for select to authenticated
  using (
    (select public.app_tem_permissao('financeiro.lancamentos', 'view'))
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  );

drop policy if exists fin_cobranca_interacoes_insert on public.fin_cobranca_interacoes;
create policy fin_cobranca_interacoes_insert
  on public.fin_cobranca_interacoes
  for insert to authenticated
  with check (
    (select public.app_tem_permissao('financeiro.lancamentos', 'update'))
    and usuario_id = (select public.app_usuario_atual_id())
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  );
