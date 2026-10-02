begin;

alter table public.simulador_saude_tabelas_precos
  alter column vigencia_inicio drop not null,
  add column if not exists tipo_contratacao text not null default 'Empresarial (PJ)',
  add column if not exists min_vidas integer not null default 1,
  add column if not exists condicoes jsonb not null default '{}'::jsonb;

alter table public.simulador_saude_tabelas_precos
  drop constraint if exists simulador_saude_tabelas_precos_tipo_contratacao_check,
  add constraint simulador_saude_tabelas_precos_tipo_contratacao_check
    check (tipo_contratacao in ('Individual', 'Familiar', 'Empresarial (PJ)')),
  drop constraint if exists simulador_saude_tabelas_precos_min_vidas_check,
  add constraint simulador_saude_tabelas_precos_min_vidas_check
    check (min_vidas >= 1 and (tipo_contratacao <> 'Familiar' or min_vidas >= 2)),
  drop constraint if exists simulador_saude_tabelas_precos_vigencia_check,
  add constraint simulador_saude_tabelas_precos_vigencia_check
    check (vigencia_fim is null or vigencia_inicio is null or vigencia_fim >= vigencia_inicio),
  drop constraint if exists simulador_saude_tabelas_precos_condicoes_object_check,
  add constraint simulador_saude_tabelas_precos_condicoes_object_check
    check (jsonb_typeof(condicoes) = 'object');

alter table public.simulador_saude_planos
  drop constraint if exists simulador_saude_planos_acomodacao_check,
  add constraint simulador_saude_planos_acomodacao_check
    check (acomodacao in ('Apartamento', 'Enfermaria', 'Ambulatorial'));

create index if not exists simulador_saude_tabelas_precos_tipo_status_vigencia_idx
  on public.simulador_saude_tabelas_precos (tipo_contratacao, status, vigencia_inicio, vigencia_fim);

comment on column public.simulador_saude_tabelas_precos.tipo_contratacao is
  'Modalidade comercial da grade: Individual, Familiar ou Empresarial (PJ).';
comment on column public.simulador_saude_tabelas_precos.min_vidas is
  'Quantidade mínima de beneficiários para cotar esta tabela; Familiar exige no mínimo 2.';
comment on column public.simulador_saude_tabelas_precos.condicoes is
  'Condições estruturadas associadas à tabela, como coparticipação por procedimento, carências e benefícios adicionais.';

create or replace function private.simulador_saude_validar_tabela_vigente()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_faixas integer;
begin
  if new.status <> 'vigente' then
    return new;
  end if;

  if new.vigencia_inicio is null then
    raise exception 'Informe o início da vigência antes de ativar a tabela.';
  end if;
  if new.tipo_contratacao = 'Familiar' and new.min_vidas < 2 then
    raise exception 'A contratação Familiar exige pelo menos 2 vidas.';
  end if;

  select count(*)::integer
    into v_faixas
  from public.simulador_saude_precos_faixa preco
  where preco.tabela_preco_id = new.id;

  if v_faixas <> 10 then
    raise exception 'Uma tabela só pode ficar vigente quando contiver preços nas 10 faixas etárias.';
  end if;

  return new;
end;
$$;

-- Importa as tarifas extraídas das imagens como registros em revisão. Todas estão vencidas e aguardam nova vigência.
create temporary table _unimed_maceio_seed (
  plano_nome text not null,
  modalidade text not null,
  acomodacao text not null,
  coparticipacao boolean not null,
  abrangencia text not null,
  codigo_interno text,
  tabela_nome text not null,
  vigencia_fim date,
  tipo_contratacao text not null,
  min_vidas integer not null,
  observacoes text,
  condicoes jsonb not null,
  precos jsonb not null
) on commit drop;

