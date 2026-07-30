-- Financeiro: alinha policies operacionais de lancamentos com as acoes usadas pelo Hub.

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_lancamentos',
    'fin_lancamento_parcelas',
    'fin_lancamento_rateios',
    'fin_lancamento_baixas',
    'fin_lancamento_status_historico',
    'fin_lancamento_recorrencias'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_tabela || '_update_financeiro_lancamentos', v_tabela);
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.lancamentos'', ''update''))
          or (select public.app_tem_permissao(''financeiro.lancamentos'', ''settle''))
          or (select public.app_tem_permissao(''financeiro.lancamentos'', ''cancel''))
          or (select public.app_tem_permissao(''financeiro.lancamentos'', ''edit''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      ) with check (
        (
          (select public.app_tem_permissao(''financeiro.lancamentos'', ''update''))
          or (select public.app_tem_permissao(''financeiro.lancamentos'', ''settle''))
          or (select public.app_tem_permissao(''financeiro.lancamentos'', ''cancel''))
          or (select public.app_tem_permissao(''financeiro.lancamentos'', ''edit''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_update_financeiro_lancamentos',
      v_tabela
    );
  end loop;
end;
$$;
