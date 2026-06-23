import './style.css';
import { chamarApi } from './api.js';
import { entrarComSenha, obterSessaoAtual, sairDoHub } from './services/authService.js';

const state = {
  usuario: null,
  config: null,
  cards: [],
  avisos: [],
  aniversariantes: [],
  favoritos: [],
  meta: null,
  auth: {
    email: '',
    loading: false,
    message: ''
  },
  admin: {
    aba: 'identidade',
    config: [],
    categorias: [],
    grupos: [],
    filtros: {
      categorias: 'todos',
      grupos: 'todos'
    },
    editando: {
      categorias: '',
      grupos: ''
    },
    modalNovo: '',
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
  listaGrupo: '',
  listaAc: '',
  filtrosListaAberto: false,
  produtosListaSelecionados: [],
  modalVisualizacaoProdutos: false,
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

document.addEventListener('DOMContentLoaded', iniciarApp);
document.addEventListener('click', fecharFiltrosListaAoClicarForaAr);

async function iniciarApp(exibirLoadingInicial = true) {
  try {
    if (exibirLoadingInicial) {
      renderLoading();
    }

    const sessao = await obterSessaoAtual();

    if (!sessao?.user?.email) {
      state.usuario = null;
      state.config = null;
      state.cards = [];
      state.avisos = [];
      state.aniversariantes = [];
      state.favoritos = [];
      state.meta = null;
      renderLogin();
      return;
    }

    const response = await chamarApi('getInitialData');

    if (!response.ok) {
      renderErro(obterMensagemApi(response, 'Acesso não autorizado.'));
      return;
    }

    state.usuario = response.data.usuario;
    state.config = response.data.config;
    state.cards = response.data.cards || [];
    state.avisos = response.data.avisos || [];
    state.aniversariantes = response.data.aniversariantes || [];
    state.favoritos = response.data.favoritos || [];
    state.meta = response.data.meta || null;

    aplicarConfigVisual();
    definirTemaInicial();
    renderDashboard();

  } catch (erro) {
    renderLogin();
  }
}

function renderLogin() {
  document.getElementById('app').innerHTML = `
    <section class="login-card">
      <div class="login-logo" aria-label="Transmares Corretora de Seguros">
        <img src="assets/logo-transmares.png" alt="Transmares Corretora de Seguros">
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

    await iniciarApp(false);
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

  state.usuario = null;
  state.config = null;
  state.cards = [];
  state.avisos = [];
  state.aniversariantes = [];
  state.favoritos = [];
  state.meta = null;
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
      <h1>Acesso não autorizado</h1>
      <p>${escapeHtml(mensagem)}</p>
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

  renderDashboard();
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
        <h2>Módulos</h2>
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
    </main>
  `;
}

function renderHeaderLogo() {
  return `
    <div class="brand-logo-slot" aria-label="Transmares Corretora de Seguros">
      <img src="assets/logo-transmares.png" alt="Transmares Corretora de Seguros">
    </div>
  `;
}

function acionarCardModulo(event, id) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    abrirModulo(id);
  }
}

function renderAvisos() {
  if (!state.avisos.length) {
    return '<p>Nenhum aviso ativo no momento.</p>';
  }

  return state.avisos.map(aviso => `
    <p><strong>${escapeHtml(aviso.titulo || 'Aviso')}</strong><br>${escapeHtml(aviso.mensagem || '')}</p>
  `).join('');
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
      <p><strong>${escapeHtml(item.nome || '')}</strong> ${escapeHtml(item.data || '')}${escapeHtml(quando)}</p>
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
  if (id === 'administracao') {
    abrirAdministracao();
    return;
  }

  if (['links-corretora', 'links-ar', 'links-gestao'].indexOf(id) >= 0) {
    abrirLinksUteis(id);
    return;
  }

  if (id === 'central-senhas') {
    abrirCentralSenhas();
    return;
  }

  if (id === 'painel-ar') {
    abrirPainelAr();
    return;
  }

  alert(`Módulo ainda não implementado: ${id}`);
}

