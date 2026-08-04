-- Financeiro: ativacao controlada do modulo em production.

insert into public.fin_parametros (
  empresa_id,
  chave,
  valor,
  descricao,
  sensivel,
  status
)
values (
  null,
  'modulo_ativo',
  'true'::jsonb,
  'Chave global de ativacao controlada do Financeiro.',
  false,
  'ativo'
)
on conflict (empresa_id, chave) do update
set valor = excluded.valor,
    status = 'ativo',
    updated_at = now(),
    updated_by = public.app_usuario_atual_id();

update public.itens
set status = 'ativo',
    dados = coalesce(dados, '{}'::jsonb) || jsonb_build_object(
      'slug', 'financeiro',
      'tipo', 'modulo',
      'ordem', 50,
      'bloqueavel', true,
      'exibir_home', true,
      'fase', 8
    ),
    updated_at = now()
where dados ->> 'slug' = 'financeiro'
  and dados ->> 'tipo' = 'modulo';
