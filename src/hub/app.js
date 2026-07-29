Warning: truncated output (original token count: 85239)
Total output lines: 9861

import './style.css';
import { chamarApi } from './api.js';
import { entrarComSenha, obterSessaoAtual, sairDoHub } from './services/authService.js';
import { canAccessModule, hasPermission, normalizarPermissoes } from './services/permissionService.js';
import {
  atualizarContextoInicialHub,
  invalidarContextoAcessoHub,
  limparContextoAcessoHub
} from './services/hubAccessContext.js';

const state = {
  usuario: null,
  config: null,
  cards: [],
  avisos: [],
  aniversariantes: [],
  favoritos: [],
  meta: null,
  permissions: normalizarPermissoes([]),
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
      id: '',
      dados: null,
      erros: {},
      salvando: false,
      salvo: false
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
    seletorColunasParceirosAberto: false,
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
  message: ''
},
  temaAtual: 'claro'
};

const ADMIN_PARTNER_COLUMNS_STORAGE_KEY = 'hub-admin-partners-visible-columns-v1';
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
document.addEventListener('click', fecharFiltrosListaAoClicarForaAr);
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
        <div class="login-loading-spinner" aria-hidden="true"></div>
        <p>Carregando...</p>
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
    <section class="loading-card">
    <h1>Hub Transmares</h1>
      <p>Carregando sistema...</p>
    </section>
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
            ${state.temaAtual === 'escuro' ? '☀️' : '🌙'}
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
            ${modal.loading ? '<p class="quick-link-empty">Carregando módulos...</p>' : renderConteudoModalConfigurarModulosHome()}
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
          onclick="alterarStatusModuloHome('${id}', '${proximoStatus…73239 tokens truncated…n sincronizarContextoSenhasPelaRota() {
  const { modulo, principal } = obterContextoRotaHub();
  if (modulo !== 'central-senhas' || !principal) return;

  if (principal === 'acessos' || principal === 'historico') {
    state.passwords.aba = principal;
  }
}

function sincronizarContextoArPelaRota() {
  const { modulo, principal, secundaria } = obterContextoRotaHub();
  if (modulo !== 'painel-ar') return;

  const abasValidas = ['inicio', 'gerar', 'produtos', 'validacoes', 'historico'];
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
          ${state.temaAtual === 'escuro' ? '☼' : '◐'}
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
      ${renderHeaderLogo()}
      <div class="brand">
        <h1>${escapeHtml(nomeSistema)}</h1>
        <p>${escapeHtml(subtitulo)}</p>
      </div>

      ${renderHubUserBox()}
    </header>
  `;
}

function renderHubShell({ tituloPagina, descricaoPagina, conteudo, classeConteudo = '' }) {
  return `
    <main class="dashboard hub-layout">
      ${renderHubTopbar()}
      <section class="hub-page-content ${escapeAttr(classeConteudo)}">
        <section class="hub-page-intro">
          <span class="hub-page-kicker">Hub operacional</span>
          <h2>${escapeHtml(tituloPagina)}</h2>
          <p>${escapeHtml(descricaoPagina)}</p>
        </section>

        ${conteudo}
      </section>
    </main>
  `;
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
        ${state.links.loading ? '<p class="quick-link-empty">Carregando links...</p>' : renderListaLinksUteis(gestor)}
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
        ${state.passwords.loading ? '<p class="quick-link-empty">Carregando acessos...</p>' : renderConteudoSenhas(podeGerenciar, podeVerSenha)}
        ${state.passwords.aba === 'acessos' ? renderModalSenha() : ''}
      </section>
    `
  });
};

const renderPainelArHubPhase1 = function() {
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
            <div class="module-tabs" role="group" aria-label="Visualização do Painel AR">
              <button class="ar-home-tab ${state.ar.aba === 'inicio' ? 'active' : ''}" type="button" onclick="selecionarAbaAr('inicio')" title="Início" aria-label="Início">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.2a.5.5 0 0 1-.5-.5v-5.2H9.2v5.2a.5.5 0 0 1-.5.5H3.5a.5.5 0 0 1-.5-.5v-9.7Z"></path>
                </svg>
              </button>
              ${podeAcessarAbaAr('gerar') ? `<button class="${state.ar.aba === 'gerar' ? 'active' : ''}" type="button" onclick="selecionarAbaAr('gerar')">Gerar links</button>` : ''}
              ${podeAcessarAbaAr('produtos') ? `<button class="${state.ar.aba === 'produtos' ? 'active' : ''}" type="button" onclick="selecionarAbaAr('produtos')">Lista produtos</button>` : ''}
              ${podeAcessarAbaAr('validacoes') ? `<button class="${state.ar.aba === 'validacoes' ? 'active' : ''}" type="button" onclick="selecionarAbaAr('validacoes')">Validações</button>` : ''}
              ${podeHistorico ? `<button class="${state.ar.aba === 'historico' ? 'active' : ''}" type="button" onclick="selecionarAbaAr('historico')">Histórico</button>` : ''}
            </div>
            ${podeGerenciarParceiros ? `<button class="secondary-btn ar-manage-partners-btn" type="button" onclick="navegarParaModulo('administracao', 'parceiros-indicacao')">Gerenciar parceiros</button>` : ''}
          </div>
        </div>

        ${state.ar.message ? `<p class="admin-message">${escapeHtml(state.ar.message)}</p>` : ''}
        ${state.ar.loading ? '<p class="quick-link-empty">Carregando produtos e parceiros...</p>' : renderConteudoAr()}
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

  atualizarHashHub(aba, { replace: true });
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

  const hash = aba === 'validacoes'
    ? `validacoes/${state.ar.validacoes.aba || 'consultar'}`
    : aba;

  atualizarHashHub(hash, { replace: true });
  state.ar.aba = aba;
  renderPainelAr();

  if (aba === 'validacoes' && !state.ar.validacoes.loading) {
    carregarValidacoesAr();
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
  sincronizarContextoArPelaRota();
  state.ar.message = '';
  state.ar.resultado = null;
  state.ar.alertas = [];
  await carregarPainelAr();
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
  alterarStatusModuloHome,
  alterarVisibilidadeModuloHome,
  alternarColunaParceirosIndicacaoAdmin,
  alternarSeletorColunasParceirosIndicacaoAdmin,
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
  alterarBuscaParceiroAr,
  alterarBuscaProdutoAr,
  alterarFiltroLinks,
  alterarFiltroValidacoesAr,
  alterarFiltroProdutoAr,
  alterarFiltroSenha,
  alternarFiltrosListaProdutosAr,
  alternarFavoritoLink,
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
  navegarHome,
  navegarParaModulo,
  processarArquivoRepasseAr,
  renderDashboard,
  restaurarCoresPadrao,
  restaurarColunasParceirosIndicacaoAdmin,
  sair,
  salvarConfigAdmin,
  salvarConfigModulosHome,
  salvarLinkItem,
  salvarParceiroIndicacaoAdmin,
  salvarPermissoesUsuarioAdmin,
  salvarPerfilAdmin,
  salvarEdicaoGrupoProdutosAr,
  salvarNovoPerfilComPermissoesAdmin,
  salvarRegistroAdmin,
  salvarSenhaItem,
  salvarUsuarioAdmin,
  selecionarFiltroUsuariosAdmin,
  selecionarPaginaUsuariosAdmin,
  selecionarAbaAdmin,
  selecionarAbaAr,
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