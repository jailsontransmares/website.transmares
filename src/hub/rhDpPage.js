import {
  alterarStatusColaboradorRhDp,
  abrirArquivoColaboradorRhDp,
  descartarArquivoColaboradorRhDp,
  enviarArquivoColaboradorRhDp,
  listarArquivosColaboradorRhDp,
  listarCompetenciasRhDp,
  listarDesligamentosRhDp,
  listarDemandasContabilidadeRhDp,
  listarFeriasRhDp,
  listarAfastamentosRhDp,
  listarOcorrenciasRhDp,
  listarColaboradoresRhDp,
  obterCadastroPessoalRhDp,
  salvarBeneficioRhDp,
  salvarDadosBancariosRhDp,
  salvarChecklistAdmissionalRhDp,
  salvarMovimentacaoRhDp,
  salvarArquivoColaboradorRhDp,
  salvarCompetenciaRhDp,
  salvarDesligamentoRhDp,
  salvarEventoCompetenciaRhDp,
  salvarChecklistDesligamentoRhDp,
  salvarDemandaContabilidadeRhDp,
  salvarFeriasRhDp,
  salvarAfastamentoRhDp,
  salvarOcorrenciaRhDp,
  salvarCadastroPessoalRhDp
} from './services/rhDpService.js';

const LIMITE_POR_PAGINA = 10;
const VIA_CEP_ENDPOINT = 'https://viacep.com.br/ws';

function novoColaborador() {
  return {
    nome_completo: '',
    data_nascimento: '',
    estado_civil: '',
    nacionalidade: 'Brasileira',
    naturalidade: '',
    nome_pai: '',
    nome_mae: '',
    sexo: '',
    escolaridade: '',
    cor_raca: '',
    telefone_celular: '',
    email_contato: '',
    contato_emergencia_nome: '',
    contato_emergencia_telefone: '',
    endereco_logradouro: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_uf: '',
    endereco_cep: '',
    status: 'ativo',
    observacoes: ''
  };
}

function novosDocumentos() {
  return {
    cpf: '',
    identidade_tipo: '',
    identidade_numero: '',
    identidade_data_emissao: '',
    identidade_orgao_emissor: '',
    identidade_uf_emissor: '',
    cnh_categoria: '',
    titulo_eleitor: '',
    zona_eleitoral: '',
    secao_eleitoral: '',
    ctps_numero: '',
    ctps_serie: '',
    ctps_data_expedicao: '',
    ctps_uf: '',
    reservista_numero: '',
    reservista_categoria: '',
    pis_numero: '',
    pis_data_cadastro: ''
  };
}

function novoVinculo() {
  return {
    tipo_vinculo: '',
    data_admissao: '',
    data_desligamento: '',
    cargo: '',
    funcao: '',
    cbo: '',
    departamento: '',
    gestor_responsavel: '',
    situacao: 'ativo',
    tipo_remuneracao: '',
    remuneracao_valor: '',
    modelo_jornada: '',
    carga_horaria_semanal: '',
    horario_entrada: '',
    horario_saida: '',
    intervalo_inicio: '',
    intervalo_fim: '',
    dias_trabalho: '',
    observacoes: ''
  };
}

function novoArquivo(colaboradorId = '') {
  return {
    id: '',
    colaborador_id: colaboradorId,
    categoria: 'documento_pessoal',
    tipo_documento: '',
    nome_arquivo: '',
    descricao: '',
    origem: 'google_drive',
    google_drive_file_id: '',
    google_drive_web_url: '',
    google_drive_preview_url: '',
    google_drive_folder_id: '',
    mime_type: '',
    tamanho_bytes: '',
    data_referencia: '',
    data_validade: '',
    observacoes: ''
  };
}

const CATEGORIAS_ARQUIVO = [
  ['admissao', 'Admissão'],
  ['documento_pessoal', 'Documento pessoal'],
  ['contrato', 'Contrato'],
  ['beneficios', 'Benefícios'],
  ['ferias', 'Férias'],
  ['afastamento', 'Afastamento'],
  ['saude_ocupacional', 'Saúde ocupacional'],
  ['ocorrencia', 'Ocorrência'],
  ['desligamento', 'Desligamento'],
  ['outros', 'Outros']
];

function digitos(valor = '') {
  return String(valor || '').replace(/\D/g, '');
}

