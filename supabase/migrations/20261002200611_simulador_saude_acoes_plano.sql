begin;

grant delete on table public.simulador_saude_planos to authenticated;

drop policy if exists simulador_saude_planos_delete on public.simulador_saude_planos;
create policy simulador_saude_planos_delete on public.simulador_saude_planos
  for delete to authenticated
  using ((select public.app_tem_permissao('simulador_saude.catalogo', 'delete')));

create or replace function public.simulador_saude_excluir_plano(p_plano_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if not public.app_tem_permissao('simulador_saude.catalogo', 'delete') then
    raise exception 'Permissão insuficiente para excluir planos do catálogo.';
  end if;

  if exists (
    select 1 from public.simulador_saude_tabelas_precos
    where plano_id = p_plano_id
  ) then
    raise exception 'Este plano possui tabelas de preços associadas. Inative-o para preservar o histórico.';
  end if;

  delete from public.simulador_saude_planos where id = p_plano_id;
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'Plano não encontrado ou sem permissão para excluir.';
  end if;

  return true;
end;
$$;

revoke all on function public.simulador_saude_excluir_plano(uuid) from public, anon;
grant execute on function public.simulador_saude_excluir_plano(uuid) to authenticated;

commit;
