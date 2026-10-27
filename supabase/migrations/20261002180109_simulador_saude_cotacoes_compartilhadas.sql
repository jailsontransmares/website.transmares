begin;

-- All users who can access the health simulator may view every saved quote.
-- Writes remain owner-only under the existing UPDATE policy.
drop policy if exists simulador_saude_cotacoes_select on public.simulador_saude_cotacoes;
create policy simulador_saude_cotacoes_select on public.simulador_saude_cotacoes
  for select to authenticated
  using ((select public.app_tem_permissao('simulador_saude', 'view')));

commit;
