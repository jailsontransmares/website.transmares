-- Financeiro / Fase 1: dados iniciais separados da estrutura.
insert into public.fin_empresas (
  codigo,
  razao_social,
  nome_fantasia,
  cnpj,
  origem,
  status
)
select
  'transmares',
  coalesce(nullif(trim(c.razao_social), ''), nullif(trim(c.nome_fantasia), ''), 'Transmares Corretora de Seguros'),
  coalesce(nullif(trim(c.nome_fantasia), ''), 'Transmares'),
  case
    when length(regexp_replace(coalesce(c.cnpj, ''), '[^0-9]', '', 'g')) = 14
    then regexp_replace(c.cnpj, '[^0-9]', '', 'g')
    else null
  end,
  'corretora_configuracoes',
  'ativo'
from public.corretora_configuracoes c
order by c.updated_at desc nulls last, c.created_at desc nulls last
limit 1
on conflict (codigo) do nothing;

insert into public.fin_empresas (
  codigo,
  razao_social,
  nome_fantasia,
  origem,
  status
)
select
  'transmares',
  'Transmares Corretora de Seguros',
  'Transmares',
  'manual',
  'ativo'
where not exists (
  select 1 from public.fin_empresas where codigo = 'transmares'
);

insert into public.fin_usuario_empresas (
  empresa_id,
  usuario_id,
  principal,
  status
)
select
  empresa.id,
  usuario.id,
  true,
  'ativo'
from public.fin_empresas empresa
join public.usuarios usuario
  on usuario.status = 'ativo'
left join public.perfis perfil
  on perfil.id = usuario.perfil_id
where empresa.codigo = 'transmares'
  and (usuario.is_master or perfil.slug = 'admin')
on conflict (empresa_id, usuario_id) do nothing;

insert into public.fin_parametros (
  empresa_id,
  chave,
  valor,
  descricao,
  sensivel,
  status
)
values
  (null, 'modulo_ativo', 'false'::jsonb, 'Chave global de ativação controlada do Financeiro.', false, 'ativo'),
  (null, 'moeda_padrao', '"BRL"'::jsonb, 'Moeda operacional padrão do módulo.', false, 'ativo'),
  (null, 'timezone_padrao', '"America/Fortaleza"'::jsonb, 'Fuso horário usado nas operações e relatórios.', false, 'ativo')
on conflict (empresa_id, chave) do nothing;
