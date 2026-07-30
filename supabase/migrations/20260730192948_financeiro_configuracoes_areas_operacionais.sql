-- Financeiro: habilita operacao das areas internas de configuracoes.

grant select, insert, update on table public.fin_alertas to authenticated;
grant select, insert, update on table public.fin_alerta_agendamentos to authenticated;
grant select, insert, update on table public.fin_backup_execucoes to authenticated;
grant select, insert, update on table public.fin_homologacao_ciclos to authenticated;
grant select, insert, update on table public.fin_homologacao_checklist to authenticated;
grant select, insert, update on table public.fin_homologacao_divergencias to authenticated;
grant select, insert, update on table public.fin_backup_restore_validacoes to authenticated;

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_alertas',
    'fin_alerta_agendamentos',
    'fin_backup_execucoes'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_tabela || '_select_financeiro_configuracoes_operacional', v_tabela);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.configuracoes'', ''view''))
          or (select public.app_tem_permissao(''financeiro.auditoria'', ''view''))
          or (select public.app_tem_permissao(''financeiro.complementares'', ''view''))
        )
        and (
          empresa_id is null
          or empresa_id in (
            select acesso.empresa_id
            from public.fin_usuario_empresas acesso
            where acesso.usuario_id = (select public.app_usuario_atual_id())
              and acesso.status = ''ativo''
          )
        )
      )',
      v_tabela || '_select_financeiro_configuracoes_operacional',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_insert_financeiro_configuracoes_operacional', v_tabela);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        (
          (select public.app_tem_permissao(''financeiro.configuracoes'', ''update''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and (
          empresa_id is null
          or empresa_id in (
            select acesso.empresa_id
            from public.fin_usuario_empresas acesso
            where acesso.usuario_id = (select public.app_usuario_atual_id())
              and acesso.status = ''ativo''
          )
        )
      )',
      v_tabela || '_insert_financeiro_configuracoes_operacional',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_update_financeiro_configuracoes_operacional', v_tabela);
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.configuracoes'', ''update''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and (
          empresa_id is null
          or empresa_id in (
            select acesso.empresa_id
            from public.fin_usuario_empresas acesso
            where acesso.usuario_id = (select public.app_usuario_atual_id())
              and acesso.status = ''ativo''
          )
        )
      ) with check (
        (
          (select public.app_tem_permissao(''financeiro.configuracoes'', ''update''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and (
          empresa_id is null
          or empresa_id in (
            select acesso.empresa_id
            from public.fin_usuario_empresas acesso
            where acesso.usuario_id = (select public.app_usuario_atual_id())
              and acesso.status = ''ativo''
          )
        )
      )',
      v_tabela || '_update_financeiro_configuracoes_operacional',
      v_tabela
    );
  end loop;
end;
$$;

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_homologacao_ciclos',
    'fin_homologacao_checklist',
    'fin_homologacao_divergencias',
    'fin_backup_restore_validacoes'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_tabela || '_select_financeiro_configuracoes_operacional', v_tabela);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.configuracoes'', ''view''))
          or (select public.app_tem_permissao(''financeiro.homologacao'', ''view''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_select_financeiro_configuracoes_operacional',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_insert_financeiro_configuracoes_operacional', v_tabela);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        (
          (select public.app_tem_permissao(''financeiro.configuracoes'', ''update''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_insert_financeiro_configuracoes_operacional',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_update_financeiro_configuracoes_operacional', v_tabela);
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.configuracoes'', ''update''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      ) with check (
        (
          (select public.app_tem_permissao(''financeiro.configuracoes'', ''update''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_update_financeiro_configuracoes_operacional',
      v_tabela
    );
  end loop;
end;
$$;
