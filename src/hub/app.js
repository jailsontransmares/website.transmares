import './style.css';
import { chamarApi } from './api.js';
import { obterRotuloStatusHub } from './statusLabels.js';
import { entrarComSenha, obterSessaoAtual, sairDoHub } from './services/authService.js';
import { canAccessModule, hasPermission, normalizarPermissoes } from './services/permissionService.js';
import {
  atualizarContextoInicialHub,
  invalidarContextoAcessoHub,
  limparContextoAcessoHub
} from './services/hubAccessContext.js';
import { HUB_MENU_TREE } from './menuTree.js';
import {
  abrirMenuAcaoGlobal,
  limparMenusAcoesGlobais
} from './actionMenuPortal.js';
import {
  inicializarNotificacoesHub,
  renderHubNotificationBell,
  renderizarPaginaNotificacoesHub
} from './notificationsUi.js';
import {
  Archive,
  AtSign,
  Bell,
  Calendar,
  Check,
  Circle,
  CircleHelp,
  CircleAlert,
  Clock3,
  createIcons,
  ExternalLink,
  Filter,
  House,
  KeyRound,
  Landmark,
  LayoutDashboard,
  MessageCircle,
  Menu,
  Moon,
  Pin,
  Search,
  Settings,
  Sun,
  Trash2,
  RotateCcw,
  RefreshCw,
  UsersRound,
  Workflow,
  X
} from 'lucide';

const HUB_LUCIDE_ICONS = {
  Archive,
  AtSign,
  Bell,
  Calendar,
  Check,
  Circle,
  CircleAlert,
  CircleHelp,
  Clock3,
  Filter,
  House,
  KeyRound,
  Landmark,
  LayoutDashboard,
  MessageCircle,
  Menu,
  Moon,
  Pin,
  Search,
  Settings,
  Sun,
  Trash2,
  RotateCcw,
  RefreshCw,
  UsersRound,
  Workflow,
  X,
  ExternalLink
};

const CRM_STATUS_OPTIONS = ['em prospecção', 'cliente ativo', 'finalizado', 'lead perdido'];
const SIDEBAR_PINNED_STORAGE_KEY = 'hub-sidebar-pinned';

function sidebarMobileHub() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(max-width: 600px)').matches;
}

function obterPreferenciaSidebarFixado() {
  if (typeof window === 'undefined' || sidebarMobileHub()) return false;

  try {
    return window.localStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

const state = {
  usuario: null,
  config: null,
  cards: [],
  avisos: [],
  aniversariantes: [],
  favoritos: [],
  meta: null,
  permissions: normalizarPermissoes([]),
  sidebar: {
    collapsed: !obterPreferenciaSidebarFixado(),
    pinned: obterPreferenciaSidebarFixado(),
    searchQuery: '',
    openGroups: {},
    floatingGroupId: ''
  },
  auth: {
    email: '',
    loading: false,
    message: ''
  },
  modulosHome: {
    aberto: false,
    filtro: 'todos',
    modules: [],
    original: {},
    draft: {},
    loading: false,
    saving: false,
    message: ''
  },
  admin: {
    aba: 'identidade',
    config: [],
    categorias: [],
    grupos: [],
    parceirosIndicacao: [],
    logsIntegracoes: [],
    logsIntegracoesLoading: false,
    logsIntegracoesFiltros: { sistema: '', nivel: '', status: '' },
    logsIntegracoesPagina: 1,
    logsIntegracoesLimite: 20,
    logsIntegracoesTotal: 0,
    logsIntegracoesDetalhe: null,
    modulos: [],
    usuarios: [],
    perfis: [],
    recursos: [],
    perfilPermissoes: [],
    usuarioPermissoes: [],
    perfilPermissoesId: '',
    usuarioPermissoesId: '',
    permissionModal: {
      expandedModules: {},
      applying: false,
      moduleUpdating: '',
      originalEffects: {},
      draftEffects: {},
      originalProfilePermissions: {},
      draftProfilePermissions: {},
      dirty: false,
      submitMode: ''
    },
    credencialModal: {
      senhaTemporaria: '',
      senhaCopiada: false
    },
    usuarioModalEtapa: 'dados',
    perfilModalEtapa: 'dados',
    perfilModalDraft: {
      slug: '',
      nome: '',
      descricao: '',
      status: 'ativo'
    },
    parceiroModal: {
      aberto: false,
      modo: 'create',
      aba: 'dados',
      id: '',
      dados: null,
      erros: {},
      salvando: false,
      salvo: false,
      focoAnterior: null
    },
    filtros: {
      categorias: 'todos',
      grupos: 'todos',
      modulos: 'todos',
      usuarios: 'todos',
      perfis: 'todos',
      parceirosIndicacao: 'todos'
    },
    buscaUsuariosDigitada: '',
    buscaUsuariosAplicada: '',
    buscaUsuariosTimer: null,
    paginaUsuarios: 1,
    limiteUsuarios: 15,
    buscaPerfisDigitada: '',
    buscaPerfisAplicada: '',
    buscaPerfisTimer: null,
    paginaPerfis: 1,
    limitePerfis: 15,
    buscaParceirosIndicacaoDigitada: '',
    buscaParceirosIndicacaoAplicada: '',
    buscaParceirosIndicacaoTimer: null,
    paginaParceirosIndicacao: 1,
    limiteParceirosIndicacao: 15,
    colunasParceirosIndicacao: [],
    colunasParceirosIndicacaoRascunho: [],
    seletorColunasParceirosAberto: false,
    acoesParceirosAberto: false,
    loteParceirosModo: null,
    loteParceirosSelecionados: [],
    loteParceirosProcessando: false,
    editando: {
      categorias: '',
      grupos: '',
      usuarios: '',
      perfis: '',
      parceirosIndicacao: ''
    },
    modalNovo: '',
    moduloAtualizando: '',
    loading: false,
    message: ''
  },
  links: {
    escopo: 'corretora',
    titulo: '',
    categorias: [],
    grupos: [],
    items: [],
    limiteFavoritos: 5,
    filtros: {
      categoria: '',
      grupo: '',
      status: ''
    },
    modalNovo: false,
    modalLinkId: '',
    erros: {},
    salvando: false,
    salvo: false,
    loading: false,
    message: ''
  },
  passwords: {
    categorias: [],
    grupos: [],
    items: [],
    resumo: {
      total: 0,
      ativos: 0,
      inativos: 0
    },
    historico: [],
    aba: 'acessos',
    filtros: {
      categoria: '',
      grupo: '',
      status: ''
    },
    modalAberto: false,
    modalId: '',
    erros: {},
    salvando: false,
    salvo: false,
    loading: false,
    message: ''
  },
  ar: {
  produtos: [],
  parceiros: [],
  historico: [],
  busca: '',
  buscaTimer: null,
  listaGrupos: [],
  listaAc: '',
  filtrosListaAberto: false,
  produtosListaSelecionados: [],
  modalVisualizacaoProdutos: false,
  mensagemProdutosLista: '',
  tipoMensagemProdutosLista: '',
  edicaoProdutosGrupo: {
    nome: '',
    original: {},
    rascunho: {},
    alterado: false,
    salvando: false
  },
  validacoes: {
    aba: 'emitir',
    filtros: {
      parceiro: '',
      codigoEntidade: '',
      dataInicio: '',
      dataFim: '',
      produto: '',
      pedido: '',
      cliente: ''
    },
    pendentes: [],
    selecionados: [],
    recibos: [],
    reciboAtivo: null,
    importacaoRepasse: {
      mesBase: '',
      arquivoNome: '',
      linhas: [],
      erros: [],
      resumo: null,
      loteExistente: null,
      loading: false,
      message: ''
    },
    loading: false,
    message: ''
  },
  crm: {
    aba: 'resumo',
    filtro: '',
    statusFiltro: '',
    syncFiltro: '',
    items: [],
    totalItens: 0,
    ultimaSincronizacao: null,
    configurado: false,
    tokenConfigurado: false,
    listasConfiguradas: 0,
    carregado: false,
    pagina: 1,
    itensPorPagina: 20,
    detalhe: null,
    editando: false,
    edicaoAlterada: false,
    salvandoEdicao: false,
    sincronizandoCadastro: false,
    cadastro: {
      aberto: false,
      salvando: false,
      message: '',
      draft: {}
    },
    pedidosRelacionados: {
      aberto: false,
      loading: false,
      cpf: '',
      items: [],
      message: ''
    },
    atividade: {
      loading: false,
      saving: false,
      savingAction: '',
      respondingTo: '',
      repliesCollapsed: {},
      reactionMenuFor: '',
      activeUsers: [],
      viewerId: '',
      mentionMenu: { campoId: '', query: '', index: 0 },
      requestId: '',
      comments: [],
      attachments: [],
      message: ''
    },
    sincronizando: false,
    loading: false,
    message: ''
  },
  crm2: {
    codigoRota: '200',
    mensagem: '',
    acaoMockada: '',
    pessoasFisicas: {
      busca: '',
      statusFiltro: '',
      origemFiltro: '',
      detalheId: '',
      modoFormulario: '',
      mensagem: '',
      erros: {},
      draft: {},
      items: [
        {
          id: 'pf-001',
          nome: 'Mariana Alves de Souza',
          cpf: '12345678901',
          cei: '123.456.789/0001',
          nascimento: '1987-04-18',
          telefone: '(85) 99876-1204',
          email: 'mariana.souza@example.com',
          origem: 'Indicação',
          parceiro: 'Rede Transmares',
          status: 'cliente ativo',
          observacoes: 'Cliente com acompanhamento de renovação.',
          cadastroEm: '2026-07-18T10:30:00',
          atualizadoEm: '2026-08-03T15:42:00',
          anexos: [{ nome: 'Documento de identificação.pdf', validade: '2027-07-18', status: 'válido' }],
          empresas: [{ nome: 'Alves Consultoria Ltda.', vinculo: 'Representante legal', status: 'ativo' }],
          pedidos: [{ numero: 'PED-2401', produto: 'e-CNPJ A3', status: 'Ativo', vencimento: '2027-07-18' }],
          timeline: [
            { data: '2026-07-18T10:30:00', usuario: 'Sistema', descricao: 'Cadastro criado.', tipo: 'Cadastro' },
            { data: '2026-08-03T15:42:00', usuario: 'Equipe AR', descricao: 'Dados atualizados.', tipo: 'Atualização' }
          ]
        },
        {
          id: 'pf-002',
          nome: 'Rafael Nogueira Lima',
          cpf: '98765432100',
          cei: '',
          nascimento: '1979-11-02',
          telefone: '(81) 98812-4300',
          email: 'rafael.lima@example.com',
          origem: 'Site',
          parceiro: '',
          status: 'cliente inativo',
          observacoes: 'Sem pedidos ativos no momento.',
          cadastroEm: '2026-05-11T09:15:00',
          atualizadoEm: '2026-07-29T11:08:00',
          anexos: [],
          empresas: [],
          pedidos: [],
          timeline: [{ data: '2026-05-11T09:15:00', usuario: 'Sistema', descricao: 'Cadastro criado.', tipo: 'Cadastro' }]
        },
        {
          id: 'pf-003',
          nome: 'Camila Ferreira Rocha',
          cpf: '45678912300',
          cei: '987.654.321/0001',
          nascimento: '1992-08-25',
          telefone: '(88) 99654-7821',
          email: 'camila.rocha@example.com',
          origem: 'Parceiro',
          parceiro: 'Contabilidade Rocha',
          status: 'cliente ativo',
          observacoes: '',
          cadastroEm: '2026-06-20T14:20:00',
          atualizadoEm: '2026-08-01T16:25:00',
          anexos: [{ nome: 'Comprovante de endereço.pdf', validade: '2026-12-20', status: 'válido' }],
          empresas: [{ nome: 'Rocha Serviços Digitais', vinculo: 'Titular do pedido', status: 'ativo' }],
          pedidos: [{ numero: 'PED-2389', produto: 'e-CPF A3', status: 'Em validação', vencimento: '2026-12-20' }],
          timeline: [{ data: '2026-06-20T14:20:00', usuario: 'Sistema', descricao: 'Cadastro criado.', tipo: 'Cadastro' }]
        }
      ]
    }
  },
  produtoBusca: '',
  filtros: {
    ac: '',
    produto: '',
    midia: '',
    modelo: '',
    validade: ''
  },
  produtoId: '',
  parceiroId: '',
  parceiroBusca: '',
  resultado: null,
  alertas: [],
  aba: 'gerar',
  renderTimer: null,
  campoProdutoAtivo: '',
  loading: false,
  gerando: false,
  geracaoLinksToken: 0,
  message: ''
},
  temaAtual: 'claro'
};

const ADMIN_PARTNER_COLUMNS_STORAGE_KEY = 'hub-admin-partners-visible-columns-v1';
const ADMIN_PARTNER_SEARCH_DEBOUNCE_MS = 650;
const ADMIN_PARTNER_COLUMNS = [
  { id: 'acoes', label: 'Ações', locked: true, min: '112px', size: '0.55fr' },
  { id: 'parceiro', label: 'Parceiro', locked: true, min: '220px', size: '1.5fr' },
  { id: 'codigo_revendedor', label: 'Cód. revendedor', min: '120px', size: '0.7fr' },
  { id: 'ac', label: 'AC', min: '80px', size: '0.45fr' },
  { id: 'contato', label: 'Contato', min: '180px', size: '1fr' },
  { id: 'empresa', label: 'Empresa', min: '160px', size: '0.9fr' },
  { id: 'remunerado', label: 'Remunerado', min: '110px', size: '0.55fr' },
  { id: 'status', label: 'Status', min: '130px', size: '0.7fr' },
  { id: 'atualizado', label: 'Atualizado em', min: '120px', size: '0.6fr' }
];
const ADMIN_PARTNER_DEFAULT_VISIBLE_COLUMNS = ['acoes', 'parceiro', 'codigo_revendedor', 'ac', 'contato', 'status', 'atualizado'];

function sincronizarContextoInicialHub() {
  atualizarContextoInicialHub({
    usuario: state.usuario,
    perfil: state.usuario?.perfil,
    permissions: state.permissions,
    modulos: state.cards,
    config: state.config,
    meta: state.meta
  });
}

let atualizacaoContextoAcessoEmAndamento = null;
let atualizacaoContextoAcessoPendente = false;
let revalidarRotaAposAtualizacao = false;
let timerAtualizacaoContextoAcesso = null;
const motivosAtualizacaoContextoAcesso = new Set();

function obterAssinaturaAcessoAtual() {
  const mapaPermissoes = state.permissions?.map || {};

  return JSON.stringify({
    usuario: {
      id: state.usuario?.id || '',
      nome: state.usuario?.nome || '',
      email: state.usuario?.email || '',
      perfil: state.usuario?.perfil || ''
    },
    permissoes: Object.keys(mapaPermissoes)
      .filter(chave => Boolean(mapaPermissoes[chave]))
      .sort(),
    modulos: (state.cards || []).map(item => item?.id || '').filter(Boolean).sort()
  });
}

async function atualizarContextoAcessoHub(motivo = '', revalidarRota = true) {
  if (motivo) {
    motivosAtualizacaoContextoAcesso.add(motivo);
  }
  revalidarRotaAposAtualizacao = revalidarRotaAposAtualizacao || revalidarRota;

  if (!state.usuario) {
    motivosAtualizacaoContextoAcesso.clear();
    revalidarRotaAposAtualizacao = false;
    return false;
  }

  if (atualizacaoContextoAcessoEmAndamento) {
    atualizacaoContextoAcessoPendente = true;
    return atualizacaoContextoAcessoEmAndamento;
  }

  atualizacaoContextoAcessoEmAndamento = (async () => {
    let atualizado = false;

    do {
      atualizacaoContextoAcessoPendente = false;
      const assinaturaAnterior = obterAssinaturaAcessoAtual();
      const motivos = Array.from(motivosAtualizacaoContextoAcesso);
      motivosAtualizacaoContextoAcesso.clear();
      const deveRevalidarRota = revalidarRotaAposAtualizacao;
      revalidarRotaAposAtualizacao = false;
      const usuarioEsperadoId = state.usuario?.id || '';
      invalidarContextoAcessoHub(motivos.join(','));

      const resultado = await carregarDadosIniciaisSilencioso({ usuarioEsperadoId });
      if (!resultado.ok) {
        const falhaDeAcesso = /sess[aã]o inv[aá]lida|n[aã]o est[aá] cadastrado|usu[aá]rio est[aá] inativo/i
          .test(resultado.message || '');

        if (falhaDeAcesso) {
          limparDadosSessao();
          renderErro(resultado.message);
          return atualizado;
        }

        sincronizarContextoInicialHub();
        return atualizado;
      }

      atualizado = true;
      if (deveRevalidarRota && assinaturaAnterior !== obterAssinaturaAcessoAtual()) {
        await renderizarRotaAtual();
      }
    } while (atualizacaoContextoAcessoPendente && state.usuario);

    return atualizado;
  })();

  try {
    return await atualizacaoContextoAcessoEmAndamento;
  } finally {
    atualizacaoContextoAcessoEmAndamento = null;
  }
}

function agendarAtualizacaoContextoAcessoHub(motivo = '') {
  if (motivo) {
    motivosAtualizacaoContextoAcesso.add(motivo);
  }
  revalidarRotaAposAtualizacao = true;

  if (timerAtualizacaoContextoAcesso) return;

  timerAtualizacaoContextoAcesso = window.setTimeout(() => {
    timerAtualizacaoContextoAcesso = null;
    atualizarContextoAcessoHub();
  }, 0);
}

document.addEventListener('DOMContentLoaded', iniciarApp);
document.addEventListener('DOMContentLoaded', iniciarIconesLucideHub);
document.addEventListener('DOMContentLoaded', iniciarTooltipsGlobais);
document.addEventListener('click', fecharFiltrosListaAoClicarForaAr);
document.addEventListener('click', fecharDropdownCrmAr);
document.addEventListener('click', fecharDropdownLogsAdmin);
window.addEventListener('resize', reposicionarDropdownsCrmAr);
window.addEventListener('scroll', reposicionarDropdownsCrmAr, true);
window.addEventListener('resize', reposicionarDropdownsLogsAdmin);
window.addEventListener('scroll', reposicionarDropdownsLogsAdmin, true);
window.addEventListener('hubAccessContextRefreshRequested', event => {
  agendarAtualizacaoContextoAcessoHub(event?.detail?.motivo || 'alteracao-acesso');
});
window.addEventListener('hubAdminUsuariosAtualizados', () => {
  agendarAtualizacaoContextoAcessoHub('usuario-atualizado');
});
window.addEventListener('popstate', () => {
  if (state.usuario) {
    renderizarRotaAtual();
  }
});

async function iniciarApp(exibirLoadingInicial = true) {
  try {
    if (exibirLoadingInicial) {
      renderLoading();
    }

    const sessao = await obterSessaoAtual();

    if (!sessao?.user?.email) {
      limparDadosSessao();
      state.auth.loading = false;
      renderLogin();
      return false;
    }

    const response = await chamarApi('getInitialData');

    if (!response.ok) {
      state.auth.loading = false;
      renderErro(obterMensagemApi(response, 'Não foi possível carregar os dados do Hub.'));
      return false;
    }

    state.usuario = response.data.usuario;
    state.config = response.data.config;
    state.cards = response.data.cards || [];
    state.avisos = response.data.avisos || [];
    state.aniversariantes = response.data.aniversariantes || [];
    state.favoritos = response.data.favoritos || [];
    state.meta = response.data.meta || null;
    state.permissions = response.data.permissions || normalizarPermissoes([]);
    sincronizarContextoInicialHub();
    inicializarNotificacoesHub();

    aplicarConfigVisual();
    definirTemaInicial();
    state.auth.loading = false;
    state.auth.message = '';
    await renderizarRotaAtual();
    return true;

  } catch (erro) {
    state.auth.loading = false;
    renderErro(erro.message || 'Não foi possível carregar o Hub.');
    return false;
  }
}

function limparDadosSessao() {
  state.usuario = null;
  state.config = null;
  state.cards = [];
  state.avisos = [];
  state.aniversariantes = [];
  state.favoritos = [];
  state.meta = null;
  state.permissions = normalizarPermissoes([]);
  limparContextoAcessoHub();
}

function renderLogin() {
  document.getElementById('app').innerHTML = `
    <section class="login-card">
      <div class="login-logo" aria-label="Transmares Corretora de Seguros">
        <img src="${obterCaminhoAssetHub('assets/logo-transmares.png')}" alt="Transmares Corretora de Seguros">
      </div>

    <h1>Hub Transmares</h1>
      <p>Entre com seu e-mail e senha para acessar o Hub.</p>

      <form class="login-form" onsubmit="entrarNoHub(event)">
        <label>
          <span>E-mail</span>
          <input id="login_email" class="config-input" type="email" value="${escapeAttr(state.auth.email)}" autocomplete="email" required>
        </label>

        <label>
          <span>Senha</span>
          <input id="login_password" class="config-input" type="password" autocomplete="current-password" required>
        </label>

        ${state.auth.message ? `<p class="admin-message">${escapeHtml(state.auth.message)}</p>` : ''}

        <button class="save-btn" type="submit" ${state.auth.loading ? 'disabled' : ''}>
          ${state.auth.loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </section>
  `;
}

function renderLoginLoading() {
  document.getElementById('app').innerHTML = `
    <section class="login-loading-screen" aria-live="polite" aria-busy="true">
      <div class="login-loading-content">
        ${renderHubLoading('Carregando acesso...')}
      </div>
    </section>
  `;
}
async function entrarNoHub(event) {
  event.preventDefault();

  const email = document.getElementById('login_email')?.value || '';
  const password = document.getElementById('login_password')?.value || '';

  try {
    state.auth.email = email;
    state.auth.loading = true;
    state.auth.message = '';
    renderLoginLoading();

    const sessao = await entrarComSenha(email, password);

    if (!sessao?.user?.email) {
      throw new Error('Não foi possível iniciar a sessão. Tente novamente.');
    }

    const carregou = await iniciarApp(false);

    if (!carregou) {
      state.auth.loading = false;
    }
  } catch (erro) {
    state.auth.loading = false;
    state.auth.message = erro.message || 'Não foi possível entrar. Confira e-mail e senha.';
    renderLogin();
  }
}

async function sair() {
  try {
    await sairDoHub();
  } catch (erro) {
    console.warn('Não foi possível encerrar a sessão:', erro);
  }

  limparDadosSessao();
  state.auth.loading = false;
  renderLogin();
}

function renderLoading() {
  document.getElementById('app').innerHTML = `
    <section class="loading-card" aria-live="polite" aria-busy="true">
      <h1>Hub Transmares</h1>
      ${renderHubLoading('Carregando sistema...')}
    </section>
  `;
}

function renderHubLoading(mensagem = 'Carregando...') {
  return `
    <div class="hub-loading" role="status" aria-live="polite" aria-busy="true">
      <span class="hub-loading-spinner" aria-hidden="true"></span>
      <span class="hub-loading-text">${escapeHtml(mensagem)}</span>
    </div>
  `;
}

function renderErro(mensagem) {
  document.getElementById('app').innerHTML = `
    <section class="error-card">
      <h1>Não foi possível carregar o Hub</h1>
      <p>${escapeHtml(mensagem)}</p>
      <div class="error-actions">
        <button class="save-btn" type="button" onclick="iniciarApp()">Tentar novamente</button>
        <button class="secondary-btn" type="button" onclick="sair()">Sair</button>
      </div>
    </section>
  `;
}

function aplicarConfigVisual() {
  if (!state.config) return;

  document.documentElement.style.setProperty('--cor-principal', state.config.cor_principal || '#294895');
  document.documentElement.style.setProperty('--cor-secundaria', state.config.cor_secundaria || '#1F3676');
  document.documentElement.style.setProperty('--cor-destaque', state.config.cor_destaque || '#16A34A');

  document.title = state.config.nome_sistema || 'PAINEL TRANSMARES';
}

function definirTemaInicial() {
  const temaApi = state.meta?.modo_visual_efetivo;
  const preferenciaUsuario = state.usuario?.preferencia_modo_visual;
  const padraoSistema = state.config?.modo_visual_padrao || 'claro';

  state.temaAtual = temaApi || preferenciaUsuario || padraoSistema || 'claro';

  aplicarTema();
}

function aplicarTema() {
  if (state.temaAtual === 'escuro') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}

function alternarTema() {
  state.temaAtual = state.temaAtual === 'escuro' ? 'claro' : 'escuro';
  aplicarTema();

  chamarApi('saveUserTheme', {
    modo: state.temaAtual
  }).catch(() => {
    console.warn('Não foi possível salvar a preferência de tema.');
  });

  renderizarRotaAtual();
}

function renderDashboard() {
  const nomeSistema = state.config?.nome_sistema || 'PAINEL TRANSMARES';
  const subtitulo = state.config?.subtitulo_sistema || 'Central operacional da Transmares Corretora de Seguros';

  document.getElementById('app').innerHTML = `
    <main class="dashboard">
      <header class="topbar">
        ${renderHeaderLogo()}
        <div class="brand">
          <h1>${escapeHtml(nomeSistema)}</h1>
          <p>${escapeHtml(subtitulo)}</p>
        </div>

        <div class="user-box">
          <strong>${escapeHtml(state.usuario.nome || '')}</strong><br>
          ${escapeHtml(state.usuario.email || '')}

          <br>
          <button class="theme-btn icon-only" onclick="alternarTema()" title="${state.temaAtual === 'escuro' ? 'Ativar modo claro' : 'Ativar modo escuro'}" aria-label="${state.temaAtual === 'escuro' ? 'Ativar modo claro' : 'Ativar modo escuro'}">
            <i data-lucide="${state.temaAtual === 'escuro' ? 'sun' : 'moon'}" aria-hidden="true"></i>
          </button>
          <button class="secondary-btn logout-btn" type="button" onclick="sair()">Sair</button>
        </div>
      </header>

      <section class="info-grid">
        <div class="info-card">
          <div class="info-card-header">
            <span class="info-icon">📢</span>
            <h2>Avisos internos</h2>
          </div>
          ${renderAvisos()}
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <span class="info-icon">🎂</span>
            <h2>Aniversariantes</h2>
          </div>
          ${renderAniversariantes()}
        </div>
      </section>

      <section class="quick-links-strip">
        <div class="quick-links-title">
          <span>⭐</span>
          <strong>Links rápidos</strong>
        </div>

        <div class="quick-links-list">
          ${renderFavoritos()}
        </div>
      </section>

      <div class="section-title">
        <h2>Módulos ${renderBotaoConfigurarModulosHome()}</h2>
        <p>Acesse as principais áreas operacionais do painel.</p>
      </div>

      <section class="module-grid">
        ${state.cards.map(card => `
          <article class="module-card" role="button" tabindex="0" onclick="abrirModulo('${escapeAttr(card.id)}')" onkeydown="acionarCardModulo(event, '${escapeAttr(card.id)}')">
            <div class="module-card-top">
              <h3>${escapeHtml(card.titulo)}</h3>
              <span class="module-card-arrow" aria-hidden="true">›</span>
            </div>
          </article>
        `).join('')}
      </section>

      ${renderModalConfigurarModulosHome()}
    </main>
  `;
}


function podeConfigurarModulosHome() {
  return pode('admin.modulos', 'update') || pode('admin', 'update') || pode('admin', 'view');
}

function renderBotaoConfigurarModulosHome() {
  if (!podeConfigurarModulosHome()) {
    return '';
  }

  return `
    <button
      class="icon-btn module-config-edit-btn"
      type="button"
      onclick="abrirModalConfigurarModulosHome()"
      title="Configurar módulos da Home"
      aria-label="Configurar módulos da Home"
    >✏️</button>
  `;
}

function renderModalConfigurarModulosHome() {
  const modal = state.modulosHome;

  if (!modal.aberto) {
    return '';
  }

  const alterado = verificarAlteracoesModulosHome();

  return `
    <div class="modal-backdrop admin-user-modal-backdrop" role="dialog" aria-modal="true" aria-label="Configurar módulos da Home">
      <section class="small-modal admin-user-modal is-permissions-stage home-modules-modal">
        <div class="small-modal-header">
          <div>
            <h3>Configurar módulos</h3>
          </div>
          <button class="icon-btn" type="button" onclick="fecharModalConfigurarModulosHome()" title="Fechar" aria-label="Fechar" ${modal.saving ? 'disabled' : ''}>×</button>
        </div>

        <div class="permission-modal-layout">
          <div class="permission-modal-content">
            ${modal.message ? `<p class="admin-message">${escapeHtml(modal.message)}</p>` : ''}
            ${modal.loading ? renderHubLoading('Carregando módulos...') : renderConteudoModalConfigurarModulosHome()}
          </div>
        </div>

        <div class="small-modal-actions admin-user-permissions-actions">
          <button class="secondary-btn" type="button" onclick="fecharModalConfigurarModulosHome()" ${modal.saving ? 'disabled' : ''}>Cancelar</button>
          <div class="admin-user-permissions-actions-right">
            <button class="save-btn" type="button" onclick="salvarConfigModulosHome()" ${modal.saving || !alterado ? 'disabled' : ''}>
              ${modal.saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderConteudoModalConfigurarModulosHome() {
  return `
    <div class="home-modules-modal-table-wrap">
      ${renderListaModulosHomeModal()}
    </div>
  `;
}

function renderFiltroModulosHome(filtro, label, total) {
  const ativo = state.modulosHome.filtro === filtro;
  const classes = [
    'filter-btn',
    filtro === 'visiveis' ? 'filter-status-ativo' : '',
    filtro === 'ocultos' ? 'filter-status-bloqueados-inativos' : '',
    ativo ? 'active' : ''
  ].filter(Boolean).join(' ');

  return `
    <button class="${classes}" type="button" onclick="selecionarFiltroModulosHome('${filtro}')" aria-pressed="${ativo ? 'true' : 'false'}">
      ${escapeHtml(label)} <span>${escapeHtml(String(total))}</span>
    </button>
  `;
}

function obterResumoVisibilidadeModulosHome() {
  return (state.modulosHome.modules || []).reduce((acc, modulo) => {
    const visivel = obterVisibilidadeModuloHomeDraft(modulo.id);
    acc.total += 1;

    if (visivel) {
      acc.visiveis += 1;
    } else {
      acc.ocultos += 1;
    }

    return acc;
  }, {
    total: 0,
    visiveis: 0,
    ocultos: 0
  });
}

function obterModuloHomeDraft(id) {
  const draft = state.modulosHome.draft || {};

  if (draft[id] && typeof draft[id] === 'object') {
    return draft[id];
  }

  return {
    exibir_home: true,
    status: 'ativo'
  };
}

function obterVisibilidadeModuloHomeDraft(id) {
  return obterModuloHomeDraft(id).exibir_home !== false;
}

function obterStatusModuloHomeDraft(id) {
  return obterModuloHomeDraft(id).status === 'inativo' ? 'inativo' : 'ativo';
}

function obterModulosHomeFiltrados() {
  const filtro = state.modulosHome.filtro || 'todos';
  const modules = state.modulosHome.modules || [];

  if (filtro === 'visiveis') {
    return modules.filter(modulo => obterVisibilidadeModuloHomeDraft(modulo.id));
  }

  if (filtro === 'ocultos') {
    return modules.filter(modulo => !obterVisibilidadeModuloHomeDraft(modulo.id));
  }

  return modules;
}

function renderListaModulosHomeModal() {
  const modules = state.modulosHome.modules || [];

  if (!modules.length) {
    return '<p class="quick-link-empty">Nenhum módulo encontrado.</p>';
  }

  return `
    <div class="crud-list admin-modules-list home-modules-modal-list">
      <div class="home-modules-modal-header home-modules-modal-grid">
        <span>Módulo</span>
        <span>Status</span>
        <span>Exibição</span>
      </div>
      ${modules.map(modulo => renderLinhaModuloHomeModal(modulo)).join('')}
    </div>
  `;
}

function renderLinhaModuloHomeModal(modulo) {
  const id = escapeAttr(modulo.id || '');
  const status = obterStatusModuloHomeDraft(modulo.id);
  const visivel = obterVisibilidadeModuloHomeDraft(modulo.id);
  const toggleDisabled = status === 'inativo' || state.modulosHome.saving;
  const botaoStatusDesabilitado = state.modulosHome.saving || (!modulo.bloqueavel && status === 'ativo');
  const proximoStatus = status === 'ativo' ? 'inativo' : 'ativo';
  const acaoStatus = status === 'ativo' ? 'Ativo' : 'Inativo';
  const acaoVisibilidade = visivel ? 'Visível' : 'Oculto';
  const tituloStatus = !modulo.bloqueavel && status === 'ativo'
    ? 'Este módulo é protegido e não pode ser inativado.'
    : 'Alterar status do módulo.';
  const tituloVisibilidade = toggleDisabled
    ? 'Módulos inativos não aparecem na Home.'
    : 'Alterar visibilidade na Home.';

  return `
    <article class="home-modules-modal-row home-modules-modal-grid">
      <div class="admin-user-identity">
        <strong>${escapeHtml(modulo.nome || modulo.slug || 'Módulo')}</strong>
      </div>
      <div class="crud-actions home-modules-modal-action">
        <button
          class="${status === 'ativo' ? 'secondary-btn' : 'save-btn'}"
          type="button"
          onclick="alterarStatusModuloHome('${id}', '${proximoStatus}')"
          title="${escapeAttr(tituloStatus)}"
          ${botaoStatusDesabilitado ? 'disabled' : ''}
        >
          ${escapeHtml(!modulo.bloqueavel && status === 'ativo' ? 'Protegido' : acaoStatus)}
        </button>
      </div>
      <div class="crud-actions home-modules-modal-action">
        <button
          class="${visivel ? 'secondary-btn' : 'save-btn'}"
          type="button"
          onclick="alterarVisibilidadeModuloHome('${id}', ${visivel ? 'false' : 'true'})"
          title="${escapeAttr(tituloVisibilidade)}"
          ${toggleDisabled ? 'disabled' : ''}
        >
          ${escapeHtml(acaoVisibilidade)}
        </button>
      </div>
    </article>
  `;
}

async function abrirModalConfigurarModulosHome() {
  if (!podeConfigurarModulosHome()) {
    alert('Seu usuário não possui permissão para configurar módulos.');
    return;
  }

  state.modulosHome = {
    aberto: true,
    filtro: 'todos',
    modules: [],
    original: {},
    draft: {},
    loading: true,
    saving: false,
    message: ''
  };
  renderDashboard();

  try {
    const response = await chamarApi('listAdminModules');

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar módulos.'));
    }

    const modules = response.data.modules || [];
    const original = modules.reduce((acc, modulo) => {
      acc[modulo.id] = {
        exibir_home: modulo.exibir_home !== false,
        status: modulo.status === 'inativo' ? 'inativo' : 'ativo'
      };
      return acc;
    }, {});

    state.modulosHome.modules = modules;
    state.modulosHome.original = original;
    state.modulosHome.draft = { ...original };
    state.modulosHome.loading = false;
    renderDashboard();
  } catch (erro) {
    state.modulosHome.loading = false;
    state.modulosHome.message = erro.message || 'Erro ao carregar módulos.';
    renderDashboard();
  }
}

function fecharModalConfigurarModulosHome() {
  state.modulosHome = {
    aberto: false,
    filtro: 'todos',
    modules: [],
    original: {},
    draft: {},
    loading: false,
    saving: false,
    message: ''
  };
  renderDashboard();
}

function selecionarFiltroModulosHome(filtro) {
  state.modulosHome.filtro = filtro;
  renderDashboard();
}

function alterarVisibilidadeModuloHome(id, exibirHome) {
  const atual = obterModuloHomeDraft(id);

  state.modulosHome.draft = {
    ...(state.modulosHome.draft || {}),
    [id]: {
      ...atual,
      exibir_home: Boolean(exibirHome)
    }
  };
  renderDashboard();
}

function alterarStatusModuloHome(id, status) {
  const atual = obterModuloHomeDraft(id);
  const proximoStatus = status === 'inativo' ? 'inativo' : 'ativo';

  state.modulosHome.draft = {
    ...(state.modulosHome.draft || {}),
    [id]: {
      ...atual,
      status: proximoStatus,
      exibir_home: obterExibicaoModuloAposStatus(atual, proximoStatus)
    }
  };
  renderDashboard();
}

function obterExibicaoModuloAposStatus(moduloDraft, status) {
  if (status === 'inativo') {
    return false;
  }

  return moduloDraft.exibir_home !== false;
}

function verificarAlteracoesModulosHome() {
  const original = state.modulosHome.original || {};
  const draft = state.modulosHome.draft || {};
  const chaves = new Set([
    ...Object.keys(original),
    ...Object.keys(draft)
  ]);

  return Array.from(chaves).some(chave => {
    const originalModulo = original[chave] || {};
    const draftModulo = draft[chave] || {};

    return Boolean(originalModulo.exibir_home) !== Boolean(draftModulo.exibir_home)
      || String(originalModulo.status || 'ativo') !== String(draftModulo.status || 'ativo');
  });
}

function obterAlteracoesModulosHome() {
  const original = state.modulosHome.original || {};
  const draft = state.modulosHome.draft || {};

  return Object.keys(draft)
    .filter(id => {
      const originalModulo = original[id] || {};
      const draftModulo = draft[id] || {};

      return Boolean(originalModulo.exibir_home) !== Boolean(draftModulo.exibir_home)
        || String(originalModulo.status || 'ativo') !== String(draftModulo.status || 'ativo');
    })
    .map(id => ({
      id,
      exibir_home: Boolean(draft[id]?.exibir_home),
      status: draft[id]?.status === 'inativo' ? 'inativo' : 'ativo'
    }));
}

async function salvarConfigModulosHome() {
  if (!podeConfigurarModulosHome()) {
    state.modulosHome.message = 'Seu usuário não possui permissão para configurar módulos.';
    renderDashboard();
    return;
  }

  const alteracoes = obterAlteracoesModulosHome();

  if (!alteracoes.length) {
    return;
  }

  try {
    state.modulosHome.saving = true;
    state.modulosHome.message = '';
    renderDashboard();

    const alteracoesStatus = alteracoes.filter(item => {
      const original = state.modulosHome.original?.[item.id] || {};
      return String(original.status || 'ativo') !== item.status;
    });
    const alteracoesVisibilidade = alteracoes.filter(item => {
      const original = state.modulosHome.original?.[item.id] || {};
      return Boolean(original.exibir_home) !== Boolean(item.exibir_home);
    });

    for (const alteracao of alteracoesStatus) {
      const responseStatus = await chamarApi('updateAdminModuleStatus', {
        id: alteracao.id,
        status: alteracao.status
      });

      if (!responseStatus.ok) {
        throw new Error(obterMensagemApi(responseStatus, 'Não foi possível salvar o status dos módulos.'));
      }
    }

    if (alteracoesVisibilidade.length) {
      const response = await chamarApi('saveAdminModuleHomeVisibilityBatch', {
        modulos: alteracoesVisibilidade
      });

      if (!response.ok) {
        throw new Error(obterMensagemApi(response, 'Não foi possível salvar a visibilidade dos módulos.'));
      }
    }

    await carregarDadosIniciaisSilencioso();
    fecharModalConfigurarModulosHome();
  } catch (erro) {
    state.modulosHome.saving = false;
    state.modulosHome.message = erro.message || 'Erro ao salvar módulos.';
    renderDashboard();
  }
}

function renderHeaderLogo() {
  const home = montarCaminhoHub();

  return `
    <a class="brand-logo-slot" href="${escapeAttr(home)}" aria-label="Ir para a página inicial" onclick="event.preventDefault(); navegarLogoParaHomeHub()">
      <img src="${obterCaminhoAssetHub('assets/logo-transmares.png')}" alt="Transmares Corretora de Seguros">
    </a>
  `;
}

function navegarLogoParaHomeHub() {
  navegarHome();
}

function acionarCardModulo(event, id) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    abrirModulo(id);
  }
}

function obterBaseHub() {
  const pathname = window.location.pathname || '/';

  return pathname === '/hub' || pathname.startsWith('/hub/')
    ? '/hub'
    : '';
}

function obterCaminhoAssetHub(caminhoAsset) {
  const base = obterBaseHub();
  const caminhoLimpo = String(caminhoAsset || '').replace(/^\/+/, '');

  return base ? `${base}/${caminhoLimpo}` : `/${caminhoLimpo}`;
}

function obterModuloDaRotaAtual() {
  const base = obterBaseHub();
  const pathname = window.location.pathname || '/';
  const rota = base ? pathname.slice(base.length) : pathname;
  const partes = rota
    .replace(/^\/+|\/+$/g, '')
    .replace(/^index\.html$/i, '')
    .split('/')
    .filter(Boolean);
  const caminho = partes.join('/').toLowerCase();

  if (caminho === 'configuracoes/corretora') {
    return 'configuracoes-corretora';
  }

  return (partes[0] || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/^index\.html$/i, '');
}

function obterPartesDaRotaAtual() {
  const base = obterBaseHub();
  const pathname = window.location.pathname || '/';
  const rota = base ? pathname.slice(base.length) : pathname;

  return rota
    .replace(/^\/+|\/+$/g, '')
    .replace(/^index\.html$/i, '')
    .split('/')
    .filter(Boolean);
}

function montarCaminhoHub(idModulo = '') {
  const base = obterBaseHub();
  const slug = obterRotaModulo(idModulo);

  if (!base) {
    return slug ? `/${slug}` : '/';
  }

  return slug ? `${base}/${slug}` : `${base}/`;
}

function navegarParaRota(caminho) {
  if (window.location.pathname !== caminho) {
    window.history.pushState({}, '', caminho);
  }

  return renderizarRotaAtual();
}

function navegarHome() {
  return navegarParaRota(montarCaminhoHub());
}

async function renderizarRotaAtual() {
  const idModulo = normalizarIdModuloRota(obterModuloDaRotaAtual());

  if (!idModulo) {
    renderDashboard();
    return;
  }

  await abrirModuloDireto(idModulo);
}

function navegarParaModulo(idModulo) {
  return navegarParaRota(montarCaminhoHub(idModulo));
}

function normalizarIdModuloRota(idModulo = '') {
  const slug = normalizarSlugModulo(idModulo);
  return slug === 'admin' ? 'administracao' : slug;
}

function obterRotaModulo(idModulo = '') {
  const slug = normalizarSlugModulo(idModulo);
  return slug === 'administracao' ? 'admin' : slug;
}

function normalizarSlugModulo(valor = '') {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function moduloEstaAtivo(idModulo) {
  const idNormalizado = normalizarIdModuloRota(idModulo);
  if (idNormalizado === 'financeiro' || idNormalizado === 'rh-dp') {
    return canAccessModule(state.permissions, idNormalizado);
  }

  return (state.cards || []).some(card => card.id === idNormalizado)
    && canAccessModule(state.permissions, idNormalizado);
}

function pode(recurso, acao = 'view') {
  return hasPermission(state.permissions, recurso, acao);
}

function podeAcessarAbaAdmin(aba) {
  const permissoesPorAba = {
    usuarios: ['admin.usuarios', 'view'],
    perfis: ['admin.perfis', 'view'],
    permissoes: ['admin.permissoes', 'view'],
    'parceiros-indicacao': ['admin.parceiros_indicacao', 'view'],
    'logs-integracoes': ['admin.logs_integracoes', 'view']
  };
  const regra = permissoesPorAba[aba];

  return regra ? pode(regra[0], regra[1]) : pode('admin', 'view');
}

function podeAcessarAbaAr(aba) {
  const permissoesPorAba = {
    gerar: ['painel_ar.gerar_links', 'view'],
    produtos: ['painel_ar.gerar_links', 'view'],
    validacoes: ['painel_ar.validacoes', 'view'],
    historico: ['painel_ar.validacoes', 'view'],
    crm: ['painel_ar.crm', 'view'],
    crm2: ['painel_ar.crm_2', 'view'],
    'crm2-pf': ['painel_ar.crm_2', 'view']
  };
  const regra = permissoesPorAba[aba];

  return regra ? pode(regra[0], regra[1]) : pode('painel_ar', 'view');
}

function renderModuloIndisponivel(idModulo) {
  const nomeSistema = state.config?.nome_sistema || 'PAINEL TRANSMARES';
  const subtitulo = state.config?.subtitulo_sistema || 'Central operacional da Transmares Corretora de Seguros';

  document.getElementById('app').innerHTML = `
    <main class="dashboard">
      <header class="topbar">
        ${renderHeaderLogo()}
        <div class="brand">
          <h1>${escapeHtml(nomeSistema)}</h1>
          <p>${escapeHtml(subtitulo)}</p>
        </div>

        <div class="user-box">
          <strong>${escapeHtml(state.usuario.nome || '')}</strong><br>
          ${escapeHtml(state.usuario.email || '')}<br>
          <button class="secondary-btn" type="button" onclick="navegarHome()">Voltar</button>
        </div>
      </header>

      <section class="admin-panel">
        <div class="admin-panel-header">
          <div>
            <h2>Módulo indisponível</h2>
            <p>Este módulo está inativo, indisponível ou seu usuário não possui acesso.</p>
          </div>
        </div>

        <p class="quick-link-empty">Rota solicitada: ${escapeHtml(idModulo || '-')}</p>
        <button class="save-btn" type="button" onclick="navegarHome()">Voltar para a Home</button>
      </section>
    </main>
  `;
}

let rhDpController = null;
let financeiroController = null;

async function obterRhDpController() {
  if (!rhDpController) {
    const { criarRhDpController } = await import('./rhDpPage.js');
    rhDpController = criarRhDpController({
      renderShell: renderHubShell,
      pode,
      escapeHtml,
      escapeAttr,
      obterPartesRota: obterPartesDaRotaAtual,
      montarCaminhoModulo: montarCaminhoHub,
      navegarParaRota
    });
  }

  return rhDpController;
}

async function obterFinanceiroController() {
  if (!financeiroController) {
    const { criarFinanceiroController } = await import('./financeiroController.js');
    financeiroController = criarFinanceiroController({
      renderShell: renderHubShell,
      pode,
      escapeHtml,
      escapeAttr,
      obterPartesRota: obterPartesDaRotaAtual,
      montarCaminhoModulo: montarCaminhoHub,
      navegarParaRota
    });
  }

  return financeiroController;
}

function renderAvisos() {
  if (!state.avisos.length) {
    return '<p>Nenhum aviso ativo no momento.</p>';
  }

  return state.avisos.map(aviso => `
    <p><strong>${escapeHtml(aviso.titulo || 'Aviso')}</strong><br>${escapeHtml(aviso.mensagem || '')}</p>
  `).join('');
}

function formatarDataAniversario(valor = '') {
  if (!valor) return '';
  const data = new Date(`${valor}T12:00:00`);
  return Number.isNaN(data.getTime())
    ? String(valor)
    : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function renderAniversariantes() {
  if (!state.aniversariantes.length) {
    return '<p>Nenhum aniversariante nos próximos dias.</p>';
  }

  return state.aniversariantes.map(item => {
    const diasAte = Number(item.dias_ate);
    const quando = Number.isFinite(diasAte)
      ? ` · ${diasAte === 0 ? 'hoje' : `em ${diasAte} dia${diasAte === 1 ? '' : 's'}`}`
      : '';

    return `
      <p><strong>${escapeHtml(item.nome || '')}</strong> ${escapeHtml(formatarDataAniversario(item.data))}${escapeHtml(quando)}</p>
    `;
  }).join('');
}

function renderFavoritos() {
  if (!state.favoritos.length) {
    return '<span class="quick-link-empty">Nenhum favorito cadastrado.</span>';
  }

  return state.favoritos.map(link => `
    <button class="quick-link-pill" type="button" onclick="abrirLink('${escapeAttr(link.url || '')}')">
      ${escapeHtml(link.titulo || 'Link')}
    </button>
  `).join('');
}

function abrirModulo(id) {
  navegarParaModulo(id);
}

async function abrirModuloDireto(id) {
  const idModulo = normalizarIdModuloRota(id);

  if (!moduloEstaAtivo(idModulo)) {
    renderModuloIndisponivel(idModulo);
    return;
  }

  if (idModulo === 'administracao') {
    await abrirAdministracao();
    return;
  }

  if (['links-corretora', 'links-ar', 'links-gestao'].indexOf(idModulo) >= 0) {
    await abrirLinksUteis(idModulo);
    return;
  }

  if (idModulo === 'central-senhas') {
    await abrirCentralSenhas();
    return;
  }

  if (idModulo === 'painel-ar') {
    await abrirPainelAr();
    return;
  }

  if (idModulo === 'financeiro') {
    const controller = await obterFinanceiroController();
    await controller.abrir();
    return;
  }

  if (idModulo === 'rh-dp') {
    const controller = await obterRhDpController();
    await controller.abrir();
    return;
  }

  alert(`Módulo ainda não implementado: ${idModulo}`);
}

async function abrirAdministracao(preservarMensagem = false) {
  if (!hasPermission(state.permissions, 'admin', 'view')) {
    renderModuloIndisponivel('administracao');
    return;
  }

  state.admin.loading = true;
  if (!preservarMensagem) {
    state.admin.message = '';
  }
  renderAdministracao();

  try {
    const response = await chamarApi('getAdminData');

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar a administração.'));
    }

    state.admin.config = response.data.config || [];
    state.admin.loading = false;
    renderAdministracao();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao carregar a administração.';
    renderAdministracao();
  }
}

function renderAdministracao() {
  limparMenusAcoesGlobais();
  const nomeSistema = state.config?.nome_sistema || 'PAINEL TRANSMARES';
  const subtitulo = state.config?.subtitulo_sistema || 'Central operacional da Transmares Corretora de Seguros';

  document.getElementById('app').innerHTML = `
    <main class="dashboard">
      <header class="topbar">
        ${renderHeaderLogo()}
        <div class="brand">
          <h1>${escapeHtml(nomeSistema)}</h1>
          <p>${escapeHtml(subtitulo)}</p>
        </div>

        <div class="user-box">
          <strong>${escapeHtml(state.usuario.nome || '')}</strong><br>
          ${escapeHtml(state.usuario.email || '')}<br>
          <button class="secondary-btn" type="button" onclick="navegarHome()">Voltar</button>
        </div>
      </header>

      <section class="admin-shell">
        <div class="admin-tabs">
          <span class="admin-nav-label">Configurações</span>
          ${renderAdminTab('identidade', 'Identidade do Painel')}
          ${renderAdminTab('aparencia', 'Aparência')}
          ${renderAdminTab('logo', 'Logo e Marca')}
          ${renderAdminTab('limites', 'Limites do Painel')}

          <span class="admin-nav-label">Sistema</span>
          ${pode('admin.logs_integracoes', 'view') ? renderAdminTab('logs-integracoes', 'Logs') : ''}

          <span class="admin-nav-label">Cadastros</span>
          ${renderAdminTab('categorias', 'Categorias')}
          ${renderAdminTab('grupos', 'Grupos')}
          ${pode('admin.parceiros_indicacao', 'view') ? renderAdminTab('parceiros-indicacao', 'Parceiros de Indicação') : ''}

          <span class="admin-nav-label">Estrutura futura</span>
          ${renderAdminTab('home-exibicao', 'Home e Exibição')}
          ${pode('admin.usuarios', 'view') ? renderAdminTab('usuarios', 'Usuários') : ''}
          ${pode('admin.perfis', 'view') ? renderAdminTab('perfis', 'Perfis de Acesso') : ''}
                 </div>

        ${renderAdminPanel()}
      </section>
    </main>
  `;
}

function renderAdminTab(aba, label) {
  return `
    <button class="admin-tab ${state.admin.aba === aba ? 'active' : ''}" type="button" onclick="selecionarAbaAdmin('${escapeAttr(aba)}')">
      ${escapeHtml(label)}
    </button>
  `;
}

function renderAdminPanel() {
  if (!podeAcessarAbaAdmin(state.admin.aba)) {
    state.admin.aba = 'identidade';
  }

  if (state.admin.aba === 'categorias') {
    return renderCrudAdmin('categorias', 'Categorias', 'Organize os futuros itens do HUB por categorias.');
  }

  if (state.admin.aba === 'grupos') {
    return renderCrudAdmin('grupos', 'Grupos', 'Organize permissões e agrupamentos para fases futuras.');
  }

  if (state.admin.aba === 'parceiros-indicacao') {
    return renderParceirosIndicacaoAdmin();
  }

  if (state.admin.aba === 'home-exibicao') {
    return renderHomeExibicaoAdmin();
  }

  if (state.admin.aba === 'usuarios') {
    return renderUsuariosAdmin();
  }

  if (state.admin.aba === 'perfis') {
    return renderPerfisAdmin();
  }

  if (state.admin.aba === 'logs-integracoes') {
    return renderLogsIntegracoesAdmin();
  }

  if (state.admin.aba === 'auditoria') {
    return renderAuditoriaAdminFutura();
  }

  const gruposPorAba = {
    configuracoes: 'identidade',
    identidade: 'identidade',
    aparencia: 'visual',
    logo: 'logo',
    limites: 'limites'
  };
  const grupoId = gruposPorAba[state.admin.aba] || 'identidade';
  const titulos = {
    identidade: {
      titulo: 'Identidade do Painel',
      subtitulo: 'Nome e subtítulo exibidos no cabeçalho global do sistema.'
    },
    visual: {
      titulo: 'Aparência',
      subtitulo: 'Cores operacionais e preferência visual padrão.'
    },
    logo: {
      titulo: 'Logo e Marca',
      subtitulo: 'Campos existentes para preparar a identidade visual do painel.'
    },
    limites: {
      titulo: 'Limites do Painel',
      subtitulo: 'Parâmetros que controlam quantidades exibidas na Home e no histórico.'
    }
  };

  return `
    <section class="admin-panel">
      <div class="admin-panel-header">
        <div>
          <h2>${escapeHtml(titulos[grupoId].titulo)}</h2>
          <p>${escapeHtml(titulos[grupoId].subtitulo)} Edite uma configuração por vez.</p>
        </div>

        ${grupoId === 'visual' ? '<button class="secondary-btn" type="button" onclick="restaurarCoresPadrao()">Restaurar cores padrão</button>' : ''}
      </div>

      ${state.admin.message ? `<p class="admin-message">${escapeHtml(state.admin.message)}</p>` : ''}
      ${state.admin.loading ? renderHubLoading('Carregando configurações...') : renderConfigAdmin(grupoId)}
    </section>
  `;
}

async function selecionarAbaAdmin(aba) {
  if (!podeAcessarAbaAdmin(aba)) {
    state.admin.message = 'Seu usuário não possui acesso a esta área.';
    renderAdministracao();
    return;
  }

  resetarFluxoModalUsuarioAdmin(false);
  state.admin.aba = aba;
  state.admin.message = '';

  if (aba === 'categorias' || aba === 'grupos') {
    await carregarRegistrosAdmin(aba);
    return;
  }

  if (aba === 'parceiros-indicacao') {
    await carregarParceirosIndicacaoAdmin();
    return;
  }

  if (aba === 'usuarios') {
    await carregarUsuariosAdmin();
    return;
  }

  if (aba === 'perfis') {
    await carregarPerfisAdmin();
    return;
  }

  renderAdministracao();
}

async function carregarLogsIntegracoesAdmin() {
  state.admin.logsIntegracoesLoading = true;
  state.admin.message = '';
  renderAdministracao();

  try {
    const response = await chamarApi('listAdminIntegrationLogs', {
      pagina: state.admin.logsIntegracoesPagina,
      limite: state.admin.logsIntegracoesLimite,
      filtros: state.admin.logsIntegracoesFiltros
    });
    if (!response.ok) throw new Error(obterMensagemApi(response, 'Não foi possível carregar os logs.'));
    state.admin.logsIntegracoes = response.data?.records || [];
    state.admin.logsIntegracoesTotal = Number(response.data?.total || 0);
  } catch (erro) {
    state.admin.logsIntegracoes = [];
    state.admin.message = erro.message || 'Erro ao carregar os logs de integrações.';
  } finally {
    state.admin.logsIntegracoesLoading = false;
    renderAdministracao();
  }
}

function alterarFiltroLogsIntegracoesAdmin(campo, valor) {
  state.admin.logsIntegracoesFiltros[campo] = valor;
  state.admin.logsIntegracoesPagina = 1;
  carregarLogsIntegracoesAdmin();
}

function limparFiltrosLogsIntegracoesAdmin() {
  state.admin.logsIntegracoesFiltros = { sistema: '', nivel: '', status: '' };
  state.admin.logsIntegracoesPagina = 1;
  carregarLogsIntegracoesAdmin();
}

function selecionarPaginaLogsIntegracoesAdmin(delta) {
  const totalPaginas = Math.max(Math.ceil(state.admin.logsIntegracoesTotal / state.admin.logsIntegracoesLimite), 1);
  const proxima = Math.min(Math.max(state.admin.logsIntegracoesPagina + Number(delta || 0), 1), totalPaginas);
  if (proxima === state.admin.logsIntegracoesPagina) return;
  state.admin.logsIntegracoesPagina = proxima;
  carregarLogsIntegracoesAdmin();
}

function abrirDetalheLogIntegracaoAdmin(id) {
  state.admin.logsIntegracoesDetalhe = state.admin.logsIntegracoes.find(log => log.id === id) || null;
  renderAdministracao();
}

function fecharDetalheLogIntegracaoAdmin() {
  state.admin.logsIntegracoesDetalhe = null;
  renderAdministracao();
}

function renderLogsAdminSubmoduleTabs(abaAtual) {
  return `
    <div class="module-tabs admin-logs-submodule-tabs" role="tablist" aria-label="Logs e auditoria">
      <button class="${abaAtual === 'logs-integracoes' ? 'active' : ''}" type="button" role="tab" aria-selected="${abaAtual === 'logs-integracoes'}" onclick="selecionarAbaAdmin('logs-integracoes')">Logs</button>
      <button class="${abaAtual === 'auditoria' ? 'active' : ''}" type="button" role="tab" aria-selected="${abaAtual === 'auditoria'}" onclick="selecionarAbaAdmin('auditoria')">Auditoria</button>
    </div>
  `;
}

function renderDropdownFiltroLogsAdmin(campo, rotulo, opcoes, valorAtual) {
  const id = `admin-log-filter-${campo}`;
  const opcaoAtual = opcoes.find(opcao => opcao.value === valorAtual) || opcoes[0];
  return `
    <div class="admin-logs-filter-field">
      <span>${escapeHtml(rotulo)}</span>
      <div class="hub-filter-combobox">
        <button id="${id}" class="config-input hub-filter-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-menu" data-filter-field="${escapeAttr(campo)}" onclick="abrirDropdownLogsAdmin(this, event)" onkeydown="navegarDropdownLogsAdmin(this, event)">
          <span>${escapeHtml(opcaoAtual.label)}</span><span class="hub-filter-chevron" aria-hidden="true">⌄</span>
        </button>
        <div id="${id}-menu" class="hub-filter-dropdown-menu" role="listbox" aria-label="${escapeAttr(rotulo)}" data-trigger-id="${id}" hidden>
          ${opcoes.map(opcao => `<button class="hub-filter-dropdown-option ${opcao.value === valorAtual ? 'is-selected' : ''}" type="button" role="option" aria-selected="${opcao.value === valorAtual ? 'true' : 'false'}" data-value="${escapeAttr(opcao.value)}" data-label="${escapeAttr(opcao.label)}" onclick="selecionarDropdownLogsAdmin(this)" onkeydown="navegarDropdownLogsAdmin(this, event)">${escapeHtml(opcao.label)}</button>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function posicionarDropdownLogsAdmin(trigger, menu) {
  const rect = trigger.getBoundingClientRect();
  const margem = 8;
  const alturaMaxima = Math.min(280, window.innerHeight - (margem * 2));
  const largura = Math.min(rect.width, window.innerWidth - (margem * 2));
  const esquerda = Math.min(Math.max(margem, rect.left), Math.max(margem, window.innerWidth - largura - margem));
  menu.hidden = false;
  menu.style.left = `${esquerda}px`;
  menu.style.width = `${largura}px`;
  menu.style.maxHeight = `${alturaMaxima}px`;
  const altura = Math.min(menu.scrollHeight, alturaMaxima);
  const abaixo = window.innerHeight - rect.bottom - margem;
  menu.style.top = `${abaixo >= altura ? rect.bottom + 4 : Math.max(margem, rect.top - altura - 4)}px`;
}

function abrirDropdownLogsAdmin(trigger, event) {
  event?.stopPropagation();
  fecharDropdownLogsAdmin();
  const menu = document.getElementById(trigger?.getAttribute('aria-controls') || '');
  if (!menu) return;
  if (menu.parentElement !== document.body) document.body.appendChild(menu);
  trigger.setAttribute('aria-expanded', 'true');
  posicionarDropdownLogsAdmin(trigger, menu);
  menu.querySelector('.hub-filter-dropdown-option.is-selected')?.focus();
}

function navegarDropdownLogsAdmin(elemento, event) {
  const tecla = event?.key;
  const menuId = elemento?.getAttribute('aria-controls') || elemento?.closest('.hub-filter-dropdown-menu')?.id;
  const menu = document.getElementById(menuId || '');
  if (!menu) return;

  if (tecla === 'Escape') {
    event.preventDefault();
    const trigger = document.getElementById(menu.dataset.triggerId || menuId.replace(/-menu$/, ''));
    fecharDropdownLogsAdmin();
    trigger?.focus();
    return;
  }

  const opcoes = Array.from(menu.querySelectorAll('.hub-filter-dropdown-option:not([hidden])'));
  if (!opcoes.length) return;

  if (elemento.classList.contains('hub-filter-trigger') && (tecla === 'ArrowDown' || tecla === 'ArrowUp')) {
    event.preventDefault();
    abrirDropdownLogsAdmin(elemento, event);
    opcoes[tecla === 'ArrowDown' ? 0 : opcoes.length - 1]?.focus();
    return;
  }

  if (!elemento.classList.contains('hub-filter-dropdown-option')) return;
  if (tecla === 'ArrowDown' || tecla === 'ArrowUp' || tecla === 'Home' || tecla === 'End') {
    event.preventDefault();
    const atual = opcoes.indexOf(elemento);
    const proximo = tecla === 'Home'
      ? 0
      : tecla === 'End'
        ? opcoes.length - 1
        : (atual + (tecla === 'ArrowDown' ? 1 : -1) + opcoes.length) % opcoes.length;
    opcoes[proximo]?.focus();
  }
}

function reposicionarDropdownsLogsAdmin() {
  document.querySelectorAll('.hub-filter-dropdown-menu:not([hidden])').forEach(menu => {
    const trigger = document.getElementById(menu.dataset.triggerId || '');
    if (trigger) posicionarDropdownLogsAdmin(trigger, menu);
  });
}

function selecionarDropdownLogsAdmin(opcao) {
  const menu = opcao?.closest('.hub-filter-dropdown-menu');
  const trigger = document.getElementById(menu?.dataset.triggerId || '');
  if (!menu || !trigger) return;
  const campo = trigger.dataset.filterField;
  const valor = opcao.dataset.value || '';
  trigger.querySelector('span').textContent = opcao.dataset.label || '';
  menu.querySelectorAll('.hub-filter-dropdown-option').forEach(item => {
    const selecionado = item === opcao;
    item.classList.toggle('is-selected', selecionado);
    item.setAttribute('aria-selected', selecionado ? 'true' : 'false');
  });
  fecharDropdownLogsAdmin();
  alterarFiltroLogsIntegracoesAdmin(campo, valor);
}

function fecharDropdownLogsAdmin(event) {
  if (event?.target?.closest?.('.hub-filter-combobox')) return;
  document.querySelectorAll('.hub-filter-dropdown-menu').forEach(menu => {
    menu.hidden = true;
    const trigger = document.getElementById(menu.dataset.triggerId || '');
    trigger?.setAttribute('aria-expanded', 'false');
    const combo = trigger?.closest('.hub-filter-combobox');
    if (combo && menu.parentElement === document.body) combo.appendChild(menu);
  });
}

function renderLogsIntegracoesAdmin() {
  const logs = state.admin.logsIntegracoes || [];
  const filtros = state.admin.logsIntegracoesFiltros;
  const possuiFiltros = Boolean(filtros.sistema || filtros.nivel || filtros.status);
  const totalPaginas = Math.max(Math.ceil(state.admin.logsIntegracoesTotal / state.admin.logsIntegracoesLimite), 1);
  return `
    <section class="admin-panel">
      <div class="admin-panel-header">
        <div>
          <h2>Logs de Integrações</h2>
          <p>Execuções, webhooks, sincronizações e falhas operacionais das integrações do Hub.</p>
          ${renderLogsAdminSubmoduleTabs('logs-integracoes')}
        </div>
        <button class="secondary-btn" type="button" onclick="carregarLogsIntegracoesAdmin()" ${state.admin.logsIntegracoesLoading ? 'disabled' : ''}>Atualizar</button>
      </div>
      <div class="action-toolbar admin-logs-toolbar" role="group" aria-label="Filtros dos logs">
        ${renderDropdownFiltroLogsAdmin('sistema', 'Sistema', [
          { value: '', label: 'Todos os sistemas' },
          { value: 'clickup', label: 'ClickUp' },
          { value: 'hub', label: 'Hub' },
          { value: 'google_drive', label: 'Google Drive' }
        ], filtros.sistema)}
        ${renderDropdownFiltroLogsAdmin('nivel', 'Nível', [
          { value: '', label: 'Todos os níveis' },
          { value: 'info', label: 'Info' },
          { value: 'warning', label: 'Atenção' },
          { value: 'error', label: 'Erro' }
        ], filtros.nivel)}
        ${renderDropdownFiltroLogsAdmin('status', 'Status', [
          { value: '', label: 'Todos os status' },
          { value: 'started', label: 'Iniciado' },
          { value: 'success', label: 'Sucesso' },
          { value: 'retrying', label: 'Reprocessando' },
          { value: 'failed', label: 'Falha' }
        ], filtros.status)}
        ${possuiFiltros ? '<button class="secondary-btn admin-logs-clear-btn" type="button" onclick="limparFiltrosLogsIntegracoesAdmin()">Limpar filtros</button>' : ''}
      </div>
      ${state.admin.message ? `<p class="admin-message">${escapeHtml(state.admin.message)}</p>` : ''}
      ${state.admin.logsIntegracoesLoading ? renderHubLoading('Carregando logs...') : logs.length ? `
        <div class="admin-table-wrap">
          <table class="admin-table admin-logs-table">
            <thead><tr><th>Data / contexto</th><th>Evento</th><th>Resultado</th><th>Mensagem</th><th>Ações</th></tr></thead>
            <tbody>${logs.map(log => `
              <tr class="admin-log-row ${['failed', 'error'].includes(String(log.status || log.nivel || '').toLowerCase()) ? 'is-error' : ''}">
                <td class="admin-log-context-cell">
                  <strong>${escapeHtml(formatarDataHoraCrmAr(log.created_at) || '—')}</strong>
                  <small>${escapeHtml(log.sistema || '—')} · ${Number.isFinite(Number(log.duracao_ms)) ? `${escapeHtml(String(log.duracao_ms))} ms` : 'duração —'} · tentativa ${escapeHtml(String(log.tentativa || 1))}</small>
                </td>
                <td class="admin-log-event-cell">
                  <strong>${escapeHtml(log.evento || log.tipo || '—')}</strong>
                  ${log.tipo && log.tipo !== log.evento ? `<small>${escapeHtml(log.tipo)}</small>` : ''}
                </td>
                <td class="admin-log-result-cell">
                  <span class="badge integration-log-badge integration-log-status-${escapeAttr(log.status || 'unknown')}">${escapeHtml(log.status || '—')}</span>
                  <small class="admin-log-level-text">${escapeHtml(log.nivel || 'info')}</small>
                </td>
                <td class="admin-log-message-cell" title="${escapeAttr(log.mensagem || '—')}">${escapeHtml(log.mensagem || '—')}</td>
                <td><button class="secondary-btn admin-log-detail-btn" type="button" onclick="abrirDetalheLogIntegracaoAdmin('${escapeAttr(log.id)}')">Detalhes</button></td>
              </tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="admin-logs-pagination">
          <span>${state.admin.logsIntegracoesTotal} registro(s) · página ${state.admin.logsIntegracoesPagina} de ${totalPaginas}</span>
          <div class="action-toolbar">
            <button class="secondary-btn" type="button" onclick="selecionarPaginaLogsIntegracoesAdmin(-1)" ${state.admin.logsIntegracoesPagina <= 1 ? 'disabled' : ''}>Anterior</button>
            <button class="secondary-btn" type="button" onclick="selecionarPaginaLogsIntegracoesAdmin(1)" ${state.admin.logsIntegracoesPagina >= totalPaginas ? 'disabled' : ''}>Próxima</button>
          </div>
        </div>` : '<p class="quick-link-empty">Nenhum log de integração registrado.</p>'}
      ${renderDetalheLogIntegracaoAdmin()}
    </section>
  `;
}

function renderDetalheLogIntegracaoAdmin() {
  const log = state.admin.logsIntegracoesDetalhe;
  if (!log) return '';
  return `
    <div class="modal-backdrop" role="presentation" onclick="fecharDetalheLogIntegracaoAdmin()">
      <section class="small-modal admin-log-detail-modal" role="dialog" aria-modal="true" aria-labelledby="admin-log-detail-title" onclick="event.stopPropagation()">
        <div class="small-modal-header">
          <div><h3 id="admin-log-detail-title">Detalhes do log</h3><p>${escapeHtml(log.evento || log.tipo || 'Evento')}</p></div>
          <button class="icon-btn" type="button" onclick="fecharDetalheLogIntegracaoAdmin()" aria-label="Fechar" title="Fechar">×</button>
        </div>
        <dl class="admin-log-detail-grid">
          <div><dt>Sistema</dt><dd>${escapeHtml(log.sistema || '—')}</dd></div>
          <div><dt>Status</dt><dd>${escapeHtml(log.status || '—')}</dd></div>
          <div><dt>Correlation ID</dt><dd>${escapeHtml(log.correlation_id || '—')}</dd></div>
          <div><dt>External ID</dt><dd>${escapeHtml(log.external_id || '—')}</dd></div>
          <div><dt>Tentativa</dt><dd>${escapeHtml(String(log.tentativa || 1))}</dd></div>
          <div><dt>Duração</dt><dd>${Number.isFinite(Number(log.duracao_ms)) ? `${escapeHtml(String(log.duracao_ms))} ms` : '—'}</dd></div>
        </dl>
        <div class="admin-log-detail-message"><strong>Mensagem</strong><p>${escapeHtml(log.mensagem || '—')}</p></div>
        <pre class="admin-log-json">${escapeHtml(JSON.stringify(log.detalhes || {}, null, 2))}</pre>
      </section>
    </div>
  `;
}

function renderAuditoriaAdminFutura() {
  return `
    <section class="admin-panel">
      <div class="admin-panel-header">
        <div>
          <h2>Auditoria</h2>
          <p>Registro de ações administrativas e alterações sensíveis realizadas por usuários.</p>
          ${renderLogsAdminSubmoduleTabs('auditoria')}
        </div>
      </div>
      <div class="admin-future-state">
        <span class="badge">Em breve</span>
        <h3>Auditoria administrativa</h3>
        <p>Esta tela será construída separadamente dos logs operacionais de integrações.</p>
      </div>
    </section>
  `;
}

function renderConfigAdmin(grupoAtivo) {
  if (!state.admin.config.length) {
    return '<p class="quick-link-empty">Nenhuma configuração encontrada.</p>';
  }

  const grupos = agruparConfiguracoes(state.admin.config).filter(grupo => !grupoAtivo || grupo.id === grupoAtivo);

  return `
    <div class="config-groups">
      ${grupos.map(grupo => `
        <section class="config-group">
          <div class="config-group-header">
            <h3>${escapeHtml(grupo.titulo)}</h3>
          </div>
          <div class="config-list">
            ${grupo.itens.map(item => renderConfigItem(item)).join('')}
          </div>
        </section>
      `).join('')}
    </div>
  `;
}

function renderConfigItem(item) {
  const inputId = `config_${escapeAttr(item.chave)}`;
  const disabled = item.editavel === false ? 'disabled' : '';
  const input = renderConfigInput(item, inputId, disabled);

  return `
    <article class="config-row">
      <div class="config-info">
        <strong>${escapeHtml(obterRotuloConfig(item.chave))}</strong>
        <span>${escapeHtml(item.descricao || '')}</span>
      </div>

      <div class="config-control">
        ${input}
        <button class="save-btn" type="button" onclick="salvarConfigAdmin('${escapeAttr(item.chave)}')" ${disabled}>Salvar</button>
      </div>
    </article>
  `;
}

function agruparConfiguracoes(configs) {
  const definicoes = [
    {
      id: 'identidade',
      titulo: 'Identidade',
      chaves: ['nome_sistema', 'subtitulo_sistema']
    },
    {
      id: 'visual',
      titulo: 'Aparência',
      chaves: ['cor_principal', 'cor_secundaria', 'cor_destaque', 'modo_visual_padrao']
    },
    {
      id: 'logo',
      titulo: 'Logo e Marca',
      chaves: ['exibir_logo', 'logo_file_id', 'logo_url', 'drive_folder_name', 'drive_folder_id']
    },
    {
      id: 'limites',
      titulo: 'Limites do Painel',
      chaves: ['limite_favoritos', 'limite_avisos', 'janela_aniversarios_dias', 'limite_aniversariantes', 'retencao_historico_meses']
    },
    {
      id: 'painel_ar',
      titulo: 'Painel AR',
      chaves: ['ar_produtos_spreadsheet_id', 'ar_produtos_sheet_name', 'ar_url_base_padrao', 'ar_link_com_desconto_template', 'ar_link_sem_desconto_template', 'ar_link_templates_json']
    }
  ];
  const porChave = configs.reduce((acc, item) => {
    acc[item.chave] = item;
    return acc;
  }, {});

  return definicoes.map(grupo => ({
    ...grupo,
    itens: grupo.chaves.map(chave => porChave[chave]).filter(Boolean)
  })).filter(grupo => grupo.itens.length);
}

function renderHomeExibicaoAdmin() {
  const cards = state.cards || [];

  return `
    <section class="admin-panel">
      <div class="admin-panel-header">
        <div>
          <h2>Home e Exibição</h2>
          <p>Visão preparada para futuras regras de organização da Home. Os controles atuais continuam em Limites do Painel.</p>
        </div>
      </div>

      ${state.admin.message ? `<p class="admin-message">${escapeHtml(state.admin.message)}</p>` : ''}

      <div class="admin-preview-grid">
        ${renderAdminPreviewCard('Módulos visíveis hoje', `${cards.length} cards`, 'A lista atual vem do backend conforme o perfil do usuário.')}
        ${renderAdminPreviewCard('Links rápidos', `${state.config?.limite_favoritos || 5} favoritos`, 'Limite funcional configurável em Limites do Painel.')}
        ${renderAdminPreviewCard('Avisos internos', `${state.config?.limite_avisos || 3} avisos`, 'Limite funcional configurável em Limites do Painel.')}
        ${renderAdminPreviewCard('Aniversariantes', `${state.config?.limite_aniversariantes || 25} registros`, 'Limite funcional configurável em Limites do Painel.')}
      </div>

      <div class="admin-prepared-box">
        <strong>Preparado para evolução</strong>
        <p>Esta área pode receber, em fase futura, ordenação de cards, visibilidade por perfil e preferências de exibição. Ainda não há backend para salvar essas regras.</p>
      </div>
    </section>
  `;
}

function renderModulosAdmin() {
  return `
    <section class="admin-panel">
      <div class="admin-panel-header">
        <div>
          <h2>Configurações por Módulo</h2>
          <p>Organização visual para módulos reais. Apenas as configurações já existentes são editáveis.</p>
        </div>
      </div>

      ${state.admin.message ? `<p class="admin-message">${escapeHtml(state.admin.message)}</p>` : ''}

      <div class="admin-module-summary">
        ${renderAdminModuleCard('Links Úteis', 'Disponível na Home conforme perfil.', 'Atual')}
        ${renderAdminModuleCard('Central de Senhas', 'Fluxo preservado; sem novas configurações nesta fase.', 'Atual')}
        ${renderAdminModuleCard('Painel AR', 'Configurações técnicas existentes abaixo.', 'Atual')}
        ${renderAdminModuleCard('Administração', 'Disponível apenas para gestor.', 'Atual')}
      </div>

      ${state.admin.loading ? renderHubLoading('Carregando configurações...') : renderConfigAdmin('painel_ar')}
    </section>
  `;
}

function renderAdminPreviewCard(titulo, valor, descricao) {
  return `
    <article class="admin-preview-card">
      <span>${escapeHtml(titulo)}</span>
      <strong>${escapeHtml(valor)}</strong>
      <p>${escapeHtml(descricao)}</p>
    </article>
  `;
}

function renderAdminModuleCard(titulo, descricao, status) {
  return `
    <article class="admin-module-card">
      <div>
        <strong>${escapeHtml(titulo)}</strong>
        <p>${escapeHtml(descricao)}</p>
      </div>
      <span>${escapeHtml(obterRotuloStatusHub(status))}</span>
    </article>
  `;
}

function renderModulosAdminReal() {
  const modules = state.admin.modulos || [];
  const resumo = obterResumoRegistros(modules);

  return `
    <section class="admin-panel">
      <div class="admin-panel-header">
        <div>
          <h2>Configurações por Módulo</h2>
          <p>Ative ou inative os módulos exibidos na Home. O ID funcional vem do slug salvo no Supabase.</p>
        </div>
      </div>

      ${state.admin.message ? `<p class="admin-message">${escapeHtml(state.admin.message)}</p>` : ''}
      <p class="quick-link-empty">${resumo.total} módulos · ${resumo.ativos} ativos · ${resumo.inativos} inativos</p>

      <div class="crud-filters" role="group" aria-label="Filtro de status dos módulos">
        ${renderFiltroModuloAdmin('todos', 'Todos')}
        ${renderFiltroModuloAdmin('ativo', 'Ativos')}
        ${renderFiltroModuloAdmin('inativo', 'Inativos')}
      </div>

      ${state.admin.loading ? renderHubLoading('Carregando módulos...') : renderListaModulosAdmin(modules)}
    </section>
  `;
}

function renderFiltroModuloAdmin(filtro, label) {
  const ativo = state.admin.filtros.modulos === filtro;

  return `
    <button class="filter-btn ${ativo ? 'active' : ''}" type="button" onclick="filtrarAdmin('modulos', '${filtro}')">
      ${escapeHtml(label)}
    </button>
  `;
}

function renderListaModulosAdmin(modules) {
  const filtrados = filtrarRegistrosAdmin('modulos', modules);

  if (!filtrados.length) {
    return '<p class="quick-link-empty">Nenhum módulo encontrado.</p>';
  }

  return `
    <div class="crud-list admin-modules-list">
      <div class="crud-header">
        <span>Módulo</span>
        <span>Descrição</span>
        <span>Status</span>
        <span>Ação</span>
      </div>
      ${filtrados.map(item => renderModuloAdmin(item)).join('')}
    </div>
  `;
}

function renderModuloAdmin(item) {
  const atualizando = state.admin.moduloAtualizando === item.id;
  const status = item.status === 'inativo' ? 'inativo' : 'ativo';
  const acao = status === 'ativo' ? 'Inativar' : 'Reativar';
  const proximoStatus = status === 'ativo' ? 'inativo' : 'ativo';
  const descricao = item.descricao || `Slug: ${item.slug}`;
  const botaoDesabilitado = atualizando || !item.bloqueavel;
  const rotuloBotao = !item.bloqueavel ? 'Protegido' : (atualizando ? 'Salvando...' : acao);

  return `
    <article class="crud-row">
      <input class="config-input" type="text" value="${escapeAttr(item.nome || item.slug || '')}" disabled>
      <input class="config-input" type="text" value="${escapeAttr(descricao)}" disabled>
      <select class="config-input status-${escapeAttr(status)}" disabled>
        <option value="ativo" ${status === 'ativo' ? 'selected' : ''}>ativo</option>
        <option value="inativo" ${status === 'inativo' ? 'selected' : ''}>inativo</option>
      </select>
      <div class="crud-actions">
        <button class="${status === 'ativo' ? 'secondary-btn' : 'save-btn'}" type="button" onclick="alternarStatusModuloAdmin('${escapeAttr(item.id)}', '${proximoStatus}')" ${botaoDesabilitado ? 'disabled' : ''}>${escapeHtml(rotuloBotao)}</button>
      </div>
    </article>
  `;
}

function renderAdminPreparado(titulo, descricao, itens) {
  return `
    <section class="admin-panel">
      <div class="admin-panel-header">
        <div>
          <h2>${escapeHtml(titulo)}</h2>
          <p>${escapeHtml(descricao)}</p>
        </div>
      </div>

      <div class="admin-prepared-box">
        <strong>Área visual preparada</strong>
        <p>Esta seção foi incluída para validar a navegação futura sem criar botões ou salvamentos que ainda não existem no backend.</p>
      </div>

      <div class="admin-prepared-list">
        ${itens.map(item => `<article>${escapeHtml(item)}</article>`).join('')}
      </div>
    </section>
  `;
}

function renderParceirosIndicacaoAdmin() {
  if (state.admin.parceiroModal?.aberto) {
    return renderModalParceiroIndicacaoAdmin();
  }

  const records = state.admin.parceirosIndicacao || [];
  garantirColunasParceirosIndicacaoAdmin();
  const podeCriar = pode('admin.parceiros_indicacao', 'create');
  const filtrados = obterParceirosIndicacaoFiltradosAdmin(records);
  const limite = Math.max(1, Number(state.admin.limiteParceirosIndicacao) || 15);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / limite));
  const paginaAtual = Math.min(Math.max(1, Number(state.admin.paginaParceirosIndicacao) || 1), totalPaginas);
  const inicio = (paginaAtual - 1) * limite;
  const recordsPagina = filtrados.slice(inicio, inicio + limite);
  const resumo = records.reduce((acc, parceiro) => {
    const status = parceiro.status === 'inativo' || parceiro.status === 'arquivado' ? parceiro.status : 'ativo';
    acc.total += 1;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, { total: 0, ativo: 0, inativo: 0, arquivado: 0 });

  state.admin.paginaParceirosIndicacao = paginaAtual;

  return `
    <section class="admin-panel">
      <div class="admin-panel-header admin-partners-panel-header">
        <div class="admin-users-header-row">
          <div>
            <h2>Parceiros de Indicação</h2>
            <p>Base central dos parceiros usados no Painel AR. ${resumo.total} registros · ${resumo.ativo || 0} ativos · ${(resumo.inativo || 0) + (resumo.arquivado || 0)} inativos/arquivados.</p>
          </div>
        </div>

        <div class="admin-partners-controls-row">
          <div class="crud-filters admin-user-filters admin-partners-status-filters" role="group" aria-label="Filtro de status dos parceiros">
            ${renderFiltroParceirosIndicacaoAdmin('todos', 'Todos', resumo.total)}
            ${renderFiltroParceirosIndicacaoAdmin('ativo', 'Ativos', resumo.ativo || 0)}
            ${renderFiltroParceirosIndicacaoAdmin('inativos_arquivados', 'Inativos/Arquivados', (resumo.inativo || 0) + (resumo.arquivado || 0))}
          </div>

          <div class="action-toolbar admin-users-toolbar admin-partners-main-actions">
            ${podeCriar ? '<button class="add-small-btn action-toolbar-btn admin-users-add-btn" type="button" onclick="abrirModalParceiroIndicacaoAdmin()">+ Incluir</button>' : ''}
            <label class="action-toolbar-field admin-users-search" for="admin_parceiro_indicacao_busca" aria-label="Filtrar parceiros">
              <input
                id="admin_parceiro_indicacao_busca"
                class="config-input action-toolbar-input admin-users-search-input"
                type="search"
                value="${escapeAttr(state.admin.buscaParceirosIndicacaoDigitada || '')}"
                placeholder="Filtrar parceiros"
                oninput="alterarBuscaParceirosIndicacaoAdmin(this.value)"
                onkeydown="if (event.key === 'Enter') aplicarBuscaParceirosIndicacaoAdmin()"
                onblur="aplicarBuscaParceirosIndicacaoAdmin()"
              >
            </label>
            <button
              class="secondary-btn action-toolbar-btn admin-partners-actions-btn hub-quick-actions-trigger"
              type="button"
              onclick="alternarMenuAcoesParceirosIndicacaoAdmin()"
              onkeydown="navegarMenuAcoesParceirosIndicacaoAdmin(event)"
              aria-haspopup="menu"
              aria-expanded="${state.admin.acoesParceirosAberto ? 'true' : 'false'}"
            >⋮</button>
            ${renderMenuAcoesParceirosIndicacaoAdmin()}
          </div>
        </div>
      </div>

      ${state.admin.seletorColunasParceirosAberto ? renderSeletorColunasParceirosIndicacaoAdmin() : ''}
      ${state.admin.message ? `<p class="admin-message">${escapeHtml(state.admin.message)}</p>` : ''}
      ${renderBarraLoteParceirosIndicacaoAdmin()}
      ${state.admin.loading ? renderHubLoading('Carregando parceiros...') : renderListaParceirosIndicacaoAdmin(recordsPagina)}
      ${state.admin.loading ? '' : renderPaginacaoParceirosIndicacaoAdmin(totalPaginas, paginaAtual)}
      ${renderModalParceiroIndicacaoAdmin()}
    </section>
  `;
}

function garantirColunasParceirosIndicacaoAdmin() {
  const validas = new Set(ADMIN_PARTNER_COLUMNS.map(coluna => coluna.id));
  const atuais = Array.isArray(state.admin.colunasParceirosIndicacao)
    ? state.admin.colunasParceirosIndicacao.filter(id => validas.has(id))
    : [];

  if (atuais.length) {
    state.admin.colunasParceirosIndicacao = garantirColunasObrigatoriasParceirosIndicacao(atuais);
    return;
  }

  try {
    const salvo = window.localStorage?.getItem(ADMIN_PARTNER_COLUMNS_STORAGE_KEY);
    const parseado = salvo ? JSON.parse(salvo) : null;
    const colunasSalvas = Array.isArray(parseado) ? parseado.filter(id => validas.has(id)) : [];
    state.admin.colunasParceirosIndicacao = garantirColunasObrigatoriasParceirosIndicacao(
      colunasSalvas.length ? colunasSalvas : ADMIN_PARTNER_DEFAULT_VISIBLE_COLUMNS
    );
  } catch (_erro) {
    state.admin.colunasParceirosIndicacao = [...ADMIN_PARTNER_DEFAULT_VISIBLE_COLUMNS];
  }
}

function garantirColunasObrigatoriasParceirosIndicacao(colunas = []) {
  const validas = new Set(ADMIN_PARTNER_COLUMNS.map(coluna => coluna.id));
  const obrigatorias = ADMIN_PARTNER_COLUMNS.filter(coluna => coluna.locked).map(coluna => coluna.id);
  const ordenadas = [];

  [...obrigatorias, ...colunas].forEach(colunaId => {
    if (validas.has(colunaId) && !ordenadas.includes(colunaId)) {
      ordenadas.push(colunaId);
    }
  });

  return ordenadas;
}

function obterColunasVisiveisParceirosIndicacaoAdmin() {
  garantirColunasParceirosIndicacaoAdmin();
  const porId = new Map(ADMIN_PARTNER_COLUMNS.map(coluna => [coluna.id, coluna]));
  return (state.admin.colunasParceirosIndicacao || [])
    .map(colunaId => porId.get(colunaId))
    .filter(Boolean);
}

function salvarColunasParceirosIndicacaoAdmin() {
  try {
    window.localStorage?.setItem(
      ADMIN_PARTNER_COLUMNS_STORAGE_KEY,
      JSON.stringify(state.admin.colunasParceirosIndicacao || ADMIN_PARTNER_DEFAULT_VISIBLE_COLUMNS)
    );
  } catch (_erro) {
    // Preferência visual não deve bloquear a tela.
  }
}

function renderSeletorColunasParceirosIndicacaoAdmin() {
  const rascunho = garantirColunasObrigatoriasParceirosIndicacao(
    state.admin.colunasParceirosIndicacaoRascunho?.length
      ? state.admin.colunasParceirosIndicacaoRascunho
      : state.admin.colunasParceirosIndicacao
  );
  const visiveis = new Set(rascunho);
  const ordenadas = [
    ...rascunho.map(colunaId => ADMIN_PARTNER_COLUMNS.find(coluna => coluna.id === colunaId)).filter(Boolean),
    ...ADMIN_PARTNER_COLUMNS.filter(coluna => !visiveis.has(coluna.id))
  ];

  return `
    <section class="admin-partners-column-picker" aria-label="Selecionar colunas da tabela de parceiros">
      <div>
        <strong>Editar colunas</strong>
        <p>Escolha os campos visíveis e ajuste a ordem. Salve para aplicar ou cancele para descartar.</p>
      </div>
      <div class="admin-partners-column-options">
        ${ordenadas.map((coluna, index) => `
          <div class="admin-partners-column-option ${coluna.locked ? 'is-locked' : ''}">
            <label>
              <input
                type="checkbox"
                ${visiveis.has(coluna.id) ? 'checked' : ''}
                ${coluna.locked ? 'disabled' : ''}
                onchange="alternarColunaParceirosIndicacaoAdmin('${escapeAttr(coluna.id)}', this.checked)"
              >
              <span>${escapeHtml(coluna.label)}</span>
            </label>
            <div class="admin-partners-column-order">
              <button class="secondary-btn" type="button" onclick="moverColunaParceirosIndicacaoAdmin('${escapeAttr(coluna.id)}', -1)" ${index === 0 ? 'disabled' : ''} aria-label="Mover ${escapeAttr(coluna.label)} para cima">↑</button>
              <button class="secondary-btn" type="button" onclick="moverColunaParceirosIndicacaoAdmin('${escapeAttr(coluna.id)}', 1)" ${index === ordenadas.length - 1 ? 'disabled' : ''} aria-label="Mover ${escapeAttr(coluna.label)} para baixo">↓</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="admin-partners-column-actions">
        <button class="secondary-btn" type="button" onclick="restaurarColunasParceirosIndicacaoAdmin()">Restaurar padrão</button>
        <button class="secondary-btn" type="button" onclick="cancelarColunasParceirosIndicacaoAdmin()">Cancelar</button>
        <button class="save-btn" type="button" onclick="salvarRascunhoColunasParceirosIndicacaoAdmin()">Salvar colunas</button>
      </div>
    </section>
  `;
}

function renderFiltroParceirosIndicacaoAdmin(filtro, label, total) {
  const ativo = state.admin.filtros.parceirosIndicacao === filtro;
  const classes = [
    'filter-btn',
    filtro === 'ativo' ? 'filter-status-ativo' : '',
    filtro === 'inativos_arquivados' ? 'filter-status-bloqueados-inativos' : '',
    ativo ? 'active' : ''
  ].filter(Boolean).join(' ');

  return `
    <button class="${classes}" type="button" onclick="selecionarFiltroParceirosIndicacaoAdmin('${filtro}')" aria-pressed="${ativo ? 'true' : 'false'}">
      ${escapeHtml(label)} <span>${escapeHtml(String(total))}</span>
    </button>
  `;
}

function renderListaParceirosIndicacaoAdmin(records) {
  if (!records.length) {
    return '<p class="quick-link-empty">Nenhum parceiro encontrado.</p>';
  }

  const colunas = obterColunasVisiveisParceirosIndicacaoAdmin();
  const modoLote = Boolean(state.admin.loteParceirosModo);
  const style = obterGridTemplateColunasParceirosIndicacaoAdmin(colunas, { selecao: modoLote });
  const idsVisiveis = records.map(parceiro => parceiro.id).filter(Boolean);
  const selecionados = new Set(state.admin.loteParceirosSelecionados || []);
  const todosVisiveisSelecionados = idsVisiveis.length > 0 && idsVisiveis.every(id => selecionados.has(id));

  return `
    <div class="crud-list admin-partners-list" role="table" aria-label="Parceiros de indicação">
      <div class="crud-header" role="row" style="${escapeAttr(style)}">
        ${modoLote ? `
          <label class="admin-partner-select-cell" role="columnheader" aria-label="Selecionar todos os parceiros visíveis">
            <input
              type="checkbox"
              ${todosVisiveisSelecionados ? 'checked' : ''}
              onchange="alternarTodosParceirosIndicacaoAdmin(this.checked)"
            >
          </label>
        ` : ''}
        ${colunas.map(coluna => `<span role="columnheader">${escapeHtml(coluna.label)}</span>`).join('')}
      </div>
      ${records.map(parceiro => renderParceiroIndicacaoAdmin(parceiro, colunas, style, { selecao: modoLote })).join('')}
    </div>
  `;
}

function obterGridTemplateColunasParceirosIndicacaoAdmin(colunas, { selecao = false } = {}) {
  const template = colunas
    .map(coluna => `minmax(${coluna.min}, ${coluna.size})`)
    .join(' ');
  const minWidth = colunas.reduce((total, coluna) => total + (parseInt(coluna.min, 10) || 120), 0);
  const colunaSelecao = selecao ? '44px ' : '';
  const larguraSelecao = selecao ? 44 : 0;

  return `grid-template-columns: ${colunaSelecao}${template}; min-width: ${Math.max(minWidth + larguraSelecao + 48, 520)}px;`;
}

function renderParceiroIndicacaoAdmin(parceiro, colunas = obterColunasVisiveisParceirosIndicacaoAdmin(), style = obterGridTemplateColunasParceirosIndicacaoAdmin(colunas), { selecao = false } = {}) {
  const nome = parceiro.nome_completo || parceiro.nome || 'Sem nome';
  const empresa = parceiro.nome_empresa || parceiro.vinculo_empresa || '';
  const contato = parceiro.whatsapp_comercial || parceiro.telefone || parceiro.email_cadastro_certificado || parceiro.email || '-';
  const status = parceiro.status || 'ativo';
  const remunerado = parceiro.remunerado === true ? ' · Remunerado' : '';
  const selecionado = (state.admin.loteParceirosSelecionados || []).includes(parceiro.id);

  return `
    <div class="crud-row admin-partner-row" role="row" style="${escapeAttr(style)}">
      ${selecao ? `
        <label class="admin-partner-select-cell" role="cell" aria-label="Selecionar ${escapeAttr(nome)}">
          <input
            type="checkbox"
            ${selecionado ? 'checked' : ''}
            onchange="alternarParceiroIndicacaoSelecionadoAdmin('${escapeAttr(parceiro.id || '')}', this.checked)"
          >
        </label>
      ` : ''}
      ${colunas.map(coluna => renderCelulaParceiroIndicacaoAdmin(coluna.id, parceiro, { nome, empresa, contato, status, remunerado })).join('')}
    </div>
  `;
}

function renderCelulaParceiroIndicacaoAdmin(colunaId, parceiro, contexto) {
  const { nome, empresa, contato, status, remunerado } = contexto;
  const podeEditar = pode('admin.parceiros_indicacao', 'update')
    && (status !== 'arquivado' || pode('admin.parceiros_indicacao', 'archive'));

  if (colunaId === 'acoes') {
    return `
      <div class="admin-partner-cell crud-actions admin-partner-actions" role="cell">
        <button class="icon-btn" type="button" onclick="visualizarParceiroIndicacaoAdmin('${escapeAttr(parceiro.id || '')}')" title="Visualizar parceiro" aria-label="Visualizar ${escapeAttr(nome)}">🔍</button>
        ${podeEditar ? `<button class="icon-btn" type="button" onclick="editarParceiroIndicacaoAdmin('${escapeAttr(parceiro.id || '')}')" title="Editar parceiro" aria-label="Editar ${escapeAttr(nome)}">✎</button>` : ''}
      </div>
    `;
  }

  if (colunaId === 'parceiro') {
    return `
      <div class="admin-partner-cell admin-user-main" role="cell">
        <div class="admin-user-identity">
          <strong>${escapeHtml(nome)}</strong>
          ${empresa ? `<small>${escapeHtml(empresa)}</small>` : ''}
        </div>
      </div>
    `;
  }

  const celulas = {
    codigo_revendedor: parceiro.codigo_revendedor || '-',
    ac: parceiro.ac || '-',
    contato,
    empresa: empresa || '-',
    remunerado: parceiro.remunerado === true ? 'Sim' : 'Não',
    atualizado: formatarDataCurtaAr(parceiro.updated_at || parceiro.created_at)
  };

  if (colunaId === 'status') {
    return `<span class="admin-partner-cell" role="cell"><span class="badge status-${escapeAttr(status)}">${escapeHtml(obterRotuloStatusHub(status))}${escapeHtml(remunerado)}</span></span>`;
  }

  return `<span class="admin-partner-cell" role="cell">${escapeHtml(celulas[colunaId] || '-')}</span>`;
}

function obterParceirosIndicacaoFiltradosAdmin(records) {
  const filtro = state.admin.filtros.parceirosIndicacao || 'todos';
  const busca = normalizarBuscaAr(state.admin.buscaParceirosIndicacaoAplicada || '');
  const termos = busca.split(' ').filter(Boolean);
  let filtrados = records || [];

  if (filtro === 'ativo') {
    filtrados = filtrados.filter(parceiro => (parceiro.status || 'ativo') === 'ativo');
  }

  if (filtro === 'inativos_arquivados') {
    filtrados = filtrados.filter(parceiro => parceiro.status === 'inativo' || parceiro.status === 'arquivado');
  }

  if (!termos.length) {
    return filtrados;
  }

  return filtrados.filter(parceiro => {
    const baseBusca = normalizarBuscaAr([
      parceiro.nome,
      parceiro.nome_completo,
      parceiro.codigo_revendedor,
      parceiro.ac,
      parceiro.nome_empresa,
      parceiro.whatsapp_comercial,
      parceiro.whatsapp_pessoal,
      parceiro.email,
      parceiro.email_comercial,
      parceiro.email_cadastro_certificado,
      parceiro.status
    ].filter(Boolean).join(' '));

    return termos.every(termo => baseBusca.includes(termo));
  });
}

function selecionarFiltroParceirosIndicacaoAdmin(filtro) {
  state.admin.filtros.parceirosIndicacao = filtro;
  state.admin.paginaParceirosIndicacao = 1;
  state.admin.loteParceirosSelecionados = [];
  renderAdministracao();
}

function obterIdsParceirosIndicacaoVisiveisAdmin() {
  const records = obterParceirosIndicacaoFiltradosAdmin(state.admin.parceirosIndicacao || []);
  const limite = Math.max(1, Number(state.admin.limiteParceirosIndicacao) || 15);
  const totalPaginas = Math.max(1, Math.ceil(records.length / limite));
  const paginaAtual = Math.min(Math.max(1, Number(state.admin.paginaParceirosIndicacao) || 1), totalPaginas);
  const inicio = (paginaAtual - 1) * limite;

  return records.slice(inicio, inicio + limite).map(parceiro => parceiro.id).filter(Boolean);
}

function renderBarraLoteParceirosIndicacaoAdmin() {
  const modo = state.admin.loteParceirosModo;
  if (!modo) return '';

  const totalSelecionados = (state.admin.loteParceirosSelecionados || []).length;
  const processando = Boolean(state.admin.loteParceirosProcessando);
  const desabilitado = totalSelecionados <= 0 || processando ? 'disabled' : '';
  const titulo = modo === 'archive' ? 'Arquivamento em lote' : 'Ativar/Inativar em lote';

  return `
    <section class="admin-partners-bulk-bar" aria-live="polite">
      <div>
        <strong>${escapeHtml(titulo)}</strong>
        <span>${processando ? 'Processando...' : `${escapeHtml(String(totalSelecionados))} parceiro${totalSelecionados === 1 ? '' : 's'} selecionado${totalSelecionados === 1 ? '' : 's'}`}</span>
      </div>
      <div class="admin-partners-bulk-actions">
        ${modo === 'status' ? `
          <button class="save-btn" type="button" onclick="executarLoteStatusParceirosIndicacaoAdmin('ativo')" ${desabilitado}>Ativar</button>
          <button class="secondary-btn" type="button" onclick="executarLoteStatusParceirosIndicacaoAdmin('inativo')" ${desabilitado}>Inativar</button>
        ` : `
          <button class="secondary-btn danger" type="button" onclick="executarLoteArquivarParceirosIndicacaoAdmin()" ${desabilitado}>Arquivar</button>
        `}
        <button class="secondary-btn" type="button" onclick="cancelarLoteParceirosIndicacaoAdmin()">Cancelar</button>
      </div>
    </section>
  `;
}

function iniciarLoteParceirosIndicacaoAdmin(modo) {
  if (!['status', 'archive'].includes(modo)) return;

  state.admin.loteParceirosModo = modo;
  state.admin.loteParceirosSelecionados = [];
  state.admin.loteParceirosProcessando = false;
  state.admin.acoesParceirosAberto = false;
  state.admin.seletorColunasParceirosAberto = false;
  state.admin.message = '';
  renderAdministracao();
}

function cancelarLoteParceirosIndicacaoAdmin() {
  if (state.admin.loteParceirosProcessando) return;

  state.admin.loteParceirosModo = null;
  state.admin.loteParceirosSelecionados = [];
  state.admin.loteParceirosProcessando = false;
  renderAdministracao();
}

function alternarParceiroIndicacaoSelecionadoAdmin(id, selecionado) {
  if (!id || !state.admin.loteParceirosModo || state.admin.loteParceirosProcessando) return;

  const atuais = new Set(state.admin.loteParceirosSelecionados || []);
  if (selecionado) {
    atuais.add(id);
  } else {
    atuais.delete(id);
  }

  state.admin.loteParceirosSelecionados = Array.from(atuais);
  renderAdministracao();
}

function alternarTodosParceirosIndicacaoAdmin(selecionado) {
  if (!state.admin.loteParceirosModo || state.admin.loteParceirosProcessando) return;

  const visiveis = obterIdsParceirosIndicacaoVisiveisAdmin();
  const atuais = new Set(state.admin.loteParceirosSelecionados || []);

  visiveis.forEach(id => {
    if (selecionado) {
      atuais.add(id);
    } else {
      atuais.delete(id);
    }
  });

  state.admin.loteParceirosSelecionados = Array.from(atuais);
  renderAdministracao();
}

async function executarLoteStatusParceirosIndicacaoAdmin(status) {
  const statusNormalizado = String(status || '').trim().toLowerCase();
  const selecionados = [...new Set(state.admin.loteParceirosSelecionados || [])].filter(Boolean);

  if (!pode('admin.parceiros_indicacao', 'update')) {
    state.admin.message = 'Seu usuário não possui permissão para ativar/inativar parceiros.';
    renderAdministracao();
    return;
  }

  if (!['ativo', 'inativo'].includes(statusNormalizado)) {
    state.admin.message = 'Status inválido para atualização em lote.';
    renderAdministracao();
    return;
  }

  if (!selecionados.length) {
    state.admin.message = 'Selecione pelo menos um parceiro.';
    renderAdministracao();
    return;
  }

  const acao = statusNormalizado === 'ativo' ? 'ativar' : 'inativar';
  if (!window.confirm(`Deseja ${acao} os parceiros selecionados?`)) {
    return;
  }

  try {
    state.admin.loteParceirosProcessando = true;
    state.admin.message = '';
    renderAdministracao();

    const response = await chamarApi('updateAdminPartnersStatusBatch', {
      ids: selecionados,
      status: statusNormalizado
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível atualizar os parceiros.'));
    }

    state.admin.loteParceirosModo = null;
    state.admin.loteParceirosSelecionados = [];
    state.admin.loteParceirosProcessando = false;
    state.admin.message = 'Parceiro(s) atualizado(s) com sucesso.';
    await carregarParceirosIndicacaoAdmin(true);
  } catch (erro) {
    state.admin.loteParceirosProcessando = false;
    state.admin.message = erro.message || 'Erro ao atualizar parceiros.';
    renderAdministracao();
  }
}

async function executarLoteArquivarParceirosIndicacaoAdmin() {
  const selecionados = [...new Set(state.admin.loteParceirosSelecionados || [])].filter(Boolean);

  if (!pode('admin.parceiros_indicacao', 'archive')) {
    state.admin.message = 'Seu usuário não possui permissão para arquivar parceiros.';
    renderAdministracao();
    return;
  }

  if (!selecionados.length) {
    state.admin.message = 'Selecione pelo menos um parceiro.';
    renderAdministracao();
    return;
  }

  const confirmado = window.confirm(
    'Deseja arquivar os parceiros selecionados?\n\nOs registros deixarão de aparecer entre os parceiros ativos, mas permanecerão disponíveis no filtro de arquivados.'
  );

  if (!confirmado) {
    return;
  }

  try {
    state.admin.loteParceirosProcessando = true;
    state.admin.message = '';
    renderAdministracao();

    const response = await chamarApi('archiveAdminPartnersBatch', {
      ids: selecionados
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível arquivar os parceiros.'));
    }

    state.admin.loteParceirosModo = null;
    state.admin.loteParceirosSelecionados = [];
    state.admin.loteParceirosProcessando = false;
    state.admin.message = 'Parceiro(s) arquivado(s) com sucesso.';
    await carregarParceirosIndicacaoAdmin(true);
  } catch (erro) {
    state.admin.loteParceirosProcessando = false;
    state.admin.message = erro.message || 'Erro ao arquivar parceiros.';
    renderAdministracao();
  }
}

function obterValorExportacaoParceiroIndicacaoAdmin(colunaId, parceiro) {
  const nome = parceiro.nome_completo || parceiro.nome || '';
  const empresa = parceiro.nome_empresa || parceiro.vinculo_empresa || '';
  const contato = parceiro.whatsapp_comercial || parceiro.telefone || parceiro.email_cadastro_certificado || parceiro.email || '';

  const valores = {
    parceiro: nome,
    codigo_revendedor: parceiro.codigo_revendedor || '',
    ac: parceiro.ac || '',
    contato,
    empresa,
    status: parceiro.status || 'ativo',
    remunerado: parceiro.remunerado === true ? 'Sim' : 'Não',
    atualizado: formatarDataCurtaAr(parceiro.updated_at || parceiro.created_at)
  };

  return valores[colunaId] ?? '';
}

function obterNomeArquivoParceirosIndicacaoAdmin() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');

  return `parceiros-indicacao-${ano}-${mes}-${dia}.xlsx`;
}

async function exportarParceirosIndicacaoAdmin() {
  try {
    state.admin.message = '';
    renderAdministracao();

    const xlsx = await carregarXlsxAr();
    const colunas = obterColunasVisiveisParceirosIndicacaoAdmin()
      .filter(coluna => coluna.id !== 'acoes');
    const registros = obterParceirosIndicacaoFiltradosAdmin(state.admin.parceirosIndicacao || []);

    if (!colunas.length) {
      state.admin.message = 'Selecione pelo menos uma coluna para exportar.';
      renderAdministracao();
      return;
    }

    if (!registros.length) {
      state.admin.message = 'Nenhum parceiro encontrado para exportar.';
      renderAdministracao();
      return;
    }

    const linhas = registros.map(parceiro => colunas.reduce((acc, coluna) => {
      acc[coluna.label] = obterValorExportacaoParceiroIndicacaoAdmin(coluna.id, parceiro);
      return acc;
    }, {}));

    const worksheet = xlsx.utils.json_to_sheet(linhas);
    worksheet['!cols'] = colunas.map(coluna => ({
      wch: Math.max(14, Math.min(36, Number.parseInt(coluna.min, 10) / 8 || 16))
    }));

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Parceiros');
    xlsx.writeFile(workbook, obterNomeArquivoParceirosIndicacaoAdmin());

    state.admin.message = 'Exportação gerada com sucesso.';
    renderAdministracao();
  } catch (erro) {
    state.admin.message = erro.message || 'Erro ao exportar parceiros.';
    renderAdministracao();
  }
}

function renderMenuAcoesParceirosIndicacaoAdmin() {
  if (!state.admin.acoesParceirosAberto) {
    return '';
  }

  const podeAtualizar = pode('admin.parceiros_indicacao', 'update');
  const podeArquivar = pode('admin.parceiros_indicacao', 'archive');

  return `
    <div class="admin-partners-actions-menu" role="menu" aria-label="Ações de parceiros" onkeydown="navegarMenuAcoesParceirosIndicacaoAdmin(event)">
      <button type="button" role="menuitem" onclick="executarAcaoParceirosIndicacaoAdmin('colunas')">Editar colunas</button>
      ${podeAtualizar ? '<button type="button" role="menuitem" onclick="executarAcaoParceirosIndicacaoAdmin(\'status\')">Ativar/Inativar em lote</button>' : ''}
      ${podeArquivar ? '<button type="button" role="menuitem" onclick="executarAcaoParceirosIndicacaoAdmin(\'arquivar\')">Arquivar em lote</button>' : ''}
      <button type="button" role="menuitem" onclick="executarAcaoParceirosIndicacaoAdmin('exportar')">Exportar para Excel</button>
    </div>
  `;
}

function alternarMenuAcoesParceirosIndicacaoAdmin() {
  state.admin.acoesParceirosAberto = !state.admin.acoesParceirosAberto;
  renderAdministracao();

  if (state.admin.acoesParceirosAberto) {
    const trigger = document.querySelector('.admin-partners-actions-btn');
    const menu = document.querySelector('.admin-partners-actions-menu');
    abrirMenuAcaoGlobal(trigger, menu, {
      minWidth: 220,
      maxWidth: 320,
      gap: 10
    });
    window.setTimeout(() => {
      document.querySelector('.admin-partners-actions-menu [role="menuitem"]')?.focus();
    }, 0);
  }
}

function fecharMenuAcoesParceirosIndicacaoAdmin({ renderizar = true } = {}) {
  if (!state.admin.acoesParceirosAberto) return;

  state.admin.acoesParceirosAberto = false;

  if (renderizar) {
    renderAdministracao();
  }
}

function executarAcaoParceirosIndicacaoAdmin(acao) {
  state.admin.acoesParceirosAberto = false;

  if (acao === 'colunas') {
    abrirSeletorColunasParceirosIndicacaoAdmin();
    renderAdministracao();
    return;
  }

  if (acao === 'status') {
    iniciarLoteParceirosIndicacaoAdmin('status');
    return;
  }

  if (acao === 'arquivar') {
    iniciarLoteParceirosIndicacaoAdmin('archive');
    return;
  }

  if (acao === 'exportar') {
    exportarParceirosIndicacaoAdmin();
    return;
  }

  state.admin.message = '';
  renderAdministracao();
}

function navegarMenuAcoesParceirosIndicacaoAdmin(event) {
  const teclas = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'];
  if (!teclas.includes(event.key)) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    fecharMenuAcoesParceirosIndicacaoAdmin();
    return;
  }

  const itens = Array.from(document.querySelectorAll('.admin-partners-actions-menu [role="menuitem"]'));
  if (!itens.length) return;

  event.preventDefault();
  const atual = itens.indexOf(document.activeElement);
  let proximo = atual;

  if (event.key === 'ArrowDown') proximo = atual < 0 ? 0 : (atual + 1) % itens.length;
  if (event.key === 'ArrowUp') proximo = atual < 0 ? itens.length - 1 : (atual - 1 + itens.length) % itens.length;
  if (event.key === 'Home') proximo = 0;
  if (event.key === 'End') proximo = itens.length - 1;

  itens[proximo]?.focus();
}

function abrirSeletorColunasParceirosIndicacaoAdmin() {
  garantirColunasParceirosIndicacaoAdmin();
  state.admin.colunasParceirosIndicacaoRascunho = [...(state.admin.colunasParceirosIndicacao || ADMIN_PARTNER_DEFAULT_VISIBLE_COLUMNS)];
  state.admin.seletorColunasParceirosAberto = true;
}

function alternarSeletorColunasParceirosIndicacaoAdmin() {
  if (state.admin.seletorColunasParceirosAberto) {
    cancelarColunasParceirosIndicacaoAdmin();
    return;
  }

  abrirSeletorColunasParceirosIndicacaoAdmin();
  renderAdministracao();
}

function alternarColunaParceirosIndicacaoAdmin(colunaId, visivel) {
  const coluna = ADMIN_PARTNER_COLUMNS.find(item => item.id === colunaId);
  if (!coluna || coluna.locked) return;

  const atuais = new Set(
    state.admin.colunasParceirosIndicacaoRascunho?.length
      ? state.admin.colunasParceirosIndicacaoRascunho
      : state.admin.colunasParceirosIndicacao || ADMIN_PARTNER_DEFAULT_VISIBLE_COLUMNS
  );

  if (visivel) {
    atuais.add(colunaId);
  } else {
    atuais.delete(colunaId);
  }

  state.admin.colunasParceirosIndicacaoRascunho = garantirColunasObrigatoriasParceirosIndicacao(Array.from(atuais));
  renderAdministracao();
}

function moverColunaParceirosIndicacaoAdmin(colunaId, direcao) {
  const rascunho = garantirColunasObrigatoriasParceirosIndicacao(
    state.admin.colunasParceirosIndicacaoRascunho?.length
      ? state.admin.colunasParceirosIndicacaoRascunho
      : state.admin.colunasParceirosIndicacao || ADMIN_PARTNER_DEFAULT_VISIBLE_COLUMNS
  );
  const indice = rascunho.indexOf(colunaId);
  const proximoIndice = indice + Number(direcao || 0);

  if (indice < 0 || proximoIndice < 0 || proximoIndice >= rascunho.length) return;

  const [item] = rascunho.splice(indice, 1);
  rascunho.splice(proximoIndice, 0, item);
  state.admin.colunasParceirosIndicacaoRascunho = rascunho;
  renderAdministracao();
}

function restaurarColunasParceirosIndicacaoAdmin() {
  state.admin.colunasParceirosIndicacaoRascunho = [...ADMIN_PARTNER_DEFAULT_VISIBLE_COLUMNS];
  renderAdministracao();
}

function salvarRascunhoColunasParceirosIndicacaoAdmin() {
  state.admin.colunasParceirosIndicacao = garantirColunasObrigatoriasParceirosIndicacao(
    state.admin.colunasParceirosIndicacaoRascunho?.length
      ? state.admin.colunasParceirosIndicacaoRascunho
      : ADMIN_PARTNER_DEFAULT_VISIBLE_COLUMNS
  );
  state.admin.colunasParceirosIndicacaoRascunho = [];
  state.admin.seletorColunasParceirosAberto = false;
  salvarColunasParceirosIndicacaoAdmin();
  renderAdministracao();
}

function cancelarColunasParceirosIndicacaoAdmin() {
  state.admin.colunasParceirosIndicacaoRascunho = [];
  state.admin.seletorColunasParceirosAberto = false;
  renderAdministracao();
}

function alterarBuscaParceirosIndicacaoAdmin(valor) {
  state.admin.buscaParceirosIndicacaoDigitada = valor;
  window.clearTimeout(state.admin.buscaParceirosIndicacaoTimer);
  state.admin.buscaParceirosIndicacaoTimer = window.setTimeout(() => {
    aplicarBuscaParceirosIndicacaoAdmin();
  }, ADMIN_PARTNER_SEARCH_DEBOUNCE_MS);
}

function aplicarBuscaParceirosIndicacaoAdmin() {
  window.clearTimeout(state.admin.buscaParceirosIndicacaoTimer);

  if ((state.admin.buscaParceirosIndicacaoAplicada || '') === (state.admin.buscaParceirosIndicacaoDigitada || '')) {
    return;
  }

  state.admin.buscaParceirosIndicacaoAplicada = state.admin.buscaParceirosIndicacaoDigitada;
  state.admin.paginaParceirosIndicacao = 1;
  renderAdministracao();
}

function selecionarPaginaParceirosIndicacaoAdmin(pagina) {
  const totalPaginas = Math.max(
    1,
    Math.ceil(obterParceirosIndicacaoFiltradosAdmin(state.admin.parceirosIndicacao || []).length / (Math.max(1, Number(state.admin.limiteParceirosIndicacao) || 15)))
  );

  state.admin.paginaParceirosIndicacao = Math.min(Math.max(1, Number(pagina) || 1), totalPaginas);
  renderAdministracao();
}

function renderPaginacaoParceirosIndicacaoAdmin(totalPaginas, paginaAtual) {
  if (totalPaginas <= 1) {
    return '';
  }

  return `
    <nav class="admin-users-pagination" aria-label="Paginação de parceiros">
      ${Array.from({ length: totalPaginas }, (_, index) => {
        const pagina = index + 1;
        const classes = ['admin-users-page-btn', pagina === paginaAtual ? 'active' : ''].filter(Boolean).join(' ');
        return `
          <button
            class="${classes}"
            type="button"
            onclick="selecionarPaginaParceirosIndicacaoAdmin(${pagina})"
            aria-current="${pagina === paginaAtual ? 'page' : 'false'}"
          >
            ${pagina}
          </button>
        `;
      }).join('')}
    </nav>
  `;
}

function renderModalParceiroIndicacaoAdmin() {
  if (!state.admin.parceiroModal?.aberto) {
    return '';
  }

  const erros = state.admin.parceiroModal.erros || {};
  const item = state.admin.parceiroModal.dados || {};
  const modo = state.admin.parceiroModal.modo || 'create';
  const abaAtiva = state.admin.parceiroModal.aba || 'dados';
  const somenteLeitura = modo === 'view';
  const podeVerSensiveis = pode('admin.parceiros_indicacao', 'view_sensitive');
  const podeArquivar = pode('admin.parceiros_indicacao', 'archive');
  const titulo = modo === 'view' ? 'Visualizar parceiro' : (modo === 'edit' ? 'Editar parceiro' : 'Adicionar parceiro');
  const botaoTexto = state.admin.parceiroModal.salvo
    ? 'Salvo'
    : (state.admin.parceiroModal.salvando ? 'Salvando...' : 'Salvar parceiro');

  return `
    <section id="parceiro_modal_dialog" class="hub-form-screen partner-form-screen" role="region" aria-labelledby="parceiro_modal_title" tabindex="-1" data-partner-modal>
        <div class="hub-form-screen-header">
          <h3 id="parceiro_modal_title">${escapeHtml(titulo)}</h3>
          <button class="secondary-btn" type="button" onclick="fecharModalParceiroIndicacaoAdmin()" title="Fechar">Fechar</button>
        </div>

        <div class="hub-form-screen-steps partner-modal-tabs" role="tablist" aria-label="Seções do parceiro">
          <button id="parceiro_tab_dados" class="partner-modal-tab ${abaAtiva === 'dados' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${abaAtiva === 'dados'}" aria-controls="parceiro_panel_dados" data-partner-tab="dados">Dados gerais</button>
          <button id="parceiro_tab_empresa" class="partner-modal-tab ${abaAtiva === 'empresa' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${abaAtiva === 'empresa'}" aria-controls="parceiro_panel_empresa" data-partner-tab="empresa">Empresa e remuneração</button>
        </div>

        <div class="hub-form-screen-content partner-modal-body">
          <div id="parceiro_panel_dados" class="hub-form-section" role="tabpanel" aria-labelledby="parceiro_tab_dados" tabindex="0" data-partner-tab-panel="dados" ${abaAtiva === 'dados' ? '' : 'hidden'}>
          <div class="hub-form-section-title"><strong>Dados gerais</strong><span>Identificação e contatos do parceiro.</span></div>
          <div class="hub-form-grid partner-modal-grid">
            ${renderCampoParceiroIndicacao('nome_completo', 'Nome completo', 'text', erros.nome_completo, true, item.nome_completo || item.nome || '', somenteLeitura)}
            ${renderCampoParceiroIndicacao('codigo_revendedor', 'Código revendedor', 'text', '', false, item.codigo_revendedor || '', somenteLeitura)}
            ${renderCampoParceiroIndicacao('ac', 'AC', 'text', '', false, item.ac || '', somenteLeitura)}
            ${podeVerSensiveis ? renderCampoParceiroIndicacao('cpf', 'CPF', 'text', '', false, item.cpf || '', somenteLeitura) : ''}
            ${renderCampoParceiroIndicacao('data_aniversario', 'Data de aniversário', 'date', '', false, item.data_aniversario || '', somenteLeitura)}
            <label>
              <span>Status</span>
              <select id="parceiro_status" class="config-input" ${somenteLeitura ? 'disabled' : ''}>
                <option value="ativo" ${(item.status || 'ativo') === 'ativo' ? 'selected' : ''}>ativo</option>
                <option value="inativo" ${item.status === 'inativo' ? 'selected' : ''}>inativo</option>
                ${podeArquivar ? `<option value="arquivado" ${item.status === 'arquivado' ? 'selected' : ''}>arquivado</option>` : ''}
              </select>
            </label>
          </div>
          <div class="hub-form-grid partner-modal-grid">
            ${renderCampoParceiroIndicacao('whatsapp_comercial', 'WhatsApp comercial', 'text', '', false, item.whatsapp_comercial || '', somenteLeitura)}
            ${renderCampoParceiroIndicacao('whatsapp_pessoal', 'WhatsApp pessoal', 'text', '', false, item.whatsapp_pessoal || '', somenteLeitura)}
            ${renderCampoParceiroIndicacao('email_cadastro_certificado', 'E-mail para cadastro', 'email', '', false, item.email_cadastro_certificado || '', somenteLeitura)}
            ${renderCampoParceiroIndicacao('email_comercial', 'E-mail comercial', 'email', '', false, item.email_comercial || '', somenteLeitura)}
            ${renderCampoParceiroIndicacao('email_pessoal', 'E-mail pessoal', 'email', '', false, item.email_pessoal || '', somenteLeitura)}
          </div>
          </div>

          <div id="parceiro_panel_empresa" class="hub-form-section" role="tabpanel" aria-labelledby="parceiro_tab_empresa" tabindex="0" data-partner-tab-panel="empresa" ${abaAtiva === 'empresa' ? '' : 'hidden'}>
          <div class="hub-form-section-title"><strong>Empresa e remuneração</strong><span>Vínculo profissional e dados de pagamento.</span></div>
          <div class="hub-form-grid partner-modal-grid">
            ${renderCampoParceiroIndicacao('vinculo_empresa', 'Vínculo/Tipo', 'text', '', false, item.vinculo_empresa || '', somenteLeitura)}
            ${renderCampoParceiroIndicacao('nome_empresa', 'Nome da empresa', 'text', '', false, item.nome_empresa || '', somenteLeitura)}
            ${podeVerSensiveis ? renderCampoParceiroIndicacao('cnpj_empresa', 'CNPJ da empresa', 'text', '', false, item.cnpj_empresa || '', somenteLeitura) : ''}
            ${renderCampoParceiroIndicacao('telefone_empresa', 'Telefone da empresa', 'text', '', false, item.telefone_empresa || '', somenteLeitura)}
            <label>
              <span>Remunerado</span>
              <select id="parceiro_remunerado" class="config-input" ${somenteLeitura ? 'disabled' : ''}>
                <option value="nao" ${item.remunerado === true ? '' : 'selected'}>não</option>
                <option value="sim" ${item.remunerado === true ? 'selected' : ''}>sim</option>
              </select>
            </label>
            ${podeVerSensiveis ? renderCampoParceiroIndicacao('chave_pix', 'Chave PIX', 'text', '', false, item.chave_pix || '', somenteLeitura) : ''}
            ${podeVerSensiveis ? renderCampoParceiroIndicacao('nome_chave_pix', 'Nome da chave PIX', 'text', '', false, item.nome_chave_pix || '', somenteLeitura) : ''}
          </div>
          </div>

        </div>

        <div class="hub-form-screen-notice partner-modal-fixed-field">
          <label>
            <span>Observações</span>
            <textarea id="parceiro_observacoes" class="config-input config-textarea" rows="3" ${somenteLeitura ? 'disabled' : ''}>${escapeHtml(item.observacoes || '')}</textarea>
          </label>
        </div>

        <div class="hub-form-screen-actions small-modal-actions">
          <button class="secondary-btn" type="button" onclick="fecharModalParceiroIndicacaoAdmin()">${somenteLeitura ? 'Fechar' : 'Cancelar'}</button>
          ${somenteLeitura ? '' : `<button class="save-btn saving-btn ${state.admin.parceiroModal.salvando ? 'is-saving' : ''} ${state.admin.parceiroModal.salvo ? 'is-saved' : ''}" type="button" onclick="salvarParceiroIndicacaoAdmin()" ${state.admin.parceiroModal.salvando ? 'disabled' : ''}>${escapeHtml(botaoTexto)}</button>`}
        </div>
    </section>
  `;
}

function renderCampoParceiroIndicacao(campo, label, tipo = 'text', erro = '', obrigatorio = false, valor = '', disabled = false) {
  const mascara = {
    cpf: 'cpf',
    cnpj_empresa: 'cnpj',
    whatsapp_comercial: 'telefone',
    whatsapp_pessoal: 'telefone',
    telefone_empresa: 'telefone'
  }[campo] || '';
  const valorFormatado = mascara ? formatarMascaraParceiro(valor, mascara) : valor;

  return `
    <label>
      <span>${escapeHtml(label)}${obrigatorio ? ' *' : ''}</span>
      <input id="parceiro_${escapeAttr(campo)}" class="config-input" type="${escapeAttr(tipo)}" value="${escapeAttr(valorFormatado || '')}" data-partner-mask="${mascara}" oninput="aplicarMascaraParceiroIndicacao(this)" ${disabled ? 'disabled' : ''}>
      ${renderErroCampo(erro)}
    </label>
  `;
}

function formatarMascaraParceiro(valor = '', mascara = '') {
  let digitos = String(valor || '').replace(/\D/g, '');

  if (mascara === 'cpf') {
    digitos = digitos.slice(0, 11);
    return digitos
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  if (mascara === 'cnpj') {
    digitos = digitos.slice(0, 14);
    return digitos
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }

  if (mascara === 'telefone') {
    if (digitos.startsWith('55') && digitos.length > 11) digitos = digitos.slice(2);
    digitos = digitos.slice(0, 11);
    if (digitos.length <= 10) {
      return digitos
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    }
    return digitos
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  }

  return valor;
}

function aplicarMascaraParceiroIndicacao(input) {
  if (!input?.dataset?.partnerMask) return;
  const posicao = input.selectionStart || 0;
  const anterior = input.value;
  input.value = formatarMascaraParceiro(input.value, input.dataset.partnerMask);
  const diferenca = input.value.length - anterior.length;
  input.setSelectionRange(Math.max(0, posicao + diferenca), Math.max(0, posicao + diferenca));
}

function abrirModalParceiroIndicacaoAdmin() {
  atualizarRotaCadastroAdmin('parceiros-indicacao');
  state.admin.parceiroModal = {
    aberto: true,
    modo: 'create',
    aba: 'dados',
    id: '',
    dados: null,
    erros: {},
    salvando: false,
    salvo: false,
    focoAnterior: document.activeElement
  };
  state.admin.message = '';
  renderAdministracao();
  focarModalParceiroIndicacaoAdmin();
}

function fecharModalParceiroIndicacaoAdmin() {
  restaurarRotaCadastroAdmin('parceiros-indicacao');
  const focoAnterior = state.admin.parceiroModal?.focoAnterior;
  state.admin.parceiroModal = {
    aberto: false,
    modo: 'create',
    aba: 'dados',
    id: '',
    dados: null,
    erros: {},
    salvando: false,
    salvo: false,
    focoAnterior: null
  };
  renderAdministracao();
  if (focoAnterior?.focus) window.requestAnimationFrame(() => focoAnterior.focus());
}

async function abrirModalParceiroIndicacaoExistenteAdmin(id, modo = 'view') {
  if (!id) {
    state.admin.message = 'Parceiro não identificado.';
    renderAdministracao();
    return;
  }

  if (modo === 'edit' && !pode('admin.parceiros_indicacao', 'update')) {
    state.admin.message = 'Seu usuário não possui permissão para editar parceiros.';
    renderAdministracao();
    return;
  }

  atualizarRotaCadastroAdmin('parceiros-indicacao', id, modo);

  try {
    state.admin.loading = true;
    state.admin.message = '';
    renderAdministracao();

    const response = await chamarApi('getAdminPartner', {
      id,
      incluir_sensiveis: pode('admin.parceiros_indicacao', 'view_sensitive')
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar o parceiro.'));
    }

    state.admin.loading = false;
    state.admin.parceiroModal = {
      aberto: true,
      modo,
      aba: 'dados',
      id,
      dados: response.data.record || {},
      erros: {},
      salvando: false,
      salvo: false,
      focoAnterior: state.admin.parceiroModal?.focoAnterior || document.activeElement
    };
    renderAdministracao();
    focarModalParceiroIndicacaoAdmin();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao carregar parceiro.';
    renderAdministracao();
  }
}

function visualizarParceiroIndicacaoAdmin(id) {
  return abrirModalParceiroIndicacaoExistenteAdmin(id, 'view');
}

function editarParceiroIndicacaoAdmin(id) {
  return abrirModalParceiroIndicacaoExistenteAdmin(id, 'edit');
}

async function arquivarParceiroIndicacaoAdmin(id) {
  const parceiro = (state.admin.parceirosIndicacao || []).find(item => item.id === id) || {};
  const nome = parceiro.nome_completo || parceiro.nome || 'este parceiro';

  if (!id) {
    state.admin.message = 'Parceiro não identificado.';
    renderAdministracao();
    return;
  }

  if (!pode('admin.parceiros_indicacao', 'archive')) {
    state.admin.message = 'Seu usuário não possui permissão para arquivar parceiros.';
    renderAdministracao();
    return;
  }

  if (!window.confirm(`Arquivar ${nome}? O registro não será excluído, apenas deixará de ficar ativo.`)) {
    return;
  }

  try {
    state.admin.loading = true;
    state.admin.message = '';
    renderAdministracao();

    const response = await chamarApi('archiveAdminPartner', { id });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível arquivar o parceiro.'));
    }

    state.admin.message = 'Parceiro arquivado.';
    await carregarParceirosIndicacaoAdmin();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao arquivar parceiro.';
    renderAdministracao();
  }
}

function obterValorCampoParceiroIndicacao(campo) {
  return document.getElementById(`parceiro_${campo}`)?.value?.trim() || '';
}

function obterDadosParceiroIndicacaoModalAdmin() {
  return {
    id: state.admin.parceiroModal?.id || '',
    permite_dados_sensiveis: pode('admin.parceiros_indicacao', 'view_sensitive') ? 'sim' : 'nao',
    nome_completo: obterValorCampoParceiroIndicacao('nome_completo'),
    codigo_revendedor: obterValorCampoParceiroIndicacao('codigo_revendedor'),
    ac: obterValorCampoParceiroIndicacao('ac'),
    cpf: obterValorCampoParceiroIndicacao('cpf'),
    data_aniversario: obterValorCampoParceiroIndicacao('data_aniversario'),
    status: obterValorCampoParceiroIndicacao('status') || 'ativo',
    whatsapp_comercial: obterValorCampoParceiroIndicacao('whatsapp_comercial'),
    whatsapp_pessoal: obterValorCampoParceiroIndicacao('whatsapp_pessoal'),
    email_cadastro_certificado: obterValorCampoParceiroIndicacao('email_cadastro_certificado'),
    email_comercial: obterValorCampoParceiroIndicacao('email_comercial'),
    email_pessoal: obterValorCampoParceiroIndicacao('email_pessoal'),
    vinculo_empresa: obterValorCampoParceiroIndicacao('vinculo_empresa'),
    nome_empresa: obterValorCampoParceiroIndicacao('nome_empresa'),
    cnpj_empresa: obterValorCampoParceiroIndicacao('cnpj_empresa'),
    telefone_empresa: obterValorCampoParceiroIndicacao('telefone_empresa'),
    remunerado: obterValorCampoParceiroIndicacao('remunerado'),
    chave_pix: obterValorCampoParceiroIndicacao('chave_pix'),
    nome_chave_pix: obterValorCampoParceiroIndicacao('nome_chave_pix'),
    observacoes: obterValorCampoParceiroIndicacao('observacoes')
  };
}

function validarParceiroIndicacaoAdmin(payload) {
  const erros = {};

  if (!payload.nome_completo) {
    erros.nome_completo = 'Informe o nome completo.';
  }

  return erros;
}

async function salvarParceiroIndicacaoAdmin() {
  const payload = obterDadosParceiroIndicacaoModalAdmin();
  const erros = validarParceiroIndicacaoAdmin(payload);
  const editando = Boolean(payload.id);

  if (payload.status === 'arquivado' && !pode('admin.parceiros_indicacao', 'archive')) {
    state.admin.message = 'Seu usuário não possui permissão para arquivar parceiros.';
    renderAdministracao();
    return;
  }

  if (!pode('admin.parceiros_indicacao', editando ? 'update' : 'create')) {
    state.admin.message = editando
      ? 'Seu usuário não possui permissão para editar parceiros.'
      : 'Seu usuário não possui permissão para cadastrar parceiros.';
    renderAdministracao();
    return;
  }

  if (Object.keys(erros).length) {
    state.admin.parceiroModal.erros = erros;
    renderAdministracao();
    return;
  }

  try {
    state.admin.parceiroModal.salvando = true;
    state.admin.parceiroModal.erros = {};
    state.admin.message = '';
    renderAdministracao();

    const response = await chamarApi('saveAdminPartner', payload);

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível salvar o parceiro.'));
    }

    state.admin.parceiroModal = {
      aberto: false,
      modo: 'create',
      id: '',
      dados: null,
      erros: {},
      salvando: false,
      salvo: true
    };
    state.admin.message = payload.id ? 'Parceiro atualizado com sucesso.' : 'Parceiro cadastrado com sucesso.';
    await carregarParceirosIndicacaoAdmin();
  } catch (erro) {
    state.admin.parceiroModal.salvando = false;
    state.admin.parceiroModal.salvo = false;
    state.admin.message = erro.message || 'Erro ao salvar parceiro.';
    renderAdministracao();
  }
}

function renderUsuariosAdmin() {
  const records = state.admin.usuarios || [];
  const recordsFiltrados = obterUsuariosFiltradosAdmin(records);
  const limite = Math.max(1, Number(state.admin.limiteUsuarios) || 15);
  const totalPaginas = Math.max(1, Math.ceil(recordsFiltrados.length / limite));
  const paginaAtual = Math.min(Math.max(1, Number(state.admin.paginaUsuarios) || 1), totalPaginas);
  const inicio = (paginaAtual - 1) * limite;
  const recordsPagina = recordsFiltrados.slice(inicio, inicio + limite);
  const resumo = records.reduce((acc, usuario) => {
    acc.total += 1;
    acc[usuario.status] = (acc[usuario.status] || 0) + 1;
    return acc;
  }, { total: 0 });

  state.admin.paginaUsuarios = paginaAtual;

  return `
    <section class="admin-panel">
      <div class="admin-panel-header">
        <div class="admin-users-header-row">
          <h2>Usuários</h2>
          <div class="action-toolbar admin-users-toolbar">
            ${pode('admin.usuarios', 'create') ? '<button class="add-small-btn action-toolbar-btn admin-users-add-btn" type="button" onclick="abrirModalNovoRegistro(\'usuarios\')">+ Adicionar</button>' : ''}
            <label class="action-toolbar-field admin-users-search" for="admin_usuario_busca" aria-label="Filtrar usuários">
              <input
                id="admin_usuario_busca"
                class="config-input action-toolbar-input admin-users-search-input"
                type="search"
                value="${escapeAttr(state.admin.buscaUsuariosDigitada || '')}"
                placeholder="Filtrar usuários"
                oninput="alterarBuscaUsuariosAdmin(this.value)"
              >
            </label>
          </div>
        </div>
        <div class="crud-filters admin-user-filters" role="group" aria-label="Filtro de status dos usuários">
          ${renderFiltroUsuariosAdmin('todos', 'Todos', resumo.total)}
          ${renderFiltroUsuariosAdmin('ativo', 'Ativos', resumo.ativo || 0)}
          ${renderFiltroUsuariosAdmin('bloqueados_inativos', 'Bloqueados/Inativos', (resumo.bloqueado || 0) + (resumo.inativo || 0))}
        </div>
      </div>

      ${state.admin.message ? `<p class="admin-message">${escapeHtml(state.admin.message)}</p>` : ''}
      ${state.admin.loading ? renderHubLoading('Carregando usuários...') : renderListaUsuariosAdmin(recordsPagina)}
      ${state.admin.loading ? '' : renderPaginacaoUsuariosAdmin(totalPaginas, paginaAtual)}
      ${renderModalUsuarioAdmin()}
      ${renderPermissoesUsuarioAdmin()}
    </section>
  `;
}

function renderFiltroUsuariosAdmin(filtro, label, total) {
  const ativo = state.admin.filtros.usuarios === filtro;
  const classes = [
    'filter-btn',
    filtro === 'ativo' ? 'filter-status-ativo' : '',
    filtro === 'bloqueados_inativos' ? 'filter-status-bloqueados-inativos' : '',
    ativo ? 'active' : ''
  ].filter(Boolean).join(' ');

  return `
    <button class="${classes}" type="button" onclick="selecionarFiltroUsuariosAdmin('${filtro}')" aria-pressed="${ativo ? 'true' : 'false'}">
      ${escapeHtml(label)} <span>${escapeHtml(String(total))}</span>
    </button>
  `;
}

function renderPermissoesPerfilAdmin() {
  return '';
}

function mapearPermissoesPerfilPorChaveSimples(permissoes, perfilId) {
  return (permissoes || []).reduce((acc, item) => {
    if (item.perfil_id === perfilId && item.permitido !== false) {
      acc[`${item.recurso_chave}:${item.acao}`] = true;
    }
    return acc;
  }, {});
}

function verificarAlteracoesPermissoesPerfil(originalPermissions = {}, draftPermissions = {}) {
  const chaves = new Set([
    ...Object.keys(originalPermissions || {}),
    ...Object.keys(draftPermissions || {})
  ]);

  return Array.from(chaves).some(chave => Boolean(originalPermissions?.[chave]) !== Boolean(draftPermissions?.[chave]));
}

function renderListaUsuariosAdmin(records) {
  if (!records.length) {
    return '<p class="quick-link-empty">Nenhum usuário cadastrado.</p>';
  }

  return `
    <div class="crud-list admin-users-list">
      <div class="crud-header">
        <span>Ações</span>
        <span>Usuário</span>
        <span>Perfil</span>
        <span>Permissões adicionais</span>
      </div>
      ${records.map(usuario => `
        ${renderUsuarioAdmin(usuario)}
      `).join('')}
    </div>
  `;
}

function renderUsuarioAdmin(usuario) {
  const id = escapeAttr(usuario.id || '');
  const podeEditar = pode('admin.usuarios', 'update');
  const status = usuario.status || 'pendente';
  const rotuloStatus = obterRotuloStatusUsuario(status);
  const perfil = (state.admin.perfis || []).find(item => item.id === usuario.perfil_id);
  const perfilNome = perfil?.nome || perfil?.slug || usuario.perfil_nome || 'Sem perfil';
  const resumoPermissoes = obterResumoPermissoesEspecificasUsuario(usuario);

  return `
    <article class="crud-row admin-user-row">
      <div class="crud-actions admin-user-actions">
        <span class="admin-user-status-dot status-${escapeAttr(status)}" title="Status: ${escapeAttr(rotuloStatus)}" aria-label="Status do usuário: ${escapeAttr(rotuloStatus)}"></span>
        <button class="icon-btn" type="button" onclick="editarUsuarioAdmin('${id}')" title="Editar usuário" aria-label="Editar usuário" ${podeEditar ? '' : 'disabled'}><i data-lucide="search" aria-hidden="true"></i></button>
      </div>
      <div class="admin-user-main">
        <div class="admin-user-identity">
          <strong>${escapeHtml(usuario.nome || 'Sem nome')}</strong>
          ${usuario.email ? `<small>${escapeHtml(usuario.email)}</small>` : ''}
        </div>
      </div>
      <span class="badge admin-user-profile-badge">${escapeHtml(perfilNome)}</span>
      <span class="admin-user-permissions-summary">${escapeHtml(resumoPermissoes)}</span>
    </article>
  `;
}

function renderOptionsPerfisAdmin(valorAtual) {
  return (state.admin.perfis || []).map(perfil => `
    <option value="${escapeAttr(perfil.id || '')}" ${perfil.id === valorAtual ? 'selected' : ''}>${escapeHtml(perfil.nome || perfil.slug || '')}</option>
  `).join('');
}

function obterRotuloStatusUsuario(status) {
  const rotulos = {
    ativo: 'Ativo',
    pendente: 'Pendente',
    bloqueado: 'Bloqueado',
    inativo: 'Inativo'
  };

  return rotulos[status] || status || 'Pendente';
}

function obterUsuariosFiltradosAdmin(records) {
  const filtro = state.admin.filtros.usuarios || 'todos';
  const busca = normalizarBuscaAr(state.admin.buscaUsuariosAplicada || '');
  const termos = busca.split(' ').filter(Boolean);
  let filtrados = records;

  if (filtro === 'ativo') {
    filtrados = filtrados.filter(usuario => usuario.status === 'ativo');
  }

  if (filtro === 'bloqueados_inativos') {
    filtrados = filtrados.filter(usuario => usuario.status === 'bloqueado' || usuario.status === 'inativo');
  }

  if (!termos.length) {
    return filtrados;
  }

  return filtrados.filter(usuario => {
    const baseBusca = normalizarBuscaAr([
      usuario.nome,
      usuario.email
    ].filter(Boolean).join(' '));

    return termos.every(termo => baseBusca.includes(termo));
  });
}

function selecionarFiltroUsuariosAdmin(filtro) {
  state.admin.filtros.usuarios = filtro;
  state.admin.paginaUsuarios = 1;
  renderAdministracao();
}

function alterarBuscaUsuariosAdmin(valor) {
  state.admin.buscaUsuariosDigitada = valor;
  window.clearTimeout(state.admin.buscaUsuariosTimer);
  state.admin.buscaUsuariosTimer = window.setTimeout(() => {
    if ((state.admin.buscaUsuariosAplicada || '') === (state.admin.buscaUsuariosDigitada || '')) {
      return;
    }

    state.admin.buscaUsuariosAplicada = state.admin.buscaUsuariosDigitada;
    state.admin.paginaUsuarios = 1;
    renderAdministracao();
  }, 320);
}

function selecionarPaginaUsuariosAdmin(pagina) {
  const totalPaginas = Math.max(
    1,
    Math.ceil(obterUsuariosFiltradosAdmin(state.admin.usuarios || []).length / (Math.max(1, Number(state.admin.limiteUsuarios) || 15)))
  );

  state.admin.paginaUsuarios = Math.min(Math.max(1, Number(pagina) || 1), totalPaginas);
  renderAdministracao();
}

function renderPaginacaoUsuariosAdmin(totalPaginas, paginaAtual) {
  if (totalPaginas <= 1) {
    return '';
  }

  return `
    <nav class="admin-users-pagination" aria-label="Paginação de usuários">
      ${Array.from({ length: totalPaginas }, (_, index) => {
        const pagina = index + 1;
        const classes = ['admin-users-page-btn', pagina === paginaAtual ? 'active' : ''].filter(Boolean).join(' ');
        return `
          <button
            class="${classes}"
            type="button"
            onclick="selecionarPaginaUsuariosAdmin(${pagina})"
            aria-current="${pagina === paginaAtual ? 'page' : 'false'}"
          >
            ${pagina}
          </button>
        `;
      }).join('')}
    </nav>
  `;
}

function resetarFluxoModalUsuarioAdmin(render = true) {
  state.admin.modalNovo = '';
  state.admin.editando.usuarios = '';
  state.admin.editando.perfis = '';
  state.admin.usuarioModalEtapa = 'dados';
  state.admin.perfilModalEtapa = 'dados';
  state.admin.perfilModalDraft = {
    slug: '',
    nome: '',
    descricao: '',
    status: 'ativo'
  };
  state.admin.parceiroModal = {
    aberto: false,
    modo: 'create',
    aba: 'dados',
    id: '',
    dados: null,
    erros: {},
    salvando: false,
    salvo: false
  };
  state.admin.usuarioPermissoesId = '';
  state.admin.perfilPermissoesId = '';
  state.admin.usuarioPermissoes = [];
  state.admin.permissionModal = {
    expandedModules: state.admin.permissionModal?.expandedModules || {},
    applying: false,
    moduleUpdating: '',
    originalEffects: {},
    draftEffects: {},
    originalProfilePermissions: {},
    draftProfilePermissions: {},
    dirty: false,
    submitMode: ''
  };
  state.admin.credencialModal = {
    senhaTemporaria: '',
    senhaCopiada: false
  };

  if (render) {
    renderAdministracao();
  }
}

function obterResumoPermissoesEspecificasUsuario(usuario) {
  if (!usuario) {
    return 'Nenhuma exceção';
  }

  if (typeof usuario.permissoes_especificas_resumo === 'string' && usuario.permissoes_especificas_resumo.trim()) {
    return usuario.permissoes_especificas_resumo.trim();
  }

  const contagemPermitidas =
    Number(usuario.permissoes_permitidas ?? usuario.permissoes_especificas_permitidas ?? usuario.total_permissoes_permitidas ?? 0) || 0;
  const contagemBloqueadas =
    Number(usuario.permissoes_bloqueadas ?? usuario.permissoes_especificas_bloqueadas ?? usuario.total_permissoes_bloqueadas ?? 0) || 0;

  if (!contagemPermitidas && !contagemBloqueadas && Array.isArray(usuario.permissoes_especificas)) {
    const resumo = obterResumoPermissoesUsuario(usuario.permissoes_especificas);
    return formatarResumoPermissoesEspecificasUsuario(resumo.permitidas, resumo.bloqueadas);
  }

  return formatarResumoPermissoesEspecificasUsuario(contagemPermitidas, contagemBloqueadas);
}

function formatarResumoPermissoesEspecificasUsuario(permitidas, bloqueadas) {
  if (!permitidas && !bloqueadas) {
    return 'Nenhuma exceção';
  }

  if (permitidas && bloqueadas) {
    return `${permitidas} permitida${permitidas > 1 ? 's' : ''} / ${bloqueadas} bloqueada${bloqueadas > 1 ? 's' : ''}`;
  }

  if (permitidas) {
    return `${permitidas} permitida${permitidas > 1 ? 's' : ''}`;
  }

  return `${bloqueadas} bloqueada${bloqueadas > 1 ? 's' : ''}`;
}

function obterRotuloAcaoPermissao(acao) {
  const rotulos = {
    view: 'Visualizar',
    create: 'Criar',
    update: 'Editar',
    delete: 'Excluir',
    execute: 'Executar',
    view_secret: 'Ver senha',
    importar: 'Importar repasse',
    excluir_importacao: 'Excluir importação',
    emitir_recibo: 'Emitir recibo',
    cancelar_recibo: 'Cancelar recibo',
    manage_permissions: 'Gerenciar permissões',
    block: 'Bloquear',
    archive: 'Arquivar',
    view_sensitive: 'Ver dados sensíveis',
    export: 'Exportar',
    settle: 'Baixar lançamento',
    reconcile: 'Conciliar',
    unreconcile: 'Desconciliar',
    cancel: 'Cancelar',
    close: 'Fechar',
    reopen: 'Reabrir'
  };

  return rotulos[acao] || acao;
}

function obterAcoesDisponiveisRecurso(recurso) {
  const chave = recurso?.chave || '';
  const porRecurso = {
    links_corretora: ['view'],
    links_ar: ['view'],
    links_gestao: ['view'],
    painel_ar: ['view'],
    'painel_ar.gerar_links': ['view', 'execute'],
    'painel_ar.validacoes': ['view', 'importar', 'excluir_importacao', 'emitir_recibo', 'cancelar_recibo'],
    'painel_ar.validacoes.importacao': ['view', 'importar', 'excluir_importacao'],
    'painel_ar.validacoes.recibos': ['view', 'emitir_recibo', 'cancelar_recibo'],
    'painel_ar.crm': ['view', 'execute'],
    'painel_ar.crm_2': ['view', 'update', 'delete'],
    central_senhas: ['view', 'view_secret', 'create', 'update', 'delete'],
    admin: ['view'],
    'admin.usuarios': ['view', 'create', 'update', 'manage_permissions'],
    'admin.perfis': ['view', 'create', 'update'],
    'admin.permissoes': ['view', 'update'],
    'admin.parceiros_indicacao': ['view', 'create', 'update', 'archive', 'view_sensitive'],
    financeiro: ['view'],
    'financeiro.dashboard': ['view'],
    'financeiro.lancamentos': ['view', 'create', 'update', 'settle', 'cancel', 'export'],
    'financeiro.conciliacao': ['view', 'importar', 'reconcile', 'unreconcile'],
    'financeiro.cartoes': ['view', 'create', 'update', 'cancel'],
    'financeiro.relatorios': ['view', 'export'],
    'financeiro.cadastros': ['view', 'create', 'update', 'archive'],
    'financeiro.fechamento': ['view', 'close', 'reopen'],
    'financeiro.auditoria': ['view'],
    'financeiro.configuracoes': ['view', 'update'],
    'financeiro.dados_sensiveis': ['view_sensitive']
  };

  return porRecurso[chave] || ['view'];
}

function obterGrupoRecursoPermissao(recurso) {
  const chave = recurso?.chave || '';

  if (chave.startsWith('admin')) return 'Administração';
  if (chave === 'central_senhas') return 'Central de Senhas';
  if (chave.startsWith('painel_ar')) return 'Painel AR';
  if (chave.startsWith('links_')) return 'Links';
  if (chave.startsWith('financeiro')) return 'Financeiro';

  return 'Outros';
}

function agruparRecursosPermissao(recursos) {
  return recursos.reduce((acc, recurso) => {
    const grupo = obterGrupoRecursoPermissao(recurso);
    acc[grupo] ||= [];
    acc[grupo].push(recurso);
    return acc;
  }, {});
}

function obterOrdemAcaoPermissao(acao) {
  const ordem = {
    view: 1,
    view_secret: 2,
    create: 3,
    update: 4,
    delete: 5,
    execute: 6,
    importar: 7,
    excluir_importacao: 8,
    emitir_recibo: 9,
    cancelar_recibo: 10,
    manage_permissions: 11,
    block: 12,
    archive: 13,
    view_sensitive: 14,
    settle: 15,
    cancel: 16,
    close: 17,
    reopen: 18,
    reconcile: 19,
    unreconcile: 20,
    export: 21
  };

  return ordem[acao] || 999;
}

function obterSimboloModuloPermissao(moduloChave) {
  const simbolos = {
    admin: '[]',
    central_senhas: '##',
    painel_ar: '<>',
    links_corretora: 'o-',
    links_ar: 'o-',
    links_gestao: 'o-'
  };

  return simbolos[moduloChave] || '[]';
}

function construirEstruturaPermissoesUsuario(recursos) {
  const porChave = new Map((recursos || []).map(recurso => [recurso.chave, recurso]));
  const modulos = (recursos || [])
    .filter(recurso => recurso.tipo === 'modulo')
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

  function obterModuloRaiz(recurso) {
    let atual = recurso;

    while (atual?.recurso_pai) {
      const pai = porChave.get(atual.recurso_pai);

      if (!pai) break;
      if (pai.tipo === 'modulo') return pai;
      atual = pai;
    }

    return recurso?.tipo === 'modulo' ? recurso : null;
  }

  function obterRotuloRecurso(recurso) {
    const partes = [];
    let atual = recurso;

    while (atual) {
      partes.unshift(atual.nome || atual.chave);
      if (!atual.recurso_pai) break;
      atual = porChave.get(atual.recurso_pai);
    }

    if (partes.length > 1) {
      partes.shift();
    }

    return partes.join(' / ') || recurso.nome || recurso.chave;
  }

  return modulos.map(modulo => {
    const itensRelacionados = (recursos || [])
      .filter(recurso => {
        if (!recurso?.chave) return false;
        if (recurso.chave === modulo.chave) return true;
        return obterModuloRaiz(recurso)?.chave === modulo.chave;
      })
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

    const recursosFuncionais = itensRelacionados.filter(recurso => recurso.chave !== modulo.chave);
    const linhas = (recursosFuncionais.length ? recursosFuncionais : [modulo]).map(recurso => ({
      ...recurso,
      modulo_chave: modulo.chave,
      modulo_nome: modulo.nome || modulo.chave,
      rotulo_recurso: obterRotuloRecurso(recurso)
    }));

    const acoes = Array.from(new Set(
      linhas.flatMap(recurso => obterAcoesDisponiveisRecurso(recurso))
    )).sort((a, b) => obterOrdemAcaoPermissao(a) - obterOrdemAcaoPermissao(b));

    return {
      chave: modulo.chave,
      nome: modulo.nome || modulo.chave,
      linhas,
      acoes
    };
  });
}

function obterResumoPermissoesUsuario(permissoes) {
  return (permissoes || []).reduce((acc, permissao) => {
    acc.total += 1;
    if (permissao.efeito === 'permitir') acc.permitidas += 1;
    if (permissao.efeito === 'negar') acc.bloqueadas += 1;
    return acc;
  }, { total: 0, permitidas: 0, bloqueadas: 0 });
}

function obterPermissoesPerfilPorChave(perfilPermissoes) {
  return (perfilPermissoes || []).reduce((acc, item) => {
    if (item.permitido === false) {
      return acc;
    }

    acc[`${item.perfil_id}:${item.recurso_chave}:${item.acao}`] = true;
    return acc;
  }, {});
}

function obterResultadoFinalPermissaoUsuario(usuario, perfilPermissoesPorChave, permissoesUsuarioPorChave, recursoChave, acao) {
  const efeito = permissoesUsuarioPorChave[`${recursoChave}:${acao}`] || '';

  if (efeito === 'permitir') return true;
  if (efeito === 'negar') return false;

  return Boolean(perfilPermissoesPorChave[`${usuario?.perfil_id}:${recursoChave}:${acao}`]);
}

function obterEfeitoAoAlternarPermissaoUsuario(usuario, perfilPermissoesPorChave, permissoesUsuarioPorChave, recursoChave, acao, marcado) {
  const herdado = Boolean(perfilPermissoesPorChave[`${usuario?.perfil_id}:${recursoChave}:${acao}`]);
  const atual = obterResultadoFinalPermissaoUsuario(usuario, perfilPermissoesPorChave, permissoesUsuarioPorChave, recursoChave, acao);

  if (atual === marcado) {
    return permissoesUsuarioPorChave[`${recursoChave}:${acao}`] || '';
  }

  if (marcado === herdado) {
    return '';
  }

  return marcado ? 'permitir' : 'negar';
}

function obterResumoModuloUsuario(modulo, permissoesPorChave) {
  return modulo.linhas.reduce((acc, recurso) => {
    modulo.acoes.forEach(acao => {
      if (!obterAcoesDisponiveisRecurso(recurso).includes(acao)) return;
      const efeito = permissoesPorChave[`${recurso.chave}:${acao}`] || '';
      acc.total += 1;
      if (!efeito) acc.herdadas += 1;
      if (efeito === 'permitir') acc.permitidas += 1;
      if (efeito === 'negar') acc.bloqueadas += 1;
    });
    return acc;
  }, { total: 0, herdadas: 0, permitidas: 0, bloqueadas: 0 });
}

function renderOptionsStatusUsuario(valorAtual = 'pendente') {
  return ['pendente', 'ativo', 'bloqueado', 'inativo'].map(status => `
    <option value="${status}" ${status === valorAtual ? 'selected' : ''}>${obterRotuloStatusUsuario(status)}</option>
  `).join('');
}

function mapearPermissoesUsuarioPorChave(permissoes) {
  return (permissoes || []).reduce((acc, item) => {
    acc[`${item.recurso_chave}:${item.acao}`] = item.efeito;
    return acc;
  }, {});
}

function verificarAlteracoesPermissoesUsuario(originalEffects = {}, draftEffects = {}) {
  const chaves = new Set([
    ...Object.keys(originalEffects || {}),
    ...Object.keys(draftEffects || {})
  ]);

  return Array.from(chaves).some(chave => (originalEffects?.[chave] || '') !== (draftEffects?.[chave] || ''));
}

function obterScrollPermissoesUsuarioAdmin() {
  return document.querySelector('.permission-modal-content')?.scrollTop || 0;
}

function renderAdministracaoPreservandoScrollPermissoes(scrollTop) {
  renderAdministracao();
  const container = document.querySelector('.permission-modal-content');
  if (container) {
    container.scrollTop = scrollTop;
  }
}

function obterUsuarioAdminEmEdicao() {
  const usuarioId = state.admin.editando.usuarios || '';
  const editando = Boolean(usuarioId);
  const usuario = editando
    ? (state.admin.usuarios || []).find(item => item.id === usuarioId) || {}
    : {};

  return {
    usuarioId,
    editando,
    usuario,
    prefixo: editando ? `usuario_${usuarioId}` : 'usuario_novo'
  };
}

function renderModalUsuarioAdmin() {
  const {
    usuarioId,
    editando,
    usuario,
    prefixo
  } = obterUsuarioAdminEmEdicao();
  const senhaTemporaria = state.admin.credencialModal?.senhaTemporaria || '';
  const senhaCopiada = Boolean(state.admin.credencialModal?.senhaCopiada);
  const etapa = state.admin.usuarioModalEtapa || 'dados';
  const emPermissoes = etapa === 'permissoes' && editando;
  const cpf = formatarMascaraParceiro(usuario.cpf || '', 'cpf');
  const telefone = formatarMascaraParceiro(usuario.telefone || '', 'telefone');

  if (state.admin.modalNovo !== 'usuarios' && !editando) {
    return '';
  }

  const recursos = state.admin.recursos || [];
  const permissoes = state.admin.usuarioPermissoes || [];
  const perfilPermissoes = state.admin.perfilPermissoes || [];
  const modal = state.admin.permissionModal || {};
  const permissoesUsuarioPorChave = Object.keys(modal.draftEffects || {}).length
    ? (modal.draftEffects || {})
    : mapearPermissoesUsuarioPorChave(permissoes);
  const perfilPermissoesPorChave = obterPermissoesPerfilPorChave(perfilPermissoes);
  const modulos = construirEstruturaPermissoesUsuario(recursos);
  const textoBotaoSalvar = modal.applying && modal.submitMode !== 'close' ? 'Salvando...' : 'Salvar';
  const textoBotaoSalvarFechar = modal.applying && modal.submitMode === 'close' ? 'Salvando...' : 'Salvar e fechar';

  return `
    <div class="modal-backdrop ${emPermissoes ? 'admin-user-modal-backdrop' : ''}" role="dialog" aria-modal="true" aria-label="${editando ? 'Editar usuário' : 'Adicionar usuário'}">
      <section class="small-modal admin-user-modal ${emPermissoes ? 'is-permissions-stage' : ''}">
        <div class="small-modal-header">
          <h3>${emPermissoes ? 'Permissões Adicionais' : editando ? 'Editar usuário' : 'Adicionar usuário'}</h3>
          <button class="icon-btn" type="button" onclick="fecharModalNovoRegistro()" title="Fechar" aria-label="Fechar">×</button>
        </div>
        ${emPermissoes
          ? `
            <div class="permission-modal-layout">
              <div class="permission-modal-content">
                ${renderConteudoPermissoesUsuarioAdmin(usuarioId, usuario, modulos, perfilPermissoesPorChave, permissoesUsuarioPorChave, modal)}
              </div>
            </div>
            <div class="small-modal-actions admin-user-permissions-actions">
              <button class="secondary-btn" type="button" onclick="voltarEtapaModalUsuarioAdmin()">Voltar para usuário</button>
              <div class="admin-user-permissions-actions-right">
                <button class="save-btn" type="button" onclick="salvarPermissoesUsuarioAdmin('${escapeAttr(usuarioId)}')" ${modal.applying || !modal.dirty ? 'disabled' : ''}>${textoBotaoSalvar}</button>
                <button class="secondary-btn" type="button" onclick="salvarPermissoesUsuarioAdmin('${escapeAttr(usuarioId)}', true)" ${modal.applying || !modal.dirty ? 'disabled' : ''}>${textoBotaoSalvarFechar}</button>
              </div>
            </div>
          `
          : `
            <label><span>Nome</span><input id="${prefixo}_nome" class="config-input" type="text" value="${escapeAttr(usuario.nome || '')}"></label>
            <label><span>E-mail</span><input id="${prefixo}_email" class="config-input" type="email" value="${escapeAttr(usuario.email || '')}"></label>
            <label><span>CPF</span><input id="${prefixo}_cpf" class="config-input" type="text" inputmode="numeric" maxlength="14" data-partner-mask="cpf" value="${escapeAttr(cpf)}" oninput="aplicarMascaraParceiroIndicacao(this)"></label>
            <label><span>Telefone</span><input id="${prefixo}_telefone" class="config-input" type="tel" inputmode="numeric" maxlength="15" data-partner-mask="telefone" value="${escapeAttr(telefone)}" oninput="aplicarMascaraParceiroIndicacao(this)"></label>
            <label><span>Perfil</span><select id="${prefixo}_perfil" class="config-input">${renderOptionsPerfisAdmin(usuario.perfil_id || '')}</select></label>
            <label><span>Status</span><select id="${prefixo}_status" class="config-input">${renderOptionsStatusUsuario(usuario.status || 'pendente')}</select></label>
            ${editando ? `
              <section class="admin-user-access-panel">
                <div class="admin-user-access-actions">
                  <button class="secondary-btn" type="button" onclick="abrirPermissoesPeloModalUsuario('${escapeAttr(usuarioId)}')">Editar permissões</button>
                  <button class="secondary-btn" type="button" onclick="gerarSenhaTemporariaUsuarioAdmin()">Gerar nova senha</button>
                </div>
                ${senhaTemporaria ? `
                  <div class="admin-user-password-box">
                    <div class="admin-user-password-header">
                      <strong>Senha provisória</strong>
                      <p>Esta senha ainda não está sincronizada com o Supabase.</p>
                    </div>
                    <div class="admin-user-password-value" aria-live="polite">${escapeHtml(senhaTemporaria)}</div>
                    <div class="admin-user-password-actions">
                      <button class="secondary-btn" type="button" onclick="copiarSenhaTemporariaUsuarioAdmin()">${senhaCopiada ? 'Copiada' : 'Copiar'}</button>
                      <button class="secondary-btn" type="button" onclick="gerarSenhaTemporariaUsuarioAdmin()">Gerar outra</button>
                    </div>
                  </div>
                ` : ''}
              </section>
            ` : ''}
            <div class="small-modal-actions">
              <button class="secondary-btn" type="button" onclick="fecharModalNovoRegistro()">Cancelar</button>
              <button class="save-btn" type="button" onclick="salvarUsuarioAdmin('${escapeAttr(usuarioId)}')">Salvar</button>
            </div>
          `}
      </section>
    </div>
  `;
}

function renderPermissoesUsuarioAdmin() {
  return '';
}

function renderConteudoPermissoesUsuarioAdmin(usuarioId, usuario, modulos, perfilPermissoesPorChave, permissoesUsuarioPorChave, modal) {
  return `
    <div class="permission-module-list">
      <div class="permission-global-toolbar">
        <div class="permission-global-toolbar-group">
          <button class="filter-btn" type="button" onclick="alternarTodosModulosPermissoesUsuario(true)">Expandir todos</button>
          <button class="filter-btn" type="button" onclick="alternarTodosModulosPermissoesUsuario(false)">Recolher todos</button>
        </div>
        <div class="permission-global-toolbar-group">
          <button class="filter-btn" type="button" onclick="aplicarLoteGlobalPermissoesUsuario('${escapeAttr(usuarioId)}', 'permitir')" ${modal.applying ? 'disabled' : ''}>Conceder tudo</button>
          <button class="filter-btn" type="button" onclick="aplicarLoteGlobalPermissoesUsuario('${escapeAttr(usuarioId)}', 'negar')" ${modal.applying ? 'disabled' : ''}>Bloquear tudo</button>
          <button class="filter-btn" type="button" onclick="aplicarLoteGlobalPermissoesUsuario('${escapeAttr(usuarioId)}', '')" ${modal.applying ? 'disabled' : ''}>Restaurar padrão</button>
        </div>
      </div>
      ${modulos.map(modulo => renderModuloPermissoesUsuarioAdmin(usuarioId, usuario, modulo, perfilPermissoesPorChave, permissoesUsuarioPorChave, modal)).join('')}
    </div>
  `;
}

function renderModuloPermissoesUsuarioAdmin(usuarioId, usuario, modulo, perfilPermissoesPorChave, permissoesUsuarioPorChave, modal) {
  const expandido = modal.expandedModules?.[modulo.chave] !== false;
  const atualizando = modal.moduleUpdating === modulo.chave;
  const controle = expandido ? '-' : '+';

  return `
    <article class="permission-module-card ${expandido ? 'is-open' : ''}">
      <div class="permission-module-header">
        <button class="permission-module-toggle" type="button" onclick="alternarModuloPermissoesUsuario('${escapeAttr(modulo.chave)}')" aria-expanded="${expandido ? 'true' : 'false'}">
          <span class="permission-module-control" aria-hidden="true">${controle}</span>
          <strong>${escapeHtml(modulo.nome)}</strong>
        </button>
        <div class="permission-module-toolbar">
          <button class="filter-btn" type="button" onclick="aplicarLoteModuloPermissoesUsuario('${escapeAttr(usuarioId)}', '${escapeAttr(modulo.chave)}', 'permitir')" ${modal.applying ? 'disabled' : ''}>Conceder tudo</button>
          <button class="filter-btn" type="button" onclick="aplicarLoteModuloPermissoesUsuario('${escapeAttr(usuarioId)}', '${escapeAttr(modulo.chave)}', 'negar')" ${modal.applying ? 'disabled' : ''}>Bloquear tudo</button>
          <button class="filter-btn" type="button" onclick="aplicarLoteModuloPermissoesUsuario('${escapeAttr(usuarioId)}', '${escapeAttr(modulo.chave)}', '')" ${modal.applying ? 'disabled' : ''}>Restaurar padrão</button>
        </div>
      </div>
      ${atualizando ? '<p class="quick-link-empty">Aplicando alterações neste módulo...</p>' : ''}
      ${expandido ? renderTabelaModuloPermissoesUsuarioAdmin(usuarioId, usuario, modulo, perfilPermissoesPorChave, permissoesUsuarioPorChave, modal) : ''}
    </article>
  `;
}

function renderTabelaModuloPermissoesUsuarioAdmin(usuarioId, usuario, modulo, perfilPermissoesPorChave, permissoesUsuarioPorChave, modal) {
  return `
    <div class="permission-table-wrap">
      <table class="permission-table">
        <thead>
          <tr>
            <th>Recurso</th>
            ${modulo.acoes.map(acao => `<th>${escapeHtml(obterRotuloAcaoPermissao(acao))}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${modulo.linhas.map(recurso => `
            <tr>
              <td>
                <strong>${escapeHtml(recurso.rotulo_recurso || recurso.nome || recurso.chave)}</strong>
              </td>
              ${modulo.acoes.map(acao => {
                if (!obterAcoesDisponiveisRecurso(recurso).includes(acao)) {
                  return '<td class="permission-cell permission-cell-empty">-</td>';
                }

                const marcado = obterResultadoFinalPermissaoUsuario(usuario, perfilPermissoesPorChave, permissoesUsuarioPorChave, recurso.chave, acao);
                return `
                  <td class="permission-cell">
                    <label class="permission-checkbox">
                      <input type="checkbox" ${marcado ? 'checked' : ''} ${modal.applying ? 'disabled' : ''} onchange="alternarCheckboxPermissaoUsuario('${escapeAttr(usuarioId)}', '${escapeAttr(recurso.chave)}', '${escapeAttr(acao)}', this.checked)">
                      <span aria-hidden="true"></span>
                    </label>
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}


function renderPerfisAdmin() {
  const records = state.admin.perfis || [];
  const recordsFiltrados = obterPerfisFiltradosAdmin(records);
  const limite = Math.max(1, Number(state.admin.limitePerfis) || 15);
  const totalPaginas = Math.max(1, Math.ceil(recordsFiltrados.length / limite));
  const paginaAtual = Math.min(Math.max(1, Number(state.admin.paginaPerfis) || 1), totalPaginas);
  const inicio = (paginaAtual - 1) * limite;
  const recordsPagina = recordsFiltrados.slice(inicio, inicio + limite);
  const resumo = obterResumoRegistros(records);

  state.admin.paginaPerfis = paginaAtual;

  return `
    <section class="admin-panel">
      <div class="admin-panel-header">
        <div class="admin-users-header-row admin-profiles-header-row">
          <h2>Perfis de Acesso</h2>
          <div class="action-toolbar admin-users-toolbar admin-profiles-toolbar">
            ${pode('admin.perfis', 'create') ? '<button class="add-small-btn action-toolbar-btn admin-users-add-btn" type="button" onclick="abrirModalNovoRegistro(\'perfis\')">+ Adicionar</button>' : ''}
            <label class="action-toolbar-field admin-users-search admin-profiles-search" for="admin_perfil_busca" aria-label="Filtrar perfis">
              <input
                id="admin_perfil_busca"
                class="config-input action-toolbar-input admin-users-search-input"
                type="search"
                value="${escapeAttr(state.admin.buscaPerfisDigitada || '')}"
                placeholder="Filtrar perfis"
                oninput="alterarBuscaPerfisAdmin(this.value)"
              >
            </label>
          </div>
        </div>

        <div class="crud-filters admin-user-filters admin-profile-filters" role="group" aria-label="Filtro de status dos perfis">
          ${renderFiltroPerfisAdmin('todos', 'Todos', resumo.total)}
          ${renderFiltroPerfisAdmin('ativo', 'Ativos', resumo.ativos || 0)}
          ${renderFiltroPerfisAdmin('inativo', 'Inativos', resumo.inativos || 0)}
        </div>
      </div>

      ${state.admin.message ? `<p class="admin-message">${escapeHtml(state.admin.message)}</p>` : ''}
      ${state.admin.loading ? renderHubLoading('Carregando perfis...') : renderListaPerfisAdmin(recordsPagina)}
      ${state.admin.loading ? '' : renderPaginacaoPerfisAdmin(totalPaginas, paginaAtual)}
      ${renderModalPerfilAdmin()}
      ${renderPermissoesPerfilAdmin()}
    </section>
  `;
}

function renderFiltroPerfisAdmin(filtro, label, total) {
  const ativo = state.admin.filtros.perfis === filtro;
  const classes = [
    'filter-btn',
    filtro === 'ativo' ? 'filter-status-ativo' : '',
    filtro === 'inativo' ? 'filter-status-bloqueados-inativos' : '',
    ativo ? 'active' : ''
  ].filter(Boolean).join(' ');

  return `
    <button class="${classes}" type="button" onclick="selecionarFiltroPerfisAdmin('${filtro}')" aria-pressed="${ativo ? 'true' : 'false'}">
      ${escapeHtml(label)} <span>${escapeHtml(String(total))}</span>
    </button>
  `;
}

function obterPerfisFiltradosAdmin(records) {
  const filtro = state.admin.filtros.perfis || 'todos';
  const busca = normalizarBuscaAr(state.admin.buscaPerfisAplicada || '');
  const termos = busca.split(' ').filter(Boolean);
  let filtrados = records;

  if (filtro === 'ativo') {
    filtrados = filtrados.filter(perfil => perfil.status === 'ativo');
  }

  if (filtro === 'inativo') {
    filtrados = filtrados.filter(perfil => perfil.status === 'inativo');
  }

  if (!termos.length) {
    return filtrados;
  }

  return filtrados.filter(perfil => {
    const baseBusca = normalizarBuscaAr([
      perfil.nome,
      perfil.slug,
      perfil.descricao
    ].filter(Boolean).join(' '));

    return termos.every(termo => baseBusca.includes(termo));
  });
}

function selecionarFiltroPerfisAdmin(filtro) {
  state.admin.filtros.perfis = filtro;
  state.admin.paginaPerfis = 1;
  renderAdministracao();
}

function alterarBuscaPerfisAdmin(valor) {
  state.admin.buscaPerfisDigitada = valor;
  window.clearTimeout(state.admin.buscaPerfisTimer);
  state.admin.buscaPerfisTimer = window.setTimeout(() => {
    if ((state.admin.buscaPerfisAplicada || '') === (state.admin.buscaPerfisDigitada || '')) {
      return;
    }

    state.admin.buscaPerfisAplicada = state.admin.buscaPerfisDigitada;
    state.admin.paginaPerfis = 1;
    renderAdministracao();
  }, 320);
}

function selecionarPaginaPerfisAdmin(pagina) {
  const totalPaginas = Math.max(
    1,
    Math.ceil(obterPerfisFiltradosAdmin(state.admin.perfis || []).length / (Math.max(1, Number(state.admin.limitePerfis) || 15)))
  );

  state.admin.paginaPerfis = Math.min(Math.max(1, Number(pagina) || 1), totalPaginas);
  renderAdministracao();
}

function renderPaginacaoPerfisAdmin(totalPaginas, paginaAtual) {
  if (totalPaginas <= 1) {
    return '';
  }

  return `
    <nav class="admin-users-pagination admin-profiles-pagination" aria-label="Paginação de perfis">
      ${Array.from({ length: totalPaginas }, (_, index) => {
        const pagina = index + 1;
        const classes = ['admin-users-page-btn', pagina === paginaAtual ? 'active' : ''].filter(Boolean).join(' ');
        return `
          <button
            class="${classes}"
            type="button"
            onclick="selecionarPaginaPerfisAdmin(${pagina})"
            aria-current="${pagina === paginaAtual ? 'page' : 'false'}"
          >
            ${pagina}
          </button>
        `;
      }).join('')}
    </nav>
  `;
}

function renderListaPerfisAdmin(records) {
  if (!records.length) {
    return '<p class="quick-link-empty">Nenhum perfil cadastrado.</p>';
  }

  return `
    <div class="crud-list admin-profiles-list">
      <div class="crud-header">
        <span>Ações</span>
        <span>Perfil</span>
        <span>Status</span>
        <span>Permissões-base</span>
      </div>
      ${records.map(perfil => renderPerfilAdmin(perfil)).join('')}
    </div>
  `;
}

function renderPerfilAdmin(perfil) {
  const id = escapeAttr(perfil.id || '');
  const podeEditar = pode('admin.perfis', 'update');
  const status = perfil.status || 'inativo';
  const rotuloStatus = status === 'ativo' ? 'Ativo' : 'Inativo';
  const resumoPermissoes = obterResumoPermissoesPerfilAdmin(perfil);

  return `
    <article class="crud-row admin-profile-row">
      <div class="crud-actions admin-profile-actions">
        <span class="admin-user-status-dot status-${escapeAttr(status)}" title="Status: ${escapeAttr(rotuloStatus)}" aria-label="Status do perfil: ${escapeAttr(rotuloStatus)}"></span>
        <button class="icon-btn" type="button" onclick="editarPerfilAdmin('${id}')" title="Editar perfil" aria-label="Editar perfil" ${podeEditar ? '' : 'disabled'}><i data-lucide="search" aria-hidden="true"></i></button>
      </div>

      <div class="admin-user-main admin-profile-main">
        <div class="admin-user-identity admin-profile-identity">
          <strong>${escapeHtml(perfil.nome || perfil.slug || 'Sem nome')}</strong>
          ${perfil.descricao ? `<small>${escapeHtml(perfil.descricao)}</small>` : ''}
        </div>
      </div>

      <span class="badge admin-profile-status-badge status-${escapeAttr(status)}">${escapeHtml(rotuloStatus)}</span>
      <span class="admin-user-permissions-summary admin-profile-permissions-summary">${escapeHtml(resumoPermissoes)}</span>

      <input id="perfil_${id}_slug" type="hidden" value="${escapeAttr(perfil.slug || '')}">
    </article>
  `;
}

function obterResumoPermissoesPerfilAdmin(perfil) {
  if (!perfil) {
    return 'Nenhuma permissão-base';
  }

  const totalInformado = Number(perfil.permissoes_ativas ?? perfil.total_permissoes ?? perfil.permissoes_base ?? 0) || 0;
  const totalLocal = (state.admin.perfilPermissoes || [])
    .filter(item => item.perfil_id === perfil.id && item.permitido !== false)
    .length;
  const total = totalInformado || totalLocal;

  if (!total) {
    return 'Nenhuma permissão-base';
  }

  return `${total} permissão${total > 1 ? 'ões' : ''}-base`;
}

function renderModalPerfilAdmin() {
  const editandoId = state.admin.editando.perfis || '';
  const editando = Boolean(editandoId);
  const criando = state.admin.modalNovo === 'perfis' && !editando;
  const perfil = editando
    ? (state.admin.perfis || []).find(item => item.id === editandoId) || {}
    : {};
  const draft = state.admin.perfilModalDraft || {};
  const etapa = state.admin.perfilModalEtapa || 'dados';
  const emPermissoes = etapa === 'permissoes' && (editando || criando);

  if (state.admin.modalNovo !== 'perfis' && !editando) {
    return '';
  }

  const prefixo = editando ? `perfil_${editandoId}` : 'perfil_novo';
  const recursos = state.admin.recursos || [];
  const permissoes = state.admin.perfilPermissoes || [];
  const modal = state.admin.permissionModal || {};
  const permissoesOriginaisPorChave = editando
    ? mapearPermissoesPerfilPorChaveSimples(permissoes, editandoId)
    : {};
  const permissoesPorChave = Object.keys(modal.draftProfilePermissions || {}).length
    ? (modal.draftProfilePermissions || {})
    : permissoesOriginaisPorChave;
  const modulos = construirEstruturaPermissoesUsuario(recursos);
  const textoBotaoSalvar = modal.applying && modal.submitMode !== 'close' ? 'Salvando...' : 'Salvar';
  const textoBotaoSalvarFechar = modal.applying && modal.submitMode === 'close' ? 'Salvando...' : 'Salvar e fechar';
  const totalPermissoesSelecionadas = Object.values(modal.draftProfilePermissions || {}).filter(Boolean).length;
  const tituloModal = emPermissoes
    ? editando ? 'Permissões do perfil' : 'Permissões do novo perfil'
    : editando ? 'Editar perfil' : 'Adicionar perfil';

  return `
    <div class="modal-backdrop ${emPermissoes ? 'admin-user-modal-backdrop' : ''}" role="dialog" aria-modal="true" aria-label="${tituloModal}">
      <section class="small-modal admin-profile-modal ${emPermissoes ? 'admin-user-modal is-permissions-stage' : ''}">
        <div class="small-modal-header">
          <h3>${tituloModal}</h3>
          <button class="icon-btn" type="button" onclick="fecharModalNovoRegistro()" title="Fechar" aria-label="Fechar">×</button>
        </div>
        ${emPermissoes
          ? `
            <div class="permission-modal-layout">
              <div class="permission-modal-content">
                ${renderConteudoPermissoesPerfilAdmin(editando ? editandoId : '', editando ? perfil : draft, modulos, permissoesPorChave, modal)}
              </div>
            </div>
            <div class="small-modal-actions admin-user-permissions-actions">
              <button class="secondary-btn" type="button" onclick="voltarEtapaModalPerfilAdmin()">Voltar para perfil</button>
              ${editando
                ? `
                  <div class="admin-user-permissions-actions-right">
                    <button class="save-btn" type="button" onclick="salvarPermissoesPerfilAdmin('${escapeAttr(editandoId)}')" ${modal.applying || !modal.dirty ? 'disabled' : ''}>${textoBotaoSalvar}</button>
                    <button class="secondary-btn" type="button" onclick="salvarPermissoesPerfilAdmin('${escapeAttr(editandoId)}', true)" ${modal.applying || !modal.dirty ? 'disabled' : ''}>${textoBotaoSalvarFechar}</button>
                  </div>
                `
                : `
                  <div class="admin-user-permissions-actions-right">
                    ${totalPermissoesSelecionadas
                      ? `<button class="save-btn" type="button" onclick="salvarNovoPerfilComPermissoesAdmin()" ${modal.applying ? 'disabled' : ''}>${modal.applying ? 'Salvando...' : 'Salvar perfil'}</button>`
                      : '<span class="quick-link-empty admin-profile-save-hint">Selecione ao menos uma permissão para salvar.</span>'}
                  </div>
                `}
            </div>
          `
          : `
            ${!editando ? `
              <label><span>Identificador</span><input id="${prefixo}_slug" class="config-input" type="text" placeholder="ex: financeiro" value="${escapeAttr(draft.slug || '')}"></label>
            ` : ''}
            <label><span>Nome</span><input id="${prefixo}_nome" class="config-input" type="text" value="${escapeAttr(editando ? perfil.nome || '' : draft.nome || '')}"></label>
            <label><span>Descrição</span><input id="${prefixo}_descricao" class="config-input" type="text" value="${escapeAttr(editando ? perfil.descricao || '' : draft.descricao || '')}"></label>
            <label><span>Status</span><select id="${prefixo}_status" class="config-input"><option value="ativo" ${(editando ? perfil.status : draft.status) === 'ativo' || (!editando && !draft.status) ? 'selected' : ''}>Ativo</option><option value="inativo" ${(editando ? perfil.status : draft.status) === 'inativo' ? 'selected' : ''}>Inativo</option></select></label>
            ${editando ? `
              <section class="admin-user-access-panel admin-profile-permissions-panel">
                <div class="admin-user-access-actions">
                  <button class="secondary-btn" type="button" onclick="abrirPermissoesPerfilAdmin('${escapeAttr(editandoId)}')" ${pode('admin.permissoes', 'view') ? '' : 'disabled'}>Editar permissões</button>
                </div>
              </section>
            ` : ''}
            ${editando
              ? `
                <div class="small-modal-actions admin-user-permissions-actions">
                  ${pode('admin.perfis', 'delete')
                    ? `<button class="secondary-btn danger" type="button" onclick="excluirPerfilAdmin('${escapeAttr(editandoId)}')" ${perfil.sistema ? 'disabled title="Perfis do sistema não podem ser excluídos"' : ''}>Excluir perfil</button>`
                    : '<span></span>'}
                  <div class="admin-user-permissions-actions-right">
                    <button class="secondary-btn" type="button" onclick="fecharModalNovoRegistro()">Cancelar</button>
                    <button class="save-btn" type="button" onclick="salvarPerfilAdmin('${escapeAttr(editandoId)}')">Salvar</button>
                  </div>
                </div>
              `
              : `
                <div class="small-modal-actions">
                  <button class="secondary-btn" type="button" onclick="fecharModalNovoRegistro()">Cancelar</button>
                  <button class="save-btn" type="button" onclick="avancarPermissoesNovoPerfilAdmin()">Avançar para permissões</button>
                </div>
              `}
          `}
      </section>
    </div>
  `;
}

function renderConteudoPermissoesPerfilAdmin(perfilId, perfil, modulos, permissoesPorChave, modal) {
  return `
    <div class="permission-module-list">
      <div class="permission-global-toolbar">
        <div class="permission-global-toolbar-group">
          <button class="filter-btn" type="button" onclick="alternarTodosModulosPermissoesPerfil(true)">Expandir todos</button>
          <button class="filter-btn" type="button" onclick="alternarTodosModulosPermissoesPerfil(false)">Recolher todos</button>
        </div>
        <div class="permission-global-toolbar-group">
          <button class="filter-btn" type="button" onclick="aplicarLoteGlobalPermissoesPerfil('${escapeAttr(perfilId)}', true)" ${modal.applying ? 'disabled' : ''}>Conceder tudo</button>
          <button class="filter-btn" type="button" onclick="aplicarLoteGlobalPermissoesPerfil('${escapeAttr(perfilId)}', false)" ${modal.applying ? 'disabled' : ''}>Remover tudo</button>
        </div>
      </div>
      ${modulos.map(modulo => renderModuloPermissoesPerfilAdmin(perfilId, perfil, modulo, permissoesPorChave, modal)).join('')}
    </div>
  `;
}

function renderModuloPermissoesPerfilAdmin(perfilId, perfil, modulo, permissoesPorChave, modal) {
  const expandido = modal.expandedModules?.[modulo.chave] !== false;
  const atualizando = modal.moduleUpdating === modulo.chave;
  const controle = expandido ? '-' : '+';

  return `
    <article class="permission-module-card ${expandido ? 'is-open' : ''}">
      <div class="permission-module-header">
        <button class="permission-module-toggle" type="button" onclick="alternarModuloPermissoesPerfil('${escapeAttr(modulo.chave)}')" aria-expanded="${expandido ? 'true' : 'false'}">
          <span class="permission-module-control" aria-hidden="true">${controle}</span>
          <strong>${escapeHtml(modulo.nome)}</strong>
        </button>
        <div class="permission-module-toolbar">
          <button class="filter-btn" type="button" onclick="aplicarLoteModuloPermissoesPerfil('${escapeAttr(perfilId)}', '${escapeAttr(modulo.chave)}', true)" ${modal.applying ? 'disabled' : ''}>Conceder tudo</button>
          <button class="filter-btn" type="button" onclick="aplicarLoteModuloPermissoesPerfil('${escapeAttr(perfilId)}', '${escapeAttr(modulo.chave)}', false)" ${modal.applying ? 'disabled' : ''}>Remover tudo</button>
        </div>
      </div>
      ${atualizando ? '<p class="quick-link-empty">Aplicando alterações neste módulo...</p>' : ''}
      ${expandido ? renderTabelaModuloPermissoesPerfilAdmin(perfilId, modulo, permissoesPorChave, modal) : ''}
    </article>
  `;
}

function renderTabelaModuloPermissoesPerfilAdmin(perfilId, modulo, permissoesPorChave, modal) {
  return `
    <div class="permission-table-wrap">
      <table class="permission-table">
        <thead>
          <tr>
            <th>Recurso</th>
            ${modulo.acoes.map(acao => `<th>${escapeHtml(obterRotuloAcaoPermissao(acao))}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${modulo.linhas.map(recurso => `
            <tr>
              <td>
                <strong>${escapeHtml(recurso.rotulo_recurso || recurso.nome || recurso.chave)}</strong>
              </td>
              ${modulo.acoes.map(acao => {
                if (!obterAcoesDisponiveisRecurso(recurso).includes(acao)) {
                  return '<td class="permission-cell permission-cell-empty">-</td>';
                }

                const marcado = Boolean(permissoesPorChave[`${recurso.chave}:${acao}`]);

                return `
                  <td class="permission-cell">
                    <label class="permission-checkbox">
                      <input type="checkbox" ${marcado ? 'checked' : ''} ${modal.applying ? 'disabled' : ''} onchange="alternarCheckboxPermissaoPerfil('${escapeAttr(perfilId)}', '${escapeAttr(recurso.chave)}', '${escapeAttr(acao)}', this.checked)">
                      <span aria-hidden="true"></span>
                    </label>
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function alternarModuloPermissoesPerfil(moduloChave) {
  state.admin.permissionModal ||= {
    expandedModules: {},
    applying: false,
    moduleUpdating: '',
    originalEffects: {},
    draftEffects: {},
    originalProfilePermissions: {},
    draftProfilePermissions: {},
    dirty: false,
    submitMode: ''
  };

  state.admin.permissionModal.expandedModules[moduloChave] =
    !(state.admin.permissionModal.expandedModules?.[moduloChave] !== false);

  renderAdministracao();
}

function obterDadosPerfilModalAdmin(id = '') {
  const prefixo = id ? `perfil_${id}` : 'perfil_novo';
  const perfilAtual = id
    ? (state.admin.perfis || []).find(item => item.id === id) || {}
    : {};
  const draft = state.admin.perfilModalDraft || {};

  return {
    id,
    slug: id ? (perfilAtual.slug || '') : document.getElementById(`${prefixo}_slug`)?.value || draft.slug || '',
    nome: document.getElementById(`${prefixo}_nome`)?.value || (id ? perfilAtual.nome || '' : draft.nome || ''),
    descricao: document.getElementById(`${prefixo}_descricao`)?.value || (id ? perfilAtual.descricao || '' : draft.descricao || ''),
    nivel: String(id ? perfilAtual.nivel ?? 20 : 20),
    status: document.getElementById(`${prefixo}_status`)?.value || (id ? perfilAtual.status || 'ativo' : draft.status || 'ativo')
  };
}

function validarDadosBasicosPerfilAdmin(payload) {
  if (!String(payload.slug || '').trim()) {
    return 'Informe o identificador do perfil.';
  }

  if (!String(payload.nome || '').trim()) {
    return 'Informe o nome do perfil.';
  }

  return '';
}

async function avancarPermissoesNovoPerfilAdmin() {
  const payload = obterDadosPerfilModalAdmin('');
  const mensagemValidacao = validarDadosBasicosPerfilAdmin(payload);

  state.admin.perfilModalDraft = {
    slug: payload.slug,
    nome: payload.nome,
    descricao: payload.descricao,
    status: payload.status
  };

  if (mensagemValidacao) {
    state.admin.message = mensagemValidacao;
    renderAdministracao();
    return;
  }

  if (!pode('admin.permissoes', 'view')) {
    state.admin.message = 'Seu usuário não possui permissão para visualizar permissões de perfil.';
    renderAdministracao();
    return;
  }

  try {
    state.admin.loading = true;
    state.admin.message = '';
    renderAdministracao();

    if (!state.admin.recursos.length) {
      const response = await chamarApi('listAdminPermissions');

      if (!response.ok) {
        throw new Error(obterMensagemApi(response, 'Não foi possível carregar permissões do perfil.'));
      }

      state.admin.recursos = response.data.recursos || [];
      state.admin.perfis = response.data.perfis || [];
      state.admin.perfilPermissoes = response.data.permissoes || [];
    }

    const modulos = construirEstruturaPermissoesUsuario(state.admin.recursos || []);
    const expandedModules = modulos.reduce((acc, modulo) => {
      acc[modulo.chave] = state.admin.permissionModal?.expandedModules?.[modulo.chave] ?? true;
      return acc;
    }, {});
    const draftProfilePermissions = { ...(state.admin.permissionModal?.draftProfilePermissions || {}) };

    state.admin.permissionModal = {
      expandedModules,
      applying: false,
      moduleUpdating: '',
      originalEffects: state.admin.permissionModal?.originalEffects || {},
      draftEffects: state.admin.permissionModal?.draftEffects || {},
      originalProfilePermissions: {},
      draftProfilePermissions,
      dirty: Object.keys(draftProfilePermissions).length > 0,
      submitMode: ''
    };
    state.admin.perfilModalEtapa = 'permissoes';
    state.admin.loading = false;
    renderAdministracao();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao carregar permissões do perfil.';
    renderAdministracao();
  }
}

async function abrirPermissoesPerfilAdmin(id, options = {}) {
  if (!pode('admin.permissoes', 'view')) {
    state.admin.message = 'Seu usuário não possui permissão para visualizar permissões de perfil.';
    renderAdministracao();
    return;
  }

  try {
    state.admin.loading = true;
    if (!options.manterMensagem) {
      state.admin.message = '';
    }
    state.admin.perfilPermissoesId = id;
    state.admin.modalNovo = 'perfis';
    state.admin.editando.perfis = id;
    state.admin.perfilModalEtapa = 'permissoes';
    renderAdministracao();

    if (!state.admin.recursos.length || !state.admin.perfilPermissoes.length) {
      const response = await chamarApi('listAdminPermissions');

      if (!response.ok) {
        throw new Error(obterMensagemApi(response, 'Não foi possível carregar permissões do perfil.'));
      }

      state.admin.recursos = response.data.recursos || [];
      state.admin.perfis = response.data.perfis || [];
      state.admin.perfilPermissoes = response.data.permissoes || [];
    }

    const modulos = construirEstruturaPermissoesUsuario(state.admin.recursos || []);
    const expandedModules = modulos.reduce((acc, modulo) => {
      acc[modulo.chave] = state.admin.permissionModal?.expandedModules?.[modulo.chave] ?? true;
      return acc;
    }, {});
    const originalProfilePermissions = mapearPermissoesPerfilPorChaveSimples(state.admin.perfilPermissoes || [], id);

    state.admin.permissionModal = {
      expandedModules,
      applying: false,
      moduleUpdating: '',
      originalEffects: state.admin.permissionModal?.originalEffects || {},
      draftEffects: state.admin.permissionModal?.draftEffects || {},
      originalProfilePermissions,
      draftProfilePermissions: { ...originalProfilePermissions },
      dirty: false,
      submitMode: ''
    };
    if (options.messageSuccess) {
      state.admin.message = options.messageSuccess;
    }
    state.admin.loading = false;
    renderAdministracao();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao carregar permissões do perfil.';
    renderAdministracao();
  }
}

function fecharPermissoesPerfilAdmin() {
  voltarEtapaModalPerfilAdmin();
}

function voltarEtapaModalPerfilAdmin() {
  const criandoPerfil = state.admin.modalNovo === 'perfis' && !state.admin.editando.perfis;

  state.admin.perfilModalEtapa = 'dados';

  if (criandoPerfil) {
    renderAdministracao();
    return;
  }

  state.admin.perfilPermissoesId = '';
  state.admin.permissionModal = {
    expandedModules: state.admin.permissionModal?.expandedModules || {},
    applying: false,
    moduleUpdating: '',
    originalEffects: state.admin.permissionModal?.originalEffects || {},
    draftEffects: state.admin.permissionModal?.draftEffects || {},
    originalProfilePermissions: {},
    draftProfilePermissions: {},
    dirty: false,
    submitMode: ''
  };
  renderAdministracao();
}

function alternarCheckboxPermissaoPerfil(perfilId, recursoChave, acao, permitido) {
  const draftPermissions = { ...(state.admin.permissionModal.draftProfilePermissions || {}) };
  const chave = `${recursoChave}:${acao}`;

  if (permitido) {
    draftPermissions[chave] = true;
  } else {
    delete draftPermissions[chave];
  }

  state.admin.permissionModal.draftProfilePermissions = draftPermissions;
  state.admin.permissionModal.dirty = verificarAlteracoesPermissoesPerfil(
    state.admin.permissionModal.originalProfilePermissions,
    draftPermissions
  );

  const scrollTop = obterScrollPermissoesUsuarioAdmin();
  renderAdministracaoPreservandoScrollPermissoes(scrollTop);
}

function aplicarLoteModuloPermissoesPerfil(perfilId, moduloChave, permitido) {
  const modulos = construirEstruturaPermissoesUsuario(state.admin.recursos || []);
  const modulo = modulos.find(item => item.chave === moduloChave);

  if (!modulo) return;

  const draftPermissions = { ...(state.admin.permissionModal.draftProfilePermissions || {}) };

  modulo.linhas.forEach(recurso => {
    obterAcoesDisponiveisRecurso(recurso).forEach(acao => {
      const chave = `${recurso.chave}:${acao}`;

      if (permitido) {
        draftPermissions[chave] = true;
      } else {
        delete draftPermissions[chave];
      }
    });
  });

  state.admin.permissionModal.draftProfilePermissions = draftPermissions;
  state.admin.permissionModal.dirty = verificarAlteracoesPermissoesPerfil(
    state.admin.permissionModal.originalProfilePermissions,
    draftPermissions
  );

  const scrollTop = obterScrollPermissoesUsuarioAdmin();
  renderAdministracaoPreservandoScrollPermissoes(scrollTop);
}

function alternarTodosModulosPermissoesPerfil(expandir) {
  const modulos = construirEstruturaPermissoesUsuario(state.admin.recursos || []);
  state.admin.permissionModal.expandedModules = modulos.reduce((acc, modulo) => {
    acc[modulo.chave] = Boolean(expandir);
    return acc;
  }, {});
  renderAdministracao();
}

function aplicarLoteGlobalPermissoesPerfil(perfilId, permitido) {
  const modulos = construirEstruturaPermissoesUsuario(state.admin.recursos || []);
  const draftPermissions = { ...(state.admin.permissionModal.draftProfilePermissions || {}) };

  modulos.forEach(modulo => {
    modulo.linhas.forEach(recurso => {
      obterAcoesDisponiveisRecurso(recurso).forEach(acao => {
        const chave = `${recurso.chave}:${acao}`;

        if (permitido) {
          draftPermissions[chave] = true;
        } else {
          delete draftPermissions[chave];
        }
      });
    });
  });

  state.admin.permissionModal.draftProfilePermissions = draftPermissions;
  state.admin.permissionModal.dirty = verificarAlteracoesPermissoesPerfil(
    state.admin.permissionModal.originalProfilePermissions,
    draftPermissions
  );

  renderAdministracao();
}

async function salvarPermissoesPerfilAdmin(perfilId, fecharAoSalvar = false) {
  const originalPermissions = state.admin.permissionModal.originalProfilePermissions || {};
  const draftPermissions = state.admin.permissionModal.draftProfilePermissions || {};
  const chaves = new Set([
    ...Object.keys(originalPermissions),
    ...Object.keys(draftPermissions)
  ]);

  const alteracoes = Array.from(chaves)
    .map(chave => {
      const [recurso_chave, acao] = chave.split(':');
      return {
        recurso_chave,
        acao,
        anterior: Boolean(originalPermissions[chave]),
        proximo: Boolean(draftPermissions[chave])
      };
    })
    .filter(item => item.anterior !== item.proximo);

  if (!alteracoes.length) {
    state.admin.permissionModal.dirty = false;
    renderAdministracao();
    return;
  }

  try {
    state.admin.permissionModal.applying = true;
    state.admin.permissionModal.submitMode = fecharAoSalvar ? 'close' : 'save';
    state.admin.message = '';
    renderAdministracao();

    const response = await chamarApi('saveAdminProfilePermissionsBatch', {
      perfil_id: perfilId,
      alteracoes: alteracoes.map(item => ({
        recurso_chave: item.recurso_chave,
        acao: item.acao,
        permitido: item.proximo
      }))
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível salvar permissões do perfil.'));
    }

    await carregarPermissoesAdmin();

    if (fecharAoSalvar) {
      state.admin.message = 'Permissões do perfil atualizadas.';
      state.admin.modalNovo = '';
      state.admin.editando.perfis = '';
      state.admin.perfilModalEtapa = 'dados';
      state.admin.perfilPermissoesId = '';
      renderAdministracao();
      return;
    }

    await abrirPermissoesPerfilAdmin(perfilId, {
      manterMensagem: true,
      messageSuccess: 'Permissões do perfil atualizadas.'
    });
  } catch (erro) {
    state.admin.permissionModal.applying = false;
    state.admin.permissionModal.submitMode = '';
    state.admin.message = erro.message || 'Erro ao salvar permissões do perfil.';
    renderAdministracao();
  }
}

function obterRotuloConfig(chave) {
  const rotulos = {
    nome_sistema: 'Nome do sistema',
    subtitulo_sistema: 'Subtítulo',
    cor_principal: 'Cor principal',
    cor_secundaria: 'Cor secundária',
    cor_destaque: 'Cor de destaque',
    modo_visual_padrao: 'Modo visual padrão',
    exibir_logo: 'Exibir logo',
    logo_file_id: 'Arquivo da logo',
    logo_url: 'URL da logo',
    drive_folder_id: 'Pasta do Drive',
    drive_folder_name: 'Nome da pasta',
    limite_favoritos: 'Links rápidos',
    retencao_historico_meses: 'Retenção do histórico',
    janela_aniversarios_dias: 'Janela de aniversários',
    limite_aniversariantes: 'Máximo de aniversariantes',
    limite_avisos: 'Máximo de avisos',
    ar_produtos_spreadsheet_id: 'Planilha de produtos AR',
    ar_produtos_sheet_name: 'Aba de produtos AR',
    ar_url_base_padrao: 'URL base padrão',
    ar_link_com_desconto_template: 'Template com desconto',
    ar_link_sem_desconto_template: 'Template sem desconto',
    ar_link_templates_json: 'Templates em lote'
  };

  return rotulos[chave] || chave;
}

function renderCrudAdmin(entidade, titulo, subtitulo) {
  const records = state.admin[entidade] || [];
  const resumo = obterResumoRegistros(records);

  return `
    <section class="admin-panel">
      <div class="admin-panel-header">
        <div>
          <h2>${escapeHtml(titulo)}</h2>
          <p>${escapeHtml(subtitulo)} ${resumo.total} registros · ${resumo.ativos} ativos · ${resumo.inativos} inativos</p>
        </div>
      </div>

      ${state.admin.message ? `<p class="admin-message">${escapeHtml(state.admin.message)}</p>` : ''}

      <div class="crud-filters" role="group" aria-label="Filtro de status">
        ${renderFiltroAdmin(entidade, 'todos', 'Todos')}
        ${renderFiltroAdmin(entidade, 'ativo', 'Ativos')}
        ${renderFiltroAdmin(entidade, 'inativo', 'Inativos')}
      </div>

      <button class="add-small-btn" type="button" onclick="abrirModalNovoRegistro('${entidade}')">+ Adicionar</button>

      ${state.admin.loading ? renderHubLoading('Carregando registros...') : renderRegistrosAdmin(entidade, records)}
      ${renderModalNovoRegistro(entidade)}
    </section>
  `;
}

function atualizarRotaCadastroAdmin(entidade, id = '', modo = 'novo', { replace = false } = {}) {
  const rotas = {
    categorias: 'cadastros/categorias',
    grupos: 'cadastros/grupos',
    usuarios: 'cadastros/usuarios',
    perfis: 'cadastros/perfis',
    'parceiros-indicacao': 'cadastros/parceiros-indicacao'
  };
  if (!rotas[entidade]) return;

  const sufixo = id ? `${encodeURIComponent(id)}/${modo === 'edit' ? 'editar' : 'visualizar'}` : 'novo';
  const url = new URL(window.location.href);
  url.pathname = `${montarCaminhoHub('administracao').replace(/\/+$/g, '')}/${rotas[entidade]}/${sufixo}`;
  url.hash = '';
  if (replace) window.history.replaceState({}, '', url);
  else window.history.pushState({}, '', url);
}

function restaurarRotaCadastroAdmin(entidade) {
  const rotas = {
    categorias: 'cadastros/categorias',
    grupos: 'cadastros/grupos',
    usuarios: 'cadastros/usuarios',
    perfis: 'cadastros/perfis',
    'parceiros-indicacao': 'cadastros/parceiros-indicacao'
  };
  if (!rotas[entidade]) return;

  const url = new URL(window.location.href);
  url.pathname = `${montarCaminhoHub('administracao').replace(/\/+$/g, '')}/${rotas[entidade]}`;
  url.hash = '';
  window.history.pushState({}, '', url);
}

function renderRegistrosAdmin(entidade, records) {
  const filtrados = filtrarRegistrosAdmin(entidade, records);

  if (!filtrados.length) {
    return '<p class="quick-link-empty">Nenhum registro cadastrado.</p>';
  }

  return `
    <div class="crud-list">
      <div class="crud-header">
        <span>Nome</span>
        <span>Descrição</span>
        <span>Status</span>
        <span>Ação</span>
      </div>
      ${filtrados.map(record => renderRegistroAdmin(entidade, record)).join('')}
    </div>
  `;
}

function renderRegistroAdmin(entidade, record) {
  const id = escapeAttr(record.id || '');
  const prefixo = `${entidade}_${id}`;
  const editando = state.admin.editando[entidade] === record.id;
  const disabled = editando ? '' : 'disabled';

  return `
    <article class="crud-row ${editando ? 'editing' : ''}">
      <input id="${prefixo}_nome" class="config-input" type="text" value="${escapeAttr(record.nome || '')}" placeholder="Nome" ${disabled}>
      <input id="${prefixo}_descricao" class="config-input" type="text" value="${escapeAttr(record.descricao || '')}" placeholder="Descrição" ${disabled}>
      <select id="${prefixo}_status" class="config-input status-${escapeAttr(record.status || 'inativo')}" ${disabled}>
        <option value="ativo" ${record.status === 'ativo' ? 'selected' : ''}>Ativo</option>
        <option value="inativo" ${record.status === 'inativo' ? 'selected' : ''}>Inativo</option>
      </select>
      <div class="crud-actions">
        ${editando
          ? `<button class="save-btn" type="button" onclick="salvarRegistroAdmin('${entidade}', '${id}')">Salvar</button>`
          : `<button class="icon-btn" type="button" onclick="editarRegistroAdmin('${entidade}', '${id}')" title="Editar" aria-label="Editar ${escapeAttr(record.nome || 'registro')}">✎</button>`
        }
      </div>
    </article>
  `;
}

function renderFiltroAdmin(entidade, filtro, label) {
  const ativo = state.admin.filtros[entidade] === filtro;

  return `
    <button class="filter-btn ${ativo ? 'active' : ''}" type="button" onclick="filtrarAdmin('${entidade}', '${filtro}')">
      ${escapeHtml(label)}
    </button>
  `;
}

function renderModalNovoRegistro(entidade) {
  if (state.admin.modalNovo !== entidade) {
    return '';
  }

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Adicionar registro">
      <section class="small-modal">
        <div class="small-modal-header">
          <h3>Adicionar ${entidade === 'categorias' ? 'categoria' : 'grupo'}</h3>
          <button class="icon-btn" type="button" onclick="fecharModalNovoRegistro()" title="Fechar" aria-label="Fechar">×</button>
        </div>

        <label>
          <span>Nome</span>
          <input id="${entidade}_novo_nome" class="config-input" type="text">
        </label>

        <label>
          <span>Descrição</span>
          <input id="${entidade}_novo_descricao" class="config-input" type="text">
        </label>

        <label>
          <span>Status</span>
          <select id="${entidade}_novo_status" class="config-input">
            <option value="ativo">ativo</option>
            <option value="inativo">inativo</option>
          </select>
        </label>

        <div class="small-modal-actions">
          <button class="secondary-btn" type="button" onclick="fecharModalNovoRegistro()">Cancelar</button>
          <button class="save-btn" type="button" onclick="salvarRegistroAdmin('${entidade}', '')">Salvar</button>
        </div>
      </section>
    </div>
  `;
}

function abrirModalNovoRegistro(entidade) {
  if (entidade === 'usuarios') {
    abrirModalUsuarioAdmin('');
    return;
  }

  if (entidade === 'perfis') {
    state.admin.editando.perfis = '';
    state.admin.perfilModalEtapa = 'dados';
    state.admin.perfilModalDraft = {
      slug: '',
      nome: '',
      descricao: '',
      status: 'ativo'
    };
    state.admin.permissionModal = {
      expandedModules: state.admin.permissionModal?.expandedModules || {},
      applying: false,
      moduleUpdating: '',
      originalEffects: state.admin.permissionModal?.originalEffects || {},
      draftEffects: state.admin.permissionModal?.draftEffects || {},
      originalProfilePermissions: {},
      draftProfilePermissions: {},
      dirty: false,
      submitMode: ''
    };
  }

  state.admin.modalNovo = entidade;
  atualizarRotaCadastroAdmin(entidade);
  renderAdministracao();
}

function fecharModalNovoRegistro() {
  restaurarRotaCadastroAdmin(state.admin.modalNovo);
  resetarFluxoModalUsuarioAdmin(true);
}

function abrirModalUsuarioAdmin(id = '') {
  atualizarRotaCadastroAdmin('usuarios', id, id ? 'edit' : 'novo');
  state.admin.modalNovo = 'usuarios';
  state.admin.editando.usuarios = id || '';
  state.admin.usuarioModalEtapa = 'dados';
  state.admin.message = '';
  state.admin.permissionModal = {
    expandedModules: state.admin.permissionModal?.expandedModules || {},
    applying: false,
    moduleUpdating: '',
    originalEffects: {},
    draftEffects: {},
    originalProfilePermissions: {},
    draftProfilePermissions: {},
    dirty: false,
    submitMode: ''
  };
  state.admin.credencialModal = {
    senhaTemporaria: '',
    senhaCopiada: false
  };
  renderAdministracao();
}

function voltarEtapaModalUsuarioAdmin() {
  state.admin.usuarioModalEtapa = 'dados';
  renderAdministracao();
}

function gerarSenhaAleatoriaAdmin(tamanho = 14) {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
  const array = new Uint32Array(tamanho);
  crypto.getRandomValues(array);
  return Array.from(array, numero => caracteres[numero % caracteres.length]).join('');
}

function gerarSenhaTemporariaUsuarioAdmin() {
  state.admin.credencialModal = {
    senhaTemporaria: gerarSenhaAleatoriaAdmin(),
    senhaCopiada: false
  };
  renderAdministracao();
}

async function copiarSenhaTemporariaUsuarioAdmin() {
  const senha = state.admin.credencialModal?.senhaTemporaria || '';

  if (!senha) {
    return;
  }

  try {
    await navigator.clipboard.writeText(senha);
    state.admin.credencialModal.senhaCopiada = true;
    renderAdministracao();
  } catch (erro) {
    state.admin.message = 'Não foi possível copiar a senha provisória.';
    renderAdministracao();
  }
}

async function abrirPermissoesPeloModalUsuario(usuarioId) {
  if (!usuarioId) {
    return;
  }
  await abrirPermissoesUsuarioAdmin(usuarioId);
}

function obterResumoRegistros(records) {
  return records.reduce((acc, record) => {
    acc.total += 1;

    if (record.status === 'ativo') {
      acc.ativos += 1;
    } else {
      acc.inativos += 1;
    }

    return acc;
  }, {
    total: 0,
    ativos: 0,
    inativos: 0
  });
}

function filtrarRegistrosAdmin(entidade, records) {
  const filtro = state.admin.filtros[entidade] || 'todos';

  if (filtro === 'todos') {
    return records;
  }

  return records.filter(record => record.status === filtro);
}

function filtrarAdmin(entidade, filtro) {
  state.admin.filtros[entidade] = filtro;
  if (Object.prototype.hasOwnProperty.call(state.admin.editando, entidade)) {
    state.admin.editando[entidade] = '';
  }
  renderAdministracao();
}

function editarRegistroAdmin(entidade, id) {
  state.admin.editando[entidade] = id;
  atualizarRotaCadastroAdmin(entidade, id, 'edit');
  renderAdministracao();
}

async function carregarRegistrosAdmin(entidade) {
  state.admin.loading = true;
  renderAdministracao();

  try {
    const response = await chamarApi('listAdminRecords', {
      entidade
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar registros.'));
    }

    state.admin[entidade] = response.data.records || [];
    state.admin.editando[entidade] = '';
    state.admin.loading = false;
    renderAdministracao();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao carregar registros.';
    renderAdministracao();
  }
}

async function carregarParceirosIndicacaoAdmin(preservarMensagem = false) {
  state.admin.loading = true;
  if (!preservarMensagem) {
    state.admin.message = '';
  }
  renderAdministracao();

  try {
    const response = await chamarApi('listAdminPartners');

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar parceiros.'));
    }

    state.admin.parceirosIndicacao = response.data.records || [];
    state.admin.loading = false;
    renderAdministracao();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao carregar parceiros.';
    renderAdministracao();
  }
}

async function carregarModulosAdmin(preservarMensagem = false) {
  state.admin.loading = true;
  state.admin.moduloAtualizando = '';

  if (!preservarMensagem) {
    state.admin.message = '';
  }

  renderAdministracao();

  try {
    const response = await chamarApi('listAdminModules');

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar módulos.'));
    }

    state.admin.modulos = response.data.modules || [];
    state.admin.loading = false;
    renderAdministracao();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao carregar módulos.';
    renderAdministracao();
  }
}

async function carregarUsuariosAdmin() {
  state.admin.loading = true;
  state.admin.message = '';
  renderAdministracao();

  try {
    const [usuariosResponse, perfisResponse] = await Promise.all([
      chamarApi('listAdminUsers'),
      chamarApi('listAdminProfiles')
    ]);

    if (!usuariosResponse.ok) {
      throw new Error(obterMensagemApi(usuariosResponse, 'Não foi possível carregar usuários.'));
    }

    if (!perfisResponse.ok) {
      throw new Error(obterMensagemApi(perfisResponse, 'Não foi possível carregar perfis.'));
    }

    state.admin.usuarios = usuariosResponse.data.records || [];
    state.admin.perfis = perfisResponse.data.records || [];
    state.admin.loading = false;
    renderAdministracao();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao carregar usuários.';
    renderAdministracao();
  }
}

async function atualizarResumoUsuariosAdmin() {
  const response = await chamarApi('listAdminUsers');

  if (!response.ok) {
    throw new Error(obterMensagemApi(response, 'Não foi possível atualizar os usuários.'));
  }

  state.admin.usuarios = response.data.records || [];
}

function editarUsuarioAdmin(id) {
  abrirModalUsuarioAdmin(id);
}

async function salvarUsuarioAdmin(id) {
  const prefixo = id ? `usuario_${id}` : 'usuario_novo';
  const payload = {
    id,
    nome: document.getElementById(`${prefixo}_nome`)?.value || '',
    email: document.getElementById(`${prefixo}_email`)?.value || '',
    cpf: document.getElementById(`${prefixo}_cpf`)?.value || '',
    telefone: document.getElementById(`${prefixo}_telefone`)?.value || '',
    perfil_id: document.getElementById(`${prefixo}_perfil`)?.value || '',
    status: document.getElementById(`${prefixo}_status`)?.value || 'pendente',
    password: document.querySelector('.admin-user-password-value')?.textContent?.trim() || ''
  };

  try {
    state.admin.loading = true;
    state.admin.message = '';
    renderAdministracao();

    const response = await chamarApi('saveAdminUser', payload);

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível salvar o usuário.'));
    }

    state.admin.editando.usuarios = '';
    state.admin.modalNovo = '';
    state.admin.usuarioModalEtapa = 'dados';
    state.admin.usuarioPermissoesId = '';
    state.admin.usuarioPermissoes = [];
    state.admin.credencialModal = {
      senhaTemporaria: '',
      senhaCopiada: false
    };
    const senhaProvisoria = response.data?.temporary_password || '';
    state.admin.message = senhaProvisoria
      ? `Usuário salvo. Senha provisória: ${senhaProvisoria}`
      : 'Usuário salvo e sincronizado com o Supabase Auth.';
    await carregarUsuariosAdmin();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao salvar usuário.';
    renderAdministracao();
  }
}

async function abrirPermissoesUsuarioAdmin(id, options = {}) {
  if (!pode('admin.usuarios', 'manage_permissions')) {
    state.admin.message = 'Seu usuário não possui permissão para alterar permissões individuais.';
    renderAdministracao();
    return;
  }

  try {
    state.admin.loading = true;
    if (!options.manterMensagem) {
      state.admin.message = '';
    }
    state.admin.usuarioPermissoesId = id;
    renderAdministracao();

    const chamadas = [
      chamarApi('listAdminUserPermissions', {
        usuario_id: id
      })
    ];

    const precisaCarregarPerfis = !state.admin.perfilPermissoes.length;

    if (precisaCarregarPerfis) {
      chamadas.push(chamarApi('listAdminPermissions'));
    }

    const [response, responsePerfis] = await Promise.all(chamadas);

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar permissões individuais.'));
    }

    if (responsePerfis && !responsePerfis.ok) {
      throw new Error(obterMensagemApi(responsePerfis, 'Não foi possível carregar permissões de perfil.'));
    }

    const recursos = response.data.recursos || [];
    const modulos = construirEstruturaPermissoesUsuario(recursos);
    const expandedModules = modulos.reduce((acc, modulo) => {
      acc[modulo.chave] = state.admin.permissionModal?.expandedModules?.[modulo.chave] ?? true;
      return acc;
    }, {});
    const originalEffects = mapearPermissoesUsuarioPorChave(response.data.permissoes || []);

    state.admin.recursos = recursos;
    state.admin.usuarioPermissoes = response.data.permissoes || [];
    if (responsePerfis) {
      state.admin.perfilPermissoes = responsePerfis.data.permissoes || [];
    }
    state.admin.permissionModal = {
      expandedModules,
      applying: false,
      moduleUpdating: '',
      originalEffects,
      draftEffects: { ...originalEffects },
      originalProfilePermissions: state.admin.permissionModal?.originalProfilePermissions || {},
      draftProfilePermissions: state.admin.permissionModal?.draftProfilePermissions || {},
      dirty: false,
      submitMode: ''
    };
    state.admin.modalNovo = 'usuarios';
    state.admin.editando.usuarios = id;
    state.admin.usuarioModalEtapa = 'permissoes';
    if (options.messageSuccess) {
      state.admin.message = options.messageSuccess;
    }
    state.admin.loading = false;
    renderAdministracao();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao carregar permissões individuais.';
    renderAdministracao();
  }
}

function fecharPermissoesUsuarioAdmin() {
  state.admin.usuarioModalEtapa = 'dados';
  renderAdministracao();
}

function alternarModuloPermissoesUsuario(moduloChave) {
  const scrollTop = obterScrollPermissoesUsuarioAdmin();
  state.admin.permissionModal.expandedModules[moduloChave] = !(state.admin.permissionModal.expandedModules?.[moduloChave] !== false);
  renderAdministracaoPreservandoScrollPermissoes(scrollTop);
}

function alternarCheckboxPermissaoUsuario(usuarioId, recursoChave, acao, marcado) {
  const scrollTop = obterScrollPermissoesUsuarioAdmin();
  const usuario = (state.admin.usuarios || []).find(item => item.id === usuarioId) || {};
  const perfilPermissoesPorChave = obterPermissoesPerfilPorChave(state.admin.perfilPermissoes || []);
  const modal = state.admin.permissionModal || {};
  const permissoesUsuarioPorChave = { ...(modal.draftEffects || {}) };
  const efeito = obterEfeitoAoAlternarPermissaoUsuario(
    usuario,
    perfilPermissoesPorChave,
    permissoesUsuarioPorChave,
    recursoChave,
    acao,
    marcado
  );

  const chave = `${recursoChave}:${acao}`;
  permissoesUsuarioPorChave[chave] = efeito;
  state.admin.permissionModal.draftEffects = permissoesUsuarioPorChave;
  state.admin.permissionModal.dirty = verificarAlteracoesPermissoesUsuario(
    state.admin.permissionModal.originalEffects,
    permissoesUsuarioPorChave
  );
  renderAdministracaoPreservandoScrollPermissoes(scrollTop);
}

function aplicarLoteModuloPermissoesUsuario(usuarioId, moduloChave, efeito) {
  const scrollTop = obterScrollPermissoesUsuarioAdmin();
  const modulos = construirEstruturaPermissoesUsuario(state.admin.recursos || []);
  const modulo = modulos.find(item => item.chave === moduloChave);

  if (!modulo) {
    return;
  }

  const draftEffects = { ...(state.admin.permissionModal.draftEffects || {}) };

  modulo.linhas.forEach(recurso => {
    obterAcoesDisponiveisRecurso(recurso).forEach(acao => {
      draftEffects[`${recurso.chave}:${acao}`] = efeito;
    });
  });

  state.admin.permissionModal.draftEffects = draftEffects;
  state.admin.permissionModal.dirty = verificarAlteracoesPermissoesUsuario(
    state.admin.permissionModal.originalEffects,
    draftEffects
  );
  renderAdministracaoPreservandoScrollPermissoes(scrollTop);
}

function alternarTodosModulosPermissoesUsuario(expandidos) {
  const scrollTop = obterScrollPermissoesUsuarioAdmin();
  const modulos = construirEstruturaPermissoesUsuario(state.admin.recursos || []);
  const expandedModules = modulos.reduce((acc, modulo) => {
    acc[modulo.chave] = expandidos;
    return acc;
  }, {});

  state.admin.permissionModal.expandedModules = expandedModules;
  renderAdministracaoPreservandoScrollPermissoes(scrollTop);
}

function aplicarLoteGlobalPermissoesUsuario(usuarioId, efeito) {
  const scrollTop = obterScrollPermissoesUsuarioAdmin();
  const modulos = construirEstruturaPermissoesUsuario(state.admin.recursos || []);
  const draftEffects = { ...(state.admin.permissionModal.draftEffects || {}) };

  modulos.forEach(modulo => {
    modulo.linhas.forEach(recurso => {
      obterAcoesDisponiveisRecurso(recurso).forEach(acao => {
        draftEffects[`${recurso.chave}:${acao}`] = efeito;
      });
    });
  });

  state.admin.permissionModal.draftEffects = draftEffects;
  state.admin.permissionModal.dirty = verificarAlteracoesPermissoesUsuario(
    state.admin.permissionModal.originalEffects,
    draftEffects
  );
  renderAdministracaoPreservandoScrollPermissoes(scrollTop);
}

async function salvarPermissoesUsuarioAdmin(usuarioId, fecharAoSalvar = false) {
  const originalEffects = state.admin.permissionModal.originalEffects || {};
  const draftEffects = state.admin.permissionModal.draftEffects || {};
  const chaves = new Set([
    ...Object.keys(originalEffects),
    ...Object.keys(draftEffects)
  ]);
  const alteracoes = Array.from(chaves)
    .map(chave => {
      const [recurso_chave, acao] = chave.split(':');
      return {
        recurso_chave,
        acao,
        anterior: originalEffects[chave] || '',
        proximo: draftEffects[chave] || ''
      };
    })
    .filter(item => item.anterior !== item.proximo);

  if (!alteracoes.length) {
    return;
  }

  try {
    state.admin.permissionModal.applying = true;
    state.admin.message = '';
    state.admin.permissionModal.submitMode = fecharAoSalvar ? 'close' : 'stay';
    renderAdministracao();

    const response = await chamarApi('saveAdminUserPermissionsBatch', {
      usuario_id: usuarioId,
      alteracoes: alteracoes.map(item => ({
        recurso_chave: item.recurso_chave,
        acao: item.acao,
        efeito: item.proximo
      }))
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível salvar as permissões adicionais.'));
    }

    await atualizarResumoUsuariosAdmin();
    if (fecharAoSalvar) {
      state.admin.message = 'Permissões adicionais atualizadas.';
      resetarFluxoModalUsuarioAdmin(false);
      renderAdministracao();
      return;
    }

    await abrirPermissoesUsuarioAdmin(usuarioId, {
      manterMensagem: true,
      messageSuccess: 'Permissões adicionais atualizadas.'
    });
  } catch (erro) {
    state.admin.permissionModal.applying = false;
    state.admin.permissionModal.submitMode = '';
    state.admin.message = erro.message || 'Erro ao salvar permissões adicionais.';
    renderAdministracao();
  }
}

async function carregarPerfisAdmin() {
  state.admin.loading = true;
  state.admin.message = '';
  renderAdministracao();

  try {
    const response = await chamarApi('listAdminProfiles');

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar perfis.'));
    }

    state.admin.perfis = response.data.records || [];
    if (Array.isArray(response.data.permissoes)) {
      state.admin.perfilPermissoes = response.data.permissoes;
    }
    state.admin.loading = false;
    renderAdministracao();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao carregar perfis.';
    renderAdministracao();
  }
}

function editarPerfilAdmin(id) {
  const perfil = (state.admin.perfis || []).find(item => item.id === id) || {};

  state.admin.editando.perfis = id;
  state.admin.modalNovo = 'perfis';
  state.admin.perfilModalEtapa = 'dados';
  state.admin.perfilModalDraft = {
    slug: perfil.slug || '',
    nome: perfil.nome || '',
    descricao: perfil.descricao || '',
    status: perfil.status || 'ativo'
  };
  state.admin.message = '';
  atualizarRotaCadastroAdmin('perfis', id, 'edit');
  renderAdministracao();
}

async function salvarPerfilAdmin(id) {
  const payload = obterDadosPerfilModalAdmin(id);
  const mensagemValidacao = validarDadosBasicosPerfilAdmin(payload);

  if (mensagemValidacao) {
    state.admin.message = mensagemValidacao;
    renderAdministracao();
    return;
  }

  try {
    state.admin.loading = true;
    state.admin.message = '';
    renderAdministracao();

    const response = await chamarApi('saveAdminProfile', payload);

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível salvar o perfil.'));
    }

    state.admin.editando.perfis = '';
    state.admin.modalNovo = '';
    state.admin.perfilModalEtapa = 'dados';
    state.admin.perfilModalDraft = {
      slug: '',
      nome: '',
      descricao: '',
      status: 'ativo'
    };
    state.admin.message = 'Perfil salvo.';
    await carregarPerfisAdmin();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao salvar perfil.';
    renderAdministracao();
  }
}

async function excluirPerfilAdmin(id) {
  const perfil = (state.admin.perfis || []).find(item => item.id === id) || {};
  const nomePerfil = perfil.nome || perfil.slug || 'este perfil';

  if (!id) {
    state.admin.message = 'Perfil não identificado para exclusão.';
    renderAdministracao();
    return;
  }

  if (!pode('admin.perfis', 'delete')) {
    state.admin.message = 'Seu usuário não possui permissão para excluir perfis.';
    renderAdministracao();
    return;
  }

  if (perfil.sistema) {
    state.admin.message = 'Perfis do sistema não podem ser excluídos.';
    renderAdministracao();
    return;
  }

  const confirmado = window.confirm(
    `Excluir o perfil "${nomePerfil}"? Esta ação não pode ser desfeita.`
  );

  if (!confirmado) {
    return;
  }

  try {
    state.admin.loading = true;
    state.admin.message = '';
    renderAdministracao();

    const response = await chamarApi('deleteAdminProfile', { id });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível excluir o perfil.'));
    }

    state.admin.editando.perfis = '';
    state.admin.modalNovo = '';
    state.admin.perfilModalEtapa = 'dados';
    state.admin.perfilModalDraft = {
      slug: '',
      nome: '',
      descricao: '',
      status: 'ativo'
    };
    state.admin.perfilPermissoesId = '';
    state.admin.permissionModal = {
      expandedModules: {},
      applying: false,
      moduleUpdating: '',
      originalEffects: state.admin.permissionModal?.originalEffects || {},
      draftEffects: state.admin.permissionModal?.draftEffects || {},
      originalProfilePermissions: {},
      draftProfilePermissions: {},
      dirty: false,
      submitMode: ''
    };
    state.admin.message = 'Perfil excluído.';
    await carregarPerfisAdmin();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao excluir perfil.';
    renderAdministracao();
  }
}

async function salvarNovoPerfilComPermissoesAdmin() {
  const payload = {
    id: '',
    slug: state.admin.perfilModalDraft?.slug || '',
    nome: state.admin.perfilModalDraft?.nome || '',
    descricao: state.admin.perfilModalDraft?.descricao || '',
    nivel: '20',
    status: state.admin.perfilModalDraft?.status || 'ativo'
  };
  const mensagemValidacao = validarDadosBasicosPerfilAdmin(payload);
  const draftPermissions = state.admin.permissionModal?.draftProfilePermissions || {};
  const permissoesSelecionadas = Object.keys(draftPermissions).filter(chave => Boolean(draftPermissions[chave]));

  if (mensagemValidacao) {
    state.admin.message = mensagemValidacao;
    state.admin.perfilModalEtapa = 'dados';
    renderAdministracao();
    return;
  }

  if (!permissoesSelecionadas.length) {
    state.admin.message = 'Selecione ao menos uma permissão para criar o perfil.';
    renderAdministracao();
    return;
  }

  try {
    state.admin.permissionModal.applying = true;
    state.admin.permissionModal.submitMode = 'create';
    state.admin.message = '';
    renderAdministracao();

    const perfilResponse = await chamarApi('saveAdminProfile', payload);

    if (!perfilResponse.ok) {
      throw new Error(obterMensagemApi(perfilResponse, 'Não foi possível criar o perfil.'));
    }

    const perfilCriado = perfilResponse.data?.record || {};

    if (!perfilCriado.id) {
      throw new Error('Perfil criado, mas o identificador interno não foi retornado.');
    }

    const permissoesResponse = await chamarApi('saveAdminProfilePermissionsBatch', {
      perfil_id: perfilCriado.id,
      alteracoes: permissoesSelecionadas.map(chave => {
        const [recurso_chave, acao] = chave.split(':');
        return {
          recurso_chave,
          acao,
          permitido: true
        };
      })
    });

    if (!permissoesResponse.ok) {
      throw new Error(obterMensagemApi(permissoesResponse, 'Perfil criado, mas não foi possível salvar as permissões.'));
    }

    state.admin.editando.perfis = '';
    state.admin.modalNovo = '';
    state.admin.perfilModalEtapa = 'dados';
    state.admin.perfilModalDraft = {
      slug: '',
      nome: '',
      descricao: '',
      status: 'ativo'
    };
    state.admin.perfilPermissoesId = '';
    state.admin.permissionModal = {
      expandedModules: {},
      applying: false,
      moduleUpdating: '',
      originalEffects: state.admin.permissionModal?.originalEffects || {},
      draftEffects: state.admin.permissionModal?.draftEffects || {},
      originalProfilePermissions: {},
      draftProfilePermissions: {},
      dirty: false,
      submitMode: ''
    };
    state.admin.message = 'Perfil criado com permissões.';
    await carregarPerfisAdmin();
  } catch (erro) {
    state.admin.permissionModal.applying = false;
    state.admin.permissionModal.submitMode = '';
    state.admin.message = erro.message || 'Erro ao criar perfil.';
    renderAdministracao();
  }
}

async function carregarPermissoesAdmin() {
  state.admin.loading = true;
  state.admin.message = '';
  renderAdministracao();

  try {
    const response = await chamarApi('listAdminPermissions');

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar permissões.'));
    }

    state.admin.recursos = response.data.recursos || [];
    state.admin.perfis = response.data.perfis || [];
    state.admin.perfilPermissoes = response.data.permissoes || [];
    state.admin.loading = false;
    renderAdministracao();
  } catch (erro) {
    state.admin.loading = false;
    state.admin.message = erro.message || 'Erro ao carregar permissões.';
    renderAdministracao();
  }
}

async function alternarStatusModuloAdmin(id, status) {
  const modulo = (state.admin.modulos || []).find(item => item.id === id);

  if (!modulo) {
    state.admin.message = 'Módulo não encontrado.';
    renderAdministracao();
    return;
  }

  if (!modulo.bloqueavel && status === 'inativo') {
    state.admin.message = 'O módulo Administração não pode ser inativado.';
    renderAdministracao();
    return;
  }

  try {
    state.admin.moduloAtualizando = id;
    state.admin.message = '';
    renderAdministracao();

    const response = await chamarApi('updateAdminModuleStatus', {
      id,
      status
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível atualizar o módulo.'));
    }

    await carregarDadosIniciaisSilencioso();
    state.admin.message = `Módulo ${status === 'inativo' ? 'inativado' : 'reativado'}.`;
    await carregarModulosAdmin(true);
  } catch (erro) {
    state.admin.moduloAtualizando = '';
    state.admin.message = erro.message || 'Erro ao atualizar módulo.';
    renderAdministracao();
  }
}

async function salvarRegistroAdmin(entidade, id) {
  const prefixo = id ? `${entidade}_${id}` : `${entidade}_novo`;
  const nome = document.getElementById(`${prefixo}_nome`)?.value || '';
  const descricao = document.getElementById(`${prefixo}_descricao`)?.value || '';
  const status = document.getElementById(`${prefixo}_status`)?.value || 'ativo';

  try {
    const response = await chamarApi('saveAdminRecord', {
      entidade,
      id,
      nome,
      descricao,
      status
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível salvar.'));
    }

    state.admin.message = 'Registro salvo.';
    state.admin.editando[entidade] = '';
    state.admin.modalNovo = '';
    await carregarRegistrosAdmin(entidade);
  } catch (erro) {
    state.admin.message = erro.message || 'Erro ao salvar registro.';
    renderAdministracao();
  }
}

function renderConfigInput(item, inputId, disabled) {
  const valor = escapeAttr(item.valor || '');

  if (['ar_link_com_desconto_template', 'ar_link_sem_desconto_template', 'ar_link_templates_json'].indexOf(item.chave) >= 0) {
    return `<textarea id="${inputId}" class="config-input config-textarea" rows="${item.chave === 'ar_link_templates_json' ? '7' : '3'}" ${disabled}>${valor}</textarea>`;
  }

  if (item.tipo === 'cor') {
    return `
      <input id="${inputId}" class="config-input color-input" type="color" value="${valor || '#000000'}" ${disabled}>
    `;
  }

  if (item.tipo === 'numero') {
    return `<input id="${inputId}" class="config-input" type="number" min="0" step="1" value="${valor}" ${disabled}>`;
  }

  if (item.tipo === 'booleano') {
    return `
      <select id="${inputId}" class="config-input" ${disabled}>
        <option value="sim" ${item.valor === 'sim' ? 'selected' : ''}>sim</option>
        <option value="nao" ${item.valor === 'nao' ? 'selected' : ''}>nao</option>
      </select>
    `;
  }

  if (item.chave === 'modo_visual_padrao') {
    return `
      <select id="${inputId}" class="config-input" ${disabled}>
        <option value="claro" ${item.valor === 'claro' ? 'selected' : ''}>claro</option>
        <option value="escuro" ${item.valor === 'escuro' ? 'selected' : ''}>escuro</option>
      </select>
    `;
  }

  return `<input id="${inputId}" class="config-input" type="text" value="${valor}" ${disabled}>`;
}

async function salvarConfigAdmin(chave) {
  const input = document.getElementById(`config_${chave}`);

  if (!input) return;

  try {
    const response = await chamarApi('saveConfig', {
      chave,
      valor: input.value
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível salvar.'));
    }

    state.config = response.data.config || state.config;
    aplicarConfigVisual();
    state.admin.message = 'Configuração salva.';
    await abrirAdministracao(true);
  } catch (erro) {
    state.admin.message = erro.message || 'Erro ao salvar configuração.';
    renderAdministracao();
  }
}

async function restaurarCoresPadrao() {
  try {
    const response = await chamarApi('restoreDefaultColors');

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível restaurar as cores.'));
    }

    state.config = response.data.config || state.config;
    aplicarConfigVisual();
    state.admin.message = 'Cores padrão restauradas.';
    await abrirAdministracao(true);
  } catch (erro) {
    state.admin.message = erro.message || 'Erro ao restaurar cores.';
    renderAdministracao();
  }
}

async function abrirLinksUteis(idModulo) {
  const meta = obterMetaLinks(idModulo);
  state.links.escopo = meta.escopo;
  state.links.titulo = meta.titulo;
  state.links.message = '';
  state.links.modalNovo = false;
  state.links.modalLinkId = '';
  await carregarLinksUteis();
}

function obterMetaLinks(idModulo) {
  const metas = {
    'links-ar': {
      escopo: 'ar',
      titulo: 'Links Úteis — AR / Certificação'
    },
    'links-gestao': {
      escopo: 'gestao',
      titulo: 'Links Úteis — Gestão'
    },
    'links-corretora': {
      escopo: 'corretora',
      titulo: 'Links Úteis — Corretora'
    }
  };

  return metas[idModulo] || metas['links-corretora'];
}

async function carregarLinksUteis() {
  state.links.loading = true;
  renderLinksUteis();

  try {
    const response = await chamarApi('getLinksData', {
      escopo: state.links.escopo,
      categoria: state.links.filtros.categoria,
      grupo: state.links.filtros.grupo,
      status: state.links.filtros.status
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar os links.'));
    }

    state.links.categorias = response.data.categorias || [];
    state.links.grupos = response.data.grupos || [];
    state.links.items = response.data.links || [];
    state.links.limiteFavoritos = response.data.limite_favoritos || 5;
    state.links.loading = false;
    renderLinksUteis();
  } catch (erro) {
    state.links.loading = false;
    state.links.message = erro.message || 'Erro ao carregar links.';
    renderLinksUteis();
  }
}

function renderLinksUteis() {
  const gestor = state.usuario?.perfil === 'gestor';
  const nomeSistema = state.config?.nome_sistema || 'PAINEL TRANSMARES';
  const subtitulo = state.config?.subtitulo_sistema || 'Central operacional da Transmares Corretora de Seguros';

  document.getElementById('app').innerHTML = `
    <main class="dashboard">
      <header class="topbar">
        ${renderHeaderLogo()}
        <div class="brand">
          <h1>${escapeHtml(nomeSistema)}</h1>
          <p>${escapeHtml(subtitulo)}</p>
        </div>

        <div class="user-box">
          <strong>${escapeHtml(state.usuario.nome || '')}</strong><br>
          ${escapeHtml(state.usuario.email || '')}<br>
          <button class="secondary-btn" type="button" onclick="navegarHome()">Voltar</button>
        </div>
      </header>

      <section class="admin-panel">
        <div class="admin-panel-header">
          <div>
            <h2>${escapeHtml(state.links.titulo || 'Links Úteis')}</h2>
            <p>${gestor ? 'Listagem e cadastro de links.' : 'Consulte os links disponíveis.'}</p>
          </div>
        </div>

        <div class="links-toolbar">
          <select class="config-input" onchange="alterarFiltroLinks('categoria', this.value)">
            <option value="">Todas as categorias</option>
            ${state.links.categorias.map(item => `<option value="${escapeAttr(item.nome)}" ${state.links.filtros.categoria === item.nome ? 'selected' : ''}>${escapeHtml(item.nome)}</option>`).join('')}
          </select>

          <select class="config-input" onchange="alterarFiltroLinks('grupo', this.value)">
            <option value="">Todos os grupos</option>
            ${state.links.grupos.map(item => `<option value="${escapeAttr(item.nome)}" ${state.links.filtros.grupo === item.nome ? 'selected' : ''}>${escapeHtml(item.nome)}</option>`).join('')}
          </select>

          ${gestor ? `
            <select class="config-input" onchange="alterarFiltroLinks('status', this.value)">
              <option value="">Todos os status</option>
              <option value="ativo" ${state.links.filtros.status === 'ativo' ? 'selected' : ''}>ativos</option>
              <option value="inativo" ${state.links.filtros.status === 'inativo' ? 'selected' : ''}>inativos</option>
            </select>
            <button class="add-small-btn" type="button" onclick="abrirModalNovoLink()">+ Adicionar</button>
          ` : ''}
        </div>

        <p class="quick-link-empty">Favoritos: ${contarFavoritosLinks()} de ${state.links.limiteFavoritos}</p>
        ${state.links.message ? `<p class="admin-message">${escapeHtml(state.links.message)}</p>` : ''}
        ${state.links.loading ? renderHubLoading('Carregando links...') : renderListaLinksUteis(gestor)}
        ${renderModalNovoLink()}
      </section>
    </main>
  `;
}

function renderListaLinksUteis(gestor) {
  if (!state.links.items.length) {
    return '<p class="quick-link-empty">Nenhum link cadastrado.</p>';
  }

  return `
    <div class="links-list">
      ${state.links.items.map(item => renderLinkItem(item, gestor)).join('')}
    </div>
  `;
}

function renderLinkItem(item, gestor) {
  return `
    <article class="link-row status-line-${escapeAttr(item.status || 'inativo')}">
      <div class="link-main">
        <span class="card-taxonomy">${escapeHtml(item.categoria || 'Sem categoria')} | ${escapeHtml(item.grupo || 'Sem grupo')}</span>
        <h3>${escapeHtml(item.titulo || 'Link')}</h3>
        <p>${escapeHtml(item.descricao || '')}</p>
          <div class="link-buttons">
            <a class="link-sub-btn" href="${escapeAttr(item.url)}" target="_blank" rel="noopener">Abrir</a>
            <button id="copy_${escapeAttr(item.id)}" class="link-sub-btn" type="button" onclick="copiarLink('${escapeAttr(item.id)}', '${escapeAttr(item.url)}')">Copiar</button>
            <button id="fav_${escapeAttr(item.id)}" class="link-sub-btn favorite-btn ${item.favorito ? 'active' : ''}" type="button" onclick="alternarFavoritoLink('${escapeAttr(item.id)}', ${item.favorito ? 'false' : 'true'})">${item.favorito ? 'Favorito' : 'Favoritar'}</button>
          </div>
      </div>

      ${gestor ? `
        <div class="crud-actions">
          <button class="icon-btn" type="button" onclick="editarLinkItem('${escapeAttr(item.id)}')" title="Editar" aria-label="Editar link">✎</button>
        </div>
      ` : ''}
    </article>
  `;
}

function renderModalNovoLink() {
  if (!state.links.modalNovo) {
    return '';
  }
  const erros = state.links.erros || {};
  const botaoTexto = state.links.salvo ? 'Salvo' : (state.links.salvando ? 'Salvando...' : 'Salvar');
  const item = obterLinkModalAtual();
  const editando = Boolean(item.id);

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Adicionar link">
      <section class="small-modal link-modal">
        <div class="small-modal-header">
          <h3>${editando ? 'Editar link' : 'Adicionar link'}</h3>
          <button class="icon-btn" type="button" onclick="fecharModalNovoLink()" title="Fechar" aria-label="Fechar">×</button>
        </div>

        <label><span>Título</span><input id="novo_link_titulo" class="config-input" type="text" value="${escapeAttr(item.titulo || '')}">${renderErroCampo(erros.titulo)}</label>
        <label><span>Descrição</span><input id="novo_link_descricao" class="config-input" type="text" value="${escapeAttr(item.descricao || '')}"></label>
        <label><span>URL</span><input id="novo_link_url" class="config-input" type="url" placeholder="https://" value="${escapeAttr(item.url || '')}">${renderErroCampo(erros.url)}</label>
        <label><span>Categoria</span><select id="novo_link_categoria" class="config-input"><option value="">Sem categoria</option>${state.links.categorias.map(categoria => `<option value="${escapeAttr(categoria.nome)}" ${item.categoria === categoria.nome ? 'selected' : ''}>${escapeHtml(categoria.nome)}</option>`).join('')}</select></label>
        <label><span>Grupo</span><select id="novo_link_grupo" class="config-input"><option value="">Sem grupo</option>${state.links.grupos.map(grupo => `<option value="${escapeAttr(grupo.nome)}" ${item.grupo === grupo.nome ? 'selected' : ''}>${escapeHtml(grupo.nome)}</option>`).join('')}</select></label>
        <label><span>Status</span><select id="novo_link_status" class="config-input"><option value="ativo" ${item.status !== 'inativo' ? 'selected' : ''}>ativo</option><option value="inativo" ${item.status === 'inativo' ? 'selected' : ''}>inativo</option></select></label>

        <div class="small-modal-actions">
          <button class="secondary-btn" type="button" onclick="fecharModalNovoLink()">Cancelar</button>
          <button id="novo_link_salvar" class="save-btn saving-btn ${state.links.salvando ? 'is-saving' : ''} ${state.links.salvo ? 'is-saved' : ''}" type="button" onclick="salvarLinkItem('${escapeAttr(item.id || '')}')" ${state.links.salvando ? 'disabled' : ''}>${botaoTexto}</button>
        </div>
      </section>
    </div>
  `;
}

function obterLinkModalAtual() {
  if (!state.links.modalLinkId) {
    return {};
  }

  return state.links.items.find(item => item.id === state.links.modalLinkId) || {};
}

function renderErroCampo(mensagem) {
  return mensagem ? `<small class="field-error">${escapeHtml(mensagem)}</small>` : '';
}

function alterarFiltroLinks(chave, valor) {
  state.links.filtros[chave] = valor;
  carregarLinksUteis();
}

function editarLinkItem(id) {
  state.links.modalNovo = true;
  state.links.modalLinkId = id;
  state.links.erros = {};
  state.links.salvando = false;
  state.links.salvo = false;
  renderLinksUteis();
}

function abrirModalNovoLink() {
  state.links.modalNovo = true;
  state.links.modalLinkId = '';
  state.links.erros = {};
  state.links.salvando = false;
  state.links.salvo = false;
  renderLinksUteis();
}

function fecharModalNovoLink() {
  state.links.modalNovo = false;
  state.links.modalLinkId = '';
  state.links.erros = {};
  state.links.salvando = false;
  state.links.salvo = false;
  renderLinksUteis();
}

async function salvarLinkItem(id) {
  const payload = {
    id,
    escopo: state.links.escopo,
    titulo: document.getElementById('novo_link_titulo')?.value || '',
    descricao: document.getElementById('novo_link_descricao')?.value || '',
    url: document.getElementById('novo_link_url')?.value || '',
    categoria: document.getElementById('novo_link_categoria')?.value || '',
    grupo: document.getElementById('novo_link_grupo')?.value || '',
    status: document.getElementById('novo_link_status')?.value || 'ativo'
  };
  const erros = validarLinkPayload(payload);

  if (Object.keys(erros).length) {
    state.links.erros = erros;
    state.links.salvando = false;
    state.links.salvo = false;
    renderLinksUteis();
    return;
  }

  try {
    state.links.erros = {};
    state.links.salvando = true;
    state.links.salvo = false;
    atualizarBotaoSalvarLink('Salvando...', true, 'is-saving');

    const response = await chamarApi('saveLinkItem', payload);

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível salvar o link.'));
    }

    state.links.erros = {};
    state.links.salvando = false;
    state.links.salvo = true;
    atualizarBotaoSalvarLink('Salvo', true, 'is-saved');
    await esperar(650);
    state.links.modalNovo = false;
    state.links.modalLinkId = '';
    state.links.salvo = false;
    await carregarLinksUteis();
  } catch (erro) {
    state.links.salvando = false;
    state.links.salvo = false;
    atualizarBotaoSalvarLink('Salvar', false, '');
    state.links.message = erro.message || 'Erro ao salvar link.';
    renderLinksUteis();
  }
}

async function copiarLink(id, url) {
  const botao = document.getElementById(`copy_${id}`);

  try {
    await navigator.clipboard.writeText(url);

    if (botao) {
      botao.textContent = 'Copiado';
      botao.classList.add('copied');
      window.setTimeout(() => {
        botao.textContent = 'Copiar';
        botao.classList.remove('copied');
      }, 1400);
    }
  } catch (erro) {
    if (botao) {
      botao.textContent = 'Erro';
      window.setTimeout(() => {
        botao.textContent = 'Copiar';
      }, 1400);
    }
  }
}

async function alternarFavoritoLink(id, favorito) {
  const botao = document.getElementById(`fav_${id}`);

  if (botao) {
    botao.textContent = favorito ? 'Salvando' : 'Removendo';
    botao.disabled = true;
  }

  try {
    const response = await chamarApi('toggleFavoriteLink', {
      id,
      favorito
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível alterar o favorito.'));
    }

    await carregarDadosIniciaisSilencioso();
    await carregarLinksUteis();
  } catch (erro) {
    state.links.message = erro.message || 'Erro ao alterar favorito.';
    renderLinksUteis();
  }
}

function contarFavoritosLinks() {
  return state.links.items.filter(item => item.favorito).length;
}

async function carregarDadosIniciaisSilencioso({ usuarioEsperadoId = '' } = {}) {
  const response = await chamarApi('getInitialData');

  if (!response.ok) {
    return {
      ok: false,
      message: obterMensagemApi(response, 'Não foi possível atualizar seus acessos.')
    };
  }

  if (usuarioEsperadoId && state.usuario?.id !== usuarioEsperadoId) {
    return {
      ok: false,
      cancelado: true,
      message: ''
    };
  }

  state.usuario = response.data.usuario;
  state.config = response.data.config;
  state.cards = response.data.cards || [];
  state.avisos = response.data.avisos || [];
  state.aniversariantes = response.data.aniversariantes || [];
  state.favoritos = response.data.favoritos || [];
  state.meta = response.data.meta || null;
  state.permissions = response.data.permissions || normalizarPermissoes([]);
  sincronizarContextoInicialHub();
  return { ok: true };
}

function atualizarBotaoSalvarLink(texto, disabled, classe) {
  const botao = document.getElementById('novo_link_salvar');

  if (!botao) {
    return;
  }

  botao.textContent = texto;
  botao.disabled = disabled;
  botao.classList.remove('is-saving', 'is-saved');

  if (classe) {
    botao.classList.add(classe);
  }
}

function validarLinkPayload(payload) {
  const erros = {};

  if (!String(payload.titulo || '').trim()) {
    erros.titulo = 'Informe o título do link.';
  }

  if (!/^https?:\/\//i.test(String(payload.url || '').trim())) {
    erros.url = 'Use uma URL começando com http:// ou https://.';
  }

  return erros;
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function abrirCentralSenhas() {
  state.passwords.message = '';
  state.passwords.modalAberto = false;
  state.passwords.modalId = '';
  await carregarCentralSenhas();
}

async function carregarCentralSenhas() {
  state.passwords.loading = true;
  renderCentralSenhas();

  try {
    const response = await chamarApi('getPasswordsData', {
      categoria: state.passwords.filtros.categoria,
      grupo: state.passwords.filtros.grupo,
      status: state.passwords.filtros.status
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar a Central de Senhas.'));
    }

    state.passwords.categorias = response.data.categorias || [];
    state.passwords.grupos = response.data.grupos || [];
    state.passwords.items = response.data.acessos || [];
    state.passwords.resumo = response.data.resumo || { total: 0, ativos: 0, inativos: 0 };
    state.passwords.historico = response.data.historico || [];
    state.passwords.loading = false;
    renderCentralSenhas();
  } catch (erro) {
    state.passwords.loading = false;
    state.passwords.message = erro.message || 'Erro ao carregar a Central de Senhas.';
    renderCentralSenhas();
  }
}

function renderCentralSenhas() {
  const podeGerenciar = pode('central_senhas', 'create') || pode('central_senhas', 'update') || pode('central_senhas', 'delete');
  const podeVerSenha = pode('central_senhas', 'view_secret');
  const nomeSistema = state.config?.nome_sistema || 'PAINEL TRANSMARES';
  const subtitulo = state.config?.subtitulo_sistema || 'Central operacional da Transmares Corretora de Seguros';

  document.getElementById('app').innerHTML = `
    <main class="dashboard">
      <header class="topbar">
        ${renderHeaderLogo()}
        <div class="brand">
          <h1>${escapeHtml(nomeSistema)}</h1>
          <p>${escapeHtml(subtitulo)}</p>
        </div>

        <div class="user-box">
          <strong>${escapeHtml(state.usuario.nome || '')}</strong><br>
          ${escapeHtml(state.usuario.email || '')}<br>
          <button class="secondary-btn" type="button" onclick="navegarHome()">Voltar</button>
        </div>
      </header>

      <section class="admin-panel">
        <div class="admin-panel-header">
          <div>
            <h2>Central de Senhas</h2>
            <p>${podeGerenciar ? 'Listagem e cadastro de acessos.' : 'Consulte os acessos disponíveis.'}</p>
          </div>
          ${podeGerenciar ? `
            <div class="module-tabs" role="group" aria-label="Visualização da Central de Senhas">
              <button class="${state.passwords.aba === 'acessos' ? 'active' : ''}" type="button" onclick="selecionarAbaSenhas('acessos')">Acessos</button>
              <button class="${state.passwords.aba === 'historico' ? 'active' : ''}" type="button" onclick="selecionarAbaSenhas('historico')">Histórico</button>
            </div>
          ` : ''}
        </div>

        ${renderResumoSenhas(podeGerenciar)}
        ${state.passwords.aba === 'acessos' ? renderToolbarSenhas(podeGerenciar) : ''}

        ${state.passwords.message ? `<p class="admin-message">${escapeHtml(state.passwords.message)}</p>` : ''}
        ${state.passwords.loading ? renderHubLoading('Carregando acessos...') : renderConteudoSenhas(podeGerenciar, podeVerSenha)}
        ${state.passwords.aba === 'acessos' ? renderModalSenha() : ''}
      </section>
    </main>
  `;
}

function renderResumoSenhas(gestor) {
  if (!gestor) {
    return '';
  }

  const resumo = state.passwords.resumo || {};

  return `
    <div class="module-stats" aria-label="Resumo da Central de Senhas">
      <span><strong>${Number(resumo.total || 0)}</strong> cadastrados</span>
      <span><strong>${Number(resumo.ativos || 0)}</strong> ativos</span>
      <span><strong>${Number(resumo.inativos || 0)}</strong> inativos</span>
    </div>
  `;
}

function renderToolbarSenhas(gestor) {
  return `
    <div class="links-toolbar">
      <select class="config-input" onchange="alterarFiltroSenha('categoria', this.value)">
        <option value="">Todas as categorias</option>
        ${state.passwords.categorias.map(item => `<option value="${escapeAttr(item.nome)}" ${state.passwords.filtros.categoria === item.nome ? 'selected' : ''}>${escapeHtml(item.nome)}</option>`).join('')}
      </select>

      <select class="config-input" onchange="alterarFiltroSenha('grupo', this.value)">
        <option value="">Todos os grupos</option>
        ${state.passwords.grupos.map(item => `<option value="${escapeAttr(item.nome)}" ${state.passwords.filtros.grupo === item.nome ? 'selected' : ''}>${escapeHtml(item.nome)}</option>`).join('')}
      </select>

      ${gestor ? `
        <select class="config-input" onchange="alterarFiltroSenha('status', this.value)">
          <option value="">Todos os status</option>
          <option value="ativo" ${state.passwords.filtros.status === 'ativo' ? 'selected' : ''}>ativos</option>
          <option value="inativo" ${state.passwords.filtros.status === 'inativo' ? 'selected' : ''}>inativos</option>
        </select>
        <button class="add-small-btn" type="button" onclick="abrirModalSenha('')">+ Adicionar</button>
      ` : ''}
    </div>
  `;
}

function renderConteudoSenhas(gestor, podeVerSenha) {
  if (state.passwords.aba === 'historico' && gestor) {
    return renderHistoricoSenhas();
  }

  return renderListaSenhas(gestor, podeVerSenha);
}

function renderListaSenhas(gestor, podeVerSenha) {
  if (!state.passwords.items.length) {
    return '<p class="quick-link-empty">Nenhum acesso cadastrado.</p>';
  }

  return `<div class="password-list">${state.passwords.items.map(item => renderSenhaItem(item, gestor, podeVerSenha)).join('')}</div>`;
}

function renderSenhaItem(item, gestor, podeVerSenha) {
  const podeEditar = pode('central_senhas', 'update');
  const podeExcluir = pode('central_senhas', 'delete');
  const senhaTexto = podeVerSenha ? escapeHtml(item.senha || '-') : 'Senha oculta por permissão';
  const senhaAjuda = podeVerSenha ? '' : '<small>Seu acesso permite consultar este item, mas não visualizar a senha.</small>';

  return `
    <article class="password-row status-line-${escapeAttr(item.status || 'inativo')}">
      <div>
        <span class="card-taxonomy">${escapeHtml(item.categoria || 'Sem categoria')} | ${escapeHtml(item.grupo || 'Sem grupo')}</span>
        <h3>${escapeHtml(item.titulo || 'Acesso')}</h3>
        <p>${escapeHtml(item.descricao || '')}</p>
      </div>

      <div class="password-fields">
        <span>Login: ${escapeHtml(item.login || '-')}</span>
        <span>Senha: ${senhaTexto}</span>
        ${senhaAjuda}
        ${item.url ? `
          <div class="link-buttons">
            <a class="link-sub-btn" href="${escapeAttr(item.url)}" target="_blank" rel="noopener">Abrir</a>
            <button id="copy_access_${escapeAttr(item.id)}" class="link-sub-btn" type="button" onclick="copiarLink('access_${escapeAttr(item.id)}', '${escapeAttr(item.url)}')">Copiar</button>
          </div>
        ` : ''}
      </div>

      ${gestor ? `
        <div class="crud-actions">
          ${podeEditar ? `<button class="icon-btn" type="button" onclick="abrirModalSenha('${escapeAttr(item.id)}')" title="Editar" aria-label="Editar acesso">✎</button>` : ''}
          ${podeExcluir ? `<button class="secondary-btn danger" type="button" onclick="excluirSenhaItem('${escapeAttr(item.id)}')" title="Excluir acesso" aria-label="Excluir acesso">Excluir</button>` : ''}
        </div>
      ` : ''}
    </article>
  `;
}

function renderHistoricoSenhas() {
  if (!state.passwords.historico.length) {
    return '<p class="quick-link-empty">Nenhuma alteração registrada na Central de Senhas.</p>';
  }

  return `
    <div class="audit-list">
      ${state.passwords.historico.map(item => `
        <article class="audit-row">
          <span>${escapeHtml(item.data_evento || '-')}</span>
          <strong>${escapeHtml(item.titulo || 'Acesso')}</strong>
          <span>${escapeHtml(item.operacao === 'criacao' ? 'criação' : 'edição')}</span>
          <span>${escapeHtml(obterRotuloStatusHub(item.status, '—'))}</span>
          <small>${escapeHtml(item.usuario_email || '')}</small>
        </article>
      `).join('')}
    </div>
  `;
}

function renderModalSenha() {
  if (!state.passwords.modalAberto) {
    return '';
  }

  const item = obterSenhaModalAtual();
  const erros = state.passwords.erros || {};
  const editando = Boolean(item.id);
  const botaoTexto = state.passwords.salvo ? 'Salvo' : (state.passwords.salvando ? 'Salvando...' : 'Salvar');

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Acesso">
      <section class="small-modal link-modal">
        <div class="small-modal-header">
          <h3>${editando ? 'Editar acesso' : 'Adicionar acesso'}</h3>
          <button class="icon-btn" type="button" onclick="fecharModalSenha()" title="Fechar" aria-label="Fechar">×</button>
        </div>

        <label><span>Título</span><input id="senha_titulo" class="config-input" type="text" value="${escapeAttr(item.titulo || '')}">${renderErroCampo(erros.titulo)}</label>
        <label><span>Observações adicionais</span><input id="senha_descricao" class="config-input" type="text" value="${escapeAttr(item.descricao || '')}"></label>
        <label><span>URL/Sistema</span><input id="senha_url" class="config-input" type="url" placeholder="https://" value="${escapeAttr(item.url || '')}">${renderErroCampo(erros.url)}</label>
        <label><span>Login</span><input id="senha_login" class="config-input" type="text" value="${escapeAttr(item.login || '')}">${renderErroCampo(erros.login)}</label>
        <label><span>Senha</span><input id="senha_senha" class="config-input" type="text" value="${escapeAttr(item.senha || '')}">${renderErroCampo(erros.senha)}</label>
        <div class="modal-inline-grid">
          <label><span>Categoria</span><select id="senha_categoria" class="config-input"><option value="">Sem categoria</option>${state.passwords.categorias.map(categoria => `<option value="${escapeAttr(categoria.nome)}" ${item.categoria === categoria.nome ? 'selected' : ''}>${escapeHtml(categoria.nome)}</option>`).join('')}</select></label>
          <label><span>Grupo</span><select id="senha_grupo" class="config-input"><option value="">Sem grupo</option>${state.passwords.grupos.map(grupo => `<option value="${escapeAttr(grupo.nome)}" ${item.grupo === grupo.nome ? 'selected' : ''}>${escapeHtml(grupo.nome)}</option>`).join('')}</select></label>
          <label><span>Status</span><select id="senha_status" class="config-input"><option value="ativo" ${item.status !== 'inativo' ? 'selected' : ''}>ativo</option><option value="inativo" ${item.status === 'inativo' ? 'selected' : ''}>inativo</option></select></label>
        </div>

        <div class="small-modal-actions">
          <button class="secondary-btn" type="button" onclick="fecharModalSenha()">Cancelar</button>
          <button id="senha_salvar" class="save-btn saving-btn ${state.passwords.salvando ? 'is-saving' : ''} ${state.passwords.salvo ? 'is-saved' : ''}" type="button" onclick="salvarSenhaItem('${escapeAttr(item.id || '')}')" ${state.passwords.salvando ? 'disabled' : ''}>${botaoTexto}</button>
        </div>
      </section>
    </div>
  `;
}

function obterSenhaModalAtual() {
  if (!state.passwords.modalId) {
    return {};
  }

  return state.passwords.items.find(item => item.id === state.passwords.modalId) || {};
}

function alterarFiltroSenha(chave, valor) {
  state.passwords.filtros[chave] = valor;
  carregarCentralSenhas();
}

function selecionarAbaSenhas(aba) {
  if (aba === 'historico' && !(pode('central_senhas', 'create') || pode('central_senhas', 'update') || pode('central_senhas', 'delete'))) {
    state.passwords.message = 'Seu usuário não possui acesso ao histórico.';
    renderCentralSenhas();
    return;
  }

  state.passwords.aba = aba;
  state.passwords.modalAberto = false;
  renderCentralSenhas();
}

function abrirModalSenha(id) {
  const acao = id ? 'update' : 'create';

  if (!pode('central_senhas', acao)) {
    state.passwords.message = 'Seu usuário não possui permissão para gerenciar acessos.';
    renderCentralSenhas();
    return;
  }

  state.passwords.modalAberto = true;
  state.passwords.modalId = id || '';
  state.passwords.erros = {};
  state.passwords.salvando = false;
  state.passwords.salvo = false;
  renderCentralSenhas();
}

function fecharModalSenha() {
  state.passwords.modalAberto = false;
  state.passwords.modalId = '';
  state.passwords.erros = {};
  state.passwords.salvando = false;
  state.passwords.salvo = false;
  renderCentralSenhas();
}

async function salvarSenhaItem(id) {
  const acao = id ? 'update' : 'create';

  if (!pode('central_senhas', acao)) {
    state.passwords.message = 'Seu usuário não possui permissão para salvar acessos.';
    renderCentralSenhas();
    return;
  }

  const payload = {
    id,
    titulo: document.getElementById('senha_titulo')?.value || '',
    descricao: document.getElementById('senha_descricao')?.value || '',
    url: document.getElementById('senha_url')?.value || '',
    login: document.getElementById('senha_login')?.value || '',
    senha: document.getElementById('senha_senha')?.value || '',
    categoria: document.getElementById('senha_categoria')?.value || '',
    grupo: document.getElementById('senha_grupo')?.value || '',
    status: document.getElementById('senha_status')?.value || 'ativo'
  };
  const erros = validarSenhaPayload(payload);

  if (Object.keys(erros).length) {
    state.passwords.erros = erros;
    renderCentralSenhas();
    return;
  }

  try {
    state.passwords.erros = {};
    state.passwords.salvando = true;
    atualizarBotaoSenha('Salvando...', true, 'is-saving');

    const response = await chamarApi('savePasswordItem', payload);

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível salvar o acesso.'));
    }

    state.passwords.salvando = false;
    state.passwords.salvo = true;
    atualizarBotaoSenha('Salvo', true, 'is-saved');
    await esperar(650);
    state.passwords.modalAberto = false;
    state.passwords.modalId = '';
    state.passwords.salvo = false;
    await carregarCentralSenhas();
  } catch (erro) {
    state.passwords.salvando = false;
    state.passwords.salvo = false;
    atualizarBotaoSenha('Salvar', false, '');
    state.passwords.message = erro.message || 'Erro ao salvar acesso.';
    renderCentralSenhas();
  }
}

async function excluirSenhaItem(id) {
  if (!pode('central_senhas', 'delete')) {
    state.passwords.message = 'Seu usuário não possui permissão para excluir acessos.';
    renderCentralSenhas();
    return;
  }

  const item = state.passwords.items.find(acesso => acesso.id === id);
  const titulo = item?.titulo || 'este acesso';

  if (!window.confirm(`Tem certeza que deseja excluir ${titulo}? Esta ação não poderá ser desfeita.`)) {
    return;
  }

  try {
    const response = await chamarApi('deletePasswordItem', { id });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível excluir o acesso.'));
    }

    state.passwords.message = 'Acesso excluído.';
    await carregarCentralSenhas();
  } catch (erro) {
    state.passwords.message = erro.message || 'Erro ao excluir acesso.';
    renderCentralSenhas();
  }
}

function atualizarBotaoSenha(texto, disabled, classe) {
  const botao = document.getElementById('senha_salvar');

  if (!botao) return;

  botao.textContent = texto;
  botao.disabled = disabled;
  botao.classList.remove('is-saving', 'is-saved');

  if (classe) {
    botao.classList.add(classe);
  }
}

function validarSenhaPayload(payload) {
  const erros = {};

  if (!String(payload.titulo || '').trim()) {
    erros.titulo = 'Informe o título.';
  }

  if (!String(payload.login || '').trim()) {
    erros.login = 'Informe o login.';
  }

  if (!String(payload.senha || '').trim()) {
    erros.senha = 'Informe a senha.';
  }

  if (payload.url && !/^https?:\/\//i.test(String(payload.url).trim())) {
    erros.url = 'Use uma URL começando com http:// ou https://.';
  }

  return erros;
}

function invalidarGeracaoLinksAr() {
  state.ar.geracaoLinksToken += 1;
  state.ar.gerando = false;
}

function resetarEstadoGerarLinksAr() {
  invalidarGeracaoLinksAr();
  state.ar.produtoBusca = '';
  state.ar.filtros = {
    ac: '',
    produto: '',
    midia: '',
    modelo: '',
    validade: ''
  };
  state.ar.produtoId = '';
  state.ar.parceiroId = '';
  state.ar.parceiroBusca = '';
  state.ar.resultado = null;
  state.ar.alertas = [];
  state.ar.aba = 'inicio';
  state.ar.campoProdutoAtivo = '';
  state.ar.message = '';
}

async function abrirPainelAr() {
  resetarEstadoGerarLinksAr();
  await carregarPainelAr();
}

async function carregarPainelAr() {
  state.ar.loading = true;
  renderPainelAr();

  try {
    const response = await chamarApi('getArData');

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar o Painel AR.'));
    }

    state.ar.produtos = response.data.produtos || [];
    state.ar.parceiros = response.data.parceiros || [];
    state.ar.historico = response.data.historico || [];
    state.ar.loading = false;
    renderPainelAr();
  } catch (erro) {
    state.ar.loading = false;
    state.ar.message = erro.message || 'Erro ao carregar o Painel AR.';
    renderPainelAr();
  }
}

async function carregarCrmAr(pagina = state.ar.crm.pagina) {
  const crm = state.ar.crm;
  crm.loading = true;
  crm.message = '';
  renderPainelAr();

  try {
    const response = await chamarApi('getArCrmData', {
      pagina,
      limite: crm.itensPorPagina,
      busca: crm.filtro,
      status: crm.statusFiltro,
      syncStatus: crm.syncFiltro
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar o CRM AR.'));
    }

    crm.items = response.data.items || [];
    crm.totalItens = Number(response.data.totalItens || 0);
    crm.pagina = Number(response.data.pagina || pagina);
    const totalPaginas = Math.max(1, Math.ceil(crm.totalItens / crm.itensPorPagina));
    crm.pagina = Math.min(crm.pagina, totalPaginas);
    crm.ultimaSincronizacao = response.data.ultimaSincronizacao || null;
    crm.configurado = Boolean(response.data.configurado);
    crm.tokenConfigurado = Boolean(response.data.configuracao?.token);
    crm.listasConfiguradas = Number(response.data.configuracao?.listas || 0);
    crm.carregado = true;
  } catch (erro) {
    crm.message = erro.message || 'Erro ao carregar o CRM AR.';
  } finally {
    crm.loading = false;
    renderPainelAr();
  }
}

async function sincronizarCrmAr() {
  if (!pode('painel_ar.crm', 'execute')) {
    state.ar.crm.message = 'Seu usuário não possui permissão para sincronizar o CRM AR.';
    renderPainelAr();
    return;
  }

  state.ar.crm.sincronizando = true;
  state.ar.crm.message = '';
  renderPainelAr();

  try {
    const response = await chamarApi('syncArCrm');

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível sincronizar o CRM AR.'));
    }

    await carregarCrmAr();
    state.ar.crm.message = `Sincronização concluída: ${response.data.totalProcessados || 0} registro(s) processado(s).`;
  } catch (erro) {
    state.ar.crm.message = erro.message || 'Erro ao sincronizar o CRM AR.';
  } finally {
    state.ar.crm.sincronizando = false;
    renderPainelAr();
  }
}

async function abrirPedidosRelacionadosCrmAr(cpf) {
  const relacionados = state.ar.crm.pedidosRelacionados;
  relacionados.aberto = true;
  relacionados.loading = true;
  relacionados.cpf = cpf;
  relacionados.items = [];
  relacionados.message = '';
  renderPainelAr();

  try {
    const response = await chamarApi('getArCrmRelated', { cpf });
    if (!response.ok) throw new Error(obterMensagemApi(response, 'Não foi possível carregar os pedidos relacionados.'));
    relacionados.items = response.data.items || [];
  } catch (erro) {
    relacionados.message = erro.message || 'Não foi possível carregar os pedidos relacionados.';
  } finally {
    relacionados.loading = false;
    renderPainelAr();
  }
}

function fecharPedidosRelacionadosCrmAr() {
  state.ar.crm.pedidosRelacionados = { aberto: false, loading: false, cpf: '', items: [], message: '' };
  renderPainelAr();
}

function capturarEstadoInteracaoAr() {
  const ativo = document.activeElement;
  const campo = ativo?.matches?.('input, textarea, select')
    ? ativo
    : ativo?.closest?.('.ar-autocomplete-field')?.querySelector('input');

  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    campoId: campo?.id || '',
    selecaoInicio: typeof campo?.selectionStart === 'number' ? campo.selectionStart : null,
    selecaoFim: typeof campo?.selectionEnd === 'number' ? campo.selectionEnd : null
  };
}

function restaurarEstadoInteracaoAr(snapshot) {
  if (!snapshot) return;

  requestAnimationFrame(() => {
    window.scrollTo(snapshot.scrollX, snapshot.scrollY);

    if (!snapshot.campoId) return;

    const campo = document.getElementById(snapshot.campoId);
    if (!campo) return;

    campo.focus({ preventScroll: true });
    if (snapshot.selecaoInicio !== null && typeof campo.setSelectionRange === 'function') {
      campo.setSelectionRange(snapshot.selecaoInicio, snapshot.selecaoFim);
    }
  });
}

let menuMaisArAberto = null;

function obterFaixaMenuAr() {
  const largura = typeof window === 'undefined' ? 1280 : window.innerWidth;
  if (largura <= 480) return 'compact';
  if (largura <= 760) return 'mobile';
  if (largura <= 1000) return 'tablet';
  return 'desktop';
}

let faixaMenuArAtual = obterFaixaMenuAr();

function fecharMenuMaisAr() {
  if (!menuMaisArAberto) return;
  limparMenusAcoesGlobais();
  menuMaisArAberto.menu.hidden = true;
  menuMaisArAberto.trigger.setAttribute('aria-expanded', 'false');
  menuMaisArAberto = null;
}

function renderMenuPrincipalAr({ podeHistorico, incluirCrm = false, incluirCrm2 = false }) {
  const itens = [
    ['inicio', 'Início', true],
    ['gerar', 'Gerar links', podeAcessarAbaAr('gerar')],
    ['produtos', 'Lista de produtos', podeAcessarAbaAr('produtos')],
    ['validacoes', 'Validações', podeAcessarAbaAr('validacoes')],
    ['historico', 'Histórico', podeHistorico],
    ['crm', 'CRM', incluirCrm && podeAcessarAbaAr('crm')],
    ['crm2', 'CRM 2.0', incluirCrm2 && podeAcessarAbaAr('crm2')]
  ].filter(([, , permitido]) => permitido);
  const faixa = obterFaixaMenuAr();
  const limite = faixa === 'compact' ? 2 : faixa === 'mobile' ? 3 : faixa === 'tablet' ? 4 : itens.length;
  const principais = itens.slice(0, limite);
  const secundarias = itens.slice(limite);
  const renderItem = ([id, nome]) => `<button class="hub-module-nav-item ${id === 'inicio' ? 'ar-home-tab' : ''} ${['crm2', 'crm2-pf'].includes(state.ar.aba) && id === 'crm2' || state.ar.aba === id ? 'active is-active' : ''}" type="button" onclick="selecionarAbaAr('${id}')" ${id === 'inicio' ? 'title="Início" aria-label="Início"' : ''}>${id === 'inicio' ? '<i data-lucide="house" aria-hidden="true"></i>' : nome}</button>`;

  return `<div class="module-tabs hub-module-nav" role="group" aria-label="Visualização do Painel AR">${principais.map(renderItem).join('')}${secundarias.length ? `
    <div class="hub-responsive-more">
      <button class="hub-responsive-more-trigger ${secundarias.some(([id]) => id === state.ar.aba || (id === 'crm2' && ['crm2', 'crm2-pf'].includes(state.ar.aba))) ? 'is-active' : ''}" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="ar-module-more-menu" data-ar-more-trigger><span>Mais</span><span aria-hidden="true">⌄</span></button>
      <div id="ar-module-more-menu" class="hub-responsive-more-menu" role="menu" aria-label="Mais opções" hidden>${secundarias.map(([id, nome]) => renderItem([id, nome]).replace('<button ', '<button role="menuitem" ')).join('')}</div>
    </div>` : ''}</div>`;
}

document.addEventListener('click', event => {
  const trigger = event.target.closest?.('[data-ar-more-trigger]');
  if (trigger) {
    event.preventDefault();
    event.stopPropagation();
    const menu = document.getElementById(trigger.getAttribute('aria-controls') || '');
    if (!menu) return;
    const abrir = menu.hidden;
    fecharMenuMaisAr();
    if (!abrir) return;
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    menuMaisArAberto = { menu, trigger };
    abrirMenuAcaoGlobal(trigger, menu, { minWidth: 190, maxWidth: 320, gap: 6, flipVertical: true });
    return;
  }
  if (menuMaisArAberto && event.target.closest?.('[role="menuitem"]')) {
    fecharMenuMaisAr();
    return;
  }
  if (menuMaisArAberto && !menuMaisArAberto.menu.contains(event.target)) fecharMenuMaisAr();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !menuMaisArAberto) return;
  event.preventDefault();
  const trigger = menuMaisArAberto.trigger;
  fecharMenuMaisAr();
  trigger.focus();
});

window.addEventListener('resize', () => {
  const faixaAtual = obterFaixaMenuAr();
  if (faixaAtual === faixaMenuArAtual || !document.querySelector('.ar-panel-header .hub-module-nav')) return;
  faixaMenuArAtual = faixaAtual;
  fecharMenuMaisAr();
  renderPainelAr();
});

function renderPainelAr() {
  fecharMenuMaisAr();
  const snapshotInteracao = capturarEstadoInteracaoAr();
  fecharDropdownCrmAr();
  const podeHistorico = podeAcessarAbaAr('historico');
  const nomeSistema = state.config?.nome_sistema || 'PAINEL TRANSMARES';
  const subtitulo = state.config?.subtitulo_sistema || 'Central operacional da Transmares Corretora de Seguros';

  document.getElementById('app').innerHTML = `
    <main class="dashboard">
      <header class="topbar">
        ${renderHeaderLogo()}
        <div class="brand">
          <h1>${escapeHtml(nomeSistema)}</h1>
          <p>${escapeHtml(subtitulo)}</p>
        </div>

        <div class="user-box">
          <strong>${escapeHtml(state.usuario.nome || '')}</strong><br>
          ${escapeHtml(state.usuario.email || '')}<br>
          <button class="secondary-btn" type="button" onclick="navegarHome()">Voltar</button>
        </div>
      </header>

      <section class="admin-panel">
        <div class="admin-panel-header ar-panel-header">
          <div class="ar-panel-title">
            <button type="button" onclick="selecionarAbaAr('inicio')" title="Ir para o início do Painel AR">
              <h2>Painel AR Transmares</h2>
            </button>
            <p>Consulte produtos, selecione o parceiro e gere links comerciais.</p>
          </div>
          ${renderMenuPrincipalAr({ podeHistorico })}
        </div>

        ${state.ar.message ? `<p class="admin-message">${escapeHtml(state.ar.message)}</p>` : ''}
        ${state.ar.loading ? renderHubLoading('Carregando produtos e parceiros...') : renderConteudoAr()}
      </section>
    </main>
  `;

  restaurarEstadoInteracaoAr(snapshotInteracao);
}

function renderConteudoAr() {
  if (!podeAcessarAbaAr(state.ar.aba)) {
    state.ar.aba = 'inicio';
  }

  if (state.ar.aba === 'inicio') {
    return renderInicioPainelAr();
  }

  if (state.ar.aba === 'historico') {
    return renderHistoricoAr();
  }

  if (state.ar.aba === 'produtos') {
    return renderListaProdutosAr();
  }

  if (state.ar.aba === 'validacoes') {
    return renderValidacoesAr();
  }

  if (state.ar.aba === 'crm') {
    return renderCrmArPhase1();
  }

  if (state.ar.aba === 'crm2') {
    return renderCrm2Phase1();
  }

  if (state.ar.aba === 'crm2-pf') {
    return renderCrm2PessoasFisicasPhase2();
  }

  return renderGeradorLinksAr();
}

function renderCrm2Phase1() {
  const crm2 = state.ar.crm2;
  const podeExecutar = pode('painel_ar.crm_2', 'update');
  const etapas = [
    ['201', 'Pessoas físicas', 'Cadastro, busca, dados cadastrais e timeline.'],
    ['202', 'Pessoas jurídicas', 'Empresas, documentos e pessoas vinculadas.'],
    ['203', 'Vínculos', 'Relacionamentos entre PF e PJ, com histórico de inativação.'],
    ['204', 'Pedidos', 'Cadastro, detalhe, status, vencimento e histórico.'],
    ['205', 'Oportunidades', 'Leads, negociações, itens e conversão.'],
    ['206', 'Configurações', 'Comunicação, modelos e automações mockadas.']
  ];

  return `
    <section class="admin-panel" aria-labelledby="crm2-title">
      <div class="admin-panel-header">
        <div>
          <span class="ar-crm-phase1-kicker">FASE 1 · FUNDAÇÃO MOCKADA</span>
          <h3 id="crm2-title">CRM 2.0</h3>
          <p>Nova estrutura de relacionamento do AR Transmares, independente do CRM atual.</p>
        </div>
        <span class="ar-crm-phase1-status">Rota ${escapeHtml(crm2.codigoRota)}</span>
      </div>

      ${crm2.mensagem ? `<p class="admin-message" role="status">${escapeHtml(crm2.mensagem)}</p>` : ''}

      <div class="ar-crm-phase1-grid" aria-label="Resumo do CRM 2.0">
        <article class="ar-crm-phase1-card">
          <span class="ar-crm-phase1-card-label">Escopo atual</span>
          <strong>Telas mockadas</strong>
          <p>Validação visual e funcional antes de qualquer integração.</p>
        </article>
        <article class="ar-crm-phase1-card">
          <span class="ar-crm-phase1-card-label">Base do relacionamento</span>
          <strong>Pessoa Física</strong>
          <p>PF será o centro dos próximos cadastros, pedidos e timelines.</p>
        </article>
        <article class="ar-crm-phase1-card">
          <span class="ar-crm-phase1-card-label">Integrações</span>
          <strong>Desativadas</strong>
          <p>Supabase, ClickUp, Brevo e automações entram somente após a homologação.</p>
        </article>
      </div>

      <div class="admin-panel-header crm2-phase1-section-header">
        <div>
          <h4>Estrutura reservada</h4>
          <p>As próximas telas serão liberadas nesta sequência:</p>
        </div>
      </div>

      <div class="crm2-phase1-roadmap" role="list" aria-label="Próximas telas do CRM 2.0">
        ${etapas.map(([codigo, titulo, descricao]) => `
          <article class="crm2-phase1-roadmap-item ${codigo === '201' ? 'is-actionable' : ''}" role="${codigo === '201' ? 'button' : 'listitem'}" ${codigo === '201' ? `tabindex="0" onclick="navegarParaCrm2Rota('${codigo}')" onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navegarParaCrm2Rota('${codigo}'); }"` : ''}>
            <span class="crm2-phase1-roadmap-code">${escapeHtml(codigo)}</span>
            <div>
              <strong>${escapeHtml(titulo)}</strong>
              <p>${escapeHtml(descricao)}</p>
            </div>
            <span class="crm2-phase1-roadmap-status">Planejada</span>
          </article>
        `).join('')}
      </div>

      <div class="admin-panel-actions crm2-phase1-actions">
        <button class="primary-btn" type="button" onclick="acionarMockCrm2('cadastro')" ${!podeExecutar ? 'disabled' : ''}>
          Iniciar validação mockada
        </button>
        <button class="secondary-btn" type="button" onclick="acionarMockCrm2('reset')" ${!podeExecutar ? 'disabled' : ''}>
          Limpar estado
        </button>
      </div>
    </section>
  `;
}

function navegarParaCrm2Rota(codigo) {
  const rota = String(codigo || '').trim();
  if (!/^\d+$/.test(rota)) return;

  const caminho = `${montarCaminhoHub('painel-ar').replace(/\/+$/g, '')}/${rota}`;
  const url = new URL(window.location.href);
  url.pathname = caminho;
  url.hash = '';
  window.history.pushState({}, '', url);
  renderizarRotaAtual();
}

function formatarCpfCrm2(valor = '') {
  const numeros = String(valor || '').replace(/\D/g, '').slice(0, 11);
  if (numeros.length !== 11) return numeros;
  return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarDataCrm2(valor = '') {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(data);
}

function obterPessoaFisicaCrm2(id) {
  return state.ar.crm2.pessoasFisicas.items.find(item => item.id === id) || null;
}

function obterPessoasFisicasFiltradasCrm2() {
  const pf = state.ar.crm2.pessoasFisicas;
  const busca = normalizarBuscaAr(pf.busca);

  return pf.items.filter(item => {
    const correspondeBusca = !busca || [item.nome, item.cpf, item.email, item.telefone]
      .some(valor => normalizarBuscaAr(valor).includes(busca));
    const correspondeStatus = !pf.statusFiltro || item.status === pf.statusFiltro;
    const correspondeOrigem = !pf.origemFiltro || item.origem === pf.origemFiltro;
    return correspondeBusca && correspondeStatus && correspondeOrigem;
  });
}

function renderCrm2PessoasFisicasPhase2() {
  const pf = state.ar.crm2.pessoasFisicas;
  if (pf.modoFormulario) return renderFormularioPessoaFisicaCrm2();
  if (pf.detalheId) return renderDetalhePessoaFisicaCrm2(obterPessoaFisicaCrm2(pf.detalheId));

  const items = obterPessoasFisicasFiltradasCrm2();
  const origens = Array.from(new Set(state.ar.crm2.pessoasFisicas.items.map(item => item.origem).filter(Boolean)));
  const status = ['cliente ativo', 'cliente inativo'];

  return `
    <section class="admin-panel crm2-pessoas-page" aria-labelledby="crm2-pessoas-title">
      <div class="admin-panel-header">
        <div>
          <span class="ar-crm-phase1-kicker">ROTA 201 · CRM 2.0</span>
          <h3 id="crm2-pessoas-title">Pessoas físicas</h3>
          <p>Cadastro central do relacionamento do AR Transmares.</p>
        </div>
        <div class="crm2-pessoas-header-actions">
          <button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button>
          <button class="primary-btn" type="button" onclick="abrirFormularioPessoaFisicaCrm2('create')" ${!pode('painel_ar.crm_2', 'update') ? 'disabled' : ''}>Nova pessoa física</button>
        </div>
      </div>

      ${pf.mensagem ? `<p class="admin-message" role="status">${escapeHtml(pf.mensagem)}</p>` : ''}

      <div class="crm2-pessoas-filters" role="search">
        <label>
          <span>Buscar</span>
          <input class="config-input" type="search" placeholder="Nome, CPF, telefone ou e-mail" value="${escapeAttr(pf.busca)}" oninput="atualizarBuscaPessoasFisicasCrm2(this.value)">
        </label>
        <label>
          <span>Status</span>
          <select class="config-input" onchange="atualizarFiltroPessoasFisicasCrm2('status', this.value)">
            <option value="">Todos os status</option>
            ${status.map(item => `<option value="${escapeAttr(item)}" ${pf.statusFiltro === item ? 'selected' : ''}>${escapeHtml(item === 'cliente ativo' ? 'Cliente ativo' : 'Cliente inativo')}</option>`).join('')}
          </select>
        </label>
        <label>
          <span>Origem</span>
          <select class="config-input" onchange="atualizarFiltroPessoasFisicasCrm2('origem', this.value)">
            <option value="">Todas as origens</option>
            ${origens.map(item => `<option value="${escapeAttr(item)}" ${pf.origemFiltro === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}
          </select>
        </label>
        ${(pf.busca || pf.statusFiltro || pf.origemFiltro) ? '<button class="secondary-btn" type="button" onclick="limparFiltrosPessoasFisicasCrm2()">Limpar filtros</button>' : ''}
      </div>

      <div class="crm2-pessoas-summary"><strong>${items.length}</strong> pessoa(s) física(s) encontrada(s)</div>

      ${items.length ? `
        <div class="ar-crm-phase1-table-wrap crm2-pessoas-table-wrap">
          <table class="ar-crm-phase1-table crm2-pessoas-table">
            <thead>
              <tr>
                <th>Nome completo/nome social</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Última atualização</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td><strong>${escapeHtml(item.nome)}</strong><small>${escapeHtml(item.status === 'cliente ativo' ? 'Cliente ativo' : 'Cliente inativo')}</small></td>
                  <td>${escapeHtml(formatarCpfCrm2(item.cpf))}</td>
                  <td>${escapeHtml(item.telefone || '—')}</td>
                  <td>${escapeHtml(item.email || '—')}</td>
                  <td>${escapeHtml(formatarDataCrm2(item.atualizadoEm))}</td>
                  <td>
                    <div class="crm2-pessoas-row-actions">
                      <button class="secondary-btn" type="button" onclick="abrirPessoaFisicaCrm2('${escapeAttr(item.id)}')">Ver</button>
                      <button class="secondary-btn" type="button" onclick="editarPessoaFisicaCrm2('${escapeAttr(item.id)}')" ${!pode('painel_ar.crm_2', 'update') ? 'disabled' : ''}>Editar</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div class="quick-link-empty crm2-pessoas-empty">Nenhuma pessoa física encontrada com os filtros atuais.</div>'}
    </section>
  `;
}

function renderDetalhePessoaFisicaCrm2(pessoa) {
  const pf = state.ar.crm2.pessoasFisicas;
  if (!pessoa) {
    pf.detalheId = '';
    pf.mensagem = 'Pessoa física não encontrada no estado mockado.';
    return renderCrm2PessoasFisicasPhase2();
  }

  const aba = pf.abaDetalhe || 'dados';
  const podeEditar = pode('painel_ar.crm_2', 'update');
  const abas = [
    ['dados', 'Dados cadastrais'],
    ['timeline', 'Timeline'],
    ['empresas', 'Empresas vinculadas'],
    ['pedidos', 'Pedidos']
  ];

  return `
    <section class="admin-panel crm2-pf-detail" aria-labelledby="crm2-pf-detail-title">
      <div class="admin-panel-header">
        <div>
          <span class="ar-crm-phase1-kicker">PESSOA FÍSICA · MOCK</span>
          <h3 id="crm2-pf-detail-title">${escapeHtml(pessoa.nome)}</h3>
          <p>${escapeHtml(formatarCpfCrm2(pessoa.cpf))} · ${escapeHtml(pessoa.status === 'cliente ativo' ? 'Cliente ativo' : 'Cliente inativo')}</p>
        </div>
        <div class="crm2-pessoas-header-actions">
          <button class="secondary-btn" type="button" onclick="fecharPessoaFisicaCrm2()">Voltar para a lista</button>
          <button class="primary-btn" type="button" onclick="editarPessoaFisicaCrm2('${escapeAttr(pessoa.id)}')" ${!podeEditar ? 'disabled' : ''}>Editar</button>
        </div>
      </div>

      ${pf.mensagem ? `<p class="admin-message" role="status">${escapeHtml(pf.mensagem)}</p>` : ''}

      <div class="module-tabs crm2-detail-tabs hub-subnav hub-responsive-subnav" role="tablist" aria-label="Detalhes da pessoa física">
        ${abas.map(([chave, rotulo]) => `<button type="button" role="tab" aria-selected="${aba === chave ? 'true' : 'false'}" class="hub-subnav-item ${aba === chave ? 'active is-active' : ''}" onclick="selecionarAbaDetalhePessoaFisicaCrm2('${chave}')">${escapeHtml(rotulo)}</button>`).join('')}
      </div>

      ${aba === 'dados' ? renderDadosPessoaFisicaCrm2(pessoa) : ''}
      ${aba === 'timeline' ? renderTimelinePessoaFisicaCrm2(pessoa) : ''}
      ${aba === 'empresas' ? renderEmpresasPessoaFisicaCrm2(pessoa) : ''}
      ${aba === 'pedidos' ? renderPedidosPessoaFisicaCrm2(pessoa) : ''}
    </section>
  `;
}

function renderDadosPessoaFisicaCrm2(pessoa) {
  const campos = [
    ['Nome completo/nome social', pessoa.nome],
    ['CPF', formatarCpfCrm2(pessoa.cpf)],
    ['CEI/CAEPF', pessoa.cei || '—'],
    ['Data de nascimento', formatarDataCrm2(pessoa.nascimento)],
    ['Telefone', pessoa.telefone || '—'],
    ['E-mail', pessoa.email || '—'],
    ['Origem', pessoa.origem || '—'],
    ['Parceiro de indicação', pessoa.parceiro || '—'],
    ['Data de cadastro', formatarDataCrm2(pessoa.cadastroEm)],
    ['Última atualização', formatarDataCrm2(pessoa.atualizadoEm)]
  ];

  return `
    <div class="crm2-pf-detail-grid">
      ${campos.map(([rotulo, valor]) => `<div class="crm2-pf-detail-field"><span>${escapeHtml(rotulo)}</span><strong>${escapeHtml(valor)}</strong></div>`).join('')}
      <div class="crm2-pf-detail-field crm2-pf-detail-field-wide"><span>Observações</span><strong>${escapeHtml(pessoa.observacoes || '—')}</strong></div>
    </div>
    <div class="crm2-pf-attachments">
      <div class="admin-panel-header"><div><h4>Anexos</h4><p>Arquivos mockados com validade visual.</p></div></div>
      ${pessoa.anexos?.length ? `<div class="crm2-pf-attachment-list">${pessoa.anexos.map(anexo => `<div class="crm2-pf-attachment"><strong>${escapeHtml(anexo.nome)}</strong><span>Validade: ${escapeHtml(formatarDataCrm2(anexo.validade))} · ${escapeHtml(anexo.status || 'válido')}</span></div>`).join('')}</div>` : '<div class="quick-link-empty">Nenhum anexo cadastrado.</div>'}
    </div>
  `;
}

function renderTimelinePessoaFisicaCrm2(pessoa) {
  return pessoa.timeline?.length ? `
    <div class="crm2-pf-timeline">
      ${pessoa.timeline.map(evento => `<article class="crm2-pf-timeline-item"><span class="crm2-pf-timeline-dot" aria-hidden="true"></span><div><strong>${escapeHtml(evento.descricao)}</strong><p>${escapeHtml(evento.tipo)} · ${escapeHtml(evento.usuario)} · ${escapeHtml(formatarDataCrm2(evento.data))}</p></div></article>`).join('')}
    </div>
  ` : '<div class="quick-link-empty">Nenhum evento registrado.</div>';
}

function renderEmpresasPessoaFisicaCrm2(pessoa) {
  return pessoa.empresas?.length ? `
    <div class="crm2-pf-related-list">${pessoa.empresas.map(empresa => `<article><strong>${escapeHtml(empresa.nome)}</strong><span>${escapeHtml(empresa.vinculo)} · ${escapeHtml(empresa.status)}</span></article>`).join('')}</div>
  ` : '<div class="quick-link-empty">Nenhuma empresa vinculada.</div>';
}

function renderPedidosPessoaFisicaCrm2(pessoa) {
  return pessoa.pedidos?.length ? `
    <div class="crm2-pf-related-list">${pessoa.pedidos.map(pedido => `<article><strong>${escapeHtml(pedido.numero)} · ${escapeHtml(pedido.produto)}</strong><span>${escapeHtml(pedido.status)} · Vencimento: ${escapeHtml(formatarDataCrm2(pedido.vencimento))}</span></article>`).join('')}</div>
  ` : '<div class="quick-link-empty">Nenhum pedido vinculado.</div>';
}

function renderFormularioPessoaFisicaCrm2() {
  const pf = state.ar.crm2.pessoasFisicas;
  const draft = pf.draft || {};
  const valor = campo => escapeAttr(draft[campo] || '');
  const erro = campo => pf.erros?.[campo] ? `<small class="crm2-pf-field-error">${escapeHtml(pf.erros[campo])}</small>` : '';
  const titulo = pf.modoFormulario === 'edit' ? 'Editar pessoa física' : 'Nova pessoa física';

  return `
    <section class="hub-form-screen crm2-pf-form" aria-labelledby="crm2-pf-form-title">
      <header class="hub-form-screen-header">
        <div>
          <span class="ar-crm-phase1-kicker">ROTA 201 · CRM 2.0</span>
          <h2 id="crm2-pf-form-title">${titulo}</h2>
          <p>Cadastro mockado. Nenhum dado será enviado ou salvo no backend.</p>
        </div>
        <button class="secondary-btn" type="button" onclick="fecharFormularioPessoaFisicaCrm2()">Cancelar</button>
      </header>

      ${pf.mensagem ? `<p class="admin-message hub-form-screen-notice" role="alert">${escapeHtml(pf.mensagem)}</p>` : ''}

      <form class="hub-form-screen-content crm2-pf-form-grid" onsubmit="salvarPessoaFisicaCrm2(event)">
        <label class="hub-form-span-2">Nome completo/nome social *<input class="config-input" name="nome" required maxlength="180" value="${valor('nome')}" autofocus>${erro('nome')}</label>
        <label>CPF *<input class="config-input" name="cpf" inputmode="numeric" maxlength="14" required value="${escapeAttr(formatarCpfCrm2(draft.cpf))}" oninput="aplicarMascaraCpfCrm2(this)">${erro('cpf')}</label>
        <label>CEI/CAEPF<input class="config-input" name="cei" maxlength="30" value="${valor('cei')}"></label>
        <label>Data de nascimento<input class="config-input" type="date" name="nascimento" value="${valor('nascimento')}">${erro('nascimento')}</label>
        <label>Telefone<input class="config-input" name="telefone" maxlength="20" value="${valor('telefone')}"></label>
        <label>E-mail<input class="config-input" type="email" name="email" maxlength="180" value="${valor('email')}">${erro('email')}</label>
        <label>Origem<select class="config-input" name="origem"><option value="">Selecione</option>${['Indicação', 'Site', 'Parceiro', 'Outro'].map(item => `<option value="${escapeAttr(item)}" ${draft.origem === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></label>
        <label>Parceiro de indicação<input class="config-input" name="parceiro" maxlength="180" value="${valor('parceiro')}"></label>
        <label>Status<select class="config-input" name="status">${['cliente ativo', 'cliente inativo'].map(item => `<option value="${escapeAttr(item)}" ${draft.status === item ? 'selected' : ''}>${escapeHtml(item === 'cliente ativo' ? 'Cliente ativo' : 'Cliente inativo')}</option>`).join('')}</select></label>
        <label class="hub-form-span-2">Observações<textarea class="config-input" name="observacoes" rows="4" maxlength="1000">${escapeHtml(draft.observacoes || '')}</textarea></label>
        <div class="crm2-pf-attachments-mock hub-form-span-2"><strong>Anexos</strong><span>O upload será habilitado após a homologação das telas.</span></div>
        <footer class="hub-form-screen-actions hub-form-span-2"><button class="secondary-btn" type="button" onclick="fecharFormularioPessoaFisicaCrm2()">Cancelar</button><button class="primary-btn" type="submit">Salvar mock</button></footer>
      </form>
    </section>
  `;
}

function atualizarBuscaPessoasFisicasCrm2(valor) {
  state.ar.crm2.pessoasFisicas.busca = String(valor || '');
  renderPainelAr();
}

function atualizarFiltroPessoasFisicasCrm2(tipo, valor) {
  const pf = state.ar.crm2.pessoasFisicas;
  if (tipo === 'status') pf.statusFiltro = String(valor || '');
  if (tipo === 'origem') pf.origemFiltro = String(valor || '');
  renderPainelAr();
}

function limparFiltrosPessoasFisicasCrm2() {
  const pf = state.ar.crm2.pessoasFisicas;
  pf.busca = '';
  pf.statusFiltro = '';
  pf.origemFiltro = '';
  renderPainelAr();
}

function abrirPessoaFisicaCrm2(id) {
  const pf = state.ar.crm2.pessoasFisicas;
  if (!obterPessoaFisicaCrm2(id)) return;
  pf.detalheId = id;
  pf.abaDetalhe = 'dados';
  pf.modoFormulario = '';
  pf.mensagem = '';
  renderPainelAr();
}

function fecharPessoaFisicaCrm2() {
  const pf = state.ar.crm2.pessoasFisicas;
  pf.detalheId = '';
  pf.mensagem = '';
  renderPainelAr();
}

function selecionarAbaDetalhePessoaFisicaCrm2(aba) {
  state.ar.crm2.pessoasFisicas.abaDetalhe = aba;
  renderPainelAr();
}

function abrirFormularioPessoaFisicaCrm2(modo = 'create', id = '') {
  if (!pode('painel_ar.crm_2', 'update')) return;
  const pf = state.ar.crm2.pessoasFisicas;
  const pessoa = id ? obterPessoaFisicaCrm2(id) : null;
  pf.modoFormulario = modo;
  pf.detalheId = modo === 'edit' ? id : '';
  pf.mensagem = '';
  pf.erros = {};
  pf.draft = pessoa ? { ...pessoa } : { status: 'cliente ativo' };
  renderPainelAr();
}

function editarPessoaFisicaCrm2(id) {
  abrirFormularioPessoaFisicaCrm2('edit', id);
}

function fecharFormularioPessoaFisicaCrm2() {
  const pf = state.ar.crm2.pessoasFisicas;
  pf.modoFormulario = '';
  pf.draft = {};
  pf.erros = {};
  pf.mensagem = '';
  renderPainelAr();
}

function aplicarMascaraCpfCrm2(input) {
  input.value = formatarCpfCrm2(input.value);
}

function salvarPessoaFisicaCrm2(event) {
  event.preventDefault();
  if (!pode('painel_ar.crm_2', 'update')) return;

  const pf = state.ar.crm2.pessoasFisicas;
  const dados = Object.fromEntries(new FormData(event.currentTarget).entries());
  const cpf = String(dados.cpf || '').replace(/\D/g, '');
  const erros = {};
  if (!dados.nome?.trim()) erros.nome = 'Informe o nome completo ou nome social.';
  if (cpf.length !== 11) erros.cpf = 'Informe um CPF válido com 11 dígitos.';
  const duplicado = pf.items.some(item => item.cpf === cpf && (pf.modoFormulario !== 'edit' || item.id !== pf.detalheId));
  if (duplicado) erros.cpf = 'Já existe uma pessoa física mockada com este CPF.';
  if (Object.keys(erros).length) {
    pf.erros = erros;
    pf.draft = { ...dados, cpf };
    pf.mensagem = 'Revise os campos destacados.';
    renderPainelAr();
    return;
  }

  const agora = new Date().toISOString();
  if (pf.modoFormulario === 'edit') {
    const pessoa = obterPessoaFisicaCrm2(pf.detalheId);
    Object.assign(pessoa, { ...dados, cpf, atualizadoEm: agora });
    pessoa.timeline = [...(pessoa.timeline || []), { data: agora, usuario: 'Usuário atual', descricao: 'Dados atualizados.', tipo: 'Atualização' }];
    pf.mensagem = 'Pessoa física atualizada no estado mockado. Nenhum dado foi persistido.';
  } else {
    const id = `pf-mock-${Date.now()}`;
    pf.items.unshift({ ...dados, id, cpf, cadastroEm: agora, atualizadoEm: agora, anexos: [], empresas: [], pedidos: [], timeline: [{ data: agora, usuario: 'Usuário atual', descricao: 'Cadastro criado.', tipo: 'Cadastro' }] });
    pf.detalheId = id;
    pf.mensagem = 'Pessoa física criada no estado mockado. Nenhum dado foi persistido.';
  }
  pf.modoFormulario = '';
  pf.erros = {};
  pf.draft = {};
  pf.abaDetalhe = 'dados';
  renderPainelAr();
}

function acionarMockCrm2(acao) {
  if (!pode('painel_ar.crm_2', 'update')) {
    state.ar.crm2.mensagem = 'Seu usuário não possui permissão para executar ações no CRM 2.0.';
    renderPainelAr();
    return;
  }

  state.ar.crm2.mensagem = acao === 'reset'
    ? 'Estado mockado limpo. Nenhum dado foi salvo.'
    : 'Validação mockada iniciada. Nenhum dado foi salvo e nenhuma integração foi acionada.';
  renderPainelAr();
}

function formatarDataHoraCrmAr(valor = '') {
  if (!valor) return '';

  const texto = String(valor).trim();
  const timestamp = /^\d{10,13}$/.test(texto) ? Number(texto) : null;
  const data = timestamp !== null
    ? new Date(texto.length === 10 ? timestamp * 1000 : timestamp)
    : new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(data);
}

function obterRotuloEstadoSincronizacaoCrmAr(valor = '') {
  const rotulos = {
    pending: 'Pendente',
    synced: 'Sincronizado',
    error: 'Erro',
    conflict: 'Conflito'
  };
  return rotulos[String(valor || '').trim().toLowerCase()] || 'Pendente';
}

function obterRotuloStatusCrmAr(valor = '') {
  const chave = normalizarNomeCampoCrm(valor);
  const rotulos = {
    'em prospeccao': 'Em prospecção',
    'cliente ativo': 'Cliente ativo',
    finalizado: 'Finalizado',
    'lead perdido': 'Lead perdido'
  };
  return rotulos[chave] || String(valor || 'Sem status');
}

function renderCrmArPhase1() {
  const crm = state.ar.crm;
  if (crm.cadastro?.aberto) return renderCadastroClienteCrmAr();
  if (crm.detalhe) return renderDetalheCrmAr(crm.detalhe);
  const podeSincronizar = pode('painel_ar.crm', 'execute');
  const items = crm.items || [];
  const totalItens = crm.totalItens || 0;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / crm.itensPorPagina));
  const inicioPagina = (crm.pagina - 1) * crm.itensPorPagina;
  const itensPagina = items;
  const statusIntegracao = crm.configurado ? 'Integração configurada' : 'Integração não configurada';
  const faltasConfiguracao = [
    !crm.tokenConfigurado ? 'CLICKUP_API_TOKEN' : '',
    !crm.listasConfiguradas ? 'CLICKUP_LIST_IDS' : ''
  ].filter(Boolean);

  return `
    <section class="ar-crm-phase1" aria-labelledby="ar-crm-title">
      <div class="ar-crm-phase1-intro">
        <div>
          <span class="ar-crm-phase1-kicker">FASE 2 · IMPORTAÇÃO CLICKUP</span>
          <h3 id="ar-crm-title">CRM do setor AR</h3>
          <p>Registros do ClickUp serão importados para uma base local, sem expor credenciais no navegador.</p>
        </div>
        <div class="ar-crm-phase1-actions">
          <span class="ar-crm-phase1-status">${statusIntegracao}</span>
          <button class="save-btn" type="button" onclick="abrirCadastroClienteCrmAr()" ${!podeSincronizar || !crm.configurado || crm.sincronizando ? 'disabled' : ''}>
            Novo cliente
          </button>
          <button class="primary-btn" type="button" onclick="sincronizarCrmAr()" ${!podeSincronizar || crm.sincronizando ? 'disabled' : ''}>
            ${crm.sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}
          </button>
        </div>
      </div>

      ${faltasConfiguracao.length ? `<p class="ar-crm-config-help">Secret(s) ausente(s): <code>${escapeHtml(faltasConfiguracao.join(', '))}</code></p>` : ''}

      ${crm.message ? `<p class="admin-message">${escapeHtml(crm.message)}</p>` : ''}

      <form class="ar-crm-list-filters" onsubmit="aplicarFiltrosCrmAr(event)">
        <label class="ar-crm-filter-search">
          <span>Buscar cadastro</span>
          <input class="config-input" type="search" value="${escapeAttr(crm.filtro || '')}" placeholder="Nome do cliente" oninput="atualizarFiltroCrmAr('busca', this.value)">
        </label>
        <label>
          <span>Status</span>
          <select class="config-input" onchange="atualizarFiltroCrmAr('status', this.value)">
            <option value="">Todos os status</option>
            ${CRM_STATUS_OPTIONS.map((status) => `<option value="${escapeAttr(status)}" ${crm.statusFiltro === status ? 'selected' : ''}>${escapeHtml(obterRotuloStatusCrmAr(status))}</option>`).join('')}
          </select>
        </label>
        <label>
          <span>Sincronização</span>
          <select class="config-input" onchange="atualizarFiltroCrmAr('syncStatus', this.value)">
            <option value="">Todos os estados</option>
            ${['pending', 'synced', 'error', 'conflict'].map((status) => `<option value="${status}" ${crm.syncFiltro === status ? 'selected' : ''}>${escapeHtml(obterRotuloEstadoSincronizacaoCrmAr(status))}</option>`).join('')}
          </select>
        </label>
        <button class="primary-btn" type="submit">Aplicar filtros</button>
        ${(crm.filtro || crm.statusFiltro || crm.syncFiltro) ? '<button class="secondary-btn" type="button" onclick="limparFiltrosCrmAr()">Limpar</button>' : ''}
      </form>

      <div class="ar-crm-phase1-grid">
        <article class="ar-crm-phase1-card">
          <span class="ar-crm-phase1-card-label">Registros</span>
          <strong>${totalItens}</strong>
          <p>Itens importados para o CRM local.</p>
        </article>
        <article class="ar-crm-phase1-card">
          <span class="ar-crm-phase1-card-label">Última sincronização</span>
          <strong>${crm.ultimaSincronizacao ? escapeHtml(formatarDataHoraCrmAr(crm.ultimaSincronizacao)) : 'Ainda não'}</strong>
          <p>A importação é incremental e registrada no histórico.</p>
        </article>
        <article class="ar-crm-phase1-card">
          <span class="ar-crm-phase1-card-label">Próxima etapa</span>
          <strong>Comentários</strong>
          <p>Comentários, subcomentários e anexos serão adicionados depois da importação.</p>
        </article>
      </div>

      ${crm.loading ? renderHubLoading('Carregando registros do CRM...') : totalItens ? `
        <div class="ar-crm-phase1-table-wrap">
          <table class="ar-crm-phase1-table">
            <thead>
              <tr><th>Registro</th><th>Status</th><th>Responsável</th><th>Vencimento</th><th>Sincronização</th><th>Ações</th></tr>
            </thead>
            <tbody>
              ${itensPagina.map(item => `
                <tr>
                  <td><strong>${escapeHtml(item.nome || 'Sem nome')}</strong></td>
                  <td>${escapeHtml(obterRotuloStatusCrmAr(item.status))}</td>
                  <td>${escapeHtml(item.responsavel || 'Não atribuído')}</td>
                  <td>${escapeHtml(item.data_vencimento || '—')}</td>
                  <td><span class="ar-crm-sync-badge ${escapeAttr(item.sync_status || 'pending')}">${escapeHtml(obterRotuloEstadoSincronizacaoCrmAr(item.sync_status))}</span></td>
                  <td><button class="secondary-btn" type="button" onclick="visualizarCrmAr('${escapeAttr(item.id)}')">Visualizar</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="ar-crm-pagination" aria-label="Paginação do CRM">
          <span>Exibindo ${inicioPagina + 1}-${Math.min(inicioPagina + items.length, totalItens)} de ${totalItens}</span>
          <div>
            <button class="secondary-btn" type="button" onclick="selecionarPaginaCrmAr(${crm.pagina - 1})" ${crm.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
            <strong>Página ${crm.pagina} de ${totalPaginas}</strong>
            <button class="secondary-btn" type="button" onclick="selecionarPaginaCrmAr(${crm.pagina + 1})" ${crm.pagina >= totalPaginas ? 'disabled' : ''}>Próxima</button>
          </div>
        </div>
      ` : '<div class="ar-crm-phase1-next-step"><strong>Nenhum registro importado</strong><span>Configure as listas do ClickUp e execute a primeira sincronização.</span></div>'}
    </section>
  `;
}

function aplicarFiltrosCrmAr(event) {
  event?.preventDefault();
  state.ar.crm.pagina = 1;
  carregarCrmAr(1);
}

function atualizarFiltroCrmAr(tipo, valor) {
  if (tipo === 'status') state.ar.crm.statusFiltro = String(valor || '');
  else if (tipo === 'syncStatus') state.ar.crm.syncFiltro = String(valor || '');
  else state.ar.crm.filtro = String(valor || '');
}

function limparFiltrosCrmAr() {
  state.ar.crm.filtro = '';
  state.ar.crm.statusFiltro = '';
  state.ar.crm.syncFiltro = '';
  state.ar.crm.pagina = 1;
  carregarCrmAr(1);
}

function abrirCadastroClienteCrmAr() {
  if (!pode('painel_ar.crm', 'execute')) {
    state.ar.crm.message = 'Seu usuario nao possui permissao para adicionar clientes no CRM AR.';
    renderPainelAr();
    return;
  }

  state.ar.crm.detalhe = null;
  const produtosCarregando = !(state.ar.produtos || []).length;
  const opcoesLocais = obterOpcoesCadastroCrmArLocais();
  const opcoesLocaisDisponiveis = opcoesLocais.situacoesLead.length > 0 && opcoesLocais.origensCliente.length > 0;
  state.ar.crm.cadastro = { aberto: true, salvando: false, produtosCarregando, opcoesCarregando: !opcoesLocaisDisponiveis, opcoes: opcoesLocais, message: '', draft: {} };
  renderPainelAr();
  if (produtosCarregando) carregarProdutosCadastroCrmAr();
  carregarOpcoesCadastroCrmAr();
}

async function carregarProdutosCadastroCrmAr() {
  try {
    const response = await chamarApi('getArData');
    if (!state.ar.crm.cadastro?.aberto) return;
    if (!response.ok) throw new Error(obterMensagemApi(response, 'Não foi possível carregar os produtos.'));
    state.ar.produtos = response.data?.produtos || [];
    state.ar.crm.cadastro.produtosCarregando = false;
    renderPainelAr();
  } catch (erro) {
    if (!state.ar.crm.cadastro?.aberto) return;
    state.ar.crm.cadastro.produtosCarregando = false;
    state.ar.crm.cadastro.message = erro.message || 'Não foi possível carregar os produtos.';
    renderPainelAr();
  }
}

async function carregarOpcoesCadastroCrmAr() {
  try {
    const response = await chamarApi('getArCrmFormOptions');
    if (!state.ar.crm.cadastro?.aberto) return;
    if (!response.ok) throw new Error(obterMensagemApi(response, 'Não foi possível carregar as opções do CRM.'));
    const opcoesRemotas = response.data || {};
    const opcoesAtuais = state.ar.crm.cadastro.opcoes || {};
    state.ar.crm.cadastro.opcoes = {
      origensCliente: Array.isArray(opcoesRemotas.origensCliente) && opcoesRemotas.origensCliente.length ? opcoesRemotas.origensCliente : (opcoesAtuais.origensCliente || []),
      situacoesLead: Array.isArray(opcoesRemotas.situacoesLead) && opcoesRemotas.situacoesLead.length ? opcoesRemotas.situacoesLead : (opcoesAtuais.situacoesLead || [])
    };
    state.ar.crm.cadastro.opcoesCarregando = false;
    renderPainelAr();
  } catch (erro) {
    if (!state.ar.crm.cadastro?.aberto) return;
    state.ar.crm.cadastro.opcoesCarregando = false;
    state.ar.crm.cadastro.message = erro.message || 'Não foi possível carregar as opções do CRM.';
    renderPainelAr();
  }
}

function cancelarCadastroClienteCrmAr() {
  state.ar.crm.cadastro = { aberto: false, salvando: false, message: '', draft: {} };
  renderPainelAr();
}

function valorCampoCadastroCrmAr(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function obterMascaraCampoCrmAr(nome = '') {
  const chave = normalizarNomeCampoCrm(nome);
  if (chave === 'cpf' || chave.includes('cpf')) return 'cpf';
  if (chave === 'cnpj' || chave.includes('cnpj')) return 'cnpj';
  if (chave.includes('telefone') || chave.includes('celular') || chave.includes('whatsapp')) return 'telefone';
  return '';
}

function aplicarMascaraCrmAr(input) {
  const mascara = input?.dataset?.crmMask;
  if (!input || !mascara) return;
  const posicao = input.selectionStart || 0;
  const anterior = input.value;
  input.value = formatarMascaraParceiro(input.value, mascara);
  const diferenca = input.value.length - anterior.length;
  input.setSelectionRange(Math.max(0, posicao + diferenca), Math.max(0, posicao + diferenca));
}

function obterOpcoesCadastroCrmArLocais() {
  const campos = (state.ar.crm.items || []).flatMap((item) => Array.isArray(item?.dados?.campos_personalizados) ? item.dados.campos_personalizados : []);
  const obterOpcoes = (nomes) => {
    const campo = campos.find((item) => nomes.some((nome) => normalizarNomeCampoCrm(item?.name || item?.field_name) === normalizarNomeCampoCrm(nome)));
    let config = campo?.type_config || {};
    if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch (_error) { config = {}; }
    }
    return (Array.isArray(config?.options) ? config.options : []).map((option) => ({
      value: String(option.id ?? option.orderindex ?? option.value ?? '').trim(),
      label: String(option.name || option.label || option.value || option.id || '').trim()
    })).filter((option) => option.value && option.label);
  };
  return {
    origensCliente: obterOpcoes(['origem do cliente', 'origem']),
    situacoesLead: obterOpcoes(['situação do lead', 'situacao do lead', 'status do lead'])
  };
}

function produtosDisponiveisCadastroCrmAr() {
  return (state.ar.produtos || [])
    .filter((produto) => produto && (produto.descricao_comercial || produto.product_id))
    .map((produto) => ({
      value: String(produto.descricao_comercial || produto.product_id).trim(),
      sku: String(produto.product_id || '').trim()
    }))
    .filter((produto, indice, lista) => produto.value && lista.findIndex((item) => item.value.toLowerCase() === produto.value.toLowerCase()) === indice);
}

function opcaoCadastroCrmArValida(opcoes, valor) {
  const valorNormalizado = String(valor || '').trim().toLowerCase();
  return (Array.isArray(opcoes) ? opcoes : []).some((opcao) => String(opcao?.value ?? opcao ?? '').trim().toLowerCase() === valorNormalizado);
}

function renderCadastroClienteCrmAr() {
  const cadastro = state.ar.crm.cadastro || {};
  const salvando = Boolean(cadastro.salvando);
  const produtosCarregando = Boolean(cadastro.produtosCarregando);
  const opcoesCarregando = Boolean(cadastro.opcoesCarregando);
  const opcoes = cadastro.opcoes || {};
  const situacoesLead = Array.isArray(opcoes.situacoesLead) ? opcoes.situacoesLead : [];
  const origensCliente = Array.isArray(opcoes.origensCliente) ? opcoes.origensCliente : [];
  const situacaoLeadDisponivel = situacoesLead.length > 0;
  const origemClienteDisponivel = origensCliente.length > 0;
  const draft = cadastro.draft || {};
  const valor = (campo) => escapeAttr(draft[campo] || '');
  const valorMascarado = (campo, mascara) => escapeAttr(formatarMascaraParceiro(draft[campo] || '', mascara));
  return `
    <section class="hub-form-screen ar-crm-client-screen" aria-labelledby="ar-crm-client-title">
      <header class="hub-form-screen-header">
        <div>
          <button class="secondary-btn" type="button" onclick="cancelarCadastroClienteCrmAr()" ${salvando ? 'disabled' : ''}>Voltar para clientes</button>
          <span class="ar-crm-phase1-kicker">NOVO CADASTRO</span>
          <h2 id="ar-crm-client-title">Adicionar cliente</h2>
          <p>O cadastro sera criado no ClickUp e vinculado ao CRM local automaticamente.</p>
        </div>
      </header>

      ${cadastro.message ? `<p class="admin-message hub-form-screen-notice">${escapeHtml(cadastro.message)}</p>` : ''}

      <form class="hub-form-screen-content ar-crm-client-form" onsubmit="salvarCadastroClienteCrmAr(event)">
        <section class="hub-form-section">
          <div class="hub-form-section-title"><strong>Dados do cliente</strong><span>Campos principais</span></div>
          <div class="hub-form-grid">
            <label class="ar-crm-edit-field hub-form-span-2">
              <span>Nome do cliente</span>
              <input id="ar-crm-new-nome" class="config-input" type="text" autocomplete="name" required maxlength="180" value="${valor('nome')}" ${salvando ? 'disabled' : ''}>
            </label>
            <label class="ar-crm-edit-field">
              <span>Status</span>
              <select id="ar-crm-new-status" class="config-input" ${salvando ? 'disabled' : ''}>
                <option value="">Padrao da lista</option>
                ${CRM_STATUS_OPTIONS.map((status) => `<option value="${escapeAttr(status)}" ${draft.status === status ? 'selected' : ''}>${escapeHtml(obterRotuloStatusCrmAr(status))}</option>`).join('')}
              </select>
            </label>
            <label class="ar-crm-edit-field">
              <span>Situação do Lead</span>
              <select id="ar-crm-new-situacao-lead" class="config-input" ${salvando || opcoesCarregando || !situacaoLeadDisponivel ? 'disabled' : ''} ${situacaoLeadDisponivel ? 'required' : ''}>
                <option value="">${opcoesCarregando ? 'Carregando opções...' : situacaoLeadDisponivel ? 'Selecione' : 'Campo sem opções no ClickUp'}</option>
                ${situacoesLead.map((situacao) => `<option value="${escapeAttr(situacao.value ?? situacao)}" ${draft.situacao_lead === (situacao.value ?? situacao) ? 'selected' : ''}>${escapeHtml(situacao.label ?? situacao)}</option>`).join('')}
              </select>
            </label>
            <label class="ar-crm-edit-field">
              <span>CPF</span>
              <input id="ar-crm-new-cpf" class="config-input" type="text" inputmode="numeric" autocomplete="off" maxlength="14" data-crm-mask="cpf" value="${valorMascarado('cpf', 'cpf')}" oninput="aplicarMascaraCrmAr(this)" ${salvando ? 'disabled' : ''}>
            </label>
            <label class="ar-crm-edit-field">
              <span>CNPJ</span>
              <input id="ar-crm-new-cnpj" class="config-input" type="text" inputmode="numeric" autocomplete="off" maxlength="18" data-crm-mask="cnpj" value="${valorMascarado('cnpj', 'cnpj')}" oninput="aplicarMascaraCrmAr(this)" ${salvando ? 'disabled' : ''}>
            </label>
            <label class="ar-crm-edit-field">
              <span>Razao social</span>
              <input id="ar-crm-new-razao-social" class="config-input" type="text" maxlength="180" value="${valor('razao_social')}" ${salvando ? 'disabled' : ''}>
            </label>
            <label class="ar-crm-edit-field">
              <span>E-mail</span>
              <input id="ar-crm-new-email" class="config-input" type="email" autocomplete="email" maxlength="180" value="${valor('email')}" ${salvando ? 'disabled' : ''}>
            </label>
            <label class="ar-crm-edit-field">
              <span>Telefone</span>
              <input id="ar-crm-new-telefone" class="config-input" type="tel" inputmode="numeric" autocomplete="tel" maxlength="15" data-crm-mask="telefone" value="${valorMascarado('telefone', 'telefone')}" oninput="aplicarMascaraCrmAr(this)" ${salvando ? 'disabled' : ''}>
            </label>
            <label class="ar-crm-edit-field">
              <span>Nascimento</span>
              <input id="ar-crm-new-nascimento" class="config-input" type="date" value="${valor('nascimento')}" ${salvando ? 'disabled' : ''}>
            </label>
            <label class="ar-crm-edit-field">
              <span>Profissao/Ramo de atividade</span>
              <input id="ar-crm-new-profissao" class="config-input" type="text" maxlength="180" value="${valor('profissao_ramo')}" ${salvando ? 'disabled' : ''}>
            </label>
            <label class="ar-crm-edit-field">
              <span>Origem do cliente</span>
              <select id="ar-crm-new-origem" class="config-input" ${salvando || opcoesCarregando || !origemClienteDisponivel ? 'disabled' : ''} ${origemClienteDisponivel ? 'required' : ''}>
                <option value="">${opcoesCarregando ? 'Carregando opções...' : origemClienteDisponivel ? 'Selecione' : 'Campo sem opções no ClickUp'}</option>
                ${origensCliente.map((origem) => `<option value="${escapeAttr(origem.value ?? origem)}" ${(draft.origem_cliente === (origem.value ?? origem)) ? 'selected' : ''}>${escapeHtml(origem.label ?? origem)}</option>`).join('')}
              </select>
            </label>
          </div>
        </section>

        <section class="hub-form-section">
          <div class="hub-form-section-title"><strong>Pedido e indicacao</strong><span>Contexto comercial</span></div>
          <div class="hub-form-grid">
            <label class="ar-crm-edit-field">
              <span>Pedido atual</span>
              <input id="ar-crm-new-pedido" class="config-input" type="text" maxlength="120" value="${valor('pedido_atual')}" ${salvando ? 'disabled' : ''}>
            </label>
            <label class="ar-crm-edit-field">
              <span>Produto</span>
              <input id="ar-crm-new-produto" class="config-input" type="search" list="ar-crm-produtos-list" maxlength="160" autocomplete="off" placeholder="${produtosCarregando ? 'Carregando produtos...' : 'Buscar produto'}" value="${valor('produto')}" ${salvando || produtosCarregando ? 'disabled' : ''}>
              <datalist id="ar-crm-produtos-list">
                ${produtosDisponiveisCadastroCrmAr().map((produto) => `<option value="${escapeAttr(produto.value)}" label="${escapeAttr(produto.sku)}"></option>`).join('')}
              </datalist>
            </label>
            <label class="ar-crm-edit-field">
              <span>Parceiro de indicacao</span>
              <input id="ar-crm-new-parceiro" class="config-input" type="text" maxlength="160" value="${valor('parceiro_indicacao')}" ${salvando ? 'disabled' : ''}>
            </label>
            <label class="ar-crm-edit-field">
              <span>E-mail CD/Parceiro</span>
              <input id="ar-crm-new-email-parceiro" class="config-input" type="email" maxlength="180" value="${valor('email_parceiro')}" ${salvando ? 'disabled' : ''}>
            </label>
            <label class="ar-crm-edit-field">
              <span>Inicio de validade</span>
              <input id="ar-crm-new-emissao" class="config-input" type="date" value="${valor('data_emissao')}" ${salvando ? 'disabled' : ''}>
            </label>
            <label class="ar-crm-edit-field">
              <span>Fim de validade</span>
              <input id="ar-crm-new-vencimento" class="config-input" type="date" value="${valor('data_vencimento')}" ${salvando ? 'disabled' : ''}>
            </label>
            <label class="ar-crm-edit-field hub-form-span-2">
              <span>Descricao</span>
              <textarea id="ar-crm-new-descricao" class="config-input config-textarea" rows="4" maxlength="2000" ${salvando ? 'disabled' : ''}>${escapeHtml(draft.descricao || '')}</textarea>
            </label>
          </div>
        </section>

        <footer class="hub-form-screen-actions ar-crm-client-actions">
          <button class="secondary-btn" type="button" onclick="cancelarCadastroClienteCrmAr()" ${salvando ? 'disabled' : ''}>Cancelar</button>
          <button class="secondary-btn" type="button" onclick="salvarCadastroClienteCrmAr(null, true)" ${salvando ? 'disabled' : ''}>Salvar e sincronizar agora</button>
          <button class="save-btn" type="submit" ${salvando ? 'disabled' : ''}>${salvando ? 'Enviando...' : 'Adicionar cliente'}</button>
        </footer>
      </form>
    </section>
  `;
}

async function salvarCadastroClienteCrmAr(event, sincronizarAgora = false) {
  event?.preventDefault();
  const cadastro = state.ar.crm.cadastro;
  if (cadastro.salvando) return;
  const formulario = document.querySelector('.ar-crm-client-form');
  if (formulario && !formulario.reportValidity()) return;
  const cliente = {
    nome: valorCampoCadastroCrmAr('ar-crm-new-nome'),
    status: valorCampoCadastroCrmAr('ar-crm-new-status'),
    situacao_lead: valorCampoCadastroCrmAr('ar-crm-new-situacao-lead'),
    cpf: valorCampoCadastroCrmAr('ar-crm-new-cpf'),
    cnpj: valorCampoCadastroCrmAr('ar-crm-new-cnpj'),
    razao_social: valorCampoCadastroCrmAr('ar-crm-new-razao-social'),
    email: valorCampoCadastroCrmAr('ar-crm-new-email'),
    telefone: valorCampoCadastroCrmAr('ar-crm-new-telefone'),
    origem_cliente: valorCampoCadastroCrmAr('ar-crm-new-origem'),
    pedido_atual: valorCampoCadastroCrmAr('ar-crm-new-pedido'),
    produto: valorCampoCadastroCrmAr('ar-crm-new-produto'),
    parceiro_indicacao: valorCampoCadastroCrmAr('ar-crm-new-parceiro'),
    email_parceiro: valorCampoCadastroCrmAr('ar-crm-new-email-parceiro'),
    nascimento: valorCampoCadastroCrmAr('ar-crm-new-nascimento'),
    profissao_ramo: valorCampoCadastroCrmAr('ar-crm-new-profissao'),
    data_emissao: valorCampoCadastroCrmAr('ar-crm-new-emissao'),
    data_vencimento: valorCampoCadastroCrmAr('ar-crm-new-vencimento'),
    descricao: document.getElementById('ar-crm-new-descricao')?.value?.trim() || ''
  };

  if (!cliente.nome) {
    cadastro.message = 'Informe o nome do cliente.';
    cadastro.draft = cliente;
    renderPainelAr();
    return;
  }

  if (cliente.data_emissao && cliente.data_vencimento && cliente.data_vencimento < cliente.data_emissao) {
    cadastro.message = 'A data de fim de validade deve ser igual ou posterior ao início.';
    cadastro.draft = cliente;
    renderPainelAr();
    return;
  }

  const opcoes = cadastro.opcoes || {};
  if (cadastro.opcoesCarregando || !Array.isArray(opcoes.situacoesLead) || !opcoes.situacoesLead.length || !Array.isArray(opcoes.origensCliente) || !opcoes.origensCliente.length) {
    cadastro.message = 'As opcoes oficiais de Situacao do Lead e Origem do cliente ainda nao estao disponiveis no ClickUp.';
    cadastro.draft = cliente;
    renderPainelAr();
    return;
  }
  if (!opcaoCadastroCrmArValida(opcoes.situacoesLead, cliente.situacao_lead)) {
    cadastro.message = 'Selecione uma Situacao do Lead valida do ClickUp.';
    cadastro.draft = cliente;
    renderPainelAr();
    return;
  }
  if (!opcaoCadastroCrmArValida(opcoes.origensCliente, cliente.origem_cliente)) {
    cadastro.message = 'Selecione uma Origem do cliente valida do ClickUp.';
    cadastro.draft = cliente;
    renderPainelAr();
    return;
  }
  if (cliente.produto && !opcaoCadastroCrmArValida(produtosDisponiveisCadastroCrmAr(), cliente.produto)) {
    cadastro.message = 'Selecione um produto ativo da relacao de produtos.';
    cadastro.draft = cliente;
    renderPainelAr();
    return;
  }

  try {
    cadastro.salvando = true;
    cadastro.message = '';
    cadastro.draft = cliente;
    renderPainelAr();
    const response = await chamarApi('createArCrmClient', { cliente });
    if (!response.ok) throw new Error(obterMensagemApi(response, 'Nao foi possivel adicionar o cliente.'));
    const item = response.data?.item || response.data?.data?.item || null;
    state.ar.crm.cadastro = { aberto: false, salvando: false, message: '', draft: {} };
    await carregarCrmAr(1);
    const itemAtual = item?.id
      ? state.ar.crm.items.find((registro) => registro.id === item.id) || item
      : null;
    if (itemAtual?.id) {
      abrirDetalheCrmAr(itemAtual);
      if (sincronizarAgora) await sincronizarCadastroCrmAr(itemAtual.id);
      return;
    }
    state.ar.crm.message = 'Cliente adicionado e aguardando sincronização com o ClickUp.';
    if (item?.id && item?.dados?.clickup_task_id) visualizarCrmAr(item.id);
  } catch (erro) {
    state.ar.crm.cadastro = {
      aberto: true,
      salvando: false,
      produtosCarregando: false,
      opcoesCarregando: false,
      opcoes: cadastro.opcoes || {},
      message: erro.message || 'Nao foi possivel adicionar o cliente.',
      draft: cliente
    };
    renderPainelAr();
  }
}

function abrirDetalheCrmAr(item) {
  if (!item?.id) return;
  state.ar.crm.detalhe = item;
  state.ar.crm.editando = false;
  state.ar.crm.edicaoAlterada = false;
  state.ar.crm.salvandoEdicao = false;
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  state.ar.crm.atividade = { loading: true, saving: false, savingAction: '', respondingTo: '', repliesCollapsed: {}, reactionMenuFor: '', activeUsers: [], viewerId: '', mentionMenu: { campoId: '', query: '', index: 0 }, requestId, comments: [], attachments: [], message: '' };
  renderPainelAr();
  carregarAtividadeDetalheCrmAr(item, requestId);
}

async function sincronizarCadastroCrmAr(itemId = state.ar.crm.detalhe?.id) {
  const item = state.ar.crm.detalhe;
  if (!itemId || state.ar.crm.sincronizandoCadastro) return;
  if (!pode('painel_ar.crm', 'execute')) {
    state.ar.crm.atividade.message = 'Seu usuario nao possui permissao para sincronizar o CRM AR.';
    renderPainelAr();
    return;
  }

  state.ar.crm.sincronizandoCadastro = true;
  state.ar.crm.atividade.message = '';
  renderPainelAr();
  try {
    const response = await chamarApi('syncPendingArCrm', { itemId });
    if (!response.ok) throw new Error(obterMensagemApi(response, 'Nao foi possivel sincronizar o cadastro.'));
    await carregarCrmAr(state.ar.crm.pagina);
    const atualizado = state.ar.crm.items.find((registro) => registro.id === itemId);
    if (!atualizado) throw new Error('O cadastro sincronizado nao foi localizado no CRM.');
    state.ar.crm.sincronizandoCadastro = false;
    abrirDetalheCrmAr(atualizado);
    if (!atualizado.dados?.clickup_task_id) {
      state.ar.crm.atividade.message = 'A sincronizacao foi enfileirada, mas a tarefa ainda nao foi criada no ClickUp.';
      state.ar.crm.atividade.loading = false;
      renderPainelAr();
    }
  } catch (erro) {
    state.ar.crm.sincronizandoCadastro = false;
    state.ar.crm.atividade.message = erro.message || 'Nao foi possivel sincronizar o cadastro.';
    renderPainelAr();
  }
}

function visualizarCrmAr(id) {
  const item = state.ar.crm.items.find((registro) => registro.id === id);
  if (!item) return;
  abrirDetalheCrmAr(item);
}

async function carregarAtividadeDetalheCrmAr(item, requestId = state.ar.crm.atividade.requestId) {
  const atividade = state.ar.crm.atividade;
  const taskId = item.dados?.clickup_task_id || '';
  const isCurrentRequest = () => state.ar.crm.detalhe?.id === item.id
    && state.ar.crm.atividade.requestId === requestId
    && state.ar.crm.detalhe?.dados?.clickup_task_id === taskId;
  try {
    const response = await chamarApi('getArCrmActivity', { taskId, itemId: item.id });
    if (!isCurrentRequest()) return;
    if (!response.ok) throw new Error(obterMensagemApi(response, 'Não foi possível carregar comentários e anexos.'));
    const dadosAtividade = response.data?.comments || response.data?.attachments
      ? response.data
      : response.data?.data || {};
    if ((dadosAtividade.taskId && dadosAtividade.taskId !== taskId)
      || (dadosAtividade.itemId && dadosAtividade.itemId !== item.id)) throw new Error('A atividade retornada não corresponde ao cadastro aberto.');
    atividade.comments = dadosAtividade.comments || [];
    atividade.attachments = dadosAtividade.attachments || [];
    atividade.activeUsers = dadosAtividade.activeUsers || [];
    atividade.viewerId = dadosAtividade.viewerId || '';
    if (!taskId) atividade.message = 'Atividade local pronta. Comentários e anexos serão enviados após a criação da tarefa no ClickUp.';
  } catch (erro) {
    if (!isCurrentRequest()) return;
    atividade.message = erro.message || 'Não foi possível carregar comentários e anexos.';
  } finally {
    if (!isCurrentRequest()) return;
    atividade.loading = false;
    renderPainelAr();
  }
}

function fecharVisualizacaoCrmAr() {
  state.ar.crm.detalhe = null;
  state.ar.crm.editando = false;
  state.ar.crm.edicaoAlterada = false;
  state.ar.crm.salvandoEdicao = false;
  state.ar.crm.sincronizandoCadastro = false;
  state.ar.crm.atividade = { loading: false, saving: false, savingAction: '', respondingTo: '', repliesCollapsed: {}, reactionMenuFor: '', activeUsers: [], viewerId: '', mentionMenu: { campoId: '', query: '', index: 0 }, requestId: '', comments: [], attachments: [], message: '' };
  renderPainelAr();
}

async function criarComentarioDetalheCrmAr() {
  const editor = document.getElementById('ar-crm-new-comment');
  const texto = editor?.innerText?.trim();
  const mentions = extrairMencoesEditorCrmAr(editor);
  const taskId = state.ar.crm.detalhe?.dados?.clickup_task_id;
  if (state.ar.crm.atividade.saving) return;
  if (!taskId) {
    state.ar.crm.atividade.message = 'A tarefa ainda está aguardando sincronização com o ClickUp.';
    renderPainelAr();
    return;
  }
  if (!texto) {
    state.ar.crm.atividade.message = 'Digite um comentário antes de enviar.';
    renderPainelAr();
    return;
  }
  if (!taskId) {
    state.ar.crm.atividade.message = 'Este cadastro não possui uma tarefa do ClickUp vinculada.';
    renderPainelAr();
    return;
  }
  await executarAtividadeCrmAr('createArCrmComment', { taskId, commentText: texto, mentions });
}

function obterMenuMencoesCrmAr(campoId) {
  return Array.from(document.querySelectorAll('.ar-crm-mention-menu')).find((menu) => menu.dataset.for === campoId);
}

function normalizarTextoMencaoCrmAr(valor = '') {
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function obterPontoTextoCrmAr(root, offset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let restante = Math.max(0, offset);
  let node;
  while ((node = walker.nextNode())) {
    if (restante <= node.nodeValue.length) return { node, offset: restante };
    restante -= node.nodeValue.length;
  }
  return { node: root, offset: root.childNodes.length };
}

function obterTextoAntesCursorCrmAr(campo) {
  const selection = window.getSelection();
  if (!campo || !selection?.rangeCount || !campo.contains(selection.anchorNode)) return campo?.innerText || '';
  const range = selection.getRangeAt(0).cloneRange();
  range.selectNodeContents(campo);
  range.setEnd(selection.anchorNode, selection.anchorOffset);
  return range.toString();
}

function atualizarMenuMencoesCrmAr(campo) {
  const menu = obterMenuMencoesCrmAr(campo?.id);
  if (!campo || !menu) return;
  const antes = obterTextoAntesCursorCrmAr(campo);
  const match = antes.match(/(?:^|\s)@([^\s@]*)$/u);
  if (!match) {
    menu.hidden = true;
    state.ar.crm.atividade.mentionMenu = { campoId: '', query: '', index: 0 };
    return;
  }
  const query = normalizarTextoMencaoCrmAr(match[1]);
  const usuarios = (state.ar.crm.atividade.activeUsers || []).filter((usuario) => {
    const nome = normalizarTextoMencaoCrmAr(usuario.nome);
    const email = normalizarTextoMencaoCrmAr(usuario.email);
    return !query || nome.includes(query) || email.includes(query);
  }).slice(0, 8);
  state.ar.crm.atividade.mentionMenu = { campoId: campo.id, query, index: 0 };
  menu.innerHTML = usuarios.length ? usuarios.map((usuario, index) => `<button type="button" class="ar-crm-mention-option ${index === 0 ? 'is-active' : ''}" data-mention-user-id="${escapeAttr(usuario.id)}" onmousedown="event.preventDefault()" onclick="selecionarMencaoComentarioCrmAr(this.dataset.mentionUserId, '${escapeAttr(campo.id)}')"><strong>${escapeHtml(usuario.nome)}</strong><small>${escapeHtml(usuario.email || '')}</small></button>`).join('') : '<span class="ar-crm-mention-empty">Nenhum usuário ativo encontrado.</span>';
  menu.hidden = false;
}

function aoDigitarComentarioCrmAr(campo) {
  ajustarAlturaEditorComentarioCrmAr(campo);
  atualizarMenuMencoesCrmAr(campo);
}

function selecionarMencaoComentarioCrmAr(userId, campoId) {
  const campo = document.getElementById(campoId);
  const usuario = (state.ar.crm.atividade.activeUsers || []).find((item) => String(item.id) === String(userId));
  if (!campo || !usuario) return;
  const selection = window.getSelection();
  if (!selection?.rangeCount || !campo.contains(selection.anchorNode)) return;
  const antes = obterTextoAntesCursorCrmAr(campo);
  const match = antes.match(/(?:^|\s)@([^\s@]*)$/u);
  if (!match) return;
  const caretOffset = antes.length;
  const deleteRange = document.createRange();
  const inicio = obterPontoTextoCrmAr(campo, caretOffset - match[0].length);
  const fim = obterPontoTextoCrmAr(campo, caretOffset);
  deleteRange.setStart(inicio.node, inicio.offset);
  deleteRange.setEnd(fim.node, fim.offset);
  deleteRange.deleteContents();
  const mention = document.createElement('span');
  mention.className = 'ar-crm-mention';
  mention.dataset.mentionUserId = usuario.id;
  mention.dataset.mentionUserName = usuario.nome;
  mention.textContent = `@${usuario.nome}`;
  deleteRange.insertNode(mention);
  const space = document.createTextNode(' ');
  mention.after(space);
  selection.removeAllRanges();
  const nextRange = document.createRange();
  nextRange.setStart(space, 1);
  nextRange.collapse(true);
  selection.addRange(nextRange);
  const menu = obterMenuMencoesCrmAr(campoId);
  if (menu) menu.hidden = true;
  campo.focus();
}

function extrairMencoesEditorCrmAr(campo) {
  return Array.from(campo?.querySelectorAll('[data-mention-user-id]') || []).map((elemento) => ({
    userId: elemento.dataset.mentionUserId,
    displayName: elemento.dataset.mentionUserName || elemento.textContent.replace(/^@/, '')
  })).filter((mention) => mention.userId);
}

function formatarTextoComentarioCrmAr(tipo, campoId = 'ar-crm-new-comment') {
  const campo = document.getElementById(campoId);
  if (!campo) return;
  campo.focus();
  if (tipo === 'negrito') document.execCommand('bold');
  if (tipo === 'italico') document.execCommand('italic');
  if (tipo === 'sublinhado') document.execCommand('underline');
  if (tipo === 'tachado') document.execCommand('strikeThrough');
  if (tipo === 'citacao') document.execCommand('formatBlock', false, 'blockquote');
  if (tipo === 'lista') document.execCommand('insertUnorderedList');
  if (tipo.startsWith('cor-')) document.execCommand('backColor', false, tipo.slice(4));
}

function acionarAtalhoComentarioCrmAr(event, campoId = 'ar-crm-new-comment') {
  const campo = document.getElementById(campoId);
  const menu = obterMenuMencoesCrmAr(campoId);
  const opcoes = menu && !menu.hidden ? Array.from(menu.querySelectorAll('.ar-crm-mention-option')) : [];
  if (opcoes.length && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
    const mentionMenu = state.ar.crm.atividade.mentionMenu;
    if (event.key === 'Escape') {
      menu.hidden = true;
      return;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      selecionarMencaoComentarioCrmAr(opcoes[mentionMenu.index]?.dataset.mentionUserId, campoId);
      return;
    }
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    mentionMenu.index = (mentionMenu.index + delta + opcoes.length) % opcoes.length;
    opcoes.forEach((opcao, index) => opcao.classList.toggle('is-active', index === mentionMenu.index));
    return;
  }
  if (!(event.ctrlKey || event.metaKey)) return;
  const atalhos = {
    b: 'negrito',
    i: 'italico',
    u: 'sublinhado'
  };
  const tecla = String(event.key || '').toLowerCase();
  const tipo = event.shiftKey && tecla === 'x' ? 'tachado' : atalhos[tecla];
  if (!tipo) return;
  event.preventDefault();
  formatarTextoComentarioCrmAr(tipo, campoId);
}

function ajustarAlturaEditorComentarioCrmAr(campo) {
  if (!campo) return;
  campo.style.height = 'auto';
  campo.style.height = `${Math.max(76, campo.scrollHeight)}px`;
  campo.focus();
}

function iniciarRedimensionamentoComentarioCrmAr(event) {
  const editor = document.getElementById('ar-crm-new-comment');
  if (!editor) return;
  event.preventDefault();
  const inicioY = event.clientY;
  const alturaInicial = editor.offsetHeight;
  const mover = (movimento) => {
    const altura = Math.max(76, Math.min(window.innerHeight * 0.55, alturaInicial + movimento.clientY - inicioY));
    editor.style.height = `${altura}px`;
  };
  const finalizar = () => {
    document.removeEventListener('mousemove', mover);
    document.removeEventListener('mouseup', finalizar);
  };
  document.addEventListener('mousemove', mover);
  document.addEventListener('mouseup', finalizar);
}

async function executarAtividadeCrmAr(action, payload) {
  const atividade = state.ar.crm.atividade;
  if (atividade.saving) return;
  const publicacao = ['createArCrmComment', 'replyArCrmComment'].includes(action);
  const comentarioPendente = publicacao
    ? (payload._pendingCommentId ? localizarComentarioCrmAr(atividade.comments, payload._pendingCommentId) : criarComentarioPendenteCrmAr(action, payload))
    : null;
  atividade.saving = true;
  atividade.savingAction = action === 'replyArCrmComment' ? 'Respondendo...' : 'Adicionando...';
  atividade.message = '';
  renderPainelAr();
  try {
    const response = await chamarApi(action, payload);
    if (!response.ok) throw new Error(obterMensagemApi(response, 'Não foi possível atualizar os comentários.'));
    if (comentarioPendente) {
      reconciliarComentarioPendenteCrmAr(comentarioPendente, response);
      delete comentarioPendente.hub_retry_payload;
    }
    const inseridoLocalmente = publicacao && Boolean(comentarioPendente);
    if (!inseridoLocalmente) await carregarAtividadeDetalheCrmAr(state.ar.crm.detalhe);
  } catch (erro) {
    if (comentarioPendente) {
      comentarioPendente.hub_pending = 'error';
      comentarioPendente.hub_error = erro.message || 'Não foi possível enviar o comentário.';
      comentarioPendente.hub_retry_payload = {
        action,
        payload: {
          taskId: payload.taskId,
          commentId: payload.commentId,
          commentText: payload.commentText,
          mentions: payload.mentions || [],
          _pendingCommentId: comentarioPendente.id
        }
      };
    }
    state.ar.crm.atividade.message = erro.message || 'Não foi possível atualizar os comentários.';
    renderPainelAr();
  } finally {
    state.ar.crm.atividade.saving = false;
    state.ar.crm.atividade.savingAction = '';
    renderPainelAr();
  }
}

async function reenviarComentarioPendenteCrmAr(commentId) {
  const comentario = localizarComentarioCrmAr(state.ar.crm.atividade.comments, commentId);
  const reenvio = comentario?.hub_retry_payload;
  if (!comentario || !reenvio || state.ar.crm.atividade.saving) return;
  comentario.hub_pending = true;
  comentario.hub_error = '';
  renderPainelAr();
  await executarAtividadeCrmAr(reenvio.action, reenvio.payload);
}

async function responderComentarioDetalheCrmAr(commentId) {
  if (!commentId || state.ar.crm.atividade.saving) return;
  state.ar.crm.atividade.respondingTo = commentId;
  state.ar.crm.atividade.message = '';
  renderPainelAr();
  document.getElementById('ar-crm-reply-editor')?.focus();
}

async function enviarRespostaComentarioCrmAr(commentId) {
  const editor = document.getElementById('ar-crm-reply-editor');
  const texto = editor?.innerText?.trim();
  const mentions = extrairMencoesEditorCrmAr(editor);
  const taskId = state.ar.crm.detalhe?.dados?.clickup_task_id;
  if (!texto || !taskId || state.ar.crm.atividade.saving) return;
  state.ar.crm.atividade.respondingTo = '';
  state.ar.crm.atividade.repliesCollapsed[commentId] = false;
  await executarAtividadeCrmAr('replyArCrmComment', { taskId, commentId, commentText: texto, mentions });
}

function cancelarRespostaComentarioCrmAr() {
  state.ar.crm.atividade.respondingTo = '';
  renderPainelAr();
}

function alternarRespostasComentarioCrmAr(commentId) {
  const atividade = state.ar.crm.atividade;
  atividade.repliesCollapsed[commentId] = !atividade.repliesCollapsed[commentId];
  renderPainelAr();
}

function alternarMenuReacoesCrmAr(commentId) {
  const atividade = state.ar.crm.atividade;
  atividade.reactionMenuFor = atividade.reactionMenuFor === String(commentId) ? '' : String(commentId);
  renderPainelAr();
}

function localizarComentarioCrmAr(comentarios, commentId) {
  for (const comentario of comentarios || []) {
    if (String(comentario.id || '') === String(commentId)) return comentario;
    const encontrado = localizarComentarioCrmAr(comentario.replies, commentId);
    if (encontrado) return encontrado;
  }
  return null;
}

function obterIdComentarioRespostaCrmAr(response) {
  let atual = response;
  for (let nivel = 0; nivel < 5 && atual; nivel += 1) {
    if (typeof atual !== 'object') break;
    const item = atual;
    const id = item.id || item.comment_id || item.hist_id || item.comment?.id;
    if (id) return String(id).trim();
    atual = item.data;
  }
  return '';
}

function criarComentarioPendenteCrmAr(action, payload) {
  const atividade = state.ar.crm.atividade;
  const comentario = {
    id: `hub-pending-${Date.now()}`,
    comment_text: payload.commentText,
    date: String(Date.now()),
    user: { username: state.usuario?.nome || 'Você' },
    hub_mentions: (payload.mentions || []).map((mention) => {
      const usuario = (atividade.activeUsers || []).find((item) => String(item.id) === String(mention.userId));
      return usuario ? { user_id: usuario.id, display_name: usuario.nome } : null;
    }).filter(Boolean),
    hub_reactions: [],
    replies: [],
    hub_pending: true
  };
  const comentarios = atividade.comments || [];
  if (action === 'createArCrmComment') {
    comentarios.push(comentario);
    return comentario;
  }
  const pai = localizarComentarioCrmAr(comentarios, payload.commentId);
  if (!pai) return null;
  pai.replies = Array.isArray(pai.replies) ? pai.replies : [];
  pai.replies.push(comentario);
  return comentario;
}

function reconciliarComentarioPendenteCrmAr(comentario, response) {
  if (!comentario) return;
  const idConfirmado = obterIdComentarioRespostaCrmAr(response);
  if (idConfirmado) comentario.id = idConfirmado;
  comentario.hub_pending = false;
}

function removerComentarioCrmAr(comentarios, alvo) {
  const indice = (comentarios || []).indexOf(alvo);
  if (indice >= 0) {
    comentarios.splice(indice, 1);
    return true;
  }
  return (comentarios || []).some((comentario) => removerComentarioCrmAr(comentario.replies, alvo));
}

async function alternarReacaoComentarioCrmAr(commentId, emoji) {
  const atividade = state.ar.crm.atividade;
  const taskId = state.ar.crm.detalhe?.dados?.clickup_task_id;
  const comentario = localizarComentarioCrmAr(atividade.comments, commentId);
  if (!taskId || !commentId || !emoji || atividade.saving || !comentario) return;
  const reacoesAnteriores = Array.isArray(comentario.hub_reactions) ? [...comentario.hub_reactions] : [];
  const reacaoAtual = reacoesAnteriores.findIndex((reaction) => String(reaction.user_id) === String(atividade.viewerId) && reaction.emoji === emoji);
  comentario.hub_reactions = reacaoAtual >= 0
    ? reacoesAnteriores.filter((_reaction, index) => index !== reacaoAtual)
    : [...reacoesAnteriores, { user_id: atividade.viewerId, emoji }];
  atividade.reactionMenuFor = '';
  atividade.saving = true;
  atividade.savingAction = 'Atualizando reação...';
  atividade.message = '';
  renderPainelAr();
  try {
    const response = await chamarApi('toggleArCrmReaction', { taskId, commentId, emoji });
    if (!response.ok) throw new Error(obterMensagemApi(response, 'Não foi possível atualizar a reação.'));
  } catch (erro) {
    comentario.hub_reactions = reacoesAnteriores;
    atividade.message = erro.message || 'Não foi possível atualizar a reação.';
  } finally {
    atividade.saving = false;
    atividade.savingAction = '';
    renderPainelAr();
  }
}

async function editarComentarioDetalheCrmAr(commentId) {
  const comentario = (state.ar.crm.atividade.comments || []).find((item) => String(item.id || '') === String(commentId));
  const atual = comentario ? extrairTextoComentarioCrmAr(comentario) : '';
  const texto = window.prompt('Editar comentário:', atual);
  const taskId = state.ar.crm.detalhe?.dados?.clickup_task_id;
  if (texto?.trim() && taskId) await executarAtividadeCrmAr('updateArCrmComment', { taskId, commentId, commentText: texto.trim() });
}

async function excluirComentarioDetalheCrmAr(commentId) {
  const taskId = state.ar.crm.detalhe?.dados?.clickup_task_id;
  if (taskId && window.confirm('Excluir este comentário?')) await executarAtividadeCrmAr('deleteArCrmComment', { taskId, commentId });
}

async function adicionarAnexoDetalheCrmAr(input) {
  const arquivo = input?.files?.[0];
  const taskId = state.ar.crm.detalhe?.dados?.clickup_task_id;
  if (!arquivo || !taskId) return;
  if (arquivo.size > 10 * 1024 * 1024) {
    state.ar.crm.atividade.message = 'O arquivo deve ter no máximo 10 MB.';
    renderPainelAr();
    return;
  }
  try {
    const response = await chamarApi('addArCrmAttachment', { taskId, file: arquivo });
    if (!response.ok) throw new Error(obterMensagemApi(response, 'Não foi possível adicionar o anexo.'));
    await carregarAtividadeDetalheCrmAr(state.ar.crm.detalhe);
  } catch (erro) {
    state.ar.crm.atividade.message = erro.message || 'Não foi possível adicionar o anexo.';
    renderPainelAr();
  } finally {
    if (input) input.value = '';
  }
}

function renderDetalheCrmAr(item) {
  const dados = item.dados || {};
  const campos = (Array.isArray(dados.campos_personalizados) ? dados.campos_personalizados : []).map((campo) => ({ ...campo }));
  const cadastro = dados.cadastro && typeof dados.cadastro === 'object' ? dados.cadastro : dados;
  const camposFallback = [
    ['situacao_lead', 'Situação do Lead', ['situação do lead', 'situacao do lead', 'status do lead']],
    ['produto', 'Produto', ['produto']],
    ['cpf', 'CPF', ['cpf']],
    ['origem_cliente', 'Origem do cliente', ['origem do cliente', 'origem']],
    ['parceiro_indicacao', 'Parceiro de indicação', ['parceiro de indicação', 'parceiro de indicacao', 'parceiro']],
    ['email_parceiro', 'E-mail CD/Parceiro', ['e-mail cd/parceiro', 'email cd/parceiro', 'email parceiro']],
    ['nascimento', 'Nascimento', ['nascimento', 'data de nascimento']],
    ['profissao_ramo', 'Profissão/Ramo de atividade', ['profissão/ramo de atividade', 'profissao/ramo de atividade', 'profissão', 'profissao']]
  ];
  camposFallback.forEach(([chave, nome, aliases]) => {
    const valorFallback = cadastro?.[chave];
    if (valorFallback === null || valorFallback === undefined || String(valorFallback).trim() === '') return;
    const existente = selecionarCampoCrmAr(campos, aliases);
    if (existente) {
      if (obterValorCampoCrmAr(existente) === '—') {
        existente.value = valorFallback;
        existente.valor_original = valorFallback;
        existente.display_value = valorFallback;
      }
      return;
    }
    campos.push({ id: `local-cadastro-${chave}`, name: nome, type: 'text', value: valorFallback, valor_original: valorFallback, display_value: valorFallback, local_only: true });
  });
  const descricao = dados.descricao || 'Sem descrição.';
  const usados = new Set();
  const campoSituacaoLead = selecionarCampoCrmAr(campos, ['situação do lead', 'situacao do lead', 'status do lead']);
  const campoCpf = selecionarCampoCrmAr(campos, ['cpf']);
  const nomeCliente = item.nome || 'Sem nome';
  [campoSituacaoLead].filter(Boolean).forEach((campo) => usados.add(campo));
  const cliente = selecionarCamposCrmAr(campos, ['cpf', 'cnpj', 'razão social', 'razao social', 'nascimento', 'profissão', 'profissao', 'e-mail', 'email', 'telefone', 'celular', 'whatsapp', 'origem do cliente'], usados)
    .filter((campo) => {
      const nomeCampo = normalizarNomeCampoCrm(obterNomeCampoCrm(campo)).replace(/[-\s]/g, '');
      return !nomeCampo.includes('emailcd/parceiro');
    });
  ordenarCamposCrmAr(cliente, [
    ['nascimento'],
    ['telefone', 'celular', 'whatsapp'],
    ['e-mail', 'email'],
    ['cpf'],
    ['cnpj'],
    ['razão social', 'razao social']
  ]);
  const pedido = selecionarCamposCrmAr(campos, ['pedido atual', 'produto', 'data de emissão', 'data emissao', 'data de vencimento', 'vencimento', 'renovação', 'renovacao'], usados);
  ordenarCamposCrmAr(pedido, [
    ['pedido atual'],
    ['produto'],
    ['data de emissão', 'data emissao', 'emissao'],
    ['data de vencimento', 'vencimento', 'renovação', 'renovacao']
  ]);
  const parceiro = selecionarCamposCrmAr(campos, ['parceiro de indicação', 'parceiro', 'indicação', 'indicacao'], usados);
  const vencimentoExiste = pedido.some((campo) => normalizarNomeCampoCrm(obterNomeCampoCrm(campo)).includes('vencimento'));
  if (!vencimentoExiste && item.data_vencimento) {
    pedido.push({ name: 'Data de Vencimento', value: item.data_vencimento });
  }
  const outros = campos.filter((campo) => !usados.has(campo) && obterValorCampoCrmAr(campo) !== '—');
  const cpf = campoCpf ? formatarCampoCrmAr('cpf', obterValorCampoCrmAr(campoCpf)) : '';
  const podeEditar = pode('painel_ar.crm', 'execute');
  const taskId = dados.clickup_task_id || '';
  const cadastroPendente = !taskId || item.sync_status !== 'synced' || dados.cadastro_pendente_clickup;

  return `
    <section class="ar-crm-detail-screen" aria-labelledby="ar-crm-detail-title">
      <div class="ar-crm-detail-screen-header">
        <div>
          <button class="secondary-btn" type="button" onclick="fecharVisualizacaoCrmAr()">← Voltar para clientes</button>
          <span class="ar-crm-phase1-kicker">${cadastroPendente ? 'CADASTRO PENDENTE' : 'CADASTRO IMPORTADO'}</span>
          ${state.ar.crm.editando ? `<label class="ar-crm-edit-field ar-crm-edit-title-field"><span>Nome do cliente</span><input id="ar-crm-edit-name" class="config-input ar-crm-edit-input ar-crm-edit-title" type="text" value="${escapeAttr(nomeCliente)}" aria-label="Nome do cliente" required oninput="marcarAlteracaoCamposCrmAr()" ${state.ar.crm.salvandoEdicao ? 'disabled' : ''}></label>` : `<h3 id="ar-crm-detail-title">${escapeHtml(nomeCliente)}</h3>`}
          <div class="ar-crm-header-pills" aria-label="Status do cadastro">
            ${state.ar.crm.editando ? renderEditorStatusCrmAr(item.status) : `<div class="ar-crm-header-status-item ar-crm-status-${escapeAttr(obterClasseStatusCrmAr(item.status))}"><span class="ar-crm-header-status-label">Status</span><span class="ar-crm-lead-pill">${escapeHtml(obterRotuloStatusCrmAr(item.status))}</span></div>`}
            ${state.ar.crm.editando && campoSituacaoLead ? renderEditorSituacaoLeadCrmAr(campoSituacaoLead) : `<div class="ar-crm-header-status-item ar-crm-status-${escapeAttr(obterClasseStatusCrmAr(campoSituacaoLead ? obterValorCampoCrmAr(campoSituacaoLead) : ''))}"><span class="ar-crm-header-status-label">Situação do Lead</span><span class="ar-crm-lead-pill">${escapeHtml(campoSituacaoLead ? obterValorCampoCrmAr(campoSituacaoLead) : '—')}</span></div>`}
          </div>
        </div>
        <div class="ar-crm-detail-header-actions">
          ${state.ar.crm.editando ? `<button class="secondary-btn" type="button" onclick="cancelarEdicaoCamposCrmAr()" ${state.ar.crm.salvandoEdicao ? 'disabled' : ''}>Cancelar</button><button id="ar-crm-save-fields" class="save-btn" type="button" onclick="salvarCamposCrmAr()" ${!state.ar.crm.edicaoAlterada || state.ar.crm.salvandoEdicao ? 'disabled' : ''}>${state.ar.crm.salvandoEdicao ? 'Salvando...' : 'Salvar'}</button>` : `${podeEditar ? `<button class="save-btn" type="button" onclick="sincronizarCadastroCrmAr('${escapeAttr(item.id)}')" ${state.ar.crm.sincronizandoCadastro ? 'disabled' : ''}>${state.ar.crm.sincronizandoCadastro ? 'Sincronizando...' : 'Sincronizar agora'}</button>` : ''}${podeEditar && taskId ? '<button class="secondary-btn" type="button" onclick="editarCamposCrmAr()">Editar campos</button>' : ''}`}
          <span class="ar-crm-sync-badge ${escapeAttr(item.sync_status || 'pending')}">${escapeHtml(obterRotuloEstadoSincronizacaoCrmAr(item.sync_status))}</span>
          ${dados.clickup_url ? `<a class="secondary-btn" href="${escapeAttr(dados.clickup_url)}" target="_blank" rel="noopener">Abrir no ClickUp</a>` : ''}
        </div>
      </div>
      <div class="ar-crm-detail-layout">
        <main class="ar-crm-detail-main">
          ${renderGrupoCamposCrmAr('Dados do cliente', cliente)}
          ${renderGrupoCamposCrmAr('Dados do Pedido', pedido, 'ar-crm-order-data', cpf ? `<button class="secondary-btn ar-crm-related-orders-button" type="button" onclick="abrirPedidosRelacionadosCrmAr('${escapeAttr(cpf)}')">Ver pedidos deste CPF</button>` : '')}
          ${renderGrupoCamposCrmAr('Parceiro de Indicação', parceiro)}
          ${renderGrupoCamposCrmAr('Outras informações', outros, 'ar-crm-secondary-data')}
          <div class="ar-crm-detail-section ar-crm-description-block">
            ${state.ar.crm.editando ? '' : '<span>Descrição</span>'}
            ${state.ar.crm.editando ? `<label class="ar-crm-edit-field"><span>Descrição</span><textarea id="ar-crm-edit-description" class="config-input config-textarea ar-crm-edit-input" rows="4" oninput="marcarAlteracaoCamposCrmAr()" ${state.ar.crm.salvandoEdicao ? 'disabled' : ''}>${escapeHtml(dados.descricao || '')}</textarea></label>` : `<p>${escapeHtml(descricao)}</p>`}
          </div>
          <div class="ar-crm-sync-meta" aria-label="Origem e sincronização">
            <span>Lista: ${escapeHtml(dados.lista?.name || dados.lista?.id || '—')}</span>
            <span>Pasta: ${escapeHtml(dados.pasta?.name || dados.pasta?.id || '—')}</span>
            <span>Criado: ${escapeHtml(formatarDataHoraCrmAr(dados.data_criacao) || '—')}</span>
            <span>Atualizado: ${escapeHtml(formatarDataHoraCrmAr(dados.data_atualizacao) || '—')}</span>
            <span>ID: ${escapeHtml(dados.clickup_task_id || '—')}</span>
          </div>
          ${renderAnexosCrmAr()}
        </main>
        ${renderAtividadeCrmAr()}
      </div>
      ${renderPedidosRelacionadosCrmAr()}
    </section>
  `;
}

function extrairTextoComentarioCrmAr(comentario) {
  if (typeof comentario?.comment_text === 'string') return comentario.comment_text;
  if (Array.isArray(comentario?.comment_text)) return comentario.comment_text.map((item) => item.text || item.value || '').join('');
  return comentario?.comment_text?.text || comentario?.text || 'Comentário sem texto';
}

function achatarRespostasCrmAr(respostas = []) {
  return respostas.flatMap((resposta) => [
    resposta,
    ...achatarRespostasCrmAr(Array.isArray(resposta.replies) ? resposta.replies : [])
  ]);
}

function escaparRegexCrmAr(valor = '') {
  return String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderTextoComentarioCrmAr(comentario) {
  let html = escapeHtml(extrairTextoComentarioCrmAr(comentario));
  const mencoes = Array.isArray(comentario.hub_mentions) ? comentario.hub_mentions : [];
  mencoes
    .filter((mention) => mention.display_name)
    .sort((a, b) => String(b.display_name).length - String(a.display_name).length)
    .forEach((mention) => {
      const token = `@${mention.display_name}`;
      const escapedToken = escapeHtml(token);
      html = html.replace(new RegExp(escaparRegexCrmAr(escapedToken), 'g'), `<span class="ar-crm-mention" data-mention-user-id="${escapeAttr(mention.user_id || '')}">${escapedToken}</span>`);
    });
  return html;
}

function renderReacoesComentarioCrmAr(comentario) {
  const reacoes = Array.isArray(comentario.hub_reactions) ? comentario.hub_reactions : [];
  const agrupadas = new Map();
  reacoes.forEach((reaction) => {
    const atual = agrupadas.get(reaction.emoji) || { total: 0, active: false };
    atual.total += 1;
    atual.active = atual.active || String(reaction.user_id) === String(state.ar.crm.atividade.viewerId);
    agrupadas.set(reaction.emoji, atual);
  });
  const pills = Array.from(agrupadas.entries()).map(([emoji, dados]) => `<button type="button" class="ar-crm-reaction-pill ${dados.active ? 'is-active' : ''}" onclick="alternarReacaoComentarioCrmAr('${escapeAttr(comentario.id || '')}', '${escapeAttr(emoji)}')" aria-label="Reagir com ${escapeAttr(emoji)}">${emoji} <span>${dados.total}</span></button>`).join('');
  const menuAberto = state.ar.crm.atividade.reactionMenuFor === String(comentario.id || '');
  const menu = menuAberto ? `<span class="ar-crm-reaction-menu">${['👍', '❤️', '😂', '😮', '😢', '🎉'].map((emoji) => `<button type="button" onclick="alternarReacaoComentarioCrmAr('${escapeAttr(comentario.id || '')}', '${escapeAttr(emoji)}')" aria-label="Reagir com ${escapeAttr(emoji)}">${emoji}</button>`).join('')}</span>` : '';
  return `<div class="ar-crm-comment-reactions">${pills}${menu}<button type="button" class="ar-crm-reaction-trigger" onclick="alternarMenuReacoesCrmAr('${escapeAttr(comentario.id || '')}')" aria-label="Adicionar reação">☺</button></div>`;
}

function renderComentarioCrmAr(comentario, nivel = 0) {
  const id = comentario.id || '';
  const autor = comentario.user?.username || comentario.user?.initials || 'Usuário';
  const estadoEnvio = comentario.hub_pending === 'error' ? 'Falha no envio' : comentario.hub_pending ? 'Enviando…' : formatarDataHoraCrmAr(comentario.date) || '';
  const respostas = nivel === 0 ? achatarRespostasCrmAr(Array.isArray(comentario.replies) ? comentario.replies : []) : [];
  const respostaAberta = nivel === 0 && state.ar.crm.atividade.respondingTo === String(id);
  const respostasRecolhidas = nivel === 0 && respostas.length > 1 && state.ar.crm.atividade.repliesCollapsed[id] !== false;
  return `<article class="ar-crm-comment-item" style="--crm-comment-level:${Math.min(nivel, 4)}">
    <div><strong>${escapeHtml(autor)}</strong><small class="${comentario.hub_pending === 'error' ? 'is-error' : comentario.hub_pending ? 'is-pending' : ''}">${escapeHtml(estadoEnvio)}</small></div>
    <p>${renderTextoComentarioCrmAr(comentario)}</p>
    ${nivel === 0 ? `<div class="ar-crm-comment-actions">
      <button type="button" data-comment-id="${escapeAttr(id)}" onclick="responderComentarioDetalheCrmAr(this.dataset.commentId)">Responder</button>
      ${respostas.length ? `<button type="button" class="ar-crm-replies-toggle" onclick="alternarRespostasComentarioCrmAr('${escapeAttr(id)}')" aria-expanded="${respostasRecolhidas ? 'false' : 'true'}">${respostasRecolhidas ? '▸' : '▾'} ${respostas.length} ${respostas.length === 1 ? 'resposta' : 'respostas'}</button>` : ''}
      ${renderReacoesComentarioCrmAr(comentario)}
    </div>` : ''}
    ${comentario.hub_pending === 'error' ? `<div class="ar-crm-comment-pending-error"><span>${escapeHtml(comentario.hub_error || 'Não foi possível enviar.')}</span><button type="button" onclick="reenviarComentarioPendenteCrmAr('${escapeAttr(id)}')">Reenviar</button></div>` : ''}
    ${respostaAberta ? `<div class="ar-crm-reply-compose">
      <div class="ar-crm-comment-toolbar" aria-label="Formatação da resposta">
        <button type="button" title="Negrito" onclick="formatarTextoComentarioCrmAr('negrito', 'ar-crm-reply-editor')"><strong>B</strong></button>
        <button type="button" title="Itálico" onclick="formatarTextoComentarioCrmAr('italico', 'ar-crm-reply-editor')"><em>I</em></button>
        <button type="button" title="Sublinhado" onclick="formatarTextoComentarioCrmAr('sublinhado', 'ar-crm-reply-editor')"><u>U</u></button>
        <button type="button" title="Tachado" onclick="formatarTextoComentarioCrmAr('tachado', 'ar-crm-reply-editor')"><s>S</s></button>
        <button type="button" class="ar-crm-format-color-yellow" title="Destacar em amarelo" onclick="formatarTextoComentarioCrmAr('cor-#fff3a3', 'ar-crm-reply-editor')">A</button>
        <button type="button" class="ar-crm-format-color-blue" title="Destacar em azul" onclick="formatarTextoComentarioCrmAr('cor-#cfe8ff', 'ar-crm-reply-editor')">A</button>
        <button type="button" class="ar-crm-format-color-red" title="Destacar em vermelho" onclick="formatarTextoComentarioCrmAr('cor-#ffd6d6', 'ar-crm-reply-editor')">A</button>
      </div>
      <div class="ar-crm-reply-editor-wrap"><div id="ar-crm-reply-editor" class="ar-crm-reply-editor" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Escreva uma resposta..." oninput="aoDigitarComentarioCrmAr(this)" onkeydown="acionarAtalhoComentarioCrmAr(event, 'ar-crm-reply-editor')"></div><div class="ar-crm-mention-menu" data-for="ar-crm-reply-editor" hidden></div></div>
      <div><button type="button" class="secondary-btn" onclick="cancelarRespostaComentarioCrmAr()">Cancelar</button><button type="button" class="save-btn" onclick="enviarRespostaComentarioCrmAr('${escapeAttr(id)}')" ${state.ar.crm.atividade.saving ? 'disabled' : ''}>${state.ar.crm.atividade.saving ? 'Respondendo...' : 'Enviar resposta'}</button></div>
    </div>` : ''}
    ${respostas.length && !respostasRecolhidas ? `<div class="ar-crm-comment-replies">${respostas.map((resposta) => renderComentarioCrmAr(resposta, nivel + 1)).join('')}</div>` : ''}
  </article>`;
}

function renderAtividadeCrmAr() {
  const atividade = state.ar.crm.atividade;
  const comentarios = atividade.comments || [];
  const taskId = state.ar.crm.detalhe?.dados?.clickup_task_id || '';
  return `<aside class="ar-crm-comments-column" aria-label="Comentários">
    <div class="ar-crm-comments-header"><span>Comentários</span><small>${comentarios.length}</small></div>
    ${atividade.loading ? renderHubLoading('Carregando atividade...') : `
      ${atividade.message ? `<p class="admin-message">${escapeHtml(atividade.message)}</p>` : ''}
      ${!taskId ? '<p class="ar-crm-detail-muted">Este cadastro ainda não possui uma tarefa no ClickUp. A atividade será liberada após a sincronização.</p>' : `<div class="ar-crm-comment-compose">
        <div class="ar-crm-comment-toolbar" aria-label="Formatação do comentário">
          <button type="button" title="Negrito" onclick="formatarTextoComentarioCrmAr('negrito')"><strong>B</strong></button>
          <button type="button" title="Itálico" onclick="formatarTextoComentarioCrmAr('italico')"><em>I</em></button>
          <button type="button" title="Sublinhado" onclick="formatarTextoComentarioCrmAr('sublinhado')"><u>U</u></button>
          <button type="button" title="Tachado" onclick="formatarTextoComentarioCrmAr('tachado')"><s>S</s></button>
          <button type="button" title="Citação" onclick="formatarTextoComentarioCrmAr('citacao')">❝</button>
          <button type="button" title="Lista" onclick="formatarTextoComentarioCrmAr('lista')">☷</button>
          <button type="button" class="ar-crm-format-color-yellow" title="Destacar em amarelo" onclick="formatarTextoComentarioCrmAr('cor-#fff3a3')">A</button>
          <button type="button" class="ar-crm-format-color-blue" title="Destacar em azul" onclick="formatarTextoComentarioCrmAr('cor-#cfe8ff')">A</button>
          <button type="button" class="ar-crm-format-color-red" title="Destacar em vermelho" onclick="formatarTextoComentarioCrmAr('cor-#ffd6d6')">A</button>
        </div>
        <div class="ar-crm-comment-editor-wrap"><div id="ar-crm-new-comment" class="ar-crm-comment-editor" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Adicionar comentário" oninput="aoDigitarComentarioCrmAr(this)" onkeydown="acionarAtalhoComentarioCrmAr(event)"></div><div class="ar-crm-mention-menu" data-for="ar-crm-new-comment" hidden></div><span class="ar-crm-comment-resize-handle" title="Redimensionar" onmousedown="iniciarRedimensionamentoComentarioCrmAr(event)"></span></div>
        <div class="ar-crm-comment-submit"><button class="save-btn" type="button" onclick="criarComentarioDetalheCrmAr()" ${atividade.saving ? 'disabled' : ''}>${atividade.saving ? atividade.savingAction : 'Adicionar comentário'}</button></div>
      </div>`}
      <div class="ar-crm-comments-list">
        ${comentarios.length ? comentarios.map((comentario) => renderComentarioCrmAr(comentario)).join('') : '<p class="ar-crm-detail-muted">Nenhum comentário encontrado.</p>'}
      </div>
    `}
  </aside>`;
}

function renderAnexosCrmAr() {
  const anexos = state.ar.crm.atividade.attachments || [];
  const taskId = state.ar.crm.detalhe?.dados?.clickup_task_id || '';
  return `<section class="ar-crm-attachments-fixed" aria-label="Anexos">
    <div><span>Anexos</span>${anexos.length ? `<div class="ar-crm-attachments-list">${anexos.map((anexo) => { const url = anexo.url || anexo.thumbnail || ''; const nome = anexo.title || anexo.filename || 'Anexo sem nome'; return url ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(nome)}</a>` : `<span class="ar-crm-attachment-unavailable">${escapeHtml(nome)} — link indisponível</span>`; }).join('')}</div>` : '<p>Nenhum anexo encontrado.</p>'}</div>
    ${taskId ? '<label class="secondary-btn ar-crm-attachment-upload">Adicionar anexo<input type="file" onchange="adicionarAnexoDetalheCrmAr(this)" hidden></label>' : '<span class="ar-crm-detail-muted">Disponível após a sincronização</span>'}
  </section>`;
}

function normalizarNomeCampoCrm(nome) {
  return String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function obterNomeCampoCrm(campo) {
  return campo?.name || campo?.field_name || 'Campo';
}

function selecionarCampoCrmAr(campos, termos) {
  const normalizados = termos.map(normalizarNomeCampoCrm);
  return campos.find((campo) => normalizados.includes(normalizarNomeCampoCrm(obterNomeCampoCrm(campo))))
    || campos.find((campo) => {
      const nome = normalizarNomeCampoCrm(obterNomeCampoCrm(campo));
      return normalizados.some((termo) => nome.includes(termo));
    });
}

function selecionarCamposCrmAr(campos, termos, usados) {
  const encontrados = campos.filter((campo) => {
    const nome = normalizarNomeCampoCrm(obterNomeCampoCrm(campo));
    const corresponde = termos.some((termo) => nome.includes(normalizarNomeCampoCrm(termo)));
    if (corresponde) usados.add(campo);
    return corresponde;
  });
  return encontrados;
}

function ordenarCamposCrmAr(campos, ordem) {
  const ordenados = [];
  ordem.forEach((termos) => {
    campos.forEach((campo) => {
      const nome = normalizarNomeCampoCrm(obterNomeCampoCrm(campo));
      if (!ordenados.includes(campo) && termos.some((termo) => nome.includes(normalizarNomeCampoCrm(termo)))) {
        ordenados.push(campo);
      }
    });
  });
  campos.forEach((campo) => {
    if (!ordenados.includes(campo)) ordenados.push(campo);
  });
  campos.splice(0, campos.length, ...ordenados);
}

function obterRotuloCampoCrmAr(nome) {
  const chave = normalizarNomeCampoCrm(nome);
  if (chave.includes('parceiro de indicacao')) return 'Nome';
  if (chave.includes('data de emissao') || chave.includes('emissao')) return 'Início de Validade';
  if (chave.includes('data de vencimento') || chave.includes('vencimento') || chave.includes('renovacao')) return 'Fim de Validade';
  return nome;
}

function obterStatusOptionsCrmAr(atual = '') {
  return Array.from(new Set([atual, ...CRM_STATUS_OPTIONS].map((status) => String(status || '').trim()).filter(Boolean)));
}

function obterClasseStatusCrmAr(valor = '') {
  const normalizado = normalizarNomeCampoCrm(valor).replace(/[_-]+/g, ' ');
  const equivalencias = {
    'em prospeccao': 'em-prospeccao',
    'prospeccao': 'em-prospeccao',
    'novo': 'em-andamento',
    'primeiro contato realizado': 'em-andamento',
    'qualificado': 'em-andamento',
    'em qualificacao': 'em-andamento',
    'em renovacao': 'em-andamento',
    'em validacao': 'em-andamento',
    'em negociacao': 'em-atencao',
    'aguardando pagamento': 'em-atencao',
    'cliente': 'cliente-ativo',
    'cliente ativo': 'cliente-ativo',
    'convertido': 'cliente-ativo',
    'pos venda': 'cliente-ativo',
    'finalizado': 'finalizado',
    'concluido': 'finalizado',
    'lead perdido': 'lead-perdido',
    'perdido': 'lead-perdido',
    'desqualificado': 'lead-perdido'
  };
  return equivalencias[normalizado]
    || 'neutro';
}

function renderEditorStatusCrmAr(atual = '') {
  const options = obterStatusOptionsCrmAr(atual).map((status) => ({
    value: status,
    label: obterRotuloStatusCrmAr(status)
  }));
  const combo = renderDropdownCrmAr('ar-crm-edit-status', atual, options, 'Status', 'status', 'status', true);
  return `<label class="ar-crm-header-status-item ar-crm-status-edit ar-crm-status-${escapeAttr(obterClasseStatusCrmAr(atual))}"><span class="ar-crm-header-status-label">Status</span><div class="ar-crm-status-edit-row">${combo}<button class="secondary-btn ar-crm-status-next" type="button" onclick="avancarStatusCrmAr()" aria-label="Avançar status" title="Avançar status" ${state.ar.crm.salvandoEdicao ? 'disabled' : ''}>▶</button></div></label>`;
}

function renderEditorSituacaoLeadCrmAr(campo) {
  const atual = obterValorCampoCrmAr(campo) === '—' ? '' : obterValorCampoCrmAr(campo);
  const options = Array.isArray(campo.type_config?.options)
    ? campo.type_config.options.map((option) => ({
      value: String(option.id ?? option.orderindex ?? option.value ?? ''),
      label: String(option.name || option.label || option.value || option.id || '')
    }))
    : obterStatusOptionsCrmAr(atual);
  const classeStatus = obterClasseStatusCrmAr(atual);
  const combo = renderDropdownCrmAr(campo.id || 'ar-crm-edit-situacao-lead', atual, options, 'Situação do Lead', 'custom', campo.type || 'dropdown', true);
  return `<label class="ar-crm-header-status-item ar-crm-status-edit ar-crm-lead-situacao-edit ar-crm-status-${escapeAttr(classeStatus)}"><span class="ar-crm-header-status-label">Situação do Lead</span>${combo}</label>`;
}

function renderDropdownCrmAr(id, valorAtual, options, rotulo, tipo = 'custom', campoTipo = tipo, statusVisual = false) {
  const valor = String(valorAtual || '');
  const menuId = `${id}-menu`;
  const maiorOpcao = options.reduce((maior, option) => Math.max(maior, String(typeof option === 'string' ? option : option.label || '').length), 0);
  const larguraDropdown = Math.min(220, Math.max(112, Math.round(maiorOpcao * 7.2 + 28)));
  const optionButtons = options.map((option) => {
    const label = typeof option === 'string' ? option : option.label;
    const value = typeof option === 'string' ? option : option.value;
    const selecionada = String(value) === String(valorAtual);
    return `<button class="ar-crm-dropdown-option hub-filter-dropdown-option ${selecionada ? 'is-selected' : ''}" type="button" role="option" aria-selected="${selecionada ? 'true' : 'false'}" data-value="${escapeAttr(value)}" data-label="${escapeAttr(label)}" onclick="selecionarDropdownCrmAr(this)">${escapeHtml(label)}</button>`;
  }).join('');
  return `<div class="ar-crm-combobox hub-filter-combobox" style="--crm-dropdown-width:${larguraDropdown}px" data-dropdown-type="${escapeAttr(tipo)}"><input id="${escapeAttr(id)}" class="config-input ar-crm-edit-input ${tipo === 'custom' ? 'ar-crm-edit-custom-field' : ''}" type="text" value="${escapeAttr(valor)}" data-field-id="${tipo === 'custom' ? escapeAttr(id) : ''}" data-field-type="${escapeAttr(campoTipo)}" data-selected-value="${escapeAttr(valor)}" data-status-presentation="${statusVisual ? 'true' : 'false'}" data-dropdown-menu-id="${escapeAttr(menuId)}" aria-label="${escapeAttr(rotulo)}" aria-expanded="false" autocomplete="off" required onfocus="abrirDropdownCrmAr(this, event)" oninput="filtrarDropdownCrmAr(this, event)" ${state.ar.crm.salvandoEdicao ? 'disabled' : ''}><div id="${escapeAttr(menuId)}" class="ar-crm-dropdown-menu hub-filter-dropdown-menu" data-dropdown-input-id="${escapeAttr(id)}" role="listbox" aria-label="${escapeAttr(rotulo)}" hidden>${optionButtons}</div></div>`;
}

function posicionarDropdownCrmAr(input, menu) {
  const rect = input.getBoundingClientRect();
  const margem = 8;
  const alturaMaxima = Math.min(280, window.innerHeight - (margem * 2));
  const larguraDisponivel = Math.max(1, window.innerWidth - (margem * 2));
  const largura = Math.min(rect.width, larguraDisponivel);
  const esquerda = Math.min(
    Math.max(margem, rect.left),
    Math.max(margem, window.innerWidth - largura - margem),
  );
  menu.hidden = false;
  menu.style.left = `${esquerda}px`;
  menu.style.width = `${largura}px`;
  menu.style.maxHeight = `${alturaMaxima}px`;
  const altura = Math.min(menu.scrollHeight, alturaMaxima);
  const abaixo = window.innerHeight - rect.bottom - margem;
  const top = abaixo >= Math.min(altura, 280) ? rect.bottom + 4 : Math.max(margem, rect.top - altura - 4);
  menu.style.top = `${top}px`;
}

function reposicionarDropdownsCrmAr() {
  document.querySelectorAll('.ar-crm-dropdown-menu:not([hidden])').forEach((menu) => {
    const input = document.getElementById(menu.dataset.dropdownInputId || '');
    if (input) posicionarDropdownCrmAr(input, menu);
  });
}

function atualizarClasseStatusCrmAr(valor, campo = document.querySelector('.ar-crm-status-edit')) {
  if (!campo) return;
  Array.from(campo.classList)
    .filter((classe) => classe.startsWith('ar-crm-status-') && classe !== 'ar-crm-status-edit')
    .forEach((classe) => campo.classList.remove(classe));
  const slug = obterClasseStatusCrmAr(valor);
  campo.classList.add(`ar-crm-status-${slug}`);
}

function abrirDropdownCrmAr(input, event) {
  event?.stopPropagation();
  document.querySelectorAll('.ar-crm-dropdown-menu:not([hidden])').forEach((menu) => {
    menu.hidden = true;
    document.getElementById(menu.dataset.dropdownInputId || '')?.setAttribute('aria-expanded', 'false');
  });
  const menu = document.getElementById(input?.dataset?.dropdownMenuId || '');
  if (!menu) return;
  if (menu.parentElement !== document.body) document.body.appendChild(menu);
  input.setAttribute('aria-expanded', 'true');
  posicionarDropdownCrmAr(input, menu);
}

function filtrarDropdownCrmAr(input, event) {
  event?.stopPropagation();
  input.dataset.selectedValue = '';
  const menu = document.getElementById(input?.dataset?.dropdownMenuId || '');
  if (!menu) return;
  const termo = normalizarNomeCampoCrm(input.value);
  menu.querySelectorAll('.ar-crm-dropdown-option').forEach((option) => {
    option.hidden = termo && !normalizarNomeCampoCrm(option.dataset.label).includes(termo);
  });
  posicionarDropdownCrmAr(input, menu);
  if (input.dataset.statusPresentation === 'true') atualizarClasseStatusCrmAr(input.value, input.closest('.ar-crm-status-edit'));
  marcarAlteracaoCamposCrmAr();
}

function selecionarDropdownCrmAr(option) {
  const menu = option?.closest('.ar-crm-dropdown-menu');
  const input = document.getElementById(menu?.dataset?.dropdownInputId || '');
  if (!input) return;
  input.value = option.dataset.label || '';
  input.dataset.selectedValue = option.dataset.value || '';
  menu.querySelectorAll('.ar-crm-dropdown-option').forEach((item) => {
    const selecionada = item === option;
    item.classList.toggle('is-selected', selecionada);
    item.setAttribute('aria-selected', selecionada ? 'true' : 'false');
  });
  if (menu) menu.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  if (input.dataset.statusPresentation === 'true') atualizarClasseStatusCrmAr(input.value, input.closest('.ar-crm-status-edit'));
  marcarAlteracaoCamposCrmAr();
}

function fecharDropdownCrmAr(event) {
  if (event?.target?.closest?.('.ar-crm-combobox')) return;
  document.querySelectorAll('.ar-crm-dropdown-menu').forEach((menu) => {
    menu.hidden = true;
    const input = document.getElementById(menu.dataset.dropdownInputId || '');
    input?.setAttribute('aria-expanded', 'false');
    const combo = input?.closest('.ar-crm-combobox');
    if (input && combo && menu.parentElement === document.body) combo.appendChild(menu);
  });
}

function renderGrupoCamposCrmAr(titulo, campos, classe = '', acao = '') {
  if (!campos.length && !acao) return '';
  return `
    <section class="ar-crm-detail-section ar-crm-field-group ${escapeAttr(classe)}">
      <div class="ar-crm-field-group-heading"><span>${escapeHtml(titulo)}</span>${acao}</div>
      <div class="ar-crm-field-group-grid">
        ${campos.map((campo) => {
          const nome = obterNomeCampoCrm(campo);
          const rotulo = obterRotuloCampoCrmAr(nome);
          return `<div class="ar-crm-field">${state.ar.crm.editando ? renderControleCampoCrmAr(campo, rotulo) : `<small>${escapeHtml(rotulo)}</small><strong>${escapeHtml(formatarCampoCrmAr(nome, obterValorCampoCrmAr(campo)))}</strong>`}</div>`;
        }).join('')}
      </div>
    </section>
  `;
}

function campoCrmArEditavel(campo) {
  return ['text', 'short_text', 'textarea', 'date', 'number', 'currency', 'dropdown', 'drop_down', 'url', 'email', 'phone'].includes(String(campo?.type || '').toLowerCase());
}

function valorCampoEdicaoCrmAr(campo) {
  const valor = campo?.value ?? '';
  if (String(campo?.type || '').toLowerCase() === 'date' && /^\d{10,13}$/.test(String(valor))) {
    const data = new Date(String(valor).length === 10 ? Number(valor) * 1000 : Number(valor));
    if (!Number.isNaN(data.getTime())) return data.toISOString().slice(0, 10);
  }
  return typeof valor === 'object' ? '' : String(valor);
}

function valorCampoEdicaoFormatadoCrmAr(campo) {
  const valor = valorCampoEdicaoCrmAr(campo);
  const mascara = obterMascaraCampoCrmAr(obterNomeCampoCrm(campo));
  return mascara ? formatarMascaraParceiro(valor, mascara) : valor;
}

function renderControleCampoCrmAr(campo, rotulo) {
  if (!campoCrmArEditavel(campo)) return `<div class="ar-crm-edit-field"><span>${escapeHtml(rotulo)}</span><strong>${escapeHtml(formatarCampoCrmAr(obterNomeCampoCrm(campo), obterValorCampoCrmAr(campo)))} <small>(somente leitura)</small></strong></div>`;
  const tipo = String(campo.type || '').toLowerCase();
  const id = escapeAttr(campo.id || '');
  const mascara = obterMascaraCampoCrmAr(rotulo || obterNomeCampoCrm(campo));
  const valor = escapeAttr(valorCampoEdicaoFormatadoCrmAr(campo));
  if ((tipo === 'dropdown' || tipo === 'drop_down') && Array.isArray(campo.type_config?.options)) {
    const options = campo.type_config.options.map((option) => ({
      value: String(option.id ?? option.orderindex ?? option.value ?? ''),
      label: String(option.name || option.label || option.value || option.id || '')
    }));
    const input = renderDropdownCrmAr(campo.id || '', obterValorCampoCrmAr(campo) === '—' ? '' : obterValorCampoCrmAr(campo), options, rotulo, 'custom', tipo);
    return `<label class="ar-crm-edit-field"><span>${escapeHtml(rotulo)}</span>${input}</label>`;
  }
  const inputType = tipo === 'date' ? 'date' : tipo === 'number' || tipo === 'currency' ? 'number' : 'text';
  const maskAttribute = mascara ? ` data-crm-mask="${escapeAttr(mascara)}" oninput="aplicarMascaraCrmAr(this); marcarAlteracaoCamposCrmAr()"` : ' oninput="marcarAlteracaoCamposCrmAr()"';
  return `<label class="ar-crm-edit-field"><span>${escapeHtml(rotulo)}</span><input class="config-input ar-crm-edit-input ar-crm-edit-custom-field" data-field-id="${id}" data-field-type="${escapeAttr(tipo)}" type="${inputType}" value="${valor}" aria-label="${escapeAttr(rotulo)}"${maskAttribute} ${state.ar.crm.salvandoEdicao ? 'disabled' : ''}></label>`;
}

function editarCamposCrmAr() {
  const item = state.ar.crm.detalhe;
  const taskId = item?.dados?.clickup_task_id;
  if (!item || !taskId) return;
  if (!pode('painel_ar.crm', 'execute')) {
    state.ar.crm.atividade.message = 'Seu usuário não possui permissão para editar o CRM AR.';
    renderPainelAr();
    return;
  }
  state.ar.crm.editando = true;
  state.ar.crm.edicaoAlterada = false;
  renderPainelAr();
}

function marcarAlteracaoCamposCrmAr() {
  const item = state.ar.crm.detalhe;
  if (!item) return;
  const nome = document.getElementById('ar-crm-edit-name')?.value?.trim() || '';
  const descricao = document.getElementById('ar-crm-edit-description')?.value ?? '';
  const status = document.getElementById('ar-crm-edit-status')?.value?.trim() || '';
  const camposAlterados = Array.from(document.querySelectorAll('.ar-crm-edit-custom-field')).some((input) => {
    const original = (item.dados?.campos_personalizados || []).find((campo) => String(campo.id) === String(input.dataset.fieldId));
    if (!original) return false;
    const tipo = String(original.type || '').toLowerCase();
    const originalValue = ['dropdown', 'drop_down'].includes(tipo) ? obterValorCampoCrmAr(original) : valorCampoEdicaoFormatadoCrmAr(original);
    return String(input.value) !== String(originalValue ?? '');
  });
  state.ar.crm.edicaoAlterada = nome !== String(item.nome || '').trim()
    || descricao !== String(item.dados?.descricao || '')
    || status !== String(item.status || '').trim()
    || camposAlterados;
  const botaoSalvar = document.getElementById('ar-crm-save-fields');
  if (botaoSalvar) botaoSalvar.disabled = !state.ar.crm.edicaoAlterada || state.ar.crm.salvandoEdicao;
}

function avancarStatusCrmAr() {
  const input = document.getElementById('ar-crm-edit-status');
  if (!input || state.ar.crm.salvandoEdicao) return;
  const options = obterStatusOptionsCrmAr(input.value);
  const atual = options.findIndex((status) => normalizarNomeCampoCrm(status) === normalizarNomeCampoCrm(input.value));
  input.value = options[(atual + 1) % options.length] || options[0] || '';
  atualizarClasseStatusCrmAr(input.value);
  marcarAlteracaoCamposCrmAr();
}

function cancelarEdicaoCamposCrmAr() {
  state.ar.crm.editando = false;
  state.ar.crm.edicaoAlterada = false;
  renderPainelAr();
}

async function salvarCamposCrmAr() {
  const item = state.ar.crm.detalhe;
  const taskId = item?.dados?.clickup_task_id;
  const nome = document.getElementById('ar-crm-edit-name')?.value?.trim();
  const descricao = document.getElementById('ar-crm-edit-description')?.value ?? '';
  if (!item || !taskId || !nome || state.ar.crm.salvandoEdicao) return;
  if (!pode('painel_ar.crm', 'execute')) {
    state.ar.crm.atividade.message = 'Seu usuário não possui permissão para editar o CRM AR.';
    renderPainelAr();
    return;
  }
  const changes = {};
  if (nome !== String(item.nome || '').trim()) changes.name = nome;
  if (descricao !== String(item.dados?.descricao || '')) changes.description = descricao;
  const status = document.getElementById('ar-crm-edit-status')?.value?.trim() || '';
  if (status !== String(item.status || '').trim()) changes.status = status;
  const customFields = Array.from(document.querySelectorAll('.ar-crm-edit-custom-field'))
    .map((input) => {
      const original = (item.dados?.campos_personalizados || []).find((campo) => String(campo.id) === String(input.dataset.fieldId));
      let value = input.value;
      if (['dropdown', 'drop_down'].includes(String(input.dataset.fieldType || '').toLowerCase())) {
        const options = Array.isArray(original?.type_config?.options) ? original.type_config.options : [];
        const option = options.find((candidate) => normalizarNomeCampoCrm(candidate.name || candidate.label || candidate.value) === normalizarNomeCampoCrm(input.value));
        value = option ? (option.id ?? option.orderindex ?? option.value) : (input.value ? input.value : null);
      }
      return { id: input.dataset.fieldId, value };
    })
    .filter((field) => {
      const original = (item.dados?.campos_personalizados || []).find((campo) => String(campo.id) === String(field.id));
      if (!field.id || !original) return false;
      const tipo = String(original.type || '').toLowerCase();
      const originalValue = ['dropdown', 'drop_down'].includes(tipo)
        ? obterValorCampoCrmAr(original)
        : valorCampoEdicaoFormatadoCrmAr(original);
      return String(field.value ?? '') !== String(originalValue ?? '');
    });
  if (customFields.length) changes.custom_fields = customFields;
  if (!Object.keys(changes).length) {
    state.ar.crm.editando = false;
    state.ar.crm.edicaoAlterada = false;
    renderPainelAr();
    return;
  }

  try {
    state.ar.crm.salvandoEdicao = true;
    renderPainelAr();
    const response = await chamarApi('updateArCrmTask', { taskId, itemId: item.id, changes });
    if (!response.ok) throw new Error(obterMensagemApi(response, 'Não foi possível salvar os campos.'));
    if (Object.prototype.hasOwnProperty.call(changes, 'name')) item.nome = nome;
    if (Object.prototype.hasOwnProperty.call(changes, 'status')) item.status = status;
    item.dados = { ...(item.dados || {}), descricao };
    customFields.forEach((field) => {
      const atual = (item.dados.campos_personalizados || []).find((campo) => String(campo.id) === String(field.id));
      if (atual) {
        atual.value = field.value;
        atual.valor_original = field.value;
        const options = Array.isArray(atual.type_config?.options) ? atual.type_config.options : [];
        const option = options.find((item) => [item.id, item.orderindex, item.value].some((value) => String(value ?? '') === String(field.value ?? '')));
        atual.display_value = option?.name || option?.label || option?.value || field.value || '—';
      }
    });
    state.ar.crm.editando = false;
    state.ar.crm.edicaoAlterada = false;
    state.ar.crm.salvandoEdicao = false;
    item.sync_status = 'pending';
    renderPainelAr();
  } catch (erro) {
    state.ar.crm.salvandoEdicao = false;
    state.ar.crm.atividade.message = erro.message || 'Não foi possível salvar os campos.';
    renderPainelAr();
  }
}

function obterCampoRelacionadoCrmAr(campos, termos, fallback = '—') {
  const campo = selecionarCampoCrmAr(campos, termos);
  return campo ? formatarCampoCrmAr(obterNomeCampoCrm(campo), obterValorCampoCrmAr(campo)) : fallback;
}

function renderPedidosRelacionadosCrmAr() {
  const modal = state.ar.crm.pedidosRelacionados;
  if (!modal.aberto) return '';
  return `
    <div class="modal-backdrop ar-crm-related-modal-backdrop" role="dialog" aria-modal="true" aria-label="Pedidos relacionados ao CPF" onclick="if(event.target === this) fecharPedidosRelacionadosCrmAr()">
      <section class="ar-crm-related-modal">
        <header class="ar-crm-related-modal-header">
          <div><span class="ar-crm-phase1-kicker">PEDIDOS RELACIONADOS</span><h3>Pedidos do CPF ${escapeHtml(formatarCampoCrmAr('cpf', modal.cpf))}</h3></div>
          <button class="secondary-btn" type="button" onclick="fecharPedidosRelacionadosCrmAr()">Fechar</button>
        </header>
        ${modal.loading ? renderHubLoading('Carregando pedidos...') : modal.message ? `<p class="admin-message">${escapeHtml(modal.message)}</p>` : modal.items.length ? `
          <div class="ar-crm-related-list">
            ${modal.items.map((registro) => {
              const campos = Array.isArray(registro.campos_personalizados) ? registro.campos_personalizados : [];
              const atual = state.ar.crm.detalhe?.id === registro.id;
              return `<article class="ar-crm-related-card ${atual ? 'is-current' : ''}">
                ${atual ? '<span class="ar-crm-current-pill">Cadastro atual</span>' : ''}
                <div class="ar-crm-related-grid">
                  <div><small>Pedido</small><strong>${escapeHtml(obterCampoRelacionadoCrmAr(campos, ['pedido atual'], registro.nome || '—'))}</strong></div>
                  <div><small>CNPJ</small><strong>${escapeHtml(obterCampoRelacionadoCrmAr(campos, ['cnpj']))}</strong></div>
                  <div><small>Produto</small><strong>${escapeHtml(obterCampoRelacionadoCrmAr(campos, ['produto']))}</strong></div>
                  <div><small>Razão Social</small><strong>${escapeHtml(obterCampoRelacionadoCrmAr(campos, ['razão social', 'razao social']))}</strong></div>
                  <div class="ar-crm-related-validity"><small>Início de Validade</small><strong>${escapeHtml(obterCampoRelacionadoCrmAr(campos, ['data de emissão', 'data emissao', 'emissao']))}</strong></div>
                  <div class="ar-crm-related-validity"><small>Fim de Validade</small><strong>${escapeHtml(obterCampoRelacionadoCrmAr(campos, ['data de vencimento', 'vencimento', 'renovação', 'renovacao']))}</strong></div>
                </div>
              </article>`;
            }).join('')}
          </div>
        ` : '<p class="quick-link-empty">Nenhum outro pedido encontrado para este CPF.</p>'}
      </section>
    </div>
  `;
}

function formatarCampoCrmAr(nome, valor) {
  const chave = String(nome || '').toLowerCase();
  const texto = String(valor ?? '').trim();
  const digitos = texto.replace(/\D/g, '');

  if (chave.includes('data') || chave.includes('vencimento') || chave.includes('venc.') || chave.includes('renova') || chave.includes('prazo')) {
    const timestamp = Number(texto);
    const data = /^\d{10,13}$/.test(texto)
      ? new Date(texto.length === 10 ? timestamp * 1000 : timestamp)
      : new Date(texto);

    if (!Number.isNaN(data.getTime())) {
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(data);
    }
  }

  if ((chave.includes('cpf') && digitos.length <= 11) || chave === 'cpf') {
    return digitos.slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  if (chave.includes('cnpj')) {
    return digitos.slice(0, 14).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
  if (chave.includes('telefone') || chave.includes('celular') || chave.includes('whatsapp')) {
    const numero = digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos;
    return numero.length > 10
      ? numero.slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
      : numero.slice(0, 10).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  if (chave.includes('valor') || chave.includes('preço') || chave.includes('preco')) {
    const numero = Number(texto.replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (Number.isFinite(numero)) return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return texto;
}

function obterValorCampoCrmAr(campo) {
  if (campo?.display_value) return campo.display_value;

  const config = campo?.type_config || {};
  const options = Array.isArray(config.options) ? config.options : [];
  const rawValue = campo?.value;
  const rawId = rawValue && typeof rawValue === 'object'
    ? (rawValue.id ?? rawValue.orderindex)
    : rawValue;
  const option = options.find((item) => [item.id, item.orderindex, item.value].some((value) => String(value ?? '') === String(rawId ?? '')));

  return option?.name || option?.label || rawValue || '—';
}

function selecionarPaginaCrmAr(pagina) {
  const totalPaginas = Math.max(1, Math.ceil(state.ar.crm.totalItens / state.ar.crm.itensPorPagina));
  const proximaPagina = Math.max(1, Math.min(Number(pagina) || 1, totalPaginas));
  state.ar.crm.pagina = proximaPagina;
  carregarCrmAr(proximaPagina);
}

function renderInicioPainelAr() {
  return `
    <section class="ar-home-shell">
      <div class="ar-dashboard-placeholder"></div>
    </section>
  `;
}

function renderArHomeCard(aba, titulo, descricao, meta) {
  return `
    <article class="ar-home-card" role="button" tabindex="0" onclick="selecionarAbaAr('${escapeAttr(aba)}')" onkeydown="acionarCardAr(event, '${escapeAttr(aba)}')">
      <div>
        <span>${escapeHtml(meta)}</span>
        <h3>${escapeHtml(titulo)}</h3>
        <p>${escapeHtml(descricao)}</p>
      </div>
      <strong aria-hidden="true">›</strong>
    </article>
  `;
}

function acionarCardAr(event, aba) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    selecionarAbaAr(aba);
  }
}

function renderValidacoesAr() {
  const validacoes = state.ar.validacoes;
  const podeEmitir = pode('painel_ar.validacoes', 'emitir_recibo');
  const podeImportar = pode('painel_ar.validacoes', 'importar');

  if (validacoes.aba === 'emitir' && !podeEmitir) {
    validacoes.aba = 'consultar';
  }

  if (validacoes.aba === 'importacao' && !podeImportar) {
    validacoes.aba = 'consultar';
  }

  return `
    <section class="ar-validacoes">
      ${validacoes.message ? `<p class="admin-message">${escapeHtml(validacoes.message)}</p>` : ''}
      ${renderConteudoValidacoesAr()}
    </section>
  `;
}

function renderSubnavValidacoesAr() {
  const validacoes = state.ar.validacoes;
  const podeEmitir = pode('painel_ar.validacoes', 'emitir_recibo');
  const podeImportar = pode('painel_ar.validacoes', 'importar');
  const itens = [
    ['emitir', 'Emitir recibo', podeEmitir],
    ['consultar', 'Consultar recibos', true],
    ['importacao', 'Importar recibos', podeImportar]
  ].filter(([, , permitido]) => permitido);
  const faixa = obterFaixaMenuAr();
  const limite = faixa === 'compact' ? 2 : faixa === 'mobile' ? 3 : faixa === 'tablet' ? 4 : itens.length;
  const principais = itens.slice(0, limite);
  const secundarias = itens.slice(limite);
  const renderItem = ([id, nome]) => `<button class="hub-subnav-item ${validacoes.aba === id ? 'active is-active' : ''}" role="tab" aria-selected="${validacoes.aba === id}" type="button" onclick="selecionarSubabaValidacoesAr('${id}')">${nome}</button>`;

  return `
    <div class="hub-subnav hub-responsive-subnav" role="tablist" aria-label="Paginas internas de Validacoes">
      ${principais.map(renderItem).join('')}
      ${secundarias.length ? `<div class="hub-responsive-more"><button class="hub-responsive-more-trigger ${secundarias.some(([id]) => id === validacoes.aba) ? 'is-active' : ''}" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="ar-validacoes-more-menu" data-ar-more-trigger><span>Mais</span><span aria-hidden="true">⌄</span></button><div id="ar-validacoes-more-menu" class="hub-responsive-more-menu" role="menu" aria-label="Mais opções" hidden>${secundarias.map(([id, nome]) => renderItem([id, nome]).replace('role="tab"', 'role="menuitem"')).join('')}</div></div>` : ''}
    </div>
  `;
}

function renderConteudoValidacoesAr() {
  const aba = state.ar.validacoes.aba;

  if (aba === 'consultar') {
    return renderConsultarRecibosAr();
  }

  if (aba === 'importacao') {
    return renderImportacaoValidacoesAr();
  }

  return renderEmitirReciboAr();
}

function renderEmitirReciboAr() {
  const validacoes = state.ar.validacoes;
  const podeEmitir = pode('painel_ar.validacoes', 'emitir_recibo');
  const filtros = validacoes.filtros;
  const totalPendente = validacoes.pendentes
    .reduce((total, item) => total + (Number(item.valor_tot_comiss) || 0), 0);
  const totalSelecionado = validacoes.pendentes
    .filter(item => validacoes.selecionados.includes(item.id))
    .reduce((total, item) => total + (Number(item.valor_tot_comiss) || 0), 0);

  return `
    <div class="ar-validacoes-panel">
      <div class="ar-validacoes-header">
        <div class="ar-validacoes-title">
          <span class="ar-eyebrow">Validações</span>
          ${renderSubnavValidacoesAr()}
          <h3>Emitir recibo</h3>
          <p>Consulte lançamentos pendentes, selecione itens por parceiro e emita recibos atômicos via Supabase RPC.</p>
        </div>
        <button class="secondary-btn" type="button" onclick="carregarValidacoesAr()">Atualizar</button>
      </div>

      <div class="ar-validacoes-filters">
        <input class="config-input" value="${escapeAttr(filtros.parceiro)}" placeholder="Parceiro" oninput="alterarFiltroValidacoesAr('parceiro', this.value)">
        <input class="config-input" value="${escapeAttr(filtros.codigoEntidade)}" placeholder="Código da entidade" oninput="alterarFiltroValidacoesAr('codigoEntidade', this.value)">
        <input class="config-input" type="date" value="${escapeAttr(filtros.dataInicio)}" onchange="alterarFiltroValidacoesAr('dataInicio', this.value)">
        <input class="config-input" type="date" value="${escapeAttr(filtros.dataFim)}" onchange="alterarFiltroValidacoesAr('dataFim', this.value)">
        <input class="config-input" value="${escapeAttr(filtros.produto)}" placeholder="Produto" oninput="alterarFiltroValidacoesAr('produto', this.value)">
        <input class="config-input" value="${escapeAttr(filtros.pedido)}" placeholder="Pedido" oninput="alterarFiltroValidacoesAr('pedido', this.value)">
        <input class="config-input" value="${escapeAttr(filtros.cliente)}" placeholder="Nome do cliente" oninput="alterarFiltroValidacoesAr('cliente', this.value)">
        <button class="save-btn" type="button" onclick="carregarValidacoesAr()" ${validacoes.loading ? 'disabled' : ''}>Aplicar filtros</button>
      </div>

      <div class="ar-validacoes-summary">
        <div>
          <span>Pendentes</span>
          <strong>${validacoes.pendentes.length}</strong>
        </div>
        <div>
          <span>Total pendente</span>
          <strong>${formatarMoedaNumeroAr(totalPendente)}</strong>
        </div>
        <div>
          <span>Selecionados</span>
          <strong>${validacoes.selecionados.length}</strong>
        </div>
        <div>
          <span>Total selecionado</span>
          <strong>${formatarMoedaNumeroAr(totalSelecionado)}</strong>
        </div>
      </div>

      <div class="ar-validacoes-actions">
        <button class="secondary-btn" type="button" onclick="limparSelecaoValidacoesAr()" ${validacoes.selecionados.length ? '' : 'disabled'}>Limpar seleção</button>
        <button class="save-btn" type="button" onclick="emitirReciboValidacoesAr()" ${validacoes.selecionados.length && podeEmitir ? '' : 'disabled'}>Emitir recibo</button>
      </div>

      ${renderBarraSelecaoValidacoesAr(totalSelecionado)}
      ${renderTabelaValidacoesPendentesAr()}
      ${renderLancamentoManualValidacoesAr()}
    </div>
  `;
}

function renderBarraSelecaoValidacoesAr(totalSelecionado) {
  const { pendentes, selecionados } = state.ar.validacoes;
  const podeEmitir = pode('painel_ar.validacoes', 'emitir_recibo');

  if (!selecionados.length) return '';

  const primeiro = pendentes.find(item => selecionados.includes(item.id));
  const parceiro = primeiro?.parceiro_nome || primeiro?.codigo_entidade || 'Parceiro selecionado';

  return `
    <div class="ar-validacoes-selection-bar">
      <div>
        <strong>${selecionados.length} lançamento(s) selecionado(s)</strong>
        <span>${escapeHtml(parceiro)} · ${escapeHtml(formatarMoedaNumeroAr(totalSelecionado))}</span>
      </div>
      <button class="secondary-btn" type="button" onclick="limparSelecaoValidacoesAr()">Limpar</button>
      <button class="save-btn" type="button" onclick="emitirReciboValidacoesAr()" ${podeEmitir ? '' : 'disabled'}>Emitir recibo</button>
    </div>
  `;
}

function renderTabelaValidacoesPendentesAr() {
  const { pendentes, selecionados, loading } = state.ar.validacoes;
  const todosSelecionados = pendentes.length > 0 && pendentes.every(item => selecionados.includes(item.id));

  if (loading) {
    return renderHubLoading('Carregando lançamentos pendentes...');
  }

  if (!pendentes.length) {
    return '<p class="quick-link-empty">Nenhum lançamento pendente encontrado.</p>';
  }

  return `
    <div class="ar-validacoes-table">
      <div class="ar-validacoes-row head">
        <span><input type="checkbox" ${todosSelecionados ? 'checked' : ''} onchange="alternarTodasValidacoesVisiveisAr(this.checked)" aria-label="Selecionar todos os lançamentos visíveis"></span>
        <span>Parceiro</span>
        <span>Data</span>
        <span>Produto</span>
        <span>Pedido</span>
        <span>Cliente</span>
        <span>Comissão</span>
      </div>
      ${pendentes.map(item => `
        <article class="ar-validacoes-row ${selecionados.includes(item.id) ? 'selected' : ''}">
          <span><input type="checkbox" ${selecionados.includes(item.id) ? 'checked' : ''} onchange="alternarValidacaoSelecionadaAr('${escapeAttr(item.id)}')"></span>
          <span><strong>${escapeHtml(item.parceiro_nome || '-')}</strong>${item.codigo_entidade ? `<small>${escapeHtml(item.codigo_entidade)}</small>` : ''}</span>
          <span>${escapeHtml(formatarDataCurtaAr(item.data_validacao))}</span>
          <span>${escapeHtml(item.produto || '-')}</span>
          <span>${escapeHtml(item.pedido || '-')}</span>
          <span>${escapeHtml(item.nome_cliente || '-')}</span>
          <span>${escapeHtml(formatarMoedaNumeroAr(Number(item.valor_tot_comiss) || 0))}</span>
        </article>
      `).join('')}
    </div>
  `;
}

function renderLancamentoManualValidacoesAr() {
  if (!pode('painel_ar.validacoes', 'importar')) {
    return '';
  }

  return `
    <details class="ar-validacoes-manual">
      <summary>Lançamento manual</summary>
      <div class="ar-validacoes-manual-grid">
        <input id="ar_manual_parceiro" class="config-input" placeholder="Parceiro">
        <input id="ar_manual_codigo" class="config-input" placeholder="Código da entidade">
        <input id="ar_manual_data" class="config-input" type="date">
        <input id="ar_manual_produto" class="config-input" placeholder="Produto">
        <input id="ar_manual_pedido" class="config-input" placeholder="Pedido">
        <input id="ar_manual_cliente" class="config-input" placeholder="Nome do cliente">
        <input id="ar_manual_valor" class="config-input" type="number" step="0.01" min="0" placeholder="Valor comissão">
        <button class="save-btn" type="button" onclick="criarLancamentoManualValidacoesAr()">Salvar lançamento</button>
      </div>
    </details>
  `;
}

function renderConsultarRecibosAr() {
  const { recibos, loading } = state.ar.validacoes;
  const totalEmitido = recibos
    .filter(recibo => recibo.status !== 'cancelado')
    .reduce((total, recibo) => total + (Number(recibo.valor_total) || 0), 0);
  const cancelados = recibos.filter(recibo => recibo.status === 'cancelado').length;

  return `
    <div class="ar-validacoes-panel">
      <div class="ar-validacoes-header">
        <div class="ar-validacoes-title">
          <span class="ar-eyebrow">Validações</span>
          ${renderSubnavValidacoesAr()}
          <h3>Consultar recibos</h3>
          <p>Últimos recibos emitidos, com opção de visualização, impressão e cancelamento.</p>
        </div>
        <button class="secondary-btn" type="button" onclick="carregarValidacoesAr()">Atualizar</button>
      </div>

      <div class="ar-validacoes-summary">
        <div>
          <span>Recibos</span>
          <strong>${recibos.length}</strong>
        </div>
        <div>
          <span>Emitidos</span>
          <strong>${recibos.length - cancelados}</strong>
        </div>
        <div>
          <span>Cancelados</span>
          <strong>${cancelados}</strong>
        </div>
        <div>
          <span>Total emitido</span>
          <strong>${formatarMoedaNumeroAr(totalEmitido)}</strong>
        </div>
      </div>

      ${loading ? renderHubLoading('Carregando recibos...') : renderTabelaRecibosAr(recibos)}
    </div>
  `;
}

function renderTabelaRecibosAr(recibos) {
  const podeCancelar = pode('painel_ar.validacoes', 'cancelar_recibo');

  if (!recibos.length) {
    return '<p class="quick-link-empty">Nenhum recibo emitido até agora.</p>';
  }

  return `
    <div class="ar-recibos-table">
      <div class="ar-recibos-row head">
        <span>Número</span>
        <span>Parceiro</span>
        <span>Data</span>
        <span>Valor</span>
        <span>Status</span>
        <span>Ações</span>
      </div>
      ${recibos.map(recibo => `
        <article class="ar-recibos-row">
          <span>${escapeHtml(recibo.numero || '-')}</span>
          <span>${escapeHtml(recibo.parceiro_nome || '-')}</span>
          <span>${escapeHtml(formatarDataCurtaAr(recibo.data_emissao))}</span>
          <span>${escapeHtml(formatarMoedaNumeroAr(Number(recibo.valor_total) || 0))}</span>
          <span><mark class="ar-status-chip ${recibo.status === 'cancelado' ? 'cancelled' : ''}">${escapeHtml(obterRotuloStatusHub(recibo.status, '—'))}</mark></span>
          <span class="ar-recibos-actions">
            <button class="secondary-btn" type="button" onclick="visualizarReciboValidacoesAr('${escapeAttr(recibo.id)}')">Visualizar</button>
            <button class="secondary-btn" type="button" onclick="cancelarReciboValidacoesAr('${escapeAttr(recibo.id)}')" ${recibo.status === 'cancelado' || !podeCancelar ? 'disabled' : ''}>Cancelar</button>
          </span>
        </article>
      `).join('')}
    </div>
    ${renderModalReciboValidacoesAr()}
  `;
}

function renderModalReciboValidacoesAr() {
  const recibo = state.ar.validacoes.reciboAtivo;

  if (!recibo) return '';

  const itens = recibo.ar_recibo_itens || [];

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Recibo">
      <section class="small-modal ar-recibo-modal">
        <div class="small-modal-header no-print">
          <h3>${escapeHtml(recibo.numero || 'Recibo')}</h3>
          <button class="icon-btn" type="button" onclick="fecharReciboValidacoesAr()" aria-label="Fechar">×</button>
        </div>

        <div class="ar-recibo-print">
          <header>
            <div>
              <h2>Recibo de pagamento</h2>
              <p>${escapeHtml(recibo.parceiro_nome || '-')}</p>
            </div>
            <strong>${escapeHtml(recibo.numero || '-')}</strong>
          </header>

          <dl>
            <div><dt>Emissão</dt><dd>${escapeHtml(formatarDataCurtaAr(recibo.data_emissao))}</dd></div>
            <div><dt>Status</dt><dd>${escapeHtml(obterRotuloStatusHub(recibo.status, '—'))}</dd></div>
            <div><dt>Total</dt><dd>${escapeHtml(formatarMoedaNumeroAr(Number(recibo.valor_total) || 0))}</dd></div>
            <div><dt>Código</dt><dd>${escapeHtml(recibo.codigo_entidade || '-')}</dd></div>
          </dl>

          <table>
            <thead><tr><th>Descrição</th><th>Valor</th></tr></thead>
            <tbody>
              ${itens.length
                ? itens.map(item => `<tr><td>${escapeHtml(item.descricao || '-')}</td><td>${escapeHtml(formatarMoedaNumeroAr(Number(item.valor_tot_comiss) || 0))}</td></tr>`).join('')
                : '<tr><td colspan="2">Nenhum item vinculado.</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="small-modal-actions no-print">
          <button class="secondary-btn" type="button" onclick="fecharReciboValidacoesAr()">Fechar</button>
          <button class="save-btn" type="button" onclick="window.print()">Imprimir / salvar PDF</button>
        </div>
      </section>
    </div>
  `;
}

function renderImportacaoValidacoesAr() {
  const itens = [
    ['Validações', 'Preparado para importação de validações em fase futura.'],
    ['Renovações', 'Preparado para importação de renovações em fase futura.'],
    ['Emissões', 'Preparado para importação de emissões em fase futura.']
  ];
  const repasse = state.ar.validacoes.importacaoRepasse;
  const podeImportarPermissao = pode('painel_ar.validacoes', 'importar');
  const podeExcluirImportacao = pode('painel_ar.validacoes', 'excluir_importacao');
  const podeSelecionarArquivo = podeImportarPermissao && Boolean(repasse.mesBase) && !repasse.loteExistente && !repasse.loading;
  const podeImportar = podeImportarPermissao && Boolean(repasse.mesBase) && repasse.linhas.length > 0 && !repasse.erros.length && !repasse.loteExistente && !repasse.loading;

  return `
    <div class="ar-validacoes-panel">
      <div class="ar-validacoes-header">
        <div class="ar-validacoes-title">
          <span class="ar-eyebrow">Validações</span>
          ${renderSubnavValidacoesAr()}
          <h3>Importar recibos</h3>
          <p>Importe o repasse por mês-base para gerar lançamentos pendentes de recibo.</p>
        </div>
      </div>

      <section class="ar-import-repasse">
        <div class="ar-import-repasse-header">
          <div>
            <strong>Repasse</strong>
            <span>Informe o mês-base antes de anexar a planilha.</span>
          </div>
          <button class="secondary-btn" type="button" onclick="limparImportacaoRepasseAr()">Limpar</button>
        </div>

        <div class="ar-import-controls">
          <label>
            <span>Mês-base</span>
            <input class="config-input" type="month" value="${escapeAttr(repasse.mesBase)}" onchange="alterarMesBaseRepasseAr(this.value)">
          </label>
          <label>
            <span>Planilha de repasse</span>
            <input class="config-input" type="file" accept=".xlsx,.xls" onchange="processarArquivoRepasseAr(event)" ${podeSelecionarArquivo ? '' : 'disabled'}>
          </label>
          <button class="save-btn" type="button" onclick="importarRepasseValidacoesAr()" ${podeImportar ? '' : 'disabled'}>
            ${repasse.loading ? 'Importando...' : 'Importar repasse'}
          </button>
        </div>

        ${repasse.message ? `<p class="admin-message">${escapeHtml(repasse.message)}</p>` : ''}
        ${repasse.loteExistente ? `
          <div class="ar-import-existing">
            <p>Já existe importação de repasse para ${escapeHtml(formatarMesBaseRepasseAr(repasse.mesBase))}. Para importar novamente, exclua este mês-base primeiro.</p>
            <button class="secondary-btn danger" type="button" onclick="excluirMesBaseRepasseAr()" ${repasse.loading || !podeExcluirImportacao ? 'disabled' : ''}>Excluir mês-base</button>
          </div>
        ` : ''}
        ${repasse.resumo ? renderResumoImportacaoRepasseAr(repasse) : ''}
        ${repasse.erros.length ? renderErrosImportacaoRepasseAr(repasse.erros) : ''}
        ${repasse.linhas.length ? renderPreviewImportacaoRepasseAr(repasse.linhas) : ''}
      </section>

      <div class="ar-validacoes-import-grid">
        ${itens.map(([titulo, texto]) => `
          <article>
            <strong>${escapeHtml(titulo)}</strong>
            <p>${escapeHtml(texto)}</p>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

function renderResumoImportacaoRepasseAr(repasse) {
  return `
    <div class="ar-import-summary">
      <div><span>Mês-base</span><strong>${escapeHtml(formatarMesBaseRepasseAr(repasse.mesBase))}</strong></div>
      <div><span>Arquivo</span><strong>${escapeHtml(repasse.arquivoNome || '-')}</strong></div>
      <div><span>Linhas válidas</span><strong>${repasse.linhas.length}</strong></div>
      <div><span>Alertas</span><strong>${repasse.erros.length}</strong></div>
    </div>
  `;
}

function renderErrosImportacaoRepasseAr(erros) {
  return `
    <div class="ar-import-errors">
      <strong>Corrija antes de importar</strong>
      ${erros.slice(0, 8).map(erro => `<span>${escapeHtml(erro)}</span>`).join('')}
      ${erros.length > 8 ? `<small>+ ${erros.length - 8} alerta(s)</small>` : ''}
    </div>
  `;
}

function renderPreviewImportacaoRepasseAr(linhas) {
  const total = linhas.reduce((soma, linha) => soma + (Number(linha.valor_tot_comiss) || 0), 0);

  return `
    <div class="ar-import-preview">
      <div class="ar-import-preview-head">
        <strong>Prévia do repasse</strong>
        <span>${linhas.length} linha(s) · ${escapeHtml(formatarMoedaNumeroAr(total))}</span>
      </div>
      <div class="ar-import-preview-table">
        <div class="ar-import-preview-row head">
          <span>Parceiro</span>
          <span>Pedido</span>
          <span>Produto</span>
          <span>Cliente</span>
          <span>Validação</span>
          <span>Comissão</span>
        </div>
        ${linhas.slice(0, 10).map(linha => `
          <div class="ar-import-preview-row">
            <span>${escapeHtml(linha.nome_vendedor || linha.codigo_entidade || '-')}</span>
            <span>${escapeHtml(linha.pedido || '-')}</span>
            <span>${escapeHtml(linha.produto || '-')}</span>
            <span>${escapeHtml(linha.nome_cliente || '-')}</span>
            <span>${escapeHtml(formatarDataCurtaAr(linha.data_validacao))}</span>
            <span>${escapeHtml(formatarMoedaNumeroAr(Number(linha.valor_tot_comiss) || 0))}</span>
          </div>
        `).join('')}
      </div>
      ${linhas.length > 10 ? `<small>Mostrando 10 de ${linhas.length} linha(s).</small>` : ''}
    </div>
  `;
}

function renderGeradorLinksAr() {
  return `
    <section class="ar-mvp-shell">
      <div class="ar-flow ar-flow-grid">
  <section class="ar-flow-card ar-flow-product">
    <div class="ar-flow-card-header">
      <span class="ar-step-number">1</span>
      <div>
        <h3>Produto</h3>
        <p>Selecione o certificado digital desejado.</p>
      </div>
    </div>

    <div class="ar-flow-card-body">
      ${renderPainelProdutoMvpAr()}
    </div>
  </section>

  <section class="ar-flow-card ar-flow-partner">
    <div class="ar-flow-card-header">
      <span class="ar-step-number">2</span>
      <div>
        <h3>Parceiro</h3>
        <p>Selecione o parceiro responsável pelo atendimento.</p>
      </div>
    </div>

    <div class="ar-flow-card-body">
      ${renderPainelParceiroMvpAr()}
    </div>
  </section>

  <section class="ar-flow-card ar-flow-budget">
    <div class="ar-flow-card-header">
      <span class="ar-step-number">3</span>
      <div>
        <h3>Resumo do produto</h3>
        <p>Confira os valores antes de gerar os links.</p>
      </div>
    </div>

    <div class="ar-flow-card-body">
      ${renderOrcamentoAr()}
    </div>
  </section>

  <section class="ar-flow-card ar-flow-links">
    <div class="ar-flow-card-header">
      <span class="ar-step-number">4</span>
      <div class="ar-links-header-action">
        ${renderAcaoGerarLinksAr()}
      </div>
    </div>

    <div class="ar-flow-card-body">
      ${renderResultadoAr()}
    </div>
  </section>
</div>
    </section>
  `;
}

function renderAcaoGerarLinksAr() {
  const produto = obterProdutoSelecionadoAr();
  const parceiro = obterParceiroSelecionadoAr();

  return `
    <div class="ar-action-box">
      ${state.ar.gerando ? `
        <p class="ar-action-status" role="status">Gerando links automaticamente...</p>
      ` : state.ar.message ? `
        <p class="ar-action-status is-error" role="alert">Não foi possível gerar os links.</p>
        <button class="secondary-btn ar-retry-links-btn" type="button" onclick="gerarLinksAr()">Tentar novamente</button>
      ` : state.ar.resultado ? `
        <p class="ar-action-status is-success" role="status">Links gerados automaticamente.</p>
      ` : !produto || !parceiro ? `
        <p class="ar-action-hint">
          Selecione um produto e um parceiro para gerar os links automaticamente.
        </p>
      ` : `
        <p class="ar-action-status" role="status">Preparando geração automática...</p>
      `}
    </div>
  `;
}

function renderPainelParceiroMvpAr() {
  const parceiro = obterParceiroSelecionadoAr();

  return `
    <label class="ar-autocomplete-wrap ar-partner-search-wrap">
      <div class="ar-autocomplete-field">
        <input
          id="ar_parceiro_busca"
          class="ar-mvp-input"
          type="search"
          value="${escapeAttr(state.ar.parceiroBusca || '')}"
          placeholder="Digite o nome do parceiro"
          oninput="alterarBuscaParceiroAr(this.value)"
          autocomplete="off">

        <div id="ar_sugestoes_parceiros" class="ar-suggestions ar-partner-suggestions" hidden></div>
      </div>
    </label>

    ${parceiro ? renderParceiroSelecionadoCardAr(parceiro) : `
      <p class="ar-compact-empty">Selecione um parceiro para continuar.</p>
    `}
  `;
}
function renderParceiroSelecionadoCardAr(parceiro) {
  const nome = parceiro.nome_completo || parceiro.nome || 'Parceiro';
  const status = parceiro.status || 'não informado';
  const codigo = parceiro.codigo_revendedor || parceiro.codigo || 'sem código';
  const email = parceiro.email_cadastro_certificado || parceiro.email_comercial || parceiro.email || '';
  const whatsappPessoal = parceiro.whatsapp_pessoal || parceiro.whatsapp || '';
  const whatsappComercial = parceiro.whatsapp_comercial || '';
  const contatos = [email, whatsappPessoal, whatsappComercial].filter(Boolean).join(' · ') || 'Sem contatos informados';

  return `
    <article class="ar-compact-selection-summary" aria-label="Resumo do parceiro selecionado">
      <div class="ar-compact-summary-line ar-compact-summary-primary">
        <strong>${escapeHtml(nome)}</strong>
        <span>Código: ${escapeHtml(codigo)}</span>
        <span>Status: ${escapeHtml(obterRotuloStatusHub(status, 'Não informado'))}</span>
      </div>
      <div class="ar-compact-summary-line ar-compact-summary-secondary" title="${escapeAttr(contatos)}">
        ${escapeHtml(contatos)}
      </div>
    </div>
  `;
}
function obterIniciaisAr(nome) {
  return String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte.charAt(0).toUpperCase())
    .join('') || 'AR';
}

function renderLinhaParceiroMvpAr(rotulo, valor) {
  return `
    <div class="ar-mvp-line">
      <label>${escapeHtml(rotulo)}</label>
      <div>${escapeHtml(valor || '')}</div>
    </div>
  `;
}

function renderParceiroSelecionadoAr(parceiro) {
  const contatos = [
    ['E-mail para cadastro', parceiro.email_cadastro_certificado || parceiro.email_comercial],
    ['WhatsApp pessoal', parceiro.whatsapp_pessoal],
    ['WhatsApp comercial', parceiro.whatsapp_comercial],
    ['Empresa/escritório', parceiro.empresa || parceiro.escritorio || parceiro.nome_empresa]
  ].filter(([, valor]) => valor);
  const status = parceiro.status || 'não informado';
  const statusNormalizado = normalizarBuscaAr(status);
  const statusAtivo = statusNormalizado === 'ativo' || statusNormalizado === 'sim' || statusNormalizado === 'regular';

  return `
    <article id="ar_parceiro_card" class="ar-partner-card">
      <div class="ar-partner-head">
        <div>
          <span>Parceiro selecionado</span>
          <strong>${escapeHtml(parceiro.nome_completo || parceiro.nome || 'Parceiro')}</strong>
        </div>
        <em class="${statusAtivo ? 'is-active' : ''}">${escapeHtml(obterRotuloStatusHub(status, 'Não informado'))}</em>
      </div>
      <div class="ar-partner-code">
        <span>Código do parceiro</span>
        <strong>${escapeHtml(parceiro.codigo_revendedor || 'sem código')}</strong>
      </div>
      ${contatos.length ? `
        <div class="ar-partner-grid">
          ${contatos.map(([rotulo, valor]) => `
            <div>
              <span>${escapeHtml(rotulo)}</span>
              <strong>${escapeHtml(valor)}</strong>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </article>
  `;
}

function renderPainelProdutoMvpAr() {
  const produto = obterProdutoSelecionadoAr();

  return `
    ${renderBuscaProdutoUnicaAr()}

    ${produto ? renderProdutoSelecionadoResumoAr(produto) : `
      <p class="ar-compact-empty">Selecione um produto para continuar.</p>
    `}
  `;
}
function renderBuscaProdutoUnicaAr() {
  return `
    <label class="ar-autocomplete-wrap ar-product-search-wrap">
      <div class="ar-autocomplete-field">
        <input
          id="ar_produto_busca"
          class="ar-mvp-input"
          type="search"
          value="${escapeAttr(state.ar.produtoBusca || '')}"
          placeholder="Ex.: e-CPF A1, cartão, 12 meses, Soluti..."
          oninput="alterarBuscaProdutoAr(this.value)"
          autocomplete="off">

        <div id="ar_sugestoes_produtos" class="ar-suggestions ar-product-suggestions" hidden></div>
      </div>
    </label>
  `;
}
function renderProdutoSelecionadoResumoAr(produto) {
  const nome = produto.descricao_comercial || produto.produto || 'Certificado digital';
  const detalhes = [
    produto.modelo || 'Modelo não informado',
    produto.ac ? `AC: ${produto.ac}` : '',
    produto.validade ? `Validade: ${produto.validade}` : '',
    produto.midia ? `Mídia: ${produto.midia}` : ''
  ].filter(Boolean).join(' · ');

  return `
    <article class="ar-compact-selection-summary" aria-label="Resumo do produto selecionado">
      <div class="ar-compact-summary-line ar-compact-summary-primary">
        <strong>${escapeHtml(nome)}</strong>
      </div>
      <div class="ar-compact-summary-line ar-compact-summary-secondary" title="${escapeAttr(detalhes)}">
        ${escapeHtml(detalhes)}
      </div>
    </div>
  `;
}
function alterarBuscaProdutoAr(valor) {
  const tinhaProdutoSelecionado = Boolean(state.ar.produtoId);

  invalidarGeracaoLinksAr();
  state.ar.produtoBusca = valor;
  state.ar.produtoId = '';
  state.ar.resultado = null;
  state.ar.alertas = [];

  if (tinhaProdutoSelecionado) {
    atualizarGeradorLinksDomAr();

    requestAnimationFrame(() => {
      const input = document.getElementById('ar_produto_busca');

      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }

      atualizarSugestoesProdutoUnicoDomAr();
    });

    return;
  }

  atualizarSugestoesProdutoUnicoDomAr();
}
function atualizarSugestoesProdutoUnicoDomAr() {
  const box = document.getElementById('ar_sugestoes_produtos');

  if (!box) return;

  const produtos = produtosFiltradosBuscaUnicaAr();

  if (!state.ar.produtoBusca || !produtos.length) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }

  box.hidden = false;
  box.innerHTML = produtos.map(produto => `
  <button type="button" onclick="selecionarProdutoCompletoAr('${escapeAttr(produto.id)}')">
    <strong>${escapeHtml(produto.descricao_comercial || produto.produto || 'Certificado digital')}</strong>

    <span>
      ${escapeHtml(produto.modelo || 'Modelo não informado')}
      ${produto.validade ? ` · Validade: ${escapeHtml(produto.validade)}` : ''}
    </span>

    <small class="ar-product-suggestion-meta">
      ${[produto.ac ? `AC: ${escapeHtml(produto.ac)}` : '', produto.midia ? `Mídia: ${escapeHtml(produto.midia)}` : ''].filter(Boolean).join(' · ')}
    </small>
  </button>
`).join('');
}

function produtosFiltradosBuscaUnicaAr() {
  const busca = normalizarBuscaAr(state.ar.produtoBusca || '');

  if (!busca) return [];

  const termos = busca.split(' ').filter(Boolean);

  return state.ar.produtos.filter(produto => {
    const texto = normalizarBuscaAr([
      produto.id,
      produto.descricao_comercial,
      produto.produto,
      produto.product_id,
      produto.ac,
      produto.tipo_certificado,
      produto.midia,
      produto.modelo,
      produto.validade,
      produto.grupo,
      produto.codigo_grupo,
      produto.grupo_com_desconto,
      produto.grupo_sem_desconto,
      produto.termos_busca,
      produto.preco_com_desconto,
      produto.preco_sem_desconto
    ].join(' '));

    return termos.every(termo => texto.includes(termo));
  }).slice(0, 10);
}
function selecionarProdutoCompletoAr(id) {
  const produto = state.ar.produtos.find(item => item.id === id);

  if (!produto) return;

  invalidarGeracaoLinksAr();
  state.ar.produtoId = id;
  state.ar.produtoBusca = [
    produto.descricao_comercial || produto.produto,
    produto.modelo,
    produto.validade
  ].filter(Boolean).join(' | ');

  state.ar.resultado = null;
  state.ar.alertas = [];

  atualizarGeradorLinksDomAr();
  tentarGerarLinksAutomaticamenteAr();
}


function renderCampoProdutoMvpAr(rotulo, chave) {
  return `
    <label class="ar-autocomplete-wrap">
      <span>${escapeHtml(rotulo)}</span>
      <div>
        <input class="ar-mvp-input" type="search" value="${escapeAttr(state.ar.filtros[chave] || '')}" onfocus="ativarCampoProdutoAr('${escapeAttr(chave)}')" oninput="alterarFiltroProdutoAr('${escapeAttr(chave)}', this.value)" autocomplete="off">
        <div id="ar_sugestoes_produto_${escapeAttr(chave)}" class="ar-suggestions" hidden></div>
      </div>
    </label>
  `;
}

function renderResumoProdutoMvpAr(produto) {
  if (!produto) {
    return '';
  }

  return `
    <div class="ar-mvp-band product">
      <strong>PRODUTO:</strong>
      <span>${escapeHtml(produto.descricao_comercial || 'Produto')}</span>
    </div>
  `;
}

function renderListaProdutosAr() {
  const totalFiltrosAtivos = contarFiltrosListaProdutosAr();
  const rotuloBotaoFiltros = totalFiltrosAtivos
    ? `Filtros: ${totalFiltrosAtivos} ativo${totalFiltrosAtivos === 1 ? '' : 's'}`
    : 'Filtros';

  return `
    <section>
      <div class="ar-toolbar">
        <input class="config-input" type="search" value="${escapeAttr(state.ar.busca)}" placeholder="Buscar por descrição, AC, modelo, validade" oninput="alterarBuscaAr(this.value)">
        <div class="ar-products-toolbar-actions">
          <div class="ar-products-filter-menu">
            <button
              class="secondary-btn ar-products-filter-btn ${totalFiltrosAtivos ? 'has-active-filters' : ''}"
              type="button"
              onclick="alternarFiltrosListaProdutosAr()"
              aria-label="${escapeAttr(rotuloBotaoFiltros)}"
              aria-expanded="${state.ar.filtrosListaAberto ? 'true' : 'false'}"
              title="${escapeAttr(rotuloBotaoFiltros)}"
            >
              <i class="ar-products-filter-icon" data-lucide="filter" aria-hidden="true"></i>
            </button>
            ${state.ar.filtrosListaAberto ? renderDropdownFiltrosListaProdutosAr() : ''}
          </div>
          <button class="secondary-btn ar-products-toggle-btn" type="button" onclick="alternarTodosGruposProdutosAr()">Recolher todos</button>
        </div>
      </div>
      <div id="ar_produtos_lista_resultado">
        ${renderTabelaProdutosAr()}
      </div>
      ${renderBarraProdutosSelecionadosAr()}
      ${renderModalVisualizacaoProdutosAr()}
    </section>
  `;
}

function produtosFiltradosAr() {
  if (state.ar.aba === 'produtos') {
    const termos = normalizarBuscaAr(state.ar.busca).split(' ').filter(Boolean);
    const gruposFiltro = new Set(
      (state.ar.listaGrupos || []).map(grupo => normalizarBuscaAr(grupo))
    );
    const acFiltro = normalizarBuscaAr(state.ar.listaAc);

    return state.ar.produtos.filter(produto => {
      const texto = normalizarBuscaAr([
        produto.descricao_comercial,
        produto.product_id,
        produto.ac,
        produto.tipo_certificado,
        produto.midia,
        produto.modelo,
        produto.validade,
        produto.grupo,
        produto.codigo_grupo,
        produto.grupo_com_desconto,
        produto.grupo_sem_desconto,
        produto.termos_busca
      ].join(' '));
      const grupoProduto = normalizarBuscaAr(obterGrupoProdutoListaAr(produto));
      const acProduto = normalizarBuscaAr(produto.ac);

      return termos.every(termo => texto.indexOf(termo) >= 0)
        && (!gruposFiltro.size || gruposFiltro.has(grupoProduto))
        && (!acFiltro || acProduto === acFiltro);
    });
  }

  const filtros = state.ar.filtros || {};

  return state.ar.produtos.filter(produto => {
    return campoProdutoCombinaAr(produto.ac, filtros.ac)
      && campoProdutoCombinaAr([produto.descricao_comercial, produto.product_id, produto.tipo_certificado, produto.grupo, produto.codigo_grupo, produto.grupo_com_desconto, produto.grupo_sem_desconto, produto.termos_busca].join(' '), filtros.produto)
      && campoProdutoCombinaAr(produto.midia, filtros.midia)
      && campoProdutoCombinaAr(produto.modelo, filtros.modelo)
      && campoProdutoCombinaAr(produto.validade, filtros.validade);
  });
}

function renderTabelaProdutosAr() {
  const produtos = produtosFiltradosAr();

  if (!produtos.length) {
    return `
      ${renderMensagemListaProdutosAr()}
      <p class="quick-link-empty">Nenhum produto encontrado.</p>
    `;
  }

  const grupos = agruparProdutosListaAr(produtos);
  const podeEditarProdutos = pode('painel_ar.produtos', 'update');

  return `
    ${renderMensagemListaProdutosAr()}
    <div class="ar-products-table-wrap">
      ${grupos.map(grupo => {
        const emEdicao = state.ar.edicaoProdutosGrupo?.nome === grupo.nome;

        return `
        <div class="ar-products-group-shell">
          <details
            class="ar-products-group ${obterClasseGrupoProdutosAr(grupo.nome)}"
            data-group="${escapeAttr(grupo.nome)}"
            open
          >
            <summary><span>${escapeHtml(grupo.nome)}</span></summary>
            <div class="ar-products-table" role="table" aria-label="Produtos ${escapeAttr(grupo.nome)}">
              <div class="ar-products-row ar-products-head" role="row">
                <span></span>
                <span>Descrição do produto</span>
                <span>$ Com Desconto</span>
                <span>$ Padrão</span>
                <span>SKU</span>
              </div>
              ${grupo.produtos.map(produto => {
                const temPrecoComDesconto = parseMoedaAr(produto.preco_com_desconto) != null;
                const selecionado = state.ar.produtosListaSelecionados.includes(produto.id);
                const rascunho = state.ar.edicaoProdutosGrupo?.rascunho?.[produto.id];
                return `
                  <article class="ar-products-row ${emEdicao ? 'is-editing' : ''}" role="row">
                    <span class="ar-products-select-cell">
                      <input type="checkbox" aria-label="Selecionar ${escapeAttr(produto.descricao_comercial || produto.produto || 'Produto')}" ${selecionado ? 'checked' : ''} onchange="alternarProdutoListaSelecionadoAr('${escapeAttr(produto.id)}')">
                    </span>
                    ${emEdicao && rascunho ? `
                      <span class="ar-products-edit-cell">
                        ${renderCampoEdicaoProdutoGrupoAr(produto.id, 'descricao_comercial', rascunho.descricao_comercial, 'Descrição do produto')}
                      </span>
                      <span class="ar-products-edit-cell">
                        ${renderCampoEdicaoProdutoGrupoAr(produto.id, 'preco_com_desconto', rascunho.preco_com_desconto, 'Valor com desconto', 'decimal')}
                      </span>
                      <span class="ar-products-edit-cell">
                        ${renderCampoEdicaoProdutoGrupoAr(produto.id, 'preco_sem_desconto', rascunho.preco_sem_desconto, 'Valor padrão', 'decimal')}
                      </span>
                      <span class="ar-products-edit-cell">
                        ${renderCampoEdicaoProdutoGrupoAr(produto.id, 'product_id', rascunho.product_id, 'SKU')}
                      </span>
                    ` : `
                      <span>${escapeHtml(produto.descricao_comercial || produto.produto || 'Produto')}</span>
                      <span>${escapeHtml(temPrecoComDesconto ? formatarMoedaProdutoAr(produto.preco_com_desconto) : '--')}</span>
                      <span>${escapeHtml(formatarMoedaProdutoAr(produto.preco_sem_desconto))}</span>
                      <span>${escapeHtml(produto.product_id || '-')}</span>
                    `}
                  </article>
                `;
              }).join('')}
            </div>
          </details>
          <div class="ar-products-group-actions" data-group="${escapeAttr(grupo.nome)}">
            ${emEdicao ? `
              <button
                class="ar-products-group-action-btn ar-products-group-cancel-btn"
                type="button"
                onclick="cancelarEdicaoGrupoProdutosAr()"
                ${state.ar.edicaoProdutosGrupo.salvando ? 'disabled' : ''}
              >Cancelar</button>
              <button
                class="ar-products-group-action-btn ar-products-group-save-btn"
                type="button"
                onclick="salvarEdicaoGrupoProdutosAr()"
                ${!state.ar.edicaoProdutosGrupo.alterado || state.ar.edicaoProdutosGrupo.salvando ? 'disabled' : ''}
              >${state.ar.edicaoProdutosGrupo.salvando ? 'Salvando...' : 'Salvar'}</button>
            ` : podeEditarProdutos ? `
              <button
                class="ar-products-group-action-btn ar-products-group-edit-btn"
                type="button"
                data-group="${escapeAttr(grupo.nome)}"
                aria-label="Editar produtos do grupo ${escapeAttr(grupo.nome)}"
                onclick="iniciarEdicaoGrupoProdutosAr(this.dataset.group)"
              >Editar</button>
            ` : ''}
          </div>
        </div>
      `;
      }).join('')}
    </div>
  `;
}

function renderMensagemListaProdutosAr() {
  if (!state.ar.mensagemProdutosLista) return '';

  const tipo = state.ar.tipoMensagemProdutosLista === 'sucesso' ? 'is-success' : 'is-error';

  return `
    <p class="ar-products-edit-feedback ${tipo}" role="${tipo === 'is-error' ? 'alert' : 'status'}">
      ${escapeHtml(state.ar.mensagemProdutosLista)}
    </p>
  `;
}

function renderCampoEdicaoProdutoGrupoAr(produtoId, campo, valor, rotulo, inputMode = 'text') {
  return `
    <input
      class="ar-products-edit-input"
      type="text"
      inputmode="${escapeAttr(inputMode)}"
      value="${escapeAttr(valor)}"
      aria-label="${escapeAttr(rotulo)}"
      data-product-id="${escapeAttr(produtoId)}"
      data-field="${escapeAttr(campo)}"
      oninput="alterarRascunhoProdutoGrupoAr(this.dataset.productId, this.dataset.field, this.value)"
      ${state.ar.edicaoProdutosGrupo?.salvando ? 'disabled' : ''}
      autocomplete="off"
    >
  `;
}

function criarRascunhoProdutoGrupoAr(produto) {
  const formatarValor = valor => {
    const numero = parseMoedaAr(valor);

    if (numero == null) return '';

    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return {
    descricao_comercial: String(produto.descricao_comercial || ''),
    preco_com_desconto: formatarValor(produto.preco_com_desconto),
    preco_sem_desconto: formatarValor(produto.preco_sem_desconto),
    product_id: String(produto.product_id || '')
  };
}

function criarEstadoVazioEdicaoGrupoProdutosAr() {
  return {
    nome: '',
    original: {},
    rascunho: {},
    alterado: false,
    salvando: false
  };
}

function iniciarEdicaoGrupoProdutosAr(nomeGrupo) {
  if (!pode('painel_ar.produtos', 'update')) {
    state.ar.mensagemProdutosLista = 'Seu usuário não possui permissão para editar produtos.';
    state.ar.tipoMensagemProdutosLista = 'erro';
    atualizarListaProdutosDomAr();
    return;
  }

  const edicaoAtual = state.ar.edicaoProdutosGrupo || criarEstadoVazioEdicaoGrupoProdutosAr();

  if (edicaoAtual.nome === nomeGrupo) return;

  if (edicaoAtual.nome && edicaoAtual.alterado) {
    const descartar = window.confirm('Existem alterações não salvas. Deseja descartá-las e editar outro grupo?');

    if (!descartar) return;
  }

  const produtosGrupo = state.ar.produtos.filter(produto => obterGrupoProdutoListaAr(produto) === nomeGrupo);
  const rascunho = {};

  produtosGrupo.forEach(produto => {
    rascunho[produto.id] = criarRascunhoProdutoGrupoAr(produto);
  });

  state.ar.edicaoProdutosGrupo = {
    nome: nomeGrupo,
    original: Object.fromEntries(
      Object.entries(rascunho).map(([id, valores]) => [id, { ...valores }])
    ),
    rascunho,
    alterado: false,
    salvando: false
  };
  state.ar.mensagemProdutosLista = '';
  state.ar.tipoMensagemProdutosLista = '';

  atualizarListaProdutosDomAr();

  window.requestAnimationFrame(() => {
    const acoesGrupo = Array.from(document.querySelectorAll('.ar-products-group-actions'))
      .find(elemento => elemento.dataset.group === nomeGrupo);
    const primeiroCampo = acoesGrupo
      ?.closest('.ar-products-group-shell')
      ?.querySelector('.ar-products-edit-input');

    primeiroCampo?.focus();
  });
}

function alterarRascunhoProdutoGrupoAr(produtoId, campo, valor) {
  const edicao = state.ar.edicaoProdutosGrupo;
  const camposPermitidos = ['descricao_comercial', 'preco_com_desconto', 'preco_sem_desconto', 'product_id'];

  if (
    !edicao?.nome
    || edicao.salvando
    || !edicao.rascunho?.[produtoId]
    || !camposPermitidos.includes(campo)
  ) return;

  edicao.rascunho[produtoId][campo] = valor;
  state.ar.mensagemProdutosLista = '';
  state.ar.tipoMensagemProdutosLista = '';
  edicao.alterado = Object.keys(edicao.rascunho).some(id => {
    return camposPermitidos.some(chave => {
      return edicao.rascunho[id]?.[chave] !== edicao.original[id]?.[chave];
    });
  });

  const acoes = Array.from(document.querySelectorAll('.ar-products-group-actions'))
    .find(elemento => elemento.dataset.group === edicao.nome);
  const botaoSalvar = acoes?.querySelector('.ar-products-group-save-btn');

  acoes?.classList.toggle('has-changes', edicao.alterado);

  if (botaoSalvar) {
    botaoSalvar.disabled = !edicao.alterado;
  }
}

function cancelarEdicaoGrupoProdutosAr() {
  const edicao = state.ar.edicaoProdutosGrupo;

  if (edicao?.alterado) {
    const descartar = window.confirm('Deseja cancelar e descartar as alterações deste grupo?');

    if (!descartar) return;
  }

  state.ar.edicaoProdutosGrupo = criarEstadoVazioEdicaoGrupoProdutosAr();
  state.ar.mensagemProdutosLista = '';
  state.ar.tipoMensagemProdutosLista = '';
  atualizarListaProdutosDomAr();
}

function parseValorEdicaoProdutoGrupoAr(valor) {
  const original = String(valor ?? '').trim();

  if (!original) return null;

  let texto = original
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/[^\d,.-]/g, '');

  if (!texto || !/\d/.test(texto)) return Number.NaN;

  const negativo = texto.startsWith('-');
  texto = texto.replace(/-/g, '');

  const ultimaVirgula = texto.lastIndexOf(',');
  const ultimoPonto = texto.lastIndexOf('.');

  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    texto = ultimaVirgula > ultimoPonto
      ? texto.replace(/\./g, '').replace(',', '.')
      : texto.replace(/,/g, '');
  } else if (ultimaVirgula >= 0) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (ultimoPonto >= 0) {
    const partes = texto.split('.');
    const casasFinais = partes.at(-1)?.length || 0;

    if (partes.length > 2) {
      texto = casasFinais <= 2
        ? `${partes.slice(0, -1).join('')}.${partes.at(-1)}`
        : partes.join('');
    } else if (casasFinais === 3 && partes[0].length <= 3) {
      texto = partes.join('');
    }
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero)) return Number.NaN;

  return negativo ? -numero : numero;
}

function validarEdicaoGrupoProdutosAr() {
  const edicao = state.ar.edicaoProdutosGrupo;
  const payload = [];
  const erros = [];
  const skus = new Map();

  Object.entries(edicao?.rascunho || {}).forEach(([id, produto]) => {
    const descricao = String(produto.descricao_comercial || '').trim();
    const sku = String(produto.product_id || '').trim();
    const precoComDesconto = parseValorEdicaoProdutoGrupoAr(produto.preco_com_desconto);
    const precoSemDesconto = parseValorEdicaoProdutoGrupoAr(produto.preco_sem_desconto);

    if (!descricao) {
      erros.push('Todos os produtos precisam ter uma descrição.');
    } else if (descricao.length > 300) {
      erros.push(`A descrição do SKU ${sku || '-'} ultrapassa 300 caracteres.`);
    }

    if (!sku) {
      erros.push('Todos os produtos precisam ter um SKU.');
    } else if (sku.length > 100) {
      erros.push(`O SKU ${sku} ultrapassa 100 caracteres.`);
    }

    if (Number.isNaN(precoComDesconto) || Number.isNaN(precoSemDesconto)) {
      erros.push(`Há valor inválido no produto ${sku || descricao || '-'}.`);
    } else {
      if (precoComDesconto !== null && precoComDesconto < 0) {
        erros.push(`O valor com desconto de ${sku || descricao} não pode ser negativo.`);
      }

      if (precoSemDesconto !== null && precoSemDesconto < 0) {
        erros.push(`O valor padrão de ${sku || descricao} não pode ser negativo.`);
      }

      if (
        precoComDesconto !== null
        && precoSemDesconto !== null
        && precoComDesconto > precoSemDesconto
      ) {
        erros.push(`O valor com desconto de ${sku || descricao} não pode superar o valor padrão.`);
      }
    }

    const skuNormalizado = sku.toLocaleLowerCase('pt-BR');

    if (skuNormalizado && skus.has(skuNormalizado)) {
      erros.push(`O SKU ${sku} está repetido no grupo.`);
    } else if (skuNormalizado) {
      skus.set(skuNormalizado, id);
    }

    payload.push({
      id,
      descricao_comercial: descricao,
      preco_com_desconto: Number.isNaN(precoComDesconto) ? null : precoComDesconto,
      preco_sem_desconto: Number.isNaN(precoSemDesconto) ? null : precoSemDesconto,
      product_id: sku
    });
  });

  const idsGrupo = new Set(payload.map(produto => produto.id));

  state.ar.produtos.forEach(produto => {
    if (idsGrupo.has(produto.id)) return;

    const skuExistente = String(produto.product_id || '').trim().toLocaleLowerCase('pt-BR');

    if (skuExistente && skus.has(skuExistente)) {
      erros.push(`O SKU ${produto.product_id} já está vinculado a outro produto.`);
    }
  });

  return {
    payload,
    erros: Array.from(new Set(erros))
  };
}

async function salvarEdicaoGrupoProdutosAr() {
  const edicao = state.ar.edicaoProdutosGrupo;

  if (!edicao?.nome || !edicao.alterado || edicao.salvando) return;

  if (!pode('painel_ar.produtos', 'update')) {
    state.ar.mensagemProdutosLista = 'Seu usuário não possui permissão para editar produtos.';
    state.ar.tipoMensagemProdutosLista = 'erro';
    atualizarListaProdutosDomAr();
    return;
  }

  const { payload, erros } = validarEdicaoGrupoProdutosAr();

  if (erros.length) {
    state.ar.mensagemProdutosLista = erros[0];
    state.ar.tipoMensagemProdutosLista = 'erro';
    atualizarListaProdutosDomAr();
    return;
  }

  const alterouSku = payload.some(produto => {
    return produto.product_id !== edicao.original?.[produto.id]?.product_id;
  });

  if (
    alterouSku
    && !window.confirm('A alteração de SKU será usada nos próximos links gerados. Deseja continuar?')
  ) {
    return;
  }

  edicao.salvando = true;
  state.ar.mensagemProdutosLista = '';
  state.ar.tipoMensagemProdutosLista = '';
  atualizarListaProdutosDomAr();

  try {
    const response = await chamarApi('updateArProductsGroup', {
      grupo: edicao.nome,
      produtos: payload
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível atualizar os produtos.'));
    }

    const atualizados = Array.isArray(response.data?.produtos) ? response.data.produtos : [];
    const atualizadosPorId = new Map(atualizados.map(produto => [produto.id, produto]));

    state.ar.produtos = state.ar.produtos.map(produto => {
      return atualizadosPorId.has(produto.id)
        ? { ...produto, ...atualizadosPorId.get(produto.id) }
        : produto;
    });
    state.ar.edicaoProdutosGrupo = criarEstadoVazioEdicaoGrupoProdutosAr();
    state.ar.mensagemProdutosLista = 'Produto(s) atualizado(s) com sucesso.';
    state.ar.tipoMensagemProdutosLista = 'sucesso';
    atualizarListaProdutosDomAr();
  } catch (erro) {
    state.ar.edicaoProdutosGrupo.salvando = false;
    state.ar.mensagemProdutosLista = erro.message || 'Erro ao atualizar os produtos.';
    state.ar.tipoMensagemProdutosLista = 'erro';
    atualizarListaProdutosDomAr();
  }
}

function renderDropdownFiltrosListaProdutosAr() {
  const grupos = obterOpcoesFiltroListaProdutosAr('grupo');
  const acs = obterOpcoesFiltroListaProdutosAr('ac');

  return `
    <div class="ar-products-filter-dropdown">
      <fieldset class="ar-products-filter-group">
        <legend>Grupo do produto</legend>
        <small>Sem seleção, todos os grupos são exibidos.</small>
        <div class="ar-products-filter-group-options">
          ${grupos.map(grupo => {
            const selecionado = (state.ar.listaGrupos || []).includes(grupo);

            return `
              <label class="ar-products-filter-group-option">
                <input
                  type="checkbox"
                  value="${escapeAttr(grupo)}"
                  ${selecionado ? 'checked' : ''}
                  onchange="alternarFiltroGrupoListaProdutosAr(this.value, this.checked)"
                >
                <span>${escapeHtml(grupo)}</span>
              </label>
            `;
          }).join('')}
        </div>
      </fieldset>

      <label>
        <span>AC</span>
        <select onchange="alterarFiltroListaProdutosAr('ac', this.value)">
          <option value="">Todas</option>
          ${acs.map(ac => `<option value="${escapeAttr(ac)}" ${state.ar.listaAc === ac ? 'selected' : ''}>${escapeHtml(ac)}</option>`).join('')}
        </select>
      </label>

      <button class="secondary-btn ar-products-clear-filters" type="button" onclick="limparFiltrosListaProdutosAr()">Limpar filtros</button>
    </div>
  `;
}

function renderBarraProdutosSelecionadosAr() {
  const total = state.ar.produtosListaSelecionados.length;

  if (!total) return '';

  return `
    <div class="ar-products-selection-bar" role="status">
      <strong>${total} produto${total === 1 ? '' : 's'} selecionado${total === 1 ? '' : 's'}</strong>
      <button class="secondary-btn" type="button" onclick="limparProdutosListaSelecionadosAr()">Limpar</button>
      <button class="save-btn" type="button" onclick="abrirVisualizacaoProdutosClienteAr()">Visualizar para cliente</button>
    </div>
  `;
}

function renderModalVisualizacaoProdutosAr() {
  if (!state.ar.modalVisualizacaoProdutos) return '';

  const produtos = obterProdutosListaSelecionadosAr();

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Visualização para cliente">
      <section class="small-modal ar-products-preview-modal">
        <div class="small-modal-header">
          <div>
            <h3>Visualização para cliente</h3>
            <p>${produtos.length} produto${produtos.length === 1 ? '' : 's'} selecionado${produtos.length === 1 ? '' : 's'}</p>
          </div>
          <button class="icon-btn" type="button" onclick="fecharVisualizacaoProdutosClienteAr()" aria-label="Fechar">×</button>
        </div>

        <div class="ar-products-preview-table">
          <div class="ar-products-preview-row ar-products-preview-head">
            <span>Descrição do produto</span>
            <span>$ Com Desconto</span>
            <span>$ Padrão</span>
          </div>
          ${produtos.map(produto => {
            const temPrecoComDesconto = parseMoedaAr(produto.preco_com_desconto) != null;
            return `
              <div class="ar-products-preview-row">
                <span>${escapeHtml(produto.descricao_comercial || produto.produto || 'Produto')}</span>
                <span>${escapeHtml(temPrecoComDesconto ? formatarMoedaProdutoAr(produto.preco_com_desconto) : '--')}</span>
                <span>${escapeHtml(formatarMoedaProdutoAr(produto.preco_sem_desconto))}</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="small-modal-actions">
          <button class="secondary-btn" type="button" onclick="fecharVisualizacaoProdutosClienteAr()">Fechar</button>
          <button id="ar_copy_produtos_cliente" class="save-btn" type="button" onclick="copiarVisualizacaoProdutosClienteAr()">Copiar visualização</button>
        </div>
      </section>
    </div>
  `;
}

function obterOpcoesFiltroListaProdutosAr(tipo) {
  const valores = state.ar.produtos.map(produto => {
    if (tipo === 'grupo') return obterGrupoProdutoListaAr(produto);
    return produto.ac || '';
  }).filter(Boolean);

  return Array.from(new Set(valores)).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
}

function contarFiltrosListaProdutosAr() {
  return (state.ar.listaGrupos || []).length + (state.ar.listaAc ? 1 : 0);
}

function atualizarIndicadorFiltrosListaProdutosAr() {
  const botao = document.querySelector('.ar-products-filter-btn');

  if (!botao) return;

  const totalFiltrosAtivos = contarFiltrosListaProdutosAr();
  const rotulo = totalFiltrosAtivos
    ? `Filtros: ${totalFiltrosAtivos} ativo${totalFiltrosAtivos === 1 ? '' : 's'}`
    : 'Filtros';

  botao.classList.toggle('has-active-filters', totalFiltrosAtivos > 0);
  botao.setAttribute('aria-label', rotulo);
  botao.setAttribute('title', rotulo);
}

function obterGrupoProdutoListaAr(produto) {
  return produto.tipo_certificado || produto.grupo || produto.ac || 'Produtos';
}

function obterClasseGrupoProdutosAr(nome) {
  return normalizarBuscaAr(nome) === 'oab' ? 'ar-products-group-oab' : '';
}

function agruparProdutosListaAr(produtos) {
  const grupos = new Map();

  produtos.forEach(produto => {
    const nomeGrupo = obterGrupoProdutoListaAr(produto);

    if (!grupos.has(nomeGrupo)) {
      grupos.set(nomeGrupo, []);
    }

    grupos.get(nomeGrupo).push(produto);
  });

  return Array.from(grupos.entries()).map(([nome, itens]) => ({
    nome,
    produtos: itens
  }));
}

function renderOpcoesProdutosAr() {
  const produtos = produtosFiltradosAr().slice(0, 8);

  if (!produtos.length) {
    return '<p class="quick-link-empty">Nenhum produto encontrado.</p>';
  }

  return produtos.map(produto => `
    <button class="ar-product-option ${state.ar.produtoId === produto.id ? 'selected' : ''}" type="button" onclick="selecionarProdutoAr('${escapeAttr(produto.id)}')">
      <strong>${escapeHtml(produto.descricao_comercial || 'Produto')}</strong>
      <span>${escapeHtml([produto.product_id, produto.ac, produto.modelo].filter(Boolean).join(' | '))}</span>
      <b>Validade: ${escapeHtml(produto.validade || '-')}</b>
      <small>${escapeHtml(produto.grupo_com_desconto || produto.codigo_grupo || produto.grupo || 'Sem grupo')} | Com desc.: ${escapeHtml(produto.preco_com_desconto || 'Não disponível')} | Sem desc.: ${escapeHtml(produto.preco_sem_desconto || 'Não disponível')}</small>
    </button>
  `).join('');
}

function renderSugestoesProdutoCampoAr(chave) {
  if (state.ar.campoProdutoAtivo !== chave || !normalizarBuscaAr(state.ar.filtros[chave])) {
    return '';
  }

  const valores = obterSugestoesProdutoCampoAr(chave);

  if (!valores.length) {
    return '<div class="ar-suggestions"><p>Nenhuma correspondência encontrada.</p></div>';
  }

  return `
    <div class="ar-suggestions">
      ${valores.map(valor => `
        <button type="button" onclick="selecionarSugestaoProdutoAr('${escapeAttr(chave)}', '${escapeAttr(valor)}')">
          <strong>${escapeHtml(valor)}</strong>
        </button>
      `).join('')}
    </div>
  `;
}

function obterSugestoesProdutoCampoAr(chave) {
  const filtro = normalizarBuscaAr(state.ar.filtros[chave]);
  const getter = {
    ac: produto => produto.ac,
    produto: produto => produto.descricao_comercial,
    midia: produto => produto.midia,
    modelo: produto => produto.modelo,
    validade: produto => produto.validade
  }[chave] || (() => '');
  const valores = [];

  state.ar.produtos.forEach(produto => {
    const valor = getter(produto);

    if (valor && normalizarBuscaAr(valor).indexOf(filtro) >= 0 && valores.indexOf(valor) === -1) {
      valores.push(valor);
    }
  });

  return valores.sort((a, b) => String(a).localeCompare(String(b))).slice(0, 8);
}

function parceirosFiltradosAr() {
  const busca = normalizarBuscaAr(state.ar.parceiroBusca || '');

  if (!busca) return [];

  const termos = busca.split(' ').filter(Boolean);

  return state.ar.parceiros.filter(parceiro => {
    const texto = normalizarBuscaAr([
      parceiro.id,
      parceiro.nome,
      parceiro.nome_completo,
      parceiro.nome_empresa,
      parceiro.empresa,
      parceiro.escritorio,
      parceiro.cnpj,
      parceiro.codigo_revendedor,
      parceiro.codigo,
      parceiro.status,
      parceiro.email_cadastro_certificado,
      parceiro.email_comercial,
      parceiro.email,
      parceiro.whatsapp,
      parceiro.whatsapp_pessoal,
      parceiro.whatsapp_comercial
    ].join(' '));

    return termos.every(termo => texto.includes(termo));
  }).slice(0, 8);
}

function renderSugestoesParceirosAr() {
  if (!normalizarBuscaAr(state.ar.parceiroBusca) || state.ar.parceiroId) {
    return '';
  }

  const parceiros = parceirosFiltradosAr();

  if (!parceiros.length) {
    return '<div class="ar-suggestions"><p>Nenhum parceiro encontrado.</p></div>';
  }

  return `
    <div class="ar-suggestions">
      ${parceiros.map(parceiro => `
        <button type="button" onclick="selecionarParceiroAr('${escapeAttr(parceiro.id)}')">
          <strong>${escapeHtml(parceiro.nome_completo || parceiro.nome || 'Parceiro')}</strong>
          <span>${escapeHtml([parceiro.codigo_revendedor || 'sem código', obterRotuloStatusHub(parceiro.status, '—')].join(' | '))}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function atualizarSugestoesProdutoDomAr(chave) {
  const box = document.getElementById(`ar_sugestoes_produto_${chave}`);
  document.querySelectorAll('.ar-mvp-fields .ar-autocomplete-wrap').forEach(item => {
    item.classList.remove('is-active');
  });

  if (!box) {
    return;
  }

  if (state.ar.campoProdutoAtivo !== chave || !normalizarBuscaAr(state.ar.filtros[chave])) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }

  const valores = obterSugestoesProdutoCampoAr(chave);
  box.closest('.ar-autocomplete-wrap')?.classList.add('is-active');
  box.hidden = false;
  box.innerHTML = valores.length
    ? valores.map(valor => `
      <button type="button" onclick="selecionarSugestaoProdutoAr('${escapeAttr(chave)}', '${escapeAttr(valor)}')">
        <strong>${escapeHtml(valor)}</strong>
      </button>
    `).join('')
    : '<p>Nenhuma correspondência encontrada.</p>';
}

function atualizarSugestoesParceiroDomAr() {
  const box = document.getElementById('ar_sugestoes_parceiros');

  if (!box) {
    return;
  }

  if (!normalizarBuscaAr(state.ar.parceiroBusca) || state.ar.parceiroId) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }

  const parceiros = parceirosFiltradosAr();
  box.closest('.ar-autocomplete-wrap')?.classList.add('is-active');
  box.hidden = false;
  box.innerHTML = parceiros.length
    ? parceiros.map(parceiro => `
      <button type="button" onclick="selecionarParceiroAr('${escapeAttr(parceiro.id)}')">
        <strong>${escapeHtml(parceiro.nome_completo || parceiro.nome || 'Parceiro')}</strong>
          <span>${escapeHtml([parceiro.codigo_revendedor || 'sem código', obterRotuloStatusHub(parceiro.status, '—')].join(' | '))}</span>
      </button>
    `).join('')
    : '<p>Nenhum parceiro encontrado.</p>';
}

function renderOpcoesParceirosAr() {
  const parceiros = parceirosFiltradosAr();

  if (!parceiros.length) {
    return '<p class="quick-link-empty">Nenhum parceiro encontrado.</p>';
  }

  return parceiros.map(parceiro => `
    <button class="ar-partner-option ${state.ar.parceiroId === parceiro.id ? 'selected' : ''}" type="button" onclick="selecionarParceiroAr('${escapeAttr(parceiro.id)}')">
      <strong>${escapeHtml(parceiro.nome_completo || parceiro.nome || 'Parceiro')}</strong>
      <span>${escapeHtml([parceiro.codigo_revendedor || 'sem código', obterRotuloStatusHub(parceiro.status, '—')].join(' | '))}</span>
      ${parceiro.nome_empresa || parceiro.email_cadastro_certificado ? `<small>${escapeHtml([parceiro.nome_empresa, parceiro.email_cadastro_certificado].filter(Boolean).join(' | '))}</small>` : ''}
    </button>
  `).join('');
}

function renderResumoSelecaoAr() {
  const produto = obterProdutoSelecionadoAr();
  const parceiro = obterParceiroSelecionadoAr();

  return `
    <div class="ar-selection">
      <div>
        <span>Produto</span>
        <strong>${escapeHtml(produto?.descricao_comercial || 'Nenhum produto selecionado')}</strong>
      </div>
      <div>
        <span>Parceiro</span>
        <strong>${escapeHtml(parceiro?.nome_completo || parceiro?.nome || 'Nenhum parceiro selecionado')}</strong>
        ${parceiro ? renderDetalhesParceiroAr(parceiro) : ''}
      </div>
    </div>
  `;
}

function renderDetalhesParceiroAr(parceiro) {
  const linhas = [
    ['Empresa', parceiro.nome_empresa],
    ['CNPJ', parceiro.cnpj_empresa],
    ['Código revendedor', parceiro.codigo_revendedor || 'sem código'],
    ['Status', parceiro.status || 'não informado'],
    ['E-mail para cadastro', parceiro.email_cadastro_certificado],
    ['WhatsApp pessoal', parceiro.whatsapp_pessoal],
    ['WhatsApp comercial', parceiro.whatsapp_comercial],
    ['E-mail comercial', parceiro.email_comercial],
    ['Observação', parceiro.observacoes || parceiro.observacao]
  ];

  return `
    <dl class="ar-partner-details">
      ${linhas.filter(([, valor]) => valor).map(([rotulo, valor]) => `
        <div><dt>${escapeHtml(rotulo)}</dt><dd>${escapeHtml(valor)}</dd></div>
      `).join('')}
    </dl>
  `;
}

function renderOrcamentoAr() {
  const produto = obterProdutoSelecionadoAr();

  if (!produto) {
    return `
      <div class="ar-empty-state">
        <strong>Nenhum produto selecionado</strong>
        <p>Busque e selecione um produto para visualizar o orçamento.</p>
      </div>
    `;
  }

  const texto = montarTextoOrcamentoAr(produto);
  const economia = formatarEconomiaProdutoAr(produto);
  const temPrecoComDesconto = parseMoedaAr(produto.preco_com_desconto) != null;
  const precoComDesconto = temPrecoComDesconto ? formatarMoedaProdutoAr(produto.preco_com_desconto) : '--';
  const precoSemDesconto = formatarMoedaProdutoAr(produto.preco_sem_desconto);

  return `
    <article class="ar-budget-card">
      <div class="ar-budget-top ar-budget-top-compact">
  <div>
    <h3>${escapeHtml(produto.descricao_comercial || produto.produto || 'Certificado digital')}</h3>
           <p>Resumo do produto selecionado.</p>
        </div>

        </div>

      <div class="ar-budget-values ar-budget-values-inline">
        <div class="ar-budget-value primary">
          <span>Com desconto</span>
          <strong>${escapeHtml(precoComDesconto)}</strong>
        </div>

        <div class="ar-budget-value">
          <span>Sem desconto</span>
          <strong>${escapeHtml(precoSemDesconto)}</strong>
        </div>

        <div class="ar-budget-value economy">
          <span>Economia</span>
          <strong>${escapeHtml(temPrecoComDesconto ? economia : '--')}</strong>
        </div>
      </div>

      <div class="ar-whatsapp-preview">
        <span>Prévia para WhatsApp</span>
        <pre>${escapeHtml(texto)}</pre>
      </div>

      <button
        id="ar_copy_orcamento" 
        class="secondary-btn ar-copy-budget-btn" 
        type="button" 
        onclick="copiarOrcamentoAr()">
       Copiar orçamento
    </button>
    </article>
  `;
}

function renderResultadoAr() {
  const resultado = state.ar.resultado;

  if (!resultado) {
    return `
      <div class="ar-empty-state">
        <strong>Nenhum link gerado ainda</strong>
        <p>Depois de selecionar produto e parceiro, clique em gerar links para visualizar o resultado.</p>
      </div>
    `;
  }

  const links = normalizarLinksResultadoAr(resultado);

  if (!links.length) {
    return `
      <div class="ar-empty-state">
        <strong>Links não encontrados</strong>
        <p>A API retornou uma resposta, mas nenhum link válido foi identificado.</p>
      </div>
    `;
  }

  return `
    <section class="ar-generated-links">
      <div class="ar-generated-links-list">
        ${links.map(link => `
          <article class="ar-generated-link-card">
            <div class="ar-generated-link-info">
              <span>${escapeHtml(link.rotulo)}</span>
              <small>${escapeHtml(link.url)}</small>
            </div>

            <div class="ar-generated-link-actions">
              <a 
                class="link-sub-btn" 
                href="${escapeAttr(link.url)}" 
                target="_blank" 
                rel="noopener">
                Abrir
              </a>

              <button 
                id="ar_copy_result_${escapeAttr(link.id)}"
                class="link-sub-btn" 
                type="button" 
                onclick="copiarLinkResultadoAr('${escapeAttr(link.id)}', '${escapeAttr(link.url)}')">
                Copiar
              </button>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}
function normalizarLinksResultadoAr(resultado) {
  const links = [];

  if (resultado.link_com_desconto) {
    links.push({
      id: 'com_desconto',
      rotulo: 'Com desconto',
      titulo: 'Link comercial com desconto',
      url: resultado.link_com_desconto
    });
  }

  if (resultado.link_sem_desconto) {
    links.push({
      id: 'sem_desconto',
      rotulo: 'Sem desconto',
      titulo: 'Link comercial sem desconto',
      url: resultado.link_sem_desconto
    });
  }

  if (Array.isArray(resultado.links)) {
    resultado.links.forEach((item, index) => {
      const url = item.url || item.link || '';

      if (!url) return;

      links.push({
        id: item.id || `extra_${index}`,
        rotulo: item.rotulo || item.tipo || `Link ${index + 1}`,
        titulo: item.titulo || item.nome || item.rotulo || `Link ${index + 1}`,
        url
      });
    });
  }

  return links;
}

async function copiarLinkResultadoAr(id, url) {
  const botao = document.getElementById(`ar_copy_result_${id}`);

  try {
    await navigator.clipboard.writeText(url);

    if (botao) {
      botao.textContent = 'Copiado';
      botao.classList.add('copied');

      window.setTimeout(() => {
        botao.textContent = 'Copiar';
        botao.classList.remove('copied');
      }, 1400);
    }
  } catch (erro) {
    if (botao) {
      botao.textContent = 'Erro';

      window.setTimeout(() => {
        botao.textContent = 'Copiar';
      }, 1400);
    }
  }
}

function obterLinksResultadoAr() {
  return {
    com_desconto: state.ar.resultado?.links?.com_desconto || state.ar.resultado?.link_com_desconto || '',
    sem_desconto: state.ar.resultado?.links?.sem_desconto || state.ar.resultado?.link_sem_desconto || ''
  };
}

function renderHistoricoAr() {
  if (!state.ar.historico.length) {
    return '<p class="quick-link-empty">Nenhum link AR gerado até agora.</p>';
  }

  return `
    <div class="audit-list">
      ${state.ar.historico.map(item => `
        <article class="audit-row ar-audit-row">
          <span>${escapeHtml(item.data_geracao || '-')}</span>
          <strong>${escapeHtml(item.produto || 'Produto')}</strong>
          <span>${escapeHtml(item.parceiro || '-')}</span>
          <span>${escapeHtml(item.grupo || '-')}</span>
          <small>${escapeHtml(item.usuario || '')}</small>
        </article>
      `).join('')}
    </div>
  `;
}

function alterarBuscaAr(valor) {
  state.ar.busca = valor;
  window.clearTimeout(state.ar.buscaTimer);
  state.ar.buscaTimer = window.setTimeout(() => {
    atualizarListaProdutosDomAr();
  }, 180);
}

function atualizarListaProdutosDomAr() {
  if (state.ar.aba !== 'produtos') return;

  const resultado = document.getElementById('ar_produtos_lista_resultado');

  if (!resultado) {
    renderPainelAr();
    return;
  }

  const expansaoGrupos = new Map(
    Array.from(resultado.querySelectorAll('.ar-products-group[data-group]'))
      .map(grupo => [grupo.dataset.group, grupo.open])
  );

  resultado.innerHTML = renderTabelaProdutosAr();

  resultado.querySelectorAll('.ar-products-group[data-group]').forEach(grupo => {
    if (expansaoGrupos.has(grupo.dataset.group)) {
      grupo.open = expansaoGrupos.get(grupo.dataset.group);
    }
  });
}

function fecharFiltrosListaAoClicarForaAr(event) {
  if (!state.ar.filtrosListaAberto || state.ar.aba !== 'produtos') return;
  if (event.target.closest('.ar-products-filter-menu')) return;

  state.ar.filtrosListaAberto = false;
  renderPainelAr();
}

function alternarFiltrosListaProdutosAr() {
  state.ar.filtrosListaAberto = !state.ar.filtrosListaAberto;
  renderPainelAr();
}

function alterarFiltroListaProdutosAr(tipo, valor) {
  if (tipo === 'ac') {
    state.ar.listaAc = valor;
  }

  renderPainelAr();
}

function alternarFiltroGrupoListaProdutosAr(grupo, selecionado) {
  const gruposSelecionados = new Set(state.ar.listaGrupos || []);

  if (selecionado) {
    gruposSelecionados.add(grupo);
  } else {
    gruposSelecionados.delete(grupo);
  }

  state.ar.listaGrupos = Array.from(gruposSelecionados);
  atualizarListaProdutosDomAr();
  atualizarIndicadorFiltrosListaProdutosAr();
}

function limparFiltrosListaProdutosAr() {
  state.ar.listaGrupos = [];
  state.ar.listaAc = '';
  renderPainelAr();
}

function alternarProdutoListaSelecionadoAr(id) {
  const selecionados = new Set(state.ar.produtosListaSelecionados);

  if (selecionados.has(id)) {
    selecionados.delete(id);
  } else {
    selecionados.add(id);
  }

  state.ar.produtosListaSelecionados = Array.from(selecionados);
  renderPainelAr();
}

function limparProdutosListaSelecionadosAr() {
  state.ar.produtosListaSelecionados = [];
  state.ar.modalVisualizacaoProdutos = false;
  renderPainelAr();
}

function abrirVisualizacaoProdutosClienteAr() {
  if (!state.ar.produtosListaSelecionados.length) return;

  state.ar.modalVisualizacaoProdutos = true;
  renderPainelAr();
}

function fecharVisualizacaoProdutosClienteAr() {
  state.ar.modalVisualizacaoProdutos = false;
  renderPainelAr();
}

function obterProdutosListaSelecionadosAr() {
  const selecionados = new Set(state.ar.produtosListaSelecionados);
  return state.ar.produtos.filter(produto => selecionados.has(produto.id));
}

function montarTextoVisualizacaoProdutosClienteAr() {
  return obterProdutosListaSelecionadosAr().map(produto => {
    const temPrecoComDesconto = parseMoedaAr(produto.preco_com_desconto) != null;
    return [
      produto.descricao_comercial || produto.produto || 'Produto',
      `Com desconto: ${temPrecoComDesconto ? formatarMoedaProdutoAr(produto.preco_com_desconto) : '--'}`,
      `Padrão: ${formatarMoedaProdutoAr(produto.preco_sem_desconto)}`
    ].join('\n');
  }).join('\n\n');
}

async function copiarVisualizacaoProdutosClienteAr() {
  const botao = document.getElementById('ar_copy_produtos_cliente');
  const texto = montarTextoVisualizacaoProdutosClienteAr();

  if (!texto) return;

  try {
    await navigator.clipboard.writeText(texto);

    if (botao) {
      botao.textContent = 'Visualização copiada';
      botao.classList.add('is-saved');

      window.setTimeout(() => {
        botao.textContent = 'Copiar visualização';
        botao.classList.remove('is-saved');
      }, 1600);
    }
  } catch (erro) {
    if (botao) {
      botao.textContent = 'Erro ao copiar';

      window.setTimeout(() => {
        botao.textContent = 'Copiar visualização';
      }, 1600);
    }
  }
}

function alternarTodosGruposProdutosAr() {
  const grupos = Array.from(document.querySelectorAll('.ar-products-group'));
  const deveFechar = grupos.some(grupo => grupo.open);

  grupos.forEach(grupo => {
    grupo.open = !deveFechar;
  });

  const botao = document.querySelector('.ar-products-toggle-btn');

  if (botao) {
    botao.textContent = deveFechar ? 'Expandir todos' : 'Recolher todos';
  }
}

function campoProdutoCombinaAr(valor, filtro) {
  const textoFiltro = normalizarBuscaAr(filtro);

  if (!textoFiltro) {
    return true;
  }

  return normalizarBuscaAr(valor).indexOf(textoFiltro) >= 0;
}

function alterarFiltroProdutoAr(chave, valor) {
  state.ar.campoProdutoAtivo = chave;
  state.ar.filtros[chave] = valor;
  state.ar.produtoId = '';
  state.ar.resultado = null;
  state.ar.alertas = [];

  atualizarSugestoesProdutoDomAr(chave);
}

function ativarCampoProdutoAr(chave) {
  state.ar.campoProdutoAtivo = chave;
  atualizarSugestoesProdutoDomAr(chave);
}

function selecionarSugestaoProdutoAr(chave, valor) {
  state.ar.filtros[chave] = valor;
  const box = document.getElementById(`ar_sugestoes_produto_${chave}`);
  const input = box?.closest('.ar-autocomplete-wrap')?.querySelector('input');

  if (input) {
    input.value = valor;
  }

  selecionarProdutoPorFiltrosAr();
  state.ar.resultado = null;
  state.ar.alertas = [];

  if (!state.ar.produtoId) {
    if (box) {
      box.hidden = false;
      box.innerHTML = '<p>Complete os outros campos para identificar o produto.</p>';
    }
    return;
  }

  state.ar.campoProdutoAtivo = '';
  atualizarGeradorLinksDomAr();
}

function alterarBuscaParceiroAr(valor) {
  const tinhaParceiroSelecionado = Boolean(state.ar.parceiroId || state.ar.resultado);

  invalidarGeracaoLinksAr();
  state.ar.parceiroBusca = valor;
  state.ar.parceiroId = '';
  state.ar.resultado = null;
  state.ar.alertas = [];

  if (tinhaParceiroSelecionado) {
    atualizarGeradorLinksDomAr();

    requestAnimationFrame(() => {
      const input = document.getElementById('ar_parceiro_busca');

      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }

      atualizarSugestoesParceiroDomAr();
    });

    return;
  }

  atualizarSugestoesParceiroDomAr();
}

function confirmarParceiroDigitadoAr(valor) {
  selecionarParceiroPorTextoAr(valor);
  atualizarGeradorLinksDomAr();
}

function confirmarProdutoDigitadoAr() {
  selecionarProdutoPorFiltrosAr();
  atualizarGeradorLinksDomAr();
}

function selecionarParceiroPorTextoAr(valor) {
  const texto = normalizarBuscaAr(valor);
  const parceiro = state.ar.parceiros.find(item => {
    return normalizarBuscaAr(item.nome_completo || item.nome) === texto
      || normalizarBuscaAr(item.codigo_revendedor) === texto;
  });

  state.ar.parceiroId = parceiro ? parceiro.id : '';
}

function selecionarProdutoPorFiltrosAr() {
  const filtrados = produtosFiltradosAr();

  if (filtrados.length === 1) {
    state.ar.produtoId = filtrados[0].id;
    return;
  }

  const filtros = state.ar.filtros || {};
  const produtoExato = state.ar.produtos.find(produto => {
    return (!filtros.ac || normalizarBuscaAr(produto.ac) === normalizarBuscaAr(filtros.ac))
      && (!filtros.produto || normalizarBuscaAr(produto.descricao_comercial) === normalizarBuscaAr(filtros.produto))
      && (!filtros.midia || normalizarBuscaAr(produto.midia) === normalizarBuscaAr(filtros.midia))
      && (!filtros.modelo || normalizarBuscaAr(produto.modelo) === normalizarBuscaAr(filtros.modelo))
      && (!filtros.validade || normalizarBuscaAr(produto.validade) === normalizarBuscaAr(filtros.validade));
  });

  state.ar.produtoId = produtoExato ? produtoExato.id : '';
}

function agendarRenderPainelAr() {
  window.clearTimeout(state.ar.renderTimer);
  state.ar.renderTimer = window.setTimeout(() => {
    renderPainelAr();
  }, 220);
}

function atualizarGeradorLinksDomAr() {
  const fluxo = document.querySelector('.ar-flow-grid');

  if (!fluxo) {
    renderPainelAr();
    return;
  }

  const produto = fluxo.querySelector('.ar-flow-product .ar-flow-card-body');
  const parceiro = fluxo.querySelector('.ar-flow-partner .ar-flow-card-body');
  const resumo = fluxo.querySelector('.ar-flow-budget .ar-flow-card-body');
  const links = fluxo.querySelector('.ar-flow-links .ar-flow-card-body');
  const acaoLinks = fluxo.querySelector('.ar-links-header-action');

  if (!produto || !parceiro || !resumo || !links || !acaoLinks) {
    renderPainelAr();
    return;
  }

  produto.innerHTML = renderPainelProdutoMvpAr();
  parceiro.innerHTML = renderPainelParceiroMvpAr();
  resumo.innerHTML = renderOrcamentoAr();
  acaoLinks.innerHTML = renderAcaoGerarLinksAr();
  links.innerHTML = renderResultadoAr();
}

function selecionarProdutoAr(id) {
  invalidarGeracaoLinksAr();
  state.ar.produtoId = id;
  state.ar.resultado = null;
  state.ar.alertas = [];
  atualizarGeradorLinksDomAr();
  tentarGerarLinksAutomaticamenteAr();
}

function selecionarParceiroAr(id) {
  invalidarGeracaoLinksAr();
  state.ar.parceiroId = id;
  const parceiro = obterParceiroSelecionadoAr();
  state.ar.parceiroBusca = parceiro ? (parceiro.nome_completo || parceiro.nome) : state.ar.parceiroBusca;
  state.ar.resultado = null;
  state.ar.alertas = [];
  atualizarGeradorLinksDomAr();
  tentarGerarLinksAutomaticamenteAr();
}

function selecionarAbaAr(aba) {
  if (!podeAcessarAbaAr(aba)) {
    state.ar.message = 'Seu usuário não possui acesso a esta área do Painel AR.';
    renderPainelAr();
    return;
  }

  if (state.ar.aba === 'gerar' && aba !== 'gerar') {
    resetarEstadoGerarLinksAr();
  }

  state.ar.aba = aba;
  renderPainelAr();

  if (aba === 'validacoes' && !state.ar.validacoes.loading) {
    carregarValidacoesAr();
  }
}

function selecionarSubabaValidacoesAr(aba) {
  if (aba === 'emitir' && !pode('painel_ar.validacoes', 'emitir_recibo')) {
    state.ar.validacoes.message = 'Seu usuário não possui permissão para emitir recibos.';
    renderPainelAr();
    return;
  }

  if (aba === 'importacao' && !pode('painel_ar.validacoes', 'importar')) {
    state.ar.validacoes.message = 'Seu usuário não possui permissão para importar repasses.';
    renderPainelAr();
    return;
  }

  state.ar.validacoes.aba = aba;
  state.ar.validacoes.message = '';
  renderPainelAr();

  if (!state.ar.validacoes.loading && (aba === 'emitir' || aba === 'consultar')) {
    carregarValidacoesAr();
  }
}

function alterarFiltroValidacoesAr(chave, valor) {
  state.ar.validacoes.filtros[chave] = valor;
}

async function carregarValidacoesAr(manterMensagem = false) {
  try {
    state.ar.validacoes.loading = true;
    if (!manterMensagem) {
      state.ar.validacoes.message = '';
    }
    renderPainelAr();

    const response = await chamarApi('getArValidacoesData', {
      filtros: state.ar.validacoes.filtros
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível carregar as validações.'));
    }

    state.ar.validacoes.pendentes = response.data.pendentes || [];
    state.ar.validacoes.recibos = response.data.recibos || [];
    state.ar.validacoes.selecionados = state.ar.validacoes.selecionados.filter(id => {
      return state.ar.validacoes.pendentes.some(item => item.id === id);
    });
  } catch (erro) {
    state.ar.validacoes.message = erro.message || 'Erro ao carregar as validações.';
  } finally {
    state.ar.validacoes.loading = false;
    renderPainelAr();
  }
}

function alternarValidacaoSelecionadaAr(id) {
  const selecionados = state.ar.validacoes.selecionados;

  if (selecionados.includes(id)) {
    state.ar.validacoes.selecionados = selecionados.filter(item => item !== id);
  } else {
    state.ar.validacoes.selecionados = [...selecionados, id];
  }

  renderPainelAr();
}

function alternarTodasValidacoesVisiveisAr(marcar) {
  const idsVisiveis = state.ar.validacoes.pendentes.map(item => item.id);

  if (marcar) {
    state.ar.validacoes.selecionados = Array.from(new Set([
      ...state.ar.validacoes.selecionados,
      ...idsVisiveis
    ]));
  } else {
    state.ar.validacoes.selecionados = state.ar.validacoes.selecionados.filter(id => !idsVisiveis.includes(id));
  }

  renderPainelAr();
}

function limparSelecaoValidacoesAr() {
  state.ar.validacoes.selecionados = [];
  renderPainelAr();
}

async function criarLancamentoManualValidacoesAr() {
  if (!pode('painel_ar.validacoes', 'importar')) {
    state.ar.validacoes.message = 'Seu usuário não possui permissão para criar lançamentos.';
    renderPainelAr();
    return;
  }

  const valor = document.getElementById('ar_manual_valor')?.value || '';
  const parceiroNome = document.getElementById('ar_manual_parceiro')?.value || '';
  const dataValidacao = document.getElementById('ar_manual_data')?.value || '';
  const produto = document.getElementById('ar_manual_produto')?.value || '';

  if (!parceiroNome.trim() || !dataValidacao || !produto.trim() || !valor) {
    state.ar.validacoes.message = 'Informe parceiro, data, produto e valor da comissão.';
    renderPainelAr();
    return;
  }

  try {
    state.ar.validacoes.loading = true;
    state.ar.validacoes.message = '';
    renderPainelAr();

    const response = await chamarApi('createArValidacaoManual', {
      parceiro_nome: parceiroNome.trim(),
      codigo_entidade: document.getElementById('ar_manual_codigo')?.value || '',
      data_validacao: dataValidacao,
      produto: produto.trim(),
      pedido: document.getElementById('ar_manual_pedido')?.value || '',
      nome_cliente: document.getElementById('ar_manual_cliente')?.value || '',
      valor_tot_comiss: valor
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível salvar o lançamento manual.'));
    }

    state.ar.validacoes.message = 'Lançamento manual salvo.';
    await carregarValidacoesAr(true);
  } catch (erro) {
    state.ar.validacoes.loading = false;
    state.ar.validacoes.message = erro.message || 'Erro ao salvar o lançamento manual.';
    renderPainelAr();
  }
}

async function emitirReciboValidacoesAr() {
  if (!pode('painel_ar.validacoes', 'emitir_recibo')) {
    state.ar.validacoes.message = 'Seu usuário não possui permissão para emitir recibos.';
    renderPainelAr();
    return;
  }

  const selecionados = state.ar.validacoes.pendentes.filter(item => {
    return state.ar.validacoes.selecionados.includes(item.id);
  });

  if (!selecionados.length) {
    state.ar.validacoes.message = 'Selecione ao menos um lançamento.';
    renderPainelAr();
    return;
  }

  const chavesParceiro = new Set(selecionados.map(item => {
    return item.parceiro_id || item.codigo_entidade || item.parceiro_nome || 'sem-parceiro';
  }));

  if (chavesParceiro.size > 1) {
    state.ar.validacoes.message = 'Selecione lançamentos de um único parceiro para emitir o recibo.';
    renderPainelAr();
    return;
  }

  try {
    state.ar.validacoes.loading = true;
    state.ar.validacoes.message = '';
    renderPainelAr();

    const response = await chamarApi('emitirArRecibo', {
      parceiro_id: selecionados[0].parceiro_id || null,
      validacao_ids: selecionados.map(item => item.id)
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível emitir o recibo.'));
    }

    state.ar.validacoes.selecionados = [];
    state.ar.validacoes.aba = 'consultar';
    state.ar.validacoes.message = 'Recibo emitido com sucesso.';
    await carregarValidacoesAr(true);
  } catch (erro) {
    state.ar.validacoes.loading = false;
    state.ar.validacoes.message = erro.message || 'Erro ao emitir o recibo.';
    renderPainelAr();
  }
}

function visualizarReciboValidacoesAr(id) {
  state.ar.validacoes.reciboAtivo = state.ar.validacoes.recibos.find(item => item.id === id) || null;
  renderPainelAr();
}

function fecharReciboValidacoesAr() {
  state.ar.validacoes.reciboAtivo = null;
  renderPainelAr();
}

async function cancelarReciboValidacoesAr(id) {
  if (!pode('painel_ar.validacoes', 'cancelar_recibo')) {
    state.ar.validacoes.message = 'Seu usuário não possui permissão para cancelar recibos.';
    renderPainelAr();
    return;
  }

  const recibo = state.ar.validacoes.recibos.find(item => item.id === id);

  if (!window.confirm(`Cancelar o recibo ${recibo?.numero || ''}? Os lançamentos vinculados voltarão para pendente.`)) {
    return;
  }

  try {
    state.ar.validacoes.loading = true;
    state.ar.validacoes.message = '';
    renderPainelAr();

    const response = await chamarApi('cancelarArRecibo', {
      recibo_id: id
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível cancelar o recibo.'));
    }

    state.ar.validacoes.reciboAtivo = null;
    state.ar.validacoes.message = 'Recibo cancelado. Lançamentos retornaram para pendente.';
    await carregarValidacoesAr(true);
  } catch (erro) {
    state.ar.validacoes.loading = false;
    state.ar.validacoes.message = erro.message || 'Erro ao cancelar o recibo.';
    renderPainelAr();
  }
}

async function alterarMesBaseRepasseAr(valor) {
  const repasse = state.ar.validacoes.importacaoRepasse;
  repasse.mesBase = valor;
  repasse.linhas = [];
  repasse.erros = [];
  repasse.resumo = null;
  repasse.loteExistente = null;
  repasse.message = '';

  if (!valor) {
    renderPainelAr();
    return;
  }

  try {
    repasse.loading = true;
    renderPainelAr();

    const response = await chamarApi('checkArRepasseImportado', {
      mes_base: normalizarMesBaseRepasseAr(valor)
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível verificar o mês-base.'));
    }

    repasse.loteExistente = response.data || null;
    repasse.message = repasse.loteExistente ? 'Este mês-base já possui importação de repasse.' : '';
  } catch (erro) {
    repasse.message = erro.message || 'Erro ao verificar o mês-base.';
  } finally {
    repasse.loading = false;
    renderPainelAr();
  }
}

async function processarArquivoRepasseAr(event) {
  if (!pode('painel_ar.validacoes', 'importar')) {
    state.ar.validacoes.importacaoRepasse.message = 'Seu usuário não possui permissão para importar repasses.';
    renderPainelAr();
    return;
  }

  const arquivo = event.target.files?.[0];
  const repasse = state.ar.validacoes.importacaoRepasse;

  if (!repasse.mesBase) {
    repasse.message = 'Informe o mês-base antes de selecionar a planilha.';
    renderPainelAr();
    return;
  }

  if (!arquivo) return;

  try {
    repasse.loading = true;
    repasse.message = '';
    repasse.arquivoNome = arquivo.name;
    repasse.linhas = [];
    repasse.erros = [];
    repasse.resumo = null;
    renderPainelAr();

    const xlsx = await carregarXlsxAr();
    const buffer = await arquivo.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'array', cellDates: true });
    const sheetName = escolherAbaRepasseAr(workbook, xlsx);

    if (!sheetName) {
      throw new Error('Não encontrei uma aba com a estrutura de Base de Dados.');
    }

    const worksheet = workbook.Sheets[sheetName];
    const linhasOriginais = xlsx.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: true
    });
    const { linhas, erros } = normalizarLinhasRepasseAr(linhasOriginais);

    repasse.linhas = linhas;
    repasse.erros = erros;
    repasse.resumo = {
      aba: sheetName,
      total: linhasOriginais.length,
      validas: linhas.length
    };
    repasse.message = linhas.length
      ? `Planilha lida: ${linhas.length} linha(s) válida(s) na aba ${sheetName}.`
      : 'Nenhuma linha válida encontrada na planilha.';
  } catch (erro) {
    repasse.message = erro.message || 'Erro ao ler a planilha de repasse.';
  } finally {
    repasse.loading = false;
    renderPainelAr();
  }
}

async function importarRepasseValidacoesAr() {
  if (!pode('painel_ar.validacoes', 'importar')) {
    state.ar.validacoes.importacaoRepasse.message = 'Seu usuário não possui permissão para importar repasses.';
    renderPainelAr();
    return;
  }

  const repasse = state.ar.validacoes.importacaoRepasse;

  if (!repasse.mesBase || !repasse.linhas.length || repasse.erros.length || repasse.loteExistente) {
    repasse.message = 'Confira mês-base, planilha e alertas antes de importar.';
    renderPainelAr();
    return;
  }

  try {
    repasse.loading = true;
    repasse.message = '';
    renderPainelAr();

    const response = await chamarApi('importArRepasse', {
      mes_base: normalizarMesBaseRepasseAr(repasse.mesBase),
      nome_arquivo: repasse.arquivoNome,
      linhas: repasse.linhas
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível importar o repasse.'));
    }

    state.ar.validacoes.message = `Repasse importado com sucesso: ${response.data?.total_importadas || repasse.linhas.length} lançamento(s).`;
    repasse.message = '';
    repasse.loteExistente = {
      id: response.data?.importacao_id,
      mes_base: response.data?.mes_base
    };
    repasse.linhas = [];
    repasse.erros = [];
    repasse.resumo = null;
    repasse.loading = false;
    state.ar.validacoes.aba = 'emitir';
    await carregarValidacoesAr(true);
  } catch (erro) {
    repasse.loading = false;
    repasse.message = erro.message || 'Erro ao importar o repasse.';
    renderPainelAr();
  }
}

async function excluirMesBaseRepasseAr() {
  if (!pode('painel_ar.validacoes', 'excluir_importacao')) {
    state.ar.validacoes.importacaoRepasse.message = 'Seu usuário não possui permissão para excluir importações.';
    renderPainelAr();
    return;
  }

  const repasse = state.ar.validacoes.importacaoRepasse;

  if (!repasse.mesBase || !repasse.loteExistente) {
    repasse.message = 'Selecione um mês-base importado para excluir.';
    renderPainelAr();
    return;
  }

  const mesBaseFormatado = formatarMesBaseRepasseAr(repasse.mesBase);
  const confirmado = window.confirm(
    `Excluir a importação de repasse de ${mesBaseFormatado}? Apenas lançamentos pendentes e sem recibo serão removidos.`
  );

  if (!confirmado) return;

  try {
    repasse.loading = true;
    repasse.message = '';
    renderPainelAr();

    const response = await chamarApi('deleteArRepasseImportado', {
      mes_base: normalizarMesBaseRepasseAr(repasse.mesBase)
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível excluir o mês-base.'));
    }

    const total = response.data?.total_excluidas || 0;
    state.ar.validacoes.message = `Mês-base ${mesBaseFormatado} excluído: ${total} lançamento(s) removido(s).`;
    state.ar.validacoes.importacaoRepasse = {
      mesBase: '',
      arquivoNome: '',
      linhas: [],
      erros: [],
      resumo: null,
      loteExistente: null,
      loading: false,
      message: ''
    };
    await carregarValidacoesAr(true);
  } catch (erro) {
    repasse.loading = false;
    repasse.message = erro.message || 'Erro ao excluir o mês-base.';
    renderPainelAr();
  }
}

function limparImportacaoRepasseAr() {
  state.ar.validacoes.importacaoRepasse = {
    mesBase: '',
    arquivoNome: '',
    linhas: [],
    erros: [],
    resumo: null,
    loteExistente: null,
    loading: false,
    message: ''
  };
  renderPainelAr();
}

function tentarGerarLinksAutomaticamenteAr() {
  if (!state.ar.produtoId || !state.ar.parceiroId || state.ar.gerando) return;

  const produtoId = state.ar.produtoId;
  const parceiroId = state.ar.parceiroId;

  requestAnimationFrame(() => {
    if (
      state.ar.produtoId === produtoId
      && state.ar.parceiroId === parceiroId
      && !state.ar.gerando
    ) {
      gerarLinksAr();
    }
  });
}

async function gerarLinksAr() {
  if (!state.ar.produtoId || !state.ar.parceiroId) {
    state.ar.message = 'Selecione um produto e um parceiro.';
    renderPainelAr();
    return;
  }

  const geracaoLinksToken = state.ar.geracaoLinksToken;
  const produtoId = state.ar.produtoId;
  const parceiroId = state.ar.parceiroId;
  const requisicaoAindaAtual = () => (
    state.ar.geracaoLinksToken === geracaoLinksToken
    && state.ar.produtoId === produtoId
    && state.ar.parceiroId === parceiroId
  );

  try {
    state.ar.message = '';
    state.ar.gerando = true;
    atualizarGeradorLinksDomAr();

    const response = await chamarApi('generateArLinks', {
      produto_id: produtoId,
      parceiro_id: parceiroId
    });

    if (!requisicaoAindaAtual()) return;

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível gerar os links.'));
    }

    state.ar.gerando = false;
    state.ar.resultado = response.data;
    state.ar.alertas = response.data.alertas || [];
    await esperar(500);
    if (!requisicaoAindaAtual()) return;
    atualizarGeradorLinksDomAr();
  } catch (erro) {
    if (!requisicaoAindaAtual()) return;
    state.ar.gerando = false;
    state.ar.resultado = null;
    state.ar.message = erro.message || 'Erro ao gerar links.';
    atualizarGeradorLinksDomAr();
  }
}

async function copiarTextoAr(botaoId, texto, original) {
  const botao = document.getElementById(botaoId);

  try {
    await navigator.clipboard.writeText(texto);

    if (botao) {
      botao.textContent = 'Link copiado';
      botao.classList.add('copied');
      window.setTimeout(() => {
        botao.textContent = original;
        botao.classList.remove('copied');
      }, 1600);
    }
  } catch (erro) {
    if (botao) {
      botao.textContent = 'Erro ao copiar';
      window.setTimeout(() => {
        botao.textContent = original;
      }, 1600);
    }
  }
}

async function copiarOrcamentoAr() {
  const texto = montarTextoOrcamentoAr();
  const botao = document.getElementById('ar_copy_orcamento');

  if (!texto || !botao) return;

  try {
    await navigator.clipboard.writeText(texto);
    botao.textContent = 'Orçamento copiado';
    botao.classList.add('copied');
    window.setTimeout(() => {
      botao.textContent = 'Copiar orçamento';
      botao.classList.remove('copied');
    }, 1600);
  } catch (erro) {
    botao.textContent = 'Erro ao copiar';
    window.setTimeout(() => {
      botao.textContent = 'Copiar orçamento';
    }, 1600);
  }
}

function montarTextoOrcamentoAr() {
  const produto = obterProdutoSelecionadoAr();

  if (!produto) {
    return '';
  }

  const temPrecoComDesconto = parseMoedaAr(produto.preco_com_desconto) != null;
  const linhas = [
    'Segue orçamento do certificado digital:',
    '',
    `*${produto.descricao_comercial || 'Produto'} | ${produto.modelo || '-'}*`,
    `Validade: *${produto.validade || '-'}*`,
    ''
  ];

  if (temPrecoComDesconto) {
    linhas.push(
      `Valor com desconto: *${formatarMoedaProdutoAr(produto.preco_com_desconto)}*`,
      `Valor sem desconto: ${formatarMoedaProdutoAr(produto.preco_sem_desconto)}`,
      '',
      `Economia: *${formatarEconomiaProdutoAr(produto)}*`
    );
  } else {
    linhas.push(`Valor: ${formatarMoedaProdutoAr(produto.preco_sem_desconto)}`);
  }

  linhas.push('----');

  return linhas.join('\n');
}

function obterProdutoSelecionadoAr() {
  return state.ar.produtos.find(produto => produto.id === state.ar.produtoId) || null;
}

function obterParceiroSelecionadoAr() {
  return state.ar.parceiros.find(parceiro => parceiro.id === state.ar.parceiroId) || null;
}

function formatarEconomiaProdutoAr(produto) {
  const com = parseMoedaAr(produto.preco_com_desconto);
  const sem = parseMoedaAr(produto.preco_sem_desconto);

  if (com == null || sem == null) {
    return 'Não disponível';
  }

  return formatarMoedaNumeroAr(Math.max(sem - com, 0));
}

function formatarMoedaProdutoAr(valor) {
  const numero = parseMoedaAr(valor);

  if (numero == null) {
    return valor || 'Não disponível';
  }

  return formatarMoedaNumeroAr(numero);
}

function parseMoedaAr(valor) {
  if (valor === '' || valor == null) {
    return null;
  }

  let texto = String(valor)
    .trim()
    .replace(/[^\d,.-]/g, '');

  if (!texto) {
    return null;
  }

  const negativo = texto.includes('-');
  texto = texto.replace(/-/g, '');

  const temVirgula = texto.includes(',');
  const temPonto = texto.includes('.');

  let normalizado = texto;

  if (temVirgula && temPonto) {
    const ultimaVirgula = texto.lastIndexOf(',');
    const ultimoPonto = texto.lastIndexOf('.');

    if (ultimaVirgula > ultimoPonto) {
      normalizado = texto.replace(/\./g, '').replace(',', '.');
    } else {
      normalizado = texto.replace(/,/g, '');
    }
  } else if (temVirgula) {
    normalizado = texto.replace(/\./g, '').replace(',', '.');
  } else if (temPonto) {
    const partes = texto.split('.');
    const ultimaParte = partes[partes.length - 1];

    if (ultimaParte.length <= 2) {
      normalizado = texto.replace(/,/g, '');
    } else {
      normalizado = texto.replace(/\./g, '');
    }
  } else if (/^\d+$/.test(texto) && texto.length > 3) {
    normalizado = String(Number(texto) / 100);
  }

  const numero = Number(normalizado);
  const valorFinal = negativo ? -numero : numero;

  return Number.isNaN(valorFinal) ? null : valorFinal;
}

function formatarMoedaNumeroAr(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatarDataCurtaAr(valor) {
  if (!valor) return '-';

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) {
    const [ano, mes, dia] = String(valor).split('-');
    return `${dia}/${mes}/${ano}`;
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return String(valor);
  }

  return data.toLocaleDateString('pt-BR');
}

function formatarMesBaseRepasseAr(valor) {
  if (!valor) return '-';

  const [ano, mes] = String(valor).slice(0, 7).split('-');
  const data = new Date(Number(ano), Number(mes) - 1, 1);

  if (Number.isNaN(data.getTime())) {
    return String(valor);
  }

  const nomeMes = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
}

function normalizarMesBaseRepasseAr(valor) {
  if (!valor) return '';
  return `${String(valor).slice(0, 7)}-01`;
}

function normalizarCabecalhoRepasseAr(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function obterValorRepasseAr(linha, aliases) {
  const mapa = Object.entries(linha).reduce((acc, [chave, valor]) => {
    acc[normalizarCabecalhoRepasseAr(chave)] = valor;
    return acc;
  }, {});

  for (const alias of aliases) {
    const valor = mapa[normalizarCabecalhoRepasseAr(alias)];
    if (valor !== '' && valor != null) return valor;
  }

  return '';
}

function textoRepasseAr(valor) {
  if (valor == null) return '';
  return String(valor).trim();
}

function numeroRepasseAr(valor) {
  if (typeof valor === 'number') return valor;
  const texto = textoRepasseAr(valor).replace(/[^\d,.-]/g, '');
  if (!texto) return null;

  const normalizado = texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto;
  const numero = Number(normalizado);

  return Number.isNaN(numero) ? null : numero;
}

function dataRepasseAr(valor) {
  if (!valor) return '';

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10);
  }

  if (typeof valor === 'number') {
    const base = new Date(Date.UTC(1899, 11, 30));
    base.setUTCDate(base.getUTCDate() + valor);
    return base.toISOString().slice(0, 10);
  }

  const texto = textoRepasseAr(valor);

  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    return texto.slice(0, 10);
  }

  const partes = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (partes) {
    const ano = partes[3].length === 2 ? `20${partes[3]}` : partes[3];
    return `${ano}-${partes[2].padStart(2, '0')}-${partes[1].padStart(2, '0')}`;
  }

  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? '' : data.toISOString().slice(0, 10);
}

function normalizarLinhasRepasseAr(linhasOriginais) {
  const linhas = [];
  const erros = [];

  linhasOriginais.forEach((linha, index) => {
    const numeroLinha = index + 2;
    const codigoEntidade = textoRepasseAr(obterValorRepasseAr(linha, ['Cod.Ent.', 'Cod Ent', 'Cod. Entidade']));
    const nomeVendedor = textoRepasseAr(obterValorRepasseAr(linha, ['Nome Vendedor']));
    const descEntidade = textoRepasseAr(obterValorRepasseAr(linha, ['Des. Entidade', 'Desc. Entidade']));
    const produto = textoRepasseAr(obterValorRepasseAr(linha, ['Desc.Produto', 'Desc Produto']));
    const pedido = textoRepasseAr(obterValorRepasseAr(linha, ['Pedido']));
    const cliente = textoRepasseAr(obterValorRepasseAr(linha, ['Nome Cliente']));
    const dataValidacao = dataRepasseAr(obterValorRepasseAr(linha, ['Dt.Validação', 'Dt.Validacao', 'Dt Validação']));
    const valorComissao = numeroRepasseAr(obterValorRepasseAr(linha, ['Valor Tot. Comiss.', 'Valor Tot Comiss', 'Valor Total Comissão']));

    if (!codigoEntidade && !nomeVendedor && !produto && !pedido && !cliente && valorComissao == null) {
      return;
    }

    if (!nomeVendedor && !codigoEntidade) {
      erros.push(`Linha ${numeroLinha}: parceiro não identificado.`);
    }

    if (!produto) {
      erros.push(`Linha ${numeroLinha}: produto não informado.`);
    }

    if (!pedido) {
      erros.push(`Linha ${numeroLinha}: pedido não informado.`);
    }

    if (valorComissao == null) {
      erros.push(`Linha ${numeroLinha}: valor de comissão inválido.`);
    }

    linhas.push({
      codigo_entidade: codigoEntidade,
      entidade: descEntidade,
      cod_vendedor: textoRepasseAr(obterValorRepasseAr(linha, ['Cod.Vendedor', 'Cod Vendedor'])),
      nome_vendedor: nomeVendedor || descEntidade,
      agente_validacao: textoRepasseAr(obterValorRepasseAr(linha, ['Desc. Agente Val.', 'Desc Agente Val'])),
      cod_produto: textoRepasseAr(obterValorRepasseAr(linha, ['Cod.Produto', 'Cod Produto'])),
      produto,
      pedido,
      status_pedido: textoRepasseAr(obterValorRepasseAr(linha, ['Status Pedido'])),
      data_pedido: dataRepasseAr(obterValorRepasseAr(linha, ['Dt.Pedido', 'Dt Pedido'])),
      data_validacao: dataValidacao,
      data_verificacao: dataRepasseAr(obterValorRepasseAr(linha, ['Dt.Verificação', 'Dt.Verificacao', 'Dt Verificação'])),
      data_emissao_renovacao: dataRepasseAr(obterValorRepasseAr(linha, ['Dt.Emissão/Renovação', 'Dt.Emissao/Renovacao'])),
      nome_cliente: cliente,
      cod_ac: textoRepasseAr(obterValorRepasseAr(linha, ['Cód. AC', 'Cod. AC', 'Cod AC'])),
      grupo_produto: textoRepasseAr(obterValorRepasseAr(linha, ['Desc. Grupo', 'Desc Grupo'])),
      link_repasse: textoRepasseAr(obterValorRepasseAr(linha, ['Link'])),
      valor_bruto: numeroRepasseAr(obterValorRepasseAr(linha, ['Val. Bruto', 'Valor Bruto'])),
      valor_faturamento: numeroRepasseAr(obterValorRepasseAr(linha, ['Val. Faturamento', 'Valor Faturamento'])),
      valor_tot_comiss: valorComissao ?? 0
    });
  });

  return { linhas, erros };
}

function escolherAbaRepasseAr(workbook, xlsx) {
  const nomes = workbook.SheetNames || [];
  const candidatas = nomes.map(nome => {
    const worksheet = workbook.Sheets[nome];
    const primeiraLinha = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      range: 0,
      blankrows: false
    })[0] || [];
    const headers = primeiraLinha.map(normalizarCabecalhoRepasseAr);
    const score = [
      'codent',
      'nomevendedor',
      'descproduto',
      'pedido',
      'dtvalidacao',
      'valortotcomiss'
    ].filter(cabecalho => headers.includes(cabecalho)).length;
    const nomeNormalizado = normalizarBuscaAr(nome);
    const bonus = nomeNormalizado.includes('base') && nomeNormalizado.includes('dados') ? 2 : 0;
    return { nome, score: score + bonus };
  });

  return candidatas.sort((a, b) => b.score - a.score)[0]?.score > 3
    ? candidatas.sort((a, b) => b.score - a.score)[0].nome
    : '';
}

function carregarXlsxAr() {
  if (window.XLSX) {
    return Promise.resolve(window.XLSX);
  }

  return new Promise((resolve, reject) => {
    const scriptExistente = document.querySelector('script[data-ar-xlsx]');
    if (scriptExistente) {
      scriptExistente.addEventListener('load', () => resolve(window.XLSX));
      scriptExistente.addEventListener('error', () => reject(new Error('Não foi possível carregar o leitor de planilhas.')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    script.async = true;
    script.dataset.arXlsx = 'true';
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error('Não foi possível carregar o leitor de planilhas.'));
    document.head.appendChild(script);
  });
}

function normalizarBuscaAr(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function abrirLink(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener');
}

function obterHashHubAtual() {
  return String(window.location.hash || '').replace(/^#/, '').trim();
}

function normalizarHashHub(valor = '') {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/^\/+|\/+$/g, '');
}

function atualizarHashHub(hash = '', { replace = false } = {}) {
  const url = new URL(window.location.href);
  const normalizado = normalizarHashHub(hash);
  url.hash = normalizado ? `#${normalizado}` : '';

  if (replace) {
    window.history.replaceState({}, '', url);
  } else if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== `${url.pathname}${url.search}${url.hash}`) {
    window.history.pushState({}, '', url);
  }
}

function atualizarRotaAdminHub(aba = '', { replace = false } = {}) {
  const rotasPorAba = {
    categorias: 'cadastros/categorias',
    grupos: 'cadastros/grupos',
    usuarios: 'cadastros/usuarios',
    perfis: 'cadastros/perfis',
    'parceiros-indicacao': 'cadastros/parceiros-indicacao',
    'logs-integracoes': 'sistema/logs-integracoes',
    auditoria: 'sistema/logs-integracoes/auditoria',
    limites: 'parametros/limites',
    identidade: 'identidade',
    aparencia: 'aparencia',
    logo: 'logo',
    'home-exibicao': 'home-exibicao'
  };
  const rotaAba = rotasPorAba[aba] || aba;
  const baseAdmin = montarCaminhoHub('administracao').replace(/\/+$/g, '');
  const url = new URL(window.location.href);
  url.pathname = rotaAba ? `${baseAdmin}/${rotaAba}` : baseAdmin;
  url.hash = '';

  if (replace) {
    window.history.replaceState({}, '', url);
  } else if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== `${url.pathname}${url.search}${url.hash}`) {
    window.history.pushState({}, '', url);
  }
}

const HUB_BREADCRUMB_LABELS = {
  inicio: 'Hub',
  administracao: 'Administração',
  'central-senhas': 'Central de Senhas',
  'painel-ar': 'Painel AR',
  crm: 'CRM',
  'links-corretora': 'Links Corretora',
  'links-ar': 'Links AR',
  'links-gestao': 'Links Gestão',
  financeiro: 'Financeiro',
  dashboard: 'Dashboard',
  demandas: 'Demandas à contabilidade',
  fechamentos: 'Fechamento mensal',
  lancamentos: 'Lançamentos',
  conciliacao: 'Conciliação',
  cartoes: 'Cartões',
  relatorios: 'Relatórios',
  cadastros: 'Cadastros',
  fechamento: 'Fechamento',
  auditoria: 'Auditoria',
  configuracoes: 'Configurações',
  'rh-dp': 'RH & DP',
  colaboradores: 'Colaboradores',
  categorias: 'Categorias',
  grupos: 'Grupos',
  usuarios: 'Usuários',
  perfis: 'Perfis',
  'parceiros-indicacao': 'Parceiros de Indicação',
  'logs-integracoes': 'Logs de Integrações',
  limites: 'Limites',
  identidade: 'Identidade',
  aparencia: 'Aparência',
  logo: 'Logo',
  'home-exibicao': 'Home e Exibição',
  acessos: 'Acessos',
  historico: 'Histórico',
  inicio: 'Início',
  gerar: 'Gerar Links',
  produtos: 'Lista Produtos',
  validacoes: 'Validações',
  emitir: 'Emitir Recibo',
  consultar: 'Consultar Recibos',
  importacao: 'Importação'
};

const HUB_BREADCRUMB_ADMIN_ROUTES = {
  categorias: 'cadastros/categorias',
  grupos: 'cadastros/grupos',
  usuarios: 'cadastros/usuarios',
  perfis: 'cadastros/perfis',
  'parceiros-indicacao': 'cadastros/parceiros-indicacao',
  'logs-integracoes': 'sistema/logs-integracoes',
  auditoria: 'sistema/logs-integracoes/auditoria',
  limites: 'parametros/limites',
  identidade: 'identidade',
  aparencia: 'aparencia',
  logo: 'logo',
  'home-exibicao': 'home-exibicao'
};

function obterLabelBreadcrumbHub(chave = '') {
  if (String(chave) === '200') return 'CRM 2.0';
  if (String(chave) === '201') return 'Pessoas físicas';
  return HUB_BREADCRUMB_LABELS[chave] || String(chave || '')
    .split('-')
    .filter(Boolean)
    .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

function obterBreadcrumbHub() {
  const contexto = obterContextoRotaHub();
  const itens = [
    {
      label: 'Hub',
      path: montarCaminhoHub()
    }
  ];

  if (!contexto.modulo || contexto.modulo === 'inicio') {
    return itens;
  }

  const pathModulo = montarCaminhoHub(contexto.modulo);
  itens.push({
    label: obterLabelBreadcrumbHub(contexto.modulo),
    path: pathModulo
  });

  if (contexto.modulo === 'administracao' && contexto.principal) {
    const rotaAdmin = HUB_BREADCRUMB_ADMIN_ROUTES[contexto.principal] || contexto.principal;
    itens.push({
      label: obterLabelBreadcrumbHub(contexto.principal),
      path: `${pathModulo.replace(/\/+$/g, '')}/${rotaAdmin}`
    });
  } else if (contexto.principal) {
    itens.push({
      label: obterLabelBreadcrumbHub(contexto.principal),
      path: `${pathModulo.replace(/\/+$/g, '')}/${contexto.principal}`
    });
  }

  if (contexto.secundaria && contexto.secundaria !== contexto.principal) {
    const ultimoPath = itens[itens.length - 1]?.path || pathModulo;
    itens.push({
      label: obterLabelBreadcrumbHub(contexto.secundaria),
      path: `${ultimoPath.replace(/\/+$/g, '')}/${contexto.secundaria}`
    });
  }

  return itens;
}

function renderHubBreadcrumbItem(item, index, itens) {
  const ultimo = index === itens.length - 1;

  if (ultimo) {
    return `<span class="hub-breadcrumb-current" aria-current="page">${escapeHtml(item.label)}</span>`;
  }

  return `
    <a href="${escapeAttr(item.path)}" onclick="event.preventDefault(); navegarParaRota('${escapeAttr(item.path)}')">
      ${escapeHtml(item.label)}
    </a>
  `;
}

function renderHubBreadcrumb() {
  const itens = obterBreadcrumbHub();

  return `
    <nav class="hub-breadcrumb" aria-label="Caminho da página">
      ${itens.map((item, index) => `
        ${index > 0 ? '<span class="hub-breadcrumb-separator" aria-hidden="true">&gt;</span>' : ''}
        ${renderHubBreadcrumbItem(item, index, itens)}
      `).join('')}
    </nav>
  `;
}

function obterContextoRotaHub() {
  const partesRota = obterPartesDaRotaAtual();
  const modulo = normalizarIdModuloRota(partesRota[0] || '') || 'inicio';
  const hash = normalizarHashHub(obterHashHubAtual());
  const partes = hash ? hash.split('/') : partesRota.slice(1);
  const principal = partes.length > 1 && ['cadastros', 'parametros', 'sistema'].includes(partes[0])
    ? partes[partes.length - 1]
    : partes[0];

  return {
    modulo,
    hash,
    principal: principal || '',
    secundaria: partes[1] || ''
  };
}

function sincronizarContextoAdminPelaRota() {
  const { modulo, principal } = obterContextoRotaHub();
  if (modulo !== 'administracao' || !principal) return;

  const abasValidas = ['identidade', 'aparencia', 'logo', 'limites', 'categorias', 'grupos', 'home-exibicao', 'usuarios', 'perfis', 'parceiros-indicacao', 'logs-integracoes', 'auditoria'];
  if (abasValidas.includes(principal)) {
    state.admin.aba = principal;
  }
}

function sincronizarContextoSenhasPelaRota() {
  const { modulo, principal } = obterContextoRotaHub();
  if (modulo !== 'central-senhas' || !principal) return;

  if (principal === 'acessos' || principal === 'historico') {
    state.passwords.aba = principal;
  }
}

function sincronizarContextoArPelaRota() {
  const { modulo, principal, secundaria } = obterContextoRotaHub();
  if (modulo !== 'painel-ar') return;

  const abasValidas = ['inicio', 'gerar', 'produtos', 'validacoes', 'historico', 'crm', 'crm2', 'crm2-pf'];
  if (principal === '200') {
    state.ar.aba = 'crm2';
    return;
  }
  if (principal === '201') {
    state.ar.aba = 'crm2-pf';
    return;
  }
  if (principal && abasValidas.includes(principal)) {
    state.ar.aba = principal;
  }

  if (state.ar.aba === 'validacoes' && secundaria) {
    const subAbasValidas = ['emitir', 'consultar', 'importacao'];
    if (subAbasValidas.includes(secundaria)) {
      state.ar.validacoes.aba = secundaria;
    }
  }
}

function sincronizarContextoHubPelaRota() {
  sincronizarContextoAdminPelaRota();
  sincronizarContextoSenhasPelaRota();
  sincronizarContextoArPelaRota();
}

function renderHubUserBox() {
  return `
    <div class="user-box hub-user-box">
      <div class="hub-user-box-copy">
        <strong>${escapeHtml(state.usuario?.nome || '')}</strong>
        <span>${escapeHtml(state.usuario?.email || '')}</span>
      </div>
      <div class="hub-user-box-actions">
        <button class="theme-btn icon-only" onclick="alternarTema()" title="${state.temaAtual === 'escuro' ? 'Ativar modo claro' : 'Ativar modo escuro'}" aria-label="${state.temaAtual === 'escuro' ? 'Ativar modo claro' : 'Ativar modo escuro'}">
          <i data-lucide="${state.temaAtual === 'escuro' ? 'sun' : 'moon'}" aria-hidden="true"></i>
        </button>
        <button class="secondary-btn logout-btn" type="button" onclick="sair()">Sair</button>
      </div>
    </div>
  `;
}

function renderHubTopbar() {
  const nomeSistema = state.config?.nome_sistema || 'PAINEL TRANSMARES';
  const subtitulo = state.config?.subtitulo_sistema || 'Central operacional da Transmares Corretora de Seguros';

  return `
    <header class="topbar">
      <button
        class="hub-mobile-menu-toggle"
        type="button"
        onclick="alternarMenuSidebarHub()"
        aria-label="${state.sidebar.collapsed ? 'Abrir menu principal' : 'Fechar menu principal'}"
        aria-expanded="${state.sidebar.collapsed ? 'false' : 'true'}"
        aria-controls="hub-sidebar"
        title="${state.sidebar.collapsed ? 'Abrir menu principal' : 'Fechar menu principal'}"
      >
        <i data-lucide="menu" aria-hidden="true"></i>
      </button>
      ${renderHeaderLogo()}
      <div class="brand">
        <h1>${escapeHtml(nomeSistema)}</h1>
        <p>${escapeHtml(subtitulo)}</p>
      </div>

      ${renderHubNotificationBell()}
      ${renderHubUserBox()}
    </header>
  `;
}

function obterCaminhoMenuHub(item = {}) {
  const rota = item.legacyRoute || item.route || '/';
  const [pathname = '/', hash = ''] = String(rota || '/').split('#');
  const base = obterBaseHub();
  const caminho = pathname === '/'
    ? (base ? `${base}/` : '/')
    : `${base || ''}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;

  return hash ? `${caminho}#${hash}` : caminho;
}

function obterRotaRelativaAtualHub() {
  const base = obterBaseHub();
  const pathname = window.location.pathname || '/';
  const rota = base ? pathname.slice(base.length) : pathname;
  const normalizada = rota.replace(/\/+$/g, '') || '/';

  return `${normalizada}${window.location.hash || ''}`;
}

function normalizarRotaComparacaoHub(rota = '') {
  const [pathname = '/', hash = ''] = String(rota || '/').split('#');
  const normalizada = pathname.replace(/\/+$/g, '') || '/';
  return `${normalizada}${hash ? `#${hash}` : ''}`;
}

function itemMenuEstaAtivoHub(item = {}) {
  const atual = obterRotaRelativaAtualHub();
  return [item.route, item.legacyRoute]
    .filter(Boolean)
    .map(normalizarRotaComparacaoHub)
    .some(rota => rota === atual);
}

function itemMenuPodeAparecerHub(item = {}) {
  if (item.permission && !pode(item.permission.resource, item.permission.action || 'view')) {
    return false;
  }

  if (item.moduleId && !canAccessModule(state.permissions, item.moduleId)) {
    return false;
  }

  return true;
}

function filtrarMenuHub(items = HUB_MENU_TREE) {
  return items
    .filter(itemMenuPodeAparecerHub)
    .map(item => {
      const children = Array.isArray(item.children) ? filtrarMenuHub(item.children) : [];
      return { ...item, children };
    })
    .filter(item => item.type !== 'group' || item.children.length);
}

function encontrarItemMenuHub(id, items = filtrarMenuHub()) {
  for (const item of items) {
    if (item.id === id) return item;
    const encontrado = encontrarItemMenuHub(id, item.children || []);
    if (encontrado) return encontrado;
  }

  return null;
}

function itemMenuTemAtivoHub(item = {}) {
  if (itemMenuEstaAtivoHub(item)) return true;
  return (item.children || []).some(itemMenuTemAtivoHub);
}

function obterIconeMenuHub(item = {}) {
  const mapa = {
    inicio: 'house',
    dashboards: 'layout-dashboard',
    'central-senhas': 'key-round',
    operacoes: 'workflow',
    financeiro: 'landmark',
    'rh-dp': 'users-round',
    administracao: 'settings'
  };
  return mapa[item.id] || 'circle-help';
}

function grupoMenuAbertoHub(item = {}) {
  if (state.sidebar.collapsed) return false;
  if (state.sidebar.searchQuery.trim()) return true;
  if (itemMenuTemAtivoHub(item)) return true;
  if (state.sidebar.openGroups[item.id] === false) return false;
  return state.sidebar.openGroups[item.id] === true;
}

function renderHubSidebarRoute(item, nivel = 0) {
  const ativo = itemMenuEstaAtivoHub(item);
  const planejado = !['active', 'alias-required'].includes(item.status || 'active');
  const classe = nivel > 0
    ? 'hub-sidebar-menu-button hub-sidebar-menu-button--subitem hub-sidebar-subitem'
    : 'hub-sidebar-menu-button hub-sidebar-menu-button--route hub-sidebar-link';
  const caminho = obterCaminhoMenuHub(item);

  return `
    <button
      class="${classe} ${ativo ? 'active' : ''}"
      type="button"
      ${planejado ? 'disabled' : `onclick="navegarMenuSidebarHub('${escapeAttr(caminho)}')"` }
      title="${escapeAttr(item.label || '')}"
      ${state.sidebar.collapsed ? `data-tooltip="${escapeAttr(item.label || '')}"` : ''}
      aria-current="${ativo ? 'page' : 'false'}"
    >
      ${nivel === 0 ? `<span class="hub-sidebar-icon" aria-hidden="true"><i data-lucide="${obterIconeMenuHub(item)}"></i></span>` : ''}
      <span class="hub-sidebar-label">${escapeHtml(item.label || '')}</span>
      ${planejado ? '<span class="hub-sidebar-badge">Em breve</span>' : ''}
    </button>
  `;
}

function renderHubSidebarFloatingRoute(item, nivel = 0) {
  const ativo = itemMenuEstaAtivoHub(item);
  const planejado = !['active', 'alias-required'].includes(item.status || 'active');
  const caminho = obterCaminhoMenuHub(item);

  return `
    <button
      class="hub-sidebar-floating-item ${ativo ? 'active' : ''}"
      type="button"
      role="menuitem"
      data-level="${nivel}"
      ${planejado ? 'disabled' : `onclick="navegarMenuSidebarHub('${escapeAttr(caminho)}')"` }
      aria-current="${ativo ? 'page' : 'false'}"
    >
      <span>${escapeHtml(item.label || '')}</span>
      ${planejado ? '<small>Em breve</small>' : ''}
    </button>
  `;
}

function renderHubSidebarFloatingItem(item, nivel = 0) {
  if (item.type !== 'group') {
    return renderHubSidebarFloatingRoute(item, nivel);
  }

  return `
    <div class="hub-sidebar-floating-group" data-level="${nivel}">
      <span class="hub-sidebar-floating-group-label">${escapeHtml(item.label || '')}</span>
      <div class="hub-sidebar-floating-group-items">
        ${(item.children || []).map(child => renderHubSidebarFloatingItem(child, nivel + 1)).join('')}
      </div>
    </div>
  `;
}

function renderHubSidebarFloatingPanel(item = {}) {
  if (!state.sidebar.collapsed || state.sidebar.floatingGroupId !== item.id) return '';

  return `
    <div class="hub-sidebar-floating-panel" role="menu" aria-label="${escapeAttr(item.label || '')}">
      <strong class="hub-sidebar-floating-title">${escapeHtml(item.label || '')}</strong>
      <div class="hub-sidebar-floating-items">
        ${(item.children || []).map(child => renderHubSidebarFloatingItem(child)).join('')}
      </div>
    </div>
  `;
}

function renderHubSidebarGroup(item, nivel = 0) {
  const aberto = grupoMenuAbertoHub(item);
  const floatingAberto = state.sidebar.collapsed && state.sidebar.floatingGroupId === item.id;
  const ativo = itemMenuTemAtivoHub(item);
  const children = item.children || [];
  const toggleClass = nivel > 0
    ? 'hub-sidebar-menu-button hub-sidebar-menu-button--subgroup hub-sidebar-subgroup-toggle'
    : 'hub-sidebar-menu-button hub-sidebar-menu-button--group hub-sidebar-group-toggle';
  const bodyClass = nivel > 0 ? 'hub-sidebar-subitems' : 'hub-sidebar-submenu';

  return `
    <div class="${nivel > 0 ? 'hub-sidebar-subgroup' : 'hub-sidebar-group'} ${floatingAberto ? 'is-floating-open' : ''}">
      <button
        class="${toggleClass} ${ativo ? 'active' : ''}"
        type="button"
        onclick="alternarGrupoSidebarHub('${escapeAttr(item.id)}')"
        aria-expanded="${aberto || floatingAberto ? 'true' : 'false'}"
        title="${escapeAttr(item.label || '')}"
        ${state.sidebar.collapsed ? `data-tooltip="${escapeAttr(item.label || '')}"` : ''}
      >
        ${nivel === 0 ? `<span class="hub-sidebar-icon" aria-hidden="true"><i data-lucide="${obterIconeMenuHub(item)}"></i></span>` : ''}
        <span class="hub-sidebar-label">${escapeHtml(item.label || '')}</span>
        <span class="hub-sidebar-group-caret" aria-hidden="true">${aberto ? 'v' : '>'}</span>
      </button>
      <div class="${bodyClass} ${aberto ? '' : 'is-collapsed'}">
        ${children.map(child => renderHubSidebarItem(child, nivel + 1)).join('')}
      </div>
      ${nivel === 0 ? renderHubSidebarFloatingPanel(item) : ''}
    </div>
  `;
}

function renderHubSidebarItem(item, nivel = 0) {
  if (item.type === 'group') {
    return renderHubSidebarGroup(item, nivel);
  }

  return renderHubSidebarRoute(item, nivel);
}

function normalizarTextoBuscaHub(valor = '') {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function filtrarItensMenuPorBuscaHub(items = [], consulta = '') {
  const termo = normalizarTextoBuscaHub(consulta);
  if (!termo) return items;

  return items.reduce((resultado, item) => {
    const filhos = filtrarItensMenuPorBuscaHub(item.children || [], consulta);
    const corresponde = normalizarTextoBuscaHub(item.label).includes(termo);

    if (corresponde || filhos.length) {
      resultado.push({
        ...item,
        children: corresponde ? (item.children || []) : filhos
      });
    }

    return resultado;
  }, []);
}

function renderHubSidebar() {
  const items = filtrarItensMenuPorBuscaHub(filtrarMenuHub(), state.sidebar.searchQuery);
  const collapsed = state.sidebar.collapsed;

  return `
    <aside id="hub-sidebar" class="hub-sidebar ${collapsed ? 'is-collapsed' : ''}" aria-label="Menu lateral do Hub">
      <div class="hub-sidebar-header">
        <div class="hub-sidebar-search">
          ${collapsed
            ? `<button class="hub-sidebar-search-icon" type="button" onclick="abrirBuscaSidebarHub()" aria-label="Buscar no menu" title="Buscar no menu"><i data-lucide="search" aria-hidden="true"></i></button>`
            : `<input class="hub-sidebar-search-input" type="search" value="${escapeAttr(state.sidebar.searchQuery)}" placeholder="Buscar no menu" aria-label="Buscar no menu" oninput="alterarBuscaSidebarHub(this.value)" autocomplete="off">`}
        </div>
        ${collapsed || sidebarMobileHub() ? '' : `
          <button
            class="hub-sidebar-pin-btn ${state.sidebar.pinned ? 'is-active' : ''}"
            type="button"
            onclick="alternarFixacaoSidebarHub()"
            aria-label="${state.sidebar.pinned ? 'Desafixar menu lateral' : 'Fixar menu lateral'}"
            aria-pressed="${state.sidebar.pinned ? 'true' : 'false'}"
            title="${state.sidebar.pinned ? 'Desafixar menu' : 'Fixar menu'}"
          >
            <i data-lucide="pin" aria-hidden="true"></i>
          </button>
        `}
      </div>
      <nav class="hub-sidebar-nav" aria-label="M&oacute;dulos do Hub">
        ${items.map(item => renderHubSidebarItem(item)).join('')}
      </nav>
    </aside>
  `;
}

function atualizarSidebarHub() {
  const sidebar = document.querySelector('#app > main.hub-layout .hub-sidebar');
  if (!sidebar) return;

  sidebar.outerHTML = renderHubSidebar();
}

function alterarBuscaSidebarHub(valor = '') {
  state.sidebar.searchQuery = valor;
  atualizarSidebarHub();

  window.requestAnimationFrame(() => {
    const campo = document.querySelector('.hub-sidebar-search-input');
    if (!campo) return;
    campo.focus();
    campo.setSelectionRange(campo.value.length, campo.value.length);
  });
}

function abrirBuscaSidebarHub() {
  state.sidebar.collapsed = false;
  state.sidebar.floatingGroupId = '';
  renderizarRotaAtual();

  window.requestAnimationFrame(() => document.querySelector('.hub-sidebar-search-input')?.focus());
}

function alternarMenuSidebarHub() {
  if (sidebarMobileHub() && state.sidebar.pinned) {
    state.sidebar.pinned = false;
    try {
      window.localStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, 'false');
    } catch {
      // A preferência móvel permanece apenas na sessão.
    }
  }

  if (state.sidebar.pinned) {
    state.sidebar.collapsed = false;
    state.sidebar.floatingGroupId = '';
    renderizarRotaAtual();
    return;
  }

  state.sidebar.collapsed = !state.sidebar.collapsed;
  state.sidebar.floatingGroupId = '';

  if (!state.sidebar.collapsed) {
    filtrarMenuHub().forEach(item => {
      if (itemMenuTemAtivoHub(item)) {
        state.sidebar.openGroups[item.id] = true;
      }
    });
  }

  renderizarRotaAtual();
}

function alternarFixacaoSidebarHub() {
  if (sidebarMobileHub()) return;

  state.sidebar.pinned = !state.sidebar.pinned;
  state.sidebar.collapsed = false;
  state.sidebar.floatingGroupId = '';

  try {
    window.localStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, String(state.sidebar.pinned));
  } catch {
    // A preferência permanece apenas na sessão quando o armazenamento não está disponível.
  }

  renderizarRotaAtual();
}

function encontrarIrmaosMenuHub(id, items = filtrarMenuHub()) {
  for (const item of items) {
    if ((item.children || []).some(child => child.id === id)) {
      return item.children || [];
    }

    const irmaos = encontrarIrmaosMenuHub(id, item.children || []);
    if (irmaos) return irmaos;
  }

  return null;
}

function alternarGrupoSidebarHub(id) {
  if (state.sidebar.collapsed) {
    state.sidebar.floatingGroupId = state.sidebar.floatingGroupId === id ? '' : id;
    renderizarRotaAtual();
    return;
  }

  const item = encontrarItemMenuHub(id);
  const proximoAberto = !grupoMenuAbertoHub(item || { id });

  if (proximoAberto) {
    (encontrarIrmaosMenuHub(id) || []).forEach(irmao => {
      if (irmao.type === 'group' && irmao.id !== id) {
        state.sidebar.openGroups[irmao.id] = false;
      }
    });
  }

  state.sidebar.openGroups[id] = proximoAberto;
  renderizarRotaAtual();
}

function fecharPainelFlutuanteSidebarHub() {
  if (!state.sidebar.floatingGroupId) return;

  state.sidebar.floatingGroupId = '';
  renderizarRotaAtual();
}

let tooltipGlobalElemento = null;
let tooltipGlobalAlvo = null;

function esconderTooltipGlobal() {
  tooltipGlobalAlvo = null;
  tooltipGlobalElemento?.classList.remove('is-visible');
}

function posicionarTooltipGlobal() {
  if (!tooltipGlobalElemento || !tooltipGlobalAlvo?.isConnected) {
    esconderTooltipGlobal();
    return;
  }

  const alvo = tooltipGlobalAlvo;
  const tooltip = tooltipGlobalElemento;
  const margem = 10;
  const limite = 8;
  const viewportLargura = document.documentElement.clientWidth;
  const viewportAltura = document.documentElement.clientHeight;
  const rect = alvo.getBoundingClientRect();
  const largura = tooltip.offsetWidth;
  const altura = tooltip.offsetHeight;

  let left;
  if (viewportLargura - rect.right >= largura + margem + limite) {
    left = rect.right + margem;
  } else if (rect.left >= largura + margem + limite) {
    left = rect.left - largura - margem;
  } else {
    left = Math.max(limite, Math.min(rect.left, viewportLargura - largura - limite));
  }

  let top = rect.top + (rect.height - altura) / 2;
  if (top < limite) {
    top = rect.bottom + margem;
  } else if (top + altura > viewportAltura - limite) {
    top = rect.top - altura - margem;
  }

  top = Math.max(limite, Math.min(top, viewportAltura - altura - limite));
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function mostrarTooltipGlobal(alvo) {
  if (alvo?.closest?.('.hub-sidebar:not(.is-collapsed)')) {
    esconderTooltipGlobal();
    return;
  }

  const texto = alvo?.getAttribute?.('data-tooltip')?.trim();
  if (!texto) return;

  if (!tooltipGlobalElemento) {
    tooltipGlobalElemento = document.createElement('div');
    tooltipGlobalElemento.className = 'hub-global-tooltip';
    tooltipGlobalElemento.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltipGlobalElemento);
  }

  tooltipGlobalAlvo = alvo;
  tooltipGlobalElemento.textContent = texto;
  tooltipGlobalElemento.classList.add('is-visible');
  posicionarTooltipGlobal();
}

function obterAlvoTooltipGlobal(event) {
  return event.target?.closest?.('[data-tooltip]');
}

function iniciarTooltipVisualGlobal() {
  document.addEventListener('pointerover', event => {
    const alvo = obterAlvoTooltipGlobal(event);
    if (!alvo || (event.relatedTarget && alvo.contains(event.relatedTarget))) return;
    mostrarTooltipGlobal(alvo);
  });

  document.addEventListener('pointerout', event => {
    const alvo = obterAlvoTooltipGlobal(event);
    if (!alvo || (event.relatedTarget && alvo.contains(event.relatedTarget))) return;
    if (alvo === tooltipGlobalAlvo) esconderTooltipGlobal();
  });

  document.addEventListener('focusin', event => {
    const alvo = obterAlvoTooltipGlobal(event);
    if (alvo) mostrarTooltipGlobal(alvo);
  });

  document.addEventListener('focusout', event => {
    if (event.target === tooltipGlobalAlvo) esconderTooltipGlobal();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') esconderTooltipGlobal();
  });

  window.addEventListener('resize', posicionarTooltipGlobal);
  window.addEventListener('scroll', posicionarTooltipGlobal, true);
}

function normalizarTooltipsGlobais(root = document) {
  const elementos = [
    ...(root.matches?.('[title]') ? [root] : []),
    ...(root.querySelectorAll?.('[title]') || [])
  ];

  elementos.forEach(elemento => {
    const texto = elemento.getAttribute('title')?.trim();
    if (!texto) return;

    if (!elemento.hasAttribute('data-tooltip')) {
      elemento.setAttribute('data-tooltip', texto);
    }

    elemento.removeAttribute('title');
  });
}

function aplicarIconesLucideHub(root = document) {
  if (!root) return;
  aplicarIconesDataHub(root);
  createIcons({
    icons: HUB_LUCIDE_ICONS,
    root,
    attrs: {
      'stroke-width': 1.9
    }
  });
}

function aplicarIconesDataHub(root = document) {
  const campos = [
    ...(root.matches?.('input[type="date"]') ? [root] : []),
    ...(root.querySelectorAll?.('input[type="date"]') || [])
  ];

  campos.forEach(campo => {
    if (campo.closest('.hub-date-input')) return;

    const wrapper = document.createElement('span');
    wrapper.className = 'hub-date-input';
    campo.parentNode?.insertBefore(wrapper, campo);
    wrapper.appendChild(campo);

    const icone = document.createElement('i');
    icone.setAttribute('data-lucide', 'calendar');
    icone.setAttribute('aria-hidden', 'true');
    wrapper.insertBefore(icone, campo);
  });
}

function iniciarIconesLucideHub() {
  aplicarIconesLucideHub();

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          aplicarIconesLucideHub(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function iniciarTooltipsGlobais() {
  normalizarTooltipsGlobais();
  iniciarTooltipVisualGlobal();

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          normalizarTooltipsGlobais(node);
        }
      });

      if (mutation.type === 'attributes' && mutation.target instanceof Element) {
        normalizarTooltipsGlobais(mutation.target.parentElement || document);
      }
    });
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['title'],
    childList: true,
    subtree: true
  });
}

function fecharMenusAoClicarForaHub(event) {
  const alvo = event.target;
  const dentroDoSidebar = alvo?.closest?.('.hub-sidebar');
  const acionadorDoSidebar = alvo?.closest?.('.hub-mobile-menu-toggle');

  if (!state.sidebar.collapsed && !state.sidebar.pinned && !dentroDoSidebar && !acionadorDoSidebar) {
    state.sidebar.collapsed = true;
    state.sidebar.floatingGroupId = '';
    renderizarRotaAtual();
  }

  document.querySelectorAll('details.fin-section-more[open]').forEach(menu => {
    if (!menu.contains(alvo)) menu.open = false;
  });
}

function navegarMenuSidebarHub(caminho) {
  state.sidebar.floatingGroupId = '';
  if (sidebarMobileHub()) {
    state.sidebar.collapsed = true;
  }
  navegarParaRota(caminho);
}

function renderHubShell({ tituloPagina, descricaoPagina, conteudo, classeConteudo = '' }) {
  return `
    <main class="dashboard hub-layout ${state.sidebar.collapsed ? 'is-sidebar-collapsed' : ''} ${state.sidebar.pinned ? 'is-sidebar-pinned' : ''}">
      ${renderHubTopbar()}
      <div class="hub-shell">
        ${renderHubSidebar()}
        <section class="hub-page-content ${escapeAttr(classeConteudo)}">
          ${renderHubBreadcrumb()}

          ${conteudo}
        </section>
      </div>
    </main>
  `;
}

function atualizarLayoutHubEspecial() {
  const main = document.querySelector('#app > main.hub-layout');
  const topbar = main?.querySelector(':scope > .topbar');
  const shell = main?.querySelector(':scope > .hub-shell');
  const sidebar = shell?.querySelector(':scope > .hub-sidebar');

  if (!main || !topbar || !shell || !sidebar) return false;

  main.classList.remove('is-sidebar-collapsed', 'is-sidebar-pinned');
  const classes = `${state.sidebar.collapsed ? 'is-sidebar-collapsed' : ''} ${state.sidebar.pinned ? 'is-sidebar-pinned' : ''}`.trim();
  classes.split(/\s+/).filter(Boolean).forEach(classe => main.classList.add(classe));

  topbar.outerHTML = renderHubTopbar();
  sidebar.outerHTML = renderHubSidebar();
  return true;
}

const renderDashboardHubPhase1 = function() {
  document.getElementById('app').innerHTML = renderHubShell({
    tituloPagina: 'Inicio',
    descricaoPagina: 'Visao consolidada do Hub com atalhos, comunicados e acesso aos modulos operacionais.',
    conteudo: `
      <section class="info-grid">
        <div class="info-card">
          <div class="info-card-header">
            <span class="info-icon">📢</span>
            <h2>Avisos internos</h2>
          </div>
          ${renderAvisos()}
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <span class="info-icon">🎂</span>
            <h2>Aniversariantes</h2>
          </div>
          ${renderAniversariantes()}
        </div>
      </section>

      <section class="quick-links-strip">
        <div class="quick-links-title">
          <span>★</span>
          <strong>Links rápidos</strong>
        </div>

        <div class="quick-links-list">
          ${renderFavoritos()}
        </div>
      </section>

      <div class="section-title">
        <h2>Módulos ${renderBotaoConfigurarModulosHome()}</h2>
        <p>Acesse as principais áreas operacionais do painel.</p>
      </div>

      <section class="module-grid">
        ${state.cards.map(card => `
          <article class="module-card" role="button" tabindex="0" onclick="abrirModulo('${escapeAttr(card.id)}')" onkeydown="acionarCardModulo(event, '${escapeAttr(card.id)}')">
            <div class="module-card-top">
              <h3>${escapeHtml(card.titulo)}</h3>
              <span class="module-card-arrow" aria-hidden="true">›</span>
            </div>
          </article>
        `).join('')}
      </section>

      ${renderModalConfigurarModulosHome()}
    `
  });
};

const renderizarRotaAtualHubPhase2 = async function() {
  const rotaRelativa = obterRotaRelativaAtualHub().split('#')[0].replace(/^\/+|\/+$/g, '');

  if (rotaRelativa === 'notificacoes') {
    await renderizarPaginaNotificacoesHub();
    return;
  }

  if (rotaRelativa === 'perfil') {
    const app = document.getElementById('app');
    const perfilAberto = app?.querySelector(':scope > main.hub-profile-page');

    if (perfilAberto && typeof window.hubAtualizarLayoutEspecial === 'function') {
      window.hubAtualizarLayoutEspecial();
      return;
    }

    await window.hubRenderizarPerfil?.();
    return;
  }

  const idModulo = normalizarIdModuloRota(obterModuloDaRotaAtual());

  if (idModulo === 'sidebar-teste') {
    atualizarHashHub('', { replace: true });
    await navegarHome();
    return;
  }

  sincronizarContextoHubPelaRota();

  if (!idModulo) {
    renderDashboard();
    return;
  }

  if (idModulo === 'configuracoes-corretora') {
    const app = document.getElementById('app');
    const paginaCorretoraRenderizada = app.dataset.companySettingsPage === 'true'
      && Boolean(app.querySelector(':scope > main.company-settings-page'));

    if (paginaCorretoraRenderizada && typeof window.hubAtualizarLayoutEspecial === 'function') {
      window.hubAtualizarLayoutEspecial();
      return;
    }

    if (!paginaCorretoraRenderizada) {
      app.dataset.companySettingsPage = 'loading';
      app.innerHTML = renderHubShell({
        tituloPagina: 'Configurações da Corretora',
        descricaoPagina: 'Carregando dados e validando seu acesso.',
        conteudo: `
          <section class="admin-panel" aria-busy="true" aria-live="polite">
            <div class="admin-panel-header">
              <div>
                <h2>Carregando configurações</h2>
                <p>Aguarde enquanto os dados da corretora são carregados.</p>
              </div>
            </div>
            ${renderHubLoading('Carregando configurações da corretora...')}
          </section>
        `
      });
    }

    await window.hubRenderizarPaginaCorretora?.();
    return;
  }

  await abrirModuloDireto(idModulo);
};

const navegarParaModuloHubPhase2 = function(idModulo, hash = '') {
  const caminho = montarCaminhoHub(idModulo);
  const url = new URL(window.location.href);
  url.pathname = caminho;
  url.hash = normalizarHashHub(hash) ? `#${normalizarHashHub(hash)}` : '';

  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== `${url.pathname}${url.search}${url.hash}`) {
    window.history.pushState({}, '', url);
  }

  return renderizarRotaAtual();
};

const renderModuloIndisponivelHubPhase1 = function(idModulo) {
  document.getElementById('app').innerHTML = renderHubShell({
    tituloPagina: 'Modulo indisponivel',
    descricaoPagina: 'A rota existe, mas o modulo esta inativo ou seu perfil nao possui acesso liberado.',
    conteudo: `
      <section class="admin-panel">
        <div class="admin-panel-header">
          <div>
            <h2>Módulo indisponível</h2>
            <p>Este módulo está inativo, indisponível ou seu usuário não possui acesso.</p>
          </div>
        </div>

        <p class="quick-link-empty">Rota solicitada: ${escapeHtml(idModulo || '-')}</p>
        <button class="save-btn" type="button" onclick="navegarHome()">Voltar para a Home</button>
      </section>
    `
  });
};

const renderAdministracaoHubPhase1 = function() {
  document.getElementById('app').innerHTML = renderHubShell({
    tituloPagina: 'Administracao',
    descricaoPagina: 'Configuracoes, cadastros e governanca do Hub em uma estrutura mais consistente com o restante do sistema.',
    conteudo: `
      <section class="admin-shell admin-shell-single">
        ${renderAdminPanel()}
      </section>
    `
  });
};

const renderLinksUteisHubPhase1 = function() {
  const gestor = state.usuario?.perfil === 'gestor';

  document.getElementById('app').innerHTML = renderHubShell({
    tituloPagina: state.links.titulo || 'Links Uteis',
    descricaoPagina: gestor ? 'Listagem e cadastro de links operacionais por escopo.' : 'Consulte os links disponiveis para seu perfil.',
    conteudo: `
      <section class="admin-panel">
        <div class="admin-panel-header">
          <div>
            <h2>${escapeHtml(state.links.titulo || 'Links Úteis')}</h2>
            <p>${gestor ? 'Listagem e cadastro de links.' : 'Consulte os links disponíveis.'}</p>
          </div>
        </div>

        <div class="links-toolbar">
          <select class="config-input" onchange="alterarFiltroLinks('categoria', this.value)">
            <option value="">Todas as categorias</option>
            ${state.links.categorias.map(item => `<option value="${escapeAttr(item.nome)}" ${state.links.filtros.categoria === item.nome ? 'selected' : ''}>${escapeHtml(item.nome)}</option>`).join('')}
          </select>

          <select class="config-input" onchange="alterarFiltroLinks('grupo', this.value)">
            <option value="">Todos os grupos</option>
            ${state.links.grupos.map(item => `<option value="${escapeAttr(item.nome)}" ${state.links.filtros.grupo === item.nome ? 'selected' : ''}>${escapeHtml(item.nome)}</option>`).join('')}
          </select>

          ${gestor ? `
            <select class="config-input" onchange="alterarFiltroLinks('status', this.value)">
              <option value="">Todos os status</option>
              <option value="ativo" ${state.links.filtros.status === 'ativo' ? 'selected' : ''}>ativos</option>
              <option value="inativo" ${state.links.filtros.status === 'inativo' ? 'selected' : ''}>inativos</option>
            </select>
            <button class="add-small-btn" type="button" onclick="abrirModalNovoLink()">+ Adicionar</button>
          ` : ''}
        </div>

        <p class="quick-link-empty">Favoritos: ${contarFavoritosLinks()} de ${state.links.limiteFavoritos}</p>
        ${state.links.message ? `<p class="admin-message">${escapeHtml(state.links.message)}</p>` : ''}
        ${state.links.loading ? renderHubLoading('Carregando links...') : renderListaLinksUteis(gestor)}
        ${renderModalNovoLink()}
      </section>
    `
  });
};

const renderCentralSenhasHubPhase1 = function() {
  const podeGerenciar = pode('central_senhas', 'create') || pode('central_senhas', 'update') || pode('central_senhas', 'delete');
  const podeVerSenha = pode('central_senhas', 'view_secret');

  document.getElementById('app').innerHTML = renderHubShell({
    tituloPagina: 'Central de Senhas',
    descricaoPagina: podeGerenciar ? 'Gestao de acessos e historico operacional.' : 'Consulta dos acessos liberados ao seu perfil.',
    conteudo: `
      <section class="admin-panel">
        <div class="admin-panel-header">
          <div>
            <h2>Central de Senhas</h2>
            <p>${podeGerenciar ? 'Listagem e cadastro de acessos.' : 'Consulte os acessos disponíveis.'}</p>
          </div>
          ${podeGerenciar ? `
            <div class="module-tabs" role="group" aria-label="Visualização da Central de Senhas">
              <button class="${state.passwords.aba === 'acessos' ? 'active' : ''}" type="button" onclick="selecionarAbaSenhas('acessos')">Acessos</button>
              <button class="${state.passwords.aba === 'historico' ? 'active' : ''}" type="button" onclick="selecionarAbaSenhas('historico')">Histórico</button>
            </div>
          ` : ''}
        </div>

        ${renderResumoSenhas(podeGerenciar)}
        ${state.passwords.aba === 'acessos' ? renderToolbarSenhas(podeGerenciar) : ''}

        ${state.passwords.message ? `<p class="admin-message">${escapeHtml(state.passwords.message)}</p>` : ''}
        ${state.passwords.loading ? renderHubLoading('Carregando acessos...') : renderConteudoSenhas(podeGerenciar, podeVerSenha)}
        ${state.passwords.aba === 'acessos' ? renderModalSenha() : ''}
      </section>
    `
  });
};

const renderPainelArHubPhase1 = function() {
  fecharMenuMaisAr();
  const podeHistorico = podeAcessarAbaAr('historico');
  const podeGerenciarParceiros = pode('admin', 'view') && pode('admin.parceiros_indicacao', 'view');

  document.getElementById('app').innerHTML = renderHubShell({
    tituloPagina: 'Painel AR',
    descricaoPagina: 'Produtos, parceiros, geracao de links e validacoes em uma navegacao mais consistente com o Hub.',
    conteudo: `
      <section class="admin-panel">
        <div class="admin-panel-header ar-panel-header">
          <div class="ar-panel-title">
            <button type="button" onclick="selecionarAbaAr('inicio')" title="Ir para o início do Painel AR">
              <h2>Painel AR Transmares</h2>
            </button>
            <p>Consulte produtos, selecione o parceiro e gere links comerciais.</p>
          </div>
          <div class="ar-panel-actions">
            ${renderMenuPrincipalAr({ podeHistorico, incluirCrm: true, incluirCrm2: true })}
            ${podeGerenciarParceiros ? `<button class="secondary-btn ar-manage-partners-btn" type="button" onclick="navegarParaModulo('administracao', 'parceiros-indicacao')">Gerenciar parceiros</button>` : ''}
          </div>
        </div>

        ${state.ar.message ? `<p class="admin-message">${escapeHtml(state.ar.message)}</p>` : ''}
    ${state.ar.loading ? renderHubLoading('Carregando produtos e parceiros...') : renderConteudoAr()}
      </section>
    `
  });
};

const selecionarAbaAdminHubPhase2 = async function(aba) {
  if (!podeAcessarAbaAdmin(aba)) {
    state.admin.message = 'Seu usuário não possui acesso a esta área.';
    renderAdministracao();
    return;
  }

  atualizarRotaAdminHub(aba, { replace: true });
  resetarFluxoModalUsuarioAdmin(false);
  state.admin.aba = aba;
  state.admin.message = '';

  if (aba === 'categorias' || aba === 'grupos') {
    await carregarRegistrosAdmin(aba);
    return;
  }

  if (aba === 'parceiros-indicacao') {
    await carregarParceirosIndicacaoAdmin();
    return;
  }

  if (aba === 'usuarios') {
    await carregarUsuariosAdmin();
    return;
  }

  if (aba === 'perfis') {
    await carregarPerfisAdmin();
    return;
  }

  if (aba === 'logs-integracoes') {
    await carregarLogsIntegracoesAdmin();
    return;
  }

  renderAdministracao();
};

const selecionarAbaSenhasHubPhase2 = function(aba) {
  if (aba === 'historico' && !(pode('central_senhas', 'create') || pode('central_senhas', 'update') || pode('central_senhas', 'delete'))) {
    state.passwords.message = 'Seu usuário não possui acesso ao histórico.';
    renderCentralSenhas();
    return;
  }

  atualizarHashHub(aba, { replace: true });
  state.passwords.aba = aba;
  state.passwords.modalAberto = false;
  renderCentralSenhas();
};

const selecionarAbaArHubPhase2 = function(aba) {
  if (!podeAcessarAbaAr(aba)) {
    state.ar.message = 'Seu usuário não possui acesso a esta área do Painel AR.';
    renderPainelAr();
    return;
  }

  if (state.ar.aba === 'gerar' && aba !== 'gerar') {
    resetarEstadoGerarLinksAr();
  }

  if (aba === 'crm2') {
    const caminho = `${montarCaminhoHub('painel-ar').replace(/\/+$/g, '')}/200`;
    const url = new URL(window.location.href);
    url.pathname = caminho;
    url.hash = '';
    window.history.pushState({}, '', url);
    state.ar.aba = 'crm2';
    state.ar.crm2.mensagem = '';
    renderPainelAr();
    return;
  }

  const hash = aba === 'validacoes'
    ? `validacoes/${state.ar.validacoes.aba || 'consultar'}`
    : aba;

  atualizarHashHub(hash, { replace: true });
  state.ar.aba = aba;
  renderPainelAr();

  if (aba === 'validacoes' && !state.ar.validacoes.loading) {
    carregarValidacoesAr();
  }

  if (aba === 'crm' && !state.ar.crm.loading && !state.ar.crm.carregado) {
    carregarCrmAr();
  }
};

const selecionarSubabaValidacoesArHubPhase2 = function(aba) {
  if (aba === 'emitir' && !pode('painel_ar.validacoes', 'emitir_recibo')) {
    state.ar.validacoes.message = 'Seu usuário não possui permissão para emitir recibos.';
    renderPainelAr();
    return;
  }

  if (aba === 'importacao' && !pode('painel_ar.validacoes', 'importar')) {
    state.ar.validacoes.message = 'Seu usuário não possui permissão para importar repasses.';
    renderPainelAr();
    return;
  }

  atualizarHashHub(`validacoes/${aba}`, { replace: true });
  state.ar.aba = 'validacoes';
  state.ar.validacoes.aba = aba;
  state.ar.validacoes.message = '';
  renderPainelAr();

  if (!state.ar.validacoes.loading && (aba === 'emitir' || aba === 'consultar')) {
    carregarValidacoesAr();
  }
};

const abrirAdministracaoHubPhase2 = async function(preservarMensagem = false) {
  sincronizarContextoAdminPelaRota();
  return abrirAdministracaoOriginal(preservarMensagem);
};

const abrirCentralSenhasHubPhase2 = async function() {
  sincronizarContextoSenhasPelaRota();
  return abrirCentralSenhasOriginal();
};

const abrirPainelArHubPhase2 = async function() {
  const contextoRota = obterContextoRotaHub();
  sincronizarContextoArPelaRota();
  const abaDaRota = contextoRota.modulo === 'painel-ar'
    && ['inicio', 'gerar', 'produtos', 'validacoes', 'historico', 'crm', 'crm2', 'crm2-pf'].includes(contextoRota.principal)
    ? state.ar.aba
    : 'inicio';

  resetarEstadoGerarLinksAr();
  state.ar.aba = abaDaRota;
  await carregarPainelAr();

  if (state.ar.aba === 'crm' && !state.ar.crm.carregado) {
    await carregarCrmAr();
  }
};

const abrirAdministracaoOriginal = abrirAdministracao;
const abrirCentralSenhasOriginal = abrirCentralSenhas;
const abrirPainelArOriginal = abrirPainelAr;

renderDashboard = renderDashboardHubPhase1;
renderModuloIndisponivel = renderModuloIndisponivelHubPhase1;
renderAdministracao = renderAdministracaoHubPhase1;
renderLinksUteis = renderLinksUteisHubPhase1;
renderCentralSenhas = renderCentralSenhasHubPhase1;
renderPainelAr = renderPainelArHubPhase1;
renderizarRotaAtual = renderizarRotaAtualHubPhase2;
navegarParaModulo = navegarParaModuloHubPhase2;
selecionarAbaAdmin = selecionarAbaAdminHubPhase2;
selecionarAbaSenhas = selecionarAbaSenhasHubPhase2;
selecionarAbaAr = selecionarAbaArHubPhase2;
selecionarSubabaValidacoesAr = selecionarSubabaValidacoesArHubPhase2;
abrirAdministracao = abrirAdministracaoHubPhase2;
abrirCentralSenhas = abrirCentralSenhasHubPhase2;
abrirPainelAr = abrirPainelArHubPhase2;

function escapeHtml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(texto) {
  return escapeHtml(texto).replace(/`/g, '&#096;');
}

function obterMensagemApi(response, fallback) {
  const code = response?.error?.code;
  const mensagens = {
    USER_EMAIL_NOT_AVAILABLE: 'Não foi possível identificar sua Conta Google.',
    USER_NOT_REGISTERED: 'Seu usuário não está cadastrado no painel.',
    USER_INACTIVE: 'Seu usuário está inativo.',
    GESTOR_REQUIRED: 'Acesso permitido apenas para gestor.',
    INVALID_SHEET_HEADERS: 'A planilha está com cabeçalhos obrigatórios ausentes.',
    ACTION_NOT_FOUND: 'Ação não reconhecida pela API publicada.',
    CONFIG_NOT_ALLOWED: 'Esta configuração não pode ser alterada manualmente.',
    INVALID_RECORD: 'Informe os dados obrigatórios.',
    INVALID_STATUS: 'Status inválido.',
    INVALID_LINK: 'Informe os dados obrigatórios do link.',
    INVALID_URL: 'Informe uma URL começando com http:// ou https://.',
    FAVORITE_LIMIT_REACHED: 'Limite de favoritos atingido.',
    LINK_NOT_FOUND: 'Link não encontrado.',
    INVALID_PASSWORD_ITEM: 'Informe o título do acesso.',
    INVALID_LOGIN: 'Informe o usuário/login.',
    INVALID_PASSWORD: 'Informe a senha.',
    AR_PRODUCT_REQUIRED: 'Selecione um produto válido.',
    AR_PARTNER_REQUIRED: 'Selecione um parceiro válido.',
    AR_PRODUCT_WITHOUT_ID: 'Produto sem Product ID. O link não será gerado.',
    AR_PARTNER_WITHOUT_CODE: 'Parceiro sem código revendedor. O link não será gerado.',
    AR_PARTNER_INACTIVE: 'Parceiro inativo. O link não será gerado.',
    AR_TEMPLATE_MISSING: 'Templates de link AR não configurados.'
  };

  return mensagens[code] || response?.message || response?.error?.message || fallback;
}


// Funções usadas por handlers inline gerados pelo template do painel.
Object.assign(window, {
  hubRenderizarTopbarPadrao: renderHubTopbar,
  hubRenderizarSidebarPadrao: renderHubSidebar,
  hubRenderLoading: renderHubLoading,
  navegarLogoParaHomeHub,
  hubAtualizarLayoutEspecial: atualizarLayoutHubEspecial,
  hubObterClassesLayoutPadrao: () => `${state.sidebar.collapsed ? 'is-sidebar-collapsed' : ''} ${state.sidebar.pinned ? 'is-sidebar-pinned' : ''}`.trim(),
  hubPodeVerConfiguracoes: () => pode('admin', 'view') || pode('admin.modulos', 'view'),
  hubAtualizarContextoAcesso: atualizarContextoAcessoHub,
  iniciarApp,
  abrirLink,
  abrirModalNovoLink,
  abrirModalNovoRegistro,
  abrirModalParceiroIndicacaoAdmin,
  abrirModalUsuarioAdmin,
  abrirModalSenha,
  abrirModulo,
  abrirModalConfigurarModulosHome,
  abrirPermissoesPeloModalUsuario,
  abrirPermissoesUsuarioAdmin,
  abrirPermissoesPerfilAdmin,
  avancarPermissoesNovoPerfilAdmin,
  fecharPermissoesPerfilAdmin,
  fecharModalConfigurarModulosHome,
  alternarModuloPermissoesPerfil,
  alternarCheckboxPermissaoPerfil,
  aplicarLoteModuloPermissoesPerfil,
  acionarCardAr,
  acionarCardModulo,
  alterarBuscaAr,
  alterarBuscaUsuariosAdmin,
  alterarBuscaPerfisAdmin,
  alterarBuscaParceirosIndicacaoAdmin,
  aplicarMascaraParceiroIndicacao,
  alternarMenuAcoesParceirosIndicacaoAdmin,
  alternarParceiroIndicacaoSelecionadoAdmin,
  alterarStatusModuloHome,
  alterarVisibilidadeModuloHome,
  alternarColunaParceirosIndicacaoAdmin,
  alternarSeletorColunasParceirosIndicacaoAdmin,
  alternarTodosParceirosIndicacaoAdmin,
  cancelarColunasParceirosIndicacaoAdmin,
  cancelarLoteParceirosIndicacaoAdmin,
  selecionarFiltroPerfisAdmin,
  selecionarFiltroParceirosIndicacaoAdmin,
  selecionarFiltroModulosHome,
  selecionarPaginaPerfisAdmin,
  selecionarPaginaParceirosIndicacaoAdmin,
  alternarTodosModulosPermissoesPerfil,
  aplicarLoteGlobalPermissoesPerfil,
  salvarPermissoesPerfilAdmin,
  alterarFiltroListaProdutosAr,
  alternarFiltroGrupoListaProdutosAr,
  alterarRascunhoProdutoGrupoAr,
  executarAcaoParceirosIndicacaoAdmin,
  alterarBuscaParceiroAr,
  alterarBuscaProdutoAr,
  alterarFiltroLinks,
  alterarFiltroValidacoesAr,
  alterarFiltroProdutoAr,
  alterarFiltroSenha,
  alternarFiltrosListaProdutosAr,
  aplicarBuscaParceirosIndicacaoAdmin,
  navegarMenuAcoesParceirosIndicacaoAdmin,
  navegarMenuSidebarHub,
  alternarFavoritoLink,
  alternarGrupoSidebarHub,
  alternarFixacaoSidebarHub,
  alternarMenuSidebarHub,
  alterarBuscaSidebarHub,
  abrirBuscaSidebarHub,
  alternarStatusModuloAdmin,
  alternarTodasValidacoesVisiveisAr,
  alternarValidacaoSelecionadaAr,
  alternarProdutoListaSelecionadoAr,
  alternarTema,
  alternarTodosGruposProdutosAr,
  abrirVisualizacaoProdutosClienteAr,
  alternarCheckboxPermissaoUsuario,
  alternarTodosModulosPermissoesUsuario,
  arquivarParceiroIndicacaoAdmin,
  cancelarReciboValidacoesAr,
  carregarValidacoesAr,
  alterarMesBaseRepasseAr,
  copiarLink,
  copiarLinkResultadoAr,
  copiarOrcamentoAr,
  copiarSenhaTemporariaUsuarioAdmin,
  copiarVisualizacaoProdutosClienteAr,
  criarLancamentoManualValidacoesAr,
  editarLinkItem,
  editarParceiroIndicacaoAdmin,
  editarPerfilAdmin,
  excluirPerfilAdmin,
  editarRegistroAdmin,
  editarUsuarioAdmin,
  emitirReciboValidacoesAr,
  excluirMesBaseRepasseAr,
  excluirSenhaItem,
  fecharVisualizacaoProdutosClienteAr,
  fecharModalNovoLink,
  fecharModalNovoRegistro,
  fecharModalParceiroIndicacaoAdmin,
  fecharModalSenha,
  fecharPermissoesUsuarioAdmin,
  fecharReciboValidacoesAr,
  filtrarAdmin,
  entrarNoHub,
  iniciarEdicaoGrupoProdutosAr,
  gerarSenhaTemporariaUsuarioAdmin,
  gerarLinksAr,
  importarRepasseValidacoesAr,
  limparImportacaoRepasseAr,
  limparFiltrosListaProdutosAr,
  limparSelecaoValidacoesAr,
  limparProdutosListaSelecionadosAr,
  cancelarEdicaoGrupoProdutosAr,
  executarLoteArquivarParceirosIndicacaoAdmin,
  executarLoteStatusParceirosIndicacaoAdmin,
  navegarHome,
  navegarParaModulo,
  navegarParaRota,
  processarArquivoRepasseAr,
  renderDashboard,
  restaurarCoresPadrao,
  restaurarColunasParceirosIndicacaoAdmin,
  moverColunaParceirosIndicacaoAdmin,
  sair,
  salvarConfigAdmin,
  salvarConfigModulosHome,
  salvarLinkItem,
  salvarParceiroIndicacaoAdmin,
  salvarRascunhoColunasParceirosIndicacaoAdmin,
  salvarPermissoesUsuarioAdmin,
  salvarPerfilAdmin,
  salvarEdicaoGrupoProdutosAr,
  salvarNovoPerfilComPermissoesAdmin,
  salvarRegistroAdmin,
  salvarSenhaItem,
  salvarUsuarioAdmin,
  carregarLogsIntegracoesAdmin,
  alterarFiltroLogsIntegracoesAdmin,
  abrirDropdownLogsAdmin,
  selecionarDropdownLogsAdmin,
  selecionarPaginaLogsIntegracoesAdmin,
  abrirDetalheLogIntegracaoAdmin,
  fecharDetalheLogIntegracaoAdmin,
  abrirCadastroClienteCrmAr,
  aplicarFiltrosCrmAr,
  cancelarCadastroClienteCrmAr,
  limparFiltrosCrmAr,
  atualizarFiltroCrmAr,
  salvarCadastroClienteCrmAr,
  selecionarFiltroUsuariosAdmin,
  selecionarPaginaUsuariosAdmin,
  selecionarAbaAdmin,
  selecionarAbaAr,
  selecionarPaginaCrmAr,
  sincronizarCrmAr,
  sincronizarCadastroCrmAr,
  abrirPedidosRelacionadosCrmAr,
  fecharPedidosRelacionadosCrmAr,
  criarComentarioDetalheCrmAr,
  aoDigitarComentarioCrmAr,
  selecionarMencaoComentarioCrmAr,
  formatarTextoComentarioCrmAr,
  acionarAtalhoComentarioCrmAr,
  iniciarRedimensionamentoComentarioCrmAr,
  responderComentarioDetalheCrmAr,
  enviarRespostaComentarioCrmAr,
  reenviarComentarioPendenteCrmAr,
  cancelarRespostaComentarioCrmAr,
  alternarMenuReacoesCrmAr,
  alternarReacaoComentarioCrmAr,
  editarComentarioDetalheCrmAr,
  excluirComentarioDetalheCrmAr,
  adicionarAnexoDetalheCrmAr,
  editarCamposCrmAr,
  marcarAlteracaoCamposCrmAr,
  avancarStatusCrmAr,
  abrirDropdownCrmAr,
  filtrarDropdownCrmAr,
  selecionarDropdownCrmAr,
  cancelarEdicaoCamposCrmAr,
  salvarCamposCrmAr,
  visualizarCrmAr,
  fecharVisualizacaoCrmAr,
  selecionarAbaSenhas,
  selecionarSubabaValidacoesAr,
  selecionarParceiroAr,
  selecionarProdutoAr,
  selecionarProdutoCompletoAr,
  selecionarSugestaoProdutoAr,
  alternarModuloPermissoesUsuario,
  aplicarLoteGlobalPermissoesUsuario,
  aplicarLoteModuloPermissoesUsuario,
  visualizarParceiroIndicacaoAdmin,
  voltarEtapaModalUsuarioAdmin,
  voltarEtapaModalPerfilAdmin,
  visualizarReciboValidacoesAr
});

document.addEventListener('pointerdown', event => {
  if (!state.admin.acoesParceirosAberto) return;
  if (event.target?.closest?.('.admin-partners-actions-btn, .admin-partners-actions-menu')) return;

  fecharMenuAcoesParceirosIndicacaoAdmin();
}, true);

document.addEventListener('click', event => {
  if (!state.sidebar.floatingGroupId) return;
  if (event.target?.closest?.('.hub-sidebar')) return;

  fecharPainelFlutuanteSidebarHub();
}, true);

document.addEventListener('click', fecharMenusAoClicarForaHub);

function focarModalParceiroIndicacaoAdmin() {
  window.requestAnimationFrame(() => {
    const modal = document.querySelector('[data-partner-modal]');
    modal?.querySelector('.partner-modal-tab, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')?.focus();
  });
}

function obterElementosFocaveisModalParceiro(modal) {
  return Array.from(modal?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') || [])
    .filter(item => item.offsetParent !== null);
}

document.addEventListener('click', event => {
  const tab = event.target?.closest?.('[data-partner-tab]');
  if (!tab) return;

  const modal = tab.closest('.partner-modal');
  if (!modal) return;

  const aba = tab.dataset.partnerTab || '';
  modal.querySelectorAll('[data-partner-tab]').forEach(item => {
    const ativo = item === tab;
    item.classList.toggle('is-active', ativo);
    item.setAttribute('aria-selected', ativo ? 'true' : 'false');
  });
  modal.querySelectorAll('[data-partner-tab-panel]').forEach(panel => {
    panel.hidden = panel.dataset.partnerTabPanel !== aba;
  });
  if (state.admin.parceiroModal?.aberto) {
    state.admin.parceiroModal.aba = aba;
  }
});

document.addEventListener('keydown', event => {
  if (!state.admin.acoesParceirosAberto || event.key !== 'Escape') return;

  event.preventDefault();
  fecharMenuAcoesParceirosIndicacaoAdmin();
});

document.addEventListener('keydown', event => {
  const modal = document.querySelector('[data-partner-modal]');
  if (!modal) return;

  const tab = event.target?.closest?.('[data-partner-tab]');
  if (tab && ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    const tabs = Array.from(modal.querySelectorAll('[data-partner-tab]'));
    const indice = tabs.indexOf(tab);
    let proximo = indice;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') proximo = (indice + 1) % tabs.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') proximo = (indice - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') proximo = 0;
    if (event.key === 'End') proximo = tabs.length - 1;
    event.preventDefault();
    tabs[proximo]?.focus();
    tabs[proximo]?.click();
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    fecharModalParceiroIndicacaoAdmin();
    return;
  }

  if (event.key !== 'Tab') return;

  const focaveis = obterElementosFocaveisModalParceiro(modal);
  if (!focaveis.length) {
    event.preventDefault();
    modal.focus();
    return;
  }

  const primeiro = focaveis[0];
  const ultimo = focaveis[focaveis.length - 1];
  if (event.shiftKey && document.activeElement === primeiro) {
    event.preventDefault();
    ultimo.focus();
  } else if (!event.shiftKey && document.activeElement === ultimo) {
    event.preventDefault();
    primeiro.focus();
  }
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;

  event.preventDefault();
  if (state.sidebar.floatingGroupId) {
    fecharPainelFlutuanteSidebarHub();
  }

  if (!state.sidebar.collapsed && !state.sidebar.pinned) {
    state.sidebar.collapsed = true;
    state.sidebar.floatingGroupId = '';
    renderizarRotaAtual();
    window.requestAnimationFrame(() => document.querySelector('.hub-mobile-menu-toggle')?.focus());
  }
});
