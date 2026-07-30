import { exigirSupabaseConfigurado } from '../supabaseClient.js';

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

  const [colaborador, documentos, vinculo, dependentes] = await Promise.all([
    colaboradorPromise,
    documentosPromise,
    vinculoPromise,
    dependentesPromise
  ]);

  const error = colaborador.error || documentos.error || vinculo.error || dependentes.error;
  if (error) {
    throw new Error(mensagemErroRh(error, 'Não foi possível carregar o cadastro.'));
  }

  return {
    colaborador: colaborador.data,
    documentos: documentos.data || {},
    vinculo: vinculo.data || {},
    dependentes: dependentes.data || []
  };
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
