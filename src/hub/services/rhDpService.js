import { exigirSupabaseConfigurado, obterUrlSupabase } from '../supabaseClient.js';

const COLUNAS_COLABORADOR = `
  id,
  nome_completo,
  data_nascimento,
  estado_civil,
  nacionalidade,
  naturalidade,
  nome_pai,
  nome_mae,
  sexo,
  escolaridade,
  cor_raca,
  telefone_celular,
  email_contato,
  contato_emergencia_nome,
  contato_emergencia_telefone,
  endereco_logradouro,
  endereco_numero,
  endereco_complemento,
  endereco_bairro,
  endereco_cidade,
  endereco_uf,
  endereco_cep,
  status,
  observacoes,
  created_at,
  updated_at
`;

const COLUNAS_DOCUMENTOS = `
  id,
  colaborador_id,
  cpf,
  identidade_tipo,
  identidade_numero,
  identidade_data_emissao,
  identidade_orgao_emissor,
  identidade_uf_emissor,
  cnh_categoria,
  titulo_eleitor,
  zona_eleitoral,
  secao_eleitoral,
  ctps_numero,
  ctps_serie,
  ctps_data_expedicao,
  ctps_uf,
  reservista_numero,
  reservista_categoria,
  pis_numero,
  pis_data_cadastro,
  created_at,
  updated_at
`;

const COLUNAS_VINCULO = `
  id,
  colaborador_id,
  tipo_vinculo,
  data_admissao,
  data_desligamento,
  cargo,
  funcao,
  cbo,
  departamento,
  gestor_responsavel,
  situacao,
  tipo_remuneracao,
  remuneracao_valor,
  modelo_jornada,
  carga_horaria_semanal,
  horario_entrada,
  horario_saida,
  intervalo_inicio,
  intervalo_fim,
  dias_trabalho,
  observacoes,
  created_at,
  updated_at
`;

const COLUNAS_ARQUIVO = `
  id,
  colaborador_id,
  categoria,
  tipo_documento,
  nome_arquivo,
  descricao,
  origem,
  google_drive_file_id,
  google_drive_web_url,
  google_drive_preview_url,
  google_drive_folder_id,
  mime_type,
  tamanho_bytes,
  versao_atual,
  data_referencia,
  data_validade,
  retencao_ate,
  status,
  observacoes,
  created_at,
  updated_at
`;

const COLUNAS_BENEFICIO = `
  id, colaborador_id, tipo, nome, operadora_fornecedor, valor_empresa,
  valor_colaborador, inicio_em, fim_em, status, observacoes, created_at, updated_at
`;

const COLUNAS_BANCARIOS = `
  id, colaborador_id, banco_codigo, banco_nome, tipo_conta, agencia, conta,
  conta_digito, operacao, pix_tipo, pix_chave, titular_nome, titular_cpf,
  status, observacoes, created_at, updated_at
`;

const COLUNAS_MOVIMENTACAO = `
  id, colaborador_id, tipo, data_efetivacao, titulo, descricao, dados_anteriores,
  dados_novos, referencia_externa, created_at, updated_at
`;

const COLUNAS_CHECKLIST = `
  id, colaborador_id, item_chave, status, concluido_em, observacoes, created_at, updated_at
`;

const COLUNAS_FERIAS = `
  id, colaborador_id, periodo_aquisitivo_inicio, periodo_aquisitivo_fim,
  inicio_gozo, fim_gozo, dias_gozo, abono_pecuniario, observacoes,
  status, enviado_em, retorno_em, retorno_resumo, divergencia_descricao,
  created_at, updated_at, rh_colaboradores(nome_completo)
`;

const COLUNAS_AFASTAMENTO = `
  id, colaborador_id, tipo, motivo, inicio_em, previsao_retorno_em,
  retorno_em, cid_referencia, comunicacao_emitida, observacoes, status,
  enviado_em, retorno_em_contabilidade, retorno_resumo, divergencia_descricao,
  created_at, updated_at, rh_colaboradores(nome_completo)
`;

const COLUNAS_OCORRENCIA = `
  id, colaborador_id, categoria, data_ocorrencia, titulo, descricao,
  providencias, requer_acompanhamento, encerrada_em, status,
  created_at, updated_at, rh_colaboradores(nome_completo)
`;

function limparTexto(valor) {
  const texto = String(valor ?? '').trim();
  return texto || null;
}

