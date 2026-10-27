begin;

create index if not exists simulador_saude_catalogo_historico_usuario_id_idx
  on public.simulador_saude_catalogo_historico (usuario_id);
create index if not exists simulador_saude_cotacao_versoes_usuario_id_idx
  on public.simulador_saude_cotacao_versoes (usuario_id);
create index if not exists simulador_saude_cotacoes_updated_by_idx
  on public.simulador_saude_cotacoes (updated_by);
create index if not exists simulador_saude_operadoras_created_by_idx
  on public.simulador_saude_operadoras (created_by);
create index if not exists simulador_saude_operadoras_updated_by_idx
  on public.simulador_saude_operadoras (updated_by);
create index if not exists simulador_saude_planos_created_by_idx
  on public.simulador_saude_planos (created_by);
create index if not exists simulador_saude_planos_updated_by_idx
  on public.simulador_saude_planos (updated_by);
create index if not exists simulador_saude_precos_faixa_created_by_idx
  on public.simulador_saude_precos_faixa (created_by);
create index if not exists simulador_saude_precos_faixa_updated_by_idx
  on public.simulador_saude_precos_faixa (updated_by);
create index if not exists simulador_saude_tabelas_precos_created_by_idx
  on public.simulador_saude_tabelas_precos (created_by);
create index if not exists simulador_saude_tabelas_precos_updated_by_idx
  on public.simulador_saude_tabelas_precos (updated_by);

create or replace function public.simulador_saude_dados_corretora()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_dados jsonb;
begin
  if auth.uid() is null or not public.app_tem_permissao('simulador_saude', 'view') then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'razao_social', config.razao_social,
    'nome_fantasia', config.nome_fantasia,
    'cnpj', config.cnpj,
    'inscricao_estadual', config.inscricao_estadual,
    'susep', config.susep,
    'email', config.email,
    'telefone', config.telefone,
    'whatsapp', config.whatsapp,
    'site', config.site,
    'endereco_logradouro', config.endereco_logradouro,
    'endereco_numero', config.endereco_numero,
    'endereco_complemento', config.endereco_complemento,
    'endereco_bairro', config.endereco_bairro,
    'endereco_cidade', config.endereco_cidade,
    'endereco_uf', config.endereco_uf,
    'endereco_cep', config.endereco_cep,
    'logo_url', config.logo_url
  )
  into v_dados
  from public.corretora_configuracoes config
  where config.status = 'ativo'
  order by config.updated_at desc nulls last, config.created_at desc nulls last
  limit 1;

  return coalesce(v_dados, '{}'::jsonb);
end;
$$;

revoke all on function public.simulador_saude_dados_corretora() from public, anon;
grant execute on function public.simulador_saude_dados_corretora() to authenticated;

commit;
