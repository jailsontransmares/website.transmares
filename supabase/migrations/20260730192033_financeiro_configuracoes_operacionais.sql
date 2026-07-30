-- Financeiro: habilita operacao controlada dos parametros do modulo.

grant insert, update on table public.fin_parametros to authenticated;

drop policy if exists fin_parametros_insert_configuracoes on public.fin_parametros;
create policy fin_parametros_insert_configuracoes
on public.fin_parametros
for insert
to authenticated
with check (
  status = 'ativo'
  and (select public.app_tem_permissao('financeiro.configuracoes', 'update'))
  and (
    empresa_id is null
    or empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  )
);

drop policy if exists fin_parametros_update_configuracoes on public.fin_parametros;
create policy fin_parametros_update_configuracoes
on public.fin_parametros
for update
to authenticated
using (
  status = 'ativo'
  and (select public.app_tem_permissao('financeiro.configuracoes', 'update'))
  and (
    empresa_id is null
    or empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  )
)
with check (
  status = 'ativo'
  and (select public.app_tem_permissao('financeiro.configuracoes', 'update'))
  and (
    empresa_id is null
    or empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  )
);