function limparDigitos(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  return digitos || null;
}

function normalizarStatus(valor) {
  return String(valor || '').trim().toLowerCase() === 'inativo' ? 'inativo' : 'ativo';
}

function normalizarDecimal(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return null;

  const normalizado = texto
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

function normalizarHora(valor) {
  const texto = limparTexto(valor);
  return texto && /^\d{2}:\d{2}$/.test(texto) ? texto : null;
}

function normalizarColaborador(payload = {}) {
  return {
    nome_completo: limparTexto(payload.nome_completo),
    data_nascimento: limparTexto(payload.data_nascimento),
    estado_civil: limparTexto(payload.estado_civil),
    nacionalidade: limparTexto(payload.nacionalidade),
    naturalidade: limparTexto(payload.naturalidade),
    nome_pai: limparTexto(payload.nome_pai),
    nome_mae: limparTexto(payload.nome_mae),
    sexo: limparTexto(payload.sexo),
    escolaridade: limparTexto(payload.escolaridade),
    cor_raca: limparTexto(payload.cor_raca),
    telefone_celular: limparTexto(payload.telefone_celular),
    email_contato: limparTexto(payload.email_contato)?.toLowerCase() || null,
    contato_emergencia_nome: limparTexto(payload.contato_emergencia_nome),
    contato_emergencia_telefone: limparTexto(payload.contato_emergencia_telefone),
    endereco_logradouro: limparTexto(payload.endereco_logradouro),
    endereco_numero: limparTexto(payload.endereco_numero),
    endereco_complemento: limparTexto(payload.endereco_complemento),
    endereco_bairro: limparTexto(payload.endereco_bairro),
    endereco_cidade: limparTexto(payload.endereco_cidade),
    endereco_uf: limparTexto(payload.endereco_uf)?.toUpperCase() || null,
    endereco_cep: limparDigitos(payload.endereco_cep),
    status: normalizarStatus(payload.status),
    observacoes: limparTexto(payload.observacoes)
  };
}

function normalizarVinculo(payload = {}) {
  const vinculo = {
    tipo_vinculo: limparTexto(payload.tipo_vinculo)?.toLowerCase() || null,
    data_admissao: limparTexto(payload.data_admissao),
    data_desligamento: limparTexto(payload.data_desligamento),
    cargo: limparTexto(payload.cargo),
    funcao: limparTexto(payload.funcao),
    cbo: limparTexto(payload.cbo),
    departamento: limparTexto(payload.departamento),
    gestor_responsavel: limparTexto(payload.gestor_responsavel),
    situacao: limparTexto(payload.situacao)?.toLowerCase() || null,
    tipo_remuneracao: limparTexto(payload.tipo_remuneracao)?.toLowerCase() || null,
    remuneracao_valor: normalizarDecimal(payload.remuneracao_valor),
    modelo_jornada: limparTexto(payload.modelo_jornada)?.toLowerCase() || null,
    carga_horaria_semanal: normalizarDecimal(payload.carga_horaria_semanal),
    horario_entrada: normalizarHora(payload.horario_entrada),
    horario_saida: normalizarHora(payload.horario_saida),
    intervalo_inicio: normalizarHora(payload.intervalo_inicio),
    intervalo_fim: normalizarHora(payload.intervalo_fim),
    dias_trabalho: limparTexto(payload.dias_trabalho),
    observacoes: limparTexto(payload.observacoes)
  };

  const possuiDados = Object.entries(vinculo).some(([campoNome, valor]) => {
    if (campoNome === 'situacao' && valor === 'ativo') return false;
    return valor !== null && valor !== '';
  });

  return possuiDados ? vinculo : null;
}

function normalizarDocumentos(payload = {}) {
  return {
    cpf: limparDigitos(payload.cpf),
    identidade_tipo: limparTexto(payload.identidade_tipo)?.toLowerCase() || null,
    identidade_numero: limparTexto(payload.identidade_numero),
    identidade_data_emissao: limparTexto(payload.identidade_data_emissao),
    identidade_orgao_emissor: limparTexto(payload.identidade_orgao_emissor),
    identidade_uf_emissor: limparTexto(payload.identidade_uf_emissor)?.toUpperCase() || null,
    cnh_categoria: limparTexto(payload.cnh_categoria)?.toUpperCase() || null,
    titulo_eleitor: limparDigitos(payload.titulo_eleitor),
    zona_eleitoral: limparTexto(payload.zona_eleitoral),
    secao_eleitoral: limparTexto(payload.secao_eleitoral),
    ctps_numero: limparTexto(payload.ctps_numero),
    ctps_serie: limparTexto(payload.ctps_serie),
    ctps_data_expedicao: limparTexto(payload.ctps_data_expedicao),
    ctps_uf: limparTexto(payload.ctps_uf)?.toUpperCase() || null,
    reservista_numero: limparTexto(payload.reservista_numero),
    reservista_categoria: limparTexto(payload.reservista_categoria),
    pis_numero: limparDigitos(payload.pis_numero),
    pis_data_cadastro: limparTexto(payload.pis_data_cadastro)
  };
}

function normalizarDependentes(dependentes = []) {
  return (Array.isArray(dependentes) ? dependentes : [])
    .map(item => ({
      id: limparTexto(item.id),
      nome_completo: limparTexto(item.nome_completo),
      data_nascimento: limparTexto(item.data_nascimento),
      parentesco: limparTexto(item.parentesco)
    }))
    .filter(item => item.id || item.nome_completo || item.data_nascimento || item.parentesco);
}

function normalizarUrl(valor) {
  const texto = limparTexto(valor);
  if (!texto) return null;
  return /^https?:\/\//i.test(texto) ? texto : null;
}

function normalizarArquivo(payload = {}) {
  return {
    colaborador_id: limparTexto(payload.colaborador_id),
    categoria: limparTexto(payload.categoria)?.toLowerCase() || null,
    tipo_documento: limparTexto(payload.tipo_documento),
    nome_arquivo: limparTexto(payload.nome_arquivo),
    descricao: limparTexto(payload.descricao),
    origem: limparTexto(payload.origem)?.toLowerCase() || 'google_drive',
    google_drive_file_id: limparTexto(payload.google_drive_file_id),
    google_drive_web_url: normalizarUrl(payload.google_drive_web_url),
    google_drive_preview_url: normalizarUrl(payload.google_drive_preview_url),
    google_drive_folder_id: limparTexto(payload.google_drive_folder_id),
    mime_type: limparTexto(payload.mime_type),
    tamanho_bytes: normalizarDecimal(payload.tamanho_bytes),
    data_referencia: limparTexto(payload.data_referencia),
    data_validade: limparTexto(payload.data_validade),
    observacoes: limparTexto(payload.observacoes)
  };
}

function normalizarBeneficio(payload = {}) {
  return {
    colaborador_id: limparTexto(payload.colaborador_id),
    tipo: limparTexto(payload.tipo)?.toLowerCase() || null,
    nome: limparTexto(payload.nome),
    operadora_fornecedor: limparTexto(payload.operadora_fornecedor),
    valor_empresa: normalizarDecimal(payload.valor_empresa),
    valor_colaborador: normalizarDecimal(payload.valor_colaborador),
    inicio_em: limparTexto(payload.inicio_em),
    fim_em: limparTexto(payload.fim_em),
    status: limparTexto(payload.status)?.toLowerCase() || 'ativo',
    observacoes: limparTexto(payload.observacoes)
  };
}

function normalizarBancarios(payload = {}) {
  return {
    colaborador_id: limparTexto(payload.colaborador_id),
    banco_codigo: limparDigitos(payload.banco_codigo),
    banco_nome: limparTexto(payload.banco_nome),
    tipo_conta: limparTexto(payload.tipo_conta)?.toLowerCase() || null,
    agencia: limparTexto(payload.agencia), conta: limparTexto(payload.conta),
    conta_digito: limparTexto(payload.conta_digito), operacao: limparTexto(payload.operacao),
    pix_tipo: limparTexto(payload.pix_tipo)?.toLowerCase() || null,
    pix_chave: limparTexto(payload.pix_chave), titular_nome: limparTexto(payload.titular_nome),
    titular_cpf: limparDigitos(payload.titular_cpf),
    status: limparTexto(payload.status)?.toLowerCase() || 'ativo',
    observacoes: limparTexto(payload.observacoes)
  };
}

function mensagemErroRh(error, fallback) {
  const texto = String(error?.message || '');

  if (/rh_documentos_cadastrais_cpf_key/i.test(texto)) {
    return 'Já existe um colaborador cadastrado com este CPF.';
  }

  if (/rh_colaboradores_contato_check/i.test(texto)) {
    return 'Informe ao menos um telefone ou e-mail de contato.';
  }

  if (/rh_colaboradores_nascimento_check|rh_dependentes_nascimento_check/i.test(texto)) {
    return 'Revise as datas de nascimento informadas.';
  }

  if (/rh_colaboradores_email_check/i.test(texto)) {
    return 'Informe um e-mail de contato válido.';
  }

  if (/rh_colaboradores_uf_check|rh_documentos_identidade_uf_check|rh_documentos_ctps_uf_check/i.test(texto)) {
    return 'Informe a UF com duas letras.';
  }

  if (/rh_colaboradores_cep_check/i.test(texto)) {
    return 'Informe um CEP válido com oito dígitos.';
  }

  if (/rh_dependentes_ativos_unicos_idx/i.test(texto)) {
    return 'Há um dependente duplicado neste cadastro.';
  }

  if (/rh_vinculos_datas_check/i.test(texto)) {
    return 'A data de desligamento não pode ser anterior à admissão.';
  }

  if (/rh_vinculos_remuneracao_check/i.test(texto)) {
    return 'Informe uma remuneração válida.';
  }

  if (/rh_vinculos_carga_horaria_check/i.test(texto)) {
    return 'Informe uma carga horária semanal válida.';
  }

  if (/rh_vinculos_cbo_check/i.test(texto)) {
    return 'Informe o CBO no formato 000000 ou 0000-00.';
  }

  if (/rh_vinculos_tipo_check|rh_vinculos_situacao_check|rh_vinculos_tipo_remuneracao_check|rh_vinculos_modelo_jornada_check/i.test(texto)) {
    return 'Revise as informações do vínculo profissional.';
  }

  if (/rh_arquivos_link_check/i.test(texto)) {
    return 'Informe o link do Google Drive ou o ID do arquivo.';
  }

  if (/rh_arquivos_categoria_check|rh_arquivos_origem_check|rh_arquivos_status_check/i.test(texto)) {
    return 'Revise as informações do arquivo.';
  }

  if (/rh_arquivos_url_check/i.test(texto)) {
    return 'Informe links válidos iniciando com http ou https.';
  }

  if (/rh_arquivos_tamanho_check/i.test(texto)) {
    return 'Informe um tamanho de arquivo válido.';
  }

  if (/RH_CREATE_DENIED|RH_UPDATE_DENIED|row-level security/i.test(texto)) {
    return 'Seu perfil não possui permissão para realizar esta alteração.';
  }

  if (/RH_SENSITIVE_DATA_REQUIRED|RH_SENSITIVE_DATA_DENIED/i.test(texto)) {
    return 'Seu perfil não possui acesso aos dados sensíveis necessários para esta operação.';
  }

  if (/RH_COLLABORATOR_NOT_FOUND/i.test(texto)) {
    return 'O colaborador não foi encontrado ou não está mais disponível.';
  }

  return texto || fallback;
}

export async function listarColaboradoresRhDp() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase
    .from('rh_colaboradores')
    .select(COLUNAS_COLABORADOR)
    .order('nome_completo', { ascending: true });

  if (error) {
    throw new Error(mensagemErroRh(error, 'Não foi possível carregar os colaboradores.'));
  }

  return data || [];
}

