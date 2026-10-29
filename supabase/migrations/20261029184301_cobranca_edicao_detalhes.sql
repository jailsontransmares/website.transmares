grant update on table public.fin_cobrancas to authenticated;

create policy fin_cobrancas_update on public.fin_cobrancas for update to authenticated
using (
  (select public.app_tem_permissao('financeiro.lancamentos', 'update'))
  and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = (select public.app_usuario_atual_id()) and acesso.status = 'ativo')
)
with check (
  (select public.app_tem_permissao('financeiro.lancamentos', 'update'))
  and empresa_id in (select acesso.empresa_id from public.fin_usuario_empresas acesso where acesso.usuario_id = (select public.app_usuario_atual_id()) and acesso.status = 'ativo')
);
