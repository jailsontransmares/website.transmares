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

async function iniciarApp() {
  try {
    renderLoading();

    const sessao = await obterSessaoAtual();

    if (!sessao) {
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
    renderErro(erro.message || 'Erro ao carregar o sistema.');
  }
}

function renderLogin() {
  document.getElementById('app').innerHTML = `
    <section class="login-card">
      <div class="brand-logo-slot login-logo" aria-label="Transmares Corretora de Seguros">
        <img src="assets/logo-transmares.png" alt="Transmares Corretora de Seguros">
      </div>

      <h1>PAINEL TRANSMARES</h1>
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

async function entrarNoHub(event) {
  event.preventDefault();

  const email = document.getElementById('login_email')?.value || '';
  const password = document.getElementById('login_password')?.value || '';

  try {
    state.auth.email = email;
    state.auth.loading = true;
    state.auth.message = '';
    renderLogin();

    await entrarComSenha(email, password);
    await iniciarApp();
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
      <h1>PAINEL TRANSMARES</h1>
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
        <div class="admin-panel-header">
          <div>
            <h2>Painel AR Transmares</h2>
            <p>Consulte produtos, selecione o parceiro e gere links comerciais.</p>
          </div>
          <div class="module-tabs" role="group" aria-label="Visualização do Painel AR">
            <button class="${state.ar.aba === 'inicio' ? 'active' : ''}" type="button" onclick="selecionarAbaAr('inicio')">Início</button>
            <button class="${state.ar.aba === 'gerar' ? 'active' : ''}" type="button" onclick="selecionarAbaAr('gerar')">Gerar links</button>
            <button class="${state.ar.aba === 'produtos' ? 'active' : ''}" type="button" onclick="selecionarAbaAr('produtos')">Lista produtos</button>
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

  return renderGeradorLinksAr();
}

function renderInicioPainelAr(gestor) {
  const produtos = state.ar.produtos.length;
  const parceiros = state.ar.parceiros.length;
  const historico = state.ar.historico.length;

  return `
    <section class="ar-home-shell">
      <div class="ar-home-hero">
        <div>
          <span class="ar-eyebrow">Painel AR</span>
          <h2>Operação de links AR</h2>
          <p>Acesse os fluxos reais disponíveis hoje para geração, consulta e acompanhamento.</p>
        </div>

        <div class="ar-home-stats">
          <span>${produtos} produtos</span>
          <span>${parceiros} parceiros</span>
          ${gestor ? `<span>${historico} registros</span>` : ''}
        </div>
      </div>

      <div class="ar-home-grid">
        ${renderArHomeCard('gerar', 'Gerar links', 'Selecionar produto e parceiro para gerar links comerciais.', 'Fluxo principal')}
        ${renderArHomeCard('produtos', 'Lista produtos', 'Consultar produtos importados, preços, modelos e validades.', `${produtos} itens`)}
        ${gestor ? renderArHomeCard('historico', 'Histórico', 'Acompanhar links gerados e usuários responsáveis.', `${historico} registros`) : ''}
      </div>

      <div class="admin-prepared-box ar-home-note">
        <strong>Submódulos preservados</strong>
        <p>Esta tela inicial apenas organiza os acessos existentes. Nenhum fluxo atual foi removido ou substituído por funcionalidade incompleta.</p>
      </div>
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

function renderGeradorLinksAr() {
  return `
    <section class="ar-mvp-shell">
      <div class="ar-mvp-hero">
        <div>
          <span class="ar-eyebrow">Painel AR</span>
          <h2>Gerar links</h2>
          <p>Busque o produto, confira o orçamento, selecione o parceiro e gere os links de atendimento.</p>
        </div>
      </div>

      <div class="ar-flow">
        <section class="ar-flow-card">
          <div class="ar-flow-card-header">
            <span class="ar-step-number">1</span>
            <div>
              <h3>Produto</h3>
              <p>Selecione o certificado digital desejado.</p>
            </div>
          </div>

          ${renderPainelProdutoMvpAr()}
        </section>

        <section class="ar-flow-card">
          <div class="ar-flow-card-header">
            <span class="ar-step-number">2</span>
            <div>
              <h3>Orçamento</h3>
              <p>Confira os valores antes de gerar os links.</p>
            </div>
          </div>

          ${renderOrcamentoAr()}
        </section>

        <section class="ar-flow-card">
          <div class="ar-flow-card-header">
            <span class="ar-step-number">3</span>
            <div>
              <h3>Parceiro</h3>
              <p>Selecione o parceiro responsável pelo atendimento.</p>
            </div>
          </div>

          ${renderPainelParceiroMvpAr()}
        </section>

        <section class="ar-flow-card">
          <div class="ar-flow-card-header">
            <span class="ar-step-number">4</span>
            <div>
              <h3>Links</h3>
              <p>Gere, abra ou copie os links finais.</p>
            </div>
          </div>

          ${renderAcaoGerarLinksAr()}
          ${renderResultadoAr()}
        </section>
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
      <div class="ar-mvp-card-header">
        <div>
          <span class="ar-mini-label">Parceiro</span>
          <h3>Buscar parceiro</h3>
          <p>Digite o nome, código, empresa, e-mail ou WhatsApp do parceiro.</p>
        </div>
      </div>

      <label class="ar-autocomplete-wrap ar-partner-search-wrap">
        <span>Nome do parceiro</span>
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
      <div class="ar-partner-main">
        <div class="ar-partner-avatar">
          ${escapeHtml(obterIniciaisAr(nome))}
        </div>

        <div>
          <span class="ar-mini-label">Parceiro selecionado</span>
          <h4>${escapeHtml(nome)}</h4>
          ${empresa ? `<p>${escapeHtml(empresa)}</p>` : ''}
        </div>
      </div>

      <div class="ar-partner-tags">
        ${codigo ? `<span>Código: ${escapeHtml(codigo)}</span>` : ''}
        ${status ? `<span>Status: ${escapeHtml(status)}</span>` : ''}
      </div>

      <div class="ar-partner-contact-grid">
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
          <span class="ar-mini-label">Produto</span>
          <h3>Buscar certificado digital</h3>
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
      <span>Produto desejado</span>
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
  const economia = formatarEconomiaProdutoAr(produto);

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
        ${produto.preco_com_desconto ? `<span>Com desconto: ${escapeHtml(formatarMoedaProdutoAr(produto.preco_com_desconto))}</span>` : ''}
        ${produto.preco_sem_desconto ? `<span>Sem desconto: ${escapeHtml(formatarMoedaProdutoAr(produto.preco_sem_desconto))}</span>` : ''}
        ${economia ? `<strong>Economia: ${escapeHtml(economia)}</strong>` : ''}
      </div>
    </article>
  `;
}
function alterarBuscaProdutoAr(valor) {
  state.ar.produtoBusca = valor;
  state.ar.produtoId = '';
  state.ar.resultado = null;
  state.ar.alertas = [];

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
  box.innerHTML = produtos.map(produto => {
    const economia = formatarEconomiaProdutoAr(produto);

    return `
      <button type="button" onclick="selecionarProdutoCompletoAr('${escapeAttr(produto.id)}')">
        <strong>${escapeHtml(produto.descricao_comercial || produto.produto || 'Certificado digital')}</strong>

        <span>
          ${escapeHtml(produto.modelo || 'Modelo não informado')}
          ${produto.validade ? ` · <b class="ar-validity-pill">Validade: ${escapeHtml(produto.validade)}</b>` : ''}
        </span>

        <small>
          ${produto.ac ? `AC: ${escapeHtml(produto.ac)}` : ''}
          ${produto.midia ? ` · Mídia: ${escapeHtml(produto.midia)}` : ''}
        </small>

        <small>
          ${produto.preco_com_desconto ? `Com desconto: ${escapeHtml(formatarMoedaProdutoAr(produto.preco_com_desconto))}` : ''}
          ${produto.preco_sem_desconto ? ` · Sem desconto: ${escapeHtml(formatarMoedaProdutoAr(produto.preco_sem_desconto))}` : ''}
          ${economia ? ` · Economia: ${escapeHtml(economia)}` : ''}
        </small>
      </button>
    `;
  }).join('');
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
        <span>${produtosFiltradosAr().length} produto(s)</span>
      </div>
      ${renderTabelaProdutosAr()}
    </section>
  `;
}

function produtosFiltradosAr() {
  if (state.ar.aba === 'produtos') {
    const termos = normalizarBuscaAr(state.ar.busca).split(' ').filter(Boolean);

    if (!termos.length) {
      return state.ar.produtos;
    }

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

      return termos.every(termo => texto.indexOf(termo) >= 0);
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

  return `
    <div class="ar-table">
      <div class="ar-table-head">
        <span>Produto</span>
        <span>AC</span>
        <span>Modelo</span>
        <span>Validade</span>
        <span>Grupo</span>
        <span>Com desc.</span>
        <span>Sem desc.</span>
        <span>Economia</span>
        <span></span>
      </div>
      ${produtos.map(produto => `
        <article class="ar-row ${state.ar.produtoId === produto.id ? 'selected' : ''} ${produto.alertas.length ? 'has-alert' : ''}">
          <div>
            <strong>${escapeHtml(produto.descricao_comercial || 'Produto')}</strong>
            <small>${escapeHtml(produto.product_id || 'Sem Product ID')}</small>
            ${produto.alertas.length ? `<em>${escapeHtml(produto.alertas.join(' '))}</em>` : ''}
          </div>
          <span>${escapeHtml(produto.ac || '-')}</span>
          <span>${escapeHtml(produto.modelo || '-')}</span>
          <span>${escapeHtml(produto.validade || '-')}</span>
          <span>${escapeHtml(produto.grupo_com_desconto || produto.codigo_grupo || produto.grupo || '-')}</span>
          <span>${escapeHtml(produto.preco_com_desconto || 'Não disponível')}</span>
          <span>${escapeHtml(produto.preco_sem_desconto || 'Não disponível')}</span>
          <span>${escapeHtml(produto.economia || '-')}</span>
          <button class="link-sub-btn" type="button" onclick="selecionarProdutoAr('${escapeAttr(produto.id)}')">${state.ar.produtoId === produto.id ? 'Selecionado' : 'Selecionar'}</button>
        </article>
      `).join('')}
    </div>
  `;
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
  const precoComDesconto = formatarMoedaProdutoAr(produto.preco_com_desconto);
  const precoSemDesconto = formatarMoedaProdutoAr(produto.preco_sem_desconto);

  return `
    <article class="ar-budget-card">
      <div class="ar-budget-top">
        <div>
          <span class="ar-mini-label">Orçamento do certificado digital</span>
          <h3>${escapeHtml(produto.descricao_comercial || produto.produto || 'Certificado digital')}</h3>
          <p>
            ${escapeHtml(produto.modelo || 'Modelo não informado')}
            ${produto.validade ? ` · Validade: ${escapeHtml(produto.validade)}` : ''}
          </p>
        </div>

        ${produto.validade ? `
          <span class="ar-budget-validity">
            ${escapeHtml(produto.validade)}
          </span>
        ` : ''}
      </div>

      <div class="ar-budget-values">
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
          <strong>${escapeHtml(economia)}</strong>
        </div>
      </div>

      <div class="ar-whatsapp-preview">
        <span>Prévia para WhatsApp</span>
        <pre>${escapeHtml(texto)}</pre>
      </div>

      <button 
        id="ar_copiar_orcamento" 
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
      <div class="ar-generated-links-header">
        <div>
          <span class="ar-mini-label">Resultado</span>
          <h3>Links gerados</h3>
          <p>Use os botões abaixo para abrir ou copiar cada link.</p>
        </div>
      </div>

      <div class="ar-generated-links-list">
        ${links.map(link => `
          <article class="ar-generated-link-card">
            <div class="ar-generated-link-info">
              <span>${escapeHtml(link.rotulo)}</span>
              <strong>${escapeHtml(link.titulo)}</strong>
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
  renderPainelAr();
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
  state.ar.parceiroBusca = valor;
  state.ar.parceiroId = '';
  state.ar.resultado = null;
  state.ar.alertas = [];
  document.getElementById('ar_parceiro_card')?.remove();
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
}

function selecionarParceiroAr(id) {
  state.ar.parceiroId = id;
  const parceiro = obterParceiroSelecionadoAr();
  state.ar.parceiroBusca = parceiro ? (parceiro.nome_completo || parceiro.nome) : state.ar.parceiroBusca;
  state.ar.resultado = null;
  state.ar.alertas = [];
  renderPainelAr();
}

function selecionarAbaAr(aba) {
  state.ar.aba = aba;
  renderPainelAr();
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

  return [
    'Segue orçamento do certificado digital:',
    '',
    `*${produto.descricao_comercial || 'Produto'} | ${produto.modelo || '-'}*`,
    `Validade: *${produto.validade || '-'}*`,
    '',
    `Valor com desconto: *${formatarMoedaProdutoAr(produto.preco_com_desconto)}*`,
    `Valor sem desconto: ${formatarMoedaProdutoAr(produto.preco_sem_desconto)}`,
    '',
    `Economia: *${formatarEconomiaProdutoAr(produto)}*`,
    '----'
  ].join('\n');
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

  const texto = String(valor).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');

  if (!texto) {
    return null;
  }

  const numero = Number(texto);

  return Number.isNaN(numero) ? null : numero;
}

function formatarMoedaNumeroAr(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
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
  alterarBuscaParceiroAr,
  alterarBuscaProdutoAr,
  alterarFiltroLinks,
  alterarFiltroProdutoAr,
  alterarFiltroSenha,
  alternarFavoritoLink,
  alternarTema,
  copiarLink,
  copiarLinkResultadoAr,
  copiarOrcamentoAr,
  editarLinkItem,
  editarRegistroAdmin,
  fecharModalNovoLink,
  fecharModalNovoRegistro,
  fecharModalSenha,
  filtrarAdmin,
  entrarNoHub,
  gerarLinksAr,
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
  selecionarParceiroAr,
  selecionarProdutoAr,
  selecionarProdutoCompletoAr,
  selecionarSugestaoProdutoAr
});
