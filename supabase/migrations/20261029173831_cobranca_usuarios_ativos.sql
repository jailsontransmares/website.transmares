alter table public.fin_cobranca_interacoes
  add column if not exists responsavel_id uuid references public.usuarios(id) on delete set null,
  add column if not exists responsavel_nome text;

create or replace function public.listar_usuarios_ativos_cobranca()
returns table(id uuid, nome text)
language sql stable security definer
set search_path = ''
as $$
  select u.id, u.nome
  from public.usuarios u
  where u.status = 'ativo'
    and (select public.app_usuario_atual_id()) is not null
    and (select public.app_tem_permissao('financeiro.lancamentos', 'view'))
  order by u.nome;
$$;

revoke all on function public.listar_usuarios_ativos_cobranca() from public, anon;
grant execute on function public.listar_usuarios_ativos_cobranca() to authenticated;

drop policy if exists fin_cobranca_interacoes_insert on public.fin_cobranca_interacoes;
create policy fin_cobranca_interacoes_insert on public.fin_cobranca_interacoes
for insert to authenticated with check (
  ((select public.app_tem_permissao('financeiro.lancamentos', 'update'))
   or (select public.app_tem_permissao('financeiro.lancamentos', 'create')))
  and usuario_id = (select public.app_usuario_atual_id())
  and empresa_id in (
    select acesso.empresa_id from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id()) and acesso.status = 'ativo'
  )
);