insert into _unimed_maceio_seed values
('UNI Premium', 'Rede Especial', 'Apartamento', true, 'Nacional', '507.168/25-2', 'UNI Premium · Individual · até 30/09/2026', '2026-09-30', 'Individual', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026"}'::jsonb, '{"0-18":625.33,"19-23":656.6,"24-28":722.26,"29-33":794.48,"34-38":953.38,"39-43":1163.12,"44-48":1488.8,"49-53":1861,"54-58":2512.35,"59+":3492.17}'::jsonb),
('UNI Premium', 'Rede Especial', 'Apartamento', true, 'Nacional', '507.168/25-2', 'UNI Premium · Familiar · até 30/09/2026', '2026-09-30', 'Familiar', 2, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026"}'::jsonb, '{"0-18":591.61,"19-23":621.19,"24-28":683.31,"29-33":751.64,"34-38":901.97,"39-43":1100.4,"44-48":1408.51,"49-53":1760.64,"54-58":2376.87,"59+":3303.85}'::jsonb),
('UNI Referência', 'Coparticipativo', 'Enfermaria', true, 'Municipal', '504.755/25-2', 'UNI Referência · Individual · até 30/09/2026', '2026-09-30', 'Individual', 1, 'A fonte apresenta percentuais por faixa sem explicar sua finalidade; conferir antes de usar esse percentual na cotação.', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026","percentuais_mostrados_na_fonte":["","5%","10%","10%","20%","22%","28%","25%","35%","39%"]}'::jsonb, '{"0-18":1470.44,"19-23":1543.96,"24-28":1698.36,"29-33":1868.19,"34-38":2241.83,"39-43":2735.04,"44-48":3500.85,"49-53":4376.06,"54-58":5907.68,"59+":8211.67}'::jsonb),
('UNI Amplo', 'Coparticipativo', 'Enfermaria', true, 'Estadual', '502.587/25-7', 'UNI Amplo · Individual · até 30/09/2026', '2026-09-30', 'Individual', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026"}'::jsonb, '{"0-18":376.71,"19-23":405.83,"24-28":468.17,"29-33":579.03,"34-38":690.95,"39-43":843.03,"44-48":1056.74,"49-53":1320.92,"54-58":1768.19,"59+":2257.09}'::jsonb),
('UNI Amplo', 'Coparticipativo', 'Enfermaria', true, 'Estadual', '502.587/25-7', 'UNI Amplo · Familiar · até 30/09/2026', '2026-09-30', 'Familiar', 2, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026"}'::jsonb, '{"0-18":362.22,"19-23":390.22,"24-28":450.16,"29-33":556.76,"34-38":664.38,"39-43":810.61,"44-48":1016.1,"49-53":1270.12,"54-58":1700.18,"59+":2170.28}'::jsonb),
('UNI Amplo', 'Coparticipativo', 'Apartamento', true, 'Estadual', '502.588/25-5', 'UNI Amplo · Individual · até 30/09/2026', '2026-09-30', 'Individual', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026"}'::jsonb, '{"0-18":460.71,"19-23":496.32,"24-28":572.56,"29-33":708.14,"34-38":845.02,"39-43":1031.01,"44-48":1292.37,"49-53":1615.47,"54-58":2162.47,"59+":2760.39}'::jsonb),
('UNI Amplo', 'Coparticipativo', 'Apartamento', true, 'Estadual', '502.588/25-5', 'UNI Amplo · Familiar · até 30/09/2026', '2026-09-30', 'Familiar', 2, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026"}'::jsonb, '{"0-18":445.13,"19-23":479.54,"24-28":553.2,"29-33":684.19,"34-38":816.45,"39-43":996.15,"44-48":1248.67,"49-53":1560.84,"54-58":2089.34,"59+":2667.04}'::jsonb),
('UNI Essencial+ Flex 1', 'Coparticipação flex 1', 'Enfermaria', true, 'Grupo de Municípios', '502.585/25-1', 'UNI Essencial+ Flex 1 · Individual · até 30/09/2026', '2026-09-30', 'Individual', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026"}'::jsonb, '{"0-18":291.83,"19-23":306.42,"24-28":337.06,"29-33":370.77,"34-38":444.92,"39-43":542.8,"44-48":694.79,"49-53":868.48,"54-58":1172.45,"59+":1629.71}'::jsonb),
('UNI Essencial+ Flex 1', 'Coparticipação flex 1', 'Enfermaria', true, 'Grupo de Municípios', '502.585/25-1', 'UNI Essencial+ Flex 1 · Familiar · até 30/09/2026', '2026-09-30', 'Familiar', 2, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026"}'::jsonb, '{"0-18":276.09,"19-23":289.89,"24-28":318.88,"29-33":350.77,"34-38":420.93,"39-43":513.53,"44-48":657.32,"49-53":821.65,"54-58":1109.23,"59+":1541.82}'::jsonb),
('UNI Essencial+ Flex 2', 'Coparticipação flex 2', 'Enfermaria', true, 'Grupo de Municípios', '502.585/25-1', 'UNI Essencial+ Flex 2 · Individual · até 30/09/2026', '2026-09-30', 'Individual', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026"}'::jsonb, '{"0-18":320.39,"19-23":336.41,"24-28":370.05,"29-33":407.05,"34-38":488.46,"39-43":595.92,"44-48":762.78,"49-53":953.48,"54-58":1287.2,"59+":1789.2}'::jsonb),
('UNI Essencial+ Flex 2', 'Coparticipação flex 2', 'Enfermaria', true, 'Grupo de Municípios', '502.585/25-1', 'UNI Essencial+ Flex 2 · Familiar · até 30/09/2026', '2026-09-30', 'Familiar', 2, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026"}'::jsonb, '{"0-18":303.11,"19-23":318.27,"24-28":350.09,"29-33":385.1,"34-38":462.12,"39-43":563.79,"44-48":721.65,"49-53":902.06,"54-58":1217.78,"59+":1692.72}'::jsonb),
('UNI Pleno · até 29 vidas', 'Coparticipativo', 'Enfermaria', true, 'Maceió', '484.371/19-1', 'UNI Pleno · até 29 vidas · Empresarial (PJ) · até 30/09/2026', '2026-09-30', 'Empresarial (PJ)', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026","carencias":[{"prazo":"24 horas","cobertura":"Urgência e emergência"},{"prazo":"30 dias","cobertura":"Consultas, exames laboratoriais simples e raio-X sem contraste"},{"prazo":"180 dias","cobertura":"Exames especiais e complexos, terapias, cirurgias, internações e demais procedimentos, conforme contrato"},{"prazo":"300 dias","cobertura":"Parto"},{"prazo":"24 meses","cobertura":"Preexistência"}],"adicionais":[{"nome":"Uniodonto","descricao":"Atendimento odontológico para toda a família","valor_por_vida":31.65},{"nome":"SOS Unimed","descricao":"Atendimento rápido em Maceió","valor_por_vida":10.41},{"nome":"Aeromédica","descricao":"Transferência de urgência","valor_por_vida":4.99}],"coparticipacao":{"consultas":null,"emergencia":{"valor":35},"exames":null,"terapias":null}}'::jsonb, '{"0-18":262.58,"19-23":282.88,"24-28":326.33,"29-33":403.6,"34-38":481.62,"39-43":587.62,"44-48":736.58,"49-53":920.73,"54-58":1232.49,"59+":1573.27}'::jsonb),
('UNI Pleno · até 29 vidas', 'Coparticipativo', 'Apartamento', true, 'Maceió', '484.372/19-0', 'UNI Pleno · até 29 vidas · Empresarial (PJ) · até 30/09/2026', '2026-09-30', 'Empresarial (PJ)', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026","carencias":[{"prazo":"24 horas","cobertura":"Urgência e emergência"},{"prazo":"30 dias","cobertura":"Consultas, exames laboratoriais simples e raio-X sem contraste"},{"prazo":"180 dias","cobertura":"Exames especiais e complexos, terapias, cirurgias, internações e demais procedimentos, conforme contrato"},{"prazo":"300 dias","cobertura":"Parto"},{"prazo":"24 meses","cobertura":"Preexistência"}],"adicionais":[{"nome":"Uniodonto","descricao":"Atendimento odontológico para toda a família","valor_por_vida":31.65},{"nome":"SOS Unimed","descricao":"Atendimento rápido em Maceió","valor_por_vida":10.41},{"nome":"Aeromédica","descricao":"Transferência de urgência","valor_por_vida":4.99}],"coparticipacao":{"consultas":null,"emergencia":{"valor":35},"exames":null,"terapias":null}}'::jsonb, '{"0-18":316.75,"19-23":341.23,"24-28":393.65,"29-33":486.86,"34-38":580.98,"39-43":708.85,"44-48":888.54,"49-53":1110.68,"54-58":1486.75,"59+":1897.84}'::jsonb),
('UNI Premium', 'Nacional · Rede Especial', 'Apartamento', true, 'Nacional', '507.167/25-4', 'UNI Premium · Empresarial (PJ) · até 30/09/2026', '2026-09-30', 'Empresarial (PJ)', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026","carencias":[{"prazo":"24 horas","cobertura":"Urgência e emergência"},{"prazo":"30 dias","cobertura":"Consultas, exames laboratoriais simples e raio-X sem contraste"},{"prazo":"180 dias","cobertura":"Exames especiais e complexos, terapias, cirurgias, internações e demais procedimentos, conforme contrato"},{"prazo":"300 dias","cobertura":"Parto"},{"prazo":"24 meses","cobertura":"Preexistência"}],"adicionais":[{"nome":"Uniodonto","descricao":"Atendimento odontológico para toda a família","valor_por_vida":31.65},{"nome":"SOS Unimed","descricao":"Atendimento rápido em Maceió","valor_por_vida":10.41},{"nome":"Aeromédica","descricao":"Transferência de urgência","valor_por_vida":4.99}],"coparticipacao":{"consultas":{"valor":25},"emergencia":{"valor":35},"exames":{"percentual":30,"limite":150,"por":"procedimento"},"terapias":{"percentual":40,"limite":150,"por":"procedimento"}}}'::jsonb, '{"0-18":557.71,"19-23":591.17,"24-28":608.91,"29-33":627.18,"34-38":677.35,"39-43":778.95,"44-48":1088.2,"49-53":1392.89,"54-58":1768.97,"59+":2105.07}'::jsonb),
('UNI Amplo', 'Coparticipativo', 'Enfermaria', true, 'Estadual', '502.589/25-3', 'UNI Amplo · Empresarial (PJ) · até 30/09/2026', '2026-09-30', 'Empresarial (PJ)', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026","carencias":[{"prazo":"24 horas","cobertura":"Urgência e emergência"},{"prazo":"30 dias","cobertura":"Consultas, exames laboratoriais simples e raio-X sem contraste"},{"prazo":"180 dias","cobertura":"Exames especiais e complexos, terapias, cirurgias, internações e demais procedimentos, conforme contrato"},{"prazo":"300 dias","cobertura":"Parto"},{"prazo":"24 meses","cobertura":"Preexistência"}],"adicionais":[{"nome":"Uniodonto","descricao":"Atendimento odontológico para toda a família","valor_por_vida":31.65},{"nome":"SOS Unimed","descricao":"Atendimento rápido em Maceió","valor_por_vida":10.41},{"nome":"Aeromédica","descricao":"Transferência de urgência","valor_por_vida":4.99}],"coparticipacao":{"consultas":{"valor":25},"emergencia":{"valor":35},"exames":{"percentual":30,"limite":150,"por":"procedimento"},"terapias":{"percentual":40,"limite":150,"por":"procedimento"}}}'::jsonb, '{"0-18":397.94,"19-23":421.82,"24-28":434.47,"29-33":447.51,"34-38":483.31,"39-43":555.8,"44-48":776.45,"49-53":993.86,"54-58":1262.2,"59+":1502.02}'::jsonb),
('UNI Amplo', 'Coparticipativo', 'Apartamento', true, 'Estadual', '502.592/25-3', 'UNI Amplo · Empresarial (PJ) · até 30/09/2026', '2026-09-30', 'Empresarial (PJ)', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026","carencias":[{"prazo":"24 horas","cobertura":"Urgência e emergência"},{"prazo":"30 dias","cobertura":"Consultas, exames laboratoriais simples e raio-X sem contraste"},{"prazo":"180 dias","cobertura":"Exames especiais e complexos, terapias, cirurgias, internações e demais procedimentos, conforme contrato"},{"prazo":"300 dias","cobertura":"Parto"},{"prazo":"24 meses","cobertura":"Preexistência"}],"adicionais":[{"nome":"Uniodonto","descricao":"Atendimento odontológico para toda a família","valor_por_vida":31.65},{"nome":"SOS Unimed","descricao":"Atendimento rápido em Maceió","valor_por_vida":10.41},{"nome":"Aeromédica","descricao":"Transferência de urgência","valor_por_vida":4.99}],"coparticipacao":{"consultas":{"valor":25},"emergencia":{"valor":35},"exames":{"percentual":30,"limite":150,"por":"procedimento"},"terapias":{"percentual":40,"limite":150,"por":"procedimento"}}}'::jsonb, '{"0-18":479.23,"19-23":507.98,"24-28":523.22,"29-33":538.92,"34-38":582.03,"39-43":669.34,"44-48":935.07,"49-53":1196.88,"54-58":1520.04,"59+":1808.85}'::jsonb),
('UNI Amplo+', 'Coparticipativo', 'Enfermaria', true, 'Estadual', '502.589/25-3', 'UNI Amplo+ · Empresarial (PJ) · até 30/09/2026', '2026-09-30', 'Empresarial (PJ)', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026","carencias":[{"prazo":"24 horas","cobertura":"Urgência e emergência"},{"prazo":"30 dias","cobertura":"Consultas, exames laboratoriais simples e raio-X sem contraste"},{"prazo":"180 dias","cobertura":"Exames especiais e complexos, terapias, cirurgias, internações e demais procedimentos, conforme contrato"},{"prazo":"300 dias","cobertura":"Parto"},{"prazo":"24 meses","cobertura":"Preexistência"}],"adicionais":[{"nome":"Uniodonto","descricao":"Atendimento odontológico para toda a família","valor_por_vida":31.65},{"nome":"SOS Unimed","descricao":"Atendimento rápido em Maceió","valor_por_vida":10.41},{"nome":"Aeromédica","descricao":"Transferência de urgência","valor_por_vida":4.99}],"coparticipacao":{"consultas":{"valor":25},"emergencia":{"valor":35},"exames":{"percentual":30,"limite":150,"por":"procedimento"},"terapias":{"percentual":40,"limite":150,"por":"procedimento"},"observacao":"Coparticipação de até R$ 250/mês por família, exceto terapias. Excedente transferido ao mês seguinte. Isenção nos Serviços Próprios, exceto terapias, indicada até 30/04/2026."}}'::jsonb, '{"0-18":429.78,"19-23":455.57,"24-28":469.23,"29-33":483.31,"34-38":521.97,"39-43":600.26,"44-48":838.57,"49-53":1073.37,"54-58":1363.18,"59+":1622.18}'::jsonb),
('UNI Amplo+', 'Coparticipativo', 'Apartamento', true, 'Estadual', '502.592/25-3', 'UNI Amplo+ · Empresarial (PJ) · até 30/09/2026', '2026-09-30', 'Empresarial (PJ)', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026","carencias":[{"prazo":"24 horas","cobertura":"Urgência e emergência"},{"prazo":"30 dias","cobertura":"Consultas, exames laboratoriais simples e raio-X sem contraste"},{"prazo":"180 dias","cobertura":"Exames especiais e complexos, terapias, cirurgias, internações e demais procedimentos, conforme contrato"},{"prazo":"300 dias","cobertura":"Parto"},{"prazo":"24 meses","cobertura":"Preexistência"}],"adicionais":[{"nome":"Uniodonto","descricao":"Atendimento odontológico para toda a família","valor_por_vida":31.65},{"nome":"SOS Unimed","descricao":"Atendimento rápido em Maceió","valor_por_vida":10.41},{"nome":"Aeromédica","descricao":"Transferência de urgência","valor_por_vida":4.99}],"coparticipacao":{"consultas":{"valor":25},"emergencia":{"valor":35},"exames":{"percentual":30,"limite":150,"por":"procedimento"},"terapias":{"percentual":40,"limite":150,"por":"procedimento"},"observacao":"Coparticipação de até R$ 250/mês por família, exceto terapias. Excedente transferido ao mês seguinte. Isenção nos Serviços Próprios, exceto terapias, indicada até 30/04/2026."}}'::jsonb, '{"0-18":517.57,"19-23":548.62,"24-28":565.08,"29-33":582.03,"34-38":628.59,"39-43":722.89,"44-48":1009.88,"49-53":1292.63,"54-58":1641.64,"59+":1953.56}'::jsonb),
('UNI Essencial+ Flex 1', 'Coparticipação flex 1', 'Enfermaria', true, 'Grupo de Municípios', '502.586/25-9', 'UNI Essencial+ Flex 1 · Empresarial (PJ) · até 30/09/2026', '2026-09-30', 'Empresarial (PJ)', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026","carencias":[{"prazo":"24 horas","cobertura":"Urgência e emergência"},{"prazo":"30 dias","cobertura":"Consultas, exames laboratoriais simples e raio-X sem contraste"},{"prazo":"180 dias","cobertura":"Exames especiais e complexos, terapias, cirurgias, internações e demais procedimentos, conforme contrato"},{"prazo":"300 dias","cobertura":"Parto"},{"prazo":"24 meses","cobertura":"Preexistência"}],"adicionais":[{"nome":"Uniodonto","descricao":"Atendimento odontológico para toda a família","valor_por_vida":31.65},{"nome":"SOS Unimed","descricao":"Atendimento rápido em Maceió","valor_por_vida":10.41},{"nome":"Aeromédica","descricao":"Transferência de urgência","valor_por_vida":4.99}],"coparticipacao":{"consultas":{"valor":38},"emergencia":{"valor":48},"exames":{"percentual":40,"limite":200,"por":"procedimento"},"terapias":{"percentual":40,"limite":150,"por":"procedimento"}}}'::jsonb, '{"0-18":253.16,"19-23":268.35,"24-28":276.4,"29-33":284.69,"34-38":307.47,"39-43":353.59,"44-48":493.96,"49-53":632.27,"54-58":802.98,"59+":955.55}'::jsonb),
('UNI Essencial+ Flex 2', 'Coparticipação flex 2', 'Enfermaria', true, 'Grupo de Municípios', '502.586/25-9', 'UNI Essencial+ Flex 2 · Empresarial (PJ) · até 30/09/2026', '2026-09-30', 'Empresarial (PJ)', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026","carencias":[{"prazo":"24 horas","cobertura":"Urgência e emergência"},{"prazo":"30 dias","cobertura":"Consultas, exames laboratoriais simples e raio-X sem contraste"},{"prazo":"180 dias","cobertura":"Exames especiais e complexos, terapias, cirurgias, internações e demais procedimentos, conforme contrato"},{"prazo":"300 dias","cobertura":"Parto"},{"prazo":"24 meses","cobertura":"Preexistência"}],"adicionais":[{"nome":"Uniodonto","descricao":"Atendimento odontológico para toda a família","valor_por_vida":31.65},{"nome":"SOS Unimed","descricao":"Atendimento rápido em Maceió","valor_por_vida":10.41},{"nome":"Aeromédica","descricao":"Transferência de urgência","valor_por_vida":4.99}],"coparticipacao":{"consultas":{"valor":20},"emergencia":{"valor":30},"exames":{"percentual":20,"limite":100,"por":"procedimento"},"terapias":{"percentual":40,"limite":150,"por":"procedimento"}}}'::jsonb, '{"0-18":294.07,"19-23":311.71,"24-28":321.07,"29-33":330.7,"34-38":357.15,"39-43":410.73,"44-48":573.78,"49-53":734.44,"54-58":932.74,"59+":1109.97}'::jsonb),
('UNI Exclusivamente Ambulatorial', 'Coparticipativo', 'Ambulatorial', true, 'Grupo de Municípios', '505.068/25-5', 'UNI Exclusivamente Ambulatorial · Empresarial (PJ) · até 30/09/2026', '2026-09-30', 'Empresarial (PJ)', 1, '', '{"fonte":"Material Unimed Maceió com validade até 30/09/2026","carencias":[{"prazo":"24 horas","cobertura":"Urgência e emergência"},{"prazo":"30 dias","cobertura":"Consultas, exames laboratoriais simples e raio-X sem contraste"},{"prazo":"180 dias","cobertura":"Exames especiais e complexos, terapias, cirurgias, internações e demais procedimentos, conforme contrato"},{"prazo":"300 dias","cobertura":"Parto"},{"prazo":"24 meses","cobertura":"Preexistência"}],"adicionais":[{"nome":"Uniodonto","descricao":"Atendimento odontológico para toda a família","valor_por_vida":31.65},{"nome":"SOS Unimed","descricao":"Atendimento rápido em Maceió","valor_por_vida":10.41},{"nome":"Aeromédica","descricao":"Transferência de urgência","valor_por_vida":4.99}],"coparticipacao":"A imagem não especifica os valores de coparticipação para este plano."}'::jsonb, '{"0-18":209.38,"19-23":219.85,"24-28":235.24,"29-33":258.76,"34-38":284.63,"39-43":313.1,"44-48":344.41,"49-53":396.07,"54-58":455.49,"59+":523.81}'::jsonb);

insert into public.simulador_saude_operadoras (nome)
values ('Unimed Maceió')
on conflict ((lower(btrim(nome)))) do nothing;

insert into public.simulador_saude_planos (
  operadora_id, nome, modalidade, acomodacao, coparticipacao, abrangencia, codigo_interno
)
select distinct
  operadora.id, seed.plano_nome, seed.modalidade, seed.acomodacao, seed.coparticipacao,
  seed.abrangencia, seed.codigo_interno
from _unimed_maceio_seed seed
cross join lateral (
  select id from public.simulador_saude_operadoras where lower(btrim(nome)) = lower('Unimed Maceió') limit 1
) operadora
where not exists (
  select 1 from public.simulador_saude_planos plano
  where plano.operadora_id = operadora.id
    and lower(btrim(plano.nome)) = lower(btrim(seed.plano_nome))
    and lower(btrim(plano.modalidade)) = lower(btrim(seed.modalidade))
    and plano.acomodacao = seed.acomodacao
    and plano.coparticipacao = seed.coparticipacao
    and lower(btrim(plano.abrangencia)) = lower(btrim(seed.abrangencia))
)
 on conflict do nothing;

with created_tables as (
  insert into public.simulador_saude_tabelas_precos (
    plano_id, nome, vigencia_inicio, vigencia_fim, status, observacoes,
    tipo_contratacao, min_vidas, condicoes
  )
  select plano.id, seed.tabela_nome, null, seed.vigencia_fim, 'em_revisao', seed.observacoes,
    seed.tipo_contratacao, seed.min_vidas, seed.condicoes
  from _unimed_maceio_seed seed
  join public.simulador_saude_operadoras operadora
    on lower(btrim(operadora.nome)) = lower('Unimed Maceió')
  join public.simulador_saude_planos plano
    on plano.operadora_id = operadora.id
   and lower(btrim(plano.nome)) = lower(btrim(seed.plano_nome))
   and lower(btrim(plano.modalidade)) = lower(btrim(seed.modalidade))
   and plano.acomodacao = seed.acomodacao
   and plano.coparticipacao = seed.coparticipacao
   and lower(btrim(plano.abrangencia)) = lower(btrim(seed.abrangencia))
  returning id, plano_id, nome, tipo_contratacao
)
insert into public.simulador_saude_precos_faixa (tabela_preco_id, faixa_etaria, valor)
select created.id, price.key, (price.value)::numeric(12,2)
from created_tables created
join public.simulador_saude_planos plano
  on plano.id = created.plano_id
join _unimed_maceio_seed seed
  on seed.tabela_nome = created.nome
 and seed.tipo_contratacao = created.tipo_contratacao
 and lower(btrim(plano.nome)) = lower(btrim(seed.plano_nome))
 and lower(btrim(plano.modalidade)) = lower(btrim(seed.modalidade))
 and plano.acomodacao = seed.acomodacao
 and plano.coparticipacao = seed.coparticipacao
 and lower(btrim(plano.abrangencia)) = lower(btrim(seed.abrangencia))
cross join lateral jsonb_each_text(seed.precos) price;

commit;
