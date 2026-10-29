grant delete on table public.fin_cobrancas to authenticated;

create policy fin_cobrancas_delete on public.fin_cobrancas for delete to authenticated using (
  (select public.app_tem_permissao('financeiro.lancamentos', 'delete'))
  and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = (select public.app_usuario_atual_id()) and acesso.status = 'ativo')
);