export async function listarArquivosColaboradorRhDp({ colaboradorId } = {}) {
  const supabase = exigirSupabaseConfigurado();

  if (!colaboradorId) return [];

  const { data, error } = await supabase
    .from('rh_arquivos_colaboradores')
    .select(COLUNAS_ARQUIVO)
    .eq('colaborador_id', colaboradorId)
    .neq('status', 'excluido')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(mensagemErroRh(error, 'Não foi possível carregar os arquivos do colaborador.'));
  }

  return data || [];
}

export async function obterCadastroPessoalRhDp({ id, incluirSensiveis = false } = {}) {
  const supabase = exigirSupabaseConfigurado();

  if (!id) {
    throw new Error('Colaborador não identificado.');
  }

  const colaboradorPromise = supabase
    .from('rh_colaboradores')
    .select(COLUNAS_COLABORADOR)
    .eq('id', id)
    .single();

  const documentosPromise = incluirSensiveis
    ? supabase
      .from('rh_documentos_cadastrais')
      .select(COLUNAS_DOCUMENTOS)
      .eq('colaborador_id', id)
      .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const vinculoPromise = incluirSensiveis
    ? supabase
      .from('rh_vinculos_profissionais')
      .select(COLUNAS_VINCULO)
      .eq('colaborador_id', id)
      .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const dependentesPromise = incluirSensiveis
    ? supabase
      .from('rh_dependentes')
      .select('id, colaborador_id, nome_completo, data_nascimento, parentesco, ativo, created_at, updated_at')
      .eq('colaborador_id', id)
      .eq('ativo', true)
      .order('nome_completo', { ascending: true })
    : Promise.resolve({ data: [], error: null });

  const beneficiosPromise = incluirSensiveis ? supabase.from('rh_beneficios_colaboradores').select(COLUNAS_BENEFICIO).eq('colaborador_id', id).order('status').order('nome') : Promise.resolve({ data: [], error: null });
  const bancariosPromise = incluirSensiveis ? supabase.from('rh_dados_bancarios_colaboradores').select(COLUNAS_BANCARIOS).eq('colaborador_id', id).maybeSingle() : Promise.resolve({ data: null, error: null });
  const movimentacoesPromise = incluirSensiveis ? supabase.from('rh_movimentacoes_colaboradores').select(COLUNAS_MOVIMENTACAO).eq('colaborador_id', id).order('data_efetivacao', { ascending: false }).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null });
  const checklistPromise = incluirSensiveis ? supabase.from('rh_checklist_admissional').select(COLUNAS_CHECKLIST).eq('colaborador_id', id).order('item_chave') : Promise.resolve({ data: [], error: null });

  const [colaborador, documentos, vinculo, dependentes, beneficios, bancarios, movimentacoes, checklist] = await Promise.all([
    colaboradorPromise,
    documentosPromise,
    vinculoPromise,
    dependentesPromise,
    beneficiosPromise,
    bancariosPromise,
    movimentacoesPromise,
    checklistPromise
  ]);

  const error = colaborador.error || documentos.error || vinculo.error || dependentes.error || beneficios.error || bancarios.error || movimentacoes.error || checklist.error;
  if (error) {
    throw new Error(mensagemErroRh(error, 'Não foi possível carregar o cadastro.'));
  }

  return {
    colaborador: colaborador.data,
    documentos: documentos.data || {},
    vinculo: vinculo.data || {},
    dependentes: dependentes.data || [],
    beneficios: beneficios.data || [], bancarios: bancarios.data || {},
    movimentacoes: movimentacoes.data || [], checklist: checklist.data || []
  };
}

