-- Expõe as rotas navegáveis de Operações > Corretora na configuração de módulos.
-- As permissões de cada tela continuam sendo verificadas pelos recursos existentes.
insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status, exibir_home)
values
  ('operacoes.corretora.visao_geral', 'Visão geral', 'aba', null, '/operacoes/corretora', 131, 'ativo', true),
  ('operacoes.corretora.consultoria_360', 'Consultoria 360°', 'aba', null, '/operacoes/corretora/consultoria-360', 132, 'ativo', true),
  ('operacoes.corretora.simulador_saude', 'Simulador - Saúde', 'aba', null, '/operacoes/corretora/simulador-saude', 133, 'ativo', true)
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    recurso_pai = excluded.recurso_pai,
    rota = excluded.rota,
    ordem = excluded.ordem,
    updated_at = now();

-- Inclui as três rotas novas e o catálogo já cadastrado do simulador na allowlist.
drop policy if exists recursos_acesso_update_operacoes_corretora_home
  on public.recursos_acesso;

create policy recursos_acesso_update_operacoes_corretora_home
  on public.recursos_acesso
  for update to authenticated
  using (
    tipo = 'aba'
    and chave = any (array[
      'operacoes.corretora.visao_geral',
      'operacoes.corretora.consultoria_360',
      'operacoes.corretora.simulador_saude',
      'simulador_saude.catalogo'
    ]::text[])
    and public.app_tem_permissao('admin.modulos', 'update')
  )
  with check (
    tipo = 'aba'
    and chave = any (array[
      'operacoes.corretora.visao_geral',
      'operacoes.corretora.consultoria_360',
      'operacoes.corretora.simulador_saude',
      'simulador_saude.catalogo'
    ]::text[])
    and public.app_tem_permissao('admin.modulos', 'update')
  );