async function abrirAdministracao(preservarMensagem = false) {
  if (state.usuario?.perfil !== 'gestor') {
    renderErro('Acesso permitido apenas para gestor.');
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
          <button class="secondary-btn" type="button" onclick="renderDashboard()">Voltar</button>
        </div>
      </header>

      <section class="admin-shell">
        <div class="admin-tabs">
          <span class="admin-nav-label">Configurações</span>
          ${renderAdminTab('identidade', 'Identidade do Painel')}
          ${renderAdminTab('aparencia', 'Aparência')}
          ${renderAdminTab('logo', 'Logo e Marca')}
          ${renderAdminTab('limites', 'Limites do Painel')}

          <span class="admin-nav-label">Cadastros</span>
          ${renderAdminTab('categorias', 'Categorias')}
          ${renderAdminTab('grupos', 'Grupos')}

          <span class="admin-nav-label">Estrutura futura</span>
          ${renderAdminTab('home-exibicao', 'Home e Exibição')}
          ${renderAdminTab('modulos', 'Configurações por Módulo')}
          ${renderAdminTab('usuarios', 'Usuários')}
          ${renderAdminTab('perfis', 'Perfis de Acesso')}
          ${renderAdminTab('permissoes', 'Permissões por Módulo')}
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
  if (state.admin.aba === 'categorias') {
    return renderCrudAdmin('categorias', 'Categorias', 'Organize os futuros itens do HUB por categorias.');
  }

  if (state.admin.aba === 'grupos') {
    return renderCrudAdmin('grupos', 'Grupos', 'Organize permissões e agrupamentos para fases futuras.');
  }

  if (state.admin.aba === 'home-exibicao') {
    return renderHomeExibicaoAdmin();
  }

  if (state.admin.aba === 'modulos') {
    return renderModulosAdmin();
  }

  if (state.admin.aba === 'usuarios') {
    return renderAdminPreparado('Usuários', 'A planilha de usuários já existe e é usada para autenticação, mas ainda não há endpoint administrativo para cadastro e edição nesta tela.', [
      'Evita simular gestão de usuários sem persistência própria.',
      'Próximo passo técnico: criar API segura para listar, criar, editar e inativar usuários.',
      'A autenticação atual continua preservada pelo backend.'
    ]);
  }

  if (state.admin.aba === 'perfis') {
    return renderAdminPreparado('Perfis de Acesso', 'Os perfis atuais são lidos diretamente do usuário, mas ainda não existe cadastro dedicado de perfis.', [
      'Hoje o perfil gestor controla acesso ao Admin e a cards específicos.',
      'Próximo passo técnico: definir tabela ou configuração persistida de perfis.',
      'Sem backend próprio, esta área fica apenas preparada visualmente.'
    ]);
  }

  if (state.admin.aba === 'permissoes') {
    return renderAdminPreparado('Permissões por Módulo', 'As permissões por módulo ainda não possuem tabela, endpoint ou regra de enforcement configurável.', [
      'Não serão exibidos controles falsos de segurança.',
      'Os cards atuais continuam sendo definidos pelo backend conforme o perfil.',
      'Próximo passo técnico: criar modelo de permissões e aplicar as regras nos endpoints.'
    ]);
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
      ${state.admin.loading ? '<p class="quick-link-empty">Carregando configurações...</p>' : renderConfigAdmin(grupoId)}
    </section>
  `;
}

async function selecionarAbaAdmin(aba) {
  state.admin.aba = aba;
  state.admin.message = '';

  if (aba === 'categorias' || aba === 'grupos') {
    await carregarRegistrosAdmin(aba);
    return;
  }

  renderAdministracao();
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

      ${state.admin.loading ? '<p class="quick-link-empty">Carregando configurações...</p>' : renderConfigAdmin('painel_ar')}
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
      <span>${escapeHtml(status)}</span>
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

      ${state.admin.loading ? '<p class="quick-link-empty">Carregando registros...</p>' : renderRegistrosAdmin(entidade, records)}
      ${renderModalNovoRegistro(entidade)}
    </section>
  `;
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
        <option value="ativo" ${record.status === 'ativo' ? 'selected' : ''}>ativo</option>
        <option value="inativo" ${record.status === 'inativo' ? 'selected' : ''}>inativo</option>
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
  state.admin.modalNovo = entidade;
  renderAdministracao();
}

function fecharModalNovoRegistro() {
  state.admin.modalNovo = '';
  renderAdministracao();
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
  state.admin.editando[entidade] = '';
  renderAdministracao();
}

function editarRegistroAdmin(entidade, id) {
  state.admin.editando[entidade] = id;
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
          <button class="secondary-btn" type="button" onclick="renderDashboard()">Voltar</button>
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
        ${state.links.loading ? '<p class="quick-link-empty">Carregando links...</p>' : renderListaLinksUteis(gestor)}
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

async function carregarDadosIniciaisSilencioso() {
  const response = await chamarApi('getInitialData');

  if (!response.ok) {
    return;
  }

  state.usuario = response.data.usuario;
  state.config = response.data.config;
  state.cards = response.data.cards || [];
  state.avisos = response.data.avisos || [];
  state.aniversariantes = response.data.aniversariantes || [];
  state.favoritos = response.data.favoritos || [];
  state.meta = response.data.meta || null;
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
          <button class="secondary-btn" type="button" onclick="renderDashboard()">Voltar</button>
        </div>
      </header>

      <section class="admin-panel">
        <div class="admin-panel-header">
          <div>
            <h2>Central de Senhas</h2>
            <p>${gestor ? 'Listagem e cadastro de acessos.' : 'Consulte os acessos disponíveis.'}</p>
          </div>
          ${gestor ? `
            <div class="module-tabs" role="group" aria-label="Visualização da Central de Senhas">
              <button class="${state.passwords.aba === 'acessos' ? 'active' : ''}" type="button" onclick="selecionarAbaSenhas('acessos')">Acessos</button>
              <button class="${state.passwords.aba === 'historico' ? 'active' : ''}" type="button" onclick="selecionarAbaSenhas('historico')">Histórico</button>
            </div>
          ` : ''}
        </div>

        ${renderResumoSenhas(gestor)}
        ${state.passwords.aba === 'acessos' ? renderToolbarSenhas(gestor) : ''}

        ${state.passwords.message ? `<p class="admin-message">${escapeHtml(state.passwords.message)}</p>` : ''}
        ${state.passwords.loading ? '<p class="quick-link-empty">Carregando acessos...</p>' : renderConteudoSenhas(gestor)}
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

function renderConteudoSenhas(gestor) {
  if (state.passwords.aba === 'historico' && gestor) {
    return renderHistoricoSenhas();
  }

  return renderListaSenhas(gestor);
}

function renderListaSenhas(gestor) {
  if (!state.passwords.items.length) {
    return '<p class="quick-link-empty">Nenhum acesso cadastrado.</p>';
  }

  return `<div class="password-list">${state.passwords.items.map(item => renderSenhaItem(item, gestor)).join('')}</div>`;
}

function renderSenhaItem(item, gestor) {
  return `
    <article class="password-row status-line-${escapeAttr(item.status || 'inativo')}">
      <div>
        <span class="card-taxonomy">${escapeHtml(item.categoria || 'Sem categoria')} | ${escapeHtml(item.grupo || 'Sem grupo')}</span>
        <h3>${escapeHtml(item.titulo || 'Acesso')}</h3>
        <p>${escapeHtml(item.descricao || '')}</p>
      </div>

      <div class="password-fields">
        <span>Login: ${escapeHtml(item.login || '-')}</span>
        <span>Senha: ${escapeHtml(item.senha || '-')}</span>
        ${item.url ? `
          <div class="link-buttons">
            <a class="link-sub-btn" href="${escapeAttr(item.url)}" target="_blank" rel="noopener">Abrir</a>
            <button id="copy_access_${escapeAttr(item.id)}" class="link-sub-btn" type="button" onclick="copiarLink('access_${escapeAttr(item.id)}', '${escapeAttr(item.url)}')">Copiar</button>
          </div>
        ` : ''}
      </div>

      ${gestor ? `<div class="crud-actions"><button class="icon-btn" type="button" onclick="abrirModalSenha('${escapeAttr(item.id)}')" title="Editar" aria-label="Editar acesso">✎</button></div>` : ''}
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
          <span>${escapeHtml(item.status || '-')}</span>
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
  state.passwords.aba = aba;
  state.passwords.modalAberto = false;
  renderCentralSenhas();
}

function abrirModalSenha(id) {
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

async function abrirPainelAr() {
  state.ar.message = '';
  state.ar.resultado = null;
  state.ar.alertas = [];
  state.ar.aba = 'inicio';
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

function renderPainelAr() {
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
          <button class="secondary-btn" type="button" onclick="renderDashboard()">Voltar</button>
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
          <div class="module-tabs" role="group" aria-label="Visualização do Painel AR">
            <button class="ar-home-tab ${state.ar.aba === 'inicio' ? 'active' : ''}" type="button" onclick="selecionarAbaAr('inicio')" title="Início" aria-label="Início">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.2a.5.5 0 0 1-.5-.5v-5.2H9.2v5.2a.5.5 0 0 1-.5.5H3.5a.5.5 0 0 1-.5-.5v-9.7Z"></path>
              </svg>
            </button>
            <button class="${state.ar.aba === 'gerar' ? 'active' : ''}" type="button" onclick="selecionarAbaAr('gerar')">Gerar links</button>
            <button class="${state.ar.aba === 'produtos' ? 'active' : ''}" type="button" onclick="selecionarAbaAr('produtos')">Lista produtos</button>
            <button class="${state.ar.aba === 'validacoes' ? 'active' : ''}" type="button" onclick="selecionarAbaAr('validacoes')">Validações</button>
            ${gestor ? `<button class="${state.ar.aba === 'historico' ? 'active' : ''}" type="button" onclick="selecionarAbaAr('historico')">Histórico</button>` : ''}
          </div>
        </div>

        ${state.ar.message ? `<p class="admin-message">${escapeHtml(state.ar.message)}</p>` : ''}
        ${state.ar.loading ? '<p class="quick-link-empty">Carregando produtos e parceiros...</p>' : renderConteudoAr(gestor)}
      </section>
    </main>
  `;
}

function renderConteudoAr(gestor) {
  if (state.ar.aba === 'inicio') {
    return renderInicioPainelAr(gestor);
  }

  if (state.ar.aba === 'historico' && gestor) {
    return renderHistoricoAr();
  }

  if (state.ar.aba === 'produtos') {
    return renderListaProdutosAr();
  }

  if (state.ar.aba === 'validacoes') {
    return renderValidacoesAr();
  }

  return renderGeradorLinksAr();
}

function renderInicioPainelAr(gestor) {
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

  return `
    <section class="ar-validacoes">
      <div class="ar-validacoes-subnav" role="group" aria-label="Subáreas de Validações">
        <button class="${validacoes.aba === 'emitir' ? 'active' : ''}" type="button" onclick="selecionarSubabaValidacoesAr('emitir')">Emitir recibo</button>
        <button class="${validacoes.aba === 'consultar' ? 'active' : ''}" type="button" onclick="selecionarSubabaValidacoesAr('consultar')">Consultar recibos</button>
        <button class="${validacoes.aba === 'importacao' ? 'active' : ''}" type="button" onclick="selecionarSubabaValidacoesAr('importacao')">Importação</button>
      </div>

      ${validacoes.message ? `<p class="admin-message">${escapeHtml(validacoes.message)}</p>` : ''}
      ${renderConteudoValidacoesAr()}
    </section>
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
  const filtros = validacoes.filtros;
  const totalPendente = validacoes.pendentes
    .reduce((total, item) => total + (Number(item.valor_tot_comiss) || 0), 0);
  const totalSelecionado = validacoes.pendentes
    .filter(item => validacoes.selecionados.includes(item.id))
    .reduce((total, item) => total + (Number(item.valor_tot_comiss) || 0), 0);

  return `
    <div class="ar-validacoes-panel">
      <div class="ar-validacoes-header">
        <div>
          <span class="ar-eyebrow">Validações</span>
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
        <button class="save-btn" type="button" onclick="emitirReciboValidacoesAr()" ${validacoes.selecionados.length ? '' : 'disabled'}>Emitir recibo</button>
      </div>

      ${renderBarraSelecaoValidacoesAr(totalSelecionado)}
      ${renderTabelaValidacoesPendentesAr()}
      ${renderLancamentoManualValidacoesAr()}
    </div>
  `;
}

function renderBarraSelecaoValidacoesAr(totalSelecionado) {
  const { pendentes, selecionados } = state.ar.validacoes;

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
      <button class="save-btn" type="button" onclick="emitirReciboValidacoesAr()">Emitir recibo</button>
    </div>
  `;
}

function renderTabelaValidacoesPendentesAr() {
  const { pendentes, selecionados, loading } = state.ar.validacoes;
  const todosSelecionados = pendentes.length > 0 && pendentes.every(item => selecionados.includes(item.id));

  if (loading) {
    return '<p class="quick-link-empty">Carregando lançamentos pendentes...</p>';
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
        <div>
          <span class="ar-eyebrow">Validações</span>
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

      ${loading ? '<p class="quick-link-empty">Carregando recibos...</p>' : renderTabelaRecibosAr(recibos)}
    </div>
  `;
}

function renderTabelaRecibosAr(recibos) {
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
          <span><mark class="ar-status-chip ${recibo.status === 'cancelado' ? 'cancelled' : ''}">${escapeHtml(recibo.status || '-')}</mark></span>
          <span class="ar-recibos-actions">
            <button class="secondary-btn" type="button" onclick="visualizarReciboValidacoesAr('${escapeAttr(recibo.id)}')">Visualizar</button>
            <button class="secondary-btn" type="button" onclick="cancelarReciboValidacoesAr('${escapeAttr(recibo.id)}')" ${recibo.status === 'cancelado' ? 'disabled' : ''}>Cancelar</button>
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
            <div><dt>Status</dt><dd>${escapeHtml(recibo.status || '-')}</dd></div>
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
  const podeSelecionarArquivo = Boolean(repasse.mesBase) && !repasse.loteExistente && !repasse.loading;
  const podeImportar = Boolean(repasse.mesBase) && repasse.linhas.length > 0 && !repasse.erros.length && !repasse.loteExistente && !repasse.loading;

  return `
    <div class="ar-validacoes-panel">
      <div class="ar-validacoes-header">
        <div>
          <span class="ar-eyebrow">Validações</span>
          <h3>Importação</h3>
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
            <button class="secondary-btn danger" type="button" onclick="excluirMesBaseRepasseAr()" ${repasse.loading ? 'disabled' : ''}>Excluir mês-base</button>
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

    ${renderPainelProdutoMvpAr()}
  </section>

  <section class="ar-flow-card ar-flow-budget">
    <div class="ar-flow-card-header">
      <span class="ar-step-number">2</span>
      <div>
        <h3>Orçamento</h3>
        <p>Confira os valores antes de gerar os links.</p>
      </div>
    </div>

    ${renderOrcamentoAr()}
  </section>

  <section class="ar-flow-card ar-flow-partner">
    <div class="ar-flow-card-header">
      <span class="ar-step-number">3</span>
      <div>
        <h3>Parceiro</h3>
        <p>Selecione o parceiro responsável pelo atendimento.</p>
      </div>
    </div>

    ${renderPainelParceiroMvpAr()}
  </section>

  <section class="ar-flow-card ar-flow-links">
    <div class="ar-flow-card-header">
      <span class="ar-step-number">4</span>
      <div class="ar-links-header-action">
        ${renderAcaoGerarLinksAr()}
      </div>
    </div>

    ${renderResultadoAr()}
  </section>
</div>
  </div>
    </section>
  `;
}

function renderAcaoGerarLinksAr() {
  const produto = obterProdutoSelecionadoAr();
  const parceiro = obterParceiroSelecionadoAr();
  const podeGerar = produto && parceiro && !state.ar.gerando;

  return `
    <div class="ar-action-box">
      <button 
        class="save-btn ar-generate-main-btn" 
        type="button" 
        onclick="gerarLinksAr()" 
        ${podeGerar ? '' : 'disabled'}>
        ${state.ar.gerando ? 'Gerando links...' : 'Gerar links'}
      </button>

      ${!produto || !parceiro ? `
        <p class="ar-action-hint">
          Selecione um produto e um parceiro para liberar a geração dos links.
        </p>
      ` : ''}
    </div>
  `;
}

function renderPainelParceiroMvpAr() {
  const parceiro = obterParceiroSelecionadoAr();

  return `
    <div class="ar-mvp-card ar-partner-search-card">
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
        <div class="ar-empty-state compact">
          <strong>Nenhum parceiro selecionado</strong>
          <p>Use o campo acima para localizar e selecionar o parceiro.</p>
        </div>
      `}
    </div>
  `;
}
function renderParceiroSelecionadoCardAr(parceiro) {
  const nome = parceiro.nome_completo || parceiro.nome || 'Parceiro';
  const empresa = parceiro.nome_empresa || parceiro.empresa || parceiro.escritorio || '';
  const status = parceiro.status || '';
  const codigo = parceiro.codigo_revendedor || parceiro.codigo || '';
  const email = parceiro.email_cadastro_certificado || parceiro.email_comercial || parceiro.email || '';
  const whatsappPessoal = parceiro.whatsapp_pessoal || parceiro.whatsapp || '';
  const whatsappComercial = parceiro.whatsapp_comercial || '';

  return `
    <article class="ar-partner-card-modern">
      ${(codigo || status) ? `
        <p class="ar-partner-meta-line">
          ${codigo ? `<span>Código: ${escapeHtml(codigo)}</span>` : ''}
          ${codigo && status ? '<span aria-hidden="true">·</span>' : ''}
          ${status ? `<span>Status: ${escapeHtml(status)}</span>` : ''}
        </p>
      ` : ''}

      ${empresa ? `
        <div class="ar-partner-main">
          <p>${escapeHtml(empresa)}</p>
        </div>
      ` : ''}

      <div class="ar-partner-contact-list">
        ${email ? `
          <div>
            <span>E-mail cadastro</span>
            <strong>${escapeHtml(email)}</strong>
          </div>
        ` : ''}

        ${whatsappPessoal ? `
          <div>
            <span>WhatsApp pessoal</span>
            <strong>${escapeHtml(whatsappPessoal)}</strong>
          </div>
        ` : ''}

        ${whatsappComercial ? `
          <div>
            <span>WhatsApp comercial</span>
            <strong>${escapeHtml(whatsappComercial)}</strong>
          </div>
        ` : ''}
      </div>
    </article>
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
        <em class="${statusAtivo ? 'is-active' : ''}">${escapeHtml(status)}</em>
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
    <div class="ar-mvp-card ar-product-card">
      <div class="ar-mvp-card-header">
        <div>
          <h3>Selecionar tipo de certificado</h3>
          <p>Digite parte do produto, modelo, validade, mídia ou AC para localizar rapidamente.</p>
        </div>
      </div>

      ${renderBuscaProdutoUnicaAr()}

      ${produto ? renderProdutoSelecionadoResumoAr(produto) : `
        <div class="ar-empty-state compact">
          <strong>Nenhum produto selecionado</strong>
          <p>Use o campo acima para buscar e selecionar um certificado.</p>
        </div>
      `}
    </div>
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
  return `
    <article class="ar-selected-product">
      <div>
        <span class="ar-mini-label">Produto selecionado</span>
        <h4>${escapeHtml(produto.descricao_comercial || produto.produto || 'Certificado digital')}</h4>
        <p>
          ${escapeHtml(produto.modelo || 'Modelo não informado')}
          ${produto.validade ? ` · Validade: ${escapeHtml(produto.validade)}` : ''}
        </p>
      </div>

      <div class="ar-selected-product-meta">
        ${produto.ac ? `<span>AC: ${escapeHtml(produto.ac)}</span>` : ''}
        ${produto.midia ? `<span>Mídia: ${escapeHtml(produto.midia)}</span>` : ''}
      </div>
    </article>
  `;
}
function alterarBuscaProdutoAr(valor) {
  const tinhaProdutoSelecionado = Boolean(state.ar.produtoId);

  state.ar.produtoBusca = valor;
  state.ar.produtoId = '';
  state.ar.resultado = null;
  state.ar.alertas = [];

  if (tinhaProdutoSelecionado) {
    renderPainelAr();

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

  atualizarEstadoBotaoGerarAr();
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

  state.ar.produtoId = id;
  state.ar.produtoBusca = [
    produto.descricao_comercial || produto.produto,
    produto.modelo,
    produto.validade
  ].filter(Boolean).join(' | ');

  state.ar.resultado = null;
  state.ar.alertas = [];

  renderPainelAr();
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
  return `
    <section>
      <div class="ar-toolbar">
        <input class="config-input" type="search" value="${escapeAttr(state.ar.busca)}" placeholder="Buscar por descrição, AC, modelo, validade" oninput="alterarBuscaAr(this.value)">
        <div class="ar-products-toolbar-actions">
          <div class="ar-products-filter-menu">
            <button class="secondary-btn ar-products-filter-btn" type="button" onclick="alternarFiltrosListaProdutosAr()">
              Filtros${contarFiltrosListaProdutosAr() ? ` (${contarFiltrosListaProdutosAr()})` : ''}
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
    const grupoFiltro = normalizarBuscaAr(state.ar.listaGrupo);
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
        && (!grupoFiltro || grupoProduto === grupoFiltro)
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
    return '<p class="quick-link-empty">Nenhum produto encontrado.</p>';
  }

  const grupos = agruparProdutosListaAr(produtos);

  return `
    <div class="ar-products-table-wrap">
      ${grupos.map(grupo => `
        <details class="ar-products-group ${obterClasseGrupoProdutosAr(grupo.nome)}" open>
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
              return `
                <article class="ar-products-row" role="row">
                  <span class="ar-products-select-cell">
                    <input type="checkbox" aria-label="Selecionar ${escapeAttr(produto.descricao_comercial || produto.produto || 'Produto')}" ${selecionado ? 'checked' : ''} onchange="alternarProdutoListaSelecionadoAr('${escapeAttr(produto.id)}')">
                  </span>
                  <span>${escapeHtml(produto.descricao_comercial || produto.produto || 'Produto')}</span>
                  <span>${escapeHtml(temPrecoComDesconto ? formatarMoedaProdutoAr(produto.preco_com_desconto) : '--')}</span>
                  <span>${escapeHtml(formatarMoedaProdutoAr(produto.preco_sem_desconto))}</span>
                  <span>${escapeHtml(produto.product_id || '-')}</span>
                </article>
              `;
            }).join('')}
          </div>
        </details>
      `).join('')}
    </div>
  `;
}

function renderDropdownFiltrosListaProdutosAr() {
  const grupos = obterOpcoesFiltroListaProdutosAr('grupo');
  const acs = obterOpcoesFiltroListaProdutosAr('ac');

  return `
    <div class="ar-products-filter-dropdown">
      <label>
        <span>Grupo do produto</span>
        <select onchange="alterarFiltroListaProdutosAr('grupo', this.value)">
          <option value="">Todos</option>
          ${grupos.map(grupo => `<option value="${escapeAttr(grupo)}" ${state.ar.listaGrupo === grupo ? 'selected' : ''}>${escapeHtml(grupo)}</option>`).join('')}
        </select>
      </label>

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
  return [state.ar.listaGrupo, state.ar.listaAc].filter(Boolean).length;
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
          <span>${escapeHtml([parceiro.codigo_revendedor || 'sem código', parceiro.status || '-'].join(' | '))}</span>
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
        <span>${escapeHtml([parceiro.codigo_revendedor || 'sem código', parceiro.status || '-'].join(' | '))}</span>
      </button>
    `).join('')
    : '<p>Nenhum parceiro encontrado.</p>';
}

