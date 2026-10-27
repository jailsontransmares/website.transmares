begin;

grant delete on table public.simulador_saude_tabelas_precos to authenticated;
grant delete on table public.simulador_saude_precos_faixa to authenticated;

drop policy if exists simulador_saude_tabelas_precos_delete on public.simulador_saude_tabelas_precos;
create policy simulador_saude_tabelas_precos_delete on public.simulador_saude_tabelas_precos
  for delete to authenticated
  using ((select public.app_tem_permissao('simulador_saude.catalogo', 'delete')));

drop policy if exists simulador_saude_precos_faixa_delete on public.simulador_saude_precos_faixa;
create policy simulador_saude_precos_faixa_delete on public.simulador_saude_precos_faixa
  for delete to authenticated
  using (
    (select public.app_tem_permissao('simulador_saude.catalogo', 'delete'))
    and exists (
      select 1
      from public.simulador_saude_tabelas_precos tabela
      where tabela.id = tabela_preco_id
    )
  );

create or replace function public.simulador_saude_excluir_tabela(p_tabela_preco_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if not public.app_tem_permissao('simulador_saude.catalogo', 'delete') then
    raise exception 'Permissão insuficiente para excluir tabelas do catálogo.';
  end if;

  update public.simulador_saude_tabelas_precos
  set status = 'em_revisao'
  where id = p_tabela_preco_id
    and status = 'vigente';

  delete from public.simulador_saude_precos_faixa
  where tabela_preco_id = p_tabela_preco_id;

  delete from public.simulador_saude_tabelas_precos
  where id = p_tabela_preco_id;

  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'Tabela não encontrada ou sem permissão para excluir.';
  end if;

  return true;
end;
$$;

revoke all on function public.simulador_saude_excluir_tabela(uuid) from public, anon;
grant execute on function public.simulador_saude_excluir_tabela(uuid) to authenticated;

with perfil_admin as (
  select id from public.perfis where slug = 'admin'
), recurso as (
  select chave from public.recursos_acesso where chave = 'simulador_saude.catalogo'
)
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil.id, recurso.chave, 'delete', true
from perfil_admin perfil
cross join recurso
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = excluded.permitido;

commit;
