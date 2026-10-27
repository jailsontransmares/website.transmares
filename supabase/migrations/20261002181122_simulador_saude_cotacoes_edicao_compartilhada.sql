begin;

-- Any user allowed to view the health simulator may update any saved quote.
-- The trigger on the table continues to preserve created_by and records updated_by.
drop policy if exists simulador_saude_cotacoes_update on public.simulador_saude_cotacoes;
create policy simulador_saude_cotacoes_update on public.simulador_saude_cotacoes
  for update to authenticated
  using ((select public.app_tem_permissao('simulador_saude', 'view')))
  with check ((select public.app_tem_permissao('simulador_saude', 'view')));

commit;