export async function salvarBeneficioRhDp({ id = null, beneficio = {} } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const payload = normalizarBeneficio(beneficio);
  const { data, error } = id
    ? await supabase.from('rh_beneficios_colaboradores').update(payload).eq('id', id).select('id').single()
    : await supabase.from('rh_beneficios_colaboradores').insert(payload).select('id').single();
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível salvar o benefício.'));
  return { id: data?.id || id };
}

export async function salvarDadosBancariosRhDp({ id = null, dados = {} } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const payload = normalizarBancarios(dados);
  const { data, error } = id
    ? await supabase.from('rh_dados_bancarios_colaboradores').update(payload).eq('id', id).select('id').single()
    : await supabase.from('rh_dados_bancarios_colaboradores').insert(payload).select('id').single();
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível salvar os dados bancários.'));
  return { id: data?.id || id };
}

export async function salvarChecklistAdmissionalRhDp({ id = null, item = {} } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const payload = { colaborador_id: limparTexto(item.colaborador_id), item_chave: limparTexto(item.item_chave), status: limparTexto(item.status)?.toLowerCase() || 'pendente', concluido_em: limparTexto(item.concluido_em), observacoes: limparTexto(item.observacoes) };
  if (payload.status === 'concluido' && !payload.concluido_em) payload.concluido_em = new Date().toISOString().slice(0, 10);
  if (payload.status !== 'concluido') payload.concluido_em = null;
  const { data, error } = id
    ? await supabase.from('rh_checklist_admissional').update(payload).eq('id', id).select('id').single()
    : await supabase.from('rh_checklist_admissional').upsert(payload, { onConflict: 'colaborador_id,item_chave' }).select('id').single();
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível salvar o checklist.'));
  return { id: data?.id || id };
}

