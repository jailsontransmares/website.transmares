-- Ajusta as politicas da conciliacao para as acoes reais cadastradas no Hub.
-- Permissoes atuais: view, importar, reconcile, unreconcile.

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_extrato_importacoes',
    'fin_movimentos_bancarios',
    'fin_conciliacao_sugestoes',
    'fin_conciliacoes'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_tabela || '_insert_financeiro_conciliacao', v_tabela);
    execute format('drop policy if exists %I on public.%I', v_tabela || '_update_financeiro_conciliacao', v_tabela);
  end loop;
end;
$$;

create policy fin_extrato_importacoes_insert_financeiro_conciliacao
  on public.fin_extrato_importacoes
  for insert
  to authenticated
  with check (
    (select public.app_tem_permissao('financeiro.conciliacao', 'importar'))
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  );

create policy fin_extrato_importacoes_update_financeiro_conciliacao
  on public.fin_extrato_importacoes
  for update
  to authenticated
  using (
    (
      (select public.app_tem_permissao('financeiro.conciliacao', 'importar'))
      or (select public.app_tem_permissao('financeiro.conciliacao', 'reconcile'))
      or (select public.app_tem_permissao('financeiro.conciliacao', 'unreconcile'))
    )
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  )
  with check (
    (
      (select public.app_tem_permissao('financeiro.conciliacao', 'importar'))
      or (select public.app_tem_permissao('financeiro.conciliacao', 'reconcile'))
      or (select public.app_tem_permissao('financeiro.conciliacao', 'unreconcile'))
    )
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  );

create policy fin_movimentos_bancarios_insert_financeiro_conciliacao
  on public.fin_movimentos_bancarios
  for insert
  to authenticated
  with check (
    (select public.app_tem_permissao('financeiro.conciliacao', 'importar'))
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  );

create policy fin_movimentos_bancarios_update_financeiro_conciliacao
  on public.fin_movimentos_bancarios
  for update
  to authenticated
  using (
    (
      (select public.app_tem_permissao('financeiro.conciliacao', 'importar'))
      or (select public.app_tem_permissao('financeiro.conciliacao', 'reconcile'))
      or (select public.app_tem_permissao('financeiro.conciliacao', 'unreconcile'))
    )
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  )
  with check (
    (
      (select public.app_tem_permissao('financeiro.conciliacao', 'importar'))
      or (select public.app_tem_permissao('financeiro.conciliacao', 'reconcile'))
      or (select public.app_tem_permissao('financeiro.conciliacao', 'unreconcile'))
    )
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  );

create policy fin_conciliacao_sugestoes_insert_financeiro_conciliacao
  on public.fin_conciliacao_sugestoes
  for insert
  to authenticated
  with check (
    (select public.app_tem_permissao('financeiro.conciliacao', 'reconcile'))
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  );

create policy fin_conciliacao_sugestoes_update_financeiro_conciliacao
  on public.fin_conciliacao_sugestoes
  for update
  to authenticated
  using (
    (
      (select public.app_tem_permissao('financeiro.conciliacao', 'reconcile'))
      or (select public.app_tem_permissao('financeiro.conciliacao', 'unreconcile'))
    )
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  )
  with check (
    (
      (select public.app_tem_permissao('financeiro.conciliacao', 'reconcile'))
      or (select public.app_tem_permissao('financeiro.conciliacao', 'unreconcile'))
    )
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  );

create policy fin_conciliacoes_insert_financeiro_conciliacao
  on public.fin_conciliacoes
  for insert
  to authenticated
  with check (
    (select public.app_tem_permissao('financeiro.conciliacao', 'reconcile'))
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  );

create policy fin_conciliacoes_update_financeiro_conciliacao
  on public.fin_conciliacoes
  for update
  to authenticated
  using (
    (
      (select public.app_tem_permissao('financeiro.conciliacao', 'reconcile'))
      or (select public.app_tem_permissao('financeiro.conciliacao', 'unreconcile'))
    )
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  )
  with check (
    (
      (select public.app_tem_permissao('financeiro.conciliacao', 'reconcile'))
      or (select public.app_tem_permissao('financeiro.conciliacao', 'unreconcile'))
    )
    and empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  );
