begin;

alter table public.simulador_saude_cotacoes
  add column if not exists status_anterior text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'simulador_saude_cotacoes_status_anterior_check'
  ) then
    alter table public.simulador_saude_cotacoes
      add constraint simulador_saude_cotacoes_status_anterior_check
      check (status_anterior is null or status_anterior in ('rascunho', 'proposta'));
  end if;
end;
$$;

create or replace function private.simulador_saude_preparar_cotacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := public.app_usuario_atual_id();
    new.updated_by := public.app_usuario_atual_id();
    new.created_at := now();
    new.status_anterior := null;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := public.app_usuario_atual_id();

    if new.status = 'arquivada' and old.status <> 'arquivada' then
      new.status_anterior := old.status;
    elsif old.status = 'arquivada' and new.status = 'rascunho' then
      new.status := coalesce(old.status_anterior, 'rascunho');
      new.status_anterior := null;
    elsif new.status <> 'arquivada' then
      new.status_anterior := null;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.simulador_saude_preparar_cotacao() from public, anon, authenticated;

-- Excluir cotação exige permissão específica; por padrão, apenas administradores recebem essa ação.
with perfil_admin as (
  select id from public.perfis where slug = 'admin'
), recurso as (
  select chave from public.recursos_acesso where chave = 'simulador_saude'
)
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil.id, recurso.chave, 'delete', true
from perfil_admin perfil
cross join recurso
on conflict (perfil_id, recurso_chave, acao) do nothing;

create or replace function public.simulador_saude_excluir_cotacao(p_cotacao_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.app_tem_permissao('simulador_saude', 'delete') then
    raise exception 'Você não tem permissão para excluir cotações.' using errcode = '42501';
  end if;

  delete from public.simulador_saude_cotacao_versoes
  where cotacao_id = p_cotacao_id;

  delete from public.simulador_saude_cotacoes
  where id = p_cotacao_id;

  if not found then
    raise exception 'Cotação não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.simulador_saude_excluir_cotacao(uuid) from public, anon;
grant execute on function public.simulador_saude_excluir_cotacao(uuid) to authenticated;

commit;