export async function salvarMovimentacaoRhDp({ movimentacao = {} } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const payload = { colaborador_id: limparTexto(movimentacao.colaborador_id), tipo: limparTexto(movimentacao.tipo)?.toLowerCase(), data_efetivacao: limparTexto(movimentacao.data_efetivacao), titulo: limparTexto(movimentacao.titulo), descricao: limparTexto(movimentacao.descricao), referencia_externa: limparTexto(movimentacao.referencia_externa) };
  const { data, error } = await supabase.from('rh_movimentacoes_colaboradores').insert(payload).select('id').single();
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível registrar a movimentação.'));
  return { id: data?.id };
}

export async function salvarCadastroPessoalRhDp({
  id = null,
  colaborador = {},
  documentos = null,
  vinculo = null,
  dependentes = null
} = {}) {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.rpc('rh_salvar_cadastro_pessoal', {
    p_colaborador_id: id || null,
    p_colaborador: normalizarColaborador(colaborador),
    p_documentos: documentos == null ? null : normalizarDocumentos(documentos),
    p_vinculo: vinculo == null ? null : normalizarVinculo(vinculo),
    p_dependentes: dependentes == null ? null : normalizarDependentes(dependentes)
  });

  if (error) {
    throw new Error(mensagemErroRh(error, 'Não foi possível salvar o cadastro.'));
  }

  return { id: data };
}