function formatarCpf(valor = '') {
  const numero = digitos(valor).slice(0, 11);
  return numero
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function formatarTelefone(valor = '') {
  const numero = digitos(valor).slice(0, 11);
  if (numero.length <= 10) {
    return numero
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return numero
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function formatarCep(valor = '') {
  return digitos(valor).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

function normalizarUf(valor = '') {
  return String(valor || '').trim().toUpperCase().slice(0, 2);
}

function formatarMoeda(valor = '') {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return String(valor || '');
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function cpfValido(valor = '') {
  const cpf = digitos(valor);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = tamanho => {
    let soma = 0;
    for (let indice = 0; indice < tamanho; indice += 1) {
      soma += Number(cpf[indice]) * (tamanho + 1 - indice);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(9) === Number(cpf[9])
    && calcularDigito(10) === Number(cpf[10]);
}

function formatarData(valor = '') {
  if (!valor) return '-';
  const data = new Date(`${valor}T12:00:00`);
  return Number.isNaN(data.getTime()) ? '-' : data.toLocaleDateString('pt-BR');
}

function formatarDataHora(valor = '') {
  if (!valor) return '-';
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? '-'
    : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatarCategoriaArquivo(valor = '') {
  return CATEGORIAS_ARQUIVO.find(([chave]) => chave === valor)?.[1] || 'Outros';
}

function calcularIdade(valor = '') {
  if (!valor) return null;
  const nascimento = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(nascimento.getTime())) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade -= 1;
  return idade;
}

function normalizarBusca(valor = '') {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function criarRhDpController({
  renderShell,
  pode,
  escapeHtml,
  escapeAttr
}) {
  let cepConsultaAtual = {
    cep: '',
    sequencia: 0
  };

  const state = {
    colaboradores: [],
    loading: false,
    message: '',
    messageType: '',
    secao: 'colaboradores',
    demandas: [],
    competencias: [],
    desligamentos: [],
    ferias: [],
    afastamentos: [],
    ocorrencias: [],
    controleLoading: false,
    feriasModal: {
      aberto: false,
      saving: false
    },
    afastamentoModal: {
      aberto: false,
      saving: false
    },
    ocorrenciaModal: {
      aberto: false,
      saving: false
    },
    demandaModal: {
      aberto: false,
      saving: false
    },
    competenciaModal: {
      aberto: false,
      saving: false
    },
    eventoModal: {
      aberto: false,
      saving: false,
      competenciaId: ''
    },
    desligamentoModal: {
      aberto: false,
      saving: false
    },
    busca: '',
    filtroStatus: 'todos',
    pagina: 1,
    modal: criarEstadoModal()
  };

  function criarEstadoModal({
    aberto = false,
    modo = 'view',
    id = '',
    loading = false,
    arquivosLoading = false
  } = {}) {
    return {
      aberto,
      modo,
      id,
      loading,
      saving: false,
      colaborador: novoColaborador(),
      documentos: novosDocumentos(),
      vinculo: novoVinculo(),
      dependentes: [],
      beneficios: [],
      bancarios: {},
      movimentacoes: [],
      checklist: [],
      arquivos: [],
      arquivoForm: novoArquivo(id),
      arquivoEditandoId: '',
      arquivosLoading,
      arquivoSaving: false,
      arquivoMessage: '',
      arquivoMessageType: '',
      erros: {}
    };
  }

  function podeVer() {
    return pode('rh_dp.colaboradores', 'view');
  }

  function podeVerSensiveis() {
    return pode('rh_dp.colaboradores', 'view_sensitive');
  }

  function podeCriar() {
    return pode('rh_dp.colaboradores', 'create') && podeVerSensiveis();
  }

  function podeEditar() {
    return pode('rh_dp.colaboradores', 'update');
  }

  function podeInativar() {
    return podeEditar() && pode('rh_dp.colaboradores', 'archive');
  }

  function podeVerArquivos() {
    return pode('rh_dp.documentos', 'view');
  }

  function podeCriarArquivos() {
    return pode('rh_dp.documentos', 'create');
  }

  function podeEditarArquivos() {
    return pode('rh_dp.documentos', 'update');
  }

  function podeExcluirArquivos() {
    return pode('rh_dp.documentos', 'delete');
  }

  function podeBaixarArquivos() {
    return pode('rh_dp.documentos', 'download');
  }

  function podeVerDemandas() { return pode('rh_dp.demandas_contabilidade', 'view'); }
  function podeCriarDemandas() { return pode('rh_dp.demandas_contabilidade', 'create'); }
  function podeVerFechamentos() { return pode('rh_dp.fechamentos', 'view'); }
  function podeCriarFechamentos() { return pode('rh_dp.fechamentos', 'create'); }
  function podeEditarFechamentos() { return pode('rh_dp.fechamentos', 'update') || pode('rh_dp.fechamentos', 'close'); }
  function podeVerDesligamentos() { return pode('rh_dp.desligamentos', 'view'); }
  function podeCriarDesligamentos() { return pode('rh_dp.desligamentos', 'create'); }
  function podeEditarDesligamentos() { return pode('rh_dp.desligamentos', 'update'); }
  function podeVerDashboard() { return pode('rh_dp.dashboard', 'view'); }
  function podeVerFerias() { return pode('rh_dp.ferias', 'view'); }
  function podeCriarFerias() { return pode('rh_dp.ferias', 'create'); }
  function podeVerOcorrencias() { return pode('rh_dp.ocorrencias', 'view'); }
  function podeCriarOcorrencias() { return pode('rh_dp.ocorrencias', 'create'); }

  function renderNavegacaoInterna() {
    const itens = [
      ['dashboard', 'Dashboard', podeVerDashboard()],
      ['colaboradores', 'Colaboradores', podeVer()],
      ['ferias', 'Férias', podeVerFerias()],
      ['afastamentos', 'Afastamentos e ocorrências', podeVerOcorrencias()],
      ['demandas', 'Demandas à contabilidade', podeVerDemandas()],
      ['fechamentos', 'Fechamento mensal', podeVerFechamentos()],
      ['desligamentos', 'Desligamentos', podeVerDesligamentos()]
    ].filter(([, , permitido]) => permitido);
    return `<div class="rh-section-tabs">${itens.map(([id, nome]) => `<button type="button" class="secondary-btn ${state.secao === id ? 'is-active' : ''}" onclick="hubRhDpAbrirSecao('${id}')">${nome}</button>`).join('')}</div>`;
  }

  function nomeColaborador(id) {
    return state.colaboradores.find(item => item.id === id)?.nome_completo || 'Colaborador não localizado';
  }

  function opcoesColaboradores() {
    return state.colaboradores.filter(item => item.status !== 'inativo').map(item => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.nome_completo)}</option>`).join('');
  }

  function renderFerias() {
    if (!podeVerFerias()) return '<div class="rh-empty-state"><strong>Acesso não liberado</strong><p>Seu perfil não possui acesso às férias.</p></div>';
    const abertas = state.ferias.filter(item => !['confirmado_contabilidade', 'cancelado'].includes(item.status));
    return `
      <section class="admin-panel rh-panel">
        <div class="admin-panel-header rh-panel-header">
          <div>
            <h2>Férias</h2>
            <p>Planejamento, comunicação e confirmação pela contabilidade.</p>
          </div>
          ${podeCriarFerias() ? '<button class="save-btn" type="button" data-rh-action="open-ferias-modal">Planejar férias</button>' : ''}
        </div>
        <p class="admin-message rh-internal-notice">Não calcula direito, abono ou pagamento de férias. A contabilidade é a fonte oficial.</p>
        ${state.message ? `<p class="admin-message ${state.messageType === 'error' ? 'error' : 'success'}">${escapeHtml(state.message)}</p>` : ''}
        <div class="rh-summary-grid">
          <article class="rh-summary-card"><span>Registros em aberto</span><strong>${abertas.length}</strong></article>
          <article class="rh-summary-card"><span>Em divergência</span><strong>${state.ferias.filter(item => item.status === 'divergente').length}</strong></article>
          <article class="rh-summary-card"><span>Confirmados</span><strong>${state.ferias.filter(item => item.status === 'confirmado_contabilidade').length}</strong></article>
        </div>
        ${state.controleLoading
          ? '<p class="quick-link-empty">Carregando férias...</p>'
          : `<div class="rh-control-list">${state.ferias.length ? state.ferias.map(item => `<article><div><strong>${escapeHtml(item.rh_colaboradores?.nome_completo || nomeColaborador(item.colaborador_id))}</strong><span>${formatarData(item.inicio_gozo)} a ${formatarData(item.fim_gozo)} · ${item.dias_gozo} dia(s)</span></div><span class="status-badge">${escapeHtml(item.status.replaceAll('_',' '))}</span></article>`).join('') : '<p class="quick-link-empty">Nenhum planejamento de férias registrado.</p>'}</div>`}
      </section>
      ${renderModalFerias()}
    `;
  }

  function renderFormularioFerias() {
    return `
      <div class="rh-form-grid">
        <label><span>Colaborador *</span><select id="rh_ferias_colaborador" class="config-input"><option value="">Selecione</option>${opcoesColaboradores()}</select></label>
        <label><span>Início do período aquisitivo *</span><input id="rh_ferias_aquisitivo_inicio" class="config-input" type="date"></label>
        <label><span>Fim do período aquisitivo *</span><input id="rh_ferias_aquisitivo_fim" class="config-input" type="date"></label>
        <label><span>Início do gozo *</span><input id="rh_ferias_inicio" class="config-input" type="date"></label>
        <label><span>Fim do gozo *</span><input id="rh_ferias_fim" class="config-input" type="date"></label>
        <label><span>Dias planejados *</span><input id="rh_ferias_dias" class="config-input" type="number" min="1" max="30"></label>
        <label class="rh-checkbox"><input id="rh_ferias_abono" type="checkbox"> <span>Abono pecuniário solicitado</span></label>
        <label class="rh-span-2"><span>Observações</span><textarea id="rh_ferias_observacoes" class="config-input rh-textarea" rows="2"></textarea></label>
      </div>
    `;
  }

  function renderModalFerias() {
    if (!state.feriasModal.aberto) return '';

    return `
      <div class="modal-backdrop rh-modal-backdrop" role="dialog" aria-modal="true" aria-label="Planejar férias">
        <section class="small-modal rh-modal">
          <div class="small-modal-header">
            <div>
              <h3>Planejar férias</h3>
              <p>Registro interno para conferência e retorno da contabilidade.</p>
            </div>
            <button class="secondary-btn" type="button" data-rh-action="close-ferias-modal" ${state.feriasModal.saving ? 'disabled' : ''}>Fechar</button>
          </div>
          <div class="rh-modal-content">
            ${state.message && state.messageType === 'error' ? `<p class="admin-message error">${escapeHtml(state.message)}</p>` : ''}
            ${renderFormularioFerias()}
          </div>
          <div class="small-modal-actions rh-modal-actions">
            <button class="secondary-btn" type="button" data-rh-action="close-ferias-modal" ${state.feriasModal.saving ? 'disabled' : ''}>Cancelar</button>
            <button class="save-btn" type="button" data-rh-action="save-ferias-modal" ${state.feriasModal.saving ? 'disabled' : ''}>${state.feriasModal.saving ? 'Salvando...' : 'Registrar planejamento'}</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderAfastamentosOcorrencias() {
    if (!podeVerOcorrencias()) return '<div class="rh-empty-state"><strong>Acesso não liberado</strong><p>Seu perfil não possui acesso a afastamentos e ocorrências.</p></div>';
    const emAberto = state.afastamentos.filter(item => !['retorno_confirmado', 'cancelado'].includes(item.status));
    return `
      <section class="admin-panel rh-panel">
        <div class="admin-panel-header rh-panel-header">
          <div>
            <h2>Afastamentos e ocorrências</h2>
            <p>Registro, acompanhamento de retorno e providências internas.</p>
          </div>
          ${podeCriarOcorrencias() ? '<div class="rh-row-actions"><button class="save-btn" type="button" data-rh-action="open-afastamento-modal">Novo afastamento</button><button class="secondary-btn" type="button" data-rh-action="open-ocorrencia-modal">Nova ocorrência</button></div>' : ''}
        </div>
        <p class="admin-message rh-internal-notice">Acidentes e doenças ocupacionais são acompanhados aqui, mas medicina ocupacional e obrigações oficiais ficam fora do Hub.</p>
        ${state.message ? `<p class="admin-message ${state.messageType === 'error' ? 'error' : 'success'}">${escapeHtml(state.message)}</p>` : ''}
        <div class="rh-summary-grid">
          <article class="rh-summary-card"><span>Afastamentos em acompanhamento</span><strong>${emAberto.length}</strong></article>
          <article class="rh-summary-card"><span>Ocorrências abertas</span><strong>${state.ocorrencias.filter(item => !item.encerrada_em).length}</strong></article>
          <article class="rh-summary-card"><span>Com divergência</span><strong>${state.afastamentos.filter(item => item.status === 'divergente').length}</strong></article>
        </div>
        <div class="rh-control-list">
          ${state.afastamentos.length ? state.afastamentos.map(item => `<article><div><strong>${escapeHtml(item.rh_colaboradores?.nome_completo || nomeColaborador(item.colaborador_id))} · ${escapeHtml(item.tipo.replaceAll('_',' '))}</strong><span>Início ${formatarData(item.inicio_em)}${item.previsao_retorno_em ? ` · retorno previsto ${formatarData(item.previsao_retorno_em)}` : ''}</span></div><span class="status-badge">${escapeHtml(item.status.replaceAll('_',' '))}</span></article>`).join('') : '<p class="quick-link-empty">Nenhum afastamento registrado.</p>'}
          ${state.ocorrencias.length ? state.ocorrencias.map(item => `<article><div><strong>${escapeHtml(item.titulo)} · ${escapeHtml(item.rh_colaboradores?.nome_completo || nomeColaborador(item.colaborador_id))}</strong><span>${formatarData(item.data_ocorrencia)} · ${escapeHtml(item.categoria.replaceAll('_',' '))}</span></div><span class="status-badge">${escapeHtml(item.status.replaceAll('_',' '))}</span></article>`).join('') : '<p class="quick-link-empty">Nenhuma ocorrência registrada.</p>'}
        </div>
      </section>
      ${renderModalAfastamento()}
      ${renderModalOcorrencia()}
    `;
  }

  function renderFormularioAfastamento() {
    return `
      <div class="rh-form-grid">
        <label><span>Colaborador *</span><select id="rh_afast_colaborador" class="config-input"><option value="">Selecione</option>${opcoesColaboradores()}</select></label>
        <label><span>Tipo *</span><select id="rh_afast_tipo" class="config-input"><option value="">Selecione</option><option value="atestado_medico">Atestado médico</option><option value="acidente_trabalho">Acidente de trabalho</option><option value="doenca_ocupacional">Doença ocupacional</option><option value="licenca_maternidade">Licença-maternidade</option><option value="licenca_paternidade">Licença-paternidade</option><option value="outro">Outro</option></select></label>
        <label><span>Início *</span><input id="rh_afast_inicio" class="config-input" type="date"></label>
        <label><span>Previsão de retorno</span><input id="rh_afast_previsao" class="config-input" type="date"></label>
        <label><span>Referência CID (opcional)</span><input id="rh_afast_cid" class="config-input" type="text"></label>
        <label class="rh-checkbox"><input id="rh_afast_comunicacao" type="checkbox"> <span>Comunicação emitida</span></label>
        <label class="rh-span-2"><span>Motivo / resumo *</span><textarea id="rh_afast_motivo" class="config-input rh-textarea" rows="2"></textarea></label>
      </div>
    `;
  }

  function renderFormularioOcorrencia() {
    return `
      <div class="rh-form-grid">
        <label><span>Colaborador *</span><select id="rh_ocorrencia_colaborador" class="config-input"><option value="">Selecione</option>${opcoesColaboradores()}</select></label>
        <label><span>Categoria *</span><select id="rh_ocorrencia_categoria" class="config-input"><option value="">Selecione</option><option value="acidente_trabalho">Acidente de trabalho</option><option value="doenca_ocupacional">Doença ocupacional</option><option value="disciplinar">Disciplinar</option><option value="seguranca">Segurança</option><option value="administrativa">Administrativa</option><option value="outro">Outro</option></select></label>
        <label><span>Data *</span><input id="rh_ocorrencia_data" class="config-input" type="date"></label>
        <label class="rh-span-2"><span>Título *</span><input id="rh_ocorrencia_titulo" class="config-input" type="text"></label>
        <label class="rh-span-2"><span>Descrição *</span><textarea id="rh_ocorrencia_descricao" class="config-input rh-textarea" rows="2"></textarea></label>
        <label class="rh-span-2"><span>Providências</span><textarea id="rh_ocorrencia_providencias" class="config-input rh-textarea" rows="2"></textarea></label>
      </div>
    `;
  }

  function renderModalAfastamento() {
    if (!state.afastamentoModal.aberto) return '';

    return `
      <div class="modal-backdrop rh-modal-backdrop" role="dialog" aria-modal="true" aria-label="Novo afastamento">
        <section class="small-modal rh-modal">
          <div class="small-modal-header">
            <div><h3>Novo afastamento</h3><p>Registro interno para acompanhamento e conferência.</p></div>
            <button class="secondary-btn" type="button" data-rh-action="close-afastamento-modal" ${state.afastamentoModal.saving ? 'disabled' : ''}>Fechar</button>
          </div>
          <div class="rh-modal-content">
            ${state.message && state.messageType === 'error' ? `<p class="admin-message error">${escapeHtml(state.message)}</p>` : ''}
            ${renderFormularioAfastamento()}
          </div>
          <div class="small-modal-actions rh-modal-actions">
            <button class="secondary-btn" type="button" data-rh-action="close-afastamento-modal" ${state.afastamentoModal.saving ? 'disabled' : ''}>Cancelar</button>
            <button class="save-btn" type="button" data-rh-action="save-afastamento-modal" ${state.afastamentoModal.saving ? 'disabled' : ''}>${state.afastamentoModal.saving ? 'Salvando...' : 'Registrar afastamento'}</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderModalOcorrencia() {
    if (!state.ocorrenciaModal.aberto) return '';

    return `
      <div class="modal-backdrop rh-modal-backdrop" role="dialog" aria-modal="true" aria-label="Nova ocorrência">
        <section class="small-modal rh-modal">
          <div class="small-modal-header">
            <div><h3>Nova ocorrência</h3><p>Registro interno de ocorrência e providências.</p></div>
            <button class="secondary-btn" type="button" data-rh-action="close-ocorrencia-modal" ${state.ocorrenciaModal.saving ? 'disabled' : ''}>Fechar</button>
          </div>
          <div class="rh-modal-content">
            ${state.message && state.messageType === 'error' ? `<p class="admin-message error">${escapeHtml(state.message)}</p>` : ''}
            ${renderFormularioOcorrencia()}
          </div>
          <div class="small-modal-actions rh-modal-actions">
            <button class="secondary-btn" type="button" data-rh-action="close-ocorrencia-modal" ${state.ocorrenciaModal.saving ? 'disabled' : ''}>Cancelar</button>
            <button class="save-btn" type="button" data-rh-action="save-ocorrencia-modal" ${state.ocorrenciaModal.saving ? 'disabled' : ''}>${state.ocorrenciaModal.saving ? 'Salvando...' : 'Registrar ocorrência'}</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderDemandas() {
    if (!podeVerDemandas()) return '<div class="rh-empty-state"><strong>Acesso não liberado</strong><p>Seu perfil não possui acesso às demandas à contabilidade.</p></div>';
    const abertas = state.demandas.filter(item => !['concluido', 'cancelado'].includes(item.status));
    return `
      <section class="admin-panel rh-panel">
        <div class="admin-panel-header rh-panel-header">
          <div>
            <h2>Demandas à contabilidade</h2>
            <p>Controle de solicitações, prazos, retornos e divergências.</p>
          </div>
          ${podeCriarDemandas() ? '<button class="save-btn" type="button" data-rh-action="open-demanda-modal">Nova demanda</button>' : ''}
        </div>
        <p class="admin-message rh-internal-notice">Esta área não transmite eventos oficiais; ela organiza a comunicação e a conferência interna.</p>
        ${state.message ? `<p class="admin-message ${state.messageType === 'error' ? 'error' : 'success'}">${escapeHtml(state.message)}</p>` : ''}
        <div class="rh-summary-grid">
          <article class="rh-summary-card"><span>Em aberto</span><strong>${abertas.length}</strong></article>
          <article class="rh-summary-card"><span>Com prazo vencido</span><strong>${abertas.filter(item => item.prazo && item.prazo < new Date().toISOString().slice(0, 10)).length}</strong></article>
          <article class="rh-summary-card"><span>Com divergência</span><strong>${state.demandas.filter(item => item.divergencia_descricao).length}</strong></article>
        </div>
        ${state.controleLoading
          ? '<p class="quick-link-empty">Carregando demandas...</p>'
          : `<div class="rh-control-list">${state.demandas.length ? state.demandas.map(item => `<article><div><strong>${escapeHtml(item.titulo)}</strong><span>${escapeHtml(item.rh_colaboradores?.nome_completo || formatarCategoriaArquivo(item.tipo))}${item.prazo ? ` · prazo ${formatarData(item.prazo)}` : ''}</span></div><span class="status-badge">${escapeHtml(item.status.replaceAll('_', ' '))}</span></article>`).join('') : '<p class="quick-link-empty">Nenhuma demanda registrada.</p>'}</div>`}
      </section>
      ${renderModalDemanda()}
    `;
  }

  function renderFormularioDemanda() {
    return `
      <div class="rh-form-grid">
        <label><span>Tipo *</span><select id="rh_demanda_tipo" class="config-input"><option value="alteracao_cadastral">Alteração cadastral</option><option value="ferias">Férias</option><option value="afastamento">Afastamento</option><option value="beneficio">Benefício</option><option value="remuneracao">Remuneração</option><option value="outro">Outro</option></select></label>
        <label><span>Prioridade</span><select id="rh_demanda_prioridade" class="config-input"><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option><option value="baixa">Baixa</option></select></label>
        <label class="rh-span-2"><span>Título *</span><input id="rh_demanda_titulo" class="config-input" type="text" placeholder="Ex.: Alteração de jornada"></label>
        <label><span>Competência</span><input id="rh_demanda_competencia" class="config-input" type="month"></label>
        <label><span>Prazo</span><input id="rh_demanda_prazo" class="config-input" type="date"></label>
        <label class="rh-span-2"><span>Descrição</span><textarea id="rh_demanda_descricao" class="config-input rh-textarea" rows="2"></textarea></label>
      </div>
    `;
  }

  function renderModalDemanda() {
    if (!state.demandaModal.aberto) return '';

    return `
      <div class="modal-backdrop rh-modal-backdrop" role="dialog" aria-modal="true" aria-label="Nova demanda">
        <section class="small-modal rh-modal">
          <div class="small-modal-header">
            <div><h3>Nova demanda</h3><p>Solicitação interna para organização e conferência com a contabilidade.</p></div>
            <button class="secondary-btn" type="button" data-rh-action="close-demanda-modal" ${state.demandaModal.saving ? 'disabled' : ''}>Fechar</button>
          </div>
          <div class="rh-modal-content">
            ${state.message && state.messageType === 'error' ? `<p class="admin-message error">${escapeHtml(state.message)}</p>` : ''}
            ${renderFormularioDemanda()}
          </div>
          <div class="small-modal-actions rh-modal-actions">
            <button class="secondary-btn" type="button" data-rh-action="close-demanda-modal" ${state.demandaModal.saving ? 'disabled' : ''}>Cancelar</button>
            <button class="save-btn" type="button" data-rh-action="save-demanda-modal" ${state.demandaModal.saving ? 'disabled' : ''}>${state.demandaModal.saving ? 'Salvando...' : 'Registrar demanda'}</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderFechamentos() {
    if (!podeVerFechamentos()) return '<div class="rh-empty-state"><strong>Acesso não liberado</strong><p>Seu perfil não possui acesso ao fechamento mensal.</p></div>';
    const emAberto = state.competencias.filter(item => item.status !== 'concluido').length;
    const eventosPendentes = state.competencias.flatMap(item => item.rh_eventos_competencia || []).filter(item => ['pendente', 'enviado', 'divergencia'].includes(item.status)).length;
    return `
      <section class="admin-panel rh-panel">
        <div class="admin-panel-header rh-panel-header">
          <div>
            <h2>Fechamento mensal</h2>
            <p>Competências, eventos enviados, retorno e conferência com a contabilidade.</p>
          </div>
          ${podeCriarFechamentos() ? '<button class="save-btn" type="button" data-rh-action="open-competencia-modal">Nova competência</button>' : ''}
        </div>
        <p class="admin-message rh-internal-notice">Não há cálculo de folha, impostos ou transmissão ao eSocial neste módulo.</p>
        ${state.message ? `<p class="admin-message ${state.messageType === 'error' ? 'error' : 'success'}">${escapeHtml(state.message)}</p>` : ''}
        <div class="rh-summary-grid">
          <article class="rh-summary-card"><span>Competências abertas</span><strong>${emAberto}</strong></article>
          <article class="rh-summary-card"><span>Eventos pendentes</span><strong>${eventosPendentes}</strong></article>
          <article class="rh-summary-card"><span>Com divergência</span><strong>${state.competencias.filter(item => item.status === 'com_divergencia').length}</strong></article>
        </div>
        ${state.controleLoading
          ? '<p class="quick-link-empty">Carregando competências...</p>'
          : `<div class="rh-control-list">${state.competencias.length ? state.competencias.map(item => { const eventos = item.rh_eventos_competencia || []; return `<article><div><strong>${formatarData(item.competencia).slice(3)}</strong><span>${eventos.length} evento(s) · ${item.prazo_envio ? `prazo ${formatarData(item.prazo_envio)}` : 'sem prazo informado'}</span>${eventos.length ? `<small>${eventos.map(evento => `${escapeHtml(evento.tipo.replaceAll('_',' '))}: ${escapeHtml(evento.rh_colaboradores?.nome_completo || evento.descricao)} (${escapeHtml(evento.status)})${podeEditarFechamentos() && !['confirmado','dispensado'].includes(evento.status) ? ` <button type="button" class="icon-action-btn" onclick="hubRhDpAtualizarEvento('${evento.id}')">Atualizar</button>` : ''}`).join(' · ')}</small>` : ''}</div><div class="rh-row-actions"><span class="status-badge">${escapeHtml(item.status.replaceAll('_', ' '))}</span>${podeEditarFechamentos() ? `<button type="button" class="icon-action-btn" data-rh-action="open-evento-modal" data-competencia-id="${escapeAttr(item.id)}">Evento</button><button type="button" class="icon-action-btn" ${eventos.some(evento => ['pendente','enviado','divergencia'].includes(evento.status)) ? 'disabled' : ''} onclick="hubRhDpConcluirCompetencia('${item.id}')">Concluir</button>` : ''}</div></article>`; }).join('') : '<p class="quick-link-empty">Nenhuma competência aberta.</p>'}</div>`}
      </section>
      ${renderModalCompetencia()}
      ${renderModalEvento()}
    `;
  }

  function renderFormularioCompetencia() {
    return `
      <div class="rh-form-grid">
        <label><span>Competência *</span><input id="rh_competencia_mes" class="config-input" type="month" required></label>
        <label><span>Prazo de envio</span><input id="rh_competencia_prazo" class="config-input" type="date"></label>
      </div>
    `;
  }

  function renderFormularioEvento() {
    return `
      <div class="rh-form-grid">
        <label><span>Tipo *</span><select id="rh_evento_tipo" class="config-input"><option value="admissao">Admissão</option><option value="alteracao_cadastral">Alteração cadastral</option><option value="ferias">Férias</option><option value="afastamento">Afastamento</option><option value="desligamento">Desligamento</option><option value="beneficio">Benefício</option><option value="remuneracao">Remuneração</option><option value="variavel">Variável</option><option value="outro">Outro</option></select></label>
        <label class="rh-span-2"><span>Descrição *</span><textarea id="rh_evento_descricao" class="config-input rh-textarea" rows="3"></textarea></label>
      </div>
    `;
  }

  function renderModalCompetencia() {
    if (!state.competenciaModal.aberto) return '';

    return `
      <div class="modal-backdrop rh-modal-backdrop" role="dialog" aria-modal="true" aria-label="Nova competência">
        <section class="small-modal rh-modal">
          <div class="small-modal-header">
            <div><h3>Nova competência</h3><p>Abertura do ciclo mensal para preparação e conferência.</p></div>
            <button class="secondary-btn" type="button" data-rh-action="close-competencia-modal" ${state.competenciaModal.saving ? 'disabled' : ''}>Fechar</button>
          </div>
          <div class="rh-modal-content">
            ${state.message && state.messageType === 'error' ? `<p class="admin-message error">${escapeHtml(state.message)}</p>` : ''}
            ${renderFormularioCompetencia()}
          </div>
          <div class="small-modal-actions rh-modal-actions">
            <button class="secondary-btn" type="button" data-rh-action="close-competencia-modal" ${state.competenciaModal.saving ? 'disabled' : ''}>Cancelar</button>
            <button class="save-btn" type="button" data-rh-action="save-competencia-modal" ${state.competenciaModal.saving ? 'disabled' : ''}>${state.competenciaModal.saving ? 'Salvando...' : 'Abrir competência'}</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderModalEvento() {
    if (!state.eventoModal.aberto) return '';

    return `
      <div class="modal-backdrop rh-modal-backdrop" role="dialog" aria-modal="true" aria-label="Novo evento">
        <section class="small-modal rh-modal">
          <div class="small-modal-header">
            <div><h3>Novo evento</h3><p>Evento para conferência com a contabilidade dentro da competência.</p></div>
            <button class="secondary-btn" type="button" data-rh-action="close-evento-modal" ${state.eventoModal.saving ? 'disabled' : ''}>Fechar</button>
          </div>
          <div class="rh-modal-content">
            ${state.message && state.messageType === 'error' ? `<p class="admin-message error">${escapeHtml(state.message)}</p>` : ''}
            ${renderFormularioEvento()}
          </div>
          <div class="small-modal-actions rh-modal-actions">
            <button class="secondary-btn" type="button" data-rh-action="close-evento-modal" ${state.eventoModal.saving ? 'disabled' : ''}>Cancelar</button>
            <button class="save-btn" type="button" data-rh-action="save-evento-modal" ${state.eventoModal.saving ? 'disabled' : ''}>${state.eventoModal.saving ? 'Salvando...' : 'Incluir evento'}</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderDesligamentos() {
    if (!podeVerDesligamentos()) return '<div class="rh-empty-state"><strong>Acesso não liberado</strong><p>Seu perfil não possui acesso aos desligamentos.</p></div>';
    const abertos = state.desligamentos.filter(item => !['concluido', 'cancelado'].includes(item.status));
    return `
      <section class="admin-panel rh-panel">
        <div class="admin-panel-header rh-panel-header">
          <div>
            <h2>Desligamentos</h2>
            <p>Controle do processo interno, comunicação e checklist de saída.</p>
          </div>
          ${podeCriarDesligamentos() ? '<button class="save-btn" type="button" data-rh-action="open-desligamento-modal">Novo desligamento</button>' : ''}
        </div>
        <p class="admin-message rh-internal-notice">A contabilidade continua responsável por cálculos, documentos e registros oficiais.</p>
        ${state.message ? `<p class="admin-message ${state.messageType === 'error' ? 'error' : 'success'}">${escapeHtml(state.message)}</p>` : ''}
        <div class="rh-summary-grid">
          <article class="rh-summary-card"><span>Em andamento</span><strong>${abertos.length}</strong></article>
          <article class="rh-summary-card"><span>Aguardando retorno</span><strong>${state.desligamentos.filter(item => item.status === 'aguardando_retorno').length}</strong></article>
          <article class="rh-summary-card"><span>Com divergência</span><strong>${state.desligamentos.filter(item => item.status === 'divergente').length}</strong></article>
        </div>
        ${state.controleLoading
          ? '<p class="quick-link-empty">Carregando desligamentos...</p>'
          : `<div class="rh-control-list">${state.desligamentos.length ? state.desligamentos.map(item => `<article><div><strong>${escapeHtml(item.rh_colaboradores?.nome_completo || nomeColaborador(item.colaborador_id))}</strong><span>${escapeHtml(item.tipo.replaceAll('_',' '))} · competência ${formatarData(item.competencia).slice(3)}${item.ultimo_dia_trabalho ? ` · último dia ${formatarData(item.ultimo_dia_trabalho)}` : ''}</span><small>${(item.rh_checklist_desligamento || []).filter(check => check.status === 'concluido').length}/6 itens da checklist concluídos</small></div><div class="rh-row-actions"><span class="status-badge">${escapeHtml(item.status.replaceAll('_',' '))}</span>${podeEditarDesligamentos() ? `<button type="button" class="icon-action-btn" onclick="hubRhDpConcluirChecklistDesligamento('${item.id}')">Checklist</button>` : ''}</div></article>`).join('') : '<p class="quick-link-empty">Nenhum desligamento registrado.</p>'}</div>`}
      </section>
      ${renderModalDesligamento()}
    `;
  }

  function renderFormularioDesligamento() {
    return `
      <div class="rh-form-grid">
        <label><span>Colaborador *</span><select id="rh_desligamento_colaborador" class="config-input"><option value="">Selecione</option>${opcoesColaboradores()}</select></label>
        <label><span>Tipo *</span><select id="rh_desligamento_tipo" class="config-input"><option value="pedido_colaborador">Pedido do colaborador</option><option value="iniciativa_empresa">Iniciativa da empresa</option><option value="termino_contrato">Término de contrato</option><option value="acordo">Acordo</option><option value="aposentadoria">Aposentadoria</option><option value="outro">Outro</option></select></label>
        <label><span>Competência *</span><input id="rh_desligamento_competencia" class="config-input" type="month"></label>
        <label><span>Último dia de trabalho</span><input id="rh_desligamento_ultimo_dia" class="config-input" type="date"></label>
        <label><span>Aviso prévio</span><select id="rh_desligamento_aviso" class="config-input"><option value="">Não informado</option><option value="trabalhado">Trabalhado</option><option value="indenizado">Indenizado</option><option value="dispensado">Dispensado</option><option value="nao_aplicavel">Não aplicável</option></select></label>
        <label class="rh-span-2"><span>Resumo / motivo *</span><textarea id="rh_desligamento_motivo" class="config-input rh-textarea" rows="2"></textarea></label>
      </div>
    `;
  }

  function renderModalDesligamento() {
    if (!state.desligamentoModal.aberto) return '';

    return `
      <div class="modal-backdrop rh-modal-backdrop" role="dialog" aria-modal="true" aria-label="Novo desligamento">
        <section class="small-modal rh-modal">
          <div class="small-modal-header">
            <div><h3>Novo desligamento</h3><p>Registro interno do processo de saída para acompanhamento.</p></div>
            <button class="secondary-btn" type="button" data-rh-action="close-desligamento-modal" ${state.desligamentoModal.saving ? 'disabled' : ''}>Fechar</button>
          </div>
          <div class="rh-modal-content">
            ${state.message && state.messageType === 'error' ? `<p class="admin-message error">${escapeHtml(state.message)}</p>` : ''}
            ${renderFormularioDesligamento()}
          </div>
          <div class="small-modal-actions rh-modal-actions">
            <button class="secondary-btn" type="button" data-rh-action="close-desligamento-modal" ${state.desligamentoModal.saving ? 'disabled' : ''}>Cancelar</button>
            <button class="save-btn" type="button" data-rh-action="save-desligamento-modal" ${state.desligamentoModal.saving ? 'disabled' : ''}>${state.desligamentoModal.saving ? 'Salvando...' : 'Registrar desligamento'}</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderDashboard() {
    const ativos = state.colaboradores.filter(item => item.status === 'ativo').length;
    const feriasAbertas = state.ferias.filter(item => !['confirmado_contabilidade','cancelado'].includes(item.status)).length;
    const afastamentos = state.afastamentos.filter(item => !['retorno_confirmado','cancelado'].includes(item.status)).length;
    const pendencias = state.demandas.filter(item => !['concluido','cancelado'].includes(item.status)).length + state.competencias.flatMap(item => item.rh_eventos_competencia || []).filter(item => ['pendente','enviado','divergencia'].includes(item.status)).length;
    return `<section class="admin-panel rh-panel"><div class="admin-panel-header rh-panel-header"><div><h2>Dashboard RH & DP</h2><p>Indicadores operacionais obtidos apenas dos registros aos quais seu perfil possui acesso.</p></div></div><p class="admin-message rh-internal-notice">Painel de controle interno; não representa folha, indicadores legais ou registros oficiais.</p><div class="rh-summary-grid"><article class="rh-summary-card"><span>Colaboradores ativos</span><strong>${ativos}</strong></article><article class="rh-summary-card"><span>Férias planejadas</span><strong>${feriasAbertas}</strong></article><article class="rh-summary-card"><span>Afastamentos em acompanhamento</span><strong>${afastamentos}</strong></article><article class="rh-summary-card"><span>Pendências operacionais</span><strong>${pendencias}</strong></article></div></section>`;
  }

  function colaboradoresFiltrados() {
    const busca = normalizarBusca(state.busca);
    return state.colaboradores.filter(item => {
      const atendeStatus = state.filtroStatus === 'todos' || item.status === state.filtroStatus;
      if (!atendeStatus) return false;
      if (!busca) return true;

      return [
        item.nome_completo,
        item.telefone_celular,
        item.email_contato,
        item.endereco_cidade
      ].some(valor => normalizarBusca(valor).includes(busca));
    });
  }

  function resumo() {
    return state.colaboradores.reduce((acc, item) => {
      acc.total += 1;
      if (item.status === 'inativo') acc.inativos += 1;
      else acc.ativos += 1;
      return acc;
    }, { total: 0, ativos: 0, inativos: 0 });
  }

  function renderResumo() {
    const dados = resumo();
    return `
      <div class="rh-summary-grid" aria-label="Resumo dos colaboradores">
        <article class="rh-summary-card">
          <span>Total cadastrado</span>
          <strong>${dados.total}</strong>
        </article>
        <article class="rh-summary-card">
          <span>Ativos no cadastro</span>
          <strong>${dados.ativos}</strong>
        </article>
        <article class="rh-summary-card">
          <span>Inativos no cadastro</span>
          <strong>${dados.inativos}</strong>
        </article>
      </div>
    `;
  }

  function renderTabela() {
    const filtrados = colaboradoresFiltrados();
    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / LIMITE_POR_PAGINA));
    state.pagina = Math.min(state.pagina, totalPaginas);
    const inicio = (state.pagina - 1) * LIMITE_POR_PAGINA;
    const pagina = filtrados.slice(inicio, inicio + LIMITE_POR_PAGINA);

    if (!pagina.length) {
      return `
        <div class="rh-empty-state">
          <strong>Nenhum colaborador encontrado</strong>
          <p>${state.colaboradores.length ? 'Revise os filtros aplicados.' : 'Inclua o primeiro cadastro pessoal do módulo.'}</p>
        </div>
      `;
    }

    return `
      <div class="rh-table-wrap">
        <div class="rh-table rh-table-header" role="row">
          <span>Colaborador</span>
          <span>Contato</span>
          <span>Nascimento</span>
          <span>Status</span>
          <span>Atualização</span>
          <span>Ações</span>
        </div>
        ${pagina.map(item => renderLinha(item)).join('')}
      </div>
      ${totalPaginas > 1 ? `
        <div class="rh-pagination">
          <span>${filtrados.length} registros</span>
          <div>
            <button class="secondary-btn" type="button" onclick="hubRhDpSelecionarPagina(${state.pagina - 1})" ${state.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
            <span>Página ${state.pagina} de ${totalPaginas}</span>
            <button class="secondary-btn" type="button" onclick="hubRhDpSelecionarPagina(${state.pagina + 1})" ${state.pagina >= totalPaginas ? 'disabled' : ''}>Próxima</button>
          </div>
        </div>
      ` : ''}
    `;
  }

  function renderLinha(item) {
    const idade = calcularIdade(item.data_nascimento);
    const contato = item.telefone_celular || item.email_contato || '-';
    const status = item.status === 'inativo' ? 'inativo' : 'ativo';

    return `
      <article class="rh-table rh-table-row" role="row">
        <div class="rh-person-cell">
          <strong>${escapeHtml(item.nome_completo || '-')}</strong>
          <span>${escapeHtml(item.endereco_cidade || 'Cidade não informada')}</span>
        </div>
        <span>${escapeHtml(contato)}</span>
        <span>${escapeHtml(formatarData(item.data_nascimento))}${idade == null ? '' : `<small>${idade} anos</small>`}</span>
        <span><span class="status-badge ${status}">${status}</span></span>
        <span>${escapeHtml(formatarDataHora(item.updated_at))}</span>
        <div class="rh-row-actions">
          <button class="icon-action-btn" type="button" title="Visualizar" aria-label="Visualizar ${escapeAttr(item.nome_completo)}" onclick="hubRhDpAbrirCadastro('${escapeAttr(item.id)}', 'view')">Ver</button>
          ${podeEditar() ? `<button class="icon-action-btn" type="button" title="Editar" aria-label="Editar ${escapeAttr(item.nome_completo)}" onclick="hubRhDpAbrirCadastro('${escapeAttr(item.id)}', 'edit')">Editar</button>` : ''}
          ${podeInativar() ? `
            <button class="icon-action-btn ${status === 'ativo' ? 'danger-text' : ''}" type="button" onclick="hubRhDpAlterarStatus('${escapeAttr(item.id)}', '${status === 'ativo' ? 'inativo' : 'ativo'}')">
              ${status === 'ativo' ? 'Inativar' : 'Reativar'}
            </button>
          ` : ''}
        </div>
      </article>
    `;
  }

  function renderToolbar() {
    return `
      <div class="rh-toolbar">
        <label class="rh-search">
          <span>Buscar</span>
          <input
            id="rh_dp_busca"
            class="config-input"
            type="search"
            value="${escapeAttr(state.busca)}"
            placeholder="Nome, telefone, e-mail ou cidade"
            oninput="hubRhDpFiltrarBusca(this.value)"
          >
        </label>
        <label>
          <span>Status</span>
          <select class="config-input" onchange="hubRhDpFiltrarStatus(this.value)">
            <option value="todos" ${state.filtroStatus === 'todos' ? 'selected' : ''}>Todos</option>
            <option value="ativo" ${state.filtroStatus === 'ativo' ? 'selected' : ''}>Ativos</option>
            <option value="inativo" ${state.filtroStatus === 'inativo' ? 'selected' : ''}>Inativos</option>
          </select>
        </label>
      </div>
    `;
  }

  function render() {
    const conteudo = !podeVer()
      ? `
        <section class="admin-panel">
          <div class="rh-empty-state">
            <strong>Acesso não liberado</strong>
            <p>Seu perfil não possui permissão para visualizar o cadastro de colaboradores.</p>
          </div>
        </section>
      `
      : `
        ${renderNavegacaoInterna()}
        ${state.secao === 'dashboard' ? renderDashboard() : state.secao === 'demandas' ? renderDemandas() : state.secao === 'fechamentos' ? renderFechamentos() : state.secao === 'desligamentos' ? renderDesligamentos() : state.secao === 'ferias' ? renderFerias() : state.secao === 'afastamentos' ? renderAfastamentosOcorrencias() : `
        <section class="admin-panel rh-panel">
          <div class="admin-panel-header rh-panel-header">
            <div>
              <h2>Colaboradores</h2>
              <p>Cadastro pessoal para controle interno da Transmares.</p>
            </div>
            ${podeCriar() ? '<button class="save-btn" type="button" data-rh-action="open-create">Incluir</button>' : ''}
          </div>

          <p class="admin-message rh-internal-notice">
            Informações para controle interno. Os registros oficiais são mantidos pela contabilidade.
          </p>

          ${renderResumo()}
          ${renderToolbar()}
          ${state.message ? `<p class="admin-message ${state.messageType === 'error' ? 'error' : 'success'}">${escapeHtml(state.message)}</p>` : ''}
          ${state.loading ? '<p class="quick-link-empty">Carregando colaboradores...</p>' : renderTabela()}
        </section>
        ${renderModal()}`}
      `;

    document.getElementById('app').innerHTML = renderShell({
      tituloPagina: 'RH & DP',
      descricaoPagina: 'Cadastro e gestão interna de colaboradores.',
      classeConteudo: 'rh-dp-page',
      conteudo
    });
    conectarEventos();
  }

  function conectarEventos() {
    document.querySelector('[data-rh-action="open-create"]')?.addEventListener('click', () => {
      abrirCadastro('', 'create');
    });
    document.querySelectorAll('[data-rh-action="close-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        fecharCadastro();
      });
    });
    document.querySelector('[data-rh-action="save-modal"]')?.addEventListener('click', () => {
      salvarCadastro();
    });
    document.querySelector('[data-rh-action="open-ferias-modal"]')?.addEventListener('click', () => {
      abrirModalFerias();
    });
    document.querySelectorAll('[data-rh-action="close-ferias-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        fecharModalFerias();
      });
    });
    document.querySelector('[data-rh-action="save-ferias-modal"]')?.addEventListener('click', () => {
      salvarFerias();
    });
    document.querySelector('[data-rh-action="open-afastamento-modal"]')?.addEventListener('click', () => {
      abrirModalAfastamento();
    });
    document.querySelectorAll('[data-rh-action="close-afastamento-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        fecharModalAfastamento();
      });
    });
    document.querySelector('[data-rh-action="save-afastamento-modal"]')?.addEventListener('click', () => {
      salvarAfastamento();
    });
    document.querySelector('[data-rh-action="open-ocorrencia-modal"]')?.addEventListener('click', () => {
      abrirModalOcorrencia();
    });
    document.querySelectorAll('[data-rh-action="close-ocorrencia-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        fecharModalOcorrencia();
      });
    });
    document.querySelector('[data-rh-action="save-ocorrencia-modal"]')?.addEventListener('click', () => {
      salvarOcorrencia();
    });
    document.querySelector('[data-rh-action="open-demanda-modal"]')?.addEventListener('click', () => {
      abrirModalDemanda();
    });
    document.querySelectorAll('[data-rh-action="close-demanda-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        fecharModalDemanda();
      });
    });
    document.querySelector('[data-rh-action="save-demanda-modal"]')?.addEventListener('click', () => {
      salvarDemanda();
    });
    document.querySelector('[data-rh-action="open-competencia-modal"]')?.addEventListener('click', () => {
      abrirModalCompetencia();
    });
    document.querySelectorAll('[data-rh-action="close-competencia-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        fecharModalCompetencia();
      });
    });
    document.querySelector('[data-rh-action="save-competencia-modal"]')?.addEventListener('click', () => {
      salvarCompetencia();
    });
    document.querySelectorAll('[data-rh-action="open-evento-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        abrirModalEvento(botao.dataset.competenciaId || '');
      });
    });
    document.querySelectorAll('[data-rh-action="close-evento-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        fecharModalEvento();
      });
    });
    document.querySelector('[data-rh-action="save-evento-modal"]')?.addEventListener('click', () => {
      salvarEvento();
    });
    document.querySelector('[data-rh-action="open-desligamento-modal"]')?.addEventListener('click', () => {
      abrirModalDesligamento();
    });
    document.querySelectorAll('[data-rh-action="close-desligamento-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        fecharModalDesligamento();
      });
    });
    document.querySelector('[data-rh-action="save-desligamento-modal"]')?.addEventListener('click', () => {
      salvarDesligamento();
    });
  }

  function campo(id, label, valor, {
    type = 'text',
    required = false,
    readonly = false,
    placeholder = '',
    mask = '',
    maxLength = ''
  } = {}) {
    return `
      <label>
        <span>${escapeHtml(label)}${required ? ' *' : ''}</span>
        <input
          id="rh_${escapeAttr(id)}"
          class="config-input"
          type="${escapeAttr(type)}"
          value="${escapeAttr(valor || '')}"
          ${placeholder ? `placeholder="${escapeAttr(placeholder)}"` : ''}
          ${mask ? `data-rh-mask="${escapeAttr(mask)}" oninput="hubRhDpAplicarMascara(event)"` : ''}
          ${maxLength ? `maxlength="${escapeAttr(maxLength)}"` : ''}
          ${required ? 'required' : ''}
          ${readonly ? 'disabled' : ''}
        >
      </label>
    `;
  }

  function campoSelect(id, label, valor, opcoes, { required = false, readonly = false } = {}) {
    return `
      <label>
        <span>${escapeHtml(label)}${required ? ' *' : ''}</span>
        <select id="rh_${escapeAttr(id)}" class="config-input" ${required ? 'required' : ''} ${readonly ? 'disabled' : ''}>
          <option value="">Selecione</option>
          ${opcoes.map(opcao => `
            <option value="${escapeAttr(opcao)}" ${String(valor || '') === opcao ? 'selected' : ''}>${escapeHtml(opcao)}</option>
          `).join('')}
        </select>
      </label>
    `;
  }

  function campoSelectPares(id, label, valor, opcoes, { required = false, readonly = false } = {}) {
    return `
      <label>
        <span>${escapeHtml(label)}${required ? ' *' : ''}</span>
        <select id="rh_${escapeAttr(id)}" class="config-input" ${required ? 'required' : ''} ${readonly ? 'disabled' : ''}>
          <option value="">Selecione</option>
          ${opcoes.map(([chave, nome]) => `
            <option value="${escapeAttr(chave)}" ${String(valor || '') === chave ? 'selected' : ''}>${escapeHtml(nome)}</option>
          `).join('')}
        </select>
      </label>
    `;
  }

  function campoTextarea(id, label, valor, { readonly = false, rows = 3, placeholder = '' } = {}) {
    return `
      <label class="rh-span-2">
        <span>${escapeHtml(label)}</span>
        <textarea
          id="rh_${escapeAttr(id)}"
          class="config-input rh-textarea"
          rows="${escapeAttr(rows)}"
          ${placeholder ? `placeholder="${escapeAttr(placeholder)}"` : ''}
          ${readonly ? 'disabled' : ''}
        >${escapeHtml(valor || '')}</textarea>
      </label>
    `;
  }

  function renderSecaoDadosPessoais(readonly) {
    const item = state.modal.colaborador;
    return `
      <section class="rh-form-section">
        <div class="rh-form-section-title">
          <strong>Dados pessoais</strong>
          <span>Campos marcados com * são obrigatórios.</span>
        </div>
        <div class="rh-form-grid">
          <label class="rh-span-2">
            <span>Nome completo *</span>
            <input id="rh_nome_completo" class="config-input" type="text" value="${escapeAttr(item.nome_completo || '')}" required ${readonly ? 'disabled' : ''}>
          </label>
          ${campo('data_nascimento', 'Data de nascimento', item.data_nascimento, { type: 'date', required: true, readonly })}
          ${campoSelect('estado_civil', 'Estado civil', item.estado_civil, ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)', 'Separado(a)'], { readonly })}
          ${campo('nacionalidade', 'Nacionalidade', item.nacionalidade, { readonly })}
          ${campo('naturalidade', 'Naturalidade', item.naturalidade, { readonly })}
          ${campoSelect('sexo', 'Sexo', item.sexo, ['Feminino', 'Masculino', 'Intersexo', 'Prefere não informar'], { readonly })}
          ${campoSelect('cor_raca', 'Cor/raça', item.cor_raca, ['Amarela', 'Branca', 'Indígena', 'Parda', 'Preta', 'Prefere não informar'], { readonly })}
          ${campoSelect('escolaridade', 'Escolaridade', item.escolaridade, ['Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo', 'Superior incompleto', 'Superior completo', 'Pós-graduação', 'Mestrado', 'Doutorado'], { readonly })}
          ${campo('nome_pai', 'Nome completo do pai', item.nome_pai, { readonly })}
          ${campo('nome_mae', 'Nome completo da mãe', item.nome_mae, { readonly })}
          ${campoSelect('status', 'Status do cadastro', item.status, ['ativo', 'inativo'], { required: true, readonly })}
        </div>
      </section>
    `;
  }

  function renderSecaoContatos(readonly) {
    const item = state.modal.colaborador;
    return `
      <section class="rh-form-section">
        <div class="rh-form-section-title">
          <strong>Contatos e emergência</strong>
          <span>Informe ao menos telefone ou e-mail.</span>
        </div>
        <div class="rh-form-grid">
          ${campo('telefone_celular', 'Telefone celular', item.telefone_celular, { readonly, mask: 'telefone', placeholder: '(00) 00000-0000' })}
          ${campo('email_contato', 'E-mail de contato', item.email_contato, { readonly, type: 'email' })}
          ${campo('contato_emergencia_nome', 'Contato de emergência', item.contato_emergencia_nome, { readonly })}
          ${campo('contato_emergencia_telefone', 'Telefone de emergência', item.contato_emergencia_telefone, { readonly, mask: 'telefone', placeholder: '(00) 00000-0000' })}
        </div>
      </section>
    `;
  }

  function renderSecaoEndereco(readonly) {
    const item = state.modal.colaborador;
    return `
      <section class="rh-form-section">
        <div class="rh-form-section-title">
          <strong>Endereço</strong>
          <span>Preencha o CEP para buscar o endereço automaticamente.</span>
        </div>
        <div class="rh-form-grid">
          <label>
            <span>CEP</span>
            <input
              id="rh_endereco_cep"
              class="config-input"
              type="text"
              value="${escapeAttr(formatarCep(item.endereco_cep))}"
              placeholder="00000-000"
              data-rh-mask="cep"
              oninput="hubRhDpAplicarMascara(event); hubRhDpBuscarEnderecoCep(event)"
              ${readonly ? 'disabled' : ''}
            >
            ${readonly ? '' : '<small id="rh_cep_feedback" class="rh-cep-feedback" aria-live="polite"></small>'}
          </label>
          <label class="rh-span-2">
            <span>Rua / logradouro</span>
            <input id="rh_endereco_logradouro" class="config-input" type="text" value="${escapeAttr(item.endereco_logradouro || '')}" ${readonly ? 'disabled' : ''}>
          </label>
          ${campo('endereco_numero', 'Número', item.endereco_numero, { readonly })}
          ${campo('endereco_complemento', 'Complemento', item.endereco_complemento, { readonly })}
          ${campo('endereco_bairro', 'Bairro', item.endereco_bairro, { readonly })}
          ${campo('endereco_cidade', 'Cidade', item.endereco_cidade, { readonly })}
          ${campo('endereco_uf', 'UF', item.endereco_uf, { readonly, maxLength: 2, placeholder: 'AL' })}
        </div>
      </section>
    `;
  }

  function renderSecaoDocumentos(readonly) {
    if (!podeVerSensiveis()) {
      return `
        <section class="rh-form-section rh-restricted-section">
          <strong>Documentos e dependentes protegidos</strong>
          <p>Seu perfil não possui permissão para visualizar dados sensíveis.</p>
        </section>
      `;
    }

    const item = state.modal.documentos;
    return `
      <section class="rh-form-section">
        <div class="rh-form-section-title">
          <strong>Documentos cadastrais</strong>
          <span>Dados sensíveis do cadastro. Arquivos ficam na seção de anexos.</span>
        </div>
        <div class="rh-form-grid">
          ${campo('cpf', 'CPF', formatarCpf(item.cpf), { required: true, readonly, mask: 'cpf', placeholder: '000.000.000-00' })}
          ${campoSelect('identidade_tipo', 'Documento de identidade', item.identidade_tipo, ['rg', 'cnh'], { readonly })}
          ${campo('identidade_numero', 'Número do RG/CNH', item.identidade_numero, { readonly })}
          ${campo('cnh_categoria', 'Categoria da CNH', item.cnh_categoria, { readonly })}
          ${campo('identidade_data_emissao', 'Data de emissão/expedição', item.identidade_data_emissao, { type: 'date', readonly })}
          ${campo('identidade_orgao_emissor', 'Órgão emissor', item.identidade_orgao_emissor, { readonly })}
          ${campo('identidade_uf_emissor', 'UF emissora', item.identidade_uf_emissor, { readonly, maxLength: 2 })}
          ${campo('titulo_eleitor', 'Título de eleitor', item.titulo_eleitor, { readonly })}
          ${campo('zona_eleitoral', 'Zona eleitoral', item.zona_eleitoral, { readonly })}
          ${campo('secao_eleitoral', 'Seção eleitoral', item.secao_eleitoral, { readonly })}
          ${campo('ctps_numero', 'Número da CTPS', item.ctps_numero, { readonly })}
          ${campo('ctps_serie', 'Série da CTPS', item.ctps_serie, { readonly })}
          ${campo('ctps_data_expedicao', 'Expedição da CTPS', item.ctps_data_expedicao, { type: 'date', readonly })}
          ${campo('ctps_uf', 'UF da CTPS', item.ctps_uf, { readonly, maxLength: 2 })}
          ${campo('pis_numero', 'Número do PIS', item.pis_numero, { readonly })}
          ${campo('pis_data_cadastro', 'Data de cadastro do PIS', item.pis_data_cadastro, { type: 'date', readonly })}
          ${campo('reservista_numero', 'Documento militar', item.reservista_numero, { readonly })}
          ${campo('reservista_categoria', 'Categoria de reservista', item.reservista_categoria, { readonly })}
        </div>
      </section>
    `;
  }

  function renderSecaoDependentes(readonly) {
    if (!podeVerSensiveis()) return '';

    return `
      <section class="rh-form-section">
        <div class="rh-form-section-title rh-dependents-title">
          <div>
            <strong>Dependentes</strong>
            <span>Sem limite fixo de registros.</span>
          </div>
          ${readonly ? '' : '<button class="secondary-btn" type="button" onclick="hubRhDpAdicionarDependente()">Adicionar dependente</button>'}
        </div>
        <div class="rh-dependents-list">
          ${state.modal.dependentes.length
            ? state.modal.dependentes.map((item, indice) => `
              <article class="rh-dependent-row">
                <input id="rh_dep_id_${indice}" type="hidden" value="${escapeAttr(item.id || '')}">
                ${campoDependente(indice, 'nome', 'Nome completo', item.nome_completo, 'text', readonly)}
                ${campoDependente(indice, 'nascimento', 'Data de nascimento', item.data_nascimento, 'date', readonly)}
                ${campoDependente(indice, 'parentesco', 'Parentesco', item.parentesco, 'text', readonly)}
                ${readonly ? '' : `<button class="icon-action-btn danger-text" type="button" onclick="hubRhDpRemoverDependente(${indice})">Remover</button>`}
              </article>
            `).join('')
            : '<p class="quick-link-empty">Nenhum dependente informado.</p>'}
        </div>
      </section>
    `;
  }

  function renderSecaoVinculo(readonly) {
    if (!podeVerSensiveis()) {
      return `
        <section class="rh-form-section rh-restricted-section">
          <strong>Vínculo profissional protegido</strong>
          <p>Seu perfil não possui permissão para visualizar remuneração e vínculo profissional.</p>
        </section>
      `;
    }

    const item = state.modal.vinculo;
    return `
      <section class="rh-form-section">
        <div class="rh-form-section-title">
          <strong>Vínculo profissional</strong>
          <span>Controle interno. Não substitui registros da contabilidade.</span>
        </div>
        <div class="rh-form-grid">
          ${campoSelect('tipo_vinculo', 'Tipo de vínculo', item.tipo_vinculo, ['clt', 'estagio', 'socio', 'prestador', 'temporario', 'outro'], { readonly })}
          ${campo('data_admissao', 'Data de admissão', item.data_admissao, { type: 'date', readonly })}
          ${campo('cargo', 'Cargo', item.cargo, { readonly })}
          ${campo('funcao', 'Função', item.funcao, { readonly })}
          ${campo('cbo', 'CBO', item.cbo, { readonly, placeholder: '0000-00' })}
          ${campo('departamento', 'Departamento/área', item.departamento, { readonly })}
          ${campo('gestor_responsavel', 'Gestor responsável', item.gestor_responsavel, { readonly })}
          ${campoSelect('situacao', 'Situação profissional', item.situacao, ['ativo', 'experiencia', 'afastado', 'desligado'], { readonly })}
          ${campoSelect('tipo_remuneracao', 'Tipo de remuneração', item.tipo_remuneracao, ['salario', 'bolsa', 'pro_labore', 'honorario', 'outro'], { readonly })}
          ${campo('remuneracao_valor', 'Valor da remuneração', formatarMoeda(item.remuneracao_valor), { readonly, placeholder: '0,00' })}
          ${campoSelect('modelo_jornada', 'Modelo de jornada', item.modelo_jornada, ['integral', 'parcial', 'escala', 'flexivel', 'remoto', 'hibrido', 'outro'], { readonly })}
          ${campo('carga_horaria_semanal', 'Carga horária semanal', item.carga_horaria_semanal, { readonly, placeholder: '44' })}
          ${campo('horario_entrada', 'Entrada', item.horario_entrada, { type: 'time', readonly })}
          ${campo('horario_saida', 'Saída', item.horario_saida, { type: 'time', readonly })}
          ${campo('intervalo_inicio', 'Início do intervalo', item.intervalo_inicio, { type: 'time', readonly })}
          ${campo('intervalo_fim', 'Fim do intervalo', item.intervalo_fim, { type: 'time', readonly })}
          ${campo('dias_trabalho', 'Dias de trabalho', item.dias_trabalho, { readonly, placeholder: 'Segunda a sexta' })}
          ${campo('data_desligamento', 'Data de desligamento', item.data_desligamento, { type: 'date', readonly })}
          ${campoTextarea('vinculo_observacoes', 'Observações do vínculo', item.observacoes, { readonly })}
        </div>
      </section>
    `;
  }

  function renderSecaoBeneficios(readonly) {
    if (!podeVerSensiveis()) return '';
    const itens = state.modal.beneficios;
    return `<section class="rh-form-section"><div class="rh-form-section-title rh-files-title"><div><strong>Benefícios</strong><span>Controle interno de concessões e coparticipações.</span></div></div>
      <div class="rh-files-list">${itens.length ? itens.map(item => `<article class="rh-file-row"><div class="rh-file-main"><strong>${escapeHtml(item.nome)}</strong><span>${escapeHtml(item.tipo.replaceAll('_',' '))} · ${escapeHtml(item.status)}</span><small>${item.operadora_fornecedor ? escapeHtml(item.operadora_fornecedor) : ''}</small></div></article>`).join('') : '<p class="quick-link-empty">Nenhum benefício informado.</p>'}</div>
      ${readonly || !state.modal.id ? '' : `<details class="rh-control-form"><summary>Adicionar benefício</summary><div class="rh-form-grid">${campoSelect('beneficio_tipo','Tipo','',['vale_transporte','vale_refeicao','vale_alimentacao','plano_saude','seguro_vida','auxilio','outro'])}${campo('beneficio_nome','Nome do benefício','')}${campo('beneficio_operadora','Operadora/fornecedor','')}${campo('beneficio_valor_empresa','Valor empresa','',{placeholder:'0,00'})}${campo('beneficio_valor_colaborador','Valor colaborador','',{placeholder:'0,00'})}${campo('beneficio_inicio','Início','',{type:'date'})}</div><button type="button" class="save-btn" onclick="hubRhDpSalvarBeneficio()">Adicionar benefício</button></details>`}</section>`;
  }

  function renderSecaoBancarios(readonly) {
    if (!podeVerSensiveis()) return '';
    const item = state.modal.bancarios;
    return `<section class="rh-form-section"><div class="rh-form-section-title"><strong>Dados bancários</strong><span>Dados sensíveis para controle interno.</span></div><div class="rh-form-grid">${campo('banco_codigo','Código do banco',item.banco_codigo,{readonly})}${campo('banco_nome','Banco',item.banco_nome,{readonly})}${campoSelect('banco_tipo_conta','Tipo de conta',item.tipo_conta,['corrente','poupanca','pagamento','outro'],{readonly})}${campo('banco_agencia','Agência',item.agencia,{readonly})}${campo('banco_conta','Conta',item.conta,{readonly})}${campo('banco_conta_digito','Dígito',item.conta_digito,{readonly})}${campoSelect('banco_pix_tipo','Tipo da chave PIX',item.pix_tipo,['cpf','email','telefone','aleatoria'],{readonly})}${campo('banco_pix_chave','Chave PIX',item.pix_chave,{readonly})}${campo('banco_titular_nome','Titular',item.titular_nome,{readonly})}${campo('banco_titular_cpf','CPF do titular',formatarCpf(item.titular_cpf),{readonly,mask:'cpf'})}</div>${readonly || !state.modal.id ? '' : '<button type="button" class="save-btn" onclick="hubRhDpSalvarBancarios()">Salvar dados bancários</button>'}</section>`;
  }

  const CHECKLIST_ADMISSIONAL = [['dados_pessoais','Dados pessoais'],['documentos','Documentos'],['vinculo','Vínculo profissional'],['beneficios','Benefícios'],['dados_bancarios','Dados bancários'],['anexos','Anexos'],['conferencia_contabilidade','Conferência da contabilidade']];
  function renderSecaoChecklistHistorico(readonly) {
    if (!podeVerSensiveis()) return '';
    const registros = Object.fromEntries(state.modal.checklist.map(item => [item.item_chave, item]));
    return `<section class="rh-form-section"><div class="rh-form-section-title"><strong>Checklist admissional e histórico</strong><span>Registros de acompanhamento; não gera eventos oficiais.</span></div><div class="rh-checklist">${CHECKLIST_ADMISSIONAL.map(([chave,nome]) => { const item=registros[chave]; const concluido=item?.status==='concluido'; return `<label class="rh-checklist-row"><input type="checkbox" ${concluido?'checked':''} ${readonly||!state.modal.id?'disabled':''} onchange="hubRhDpAtualizarChecklist('${chave}', this.checked)"><span>${escapeHtml(nome)}</span><small>${concluido ? `Concluído em ${formatarData(item.concluido_em)}` : 'Pendente'}</small></label>`; }).join('')}</div><div class="rh-history-list">${state.modal.movimentacoes.length ? state.modal.movimentacoes.map(item=>`<article><strong>${escapeHtml(item.titulo)}</strong><span>${formatarData(item.data_efetivacao)} · ${escapeHtml(item.tipo.replaceAll('_',' '))}</span>${item.descricao?`<small>${escapeHtml(item.descricao)}</small>`:''}</article>`).join(''):'<p class="quick-link-empty">Nenhuma movimentação registrada.</p>'}</div>${readonly||!state.modal.id?'':`<details class="rh-control-form"><summary>Registrar alteração</summary><div class="rh-form-grid">${campoSelect('mov_tipo','Tipo','',['cargo_funcao','remuneracao','jornada','beneficio','dados_bancarios','situacao','outro'])}${campo('mov_data','Data de efetivação','',{type:'date'})}${campo('mov_titulo','Título','')}${campoTextarea('mov_descricao','Descrição','',{rows:2})}</div><button type="button" class="save-btn" onclick="hubRhDpSalvarMovimentacao()">Registrar alteração</button></details>`}</section>`;
  }

  function renderSecaoArquivos(readonly) {
    if (!podeVerArquivos()) {
      return `
        <section class="rh-form-section rh-restricted-section">
          <strong>Arquivos protegidos</strong>
          <p>Seu perfil não possui permissão para visualizar arquivos de RH&DP.</p>
        </section>
      `;
    }

    const colaboradorSalvo = Boolean(state.modal.id);
    const podeManterArquivos = colaboradorSalvo && !readonly && (podeCriarArquivos() || podeEditarArquivos());

    return `
      <section class="rh-form-section">
        <div class="rh-form-section-title rh-files-title">
          <div>
            <strong>Arquivos e Google Drive</strong>
            <span>Arquivos protegidos no Google Drive, com versões e rastreabilidade.</span>
          </div>
          ${podeManterArquivos && state.modal.arquivoEditandoId ? `
            <button class="secondary-btn" type="button" onclick="hubRhDpCancelarArquivo()">Novo arquivo</button>
          ` : ''}
        </div>

        ${state.modal.arquivoMessage ? `
          <p class="admin-message ${state.modal.arquivoMessageType === 'error' ? 'error' : 'success'}">${escapeHtml(state.modal.arquivoMessage)}</p>
        ` : ''}

        ${renderListaArquivos(readonly)}

        ${!colaboradorSalvo ? `
          <p class="quick-link-empty">Salve o cadastro do colaborador antes de vincular arquivos.</p>
        ` : ''}

        ${podeManterArquivos ? renderFormularioArquivo() : ''}
      </section>
    `;
  }

  function renderListaArquivos(readonly) {
    if (state.modal.arquivosLoading) {
      return '<p class="quick-link-empty">Carregando arquivos...</p>';
    }

    if (!state.modal.arquivos.length) {
      return '<p class="quick-link-empty">Nenhum arquivo vinculado.</p>';
    }

    return `
      <div class="rh-files-list">
        ${state.modal.arquivos.map(item => {
          const podeAbrir = Boolean(item.google_drive_file_id) && podeBaixarArquivos();
          return `
            <article class="rh-file-row">
              <div class="rh-file-main">
                <strong>${escapeHtml(item.nome_arquivo || item.tipo_documento || 'Arquivo sem nome')}</strong>
                <span>${escapeHtml(formatarCategoriaArquivo(item.categoria))}${item.versao_atual ? ` • versão ${item.versao_atual}` : ''}${item.data_validade ? ` • válido até ${escapeHtml(formatarData(item.data_validade))}` : ''}</span>
                ${item.descricao ? `<small>${escapeHtml(item.descricao)}</small>` : ''}
              </div>
              <div class="rh-file-actions">
                ${podeAbrir ? `<button class="icon-action-btn" type="button" onclick="hubRhDpAbrirArquivo('${escapeAttr(item.id)}')">Visualizar</button>` : ''}
                ${!readonly && podeEditarArquivos() ? `<button class="icon-action-btn" type="button" onclick="hubRhDpEditarArquivo('${escapeAttr(item.id)}')">Editar</button>` : ''}
                ${!readonly && podeExcluirArquivos() ? `<button class="icon-action-btn danger-text" type="button" onclick="hubRhDpExcluirArquivo('${escapeAttr(item.id)}')">Excluir</button>` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderFormularioArquivo() {
    const item = state.modal.arquivoForm;
    const editando = Boolean(state.modal.arquivoEditandoId);
    return `
      <div class="rh-file-form">
        <div class="rh-form-grid">
          ${campoSelectPares('arquivo_categoria', 'Categoria', item.categoria, CATEGORIAS_ARQUIVO, { required: true })}
          ${campo('arquivo_tipo_documento', 'Tipo de documento', item.tipo_documento, { placeholder: 'Ex.: RG, contrato, ASO' })}
          ${campo('arquivo_nome_arquivo', 'Nome de identificação', item.nome_arquivo, { required: true })}
          <label class="rh-span-2"><span>${editando ? 'Enviar nova versão (opcional)' : 'Arquivo *'}</span><input id="rh_arquivo_upload" class="config-input" type="file" ${editando ? '' : 'required'}></label>
          ${campo('arquivo_data_referencia', 'Data de referência', item.data_referencia, { type: 'date' })}
          ${campo('arquivo_data_validade', 'Validade', item.data_validade, { type: 'date' })}
          ${campo('arquivo_google_drive_folder_id', 'ID da pasta no Drive', item.google_drive_folder_id)}
          ${campoTextarea('arquivo_descricao', 'Descrição', item.descricao, { rows: 2 })}
          ${campoTextarea('arquivo_observacoes', 'Observações', item.observacoes, { rows: 2 })}
        </div>
        <div class="rh-file-form-actions">
          <button class="save-btn" type="button" onclick="hubRhDpSalvarArquivo()" ${state.modal.arquivoSaving ? 'disabled' : ''}>
            ${state.modal.arquivoSaving ? 'Enviando...' : editando ? 'Salvar e enviar nova versão' : 'Enviar arquivo'}
          </button>
          ${editando ? '<button class="secondary-btn" type="button" onclick="hubRhDpCancelarArquivo()">Cancelar edição</button>' : ''}
        </div>
      </div>
    `;
  }

  function campoDependente(indice, campoNome, label, valor, type, readonly) {
    return `
      <label>
        <span>${escapeHtml(label)}</span>
        <input id="rh_dep_${campoNome}_${indice}" class="config-input" type="${type}" value="${escapeAttr(valor || '')}" ${readonly ? 'disabled' : ''}>
      </label>
    `;
  }

  function renderSecaoObservacoes(readonly) {
    return `
      <section class="rh-form-section">
        <div class="rh-form-section-title">
          <strong>Observações</strong>
        </div>
        <label>
          <textarea id="rh_observacoes" class="config-input rh-textarea" rows="3" ${readonly ? 'disabled' : ''}>${escapeHtml(state.modal.colaborador.observacoes || '')}</textarea>
        </label>
      </section>
    `;
  }

  function renderModal() {
    if (!state.modal.aberto) return '';

    const readonly = state.modal.modo === 'view';
    const titulo = state.modal.modo === 'create'
      ? 'Incluir colaborador'
      : state.modal.modo === 'edit'
        ? 'Editar colaborador'
        : 'Visualizar colaborador';

    return `
      <div class="modal-backdrop rh-modal-backdrop" role="dialog" aria-modal="true" aria-label="${escapeAttr(titulo)}">
        <section class="small-modal rh-modal">
          <div class="small-modal-header">
            <div>
              <h3>${escapeHtml(titulo)}</h3>
              <p>Cadastro pessoal e documentos para controle interno.</p>
            </div>
            <button class="secondary-btn" type="button" data-rh-action="close-modal" ${state.modal.saving ? 'disabled' : ''}>Fechar</button>
          </div>

          <div class="rh-modal-content">
            ${state.modal.loading ? '<p class="quick-link-empty">Carregando cadastro...</p>' : state.modal.erros.carregamento ? `
              <p class="admin-message error">${escapeHtml(state.modal.erros.carregamento)}</p>
            ` : `
              ${state.modal.erros.geral ? `<p class="admin-message error">${escapeHtml(state.modal.erros.geral)}</p>` : ''}
              ${renderSecaoDadosPessoais(readonly)}
              ${renderSecaoContatos(readonly)}
              ${renderSecaoEndereco(readonly)}
              ${renderSecaoDocumentos(readonly)}
              ${renderSecaoDependentes(readonly)}
              ${renderSecaoVinculo(readonly)}
              ${renderSecaoBeneficios(readonly)}
              ${renderSecaoBancarios(readonly)}
              ${renderSecaoChecklistHistorico(readonly)}
              ${renderSecaoArquivos(readonly)}
              ${renderSecaoObservacoes(readonly)}
            `}
          </div>

          ${state.modal.loading ? '' : `
            <div class="small-modal-actions rh-modal-actions">
              <button class="secondary-btn" type="button" data-rh-action="close-modal" ${state.modal.saving ? 'disabled' : ''}>${readonly ? 'Fechar' : 'Cancelar'}</button>
              ${readonly || state.modal.erros.carregamento ? '' : `<button class="save-btn" type="button" data-rh-action="save-modal" ${state.modal.saving ? 'disabled' : ''}>${state.modal.saving ? 'Salvando...' : 'Salvar'}</button>`}
            </div>
          `}
        </section>
      </div>
    `;
  }

  function obterValor(id) {
    return document.getElementById(`rh_${id}`)?.value ?? '';
  }

  function capturarFormulario() {
    if (!state.modal.aberto || state.modal.loading || state.modal.modo === 'view') return;

    const camposColaborador = Object.keys(novoColaborador());
    const camposDocumentos = Object.keys(novosDocumentos());
    const camposVinculo = Object.keys(novoVinculo());
    state.modal.colaborador = camposColaborador.reduce((acc, campoNome) => {
      acc[campoNome] = obterValor(campoNome);
      return acc;
    }, {});

    if (podeVerSensiveis()) {
      state.modal.documentos = camposDocumentos.reduce((acc, campoNome) => {
        acc[campoNome] = obterValor(campoNome);
        return acc;
      }, {});

      state.modal.vinculo = camposVinculo.reduce((acc, campoNome) => {
        acc[campoNome] = campoNome === 'observacoes'
          ? obterValor('vinculo_observacoes')
          : obterValor(campoNome);
        return acc;
      }, {});

      state.modal.dependentes = state.modal.dependentes.map((item, indice) => ({
        id: document.getElementById(`rh_dep_id_${indice}`)?.value || item.id || '',
        nome_completo: document.getElementById(`rh_dep_nome_${indice}`)?.value || '',
        data_nascimento: document.getElementById(`rh_dep_nascimento_${indice}`)?.value || '',
        parentesco: document.getElementById(`rh_dep_parentesco_${indice}`)?.value || ''
      }));
    }
  }

  function validarFormulario() {
    const colaborador = state.modal.colaborador;
    const documentos = state.modal.documentos;

    if (String(colaborador.nome_completo || '').trim().length < 3) {
      return 'Informe o nome completo do colaborador.';
    }

    if (!colaborador.data_nascimento) {
      return 'Informe a data de nascimento.';
    }

    if (!colaborador.telefone_celular && !colaborador.email_contato) {
      return 'Informe ao menos um telefone ou e-mail de contato.';
    }

    if (colaborador.email_contato && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(colaborador.email_contato)) {
      return 'Informe um e-mail de contato válido.';
    }

    if (colaborador.endereco_uf && String(colaborador.endereco_uf).trim().length !== 2) {
      return 'Informe a UF do endereço com duas letras.';
    }

    if (colaborador.endereco_cep && digitos(colaborador.endereco_cep).length !== 8) {
      return 'Informe um CEP válido.';
    }

    if (podeVerSensiveis() && !cpfValido(documentos.cpf)) {
      return 'Informe um CPF válido.';
    }

    if (podeVerSensiveis()) {
      const vinculo = state.modal.vinculo;
      const possuiVinculo = Object.entries(vinculo).some(([campoNome, valor]) => {
        if (campoNome === 'situacao' && String(valor || 'ativo') === 'ativo') return false;
        return String(valor || '').trim();
      });
      if (possuiVinculo && !vinculo.data_admissao) {
        return 'Informe a data de admissão do vínculo profissional.';
      }

      if (vinculo.data_desligamento && vinculo.data_admissao && vinculo.data_desligamento < vinculo.data_admissao) {
        return 'A data de desligamento não pode ser anterior à admissão.';
      }

      const dependenteIncompleto = state.modal.dependentes.some(item => {
        const possuiAlgumDado = item.nome_completo || item.data_nascimento || item.parentesco;
        return possuiAlgumDado && (!item.nome_completo || !item.data_nascimento);
      });
      if (dependenteIncompleto) {
        return 'Informe nome e data de nascimento de cada dependente.';
      }
    }

    return '';
  }

  async function abrir() {
    state.loading = true;
    state.message = '';
    render();

    if (!podeVer()) {
      state.loading = false;
      render();
      return;
    }

    try {
      state.colaboradores = await listarColaboradoresRhDp();
      state.loading = false;
      render();
    } catch (error) {
      state.loading = false;
      state.message = error.message || 'Não foi possível carregar os colaboradores.';
      state.messageType = 'error';
      render();
    }
  }

  async function abrirSecao(secao) {
    if (!['dashboard', 'colaboradores', 'demandas', 'fechamentos', 'desligamentos', 'ferias', 'afastamentos'].includes(secao)) return;
    state.secao = secao;
    if (secao === 'colaboradores') { render(); return; }
    state.controleLoading = true;
    state.message = '';
    render();
    try {
      if (secao === 'demandas') state.demandas = await listarDemandasContabilidadeRhDp();
      if (secao === 'fechamentos') state.competencias = await listarCompetenciasRhDp();
      if (secao === 'desligamentos') state.desligamentos = await listarDesligamentosRhDp();
      if (secao === 'ferias') state.ferias = await listarFeriasRhDp();
      if (secao === 'afastamentos') [state.afastamentos, state.ocorrencias] = await Promise.all([listarAfastamentosRhDp(), listarOcorrenciasRhDp()]);
      if (secao === 'dashboard') {
        const tarefas = [];
        if (podeVerFerias()) tarefas.push(listarFeriasRhDp().then(valor => { state.ferias = valor; }));
        if (podeVerOcorrencias()) tarefas.push(listarAfastamentosRhDp().then(valor => { state.afastamentos = valor; }));
        if (podeVerDemandas()) tarefas.push(listarDemandasContabilidadeRhDp().then(valor => { state.demandas = valor; }));
        if (podeVerFechamentos()) tarefas.push(listarCompetenciasRhDp().then(valor => { state.competencias = valor; }));
        await Promise.all(tarefas);
      }
    } catch (error) {
      state.message = error.message || 'Não foi possível carregar os controles.';
      state.messageType = 'error';
    } finally {
      state.controleLoading = false;
      render();
    }
  }

  function abrirModalFerias() {
    if (!podeCriarFerias()) return;
    state.feriasModal = {
      aberto: true,
      saving: false
    };
    render();
  }

  function fecharModalFerias() {
    if (state.feriasModal.saving) return;
    state.feriasModal = {
      aberto: false,
      saving: false
    };
    render();
  }

  async function salvarFerias() {
    const colaborador_id = document.getElementById('rh_ferias_colaborador')?.value;
    const periodo_aquisitivo_inicio = document.getElementById('rh_ferias_aquisitivo_inicio')?.value;
    const periodo_aquisitivo_fim = document.getElementById('rh_ferias_aquisitivo_fim')?.value;
    const inicio_gozo = document.getElementById('rh_ferias_inicio')?.value;
    const fim_gozo = document.getElementById('rh_ferias_fim')?.value;
    const dias_gozo = document.getElementById('rh_ferias_dias')?.value;
    const abono_pecuniario = document.getElementById('rh_ferias_abono')?.checked;
    const observacoes = document.getElementById('rh_ferias_observacoes')?.value;

    if (!colaborador_id || !periodo_aquisitivo_inicio || !periodo_aquisitivo_fim || !inicio_gozo || !fim_gozo || !dias_gozo) {
      state.message = 'Preencha todos os campos obrigatórios das férias.';
      state.messageType = 'error';
      render();
      return;
    }

    state.feriasModal.saving = true;
    render();

    try {
      await salvarFeriasRhDp({
        ferias: {
          colaborador_id,
          periodo_aquisitivo_inicio,
          periodo_aquisitivo_fim,
          inicio_gozo,
          fim_gozo,
          dias_gozo,
          abono_pecuniario,
          observacoes,
          status: 'rascunho'
        }
      });
      state.feriasModal = { aberto: false, saving: false };
      state.message = 'Planejamento de férias registrado como rascunho.';
      state.messageType = 'success';
      await abrirSecao('ferias');
    } catch (error) {
      state.feriasModal.saving = false;
      state.message = error.message || 'Não foi possível registrar as férias.';
      state.messageType = 'error';
      render();
    }
  }

  function abrirModalAfastamento() {
    if (!podeCriarOcorrencias()) return;
    state.afastamentoModal = { aberto: true, saving: false };
    state.message = '';
    render();
  }

  function fecharModalAfastamento() {
    if (state.afastamentoModal.saving) return;
    state.afastamentoModal = { aberto: false, saving: false };
    render();
  }

  function abrirModalOcorrencia() {
    if (!podeCriarOcorrencias()) return;
    state.ocorrenciaModal = { aberto: true, saving: false };
    state.message = '';
    render();
  }

  function fecharModalOcorrencia() {
    if (state.ocorrenciaModal.saving) return;
    state.ocorrenciaModal = { aberto: false, saving: false };
    render();
  }

  async function salvarAfastamento() {
    const colaborador_id = document.getElementById('rh_afast_colaborador')?.value;
    const tipo = document.getElementById('rh_afast_tipo')?.value;
    const inicio_em = document.getElementById('rh_afast_inicio')?.value;
    const previsao_retorno_em = document.getElementById('rh_afast_previsao')?.value;
    const cid_referencia = document.getElementById('rh_afast_cid')?.value;
    const comunicacao_emitida = document.getElementById('rh_afast_comunicacao')?.checked;
    const motivo = document.getElementById('rh_afast_motivo')?.value;

    if (!colaborador_id || !tipo || !inicio_em || !motivo?.trim()) {
      state.message = 'Preencha os campos obrigatórios do afastamento.';
      state.messageType = 'error';
      render();
      return;
    }

    state.afastamentoModal.saving = true;
    render();

    try {
      await salvarAfastamentoRhDp({
        afastamento: {
          colaborador_id,
          tipo,
          inicio_em,
          motivo,
          previsao_retorno_em,
          cid_referencia,
          comunicacao_emitida,
          status: 'rascunho'
        }
      });
      state.afastamentoModal = { aberto: false, saving: false };
      state.message = 'Afastamento registrado como rascunho.';
      state.messageType = 'success';
      await abrirSecao('afastamentos');
    } catch (error) {
      state.afastamentoModal.saving = false;
      state.message = error.message || 'Não foi possível registrar o afastamento.';
      state.messageType = 'error';
      render();
    }
  }

  async function salvarOcorrencia() {
    const colaborador_id = document.getElementById('rh_ocorrencia_colaborador')?.value;
    const categoria = document.getElementById('rh_ocorrencia_categoria')?.value;
    const data_ocorrencia = document.getElementById('rh_ocorrencia_data')?.value;
    const titulo = document.getElementById('rh_ocorrencia_titulo')?.value;
    const descricao = document.getElementById('rh_ocorrencia_descricao')?.value;
    const providencias = document.getElementById('rh_ocorrencia_providencias')?.value;

    if (!colaborador_id || !categoria || !data_ocorrencia || !titulo?.trim() || !descricao?.trim()) {
      state.message = 'Preencha os campos obrigatórios da ocorrência.';
      state.messageType = 'error';
      render();
      return;
    }

    state.ocorrenciaModal.saving = true;
    render();

    try {
      await salvarOcorrenciaRhDp({
        ocorrencia: {
          colaborador_id,
          categoria,
          data_ocorrencia,
          titulo,
          descricao,
          providencias,
          status: 'aberta'
        }
      });
      state.ocorrenciaModal = { aberto: false, saving: false };
      state.message = 'Ocorrência registrada.';
      state.messageType = 'success';
      await abrirSecao('afastamentos');
    } catch (error) {
      state.ocorrenciaModal.saving = false;
      state.message = error.message || 'Não foi possível registrar a ocorrência.';
      state.messageType = 'error';
      render();
    }
  }

  function abrirModalDemanda() {
    if (!podeCriarDemandas()) return;
    state.demandaModal = { aberto: true, saving: false };
    state.message = '';
    render();
  }

  function fecharModalDemanda() {
    if (state.demandaModal.saving) return;
    state.demandaModal = { aberto: false, saving: false };
    render();
  }

  async function salvarDemanda() {
    const titulo = document.getElementById('rh_demanda_titulo')?.value.trim();
    const tipo = document.getElementById('rh_demanda_tipo')?.value;
    const prioridade = document.getElementById('rh_demanda_prioridade')?.value;
    const competencia = document.getElementById('rh_demanda_competencia')?.value;
    const prazo = document.getElementById('rh_demanda_prazo')?.value;
    const descricao = document.getElementById('rh_demanda_descricao')?.value;

    if (!titulo) {
      state.message = 'Informe o título da demanda.';
      state.messageType = 'error';
      render();
      return;
    }

    state.demandaModal.saving = true;
    render();

    try {
      await salvarDemandaContabilidadeRhDp({
        demanda: {
          titulo,
          tipo,
          prioridade,
          competencia,
          prazo,
          descricao,
          status: 'rascunho'
        }
      });
      state.demandaModal = { aberto: false, saving: false };
      state.message = 'Demanda registrada como rascunho.';
      state.messageType = 'success';
      await abrirSecao('demandas');
    } catch (error) {
      state.demandaModal.saving = false;
      state.message = error.message || 'Não foi possível registrar a demanda.';
      state.messageType = 'error';
      render();
    }
  }

  function abrirModalCompetencia() {
    if (!podeCriarFechamentos()) return;
    state.competenciaModal = { aberto: true, saving: false };
    state.message = '';
    render();
  }

  function fecharModalCompetencia() {
    if (state.competenciaModal.saving) return;
    state.competenciaModal = { aberto: false, saving: false };
    render();
  }

  function abrirModalEvento(competenciaId) {
    if (!podeEditarFechamentos() || !competenciaId) return;
    state.eventoModal = { aberto: true, saving: false, competenciaId };
    state.message = '';
    render();
  }

  function fecharModalEvento() {
    if (state.eventoModal.saving) return;
    state.eventoModal = { aberto: false, saving: false, competenciaId: '' };
    render();
  }

  async function salvarCompetencia() {
    const competencia = document.getElementById('rh_competencia_mes')?.value;
    const prazo_envio = document.getElementById('rh_competencia_prazo')?.value;

    if (!competencia) {
      state.message = 'Informe a competência.';
      state.messageType = 'error';
      render();
      return;
    }

    state.competenciaModal.saving = true;
    render();

    try {
      await salvarCompetenciaRhDp({ competencia: { competencia, prazo_envio, status: 'em_preparacao' }});
      state.competenciaModal = { aberto: false, saving: false };
      state.message = 'Competência aberta para preparação.';
      state.messageType = 'success';
      await abrirSecao('fechamentos');
    } catch (error) {
      state.competenciaModal.saving = false;
      state.message = error.message || 'Não foi possível abrir a competência.';
      state.messageType = 'error';
      render();
    }
  }

  async function salvarEvento() {
    const competencia_id = state.eventoModal.competenciaId;
    const tipo = document.getElementById('rh_evento_tipo')?.value;
    const descricao = document.getElementById('rh_evento_descricao')?.value;

    if (!competencia_id || !tipo || !descricao?.trim()) {
      state.message = 'Informe tipo e descrição do evento.';
      state.messageType = 'error';
      render();
      return;
    }

    state.eventoModal.saving = true;
    render();

    try {
      await salvarEventoCompetenciaRhDp({ evento: { competencia_id, tipo, descricao, status: 'pendente' } });
      state.eventoModal = { aberto: false, saving: false, competenciaId: '' };
      state.message = 'Evento incluído na competência.';
      state.messageType = 'success';
      await abrirSecao('fechamentos');
    } catch (error) {
      state.eventoModal.saving = false;
      state.message = error.message || 'Não foi possível incluir o evento.';
      state.messageType = 'error';
      render();
    }
  }

  async function concluirCompetencia(id) {
    if (!window.confirm('Concluir esta competência? A conclusão exige que todos os eventos estejam confirmados ou dispensados.')) return;
    try {
      await salvarCompetenciaRhDp({ id, competencia: { status: 'concluido' } });
      state.message = 'Competência concluída.'; state.messageType = 'success'; await abrirSecao('fechamentos');
    } catch (error) { state.message = error.message || 'Não foi possível concluir a competência.'; state.messageType = 'error'; render(); }
  }

  async function atualizarEvento(id) {
    const status = window.prompt('Status do evento (enviado, confirmado, divergencia ou dispensado):', 'confirmado');
    if (!status) return;
    try {
      await salvarEventoCompetenciaRhDp({ id, evento: { status } });
      state.message = 'Evento atualizado.'; state.messageType = 'success'; await abrirSecao('fechamentos');
    } catch (error) { state.message = error.message || 'Não foi possível atualizar o evento.'; state.messageType = 'error'; render(); }
  }

  function abrirModalDesligamento() {
    if (!podeCriarDesligamentos()) return;
    state.desligamentoModal = { aberto: true, saving: false };
    state.message = '';
    render();
  }

  function fecharModalDesligamento() {
    if (state.desligamentoModal.saving) return;
    state.desligamentoModal = { aberto: false, saving: false };
    render();
  }

  async function salvarDesligamento() {
    const colaborador_id = document.getElementById('rh_desligamento_colaborador')?.value;
    const tipo = document.getElementById('rh_desligamento_tipo')?.value;
    const competencia = document.getElementById('rh_desligamento_competencia')?.value;
    const ultimo_dia_trabalho = document.getElementById('rh_desligamento_ultimo_dia')?.value;
    const aviso_previo = document.getElementById('rh_desligamento_aviso')?.value;
    const motivo_resumo = document.getElementById('rh_desligamento_motivo')?.value;

    if (!colaborador_id || !competencia || !motivo_resumo?.trim()) {
      state.message = 'Preencha colaborador, competência e resumo do desligamento.';
      state.messageType = 'error';
      render();
      return;
    }

    state.desligamentoModal.saving = true;
    render();

    try {
      await salvarDesligamentoRhDp({
        desligamento: {
          colaborador_id,
          competencia,
          motivo_resumo,
          tipo,
          ultimo_dia_trabalho,
          aviso_previo,
          status: 'rascunho'
        }
      });
      state.desligamentoModal = { aberto: false, saving: false };
      state.message = 'Desligamento registrado como rascunho.';
      state.messageType = 'success';
      await abrirSecao('desligamentos');
    } catch (error) {
      state.desligamentoModal.saving = false;
      state.message = error.message || 'Não foi possível registrar o desligamento.';
      state.messageType = 'error';
      render();
    }
  }

  async function concluirChecklistDesligamento(desligamentoId) {
    const item_chave = window.prompt('Item concluído (contabilidade, acessos, equipamentos, beneficios, documentos ou comunicacao_interna):');
    if (!item_chave) return;
    try {
      await salvarChecklistDesligamentoRhDp({ checklist: { desligamento_id: desligamentoId, item_chave, status: 'concluido' } });
      state.message = 'Checklist atualizada.'; state.messageType = 'success'; await abrirSecao('desligamentos');
    } catch (error) { state.message = error.message || 'Não foi possível atualizar a checklist.'; state.messageType = 'error'; render(); }
  }

  async function abrirCadastro(id = '', modo = 'view') {
    if (modo === 'create' && !podeCriar()) return;
    if (modo === 'edit' && !podeEditar()) return;

    state.modal = criarEstadoModal({
      aberto: true,
      modo,
      id,
      loading: Boolean(id),
      arquivosLoading: Boolean(id) && podeVerArquivos()
    });
    render();

    if (!id) return;

    try {
      const dados = await obterCadastroPessoalRhDp({
        id,
        incluirSensiveis: podeVerSensiveis()
      });
      state.modal.colaborador = { ...novoColaborador(), ...(dados.colaborador || {}) };
      state.modal.documentos = { ...novosDocumentos(), ...(dados.documentos || {}) };
      state.modal.vinculo = { ...novoVinculo(), ...(dados.vinculo || {}) };
      state.modal.dependentes = dados.dependentes || [];
      state.modal.beneficios = dados.beneficios || [];
      state.modal.bancarios = dados.bancarios || {};
      state.modal.movimentacoes = dados.movimentacoes || [];
      state.modal.checklist = dados.checklist || [];
      state.modal.arquivos = podeVerArquivos()
        ? await listarArquivosColaboradorRhDp({ colaboradorId: id })
        : [];
      state.modal.loading = false;
      state.modal.arquivosLoading = false;
      render();
    } catch (error) {
      state.modal.loading = false;
      state.modal.arquivosLoading = false;
      state.modal.erros.carregamento = error.message || 'Não foi possível carregar o cadastro.';
      render();
    }
  }

  function fecharCadastro() {
    if (state.modal.saving) return;
    state.modal.aberto = false;
    render();
  }

  function adicionarDependente() {
    capturarFormulario();
    state.modal.dependentes.push({
      id: '',
      nome_completo: '',
      data_nascimento: '',
      parentesco: ''
    });
    render();
  }

  function removerDependente(indice) {
    capturarFormulario();
    state.modal.dependentes.splice(indice, 1);
    render();
  }

  function capturarFormularioArquivo() {
    if (!state.modal.aberto || state.modal.modo === 'view') return;
    state.modal.arquivoForm = {
      id: state.modal.arquivoEditandoId,
      colaborador_id: state.modal.id,
      categoria: obterValor('arquivo_categoria'),
      tipo_documento: obterValor('arquivo_tipo_documento'),
      nome_arquivo: obterValor('arquivo_nome_arquivo'),
      descricao: obterValor('arquivo_descricao'),
      origem: 'google_drive',
      google_drive_file_id: obterValor('arquivo_google_drive_file_id'),
      google_drive_web_url: obterValor('arquivo_google_drive_web_url'),
      google_drive_preview_url: obterValor('arquivo_google_drive_preview_url'),
      google_drive_folder_id: obterValor('arquivo_google_drive_folder_id'),
      data_referencia: obterValor('arquivo_data_referencia'),
      data_validade: obterValor('arquivo_data_validade'),
      observacoes: obterValor('arquivo_observacoes')
    };
  }

  function validarArquivo() {
    const arquivo = state.modal.arquivoForm;
    if (!state.modal.id) return 'Salve o cadastro antes de vincular arquivos.';
    if (!arquivo.categoria) return 'Informe a categoria do arquivo.';
    if (String(arquivo.nome_arquivo || '').trim().length < 2) return 'Informe o nome do arquivo.';
    return '';
  }

  async function recarregarArquivos() {
    if (!state.modal.id || !podeVerArquivos()) return;
    state.modal.arquivos = await listarArquivosColaboradorRhDp({ colaboradorId: state.modal.id });
  }

  function editarArquivo(id) {
    if (!podeEditarArquivos()) return;
    const arquivo = state.modal.arquivos.find(item => item.id === id);
    if (!arquivo) return;
    state.modal.arquivoForm = { ...novoArquivo(state.modal.id), ...arquivo };
    state.modal.arquivoEditandoId = id;
    state.modal.arquivoMessage = '';
    render();
  }

  function cancelarArquivo() {
    state.modal.arquivoForm = novoArquivo(state.modal.id);
    state.modal.arquivoEditandoId = '';
    state.modal.arquivoMessage = '';
    render();
  }

  async function salvarArquivo() {
    capturarFormularioArquivo();
    const erro = validarArquivo();
    if (erro) {
      state.modal.arquivoMessage = erro;
      state.modal.arquivoMessageType = 'error';
      render();
      return;
    }

    state.modal.arquivoSaving = true;
    state.modal.arquivoMessage = '';
    render();

    try {
      const arquivoSelecionado = document.getElementById('rh_arquivo_upload')?.files?.[0] || null;
      if (!arquivoSelecionado && !state.modal.arquivoEditandoId) throw new Error('Selecione um arquivo para enviar.');
      if (arquivoSelecionado) {
        await enviarArquivoColaboradorRhDp({
          arquivo: arquivoSelecionado,
          metadados: state.modal.arquivoForm,
          arquivoId: state.modal.arquivoEditandoId || null
        });
      } else {
        await salvarArquivoColaboradorRhDp({ id: state.modal.arquivoEditandoId, arquivo: state.modal.arquivoForm });
      }
      await recarregarArquivos();
      state.modal.arquivoForm = novoArquivo(state.modal.id);
      state.modal.arquivoEditandoId = '';
      state.modal.arquivoSaving = false;
      state.modal.arquivoMessage = arquivoSelecionado ? 'Arquivo enviado com sucesso.' : 'Metadados atualizados com sucesso.';
      state.modal.arquivoMessageType = 'success';
      render();
    } catch (error) {
      state.modal.arquivoSaving = false;
      state.modal.arquivoMessage = error.message || 'Não foi possível salvar o arquivo.';
      state.modal.arquivoMessageType = 'error';
      render();
    }
  }

  async function excluirArquivo(id) {
    if (!podeExcluirArquivos()) return;
    const arquivo = state.modal.arquivos.find(item => item.id === id);
    if (!arquivo) return;
    const justificativa = window.prompt(`Informe o motivo do descarte de "${arquivo.nome_arquivo || arquivo.tipo_documento || 'sem nome'}". O arquivo será enviado à lixeira do Drive.`, '');
    if (justificativa === null) return;

    state.modal.arquivoMessage = '';
    render();

    try {
      await descartarArquivoColaboradorRhDp({ id, justificativa });
      await recarregarArquivos();
      if (state.modal.arquivoEditandoId === id) {
        state.modal.arquivoForm = novoArquivo(state.modal.id);
        state.modal.arquivoEditandoId = '';
      }
      state.modal.arquivoMessage = 'Arquivo descartado e enviado à lixeira do Drive.';
      state.modal.arquivoMessageType = 'success';
      render();
    } catch (error) {
      state.modal.arquivoMessage = error.message || 'Não foi possível excluir o arquivo.';
      state.modal.arquivoMessageType = 'error';
      render();
    }
  }

  async function abrirArquivo(id) {
    if (!id || !podeBaixarArquivos()) return;
    try {
      const { blob } = await abrirArquivoColaboradorRhDp({ id, disposition: 'inline' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      state.modal.arquivoMessage = error.message || 'Não foi possível abrir o arquivo.';
      state.modal.arquivoMessageType = 'error';
      render();
    }
  }

  async function salvarCadastro() {
    capturarFormulario();
    const erro = validarFormulario();
    if (erro) {
      state.modal.erros.geral = erro;
      render();
      return;
    }

    state.modal.saving = true;
    state.modal.erros = {};
    render();

    try {
      const editando = Boolean(state.modal.id);
      await salvarCadastroPessoalRhDp({
        id: state.modal.id || null,
        colaborador: state.modal.colaborador,
        documentos: podeVerSensiveis() ? state.modal.documentos : null,
        vinculo: podeVerSensiveis() ? state.modal.vinculo : null,
        dependentes: podeVerSensiveis() ? state.modal.dependentes : null
      });
      state.modal.aberto = false;
      state.message = editando ? 'Cadastro atualizado com sucesso.' : 'Colaborador incluído com sucesso.';
      state.messageType = 'success';

      try {
        state.colaboradores = await listarColaboradoresRhDp();
      } catch {
        state.message = editando
          ? 'Cadastro atualizado, mas a lista não pôde ser recarregada agora.'
          : 'Colaborador incluído, mas a lista não pôde ser recarregada agora.';
      }

      render();
    } catch (error) {
      state.modal.saving = false;
      state.modal.erros.geral = error.message || 'Não foi possível salvar o cadastro.';
      render();
    }
  }

  async function alterarStatus(id, status) {
    const item = state.colaboradores.find(colaborador => colaborador.id === id);
    const verbo = status === 'inativo' ? 'inativar' : 'reativar';
    if (!item || !window.confirm(`Deseja ${verbo} o cadastro de ${item.nome_completo}?`)) return;

    try {
      await alterarStatusColaboradorRhDp({ id, status });
      state.colaboradores = await listarColaboradoresRhDp();
      state.message = status === 'inativo' ? 'Cadastro inativado com sucesso.' : 'Cadastro reativado com sucesso.';
      state.messageType = 'success';
      render();
    } catch (error) {
      state.message = error.message || 'Não foi possível alterar o status.';
      state.messageType = 'error';
      render();
    }
  }

  async function recarregarFase5() {
    const dados = await obterCadastroPessoalRhDp({ id: state.modal.id, incluirSensiveis: true });
    state.modal.beneficios = dados.beneficios || [];
    state.modal.bancarios = dados.bancarios || {};
    state.modal.movimentacoes = dados.movimentacoes || [];
    state.modal.checklist = dados.checklist || [];
  }

  async function salvarBeneficio() {
    try {
      await salvarBeneficioRhDp({ beneficio: { colaborador_id: state.modal.id, tipo: obterValor('beneficio_tipo'), nome: obterValor('beneficio_nome'), operadora_fornecedor: obterValor('beneficio_operadora'), valor_empresa: obterValor('beneficio_valor_empresa'), valor_colaborador: obterValor('beneficio_valor_colaborador'), inicio_em: obterValor('beneficio_inicio') } });
      await recarregarFase5(); state.modal.erros = {}; render();
    } catch (error) { state.modal.erros.geral = error.message || 'Não foi possível salvar o benefício.'; render(); }
  }

  async function salvarBancarios() {
    try {
      await salvarDadosBancariosRhDp({ id: state.modal.bancarios.id || null, dados: { colaborador_id: state.modal.id, banco_codigo: obterValor('banco_codigo'), banco_nome: obterValor('banco_nome'), tipo_conta: obterValor('banco_tipo_conta'), agencia: obterValor('banco_agencia'), conta: obterValor('banco_conta'), conta_digito: obterValor('banco_conta_digito'), pix_tipo: obterValor('banco_pix_tipo'), pix_chave: obterValor('banco_pix_chave'), titular_nome: obterValor('banco_titular_nome'), titular_cpf: obterValor('banco_titular_cpf') } });
      await recarregarFase5(); state.modal.erros = {}; render();
    } catch (error) { state.modal.erros.geral = error.message || 'Não foi possível salvar os dados bancários.'; render(); }
  }

  async function atualizarChecklist(itemChave, concluido) {
    try {
      const atual = state.modal.checklist.find(item => item.item_chave === itemChave);
      await salvarChecklistAdmissionalRhDp({ id: atual?.id || null, item: { colaborador_id: state.modal.id, item_chave: itemChave, status: concluido ? 'concluido' : 'pendente' } });
      await recarregarFase5(); render();
    } catch (error) { state.modal.erros.geral = error.message || 'Não foi possível atualizar o checklist.'; render(); }
  }

  async function salvarMovimentacao() {
    try {
      await salvarMovimentacaoRhDp({ movimentacao: { colaborador_id: state.modal.id, tipo: obterValor('mov_tipo'), data_efetivacao: obterValor('mov_data'), titulo: obterValor('mov_titulo'), descricao: obterValor('mov_descricao') } });
      await recarregarFase5(); state.modal.erros = {}; render();
    } catch (error) { state.modal.erros.geral = error.message || 'Não foi possível registrar a alteração.'; render(); }
  }

  function filtrarBusca(valor) {
    state.busca = valor;
    state.pagina = 1;
    render();
    const input = document.getElementById('rh_dp_busca');
    input?.focus();
    input?.setSelectionRange?.(input.value.length, input.value.length);
  }

  function filtrarStatus(valor) {
    state.filtroStatus = ['ativo', 'inativo'].includes(valor) ? valor : 'todos';
    state.pagina = 1;
    render();
  }

  function selecionarPagina(pagina) {
    state.pagina = Math.max(1, Number(pagina) || 1);
    render();
  }

  function aplicarMascara(event) {
    const input = event?.target;
    if (!input) return;
    const mask = input.dataset.rhMask;
    if (mask === 'cpf') input.value = formatarCpf(input.value);
    if (mask === 'telefone') input.value = formatarTelefone(input.value);
    if (mask === 'cep') input.value = formatarCep(input.value);
  }

  function atualizarFeedbackCep(mensagem = '', tipo = '') {
    const feedback = document.getElementById('rh_cep_feedback');
    if (!feedback) return;
    feedback.textContent = mensagem;
    feedback.dataset.status = tipo;
  }

  function preencherCampoEndereco(id, valor) {
    const input = document.getElementById(`rh_${id}`);
    if (!input) return;
    input.value = valor || '';
  }

  async function buscarEnderecoCep(event) {
    const input = event?.target || document.getElementById('rh_endereco_cep');
    if (!input || input.disabled || state.modal.modo === 'view') return;

    const cep = digitos(input.value);
    if (cep.length < 8) {
      cepConsultaAtual.cep = '';
      atualizarFeedbackCep('');
      return;
    }

    if (cep === cepConsultaAtual.cep) return;

    cepConsultaAtual.cep = cep;
    const sequencia = cepConsultaAtual.sequencia + 1;
    cepConsultaAtual.sequencia = sequencia;
    atualizarFeedbackCep('Buscando endereço...', 'loading');

    try {
      const resposta = await fetch(`${VIA_CEP_ENDPOINT}/${cep}/json/`);
      if (!resposta.ok) throw new Error('CEP indisponível.');

      const dados = await resposta.json();
      if (sequencia !== cepConsultaAtual.sequencia || digitos(input.value) !== cep) return;

      if (dados?.erro) {
        atualizarFeedbackCep('CEP não localizado. Preencha o endereço manualmente.', 'error');
        return;
      }

      preencherCampoEndereco('endereco_logradouro', dados.logradouro || '');
      preencherCampoEndereco('endereco_bairro', dados.bairro || '');
      preencherCampoEndereco('endereco_cidade', dados.localidade || '');
      preencherCampoEndereco('endereco_uf', normalizarUf(dados.uf));
      atualizarFeedbackCep('Endereço preenchido. Você pode editar os campos manualmente.', 'success');
    } catch {
      if (sequencia !== cepConsultaAtual.sequencia) return;
      atualizarFeedbackCep('Não foi possível buscar o CEP. Preencha o endereço manualmente.', 'error');
    }
  }

  Object.assign(window, {
    hubRhDpAbrirCadastro: abrirCadastro,
    hubRhDpFecharCadastro: fecharCadastro,
    hubRhDpAdicionarDependente: adicionarDependente,
    hubRhDpRemoverDependente: removerDependente,
    hubRhDpSalvarCadastro: salvarCadastro,
    hubRhDpAlterarStatus: alterarStatus,
    hubRhDpEditarArquivo: editarArquivo,
    hubRhDpCancelarArquivo: cancelarArquivo,
    hubRhDpSalvarArquivo: salvarArquivo,
    hubRhDpExcluirArquivo: excluirArquivo,
    hubRhDpAbrirArquivo: abrirArquivo,
    hubRhDpFiltrarBusca: filtrarBusca,
    hubRhDpFiltrarStatus: filtrarStatus,
    hubRhDpSelecionarPagina: selecionarPagina,
    hubRhDpAplicarMascara: aplicarMascara,
    hubRhDpBuscarEnderecoCep: buscarEnderecoCep
    ,hubRhDpSalvarBeneficio: salvarBeneficio
    ,hubRhDpSalvarBancarios: salvarBancarios
    ,hubRhDpAtualizarChecklist: atualizarChecklist
    ,hubRhDpSalvarMovimentacao: salvarMovimentacao
    ,hubRhDpAbrirSecao: abrirSecao
    ,hubRhDpSalvarDemanda: salvarDemanda
    ,hubRhDpSalvarCompetencia: salvarCompetencia
    ,hubRhDpAdicionarEvento: abrirModalEvento
    ,hubRhDpAtualizarEvento: atualizarEvento
    ,hubRhDpConcluirCompetencia: concluirCompetencia
    ,hubRhDpSalvarDesligamento: salvarDesligamento
    ,hubRhDpConcluirChecklistDesligamento: concluirChecklistDesligamento
    ,hubRhDpSalvarFerias: salvarFerias
    ,hubRhDpSalvarAfastamento: salvarAfastamento
    ,hubRhDpSalvarOcorrencia: salvarOcorrencia
  });

  return {
    abrir,
    render
  };
}