function atualizarEstadoBotaoGerarAr() {
  const botao = document.getElementById('ar_gerar_btn');

  if (!botao) {
    return;
  }

  botao.disabled = state.ar.gerando || !state.ar.produtoId || !state.ar.parceiroId;
}

function renderOpcoesParceirosAr() {
  const parceiros = parceirosFiltradosAr();

  if (!parceiros.length) {
    return '<p class="quick-link-empty">Nenhum parceiro encontrado.</p>';
  }

  return parceiros.map(parceiro => `
    <button class="ar-partner-option ${state.ar.parceiroId === parceiro.id ? 'selected' : ''}" type="button" onclick="selecionarParceiroAr('${escapeAttr(parceiro.id)}')">
      <strong>${escapeHtml(parceiro.nome_completo || parceiro.nome || 'Parceiro')}</strong>
      <span>${escapeHtml([parceiro.codigo_revendedor || 'sem código', parceiro.status || '-'].join(' | '))}</span>
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

  resultado.innerHTML = renderTabelaProdutosAr();
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
  if (tipo === 'grupo') {
    state.ar.listaGrupo = valor;
  } else if (tipo === 'ac') {
    state.ar.listaAc = valor;
  }

  renderPainelAr();
}

function limparFiltrosListaProdutosAr() {
  state.ar.listaGrupo = '';
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
  atualizarEstadoBotaoGerarAr();
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
    atualizarEstadoBotaoGerarAr();
    return;
  }

  state.ar.campoProdutoAtivo = '';
  renderPainelAr();
}

function alterarBuscaParceiroAr(valor) {
  const tinhaParceiroSelecionado = Boolean(state.ar.parceiroId || state.ar.resultado);

  state.ar.parceiroBusca = valor;
  state.ar.parceiroId = '';
  state.ar.resultado = null;
  state.ar.alertas = [];

  if (tinhaParceiroSelecionado) {
    renderPainelAr();

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

  atualizarEstadoBotaoGerarAr();
  atualizarSugestoesParceiroDomAr();
}

function confirmarParceiroDigitadoAr(valor) {
  selecionarParceiroPorTextoAr(valor);
  renderPainelAr();
}

function confirmarProdutoDigitadoAr() {
  selecionarProdutoPorFiltrosAr();
  renderPainelAr();
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

function selecionarProdutoAr(id) {
  state.ar.produtoId = id;
  state.ar.resultado = null;
  state.ar.alertas = [];
  renderPainelAr();
  tentarGerarLinksAutomaticamenteAr();
}

function selecionarParceiroAr(id) {
  state.ar.parceiroId = id;
  const parceiro = obterParceiroSelecionadoAr();
  state.ar.parceiroBusca = parceiro ? (parceiro.nome_completo || parceiro.nome) : state.ar.parceiroBusca;
  state.ar.resultado = null;
  state.ar.alertas = [];
  renderPainelAr();
  tentarGerarLinksAutomaticamenteAr();
}

function selecionarAbaAr(aba) {
  state.ar.aba = aba;
  renderPainelAr();

  if (aba === 'validacoes' && !state.ar.validacoes.loading) {
    carregarValidacoesAr();
  }
}

function selecionarSubabaValidacoesAr(aba) {
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

  try {
    state.ar.message = '';
    state.ar.gerando = true;
    atualizarBotaoAr('Gerando...', true, 'is-saving');

    const response = await chamarApi('generateArLinks', {
      produto_id: state.ar.produtoId,
      parceiro_id: state.ar.parceiroId
    });

    if (!response.ok) {
      throw new Error(obterMensagemApi(response, 'Não foi possível gerar os links.'));
    }

    state.ar.gerando = false;
    state.ar.resultado = response.data;
    state.ar.alertas = response.data.alertas || [];
    atualizarBotaoAr('Gerado', true, 'is-saved');
    await esperar(500);
    renderPainelAr();
  } catch (erro) {
    state.ar.gerando = false;
    state.ar.resultado = null;
    state.ar.message = erro.message || 'Erro ao gerar links.';
    atualizarBotaoAr('Gerar links', false, '');
    renderPainelAr();
  }
}

function atualizarBotaoAr(texto, disabled, classe) {
  const botao = document.getElementById('ar_gerar_btn');

  if (!botao) return;

  botao.textContent = texto;
  botao.disabled = disabled;
  botao.classList.remove('is-saving', 'is-saved');

  if (classe) {
    botao.classList.add(classe);
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
  abrirLink,
  abrirModalNovoLink,
  abrirModalNovoRegistro,
  abrirModalSenha,
  abrirModulo,
  acionarCardAr,
  acionarCardModulo,
  alterarBuscaAr,
  alterarFiltroListaProdutosAr,
  alterarBuscaParceiroAr,
  alterarBuscaProdutoAr,
  alterarFiltroLinks,
  alterarFiltroValidacoesAr,
  alterarFiltroProdutoAr,
  alterarFiltroSenha,
  alternarFiltrosListaProdutosAr,
  alternarFavoritoLink,
  alternarTodasValidacoesVisiveisAr,
  alternarValidacaoSelecionadaAr,
  alternarProdutoListaSelecionadoAr,
  alternarTema,
  alternarTodosGruposProdutosAr,
  abrirVisualizacaoProdutosClienteAr,
  cancelarReciboValidacoesAr,
  carregarValidacoesAr,
  alterarMesBaseRepasseAr,
  copiarLink,
  copiarLinkResultadoAr,
  copiarOrcamentoAr,
  copiarVisualizacaoProdutosClienteAr,
  criarLancamentoManualValidacoesAr,
  editarLinkItem,
  editarRegistroAdmin,
  emitirReciboValidacoesAr,
  excluirMesBaseRepasseAr,
  fecharVisualizacaoProdutosClienteAr,
  fecharModalNovoLink,
  fecharModalNovoRegistro,
  fecharModalSenha,
  fecharReciboValidacoesAr,
  filtrarAdmin,
  entrarNoHub,
  gerarLinksAr,
  importarRepasseValidacoesAr,
  limparImportacaoRepasseAr,
  limparFiltrosListaProdutosAr,
  limparSelecaoValidacoesAr,
  limparProdutosListaSelecionadosAr,
  processarArquivoRepasseAr,
  renderDashboard,
  restaurarCoresPadrao,
  sair,
  salvarConfigAdmin,
  salvarLinkItem,
  salvarRegistroAdmin,
  salvarSenhaItem,
  selecionarAbaAdmin,
  selecionarAbaAr,
  selecionarAbaSenhas,
  selecionarSubabaValidacoesAr,
  selecionarParceiroAr,
  selecionarProdutoAr,
  selecionarProdutoCompletoAr,
  selecionarSugestaoProdutoAr,
  visualizarReciboValidacoesAr
});