export async function alterarStatusColaboradorRhDp({ id, status } = {}) {
  const supabase = exigirSupabaseConfigurado();

  if (!id) {
    throw new Error('Colaborador não identificado.');
  }

  const { error } = await supabase
    .from('rh_colaboradores')
    .update({ status: normalizarStatus(status) })
    .eq('id', id);

  if (error) {
    throw new Error(mensagemErroRh(error, 'Não foi possível alterar o status do colaborador.'));
  }

  return { ok: true };
}

export async function salvarArquivoColaboradorRhDp({ id = null, arquivo = {} } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const payload = normalizarArquivo(arquivo);

  if (!payload.colaborador_id) {
    throw new Error('Colaborador não identificado.');
  }

  const operacao = id
    ? supabase
      .from('rh_arquivos_colaboradores')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single()
    : supabase
      .from('rh_arquivos_colaboradores')
      .insert(payload)
      .select('id')
      .single();

  const { data, error } = await operacao;

  if (error) {
    throw new Error(mensagemErroRh(error, 'Não foi possível salvar o arquivo.'));
  }

  return { id: data?.id || id };
}

export async function excluirArquivoColaboradorRhDp({ id } = {}) {
  const supabase = exigirSupabaseConfigurado();

  if (!id) {
    throw new Error('Arquivo não identificado.');
  }

  const { error } = await supabase
    .from('rh_arquivos_colaboradores')
    .update({ status: 'excluido' })
    .eq('id', id);

  if (error) {
    throw new Error(mensagemErroRh(error, 'Não foi possível excluir o arquivo.'));
  }

  return { ok: true };
}

async function invocarDriveRh({ acao, corpo, arquivo = null }) {
  const supabase = exigirSupabaseConfigurado();
  const { data: sessaoData } = await supabase.auth.getSession();
  const token = sessaoData?.session?.access_token;
  if (!token) throw new Error('Sua sessão expirou. Entre novamente para acessar os arquivos.');

  let body;
  if (arquivo) {
    body = new FormData();
    body.append('action', acao);
    Object.entries(corpo || {}).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null) body.append(chave, String(valor));
    });
    body.append('file', arquivo);
  } else {
    body = JSON.stringify({ action: acao, ...(corpo || {}) });
  }

  const resposta = await fetch(`${obterUrlSupabase()}/functions/v1/rh-drive`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(arquivo ? {} : { 'Content-Type': 'application/json' })
    },
    body
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro?.message || 'Não foi possível concluir a operação no Google Drive.');
  }

  return resposta;
}

export async function enviarArquivoColaboradorRhDp({ arquivo, metadados = {}, arquivoId = null } = {}) {
  if (!(arquivo instanceof File) || !arquivo.size) throw new Error('Selecione um arquivo válido para enviar.');
  const resposta = await invocarDriveRh({
    acao: arquivoId ? 'nova_versao' : 'upload',
    corpo: { ...metadados, arquivo_id: arquivoId || '' },
    arquivo
  });
  return resposta.json();
}

