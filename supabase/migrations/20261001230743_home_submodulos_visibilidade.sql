alter table public.recursos_acesso
  add column if not exists exibir_home boolean not null default true;

-- Registra páginas e abas navegáveis vinculadas a cada módulo da Home.
-- As permissões individuais continuam sendo avaliadas pelo recurso já usado
-- pela tela; o status abaixo controla a disponibilidade global do submódulo.
insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status, exibir_home)
values
  ('painel_ar.inicio', 'Início', 'aba', 'painel_ar', '/painel-ar#inicio', 10, 'ativo', true),
  ('painel_ar.crm2.cadastro_pf', 'Pessoa Física', 'aba', 'painel_ar.crm_2', '/painel-ar/201', 17, 'ativo', true),
  ('painel_ar.crm2.cadastro_pj', 'Pessoa Jurídica', 'aba', 'painel_ar.crm_2', '/painel-ar/202', 18, 'ativo', true),
  ('painel_ar.crm2.vinculos', 'Vínculos', 'aba', 'painel_ar.crm_2', '/painel-ar/203', 19, 'ativo', true),
  ('painel_ar.crm2.pedidos', 'Pedidos', 'aba', 'painel_ar.crm_2', '/painel-ar/204', 20, 'ativo', true),
  ('painel_ar.crm2.oportunidades', 'Oportunidades', 'aba', 'painel_ar.crm_2', '/painel-ar/205', 21, 'ativo', true),
  ('painel_ar.crm2.comunicacao', 'Comunicação', 'aba', 'painel_ar.crm_2', '/painel-ar/206', 22, 'ativo', true),
  ('painel_ar.crm2.automacoes', 'Automações', 'aba', 'painel_ar.crm_2', '/painel-ar/207', 23, 'ativo', true),
  ('painel_ar.historico', 'Histórico', 'aba', 'painel_ar', '/painel-ar#historico', 24, 'ativo', true),
  ('central_senhas.acessos', 'Senhas Salvas', 'aba', 'central_senhas', '/central-senhas/acessos', 21, 'ativo', true),
  ('central_senhas.links', 'Links Úteis', 'aba', 'central_senhas', '/central-senhas/links', 22, 'ativo', true),
  ('central_senhas.links_corretora', 'Corretora', 'aba', 'central_senhas.links', '/central-senhas/links/corretora', 23, 'ativo', true),
  ('central_senhas.links_ar', 'AR', 'aba', 'central_senhas.links', '/central-senhas/links/ar', 24, 'ativo', true),
  ('central_senhas.links_gestao', 'Gestão', 'aba', 'central_senhas.links', '/central-senhas/links/gestao', 25, 'ativo', true),
  ('admin.sistema.corretora', 'Configurações da Corretora', 'aba', 'admin', '/configuracoes/corretora', 96, 'ativo', true),
  ('admin.limites', 'Limites', 'aba', 'admin', '/admin/parametros/limites', 97, 'ativo', true),
  ('admin.categorias', 'Categorias', 'aba', 'admin', '/admin/cadastros/categorias', 98, 'ativo', true),
  ('admin.grupos', 'Grupos', 'aba', 'admin', '/admin/cadastros/grupos', 99, 'ativo', true),
  ('home.financeiro.lancamentos.titulos', 'Títulos', 'aba', 'financeiro.lancamentos', '/financeiro/lancamentos/titulos', 101, 'ativo', true),
  ('home.financeiro.lancamentos.receber', 'A receber', 'aba', 'financeiro.lancamentos', '/financeiro/lancamentos/receber', 102, 'ativo', true),
  ('home.financeiro.lancamentos.pagar', 'A pagar', 'aba', 'financeiro.lancamentos', '/financeiro/lancamentos/pagar', 103, 'ativo', true),
  ('home.financeiro.lancamentos.parcelas', 'Parcelas', 'aba', 'financeiro.lancamentos', '/financeiro/lancamentos/parcelas', 104, 'ativo', true),
  ('home.financeiro.lancamentos.recorrentes', 'Recorrências', 'aba', 'financeiro.lancamentos', '/financeiro/lancamentos/recorrentes', 105, 'ativo', true),
  ('home.financeiro.lancamentos.rateios', 'Rateios', 'aba', 'financeiro.lancamentos', '/financeiro/lancamentos/rateios', 106, 'ativo', true),
  ('home.financeiro.lancamentos.baixas', 'Baixas', 'aba', 'financeiro.lancamentos', '/financeiro/lancamentos/baixas', 107, 'ativo', true),
  ('home.financeiro.cadastros.pessoas', 'Pessoas', 'aba', 'financeiro.cadastros', '/financeiro/cadastros/pessoas', 111, 'ativo', true),
  ('home.financeiro.cadastros.contas', 'Contas', 'aba', 'financeiro.cadastros', '/financeiro/cadastros/contas', 112, 'ativo', true),
  ('home.financeiro.cadastros.categorias', 'Categorias', 'aba', 'financeiro.cadastros', '/financeiro/cadastros/categorias', 113, 'ativo', true),
  ('home.financeiro.cadastros.centros_custo', 'Centros de Custo', 'aba', 'financeiro.cadastros', '/financeiro/cadastros/centros-custo', 114, 'ativo', true),
  ('home.financeiro.cadastros.linhas_negocio', 'Linhas de Negócio', 'aba', 'financeiro.cadastros', '/financeiro/cadastros/linhas-negocio', 115, 'ativo', true),
  ('home.financeiro.cadastros.contratos', 'Contratos', 'aba', 'financeiro.cadastros', '/financeiro/cadastros/contratos', 116, 'ativo', true),
  ('home.financeiro.configuracoes.parametros', 'Parâmetros', 'aba', 'financeiro.configuracoes', '/financeiro/configuracoes/parametros', 121, 'ativo', true),
  ('home.financeiro.configuracoes.alertas', 'Alertas', 'aba', 'financeiro.configuracoes', '/financeiro/configuracoes/alertas', 122, 'ativo', true),
  ('home.financeiro.configuracoes.backups', 'Backups', 'aba', 'financeiro.configuracoes', '/financeiro/configuracoes/backups', 123, 'ativo', true),
  ('home.financeiro.configuracoes.auditoria', 'Auditoria', 'aba', 'financeiro.configuracoes', '/financeiro/configuracoes/auditoria', 124, 'ativo', true),
  ('home.financeiro.configuracoes.homologacao', 'Homologação', 'aba', 'financeiro.configuracoes', '/financeiro/configuracoes/homologacao', 125, 'ativo', true)
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    recurso_pai = excluded.recurso_pai,
    rota = excluded.rota,
    ordem = excluded.ordem,
    updated_at = now();

-- Keep existing resource status intact on re-run while adding settings access.
grant update (status, exibir_home) on public.recursos_acesso to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'recursos_acesso'
      and policyname = 'recursos_acesso_update_admin_module_settings'
  ) then
    create policy recursos_acesso_update_admin_module_settings
      on public.recursos_acesso
      for update to authenticated
      using (
        tipo <> 'modulo'
        and public.app_tem_permissao('admin.modulos', 'update')
      )
      with check (
        tipo <> 'modulo'
        and public.app_tem_permissao('admin.modulos', 'update')
      );
  end if;
end;
$$;
