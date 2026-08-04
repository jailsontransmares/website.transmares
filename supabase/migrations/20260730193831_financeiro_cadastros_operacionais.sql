-- Financeiro: alinha operacao dos cadastros com permissoes do Hub.

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_categorias_cadastro',
    'cad_pessoas',
    'cad_pessoa_classificacoes',
    'cad_pessoa_contatos',
    'cad_pessoa_enderecos',
    'cad_pessoa_documentos',
    'fin_contas',
    'fin_categorias',
    'fin_centros_custo',
    'fin_linhas_negocio',
    'fin_contratos'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_tabela || '_update_financeiro_cadastros', v_tabela);
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.cadastros'', ''update''))
          or (select public.app_tem_permissao(''financeiro.cadastros'', ''archive''))
          or (select public.app_tem_permissao(''financeiro.cadastros'', ''edit''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      ) with check (
        (
          (select public.app_tem_permissao(''financeiro.cadastros'', ''update''))
          or (select public.app_tem_permissao(''financeiro.cadastros'', ''archive''))
          or (select public.app_tem_permissao(''financeiro.cadastros'', ''edit''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_update_financeiro_cadastros',
      v_tabela
    );
  end loop;
end;
$$;