export async function abrirArquivoColaboradorRhDp({ id, disposition = 'inline' } = {}) {
  if (!id) throw new Error('Arquivo não identificado.');
  const resposta = await invocarDriveRh({ acao: 'baixar', corpo: { arquivo_id: id, disposition } });
  const blob = await resposta.blob();
  const nome = decodeURIComponent(resposta.headers.get('x-rh-filename') || 'arquivo');
  return { blob, nome };
}

export async function descartarArquivoColaboradorRhDp({ id, justificativa } = {}) {
  if (!id) throw new Error('Arquivo não identificado.');
  if (String(justificativa || '').trim().length < 8) throw new Error('Informe uma justificativa de pelo menos 8 caracteres.');
  const resposta = await invocarDriveRh({ acao: 'descartar', corpo: { arquivo_id: id, justificativa } });
  return resposta.json();
}

function normalizarMesCompetencia(valor) {
  const texto = String(valor || '').trim();
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(texto)) return null;
  return `${texto.slice(0, 7)}-01`;
}

function normalizarControle(payload = {}) {
  return Object.fromEntries(Object.entries(payload).map(([chave, valor]) => {
    if (['competencia', 'prazo', 'data_referencia', 'comunicado_em', 'ultimo_dia_trabalho'].includes(chave)) {
      return [chave, chave === 'competencia' ? normalizarMesCompetencia(valor) : limparTexto(valor)];
    }
    if (['titulo', 'descricao', 'retorno_resumo', 'divergencia_descricao', 'google_drive_file_id', 'motivo_resumo', 'aviso_previo', 'observacoes'].includes(chave)) {
      return [chave, limparTexto(valor)];
    }
    if (['tipo', 'prioridade', 'status'].includes(chave)) {
      return [chave, limparTexto(valor)?.toLowerCase() || null];
    }
    if (chave === 'google_drive_web_url') {
      return [chave, normalizarUrl(valor)];
    }
    return [chave, valor ?? null];
  }));
}

export async function listarDemandasContabilidadeRhDp() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase
    .from('rh_demandas_contabilidade')
    .select('id, colaborador_id, competencia, tipo, titulo, descricao, prioridade, prazo, status, enviado_em, retorno_em, retorno_resumo, divergencia_descricao, google_drive_web_url, google_drive_file_id, concluido_em, created_at, updated_at, rh_colaboradores(nome_completo)')
    .order('prazo', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível carregar as demandas à contabilidade.'));
  return data || [];
}

export async function listarCompetenciasRhDp() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase
    .from('rh_competencias')
    .select('id, competencia, status, prazo_envio, enviado_em, retorno_em, retorno_resumo, divergencia_descricao, google_drive_web_url, google_drive_file_id, fechado_em, created_at, updated_at, rh_eventos_competencia(id, colaborador_id, tipo, descricao, data_referencia, status, retorno_resumo, divergencia_descricao, rh_colaboradores(nome_completo))')
    .order('competencia', { ascending: false });
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível carregar os fechamentos mensais.'));
  return data || [];
}

export async function salvarDemandaContabilidadeRhDp({ id = null, demanda = {} } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const payload = normalizarControle(demanda);
  const { data, error } = id
    ? await supabase.from('rh_demandas_contabilidade').update(payload).eq('id', id).select('id').single()
    : await supabase.from('rh_demandas_contabilidade').insert(payload).select('id').single();
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível salvar a demanda.'));
  return { id: data?.id || id };
}

export async function salvarCompetenciaRhDp({ id = null, competencia = {} } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const payload = normalizarControle(competencia);
  const { data, error } = id
    ? await supabase.from('rh_competencias').update(payload).eq('id', id).select('id').single()
    : await supabase.from('rh_competencias').insert(payload).select('id').single();
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível salvar o fechamento mensal.'));
  return { id: data?.id || id };
}

export async function salvarEventoCompetenciaRhDp({ id = null, evento = {} } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const payload = normalizarControle(evento);
  const { data, error } = id
    ? await supabase.from('rh_eventos_competencia').update(payload).eq('id', id).select('id').single()
    : await supabase.from('rh_eventos_competencia').insert(payload).select('id').single();
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível salvar o evento da competência.'));
  return { id: data?.id || id };
}

