import { chamarApi } from './api.js';

const STYLE_ID = 'admin-profile-permissions-direct-style';
const APPLY_DELAYS = [0, 80, 180, 360, 700, 1200];

let recursosCache = [];
let perfisCache = [];
let permissoesCache = [];
let carregado = false;
let carregando = false;
let renderScheduled = false;
let mensagem = '';

const estadoPermissoes = {
  perfilId: '',
  expandedModules: {},
  originalPermissions: {},
  draftPermissions: {},
  dirty: false,
  applying: false,
  submitMode: ''
};

function escapeHtml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(texto) {
  return escapeHtml(texto);
}

function normalizarTexto(texto = '') {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function obterEstadoPerfilTela() {
  if (typeof window.hubObterEstadoPerfilTelaAdmin !== 'function') {
    return { modo: '', id: '', etapa: 'dados' };
  }

  return window.hubObterEstadoPerfilTelaAdmin() || { modo: '', id: '', etapa: 'dados' };
}

function telaPermissoesAtiva() {
  const estado = obterEstadoPerfilTela();
  return estado.modo === 'editar' && estado.etapa === 'permissoes' && Boolean(estado.id);
}

function obterPerfilAtual() {
  const estado = obterEstadoPerfilTela();
  return (perfisCache || []).find(perfil => perfil.id === estado.id) || {};
}

function obterContainerPermissoes() {
  const shell = document.querySelector('.admin-profile-direct-shell');
  if (!shell) return null;

  const card = shell.querySelector('.admin-profile-direct-card');
  if (!card) return null;

  const titulo = card.querySelector('h4')?.textContent?.trim().toLowerCase();
  if (titulo !== 'permissões do perfil' && titulo !== 'permissoes do perfil') return null;

  return card;
}

function injetarEstilos() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-profile-direct-card.is-profile-permissions-direct {
      padding: 0 !important;
      overflow: hidden;
    }

    .admin-profile-permissions-direct {
      display: grid;
      gap: 0;
      min-height: min(720px, calc(100vh - 220px));
    }

    .admin-profile-permissions-direct-head,
    .admin-profile-permissions-direct-footer {
      padding: 18px 20px;
      background: rgba(248, 250, 252, 0.72);
      border-color: rgba(148, 163, 184, 0.18);
    }

    body.dark .admin-profile-permissions-direct-head,
    body.dark .admin-profile-permissions-direct-footer {
      background: rgba(15, 23, 42, 0.44);
      border-color: rgba(148, 163, 184, 0.14);
    }

    .admin-profile-permissions-direct-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    }

    .admin-profile-permissions-direct-head h4 {
      margin: 0;
      color: var(--text-strong, #0f172a);
      font-size: 1.06rem;
      font-weight: 850;
      letter-spacing: -0.025em;
    }

    .admin-profile-permissions-direct-head p {
      margin: 5px 0 0;
      color: var(--text-muted, #64748b);
      font-size: 0.84rem;
      line-height: 1.42;
    }

    .admin-profile-permissions-direct-toolbar,
    .admin-profile-permissions-direct-toolbar-group,
    .admin-profile-permissions-direct-footer,
    .admin-profile-permissions-direct-footer-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }

    .admin-profile-permissions-direct-toolbar {
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
    }

    .admin-profile-permissions-direct-body {
      display: grid;
      gap: 12px;
      padding: 16px 20px 20px;
      max-height: calc(100vh - 390px);
      min-height: 360px;
      overflow: auto;
    }

    .admin-profile-permissions-direct-card {
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.72);
      overflow: hidden;
    }

    body.dark .admin-profile-permissions-direct-card {
      background: rgba(15, 23, 42, 0.36);
      border-color: rgba(148, 163, 184, 0.16);
    }

    .admin-profile-permissions-direct-module-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      background: rgba(248, 250, 252, 0.64);
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
    }

    body.dark .admin-profile-permissions-direct-module-head {
      background: rgba(30, 41, 59, 0.42);
    }

    .admin-profile-permissions-direct-toggle {
      appearance: none;
      border: 0;
      background: transparent;
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      color: var(--text-strong, #0f172a);
      font: inherit;
      font-weight: 820;
      text-align: left;
      cursor: pointer;
    }

    .admin-profile-permissions-direct-toggle span {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(41, 72, 149, 0.1);
      color: var(--cor-principal, #294895);
      font-weight: 900;
      flex: 0 0 auto;
    }

    .admin-profile-permissions-direct-module-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .admin-profile-permissions-direct-table-wrap {
      overflow: auto;
      padding: 0;
    }

    .admin-profile-permissions-direct-table {
      width: 100%;
      min-width: 720px;
      border-collapse: collapse;
    }

    .admin-profile-permissions-direct-table th,
    .admin-profile-permissions-direct-table td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      text-align: center;
      vertical-align: middle;
      font-size: 0.82rem;
    }

    .admin-profile-permissions-direct-table th:first-child,
    .admin-profile-permissions-direct-table td:first-child {
      text-align: left;
      min-width: 250px;
    }

    .admin-profile-permissions-direct-table th {
      color: var(--text-muted, #64748b);
      font-weight: 800;
      background: rgba(248, 250, 252, 0.72);
    }

    body.dark .admin-profile-permissions-direct-table th {
      background: rgba(15, 23, 42, 0.34);
    }

    .admin-profile-permissions-direct-empty-cell {
      color: var(--text-muted, #94a3b8);
    }

    .admin-profile-permissions-direct-check {
      display: inline-grid;
      place-items: center;
      cursor: pointer;
    }

    .admin-profile-permissions-direct-check input {
      width: 18px;
      height: 18px;
      accent-color: var(--cor-principal, #294895);
      cursor: pointer;
    }

    .admin-profile-permissions-direct-footer {
      justify-content: space-between;
      border-top: 1px solid rgba(148, 163, 184, 0.18);
    }

    .admin-profile-permissions-direct-status {
      margin: 0;
      color: var(--text-muted, #64748b);
      font-size: 0.82rem;
    }

    .admin-profile-permissions-direct-message {
      margin: 0;
      padding: 10px 12px;
      border-radius: 14px;
      background: rgba(41, 72, 149, 0.08);
      color: var(--text-strong, #0f172a);
      font-size: 0.84rem;
    }

    @media (max-width: 760px) {
      .admin-profile-permissions-direct-head,
      .admin-profile-permissions-direct-footer,
      .admin-profile-permissions-direct-toolbar {
        align-items: stretch;
        flex-direction: column;
      }

      .admin-profile-permissions-direct-toolbar-group,
      .admin-profile-permissions-direct-footer-actions,
      .admin-profile-permissions-direct-toolbar .filter-btn,
      .admin-profile-permissions-direct-footer .secondary-btn,
      .admin-profile-permissions-direct-footer .save-btn {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
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
    block: 'Bloquear'
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
    central_senhas: ['view', 'view_secret', 'create', 'update', 'delete'],
    admin: ['view'],
    'admin.usuarios': ['view', 'create', 'update', 'manage_permissions'],
    'admin.perfis': ['view', 'create', 'update'],
    'admin.permissoes': ['view', 'update']
  };

  return porRecurso[chave] || ['view'];
}

function obterGrupoRecursoPermissao(recurso) {
  const chave = recurso?.chave || '';

  if (chave.startsWith('admin')) return 'Administração';
  if (chave === 'central_senhas') return 'Central de Senhas';
  if (chave.startsWith('painel_ar')) return 'Painel AR';
  if (chave.startsWith('links_')) return 'Links';

  return 'Outros';
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
    block: 12
  };

  return ordem[acao] || 999;
}

function construirEstruturaPermissoes(recursos = []) {
  const grupos = {};

  recursos.forEach(recurso => {
    const nomeGrupo = obterGrupoRecursoPermissao(recurso);
    const chaveGrupo = normalizarTexto(nomeGrupo) || 'outros';
    const acoes = obterAcoesDisponiveisRecurso(recurso);

    grupos[chaveGrupo] ||= {
      chave: chaveGrupo,
      nome: nomeGrupo,
      acoes: [],
      linhas: []
    };

    grupos[chaveGrupo].linhas.push(recurso);
    acoes.forEach(acao => {
      if (!grupos[chaveGrupo].acoes.includes(acao)) {
        grupos[chaveGrupo].acoes.push(acao);
      }
    });
  });

  return Object.values(grupos)
    .map(grupo => ({
      ...grupo,
      acoes: grupo.acoes.sort((a, b) => obterOrdemAcaoPermissao(a) - obterOrdemAcaoPermissao(b)),
      linhas: grupo.linhas.sort((a, b) => String(a.rotulo_recurso || a.nome || a.chave).localeCompare(String(b.rotulo_recurso || b.nome || b.chave), 'pt-BR'))
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function mapearPermissoesPerfil(permissoes = [], perfilId = '') {
  return permissoes.reduce((acc, item) => {
    if (item.perfil_id === perfilId && item.permitido !== false) {
      acc[`${item.recurso_chave}:${item.acao}`] = true;
    }
    return acc;
  }, {});
}

function verificarAlteracoes(original = {}, draft = {}) {
  const chaves = new Set([...Object.keys(original), ...Object.keys(draft)]);
  return Array.from(chaves).some(chave => Boolean(original[chave]) !== Boolean(draft[chave]));
}

function prepararEstadoPerfil(perfilId) {
  const modulos = construirEstruturaPermissoes(recursosCache);
  const originalPermissions = mapearPermissoesPerfil(permissoesCache, perfilId);
  const expandedModules = modulos.reduce((acc, modulo) => {
    acc[modulo.chave] = estadoPermissoes.expandedModules?.[modulo.chave] ?? true;
    return acc;
  }, {});

  estadoPermissoes.perfilId = perfilId;
  estadoPermissoes.expandedModules = expandedModules;
  estadoPermissoes.originalPermissions = originalPermissions;
  estadoPermissoes.draftPermissions = { ...originalPermissions };
  estadoPermissoes.dirty = false;
  estadoPermissoes.applying = false;
  estadoPermissoes.submitMode = '';
}

async function carregarDadosPermissoes(perfilId) {
  if (!perfilId) return;
  if (carregado && estadoPermissoes.perfilId === perfilId) return;
  if (carregando) return;

  try {
    carregando = true;
    mensagem = '';

    const response = await chamarApi('listAdminPermissions');
    if (!response.ok) {
      throw new Error(response.message || 'Não foi possível carregar permissões do perfil.');
    }

    recursosCache = response.data?.recursos || [];
    perfisCache = response.data?.perfis || [];
    permissoesCache = response.data?.permissoes || [];
    carregado = true;
    prepararEstadoPerfil(perfilId);
  } catch (erro) {
    mensagem = erro.message || 'Erro ao carregar permissões do perfil.';
  } finally {
    carregando = false;
  }
}

function agendarRenderizacao() {
  if (renderScheduled) return;
  renderScheduled = true;

  window.requestAnimationFrame(() => {
    renderScheduled = false;
    aplicarTelaPermissoes();
  });
}

function obterResumoAlteracoes() {
  if (estadoPermissoes.applying) return 'Salvando alterações...';
  if (estadoPermissoes.dirty) return 'Há alterações não salvas.';
  return 'Nenhuma alteração pendente.';
}

function renderTabelaModulo(modulo) {
  const draft = estadoPermissoes.draftPermissions || {};

  return `
    <div class="admin-profile-permissions-direct-table-wrap">
      <table class="admin-profile-permissions-direct-table">
        <thead>
          <tr>
            <th>Recurso</th>
            ${modulo.acoes.map(acao => `<th>${escapeHtml(obterRotuloAcaoPermissao(acao))}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${modulo.linhas.map(recurso => `
            <tr>
              <td><strong>${escapeHtml(recurso.rotulo_recurso || recurso.nome || recurso.chave)}</strong></td>
              ${modulo.acoes.map(acao => {
                if (!obterAcoesDisponiveisRecurso(recurso).includes(acao)) {
                  return '<td class="admin-profile-permissions-direct-empty-cell">-</td>';
                }

                const chave = `${recurso.chave}:${acao}`;
                const marcado = Boolean(draft[chave]);

                return `
                  <td>
                    <label class="admin-profile-permissions-direct-check">
                      <input type="checkbox" ${marcado ? 'checked' : ''} ${estadoPermissoes.applying ? 'disabled' : ''} onchange="hubAdminProfilePermissoesAlternarCheckbox('${escapeAttr(recurso.chave)}', '${escapeAttr(acao)}', this.checked)">
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

function renderModulo(modulo) {
  const expandido = estadoPermissoes.expandedModules?.[modulo.chave] !== false;

  return `
    <article class="admin-profile-permissions-direct-card ${expandido ? 'is-open' : 'is-collapsed'}">
      <div class="admin-profile-permissions-direct-module-head">
        <button class="admin-profile-permissions-direct-toggle" type="button" onclick="hubAdminProfilePermissoesAlternarModulo('${escapeAttr(modulo.chave)}')" aria-expanded="${expandido ? 'true' : 'false'}">
          <span aria-hidden="true">${expandido ? '-' : '+'}</span>
          <strong>${escapeHtml(modulo.nome)}</strong>
        </button>
        <div class="admin-profile-permissions-direct-module-actions">
          <button class="filter-btn" type="button" onclick="hubAdminProfilePermissoesAplicarModulo('${escapeAttr(modulo.chave)}', true)" ${estadoPermissoes.applying ? 'disabled' : ''}>Conceder tudo</button>
          <button class="filter-btn" type="button" onclick="hubAdminProfilePermissoesAplicarModulo('${escapeAttr(modulo.chave)}', false)" ${estadoPermissoes.applying ? 'disabled' : ''}>Remover tudo</button>
        </div>
      </div>
      ${expandido ? renderTabelaModulo(modulo) : ''}
    </article>
  `;
}

function renderPermissoesDiretas() {
  const estado = obterEstadoPerfilTela();
  const perfil = obterPerfilAtual();
  const modulos = construirEstruturaPermissoes(recursosCache);
  const nomePerfil = perfil.nome || perfil.slug || 'Perfil';

  if (carregando) {
    return '<section class="admin-profile-permissions-direct"><div class="admin-profile-permissions-direct-body"><p class="quick-link-empty">Carregando permissões do perfil...</p></div></section>';
  }

  return `
    <section class="admin-profile-permissions-direct">
      <div class="admin-profile-permissions-direct-head">
        <div>
          <h4>Permissões do perfil</h4>
          <p>Permissões-base aplicadas ao perfil ${escapeHtml(nomePerfil)}.</p>
        </div>
      </div>

      <div class="admin-profile-permissions-direct-toolbar">
        <div class="admin-profile-permissions-direct-toolbar-group">
          <button class="filter-btn" type="button" onclick="hubAdminProfilePermissoesAlternarTodos(true)" ${estadoPermissoes.applying ? 'disabled' : ''}>Expandir todos</button>
          <button class="filter-btn" type="button" onclick="hubAdminProfilePermissoesAlternarTodos(false)" ${estadoPermissoes.applying ? 'disabled' : ''}>Recolher todos</button>
        </div>
        <div class="admin-profile-permissions-direct-toolbar-group">
          <button class="filter-btn" type="button" onclick="hubAdminProfilePermissoesAplicarGlobal(true)" ${estadoPermissoes.applying ? 'disabled' : ''}>Conceder tudo</button>
          <button class="filter-btn" type="button" onclick="hubAdminProfilePermissoesAplicarGlobal(false)" ${estadoPermissoes.applying ? 'disabled' : ''}>Remover tudo</button>
        </div>
      </div>

      <div class="admin-profile-permissions-direct-body">
        ${mensagem ? `<p class="admin-profile-permissions-direct-message">${escapeHtml(mensagem)}</p>` : ''}
        ${modulos.length ? modulos.map(renderModulo).join('') : '<p class="quick-link-empty">Nenhum recurso disponível para permissões.</p>'}
      </div>

      <div class="admin-profile-permissions-direct-footer">
        <p class="admin-profile-permissions-direct-status">${escapeHtml(obterResumoAlteracoes())}</p>
        <div class="admin-profile-permissions-direct-footer-actions">
          <button class="secondary-btn" type="button" onclick="hubAdminProfilePermissoesVoltar('${escapeAttr(estado.id)}')" ${estadoPermissoes.applying ? 'disabled' : ''}>Voltar para perfil</button>
          <button class="save-btn" type="button" onclick="hubAdminProfilePermissoesSalvar('${escapeAttr(estado.id)}')" ${estadoPermissoes.applying || !estadoPermissoes.dirty ? 'disabled' : ''}>${estadoPermissoes.applying ? 'Salvando...' : 'Salvar alterações'}</button>
        </div>
      </div>
    </section>
  `;
}

async function aplicarTelaPermissoes() {
  injetarEstilos();

  if (!telaPermissoesAtiva()) return;

  const estado = obterEstadoPerfilTela();
  const container = obterContainerPermissoes();

  if (!container) {
    APPLY_DELAYS.forEach(delay => window.setTimeout(aplicarTelaPermissoes, delay));
    return;
  }

  if (!carregado || estadoPermissoes.perfilId !== estado.id) {
    await carregarDadosPermissoes(estado.id);
  }

  container.classList.add('is-profile-permissions-direct');
  container.innerHTML = renderPermissoesDiretas();
}

function alternarModulo(chaveModulo) {
  estadoPermissoes.expandedModules[chaveModulo] = !(estadoPermissoes.expandedModules?.[chaveModulo] !== false);
  agendarRenderizacao();
}

function alternarTodos(expandir) {
  const modulos = construirEstruturaPermissoes(recursosCache);
  estadoPermissoes.expandedModules = modulos.reduce((acc, modulo) => {
    acc[modulo.chave] = Boolean(expandir);
    return acc;
  }, {});
  agendarRenderizacao();
}

function alternarCheckbox(recursoChave, acao, permitido) {
  const chave = `${recursoChave}:${acao}`;
  const draft = { ...(estadoPermissoes.draftPermissions || {}) };

  if (permitido) {
    draft[chave] = true;
  } else {
    delete draft[chave];
  }

  estadoPermissoes.draftPermissions = draft;
  estadoPermissoes.dirty = verificarAlteracoes(estadoPermissoes.originalPermissions, draft);
  agendarRenderizacao();
}

function aplicarModulo(chaveModulo, permitido) {
  const modulos = construirEstruturaPermissoes(recursosCache);
  const modulo = modulos.find(item => item.chave === chaveModulo);
  if (!modulo) return;

  const draft = { ...(estadoPermissoes.draftPermissions || {}) };

  modulo.linhas.forEach(recurso => {
    obterAcoesDisponiveisRecurso(recurso).forEach(acao => {
      const chave = `${recurso.chave}:${acao}`;
      if (permitido) {
        draft[chave] = true;
      } else {
        delete draft[chave];
      }
    });
  });

  estadoPermissoes.draftPermissions = draft;
  estadoPermissoes.dirty = verificarAlteracoes(estadoPermissoes.originalPermissions, draft);
  agendarRenderizacao();
}

function aplicarGlobal(permitido) {
  const modulos = construirEstruturaPermissoes(recursosCache);
  const draft = { ...(estadoPermissoes.draftPermissions || {}) };

  modulos.forEach(modulo => {
    modulo.linhas.forEach(recurso => {
      obterAcoesDisponiveisRecurso(recurso).forEach(acao => {
        const chave = `${recurso.chave}:${acao}`;
        if (permitido) {
          draft[chave] = true;
        } else {
          delete draft[chave];
        }
      });
    });
  });

  estadoPermissoes.draftPermissions = draft;
  estadoPermissoes.dirty = verificarAlteracoes(estadoPermissoes.originalPermissions, draft);
  agendarRenderizacao();
}

async function salvarPermissoes(perfilId) {
  const original = estadoPermissoes.originalPermissions || {};
  const draft = estadoPermissoes.draftPermissions || {};
  const chaves = new Set([...Object.keys(original), ...Object.keys(draft)]);

  const alteracoes = Array.from(chaves)
    .map(chave => {
      const [recurso_chave, acao] = chave.split(':');
      return {
        recurso_chave,
        acao,
        anterior: Boolean(original[chave]),
        proximo: Boolean(draft[chave])
      };
    })
    .filter(item => item.anterior !== item.proximo);

  if (!alteracoes.length) {
    estadoPermissoes.dirty = false;
    mensagem = 'Nenhuma alteração pendente.';
    agendarRenderizacao();
    return;
  }

  try {
    estadoPermissoes.applying = true;
    mensagem = '';
    agendarRenderizacao();

    const response = await chamarApi('saveAdminProfilePermissionsBatch', {
      perfil_id: perfilId,
      alteracoes: alteracoes.map(item => ({
        recurso_chave: item.recurso_chave,
        acao: item.acao,
        permitido: item.proximo
      }))
    });

    if (!response.ok) {
      throw new Error(response.message || 'Não foi possível salvar permissões do perfil.');
    }

    carregado = false;
    await carregarDadosPermissoes(perfilId);
    mensagem = 'Permissões do perfil atualizadas.';
  } catch (erro) {
    mensagem = erro.message || 'Erro ao salvar permissões do perfil.';
    estadoPermissoes.applying = false;
  } finally {
    agendarRenderizacao();
  }
}

function voltarParaPerfil(perfilId) {
  if (estadoPermissoes.dirty && !window.confirm('Existem alterações não salvas. Deseja voltar mesmo assim?')) {
    return;
  }

  mensagem = '';
  if (typeof window.abrirTelaEditarPerfilAdmin === 'function') {
    window.abrirTelaEditarPerfilAdmin(perfilId);
  }
}

function instalarGlobais() {
  window.hubAdminProfilePermissoesAlternarModulo = alternarModulo;
  window.hubAdminProfilePermissoesAlternarTodos = alternarTodos;
  window.hubAdminProfilePermissoesAlternarCheckbox = alternarCheckbox;
  window.hubAdminProfilePermissoesAplicarModulo = aplicarModulo;
  window.hubAdminProfilePermissoesAplicarGlobal = aplicarGlobal;
  window.hubAdminProfilePermissoesSalvar = salvarPermissoes;
  window.hubAdminProfilePermissoesVoltar = voltarParaPerfil;
}

function iniciar() {
  instalarGlobais();
  injetarEstilos();
  APPLY_DELAYS.forEach(delay => window.setTimeout(aplicarTelaPermissoes, delay));
}

window.addEventListener('hubAdminPerfilTelaAtualizada', () => {
  APPLY_DELAYS.forEach(delay => window.setTimeout(aplicarTelaPermissoes, delay));
});
window.addEventListener('hubAdminPerfilTelaRenderSolicitado', () => {
  APPLY_DELAYS.forEach(delay => window.setTimeout(aplicarTelaPermissoes, delay));
});
window.addEventListener('load', iniciar);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
