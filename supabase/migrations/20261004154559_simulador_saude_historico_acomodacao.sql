begin;

alter table public.simulador_saude_catalogo_historico
  drop constraint if exists simulador_saude_catalogo_historico_entidade_check;

alter table public.simulador_saude_catalogo_historico
  add constraint simulador_saude_catalogo_historico_entidade_check
  check (
    entidade = any (array[
      'simulador_saude_operadoras',
      'simulador_saude_planos',
      'simulador_saude_tabelas_precos',
      'simulador_saude_precos_faixa',
      'simulador_saude_precos_faixa_acomodacao'
    ])
  );

commit;