export async function listarDesligamentosRhDp() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase
    .from('rh_desligamentos')
    .select('id, colaborador_id, tipo, motivo_resumo, comunicado_em, ultimo_dia_trabalho, competencia, aviso_previo, observacoes, status, enviado_em, retorno_em, retorno_resumo, divergencia_descricao, concluido_em, created_at, updated_at, rh_colaboradores(nome_completo), rh_checklist_desligamento(id, item_chave, status, concluido_em, observacoes)')
    .order('competencia', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível carregar os desligamentos.'));
  return data || [];
}

export async function salvarDesligamentoRhDp({ id = null, desligamento = {} } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const payload = normalizarControle(desligamento);
  const { data, error } = id
    ? await supabase.from('rh_desligamentos').update(payload).eq('id', id).select('id').single()
    : await supabase.from('rh_desligamentos').insert(payload).select('id').single();
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível salvar o desligamento.'));
  return { id: data?.id || id };
}

export async function salvarChecklistDesligamentoRhDp({ id = null, checklist = {} } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const payload = {
    ...checklist,
    observacoes: limparTexto(checklist.observacoes),
    status: limparTexto(checklist.status)?.toLowerCase() || 'pendente',
    concluido_em: checklist.status === 'concluido' ? new Date().toISOString() : null
  };
  const { data, error } = id
    ? await supabase.from('rh_checklist_desligamento').update(payload).eq('id', id).select('id').single()
    : await supabase.from('rh_checklist_desligamento').insert(payload).select('id').single();
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível salvar a checklist de desligamento.'));
  return { id: data?.id || id };
}

function normalizarFase7(payload = {}) {
  return Object.fromEntries(Object.entries(payload).map(([chave, valor]) => {
    if (['abono_pecuniario', 'comunicacao_emitida', 'requer_acompanhamento'].includes(chave)) return [chave, Boolean(valor)];
    if (['dias_gozo'].includes(chave)) return [chave, valor === '' || valor == null ? null : Number(valor)];
    return [chave, ['periodo_aquisitivo_inicio', 'periodo_aquisitivo_fim', 'inicio_gozo', 'fim_gozo', 'inicio_em', 'previsao_retorno_em', 'retorno_em', 'data_ocorrencia', 'encerrada_em'].includes(chave) ? limparTexto(valor) : limparTexto(valor)];
  }));
}

export async function listarFeriasRhDp() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.from('rh_ferias').select(COLUNAS_FERIAS).order('inicio_gozo', { ascending: false });
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível carregar as férias.'));
  return data || [];
}

export async function salvarFeriasRhDp({ id = null, ferias = {} } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const payload = normalizarFase7(ferias);
  const { data, error } = id
    ? await supabase.from('rh_ferias').update(payload).eq('id', id).select('id').single()
    : await supabase.from('rh_ferias').insert(payload).select('id').single();
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível salvar as férias.'));
  return { id: data?.id || id };
}

export async function listarAfastamentosRhDp() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.from('rh_afastamentos').select(COLUNAS_AFASTAMENTO).order('inicio_em', { ascending: false });
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível carregar os afastamentos.'));
  return data || [];
}

export async function salvarAfastamentoRhDp({ id = null, afastamento = {} } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const payload = normalizarFase7(afastamento);
  const { data, error } = id
    ? await supabase.from('rh_afastamentos').update(payload).eq('id', id).select('id').single()
    : await supabase.from('rh_afastamentos').insert(payload).select('id').single();
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível salvar o afastamento.'));
  return { id: data?.id || id };
}

export async function listarOcorrenciasRhDp() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.from('rh_ocorrencias').select(COLUNAS_OCORRENCIA).order('data_ocorrencia', { ascending: false });
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível carregar as ocorrências.'));
  return data || [];
}

export async function salvarOcorrenciaRhDp({ id = null, ocorrencia = {} } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const payload = normalizarFase7(ocorrencia);
  const { data, error } = id
    ? await supabase.from('rh_ocorrencias').update(payload).eq('id', id).select('id').single()
    : await supabase.from('rh_ocorrencias').insert(payload).select('id').single();
  if (error) throw new Error(mensagemErroRh(error, 'Não foi possível salvar a ocorrência.'));
  return { id: data?.id || id };
}
