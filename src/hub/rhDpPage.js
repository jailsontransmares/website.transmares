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
  obterFichaPdfRhDp,
  salvarBeneficioRhDp,
  salvarDependenteRhDp,
  salvarDadosBancariosRhDp,
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
  salvarCadastroPessoalRhDp,
  sincronizarPlanilhaRhDp
} from './services/rhDpService.js';
import {
  abrirMenuAcaoGlobal,
  fecharMenuAcaoGlobal,
  limparMenusAcoesGlobais
} from './actionMenuPortal.js';
import { obterRotuloStatusHub } from './statusLabels.js';
import { renderHubStatusDot, renderHubStatusLegend } from './statusIndicators.js';
import { registerHubRecordShortcutHandler, renderHubRecordHeader, renderHubRecordEditButton, renderHubRecordFormFooter, removeHubRecordWorkflowFooter } from './recordWorkflow.js';
import { removeHubFormFooterPortals } from './formFooterPortal.js';

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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function criarRhDpController({
  renderShell,
  pode,
  submoduleEnabled = () => true,
  renderUnavailable = () => {},
  escapeHtml,
  escapeAttr,
  obterPartesRota,
  montarCaminhoModulo,
  navegarParaRota
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
      saving: false,
      colaboradorId: ''
    },
    afastamentoModal: {
      aberto: false,
      saving: false,
      colaboradorId: ''
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
      saving: false,
      colaboradorId: ''
    },
    busca: '',
    filtroStatus: 'ativo',
    syncingSpreadsheet: false,
    pagina: 1,
    modal: criarEstadoModal()
  };

  let menuMaisRhDpAberto = null;
  let faixaNavegacaoRhDp = '';
  let listenersMenuRhDpConfigurados = false;
  let resizeNavegacaoRhDpConfigurado = false;
  let toastRhDpTimer = null;

  function mostrarToastRhDp(mensagem) {
    if (!mensagem || !document.body) return;
    if (toastRhDpTimer) window.clearTimeout(toastRhDpTimer);
    document.getElementById('rh-dp-toast')?.remove();

    const toast = document.createElement('div');
    toast.id = 'rh-dp-toast';
    toast.className = 'rh-dp-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    toast.textContent = mensagem;
    document.body.appendChild(toast);

    toastRhDpTimer = window.setTimeout(() => {
      toast.remove();
      toastRhDpTimer = null;
    }, 3000);
  }

  function criarEstadoModal({
    aberto = false,
    modo = 'view',
    id = '',
    loading = false,
    arquivosLoading = false,
    acaoOperacionalPendente = ''
  } = {}) {
    return {
      aberto,
      modo,
      id,
      loading,
      saving: false,
      snapshotEdicao: null,
      blocosAbertos: { 'dados-pessoais': true },
      aba: 'cadastro',
      colaborador: novoColaborador(),
      documentos: novosDocumentos(),
      vinculo: novoVinculo(),
      dependentes: [],
      beneficios: [],
      beneficiosPendentes: [],
      beneficiosParaEncerrar: [],
      complementoModal: { aberto: false, tipo: '', saving: false, erro: '', form: {} },
      bancarios: {},
      movimentacoes: [],
      ferias: [],
      afastamentos: [],
      desligamentos: [],
      arquivos: [],
      arquivoForm: novoArquivo(id),
      arquivoEditandoId: '',
      arquivosLoading,
      arquivoSaving: false,
      arquivoMessage: '',
      arquivoMessageType: '',
      mensagem: '',
      acaoOperacionalPendente,
      erros: {}
    };
  }

  function podeVer() {
    return pode('rh_dp.colaboradores', 'view');
  }

  function podeVerSensiveis() {
    return pode('rh_dp.colaboradores', 'view_sensitive');
  }

  function podeSincronizarPlanilha() {
    return podeEditar() && podeVerSensiveis();
  }

  function podeImportarPlanilha() {
    return pode('rh_dp.colaboradores', 'create') && podeEditar() && podeVerSensiveis();
  }

  function podeCriar() {
    return pode('rh_dp.colaboradores', 'create') && podeVerSensiveis();
  }

  function podeAdicionarComplemento(tipo = 'dependente') {
    if (!podeVerSensiveis()) return false;
    return tipo === 'beneficio' ? podeEditar() : (podeCriar() || podeEditar());
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

  const RH_SECOES = [
    { id: 'dashboard', pode: podeVerDashboard },
    { id: 'colaboradores', pode: podeVer },
    { id: 'demandas', pode: podeVerDemandas },
    { id: 'fechamentos', pode: podeVerFechamentos }
  ];

  function obterSecaoRota() {
    const partes = obterPartesRota?.() || [];
    const informada = String(partes[1] || 'colaboradores').trim().toLowerCase();
    return RH_SECOES.some(secao => secao.id === informada) ? informada : 'colaboradores';
  }

  function obterSecaoPermitida(secao) {
    const candidata = RH_SECOES.find(item => item.id === secao);
    if (candidata?.pode() && submoduleEnabled(`rh_dp.${candidata.id === 'demandas' ? 'demandas_contabilidade' : candidata.id}`)) return candidata.id;
    return RH_SECOES.find(item => item.pode() && submoduleEnabled(`rh_dp.${item.id === 'demandas' ? 'demandas_contabilidade' : item.id}`))?.id || '';
  }

  function obterCadastroRota() {
    const partes = obterPartesRota?.() || [];
    if (partes[1] !== 'colaboradores' || !partes[2]) return null;
    if (partes[2] === 'novo') return { id: '', modo: 'create' };
    if (['editar', 'visualizar'].includes(partes[2]) && partes[3]) {
      return { id: partes[3], modo: partes[2] === 'editar' ? 'edit' : 'view' };
    }
    return {
      id: partes[2],
      modo: partes[3] === 'editar' ? 'edit' : 'view'
    };
  }

  function obterRotaColaboradores() {
    return `${montarCaminhoModulo('rh-dp').replace(/\/+$/g, '')}/colaboradores`;
  }

  function obterRotaCadastro(id = '', modo = 'view') {
    if (!id) return `${obterRotaColaboradores()}/novo`;
    return `${obterRotaColaboradores()}/${modo === 'edit' ? 'editar' : 'visualizar'}/${id}`;
  }

  function obterFaixaNavegacaoRhDp() {
    const largura = typeof window === 'undefined' ? 1280 : window.innerWidth;
    if (largura <= 480) return 'compact';
    if (largura <= 760) return 'mobile';
    if (largura <= 1000) return 'tablet';
    return 'desktop';
  }

  function fecharMenuMaisRhDp() {
    if (!menuMaisRhDpAberto) return;
    fecharMenuAcaoGlobal(menuMaisRhDpAberto.menu);
    menuMaisRhDpAberto.menu.hidden = true;
    menuMaisRhDpAberto.trigger.setAttribute('aria-expanded', 'false');
    menuMaisRhDpAberto = null;
  }

  function renderMaisRhDp(itens, ativo) {
    if (!itens.length) return '';
    return `
      <div class="hub-responsive-more">
        <button class="hub-responsive-more-trigger ${ativo ? 'is-active' : ''}" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="rh-module-more-menu" data-rh-more-trigger>
          <span>Mais</span><span aria-hidden="true">⌄</span>
        </button>
        <div id="rh-module-more-menu" class="hub-responsive-more-menu" role="menu" aria-label="Mais opções" hidden>
          ${itens.map(([id, nome]) => `<button class="hub-responsive-more-item" role="menuitem" type="button" onclick="hubRhDpAbrirSecao('${id}')">${nome}</button>`).join('')}
        </div>
      </div>
    `;
  }

  function configurarMenusMaisRhDp() {
    if (listenersMenuRhDpConfigurados) return;
    document.addEventListener('click', event => {
      if (!menuMaisRhDpAberto) return;
      if (menuMaisRhDpAberto.trigger.contains(event.target) || menuMaisRhDpAberto.menu.contains(event.target)) return;
      fecharMenuMaisRhDp();
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !menuMaisRhDpAberto) return;
      event.preventDefault();
      const trigger = menuMaisRhDpAberto.trigger;
      fecharMenuMaisRhDp();
      trigger.focus();
    });
    listenersMenuRhDpConfigurados = true;
  }

  function conectarMenuMaisRhDp() {
    configurarMenusMaisRhDp();
    document.querySelectorAll('[data-rh-more-trigger]').forEach(trigger => {
      trigger.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const menu = document.getElementById(trigger.getAttribute('aria-controls') || '');
        if (!menu) return;
        const abrir = menu.hidden;
        fecharMenuMaisRhDp();
        if (!abrir) return;
        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        menuMaisRhDpAberto = { menu, trigger };
        abrirMenuAcaoGlobal(trigger, menu, { minWidth: 190, maxWidth: 320, gap: 6, flipVertical: true });
      });
      const menu = document.getElementById(trigger.getAttribute('aria-controls') || '');
      menu?.querySelectorAll('[role="menuitem"]').forEach(item => item.addEventListener('click', fecharMenuMaisRhDp));
    });
  }

  function configurarResizeNavegacaoRhDp() {
    if (resizeNavegacaoRhDpConfigurado || typeof window === 'undefined') return;
    faixaNavegacaoRhDp = obterFaixaNavegacaoRhDp();
    window.addEventListener('resize', () => {
      const novaFaixa = obterFaixaNavegacaoRhDp();
      if (novaFaixa === faixaNavegacaoRhDp) return;
      faixaNavegacaoRhDp = novaFaixa;

      const partesRota = obterPartesRota?.() || [];
      if (partesRota[0] !== 'rh-dp') return;

      const navegacaoAtual = document
        .getElementById('app')
        ?.querySelector('.rh-module-tabs[aria-label="Menu do RH e DP"]');
      if (!navegacaoAtual) return;

      fecharMenuMaisRhDp();
      const template = document.createElement('template');
      template.innerHTML = renderMenuRhDp().trim();
      const novaNavegacao = template.content.firstElementChild;
      if (!novaNavegacao) return;

      navegacaoAtual.replaceWith(novaNavegacao);
      conectarMenuMaisRhDp();
    });
    resizeNavegacaoRhDpConfigurado = true;
  }

  function renderMenuRhDp() {
    const itens = [
      ['dashboard', 'Dashboard', podeVerDashboard(), 'rh_dp.dashboard'],
      ['colaboradores', 'Colaboradores', podeVer(), 'rh_dp.colaboradores'],
      ['demandas', 'Demandas à contabilidade', podeVerDemandas(), 'rh_dp.demandas_contabilidade'],
      ['fechamentos', 'Fechamento mensal', podeVerFechamentos(), 'rh_dp.fechamentos']
    ].filter(([, , permitido, submodulo]) => permitido && submoduleEnabled(submodulo));
    const faixa = obterFaixaNavegacaoRhDp();
    const limite = faixa === 'compact' ? 2 : faixa === 'mobile' ? 3 : faixa === 'tablet' ? 4 : itens.length;
    const principais = itens.slice(0, limite);
    const secundarias = itens.slice(limite);
    return `<nav class="module-tabs rh-module-tabs hub-module-nav" role="group" aria-label="Menu do RH e DP">${principais.map(([id, nome]) => `<button type="button" class="hub-module-nav-item ${state.secao === id ? 'active is-active' : ''}" onclick="hubRhDpAbrirSecao('${id}')">${nome}</button>`).join('')}${renderMaisRhDp(secundarias, secundarias.some(([id]) => id === state.secao))}</nav>`;
  }

  function renderMetricasRhDp(itens, acoes = '') {
    return `<div class="rh-metrics-bar"><div class="rh-metric-pills" role="group" aria-label="Indicadores da área">${itens.map(({ id, label, shortLabel, value, tone = '' }) => `<span class="rh-metric-pill ${tone ? `is-${tone}` : ''}"><span class="rh-metric-label">${label}</span><span class="rh-metric-short" aria-hidden="true">${shortLabel || label.slice(0, 1)}</span><strong>${value}</strong></span>`).join('')}</div>${acoes ? `<div class="rh-metrics-actions">${acoes}</div>` : ''}</div>`;
  }

  function nomeColaborador(id) {
    return state.colaboradores.find(item => item.id === id)?.nome_completo || 'Colaborador não localizado';
  }

  function opcoesColaboradores(selecionado = '') {
    return state.colaboradores.filter(item => item.status !== 'inativo').map(item => `<option value="${escapeAttr(item.id)}" ${item.id === selecionado ? 'selected' : ''}>${escapeHtml(item.nome_completo)}</option>`).join('');
  }

  function renderFerias() {
    if (!podeVerFerias()) return '<div class="rh-empty-state"><strong>Acesso não liberado</strong><p>Seu perfil não possui acesso às férias.</p></div>';
    const abertas = state.ferias.filter(item => !['confirmado_contabilidade', 'cancelado'].includes(item.status));
    return `
      <section class="admin-panel rh-panel">
        <div class="admin-panel-header rh-panel-header">
          ${renderMenuRhDp()}
          <div>
            <h2>Férias</h2>
            <p>Planejamento, comunicação e confirmação pela contabilidade.</p>
          </div>
          
        </div>
        ${state.message ? `<p class="admin-message ${state.messageType === 'error' ? 'error' : 'success'}">${escapeHtml(state.message)}</p>` : ''}
        ${renderMetricasRhDp([
          { label: 'Em aberto', shortLabel: 'A', value: abertas.length },
          { label: 'Divergentes', shortLabel: 'D', value: state.ferias.filter(item => item.status === 'divergente').length, tone: 'danger' },
          { label: 'Confirmados', shortLabel: 'C', value: state.ferias.filter(item => item.status === 'confirmado_contabilidade').length, tone: 'success' }
        ], podeCriarFerias() ? '<button class="save-btn" type="button" data-rh-action="open-ferias-modal">+ Planejar férias</button>' : '')}
        ${state.controleLoading
          ? (window.hubRenderLoading?.('Carregando férias...') || '<p class="quick-link-empty" role="status">Carregando férias...</p>')
          : `<div class="rh-control-list">${state.ferias.length ? state.ferias.map(item => `<article><div><strong>${escapeHtml(item.rh_colaboradores?.nome_completo || nomeColaborador(item.colaborador_id))}</strong><span>${formatarData(item.inicio_gozo)} a ${formatarData(item.fim_gozo)} · ${item.dias_gozo} dia(s)</span></div><span class="status-badge">${escapeHtml(obterRotuloStatusHub(item.status))}</span></article>`).join('') : '<p class="quick-link-empty">Nenhum planejamento de férias registrado.</p>'}</div>`}
      </section>
      ${renderModalFerias()}
    `;
  }

  function renderFormularioFerias() {
    return `
      <div class="rh-form-grid">
        <label><span>Colaborador *</span><select id="rh_ferias_colaborador" class="config-input"><option value="">Selecione</option>${opcoesColaboradores(state.feriasModal.colaboradorId)}</select></label>
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
          ${renderMenuRhDp()}
          <div>
            <h2>Afastamentos e ocorrências</h2>
            <p>Registro, acompanhamento de retorno e providências internas.</p>
          </div>
          
        </div>
        ${state.message ? `<p class="admin-message ${state.messageType === 'error' ? 'error' : 'success'}">${escapeHtml(state.message)}</p>` : ''}
        ${renderMetricasRhDp([
          { label: 'Em acompanhamento', shortLabel: 'A', value: emAberto.length },
          { label: 'Ocorrências abertas', shortLabel: 'O', value: state.ocorrencias.filter(item => !item.encerrada_em).length },
          { label: 'Divergentes', shortLabel: 'D', value: state.afastamentos.filter(item => item.status === 'divergente').length, tone: 'danger' }
        ], podeCriarOcorrencias() ? '<div class="rh-row-actions"><button class="save-btn" type="button" data-rh-action="open-afastamento-modal">+ Afastamento</button><button class="secondary-btn" type="button" data-rh-action="open-ocorrencia-modal">+ Ocorrência</button></div>' : '')}
        <div class="rh-control-list">
          ${state.afastamentos.length ? state.afastamentos.map(item => `<article><div><strong>${escapeHtml(item.rh_colaboradores?.nome_completo || nomeColaborador(item.colaborador_id))} · ${escapeHtml(item.tipo.replaceAll('_',' '))}</strong><span>Início ${formatarData(item.inicio_em)}${item.previsao_retorno_em ? ` · retorno previsto ${formatarData(item.previsao_retorno_em)}` : ''}</span></div><span class="status-badge">${escapeHtml(obterRotuloStatusHub(item.status))}</span></article>`).join('') : '<p class="quick-link-empty">Nenhum afastamento registrado.</p>'}
          ${state.ocorrencias.length ? state.ocorrencias.map(item => `<article><div><strong>${escapeHtml(item.titulo)} · ${escapeHtml(item.rh_colaboradores?.nome_completo || nomeColaborador(item.colaborador_id))}</strong><span>${formatarData(item.data_ocorrencia)} · ${escapeHtml(item.categoria.replaceAll('_',' '))}</span></div><span class="status-badge">${escapeHtml(obterRotuloStatusHub(item.status))}</span></article>`).join('') : '<p class="quick-link-empty">Nenhuma ocorrência registrada.</p>'}
        </div>
      </section>
      ${renderModalAfastamento()}
      ${renderModalOcorrencia()}
    `;
  }

  function renderFormularioAfastamento() {
    return `
      <div class="rh-form-grid">
        <label><span>Colaborador *</span><select id="rh_afast_colaborador" class="config-input"><option value="">Selecione</option>${opcoesColaboradores(state.afastamentoModal.colaboradorId)}</select></label>
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
          ${renderMenuRhDp()}
          <div>
            <h2>Demandas à contabilidade</h2>
            <p>Controle de solicitações, prazos, retornos e divergências.</p>
          </div>
          
        </div>
        ${state.message ? `<p class="admin-message ${state.messageType === 'error' ? 'error' : 'success'}">${escapeHtml(state.message)}</p>` : ''}
        ${renderMetricasRhDp([
          { label: 'Em aberto', shortLabel: 'A', value: abertas.length },
          { label: 'Prazo vencido', shortLabel: 'P', value: abertas.filter(item => item.prazo && item.prazo < new Date().toISOString().slice(0, 10)).length, tone: 'danger' },
          { label: 'Divergentes', shortLabel: 'D', value: state.demandas.filter(item => item.divergencia_descricao).length, tone: 'danger' }
        ], podeCriarDemandas() ? '<button class="save-btn" type="button" data-rh-action="open-demanda-modal">+ Nova demanda</button>' : '')}
        ${state.controleLoading
          ? (window.hubRenderLoading?.('Carregando demandas...') || '<p class="quick-link-empty" role="status">Carregando demandas...</p>')
          : `<div class="rh-control-list">${state.demandas.length ? state.demandas.map(item => `<article><div><strong>${escapeHtml(item.titulo)}</strong><span>${escapeHtml(item.rh_colaboradores?.nome_completo || formatarCategoriaArquivo(item.tipo))}${item.prazo ? ` · prazo ${formatarData(item.prazo)}` : ''}</span></div><span class="status-badge">${escapeHtml(obterRotuloStatusHub(item.status))}</span></article>`).join('') : '<p class="quick-link-empty">Nenhuma demanda registrada.</p>'}</div>`}
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
          ${renderMenuRhDp()}
          <div>
            <h2>Fechamento mensal</h2>
            <p>Competências, eventos enviados, retorno e conferência com a contabilidade.</p>
          </div>
          
        </div>
        ${state.message ? `<p class="admin-message ${state.messageType === 'error' ? 'error' : 'success'}">${escapeHtml(state.message)}</p>` : ''}
        ${renderMetricasRhDp([
          { label: 'Competências abertas', shortLabel: 'C', value: emAberto },
          { label: 'Eventos pendentes', shortLabel: 'E', value: eventosPendentes },
          { label: 'Divergentes', shortLabel: 'D', value: state.competencias.filter(item => item.status === 'com_divergencia').length, tone: 'danger' }
        ], podeCriarFechamentos() ? '<button class="save-btn" type="button" data-rh-action="open-competencia-modal">+ Nova competência</button>' : '')}
        ${state.controleLoading
          ? (window.hubRenderLoading?.('Carregando competências...') || '<p class="quick-link-empty" role="status">Carregando competências...</p>')
          : `<div class="rh-control-list">${state.competencias.length ? state.competencias.map(item => { const eventos = item.rh_eventos_competencia || []; return `<article><div><strong>${formatarData(item.competencia).slice(3)}</strong><span>${eventos.length} evento(s) · ${item.prazo_envio ? `prazo ${formatarData(item.prazo_envio)}` : 'sem prazo informado'}</span>${eventos.length ? `<small>${eventos.map(evento => `${escapeHtml(evento.tipo.replaceAll('_',' '))}: ${escapeHtml(evento.rh_colaboradores?.nome_completo || evento.descricao)} (${escapeHtml(obterRotuloStatusHub(evento.status))})${podeEditarFechamentos() && !['confirmado','dispensado'].includes(evento.status) ? ` <button type="button" class="icon-action-btn" onclick="hubRhDpAtualizarEvento('${evento.id}')">Atualizar</button>` : ''}`).join(' · ')}</small>` : ''}</div><div class="rh-row-actions"><span class="status-badge">${escapeHtml(obterRotuloStatusHub(item.status))}</span>${podeEditarFechamentos() ? `<button type="button" class="icon-action-btn" data-rh-action="open-evento-modal" data-competencia-id="${escapeAttr(item.id)}">Evento</button><button type="button" class="icon-action-btn" ${eventos.some(evento => ['pendente','enviado','divergencia'].includes(evento.status)) ? 'disabled' : ''} onclick="hubRhDpConcluirCompetencia('${item.id}')">Concluir</button>` : ''}</div></article>`; }).join('') : '<p class="quick-link-empty">Nenhuma competência aberta.</p>'}</div>`}
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
          ${renderMenuRhDp()}
          <div>
            <h2>Desligamentos</h2>
            <p>Controle do processo interno, comunicação e checklist de saída.</p>
          </div>
          
        </div>
        ${state.message ? `<p class="admin-message ${state.messageType === 'error' ? 'error' : 'success'}">${escapeHtml(state.message)}</p>` : ''}
        ${renderMetricasRhDp([
          { label: 'Em andamento', shortLabel: 'A', value: abertos.length },
          { label: 'Aguardando retorno', shortLabel: 'R', value: state.desligamentos.filter(item => item.status === 'aguardando_retorno').length },
          { label: 'Divergentes', shortLabel: 'D', value: state.desligamentos.filter(item => item.status === 'divergente').length, tone: 'danger' }
        ], podeCriarDesligamentos() ? '<button class="save-btn" type="button" data-rh-action="open-desligamento-modal">+ Novo desligamento</button>' : '')}
        ${state.controleLoading
          ? (window.hubRenderLoading?.('Carregando desligamentos...') || '<p class="quick-link-empty" role="status">Carregando desligamentos...</p>')
          : `<div class="rh-control-list">${state.desligamentos.length ? state.desligamentos.map(item => `<article><div><strong>${escapeHtml(item.rh_colaboradores?.nome_completo || nomeColaborador(item.colaborador_id))}</strong><span>${escapeHtml(item.tipo.replaceAll('_',' '))} · competência ${formatarData(item.competencia).slice(3)}${item.ultimo_dia_trabalho ? ` · último dia ${formatarData(item.ultimo_dia_trabalho)}` : ''}</span><small>${(item.rh_checklist_desligamento || []).filter(check => check.status === 'concluido').length}/6 itens da checklist concluídos</small></div><div class="rh-row-actions"><span class="status-badge">${escapeHtml(obterRotuloStatusHub(item.status))}</span>${podeEditarDesligamentos() ? `<button type="button" class="icon-action-btn" onclick="hubRhDpConcluirChecklistDesligamento('${item.id}')">Checklist</button>` : ''}</div></article>`).join('') : '<p class="quick-link-empty">Nenhum desligamento registrado.</p>'}</div>`}
      </section>
      ${renderModalDesligamento()}
    `;
  }

  function renderFormularioDesligamento() {
    return `
      <div class="rh-form-grid">
        <label><span>Colaborador *</span><select id="rh_desligamento_colaborador" class="config-input"><option value="">Selecione</option>${opcoesColaboradores(state.desligamentoModal.colaboradorId)}</select></label>
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
    const pendencias = state.demandas.filter(item => !['concluido','cancelado'].includes(item.status)).length + state.competencias.flatMap(item => item.rh_eventos_competencia || []).filter(item => ['pendente','enviado','divergencia'].includes(item.status)).length;
    return `<section class="admin-panel rh-panel"><div class="admin-panel-header rh-panel-header"><div><h2>Dashboard RH & DP</h2><p>Indicadores operacionais obtidos apenas dos registros aos quais seu perfil possui acesso.</p></div>${renderMenuRhDp()}</div>${renderMetricasRhDp([
      { label: 'Colaboradores ativos', shortLabel: 'C', value: ativos, tone: 'success' },
      { label: 'Pendências', shortLabel: 'P', value: pendencias, tone: pendencias ? 'danger' : 'success' }
    ])}</section>`;
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
        item.cpf_busca,
        ...(item.dependentes_busca || [])
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
        ${renderHubStatusLegend([
          { status: 'ativo', rotulo: 'Ativo' },
          { status: 'inativo', rotulo: 'Inativo' }
        ], 'Legenda de status dos colaboradores')}
      `;
    }

    return `
      <div class="rh-table-wrap">
        <div class="rh-table rh-table-header" role="row">
          <span>Colaborador</span>
          <span>Contato</span>
          <span>Nascimento</span>
          <span>Última atualização</span>
        </div>
        ${pagina.map(item => renderLinha(item)).join('')}
      </div>
      <div class="rh-pagination">
        <span>Mostrando ${inicio + 1}–${Math.min(inicio + pagina.length, filtrados.length)} de ${filtrados.length} colaboradores</span>
        <div>
          <button class="secondary-btn" type="button" aria-label="Página anterior" onclick="hubRhDpSelecionarPagina(${state.pagina - 1})" ${state.pagina <= 1 ? 'disabled' : ''}>‹</button>
          <span>Página ${state.pagina} de ${totalPaginas}</span>
          <button class="secondary-btn" type="button" aria-label="Próxima página" onclick="hubRhDpSelecionarPagina(${state.pagina + 1})" ${state.pagina >= totalPaginas ? 'disabled' : ''}>›</button>
        </div>
      </div>
      ${renderHubStatusLegend([
        { status: 'ativo', rotulo: 'Ativo' },
        { status: 'inativo', rotulo: 'Inativo' }
      ], 'Legenda de status dos colaboradores')}
    `;
  }

  function iniciaisColaborador(nome) {
    const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    const primeira = partes[0][0];
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : partes[0][1] || '';
    return `${primeira}${ultima}`.toLocaleUpperCase('pt-BR');
  }

  function renderLinha(item) {
    const idade = calcularIdade(item.data_nascimento);
    const contato = item.telefone_celular || item.email_contato || '-';
    const status = item.status === 'inativo' ? 'inativo' : 'ativo';
    const colaboradorCodigo = escapeAttr(item.codigo || item.id);

    return `
      <article class="rh-table rh-table-row" role="row">
        <div class="rh-person-cell">
          <span class="rh-person-avatar" aria-hidden="true">${escapeHtml(iniciaisColaborador(item.nome_completo))}</span>
          <div class="rh-person-name-row">
            ${renderHubStatusDot(status, 'do colaborador')}
            <button class="rh-person-name" type="button" aria-label="Visualizar cadastro de ${escapeAttr(item.nome_completo || 'colaborador')}" onclick="hubRhDpAbrirCadastro('${colaboradorCodigo}', 'view')">${escapeHtml(item.nome_completo || '-')}</button>
          </div>
        </div>
        <span>${escapeHtml(contato)}</span>
        <span>${escapeHtml(formatarData(item.data_nascimento))}${idade == null ? '' : `<small>${idade} anos</small>`}</span>
        <span>${escapeHtml(formatarDataHora(item.updated_at))}</span>
      </article>
    `;
  }

  function renderToolbar() {
    const filtros = [
      ['todos', 'Todos'],
      ['ativo', 'Ativos'],
      ['inativo', 'Inativos']
    ];
    const filtroSelecionado = filtros.find(([id]) => id === state.filtroStatus) || filtros[0];

    return `
      <div class="rh-toolbar">
        <label class="rh-search">
          <span>Buscar colaboradores</span>
          <input
            id="rh_dp_busca"
            class="config-input"
            type="search"
            value="${escapeAttr(state.busca)}"
            placeholder="Buscar colaborador(a)"
            aria-label="Buscar colaborador(a)"
            oninput="hubRhDpFiltrarBusca(this.value)"
          >
        </label>
        <div class="rh-collaborators-actions">
          ${podeSincronizarPlanilha() ? `<button class="secondary-btn rh-collaborators-sync" type="button" data-rh-action="sync-spreadsheet" ${state.syncingSpreadsheet || state.loading ? 'disabled' : ''} title="Envia até 20 alterações pendentes do Hub para a planilha">Enviar ao Sheets</button>` : ''}
          ${podeImportarPlanilha() ? `<button class="secondary-btn rh-collaborators-import" type="button" data-rh-action="import-spreadsheet" ${state.syncingSpreadsheet || state.loading ? 'disabled' : ''} title="Cria no Hub colaboradores com CPF que ainda não existe no cadastro; CPFs já cadastrados não são alterados">${state.syncingSpreadsheet ? 'Importando…' : 'Importar da planilha'}</button>` : ''}
          <details class="hub-row-actions-menu rh-filter-menu" data-hub-action-menu data-hub-action-min-width="210" data-hub-action-max-width="260" data-hub-action-gap="8" data-hub-action-flip-vertical="true" data-hub-action-keyboard="true" data-hub-action-focus="selected">
            <summary class="secondary-btn rh-filter-trigger" aria-haspopup="menu" aria-expanded="false" aria-label="Filtrar colaboradores por status${state.filtroStatus !== 'todos' ? `: ${filtroSelecionado[1]}` : ''}" title="Filtrar colaboradores">
              <i data-lucide="sliders-horizontal" aria-hidden="true"></i>
            </summary>
            <div class="hub-row-actions-popover rh-filter-popover" data-hub-action-popover role="menu" aria-label="Filtros de colaboradores">
              <div class="rh-filter-heading" role="presentation"><strong>Status</strong></div>
              ${filtros.map(([id, nome]) => `
                <button type="button" role="menuitemradio" aria-checked="${state.filtroStatus === id ? 'true' : 'false'}" class="rh-filter-option ${state.filtroStatus === id ? 'is-selected' : ''}" onclick="hubRhDpFiltrarStatus('${id}')">
                  <span class="rh-filter-check" aria-hidden="true"></span>
                  <span>${nome}</span>
                </button>
              `).join('')}
            </div>
          </details>
        </div>
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
        ${state.secao === 'dashboard' ? renderDashboard() : state.secao === 'demandas' ? renderDemandas() : state.secao === 'fechamentos' ? renderFechamentos() : state.modal.aberto ? `${renderModal()}${renderModalFerias()}${renderModalAfastamento()}${renderModalDesligamento()}` : `
        <section class="admin-panel rh-panel">
          <div class="admin-panel-header rh-panel-header rh-collaborators-header">
            <div class="rh-collaborators-title-row">
              <div>
                <h2>Colaboradores</h2>
                <p>Cadastro pessoal para controle interno da Transmares.</p>
              </div>
              ${podeCriar() ? '<button class="save-btn rh-collaborators-add" type="button" data-rh-action="open-create"><i data-lucide="plus" aria-hidden="true"></i> Incluir colaborador</button>' : ''}
            </div>
            ${renderMenuRhDp()}
          </div>

          <div class="rh-collaborators-overview">${renderToolbar()}</div>
          ${state.message ? `<p class="admin-message ${state.messageType === 'error' ? 'error' : state.messageType === 'warning' ? 'warning' : 'success'}" role="${state.messageType === 'error' ? 'alert' : 'status'}">${escapeHtml(state.message)}</p>` : ''}
          ${state.loading ? (window.hubRenderLoading?.('Carregando colaboradores...') || '<p class="quick-link-empty" role="status">Carregando colaboradores...</p>') : renderTabela()}
        </section>`}
      `;

    fecharMenuMaisRhDp();
    limparMenusAcoesGlobais();
    document.getElementById('app').innerHTML = renderShell({
      tituloPagina: 'RH & DP',
      descricaoPagina: 'Cadastro e gestão interna de colaboradores.',
      classeConteudo: 'rh-dp-page',
      conteudo
    });
    conectarEventos();
    conectarMenuMaisRhDp();
    configurarResizeNavegacaoRhDp();
  }

  function conectarEventos() {
    document.querySelectorAll('[data-rh-action="open-create"]').forEach(botao => botao.addEventListener('click', () => {
      abrirCadastro('', 'create');
    }));
    document.querySelector('[data-rh-action="sync-spreadsheet"]')?.addEventListener('click', sincronizarPlanilha);
    document.querySelector('[data-rh-action="import-spreadsheet"]')?.addEventListener('click', importarDaPlanilha);
    document.querySelector('[data-rh-action="quick-open-modal-ferias"]')?.addEventListener('click', () => abrirAcaoOperacionalColaborador('ferias'));
    document.querySelector('[data-rh-action="quick-open-modal-afastamento"]')?.addEventListener('click', () => abrirAcaoOperacionalColaborador('afastamento'));
    document.querySelector('[data-rh-action="quick-open-modal-desligamento"]')?.addEventListener('click', () => abrirAcaoOperacionalColaborador('desligamento'));
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

  async function sincronizarPlanilha() {
    if (state.syncingSpreadsheet || !podeSincronizarPlanilha()) return;
    state.syncingSpreadsheet = true;
    state.message = '';
    render();

    try {
      const result = await sincronizarPlanilhaRhDp();
      const processed = Number(result.processed) || 0;
      const failed = (result.results || []).filter(item => item.status !== 'success').length;
      state.message = processed === 0
        ? 'Não há alterações pendentes para enviar à planilha.'
        : failed
          ? `${processed} alteração(ões) processada(s); ${failed} apresentou(aram) erro e será(ão) tentada(s) novamente.`
          : `${processed} alteração(ões) sincronizada(s) com a planilha.`;
      state.messageType = failed ? 'error' : 'success';
    } catch (error) {
      state.message = error.message || 'Não foi possível sincronizar com a planilha.';
      state.messageType = 'error';
    } finally {
      state.syncingSpreadsheet = false;
      render();
    }
  }

  async function importarDaPlanilha() {
    if (state.syncingSpreadsheet || !podeImportarPlanilha()) return;
    state.syncingSpreadsheet = true;
    state.message = '';
    render();

    try {
      const result = await sincronizarPlanilhaRhDp({ importar: true });
      state.colaboradores = await listarColaboradoresRhDp({ incluirSensiveis: podeVerSensiveis() });
      const imported = Number(result.imported) || 0;
      const existing = Number(result.existing) || 0;
      const failures = Array.isArray(result.failures) ? result.failures : [];
      const warnings = Array.isArray(result.warnings) ? result.warnings : [];
      const skippedColumns = Number(result.skippedColumns) || warnings.length;
      const remaining = Number(result.remaining) || 0;
      const parts = [`${imported} colaborador(es) novo(s) importado(s)`, `${existing} CPF(s) já existente(s) ignorado(s)`];
      if (remaining) parts.push(`${remaining} cadastro(s) novo(s) aguardando outra execução`);
      if (skippedColumns) parts.push(`${skippedColumns} coluna(s) ignorada(s) por formato${warnings.slice(0, 3).map(item => ` — linha ${item.row}: ${item.column}`).join('')}`);
      if (failures.length) parts.push(`${failures.length} linha(s) com problema${failures.slice(0, 3).map(item => ` — linha ${item.row}: ${item.message}`).join('')}`);
      state.message = parts.join('; ') + '.';
      state.messageType = failures.length ? 'error' : skippedColumns ? 'warning' : 'success';
    } catch (error) {
      state.message = error.message || 'Não foi possível importar os dados da planilha.';
      state.messageType = 'error';
    } finally {
      state.syncingSpreadsheet = false;
      render();
    }
  }

  function campo(id, label, valor, {
    type = 'text',
    required = false,
    readonly = false,
    placeholder = '',
    mask = '',
    maxLength = '',
    minLength = ''
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
          ${minLength ? `minlength="${escapeAttr(minLength)}"` : ''}
          ${required ? 'required' : ''}
          ${readonly ? 'disabled' : ''}
        >
      </label>
    `;
  }

  const rotulosOpcoesSelect = {
    ativo: 'Ativo', inativo: 'Inativo',
    rg: 'RG', cnh: 'CNH', clt: 'CLT',
    estagio: 'Estágio', socio: 'Sócio', temporario: 'Temporário',
    experiencia: 'Em experiência', afastado: 'Afastado', desligado: 'Desligado',
    salario: 'Salário', pro_labore: 'Pró-labore', honorario: 'Honorário',
    flexivel: 'Flexível', hibrido: 'Híbrido',
    vale_transporte: 'Vale-transporte', vale_refeicao: 'Vale-refeição',
    vale_alimentacao: 'Vale-alimentação', plano_saude: 'Plano de saúde',
    seguro_vida: 'Seguro de vida',
    corrente: 'Conta corrente', poupanca: 'Poupança', pagamento: 'Conta de pagamento',
    cpf: 'CPF', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Aleatória',
    nao_definido: 'Não definido', nao_aplicavel: 'Não aplicável',
    cargo_funcao: 'Cargo/função', remuneracao: 'Remuneração',
    jornada: 'Jornada', beneficio: 'Benefício', dados_bancarios: 'Dados bancários',
    situacao: 'Situação', outro: 'Outro', outros: 'Outros'
  };

  function formatarRotuloOpcaoSelect(opcao) {
    const texto = String(opcao ?? '').trim();
    if (!texto) return texto;
    const rotuloConhecido = rotulosOpcoesSelect[texto.toLocaleLowerCase('pt-BR')];
    if (rotuloConhecido) return rotuloConhecido;

    const legivel = texto.replaceAll('_', ' ');
    return legivel.charAt(0).toLocaleUpperCase('pt-BR') + legivel.slice(1);
  }

  function campoSelect(id, label, valor, opcoes, { required = false, readonly = false, className = '' } = {}) {
    return `
      <label>
        <span>${escapeHtml(label)}${required ? ' *' : ''}</span>
        <select id="rh_${escapeAttr(id)}" class="config-input${className ? ` ${escapeAttr(className)}` : ''}" ${required ? 'required' : ''} ${readonly ? 'disabled' : ''}>
          <option value="">Selecione</option>
          ${opcoes.map(opcao => `
            <option value="${escapeAttr(opcao)}" ${String(valor || '') === opcao ? 'selected' : ''}>${escapeHtml(formatarRotuloOpcaoSelect(opcao))}</option>
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
            <option value="${escapeAttr(chave)}" ${String(valor || '') === chave ? 'selected' : ''}>${escapeHtml(formatarRotuloOpcaoSelect(nome))}</option>
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
        <div class="rh-form-grid rh-personal-grid">
          <label class="rh-span-2">
            <span>Nome completo *</span>
            <input id="rh_nome_completo" class="config-input" type="text" value="${escapeAttr(item.nome_completo || '')}" required ${readonly ? 'disabled' : ''}>
          </label>
          ${campo('data_nascimento', 'Data de nascimento', item.data_nascimento, { type: 'date', required: true, readonly })}
          ${campoSelect('sexo', 'Sexo', item.sexo, ['Feminino', 'Masculino', 'Intersexo', 'Prefere não informar'], { readonly })}
          ${campoSelect('estado_civil', 'Estado civil', item.estado_civil, ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)', 'Separado(a)'], { readonly })}
          ${campo('nacionalidade', 'Nacionalidade', item.nacionalidade, { readonly })}
          ${campo('naturalidade', 'Naturalidade', item.naturalidade, { readonly })}
          ${campoSelect('cor_raca', 'Cor/raça', item.cor_raca, ['Amarela', 'Branca', 'Indígena', 'Parda', 'Preta', 'Prefere não informar'], { readonly })}
          ${campoSelect('escolaridade', 'Escolaridade', item.escolaridade, ['Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo', 'Superior incompleto', 'Superior completo', 'Pós-graduação', 'Mestrado', 'Doutorado'], { readonly })}
          ${campo('nome_pai', 'Nome completo do pai', item.nome_pai, { readonly })}
          ${campo('nome_mae', 'Nome completo da mãe', item.nome_mae, { readonly })}
          ${campoSelect('status', 'Status do cadastro', item.status, ['ativo', 'inativo'], { required: true, readonly, className: 'rh-status-input' })}
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
        <div class="rh-form-grid rh-contact-grid">
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
          <span>Localização residencial com preenchimento automático pelo CEP.</span>
        </div>
        <div class="rh-form-grid rh-address-grid">
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
        <div class="rh-form-grid rh-documents-grid">
          ${campo('cpf', 'CPF', formatarCpf(item.cpf), { required: true, readonly, mask: 'cpf', placeholder: '000.000.000-00' })}
          ${campoSelect('identidade_tipo', 'Tipo de documento', item.identidade_tipo, ['rg', 'cnh'], { readonly })}
          ${campo('identidade_numero', 'Nº do documento', item.identidade_numero, { readonly })}
          ${campo('identidade_orgao_emissor', 'Órgão emissor', item.identidade_orgao_emissor, { readonly })}
          ${campo('identidade_uf_emissor', 'UF emissora', item.identidade_uf_emissor, { readonly, maxLength: 2 })}
          ${campo('identidade_data_emissao', 'Data de emissão', item.identidade_data_emissao, { type: 'date', readonly })}
          ${campo('cnh_categoria', 'Categoria CNH', item.cnh_categoria, { readonly })}
          ${campo('titulo_eleitor', 'Título', item.titulo_eleitor, { readonly })}
          ${campo('zona_eleitoral', 'Zona', item.zona_eleitoral, { readonly })}
          ${campo('secao_eleitoral', 'Seção', item.secao_eleitoral, { readonly })}
          ${campo('ctps_numero', 'Número CTPS', item.ctps_numero, { readonly })}
          ${campo('ctps_serie', 'Série', item.ctps_serie, { readonly })}
          ${campo('ctps_data_expedicao', 'Expedição', item.ctps_data_expedicao, { type: 'date', readonly })}
          ${campo('ctps_uf', 'UF', item.ctps_uf, { readonly, maxLength: 2 })}
          ${campo('pis_numero', 'Número PIS', item.pis_numero, { readonly })}
          ${campo('pis_data_cadastro', 'Data de cadastro', item.pis_data_cadastro, { type: 'date', readonly })}
          ${campo('reservista_numero', 'Documento militar', item.reservista_numero, { readonly })}
          ${campo('reservista_categoria', 'Categoria', item.reservista_categoria, { readonly })}
        </div>
      </section>
    `;
  }

  function renderSecaoDependentes(readonly) {
    if (!podeVerSensiveis()) return '';

    return `
      <div class="rh-complement-subsection rh-dependents-section">
        <div class="rh-form-section-title rh-dependents-title rh-complement-subsection-title">
          <div>
            <strong>Dependentes</strong>
          </div>
          <button class="secondary-btn" type="button" onclick="hubRhDpAbrirComplementoModal('dependente')" ${podeAdicionarComplemento('dependente') ? '' : 'disabled'}>+ Dependente</button>
        </div>
        <div class="rh-dependents-list">
          ${state.modal.dependentes.length
            ? state.modal.dependentes.map((item, indice) => `
              <article class="rh-dependent-row${readonly ? '' : ' has-actions'}">
                <div class="rh-dependent-value"><span>Parentesco</span><strong>${escapeHtml(item.parentesco || '—')}</strong></div>
                <div class="rh-dependent-value"><span>Nome</span><strong>${escapeHtml(item.nome_completo || '—')}</strong></div>
                <div class="rh-dependent-value"><span>Nascimento</span><strong>${escapeHtml(item.data_nascimento ? formatarData(item.data_nascimento) : '—')}</strong></div>
                <div class="rh-dependent-value"><span>CPF</span><strong>${escapeHtml(item.cpf ? formatarCpf(item.cpf) : '—')}</strong></div>
                ${readonly ? '' : `<button class="icon-action-btn danger-text" type="button" onclick="hubRhDpRemoverDependente(${indice})" aria-label="Remover dependente ${escapeAttr(item.nome_completo || '')}">Remover</button>`}
              </article>
            `).join('')
            : '<p class="quick-link-empty">Nenhum dependente informado.</p>'}
        </div>
      </div>
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
        </div>
        <div class="rh-form-grid rh-employment-grid">
          ${campoSelect('tipo_vinculo', 'Tipo de vínculo', item.tipo_vinculo, ['clt', 'estagio', 'socio', 'prestador', 'temporario', 'outro'], { readonly })}
          ${campo('data_admissao', 'Data de admissão', item.data_admissao, { type: 'date', readonly })}
          ${campo('cargo', 'Cargo', item.cargo, { readonly })}
          ${campo('funcao', 'Função', item.funcao, { readonly })}
          ${campo('cbo', 'CBO', item.cbo, { readonly, placeholder: '0000-00' })}
        </div>
        <div class="rh-form-grid rh-employment-grid">
          ${campo('departamento', 'Departamento/área', item.departamento, { readonly })}
          ${campoSelect('tipo_remuneracao', 'Tipo de remuneração', item.tipo_remuneracao, ['salario', 'bolsa', 'pro_labore', 'honorario', 'outro'], { readonly })}
          ${campo('remuneracao_valor', 'Valor da remuneração', formatarMoeda(item.remuneracao_valor), { readonly, placeholder: '0,00' })}
          ${campoSelect('modelo_jornada', 'Modelo de jornada', item.modelo_jornada, ['integral', 'parcial', 'escala', 'flexivel', 'remoto', 'hibrido', 'outro'], { readonly })}
          ${campo('carga_horaria_semanal', 'Carga horária semanal', item.carga_horaria_semanal, { readonly, placeholder: '44' })}
        </div>
        <div class="rh-form-grid rh-employment-grid rh-employment-schedule-grid">
          ${campo('horario_entrada', 'Entrada', item.horario_entrada, { type: 'time', readonly })}
          ${campo('horario_saida', 'Saída', item.horario_saida, { type: 'time', readonly })}
          ${campo('intervalo_inicio', 'Início do intervalo', item.intervalo_inicio, { type: 'time', readonly })}
          ${campo('intervalo_fim', 'Fim do intervalo', item.intervalo_fim, { type: 'time', readonly })}
          ${campo('dias_trabalho', 'Dias de trabalho', item.dias_trabalho, { readonly, placeholder: 'Segunda a sexta' })}
          ${campo('data_desligamento', 'Data de desligamento', item.data_desligamento, { type: 'date', readonly })}
        </div>
      </section>
    `;
  }

  function renderSecaoBeneficios(readonly) {
    if (!podeVerSensiveis()) return '';
    const itens = state.modal.beneficios.filter(item => !item._removerPendente);
    return `<div class="rh-complement-subsection rh-benefits-section"><div class="rh-form-section-title rh-files-title rh-complement-subsection-title"><div><strong>Benefícios</strong></div><button class="secondary-btn" type="button" onclick="hubRhDpAbrirComplementoModal('beneficio')" ${podeAdicionarComplemento('beneficio') ? '' : 'disabled'}>+ Benefício</button></div>
      <div class="rh-files-list">${itens.length ? itens.map(item => `<article class="rh-file-row"><div class="rh-file-main"><strong>${escapeHtml(item.nome || 'Benefício')}</strong><span>${escapeHtml(formatarRotuloOpcaoSelect(item.tipo))} · ${escapeHtml(item._pendente ? 'Pendente de salvar' : obterRotuloStatusHub(item.status))}</span><small>${item.operadora_fornecedor ? escapeHtml(item.operadora_fornecedor) : ''}</small></div>${!readonly && item.status !== 'encerrado' ? `<div class="rh-file-actions"><button class="icon-action-btn danger-text" type="button" onclick="hubRhDpRemoverBeneficio('${escapeAttr(item._chaveTemporaria || item.id)}')" aria-label="Remover benefício ${escapeAttr(item.nome || '')}">Remover</button></div>` : ''}</article>`).join('') : '<p class="quick-link-empty">Nenhum benefício informado.</p>'}</div></div>`;
  }

  function renderSecaoBancarios(readonly) {
    if (!podeVerSensiveis()) return '';
    const item = state.modal.bancarios;
    return `<section class="rh-form-section"><div class="rh-form-section-title"><strong>Dados bancários</strong><span>Dados sensíveis para controle interno.</span></div><div class="rh-form-grid rh-banking-grid">${campoSelect('banco_tipo_conta','Tipo de conta',item.tipo_conta,['corrente','poupanca','pagamento','outro'],{readonly})}${campo('banco_codigo','Código do banco',item.banco_codigo,{readonly})}${campo('banco_nome','Banco',item.banco_nome,{readonly})}${campo('banco_agencia','Agência',item.agencia,{readonly})}${campo('banco_conta','Conta',item.conta,{readonly})}${campoSelect('banco_pix_tipo','Tipo da chave PIX',item.pix_tipo,['cpf','email','telefone','aleatoria'],{readonly})}${campo('banco_pix_chave','Chave PIX',item.pix_chave,{readonly})}</div></section>`;
  }

  function renderSecaoHistoricoAlteracoes(readonly) {
    if (!podeVerSensiveis()) return '';
    return `<section class="rh-form-section"><div class="rh-form-section-title"><strong>Histórico de alterações</strong><span>Alterações profissionais registradas no cadastro.</span></div><div class="rh-history-list">${state.modal.movimentacoes.length ? state.modal.movimentacoes.map(item=>`<article><strong>${escapeHtml(item.titulo)}</strong><span>${formatarData(item.data_efetivacao)} · ${escapeHtml(item.tipo.replaceAll('_',' '))}</span>${item.descricao?`<small>${escapeHtml(item.descricao)}</small>`:''}</article>`).join(''):'<p class="quick-link-empty">Nenhuma alteração registrada.</p>'}</div>${readonly||!state.modal.id?'':`<details class="rh-control-form"><summary>Registrar alteração</summary><div class="rh-form-grid">${campoSelect('mov_tipo','Tipo','',['cargo_funcao','remuneracao','jornada','beneficio','dados_bancarios','situacao','outro'])}${campo('mov_data','Data de efetivação','',{type:'date'})}${campo('mov_titulo','Título','')}${campoTextarea('mov_descricao','Descrição','',{rows:2})}</div><button type="button" class="save-btn" onclick="hubRhDpSalvarMovimentacao()">Registrar alteração</button></details>`}</section>`;
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
      return window.hubRenderLoading?.('Carregando arquivos...') || '<p class="quick-link-empty" role="status">Carregando arquivos...</p>';
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

  function renderSecaoObservacoes(readonly) {
    return `
      <label class="rh-observations-field">
        <span>Observações do cadastro</span>
        <textarea id="rh_observacoes" class="config-input rh-textarea" rows="4" ${readonly ? 'disabled' : ''}>${escapeHtml(state.modal.colaborador.observacoes || '')}</textarea>
      </label>
    `;
  }

  function renderSecaoHistoricoOperacional() {
    const renderRegistro = (item, tipo) => {
      const titulo = tipo === 'ferias'
        ? `${formatarData(item.inicio_gozo)} a ${formatarData(item.fim_gozo)}`
        : tipo === 'afastamentos'
          ? (item.tipo || 'Afastamento').replaceAll('_', ' ')
          : (item.tipo || 'Desligamento').replaceAll('_', ' ');
      const detalhe = tipo === 'ferias'
        ? `${item.dias_gozo || '-'} dia(s) · ${item.status || 'sem status'}`
        : tipo === 'afastamentos'
          ? `Início ${formatarData(item.inicio_em)}${item.previsao_retorno_em ? ` · retorno ${formatarData(item.previsao_retorno_em)}` : ''}`
          : `${item.competencia ? `Competência ${formatarData(item.competencia).slice(3)}` : ''}${item.ultimo_dia_trabalho ? ` · último dia ${formatarData(item.ultimo_dia_trabalho)}` : ''}`;
      return `<article class="rh-operational-record"><div><strong>${escapeHtml(titulo)}</strong><span>${escapeHtml(detalhe)}</span></div><span class="status-badge">${escapeHtml(obterRotuloStatusHub(item.status, 'Sem status'))}</span></article>`;
    };

    const blocos = [
      ['Férias', 'ferias', state.modal.ferias, podeVerFerias(), podeCriarFerias(), 'quick-open-modal-ferias'],
      ['Afastamentos', 'afastamentos', state.modal.afastamentos, podeVerOcorrencias(), podeCriarOcorrencias(), 'quick-open-modal-afastamento'],
      ['Desligamento', 'desligamentos', state.modal.desligamentos, podeVerDesligamentos(), podeCriarDesligamentos(), 'quick-open-modal-desligamento']
    ].filter(([, , , permitido]) => permitido);

    if (!blocos.length) return '<section class="rh-form-section"><strong>Histórico operacional</strong><p>Seu perfil não possui permissão para visualizar esses registros.</p></section>';

    return `<div class="rh-operational-history">${blocos.map(([titulo, tipo, itens, permitido, podeCriar, action]) => `<section class="rh-form-section rh-operational-section"><div class="rh-form-section-title"><strong>${titulo}</strong>${podeCriar && state.modal.id ? `<button class="secondary-btn" type="button" data-rh-action="${action}">+ Incluir</button>` : ''}</div><div class="rh-operational-list">${itens.length ? itens.slice(0, 8).map(item => renderRegistro(item, tipo)).join('') : '<p class="quick-link-empty">Nenhum registro encontrado.</p>'}</div>${itens.length > 8 ? `<small class="rh-operational-more">Exibindo os 8 registros mais recentes.</small>` : ''}</section>`).join('')}</div>`;
  }

  function atualizarBlocoCadastro(id, aberto) {
    if (!state.modal.aberto || !id) return;
    state.modal.blocosAbertos = {
      ...state.modal.blocosAbertos,
      [id]: Boolean(aberto)
    };
  }

  function renderBlocoCadastro(id, titulo, conteudo, { className = '' } = {}) {
    const aberto = state.modal.blocosAbertos?.[id] ?? id === 'dados-pessoais';
    return `
      <details
        class="rh-form-section rh-collaborator-accordion ${className}"
        data-rh-block="${escapeAttr(id)}"
        ${aberto ? 'open' : ''}
        ontoggle="hubRhDpAtualizarBlocoCadastro('${escapeAttr(id)}', this.open)"
      >
        <summary class="rh-collaborator-accordion-summary">
          <strong>${escapeHtml(titulo)}</strong>
          <i data-lucide="chevron-down" aria-hidden="true"></i>
        </summary>
        <div class="rh-collaborator-accordion-content">${conteudo}</div>
      </details>
    `;
  }

  function renderBlocosCadastro(readonly) {
    const blocos = [
      renderBlocoCadastro(
        'dados-pessoais',
        'Dados Pessoais',
        `<div class="rh-personal-data-sections">${renderSecaoDadosPessoais(readonly)}${renderSecaoContatos(readonly)}${renderSecaoEndereco(readonly)}${renderSecaoDocumentos(readonly)}${renderSecaoBancarios(readonly)}</div>`,
        { className: 'rh-personal-data-accordion' }
      ),
      renderBlocoCadastro('vinculo', 'Vínculo profissional', renderSecaoVinculo(readonly)),
      ...(podeVerSensiveis() ? [
        renderBlocoCadastro(
          'complemento',
          'Dependentes e benefícios',
          `<section class="rh-form-section rh-complement-section">${renderSecaoDependentes(readonly)}${renderSecaoBeneficios(readonly)}</section>`
        )
      ] : []),
      renderBlocoCadastro('observacoes', 'Observações', renderSecaoObservacoes(readonly)),
      renderBlocoCadastro('anexos', 'Anexos', renderSecaoArquivos(readonly))
    ];

    return blocos.join('');
  }

  function possuiAbaAnotacoes() {
    return Boolean(state.modal.id && (podeVerSensiveis() || podeVerFerias() || podeVerOcorrencias() || podeVerDesligamentos()));
  }

  function renderAbasCadastro() {
    return `
      <nav class="rh-record-tabs" aria-label="Seções do cadastro" role="tablist">
        <button type="button" id="rh-record-tab-cadastro" class="rh-record-tab ${state.modal.aba === 'cadastro' ? 'is-active' : ''}" role="tab" aria-selected="${state.modal.aba === 'cadastro'}" aria-controls="rh-record-tab-panel" onclick="hubRhDpMudarAbaCadastro('cadastro')">Cadastro</button>
        ${possuiAbaAnotacoes() ? `<button type="button" id="rh-record-tab-anotacoes" class="rh-record-tab ${state.modal.aba === 'anotacoes' ? 'is-active' : ''}" role="tab" aria-selected="${state.modal.aba === 'anotacoes'}" aria-controls="rh-record-tab-panel" onclick="hubRhDpMudarAbaCadastro('anotacoes')">Anotações</button>` : ''}
      </nav>
    `;
  }

  function mudarAbaCadastro(aba) {
    if (!state.modal.aberto || state.modal.loading || state.modal.saving) return;
    capturarFormulario();
    state.modal.aba = aba === 'anotacoes' && possuiAbaAnotacoes() ? 'anotacoes' : 'cadastro';
    render();
  }

  function renderConteudoAbaCadastro(readonly) {
    return state.modal.aba === 'anotacoes' && possuiAbaAnotacoes()
      ? `${renderSecaoHistoricoAlteracoes(readonly)}${podeVerFerias() || podeVerOcorrencias() || podeVerDesligamentos() ? renderSecaoHistoricoOperacional() : ''}`
      : renderBlocosCadastro(readonly);
  }

  function renderModalComplemento() {
    const modal = state.modal.complementoModal;
    if (!modal?.aberto) return '';
    const ehBeneficio = modal.tipo === 'beneficio';
    const form = modal.form || {};
    const titulo = ehBeneficio ? 'Adicionar benefício' : 'Adicionar dependente';
    const campos = ehBeneficio
      ? `<div class="rh-form-grid">
          ${campoSelect('complemento_beneficio_tipo', 'Tipo de benefício', form.tipo, ['vale_transporte','vale_refeicao','vale_alimentacao','plano_saude','seguro_vida','auxilio','outro'], { required: true })}
          ${campo('complemento_beneficio_nome', 'Nome do benefício', form.nome, { required: true })}
          ${campo('complemento_beneficio_operadora', 'Operadora/fornecedor', form.operadora_fornecedor)}
          ${campo('complemento_beneficio_valor_empresa', 'Valor empresa', form.valor_empresa, { placeholder: '0,00' })}
          ${campo('complemento_beneficio_valor_colaborador', 'Valor colaborador', form.valor_colaborador, { placeholder: '0,00' })}
          ${campo('complemento_beneficio_inicio', 'Início', form.inicio_em, { type: 'date' })}
        </div>`
      : `<div class="rh-form-grid rh-dependent-modal-grid">
          ${campo('complemento_dependente_parentesco', 'Parentesco', form.parentesco)}
          ${campo('complemento_dependente_nome', 'Nome completo', form.nome_completo, { required: true, minLength: 3 })}
          ${campo('complemento_dependente_nascimento', 'Data de nascimento', form.data_nascimento, { type: 'date', required: true })}
          ${campo('complemento_dependente_cpf', 'CPF', form.cpf, { mask: 'cpf', placeholder: '000.000.000-00' })}
        </div>`;

    return `
      <div class="modal-backdrop rh-modal-backdrop" role="dialog" aria-modal="true" aria-label="${escapeAttr(titulo)}">
        <section class="small-modal rh-modal rh-complement-modal">
          <div class="small-modal-header">
            <div><h3>${escapeHtml(titulo)}</h3><p>${ehBeneficio ? 'Informe os dados para incluir o benefício.' : 'Informe os dados cadastrais do dependente.'}</p></div>
            <button class="secondary-btn" type="button" onclick="hubRhDpFecharComplementoModal()" ${modal.saving ? 'disabled' : ''}>Fechar</button>
          </div>
          <div class="rh-modal-content">
            ${modal.erro ? `<p class="admin-message error" role="alert">${escapeHtml(modal.erro)}</p>` : ''}
            ${campos}
          </div>
          <div class="small-modal-actions rh-modal-actions">
            <button class="secondary-btn" type="button" onclick="hubRhDpFecharComplementoModal()" ${modal.saving ? 'disabled' : ''}>Cancelar</button>
            <button class="save-btn" type="button" onclick="hubRhDpSalvarComplementoModal()" ${modal.saving ? 'disabled' : ''}>${modal.saving ? 'Salvando...' : 'Adicionar'}</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderAcoesCadastro() {
    if (!['view', 'edit'].includes(state.modal.modo) || !state.modal.id) return '';
    const colaborador = state.modal.colaborador;
    const colaboradorId = escapeAttr(state.modal.id);
    const ativo = colaborador.status !== 'inativo';
    const acoes = [];

    if (ativo && podeCriarFerias()) acoes.push('<button type="button" role="menuitem" data-rh-action="quick-open-modal-ferias">Incluir férias</button>');
    if (ativo && podeCriarOcorrencias()) acoes.push('<button type="button" role="menuitem" data-rh-action="quick-open-modal-afastamento">Lançar afastamento</button>');
    if (ativo && podeCriarDesligamentos()) acoes.push('<button type="button" role="menuitem" data-rh-action="quick-open-modal-desligamento">Lançar desligamento</button>');
    if (podeInativar()) acoes.push(`<button type="button" role="menuitem" class="${ativo ? 'danger-text' : ''}" onclick="hubRhDpAlterarStatus('${colaboradorId}', '${ativo ? 'inativo' : 'ativo'}')">${ativo ? 'Inativar' : 'Reativar'}</button>`);

    return acoes.length
      ? `<details class="hub-row-actions-menu rh-record-actions-menu" data-hub-action-menu data-hub-action-min-width="220" data-hub-action-max-width="280" data-hub-action-gap="8" data-hub-action-flip-vertical="true" data-hub-action-keyboard="true" data-hub-action-focus="first">
          <summary class="hub-quick-actions-trigger rh-record-actions-trigger" aria-haspopup="menu" aria-expanded="false" aria-controls="rh-collaborator-record-actions" aria-label="Abrir ações do cadastro" title="Ações do cadastro"><span aria-hidden="true">+</span></summary>
          <div id="rh-collaborator-record-actions" class="hub-row-actions-popover rh-record-actions-popover" data-hub-action-popover role="menu" aria-label="Ações do cadastro">${acoes.join('')}</div>
        </details>`
      : '';
  }

  const ROTULOS_FICHA_PDF = {
    id: 'Identificador do registro', colaborador_id: 'Identificador do colaborador', codigo: 'Matrícula',
    nome_completo: 'Nome completo', data_nascimento: 'Data de nascimento', estado_civil: 'Estado civil',
    nacionalidade: 'Nacionalidade', naturalidade: 'Naturalidade', nome_pai: 'Nome do pai', nome_mae: 'Nome da mãe',
    sexo: 'Sexo', escolaridade: 'Escolaridade', cor_raca: 'Cor/raça', telefone_celular: 'Telefone celular',
    email_contato: 'E-mail', contato_emergencia_nome: 'Contato de emergência', contato_emergencia_telefone: 'Telefone de emergência',
    endereco_logradouro: 'Logradouro', endereco_numero: 'Número', endereco_complemento: 'Complemento', endereco_bairro: 'Bairro',
    endereco_cidade: 'Cidade', endereco_uf: 'UF', endereco_cep: 'CEP', status: 'Status', observacoes: 'Observações',
    cpf: 'CPF', identidade_tipo: 'Tipo de identidade', identidade_numero: 'Número da identidade',
    identidade_data_emissao: 'Data de emissão', identidade_orgao_emissor: 'Órgão emissor', identidade_uf_emissor: 'UF emissora',
    cnh_categoria: 'Categoria CNH', titulo_eleitor: 'Título de eleitor', zona_eleitoral: 'Zona eleitoral', secao_eleitoral: 'Seção eleitoral',
    ctps_numero: 'Número CTPS', ctps_serie: 'Série CTPS', ctps_data_expedicao: 'Expedição CTPS', ctps_uf: 'UF CTPS',
    pis_numero: 'PIS/NIT', pis_data_cadastro: 'Data de cadastro do PIS', reservista_numero: 'Documento militar',
    reservista_categoria: 'Categoria de reservista', tipo_vinculo: 'Tipo de vínculo', data_admissao: 'Data de admissão',
    data_desligamento: 'Data de desligamento', cargo: 'Cargo', funcao: 'Função', cbo: 'CBO', departamento: 'Setor/Departamento',
    gestor_responsavel: 'Gestor responsável', situacao: 'Situação profissional', tipo_remuneracao: 'Tipo de remuneração',
    remuneracao_valor: 'Remuneração', modelo_jornada: 'Modelo de jornada', carga_horaria_semanal: 'Carga horária semanal',
    horario_entrada: 'Entrada', horario_saida: 'Saída', intervalo_inicio: 'Início do intervalo', intervalo_fim: 'Fim do intervalo',
    dias_trabalho: 'Dias de trabalho', tipo_conta: 'Tipo de conta', banco_codigo: 'Código do banco', banco_nome: 'Banco',
    agencia: 'Agência', conta: 'Conta', conta_digito: 'Dígito da conta', operacao: 'Operação', pix_tipo: 'Tipo de chave PIX',
    pix_chave: 'Chave PIX', titular_nome: 'Titular da conta', titular_cpf: 'CPF do titular', nome: 'Nome',
    data_nascimento: 'Data de nascimento', parentesco: 'Parentesco', ativo: 'Ativo', tipo: 'Tipo', operadora_fornecedor: 'Operadora/Fornecedor',
    valor_empresa: 'Valor empresa', valor_colaborador: 'Valor colaborador', inicio_em: 'Início', fim_em: 'Fim',
    data_efetivacao: 'Data de efetivação', titulo: 'Título', descricao: 'Descrição', dados_anteriores: 'Dados anteriores',
    dados_novos: 'Dados novos', referencia_externa: 'Referência externa', item_chave: 'Item', concluido_em: 'Concluído em',
    periodo_aquisitivo_inicio: 'Início do período aquisitivo', periodo_aquisitivo_fim: 'Fim do período aquisitivo',
    inicio_gozo: 'Início das férias', fim_gozo: 'Fim das férias', dias_gozo: 'Dias de gozo', abono_pecuniario: 'Abono pecuniário',
    retorno_em: 'Retorno em', retorno_resumo: 'Resumo do retorno', divergencia_descricao: 'Descrição da divergência',
    previsao_retorno_em: 'Previsão de retorno', cid_referencia: 'Referência CID', comunicacao_emitida: 'Comunicação emitida',
    data_ocorrencia: 'Data da ocorrência', categoria: 'Categoria', providencias: 'Providências',
    requer_acompanhamento: 'Requer acompanhamento', encerrada_em: 'Encerrada em', motivo_resumo: 'Resumo do motivo',
    comunicado_em: 'Comunicado em', ultimo_dia_trabalho: 'Último dia de trabalho', competencia: 'Competência', aviso_previo: 'Aviso prévio',
    enviado_em: 'Enviado em', retorno_contabilidade: 'Retorno da contabilidade', criado_em: 'Criado em',
    created_at: 'Criado em', updated_at: 'Atualizado em', created_by: 'Criado por (ID)', updated_by: 'Atualizado por (ID)',
    nome_arquivo: 'Arquivo', tipo_documento: 'Tipo de documento', mime_type: 'Tipo do arquivo', tamanho_bytes: 'Tamanho (bytes)',
    data_referencia: 'Data de referência', data_validade: 'Data de validade', retencao_ate: 'Retenção até',
    versao_atual: 'Versão', origem: 'Origem', status: 'Status', descartado_motivo: 'Motivo do descarte',
    descartado_drive_at: 'Descarte no Drive em', rh_checklist_desligamento: 'Checklist de desligamento',
    rh_arquivos_colaboradores_versoes: 'Histórico de versões'
  };

  function valorFichaPdf(valor) {
    if (valor === null || valor === undefined || valor === '') return '';
    if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
    if (typeof valor === 'object') return JSON.stringify(valor, null, 2);
    const texto = String(valor);
    const data = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
    if (data) return `${data[3]}/${data[2]}/${data[1]}${data[4] ? ` ${data[4]}` : ''}`;
    return texto;
  }

  function rotuloFichaPdf(chave) {
    if (ROTULOS_FICHA_PDF[chave]) return ROTULOS_FICHA_PDF[chave];
    return String(chave).replaceAll('_', ' ').replace(/\b\p{L}/gu, letra => letra.toLocaleUpperCase('pt-BR'));
  }

  function renderCamposFichaPdf(registro) {
    if (!registro || typeof registro !== 'object') return '';
    return Object.entries(registro)
      .filter(([chave, valor]) => chave !== 'rh_colaboradores' && valor !== null && valor !== undefined && valor !== '')
      .map(([chave, valor]) => `<div class="field"><b>${escapeHtml(rotuloFichaPdf(chave))}</b><span>${escapeHtml(valorFichaPdf(valor))}</span></div>`)
      .join('');
  }

  function renderGrupoFichaPdf(titulo, registros) {
    const itens = (Array.isArray(registros) ? registros : registros ? [registros] : [])
      .map(registro => renderCamposFichaPdf(registro)).filter(Boolean);
    return `<section><h2>${escapeHtml(titulo)}</h2>${itens.length ? itens.map(campos => `<div class="record"><div class="fields">${campos}</div></div>`).join('') : '<p class="empty">Nenhum registro informado.</p>'}</section>`;
  }

  function criarDocumentoFichaPdf(ficha, versao) {
    const completa = versao === 'completa';
    const colaborador = ficha.colaborador || {};
    const vinculo = ficha.vinculo || {};
    const grupos = completa ? [
      ['Identificação e dados pessoais', colaborador],
      ['Documentos cadastrais', ficha.documentos],
      ['Vínculo profissional', vinculo],
      ['Dependentes', ficha.dependentes],
      ['Benefícios', ficha.beneficios],
      ['Dados bancários', ficha.bancarios],
      ['Checklist admissional', ficha.checklist],
      ['Movimentações e alterações', ficha.movimentacoes],
      ['Férias', ficha.ferias],
      ['Afastamentos', ficha.afastamentos],
      ['Ocorrências', ficha.ocorrencias],
      ['Desligamentos', ficha.desligamentos],
      ['Arquivos vinculados (metadados)', ficha.arquivos]
    ] : [
      ['Identificação funcional', {
        codigo: colaborador.codigo,
        nome_completo: colaborador.nome_completo,
        status: colaborador.status
      }],
      ['Vínculo profissional', {
        cargo: vinculo.cargo,
        funcao: vinculo.funcao,
        departamento: vinculo.departamento,
        gestor_responsavel: vinculo.gestor_responsavel,
        tipo_vinculo: vinculo.tipo_vinculo,
        situacao: vinculo.situacao,
        modelo_jornada: vinculo.modelo_jornada,
        data_admissao: vinculo.data_admissao,
        data_desligamento: vinculo.data_desligamento
      }]
    ];
    const titulo = completa ? 'FICHA CADASTRAL COMPLETA DO COLABORADOR' : 'FICHA FUNCIONAL SIMPLIFICADA';
    const dataEmissao = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date());
    const conteudo = grupos.map(([nome, registros]) => renderGrupoFichaPdf(nome, registros)).join('');

    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(titulo)} - ${escapeHtml(colaborador.nome_completo || 'Colaborador')}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><style>
      @page{size:A4 portrait;margin:8mm}
      *{box-sizing:border-box}
      body{margin:0;background:#F5F7FA;color:#0B172A;font:10px/1.4 "Inter",ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .sheet{width:210mm;min-height:297mm;margin:18px auto;background:#fff;border:1px solid rgba(15,23,42,.08);box-shadow:0 10px 30px rgba(15,23,42,.12)}
      .topbar{display:grid;grid-template-columns:minmax(0,1fr) 30mm 38mm;align-items:stretch;border-bottom:1px solid #64748b}
      .title{background:#294895;color:#fff;padding:9px 12px;display:flex;flex-direction:column;justify-content:center}
      .title h1{font-size:12px;line-height:1.25;letter-spacing:.35px;margin:0 0 4px}
      .title p{font-size:8.5px;margin:0;overflow-wrap:anywhere}
      .meta{padding:5px 7px;border-left:1px solid #64748b;display:flex;flex-direction:column;justify-content:center;overflow-wrap:anywhere}
      .meta b,.label{display:block;color:#475569;font-size:6.5px;font-weight:700;letter-spacing:.15px;text-transform:uppercase;margin-bottom:3px}
      .meta span{font-size:8px;font-weight:700}
      .meta small{font-size:7px;color:#526273;margin-top:3px}
      section{margin:0;break-inside:auto}
      h2{font-size:8px;text-transform:uppercase;letter-spacing:.35px;color:#1F3676;background:#E8EEF9;border-top:1px solid rgba(41,72,149,.2);border-bottom:1px solid rgba(41,72,149,.2);padding:4px 7px;margin:0;break-after:avoid}
      .record{break-inside:auto}
      .record+.record{border-top:1px solid rgba(15,23,42,.12)}
      .fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-left:1px solid rgba(15,23,42,.12)}
      .field{min-width:0;min-height:8mm;padding:3px 6px;border-right:1px solid rgba(15,23,42,.12);border-bottom:1px solid rgba(15,23,42,.12);overflow-wrap:anywhere;break-inside:avoid}
      .field b{display:block;color:#64748B;font-size:6.5px;letter-spacing:.15px;text-transform:uppercase;margin-bottom:3px}
      .field span{display:block;font-size:8.5px;min-height:10px;white-space:pre-wrap;overflow-wrap:anywhere}
      .empty{margin:5px 7px;padding:4px 0;color:#64748B;font-size:8px;font-style:italic}
      .footer{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-left:1px solid rgba(15,23,42,.12)}
      .footer .field{min-height:25px}
      .footer .field .label{font-size:6.5px;min-height:0;white-space:normal}
      .signature{height:12px;border-bottom:1px solid rgba(15,23,42,.32)}
      @media print{body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{width:auto;min-height:0;margin:0;border:0;box-shadow:none}section{orphans:2;widows:2}}
      </style></head><body><main class="sheet"><header class="topbar"><div class="title"><h1>${escapeHtml(titulo)}</h1><p>${escapeHtml(colaborador.nome_completo || 'Colaborador')} · Transmares · RH &amp; DP</p></div><div class="meta"><b>Matrícula / eSocial</b><span>${escapeHtml(valorFichaPdf(colaborador.codigo) || '—')}</span></div><div class="meta"><b>Status</b><span>${escapeHtml(valorFichaPdf(colaborador.status) || '—')}</span><small>Emitida em ${escapeHtml(dataEmissao)}</small></div></header>${conteudo}<footer class="footer"><div class="field"><span class="label">Última atualização</span><span>${escapeHtml(valorFichaPdf(colaborador.updated_at) || '—')}</span></div><div class="field"><span class="label">Responsável pelo cadastro</span><span> </span></div><div class="field"><span class="label">Assinatura do colaborador</span><div class="signature"></div></div></footer></main><script>window.addEventListener('load',()=>document.fonts.ready.then(()=>setTimeout(()=>window.print(),150)));</script></body></html>`;
  }

  async function gerarFichaPdf(versao) {
    if (!podeVer() || !state.modal.id || !['simplificada', 'completa'].includes(versao)) return;
    const janela = window.open('', '_blank');
    if (!janela) {
      state.modal.erros.geral = 'O navegador bloqueou a janela de impressão. Permita pop-ups para gerar a ficha.';
      render();
      return;
    }
    janela.document.open();
    janela.document.write('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Gerando ficha</title><body style="font:16px Arial;padding:24px">Carregando dados para a ficha…</body></html>');
    janela.document.close();

    try {
      const ficha = await obterFichaPdfRhDp({ id: state.modal.id, versao });
      janela.document.open();
      janela.document.write(criarDocumentoFichaPdf(ficha, versao));
      janela.document.close();
      janela.focus();
    } catch (error) {
      janela.close();
      state.modal.erros.geral = error.message || 'Não foi possível gerar a ficha PDF.';
      render();
    }
  }

  function renderModal() {
    if (!state.modal.aberto) return '';

    const readonly = state.modal.modo === 'view';
    const titulo = state.modal.modo === 'create'
      ? 'Incluir colaborador'
      : state.modal.colaborador.nome_completo || (state.modal.loading ? 'Carregando cadastro...' : state.modal.modo === 'edit' ? 'Editar colaborador' : 'Visualizar colaborador');
    if (!possuiAbaAnotacoes()) state.modal.aba = 'cadastro';
    return `
      <section class="rh-collaborator-screen ${readonly ? '' : 'is-editing'}" role="region" aria-label="${escapeAttr(titulo)}">
          ${renderHubRecordHeader({
            onBack: 'hubRhDpFecharCadastro()',
            backAriaLabel: 'Voltar à lista de colaboradores',
            className: 'rh-record-header hub-record-header',
            backClassName: 'icon-btn hub-record-back-button rh-collaborator-back-button',
            contentClassName: 'hub-record-header-content rh-collaborator-header-content',
            content: `<h3>${escapeHtml(titulo)}</h3><p>Cadastro de colaborador</p>`,
            actions: readonly
              ? `<div class="rh-pdf-actions"><button type="button" class="secondary-btn" onclick="hubRhDpGerarFichaPdf('simplificada')" aria-label="Gerar ficha simplificada em PDF" title="Dados funcionais para compartilhamento">PDF simplificada</button><button type="button" class="secondary-btn" onclick="hubRhDpGerarFichaPdf('completa')" aria-label="Gerar ficha completa em PDF" title="Inclui todos os dados e históricos do cadastro">PDF completa</button>${podeEditar() ? renderHubRecordEditButton({ onClick: 'hubRhDpEditarCadastroAtual()', label: 'Editar', className: 'save-btn hub-record-edit-button' }) : ''}</div>`
              : '',
            disabled: state.modal.saving
          })}

          ${state.modal.loading ? '' : renderAcoesCadastro()}
          ${renderAbasCadastro()}

          <div id="rh-record-tab-panel" class="rh-record-content rh-collaborator-content" role="tabpanel" aria-labelledby="rh-record-tab-${state.modal.aba}">
            ${state.modal.loading ? (window.hubRenderLoading?.('Carregando cadastro...') || '<p class="quick-link-empty" role="status">Carregando cadastro...</p>') : state.modal.erros.carregamento ? `
              <p class="admin-message error">${escapeHtml(state.modal.erros.carregamento)}</p>
            ` : `
              ${state.modal.mensagem ? `<p class="admin-message success">${escapeHtml(state.modal.mensagem)}</p>` : ''}
              ${state.modal.erros.geral ? `<p class="admin-message error">${escapeHtml(state.modal.erros.geral)}</p>` : ''}
              ${renderConteudoAbaCadastro(readonly)}
            `}
          </div>

          ${state.modal.loading || readonly ? '' : renderHubRecordFormFooter({
            flow: 'rh-collaborator',
            cancelLabel: '×',
            cancelOnClick: 'hubRhDpCancelarEdicaoCadastro()',
            cancelClassName: 'icon-btn rh-collaborator-cancel-button',
            cancelAriaLabel: 'Cancelar edição',
            showPrevious: false,
            showNext: false,
            showSave: true,
            saveLabel: 'Salvar',
            saveOnClick: 'hubRhDpSalvarCadastro()',
            saving: state.modal.saving,
            className: 'rh-collaborator-workflow-footer'
          })}
          ${renderModalComplemento()}
      </section>
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
      const campoAtual = document.getElementById(`rh_${campoNome}`);
      if (campoAtual) acc[campoNome] = campoAtual.value;
      return acc;
    }, { ...state.modal.colaborador });

    if (podeVerSensiveis()) {
      state.modal.documentos = camposDocumentos.reduce((acc, campoNome) => {
        const campoAtual = document.getElementById(`rh_${campoNome}`);
        if (campoAtual) acc[campoNome] = campoAtual.value;
        return acc;
      }, { ...state.modal.documentos });

      state.modal.vinculo = camposVinculo.reduce((acc, campoNome) => {
        const idCampo = campoNome === 'observacoes' ? 'vinculo_observacoes' : campoNome;
        const campoAtual = document.getElementById(`rh_${idCampo}`);
        if (campoAtual) acc[campoNome] = campoAtual.value;
        return acc;
      }, { ...state.modal.vinculo });

      if (document.getElementById('rh_banco_codigo')) {
        const camposBancarios = {
          banco_codigo: 'banco_codigo',
          banco_nome: 'banco_nome',
          tipo_conta: 'banco_tipo_conta',
          agencia: 'banco_agencia',
          conta: 'banco_conta',
          conta_digito: 'banco_conta_digito',
          pix_tipo: 'banco_pix_tipo',
          pix_chave: 'banco_pix_chave',
          titular_nome: 'banco_titular_nome',
          titular_cpf: 'banco_titular_cpf'
        };
        state.modal.bancarios = Object.entries(camposBancarios).reduce((acc, [campoNome, idCampo]) => {
          const campoAtual = document.getElementById(`rh_${idCampo}`);
          if (campoAtual) acc[campoNome] = campoAtual.value;
          return acc;
        }, { ...state.modal.bancarios });
      }

    }
  }

  function validarFormulario() {
    const colaborador = state.modal.colaborador;
    const documentos = state.modal.documentos;

    if (String(colaborador.nome_completo || '').trim().length < 3) {
      return { mensagem: 'Informe o nome completo do colaborador.', blocoId: 'dados-pessoais', campoId: 'rh_nome_completo' };
    }

    if (!colaborador.data_nascimento) {
      return { mensagem: 'Informe a data de nascimento.', blocoId: 'dados-pessoais', campoId: 'rh_data_nascimento' };
    }

    if (!colaborador.telefone_celular && !colaborador.email_contato) {
      return { mensagem: 'Informe ao menos um telefone ou e-mail de contato.', blocoId: 'dados-pessoais', campoId: 'rh_telefone_celular' };
    }

    if (colaborador.email_contato && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(colaborador.email_contato)) {
      return { mensagem: 'Informe um e-mail de contato válido.', blocoId: 'dados-pessoais', campoId: 'rh_email_contato' };
    }

    if (colaborador.endereco_uf && String(colaborador.endereco_uf).trim().length !== 2) {
      return { mensagem: 'Informe a UF do endereço com duas letras.', blocoId: 'dados-pessoais', campoId: 'rh_endereco_uf' };
    }

    if (colaborador.endereco_cep && digitos(colaborador.endereco_cep).length !== 8) {
      return { mensagem: 'Informe um CEP válido.', blocoId: 'dados-pessoais', campoId: 'rh_endereco_cep' };
    }

    if (podeVerSensiveis() && !cpfValido(documentos.cpf)) {
      return { mensagem: 'Informe um CPF válido.', blocoId: 'dados-pessoais', campoId: 'rh_cpf' };
    }

    if (podeVerSensiveis()) {
      const vinculo = state.modal.vinculo;
      const possuiVinculo = Object.entries(vinculo).some(([campoNome, valor]) => {
        if (campoNome === 'situacao' && String(valor || 'ativo') === 'ativo') return false;
        return String(valor || '').trim();
      });
      if (possuiVinculo && !vinculo.data_admissao) {
        return { mensagem: 'Informe a data de admissão do vínculo profissional.', blocoId: 'vinculo', campoId: 'rh_data_admissao' };
      }

      if (vinculo.data_desligamento && vinculo.data_admissao && vinculo.data_desligamento < vinculo.data_admissao) {
        return { mensagem: 'A data de desligamento não pode ser anterior à admissão.', blocoId: 'vinculo', campoId: 'rh_data_desligamento' };
      }

      const indiceDependenteIncompleto = state.modal.dependentes.findIndex(item => {
        const possuiAlgumDado = item.nome_completo || item.data_nascimento || item.parentesco || item.cpf;
        return possuiAlgumDado && (!item.nome_completo || !item.data_nascimento);
      });
      if (indiceDependenteIncompleto >= 0) {
        const dependente = state.modal.dependentes[indiceDependenteIncompleto];
        const campoIncompleto = dependente.nome_completo ? 'nascimento' : 'nome';
        return {
          mensagem: 'Informe nome e data de nascimento de cada dependente.',
          blocoId: 'complemento',
          campoId: `rh_dep_${campoIncompleto}_${indiceDependenteIncompleto}`
        };
      }

      const indiceCpfDependenteInvalido = state.modal.dependentes.findIndex(item => !item.id && item.cpf && !cpfValido(item.cpf));
      if (indiceCpfDependenteInvalido >= 0) {
        return {
          mensagem: 'Informe um CPF válido para cada novo dependente ou deixe o campo vazio.',
          blocoId: 'complemento'
        };
      }
    }

    return null;
  }

  async function abrir() {
    const secaoRota = obterSecaoRota();
    const secaoPermitida = obterSecaoPermitida(secaoRota);
    if (!secaoPermitida) {
      renderUnavailable('rh-dp');
      return;
    }
    const partesRota = obterPartesRota?.() || [];
    const secaoInformada = String(partesRota[1] || '').trim().toLowerCase();

    if (
      secaoPermitida
      && (!secaoInformada || secaoPermitida !== secaoRota || secaoInformada !== secaoPermitida)
    ) {
      await navegar(secaoPermitida);
      return;
    }

    state.secao = secaoPermitida || secaoRota;
    state.loading = true;
    state.message = '';
    render();

    if (!podeVer()) {
      state.loading = false;
      render();
      return;
    }

    try {
      state.colaboradores = await listarColaboradoresRhDp({ incluirSensiveis: podeVerSensiveis() });
      if (state.secao === 'demandas') state.demandas = await listarDemandasContabilidadeRhDp();
      if (state.secao === 'fechamentos') state.competencias = await listarCompetenciasRhDp();
      if (state.secao === 'dashboard') {
        const tarefas = [];
        if (podeVerDemandas()) tarefas.push(listarDemandasContabilidadeRhDp().then(valor => { state.demandas = valor; }));
        if (podeVerFechamentos()) tarefas.push(listarCompetenciasRhDp().then(valor => { state.competencias = valor; }));
        await Promise.all(tarefas);
      }
      state.loading = false;
      const cadastroRota = obterCadastroRota();
      if (cadastroRota) {
        await abrirCadastro(cadastroRota.id, cadastroRota.modo, '', { atualizarRota: false });
        return;
      }
      render();
    } catch (error) {
      state.loading = false;
      state.message = error.message || 'Não foi possível carregar os colaboradores.';
      state.messageType = 'error';
      render();
    }
  }

  async function abrirSecao(secao) {
    const destino = obterSecaoPermitida(secao);
    if (!destino || !navegarParaRota || !montarCaminhoModulo) return;
    await navegar(destino);
  }

  function navegar(secao) {
    const destino = obterSecaoPermitida(secao);
    if (!destino || !navegarParaRota || !montarCaminhoModulo) return Promise.resolve();
    return navegarParaRota(`${montarCaminhoModulo('rh-dp').replace(/\/+$/g, '')}/${destino}`);
  }

  function abrirModalFerias(colaboradorId = '') {
    if (!podeCriarFerias()) return;
    state.feriasModal = {
      aberto: true,
      saving: false,
      colaboradorId
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
      await recarregarHistoricoColaborador();
      state.modal.mensagem = 'Planejamento de férias registrado como rascunho.';
      render();
    } catch (error) {
      state.feriasModal.saving = false;
      state.message = error.message || 'Não foi possível registrar as férias.';
      state.messageType = 'error';
      render();
    }
  }

  function abrirModalAfastamento(colaboradorId = '') {
    if (!podeCriarOcorrencias()) return;
    state.afastamentoModal = { aberto: true, saving: false, colaboradorId };
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
      await recarregarHistoricoColaborador();
      state.modal.mensagem = 'Afastamento registrado como rascunho.';
      render();
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
      state.modal.mensagem = 'Ocorrência registrada.';
      render();
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

  function abrirModalDesligamento(colaboradorId = '') {
    if (!podeCriarDesligamentos()) return;
    state.desligamentoModal = { aberto: true, saving: false, colaboradorId };
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
      await recarregarHistoricoColaborador();
      state.modal.mensagem = 'Desligamento registrado como rascunho.';
      render();
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
      state.modal.mensagem = 'Checklist atualizada.'; render();
    } catch (error) { state.message = error.message || 'Não foi possível atualizar a checklist.'; state.messageType = 'error'; render(); }
  }

  async function recarregarHistoricoColaborador() {
    if (!state.modal.id) return;
    const colaboradorId = state.modal.id;
    const [ferias, afastamentos, desligamentos] = await Promise.all([
      podeVerFerias() ? listarFeriasRhDp() : Promise.resolve([]),
      podeVerOcorrencias() ? listarAfastamentosRhDp() : Promise.resolve([]),
      podeVerDesligamentos() ? listarDesligamentosRhDp() : Promise.resolve([])
    ]);
    state.modal.ferias = ferias.filter(item => item.colaborador_id === colaboradorId);
    state.modal.afastamentos = afastamentos.filter(item => item.colaborador_id === colaboradorId);
    state.modal.desligamentos = desligamentos.filter(item => item.colaborador_id === colaboradorId);
  }

  async function abrirCadastro(id = '', modo = 'view', acaoOperacionalPendente = '', { atualizarRota = true } = {}) {
    if (modo === 'create' && !podeCriar()) return;
    if (modo === 'edit' && !podeEditar()) return;
    removeHubFormFooterPortals();

    if (atualizarRota && navegarParaRota && montarCaminhoModulo) {
      const cadastro = state.colaboradores.find(item => item.id === id || item.codigo === id);
      return navegarParaRota(obterRotaCadastro(cadastro?.codigo || id, modo));
    }

    state.modal = criarEstadoModal({
      aberto: true,
      modo,
      id,
      loading: Boolean(id),
      arquivosLoading: Boolean(id) && podeVerArquivos(),
      acaoOperacionalPendente
    });
    const colaboradorResumo = state.colaboradores.find(item => item.id === id || item.codigo === id);
    if (colaboradorResumo) state.modal.colaborador.nome_completo = colaboradorResumo.nome_completo || '';
    render();

    if (!id) return;

    try {
      const dados = await obterCadastroPessoalRhDp({
        id,
        incluirSensiveis: podeVerSensiveis()
      });
      state.modal.id = dados.colaborador?.id || id;
      state.modal.colaborador = { ...novoColaborador(), ...(dados.colaborador || {}) };
      state.modal.documentos = { ...novosDocumentos(), ...(dados.documentos || {}) };
      state.modal.vinculo = { ...novoVinculo(), ...(dados.vinculo || {}) };
      state.modal.dependentes = dados.dependentes || [];
      state.modal.beneficios = dados.beneficios || [];
      state.modal.bancarios = dados.bancarios || {};
      state.modal.movimentacoes = dados.movimentacoes || [];
      const [ferias, afastamentos, desligamentos] = await Promise.all([
        podeVerFerias() ? listarFeriasRhDp() : Promise.resolve([]),
        podeVerOcorrencias() ? listarAfastamentosRhDp() : Promise.resolve([]),
        podeVerDesligamentos() ? listarDesligamentosRhDp() : Promise.resolve([])
      ]);
      state.modal.ferias = ferias.filter(item => item.colaborador_id === state.modal.id);
      state.modal.afastamentos = afastamentos.filter(item => item.colaborador_id === state.modal.id);
      state.modal.desligamentos = desligamentos.filter(item => item.colaborador_id === state.modal.id);
      state.modal.arquivos = podeVerArquivos()
        ? await listarArquivosColaboradorRhDp({ colaboradorId: state.modal.id })
        : [];
      state.modal.loading = false;
      state.modal.arquivosLoading = false;
      render();
      if (state.modal.acaoOperacionalPendente) {
        const acao = state.modal.acaoOperacionalPendente;
        state.modal.acaoOperacionalPendente = '';
        abrirAcaoOperacionalColaborador(acao);
      }
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
    removeHubRecordWorkflowFooter('rh-collaborator');
    if (obterCadastroRota() && navegarParaRota) {
      navegarParaRota(obterRotaColaboradores());
      return;
    }
    render();
  }

  async function cancelarEdicaoCadastro() {
    if (state.modal.saving) return;
    if (state.modal.modo === 'create' || !state.modal.id) {
      fecharCadastro();
      return;
    }
    if (state.modal.snapshotEdicao) {
      removeHubRecordWorkflowFooter('rh-collaborator');
      Object.assign(state.modal, state.modal.snapshotEdicao, {
        modo: 'view',
        saving: false,
        snapshotEdicao: null,
        mensagem: '',
        erros: {}
      });
      render();
      return;
    }
    const atualizarRota = Boolean(obterCadastroRota() && navegarParaRota);
    const codigo = atualizarRota ? (state.modal.colaborador.codigo || state.modal.id) : state.modal.id;
    await abrirCadastro(codigo, 'view', '', { atualizarRota });
  }

  function editarCadastroAtual() {
    if (!state.modal.aberto || state.modal.loading || state.modal.saving || state.modal.modo !== 'view' || !state.modal.id || !podeEditar()) return;
    const camposEditaveis = ['colaborador', 'documentos', 'vinculo', 'dependentes', 'beneficios', 'beneficiosPendentes', 'beneficiosParaEncerrar', 'bancarios', 'movimentacoes', 'ferias', 'afastamentos', 'desligamentos', 'arquivos', 'blocosAbertos', 'aba'];
    state.modal.snapshotEdicao = JSON.parse(JSON.stringify(Object.fromEntries(
      camposEditaveis.map(campo => [campo, state.modal[campo]])
    )));
    state.modal.modo = 'edit';
    state.modal.aba = 'cadastro';
    state.modal.mensagem = '';
    state.modal.erros = {};
    render();
  }

  function abrirAcaoOperacionalColaborador(tipo) {
    if (!state.modal.id) return;
    capturarFormulario();
    const colaboradorId = state.modal.id;
    if (tipo === 'ferias') abrirModalFerias(colaboradorId);
    if (tipo === 'afastamento') abrirModalAfastamento(colaboradorId);
    if (tipo === 'desligamento') abrirModalDesligamento(colaboradorId);
  }

  function abrirModalComplemento(tipo) {
    if (!state.modal.aberto || state.modal.loading || state.modal.saving || !podeAdicionarComplemento(tipo)) return;
    if (!['dependente', 'beneficio'].includes(tipo)) return;
    capturarFormulario();
    state.modal.complementoModal = {
      aberto: true,
      tipo,
      saving: false,
      erro: '',
      form: tipo === 'dependente'
        ? { parentesco: '', nome_completo: '', data_nascimento: '', cpf: '' }
        : { tipo: '', nome: '', operadora_fornecedor: '', valor_empresa: '', valor_colaborador: '', inicio_em: '' }
    };
    render();
  }

  function fecharModalComplemento() {
    if (state.modal.complementoModal?.saving) return;
    state.modal.complementoModal = { aberto: false, tipo: '', saving: false, erro: '', form: {} };
    render();
  }

  async function salvarModalComplemento() {
    const modal = state.modal.complementoModal;
    if (!modal?.aberto || modal.saving || !podeAdicionarComplemento(modal.tipo)) return;
    capturarFormulario();

    if (modal.tipo === 'dependente') {
      const dependente = {
        parentesco: obterValor('complemento_dependente_parentesco').trim(),
        nome_completo: obterValor('complemento_dependente_nome').trim(),
        data_nascimento: obterValor('complemento_dependente_nascimento'),
        cpf: obterValor('complemento_dependente_cpf')
      };
      modal.form = dependente;
      if (!dependente.nome_completo || !dependente.data_nascimento) {
        modal.erro = 'Informe o nome completo e a data de nascimento.';
        render();
        return;
      }
      if (Array.from(dependente.nome_completo).length < 3) {
        modal.erro = 'O nome completo do dependente deve ter pelo menos 3 caracteres.';
        render();
        return;
      }
      if (dependente.cpf && !cpfValido(dependente.cpf)) {
        modal.erro = 'Informe um CPF válido ou deixe o campo vazio.';
        render();
        return;
      }

      if (state.modal.modo === 'view') {
        modal.saving = true;
        modal.erro = '';
        render();
        try {
          const salvo = await salvarDependenteRhDp({ dependente: { ...dependente, colaborador_id: state.modal.id } });
          state.modal.dependentes.push(salvo);
          state.modal.complementoModal = { aberto: false, tipo: '', saving: false, erro: '', form: {} };
          mostrarToastRhDp('Dependente cadastrado com sucesso.');
          render();
        } catch (error) {
          state.modal.complementoModal = { ...modal, saving: false, erro: error.message || 'Não foi possível salvar o dependente.' };
          render();
        }
        return;
      }

      state.modal.dependentes.push({ id: '', ...dependente });
      state.modal.complementoModal = { aberto: false, tipo: '', saving: false, erro: '', form: {} };
      render();
      return;
    }

    const beneficio = {
      tipo: obterValor('complemento_beneficio_tipo'),
      nome: obterValor('complemento_beneficio_nome').trim(),
      operadora_fornecedor: obterValor('complemento_beneficio_operadora').trim(),
      valor_empresa: obterValor('complemento_beneficio_valor_empresa'),
      valor_colaborador: obterValor('complemento_beneficio_valor_colaborador'),
      inicio_em: obterValor('complemento_beneficio_inicio')
    };
    modal.form = beneficio;
    if (!beneficio.tipo || !beneficio.nome) {
      modal.erro = 'Informe o tipo e o nome do benefício.';
      render();
      return;
    }

    if (state.modal.modo === 'view') {
      modal.saving = true;
      modal.erro = '';
      render();
      try {
        const salvo = await salvarBeneficioRhDp({ beneficio: { ...beneficio, colaborador_id: state.modal.id } });
        state.modal.beneficios.push({ ...beneficio, id: salvo.id, status: 'ativo' });
        state.modal.complementoModal = { aberto: false, tipo: '', saving: false, erro: '', form: {} };
        mostrarToastRhDp('Benefício cadastrado com sucesso.');
        render();
      } catch (error) {
        state.modal.complementoModal = { ...modal, saving: false, erro: error.message || 'Não foi possível salvar o benefício.' };
        render();
      }
      return;
    }

    const itemPendente = {
      ...beneficio,
      id: '',
      status: 'ativo',
      _pendente: true,
      _chaveTemporaria: `${Date.now()}-${Math.random().toString(36).slice(2)}`
    };
    state.modal.beneficios.push(itemPendente);
    state.modal.beneficiosPendentes.push(itemPendente);
    state.modal.complementoModal = { aberto: false, tipo: '', saving: false, erro: '', form: {} };
    render();
  }

  function removerDependente(indice) {
    capturarFormulario();
    state.modal.dependentes.splice(indice, 1);
    render();
  }

  function removerBeneficio(chave) {
    if (!state.modal.aberto || state.modal.saving || state.modal.modo === 'view' || !podeVerSensiveis()) return;
    capturarFormulario();
    const beneficio = state.modal.beneficios.find(item => (item._chaveTemporaria || item.id) === chave);
    if (!beneficio) return;

    if (beneficio._pendente || !beneficio.id) {
      state.modal.beneficios = state.modal.beneficios.filter(item => item !== beneficio);
      state.modal.beneficiosPendentes = state.modal.beneficiosPendentes.filter(item => item._chaveTemporaria !== beneficio._chaveTemporaria);
    } else {
      beneficio._removerPendente = true;
      state.modal.beneficiosParaEncerrar.push(beneficio);
    }
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
      observacoes: state.modal.arquivoForm.observacoes || ''
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
    if (!state.modal.aberto || state.modal.loading || state.modal.saving || state.modal.complementoModal?.aberto || state.modal.modo === 'view') return;
    capturarFormulario();
    const erro = validarFormulario();
    if (erro) {
      const blocoId = erro.blocoId;
      if (blocoId) state.modal.blocosAbertos = { ...state.modal.blocosAbertos, [blocoId]: true };
      state.modal.aba = 'cadastro';
      state.modal.erros.geral = erro.mensagem;
      render();
      if (blocoId) document.querySelector(`[data-rh-block="${blocoId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (erro.campoId) document.getElementById(erro.campoId)?.focus({ preventScroll: true });
      return;
    }

    state.modal.saving = true;
    state.modal.erros = {};
    render();

    let idSalvo = state.modal.id;
    try {
      const editando = Boolean(state.modal.id);
      const resultado = await salvarCadastroPessoalRhDp({
        id: state.modal.id || null,
        colaborador: state.modal.colaborador,
        documentos: podeVerSensiveis() ? state.modal.documentos : null,
        vinculo: podeVerSensiveis() ? state.modal.vinculo : null,
        dependentes: podeVerSensiveis() ? state.modal.dependentes : null
      });
      idSalvo = resultado?.id || state.modal.id;
      if (!idSalvo) throw new Error('O cadastro foi salvo, mas não foi possível identificar o colaborador.');
      state.modal.id = idSalvo;

      for (const beneficio of [...state.modal.beneficiosParaEncerrar]) {
        try {
          await salvarBeneficioRhDp({ id: beneficio.id, beneficio: { ...beneficio, colaborador_id: idSalvo, status: 'encerrado' } });
          state.modal.beneficiosParaEncerrar = state.modal.beneficiosParaEncerrar.filter(item => item.id !== beneficio.id);
          state.modal.beneficios = state.modal.beneficios.filter(item => item.id !== beneficio.id);
        } catch (error) {
          state.modal.saving = false;
          state.modal.modo = 'edit';
          state.modal.erros.geral = `Cadastro salvo, mas o benefício não foi removido: ${error.message || 'tente novamente.'}`;
          render();
          return;
        }
      }

      for (const pendente of [...state.modal.beneficiosPendentes]) {
        try {
          const resultadoBeneficio = await salvarBeneficioRhDp({ beneficio: { ...pendente, colaborador_id: idSalvo } });
          state.modal.beneficiosPendentes = state.modal.beneficiosPendentes.filter(item => item._chaveTemporaria !== pendente._chaveTemporaria);
          state.modal.beneficios = state.modal.beneficios.map(item => item._chaveTemporaria === pendente._chaveTemporaria
            ? { ...item, id: resultadoBeneficio.id, _pendente: false }
            : item);
        } catch (error) {
          state.modal.saving = false;
          state.modal.modo = 'edit';
          state.modal.erros.geral = `Cadastro salvo, mas os benefícios não foram salvos: ${error.message || 'tente novamente.'}`;
          render();
          return;
        }
      }

      if (podeVerSensiveis() && possuiDadosBancarios()) {
        try {
          const resultadoBancario = await salvarDadosBancariosRhDp({
            id: state.modal.bancarios.id || null,
            dados: payloadDadosBancarios(idSalvo)
          });
          state.modal.bancarios = { ...state.modal.bancarios, id: resultadoBancario?.id || state.modal.bancarios.id || '' };
        } catch (error) {
          state.modal.saving = false;
          state.modal.modo = 'edit';
          state.modal.erros.geral = `Cadastro salvo, mas os dados bancários não foram salvos: ${error.message || 'tente novamente.'}`;
          render();
          return;
        }
      }

      state.modal.saving = false;
      let mensagemSucesso = editando ? 'Cadastro atualizado com sucesso.' : 'Colaborador incluído com sucesso.';
      state.modal.mensagem = '';
      state.message = '';
      state.messageType = '';

      try {
        state.colaboradores = await listarColaboradoresRhDp({ incluirSensiveis: podeVerSensiveis() });
      } catch {
        mensagemSucesso = editando
          ? 'Cadastro atualizado, mas a lista não pôde ser recarregada agora.'
          : 'Colaborador incluído, mas a lista não pôde ser recarregada agora.';
      }

      const colaboradorSalvo = state.colaboradores.find(item => item.id === idSalvo || item.codigo === idSalvo);
      const atualizarRota = Boolean(obterCadastroRota() && navegarParaRota);
      await abrirCadastro(colaboradorSalvo?.codigo || idSalvo, 'view', '', { atualizarRota });
      mostrarToastRhDp(mensagemSucesso);
    } catch (error) {
      state.modal.saving = false;
      state.modal.erros.geral = error.message || 'Não foi possível salvar o cadastro.';
      render();
    }
  }

  function salvarCadastroPorAtalho() {
    if (!state.modal.aberto || state.modal.loading || state.modal.saving || state.modal.modo === 'view') return;
    void salvarCadastro();
  }

  async function alterarStatus(id, status) {
    const item = state.colaboradores.find(colaborador => colaborador.id === id);
    const verbo = status === 'inativo' ? 'inativar' : 'reativar';
    if (!item || !window.confirm(`Deseja ${verbo} o cadastro de ${item.nome_completo}?`)) return;

    try {
      if (state.modal.id === id) capturarFormulario();
      await alterarStatusColaboradorRhDp({ id, status });
        state.colaboradores = await listarColaboradoresRhDp({ incluirSensiveis: podeVerSensiveis() });
      if (state.modal.id === id) state.modal.colaborador = { ...state.modal.colaborador, status };
      if (state.modal.snapshotEdicao?.colaborador && state.modal.id === id) {
        state.modal.snapshotEdicao.colaborador.status = status;
      }
      state.message = '';
      state.messageType = '';
      mostrarToastRhDp(status === 'inativo' ? 'Cadastro inativado com sucesso.' : 'Cadastro reativado com sucesso.');
      render();
    } catch (error) {
      state.message = error.message || 'Não foi possível alterar o status.';
      state.messageType = 'error';
      render();
    }
  }

  async function recarregarDadosComplementaresCadastro({ preservarRascunhoBancario = false } = {}) {
    const dados = await obterCadastroPessoalRhDp({ id: state.modal.id, incluirSensiveis: true });
    state.modal.beneficios = dados.beneficios || [];
    const bancariosSalvos = dados.bancarios || {};
    if (!preservarRascunhoBancario) state.modal.bancarios = bancariosSalvos;
    state.modal.movimentacoes = dados.movimentacoes || [];
    if (state.modal.snapshotEdicao) {
      // Ações auxiliares já persistidas passam a fazer parte da base restaurada por Cancelar.
      ['beneficios', 'bancarios', 'movimentacoes'].forEach(campoNome => {
        const valorSalvo = campoNome === 'bancarios' ? bancariosSalvos : state.modal[campoNome];
        state.modal.snapshotEdicao[campoNome] = JSON.parse(JSON.stringify(valorSalvo));
      });
    }
  }

  function payloadDadosBancarios(colaboradorId = state.modal.id) {
    const item = state.modal.bancarios || {};
    return {
      colaborador_id: colaboradorId,
      banco_codigo: item.banco_codigo,
      banco_nome: item.banco_nome,
      tipo_conta: item.tipo_conta,
      agencia: item.agencia,
      conta: item.conta,
      conta_digito: item.conta_digito,
      pix_tipo: item.pix_tipo,
      pix_chave: item.pix_chave,
      titular_nome: item.titular_nome,
      titular_cpf: item.titular_cpf
    };
  }

  function possuiDadosBancarios() {
    return Boolean(state.modal.bancarios?.id)
      || Object.entries(state.modal.bancarios || {}).some(([chave, valor]) => chave !== 'id' && String(valor || '').trim());
  }

  async function salvarMovimentacao() {
    capturarFormulario();
    try {
      await salvarMovimentacaoRhDp({ movimentacao: { colaborador_id: state.modal.id, tipo: obterValor('mov_tipo'), data_efetivacao: obterValor('mov_data'), titulo: obterValor('mov_titulo'), descricao: obterValor('mov_descricao') } });
      await recarregarDadosComplementaresCadastro({ preservarRascunhoBancario: true }); state.modal.erros = {}; render();
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
    hubRhDpEditarCadastroAtual: editarCadastroAtual,
    hubRhDpFecharCadastro: fecharCadastro,
    hubRhDpCancelarEdicaoCadastro: cancelarEdicaoCadastro,
    hubRhDpAtualizarBlocoCadastro: atualizarBlocoCadastro,
    hubRhDpMudarAbaCadastro: mudarAbaCadastro,
    hubRhDpAbrirComplementoModal: abrirModalComplemento,
    hubRhDpFecharComplementoModal: fecharModalComplemento,
    hubRhDpSalvarComplementoModal: salvarModalComplemento,
    hubRhDpRemoverDependente: removerDependente,
    hubRhDpRemoverBeneficio: removerBeneficio,
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
    ,hubRhDpGerarFichaPdf: gerarFichaPdf
  });

  registerHubRecordShortcutHandler('rh-collaborator', 'save', salvarCadastroPorAtalho);

  return {
    abrir,
    render
  };
}
