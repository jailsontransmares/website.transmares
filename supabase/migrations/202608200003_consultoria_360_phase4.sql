begin;

-- A Fase 4 ainda não duplica o funil geral do CRM: estas tabelas guardam
-- somente o estado consultivo específico do atendimento 360°.
create table if not exists public.consultoria_360_oportunidades (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references public.consultoria_360_atendimentos(id) on delete cascade,
  pilar text not null,
  score numeric(5,2),
  status text not null default 'Acompanhar',
  ativa boolean not null default true,
  proxima_acao text,
  proxima_acao_em date,
  responsavel_usuario_id uuid references public.usuarios(id) on delete set null,
  created_by uuid not null default public.app_usuario_atual_id() references public.usuarios(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consultoria_360_oportunidades_pilar_check check (pilar in ('protecao', 'saude', 'patrimonio')),
  constraint consultoria_360_oportunidades_status_check check (status in ('Prioridade atual', 'Planejar', 'Acompanhar', 'Sem necessidade atual', 'Proposta em elaboração', 'Em negociação', 'Contratado')),
  constraint consultoria_360_oportunidades_atendimento_pilar_key unique (atendimento_id, pilar)
);

create index if not exists consultoria_360_oportunidades_status_idx
  on public.consultoria_360_oportunidades (status, ativa, proxima_acao_em);

create table if not exists public.consultoria_360_eventos (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references public.consultoria_360_atendimentos(id) on delete cascade,
  tipo text not null,
  descricao text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null default public.app_usuario_atual_id() references public.usuarios(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists consultoria_360_eventos_atendimento_idx
  on public.consultoria_360_eventos (atendimento_id, created_at desc);

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array['consultoria_360_oportunidades', 'consultoria_360_eventos']
  loop
    execute format('alter table public.%I enable row level security', v_tabela);
    execute format('revoke all on table public.%I from anon', v_tabela);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', v_tabela);
  end loop;
end;
$$;

drop policy if exists consultoria_360_oportunidades_select on public.consultoria_360_oportunidades;
create policy consultoria_360_oportunidades_select on public.consultoria_360_oportunidades
  for select to authenticated using (
    public.app_tem_permissao('consultoria_360', 'view')
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  );

drop policy if exists consultoria_360_oportunidades_write on public.consultoria_360_oportunidades;
create policy consultoria_360_oportunidades_write on public.consultoria_360_oportunidades
  for all to authenticated
  using (
    (public.app_tem_permissao('consultoria_360', 'create') or public.app_tem_permissao('consultoria_360', 'update'))
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  )
  with check (
    (public.app_tem_permissao('consultoria_360', 'create') or public.app_tem_permissao('consultoria_360', 'update'))
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  );

drop policy if exists consultoria_360_eventos_select on public.consultoria_360_eventos;
create policy consultoria_360_eventos_select on public.consultoria_360_eventos
  for select to authenticated using (
    public.app_tem_permissao('consultoria_360', 'view')
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  );

drop policy if exists consultoria_360_eventos_insert on public.consultoria_360_eventos;
create policy consultoria_360_eventos_insert on public.consultoria_360_eventos
  for insert to authenticated with check (
    (public.app_tem_permissao('consultoria_360', 'create') or public.app_tem_permissao('consultoria_360', 'update'))
    and created_by = public.app_usuario_atual_id()
    and exists (select 1 from public.consultoria_360_atendimentos atendimento where atendimento.id = atendimento_id)
  );

commit;
