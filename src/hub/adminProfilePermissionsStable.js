import { chamarApi } from './api.js';

const STYLE_ID = 'admin-profile-permissions-stable-style';
const APPLY_DELAYS = [0, 80, 180, 360, 700, 1200, 1600];

let resourcesCache = [];
let profilesCache = [];
let permissionsCache = [];
let loadedProfileId = '';
let loading = false;
let saving = false;
let message = '';
let renderQueued = false;

const state = {
  profileId: '',
  expanded: {},
  original: {},
  draft: {},
  dirty: false
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function normalizeText(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getProfileScreenState() {
  if (typeof window.hubObterEstadoPerfilTelaAdmin !== 'function') {
    return { modo: '', id: '', etapa: 'dados' };
  }

  return window.hubObterEstadoPerfilTelaAdmin() || { modo: '', id: '', etapa: 'dados' };
}

function isActive() {
  const screenState = getProfileScreenState();
  return screenState.modo === 'editar' && screenState.etapa === 'permissoes' && Boolean(screenState.id);
}

function getProfilePermissionsContainer() {
  const shell = document.querySelector('.admin-profile-direct-shell');
  if (!shell) return null;
  return shell.querySelector('.admin-profile-direct-card');
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-profile-direct-card.is-profile-permissions-stable {
      padding: 0 !important;
      overflow: visible !important;
    }

    .admin-profile-permissions-stable {
      display: grid;
      grid-template-rows: auto auto auto;
      min-height: 0;
      color: var(--text-strong, #0f172a);
    }

    .admin-profile-permissions-stable-head,
    .admin-profile-permissions-stable-toolbar,
    .admin-profile-permissions-stable-footer {
      padding: 16px 20px;
      background: rgba(248, 250, 252, 0.78);
      border-color: rgba(148, 163, 184, 0.18);
    }

    body.dark .admin-profile-permissions-stable-head,
    body.dark .admin-profile-permissions-stable-toolbar,
    body.dark .admin-profile-permissions-stable-footer {
      background: rgba(15, 23, 42, 0.56);
      border-color: rgba(148, 163, 184, 0.16);
    }

    .admin-profile-permissions-stable-head {
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    }

    .admin-profile-permissions-stable-head h4 {
      margin: 0;
      font-size: 1.06rem;
      font-weight: 850;
      letter-spacing: -0.025em;
    }

    .admin-profile-permissions-stable-head p {
      margin: 5px 0 0;
      color: var(--text-muted, #64748b);
      font-size: 0.84rem;
    }

    .admin-profile-permissions-stable-toolbar,
    .admin-profile-permissions-stable-toolbar-group,
    .admin-profile-permissions-stable-footer,
    .admin-profile-permissions-stable-footer-actions,
    .admin-profile-permissions-stable-module-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }

    .admin-profile-permissions-stable-toolbar,
    .admin-profile-permissions-stable-footer {
      justify-content: space-between;
    }

    .admin-profile-permissions-stable-toolbar {
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
    }

    .admin-profile-permissions-stable-body {
      display: grid;
      align-content: start;
      gap: 14px;
      padding: 16px 20px 24px;
      min-height: 0;
      overflow: visible;
    }

    .admin-profile-permissions-stable-card {
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.72);
      overflow: hidden;
    }

    body.dark .admin-profile-permissions-stable-card {
      background: rgba(15, 23, 42, 0.36);
      border-color: rgba(148, 163, 184, 0.16);
    }

    .admin-profile-permissions-stable-module-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 58px;
      padding: 12px 14px;
      background: rgba(248, 250, 252, 0.72);
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
    }

    body.dark .admin-profile-permissions-stable-module-head {
      background: rgba(30, 41, 59, 0.42);
    }

    .admin-profile-permissions-stable-toggle {
      appearance: none;
      border: 0;
      background: transparent;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      color: var(--text-strong, #0f172a);
      font: inherit;
      font-weight: 820;
      text-align: left;
      cursor: pointer;
    }

    .admin-profile-permissions-stable-toggle span {
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

    .admin-profile-permissions-stable-table-wrap {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: visible;
    }

    .admin-profile-permissions-stable-card.is-collapsed .admin-profile-permissions-stable-table-wrap {
      display: none;
    }

    .admin-profile-permissions-stable-table {
      width: max-content;
      min-width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .admin-profile-permissions-stable-table th,
    .admin-profile-permissions-stable-table td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      text-align: center;
      vertical-align: middle;
      white-space: nowrap;
      font-size: 0.82rem;
    }

    .admin-profile-permissions-stable-table th:first-child,
    .admin-profile-permissions-stable-table td:first-child {
      position: sticky;
      left: 0;
      z-index: 2;
      text-align: left;
      min-width: 260px;
      max-width: 380px;
      white-space: normal;
      background: rgba(248, 250, 252, 0.98);
    }

    body.dark .admin-profile-permissions-stable-table th:first-child,
    body.dark .admin-profile-permissions-stable-table td:first-child {
      background: rgba(15, 23, 42, 0.98);
    }

    .admin-profile-permissions-stable-table th {
      color: var(--text-muted, #64748b);
      font-weight: 800;
      background: rgba(248, 250, 252, 0.84);
    }

    .admin-profile-permissions-stable-empty-cell {
      color: var(--text-muted, #94a3b8);
    }

    .admin-profile-permissions-stable-check input {
      width: 18px;
      height: 18px;
      accent-color: var(--cor-principal, #294895);
      cursor: pointer;
    }

    .admin-profile-permissions-stable-message {
      margin: 0;
      padding: 10px 12px;
      border-radius: 14px;
      background: rgba(41, 72, 149, 0.08);
      color: var(--text-strong, #0f172a);
      font-size: 0.84rem;
    }

    .admin-profile-permissions-stable-footer {
      position: sticky;
      bottom: 0;
      z-index: 30;
      border-top: 1px solid rgba(148, 163, 184, 0.18);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }

    .admin-profile-permissions-stable-status {
      margin: 0;
      color: var(--text-muted, #64748b);
      font-size: 0.82rem;
    }
  `;

  document.head.appendChild(style);
}

function getActionLabel(action) {
  const labels = {
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
  return labels[action] || action;
}

function getAvailableActions(resource) {
  const key = resource?.chave || '';
  const byResource = {
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
  return byResource[key] || ['view'];
}

function getResourceGroup(resource) {
  const key = resource?.chave || '';
  if (key.startsWith('admin')) return 'Administração';
  if (key === 'central_senhas') return 'Central de Senhas';
  if (key.startsWith('painel_ar')) return 'Painel AR';
  if (key.startsWith('links_')) return 'Links';
  return 'Outros';
}

function getActionOrder(action) {
  const order = {
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
  return order[action] || 999;
}

function buildModules() {
  const groups = {};

  resourcesCache.forEach(resource => {
    const groupName = getResourceGroup(resource);
    const groupKey = normalizeText(groupName) || 'outros';
    const actions = getAvailableActions(resource);

    groups[groupKey] ||= {
      key: groupKey,
      name: groupName,
      actions: [],
      rows: []
    };

    groups[groupKey].rows.push(resource);
    actions.forEach(action => {
      if (!groups[groupKey].actions.includes(action)) {
        groups[groupKey].actions.push(action);
      }
    });
  });

  return Object.values(groups)
    .map(group => ({
      ...group,
      actions: group.actions.sort((a, b) => getActionOrder(a) - getActionOrder(b)),
      rows: group.rows.sort((a, b) => String(a.rotulo_recurso || a.nome || a.chave).localeCompare(String(b.rotulo_recurso || b.nome || b.chave), 'pt-BR'))
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function mapProfilePermissions(profileId) {
  return permissionsCache.reduce((acc, item) => {
    if (item.perfil_id === profileId && item.permitido !== false) {
      acc[`${item.recurso_chave}:${item.acao}`] = true;
    }
    return acc;
  }, {});
}

function hasChanges(original, draft) {
  const keys = new Set([...Object.keys(original || {}), ...Object.keys(draft || {})]);
  return Array.from(keys).some(key => Boolean(original[key]) !== Boolean(draft[key]));
}

function getCurrentProfile() {
  return profilesCache.find(profile => profile.id === state.profileId) || {};
}

async function loadPermissions(profileId) {
  if (!profileId || loading) return;
  if (loadedProfileId === profileId && resourcesCache.length) return;

  try {
    loading = true;
    message = '';
    renderStablePermissions();

    const response = await chamarApi('listAdminPermissions');
    if (!response.ok) {
      throw new Error(response.message || 'Não foi possível carregar permissões do perfil.');
    }

    resourcesCache = response.data?.recursos || [];
    profilesCache = response.data?.perfis || [];
    permissionsCache = response.data?.permissoes || [];

    const modules = buildModules();
    const original = mapProfilePermissions(profileId);

    state.profileId = profileId;
    state.expanded = modules.reduce((acc, module) => {
      acc[module.key] = state.expanded?.[module.key] ?? true;
      return acc;
    }, {});
    state.original = original;
    state.draft = { ...original };
    state.dirty = false;
    loadedProfileId = profileId;
  } catch (error) {
    message = error.message || 'Erro ao carregar permissões do perfil.';
  } finally {
    loading = false;
  }
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;

  window.requestAnimationFrame(() => {
    renderQueued = false;
    renderStablePermissions();
  });
}

function getStatusText() {
  if (saving) return 'Salvando alterações...';
  if (state.dirty) return 'Há alterações não salvas.';
  return 'Nenhuma alteração pendente.';
}

function renderTable(module) {
  return `
    <div class="admin-profile-permissions-stable-table-wrap">
      <table class="admin-profile-permissions-stable-table">
        <thead>
          <tr>
            <th>Recurso</th>
            ${module.actions.map(action => `<th>${escapeHtml(getActionLabel(action))}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${module.rows.map(resource => `
            <tr>
              <td><strong>${escapeHtml(resource.rotulo_recurso || resource.nome || resource.chave)}</strong></td>
              ${module.actions.map(action => {
                if (!getAvailableActions(resource).includes(action)) {
                  return '<td class="admin-profile-permissions-stable-empty-cell">-</td>';
                }
                const key = `${resource.chave}:${action}`;
                return `
                  <td>
                    <label class="admin-profile-permissions-stable-check">
                      <input type="checkbox" data-action="toggle-permission" data-resource="${escapeAttr(resource.chave)}" data-permission-action="${escapeAttr(action)}" ${state.draft[key] ? 'checked' : ''} ${saving ? 'disabled' : ''}>
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

function renderModule(module) {
  const expanded = state.expanded?.[module.key] !== false;

  return `
    <article class="admin-profile-permissions-stable-card ${expanded ? 'is-open' : 'is-collapsed'}" data-module="${escapeAttr(module.key)}">
      <div class="admin-profile-permissions-stable-module-head">
        <button class="admin-profile-permissions-stable-toggle" type="button" data-action="toggle-module" data-module="${escapeAttr(module.key)}" aria-expanded="${expanded ? 'true' : 'false'}">
          <span aria-hidden="true">${expanded ? '-' : '+'}</span>
          <strong>${escapeHtml(module.name)}</strong>
        </button>
        <div class="admin-profile-permissions-stable-module-actions">
          <button class="filter-btn" type="button" data-action="grant-module" data-module="${escapeAttr(module.key)}" ${saving ? 'disabled' : ''}>Conceder tudo</button>
          <button class="filter-btn" type="button" data-action="remove-module" data-module="${escapeAttr(module.key)}" ${saving ? 'disabled' : ''}>Remover tudo</button>
        </div>
      </div>
      ${expanded ? renderTable(module) : ''}
    </article>
  `;
}

function renderView() {
  const profile = getCurrentProfile();
  const profileName = profile.nome || profile.slug || 'Perfil';
  const modules = buildModules();

  if (loading) {
    return `
      <section class="admin-profile-permissions-stable" data-stable-profile-permissions="true">
        <div class="admin-profile-permissions-stable-head">
          <div><h4>Permissões do perfil</h4><p>Carregando permissões-base...</p></div>
        </div>
        <div class="admin-profile-permissions-stable-body">
          <p class="quick-link-empty">Carregando permissões do perfil...</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="admin-profile-permissions-stable" data-stable-profile-permissions="true">
      <div class="admin-profile-permissions-stable-head">
        <div>
          <h4>Permissões do perfil</h4>
          <p>Permissões-base aplicadas ao perfil ${escapeHtml(profileName)}.</p>
        </div>
      </div>

      <div class="admin-profile-permissions-stable-toolbar">
        <div class="admin-profile-permissions-stable-toolbar-group">
          <button class="filter-btn" type="button" data-action="expand-all" ${saving ? 'disabled' : ''}>Expandir todos</button>
          <button class="filter-btn" type="button" data-action="collapse-all" ${saving ? 'disabled' : ''}>Recolher todos</button>
        </div>
        <div class="admin-profile-permissions-stable-toolbar-group">
          <button class="filter-btn" type="button" data-action="grant-all" ${saving ? 'disabled' : ''}>Conceder tudo</button>
          <button class="filter-btn" type="button" data-action="remove-all" ${saving ? 'disabled' : ''}>Remover tudo</button>
        </div>
      </div>

      <div class="admin-profile-permissions-stable-body">
        ${message ? `<p class="admin-profile-permissions-stable-message">${escapeHtml(message)}</p>` : ''}
        ${modules.length ? modules.map(renderModule).join('') : '<p class="quick-link-empty">Nenhum recurso disponível para permissões.</p>'}
      </div>

      <div class="admin-profile-permissions-stable-footer">
        <p class="admin-profile-permissions-stable-status">${escapeHtml(getStatusText())}</p>
        <div class="admin-profile-permissions-stable-footer-actions">
          <button class="secondary-btn" type="button" data-action="back-profile" ${saving ? 'disabled' : ''}>Voltar para perfil</button>
          <button class="save-btn" type="button" data-action="save" ${saving || !state.dirty ? 'disabled' : ''}>${saving ? 'Salvando...' : 'Salvar alterações'}</button>
        </div>
      </div>
    </section>
  `;
}

async function renderStablePermissions() {
  injectStyles();

  if (!isActive()) return;

  const screenState = getProfileScreenState();
  const container = getProfilePermissionsContainer();
  if (!container) return;

  container.classList.add('is-profile-permissions-stable');
  container.classList.remove('is-profile-permissions-direct');

  if (loadedProfileId !== screenState.id || !resourcesCache.length) {
    await loadPermissions(screenState.id);
  }

  container.innerHTML = renderView();
}

function setAllModules(expanded) {
  buildModules().forEach(module => {
    state.expanded[module.key] = Boolean(expanded);
  });
  queueRender();
}

function applyModule(moduleKey, granted) {
  const module = buildModules().find(item => item.key === moduleKey);
  if (!module) return;

  const draft = { ...state.draft };
  module.rows.forEach(resource => {
    getAvailableActions(resource).forEach(action => {
      const key = `${resource.chave}:${action}`;
      if (granted) draft[key] = true;
      else delete draft[key];
    });
  });

  state.draft = draft;
  state.dirty = hasChanges(state.original, draft);
  queueRender();
}

function applyAll(granted) {
  const draft = { ...state.draft };
  buildModules().forEach(module => {
    module.rows.forEach(resource => {
      getAvailableActions(resource).forEach(action => {
        const key = `${resource.chave}:${action}`;
        if (granted) draft[key] = true;
        else delete draft[key];
      });
    });
  });

  state.draft = draft;
  state.dirty = hasChanges(state.original, draft);
  queueRender();
}

function togglePermission(resourceKey, permissionAction, checked) {
  const key = `${resourceKey}:${permissionAction}`;
  const draft = { ...state.draft };

  if (checked) draft[key] = true;
  else delete draft[key];

  state.draft = draft;
  state.dirty = hasChanges(state.original, draft);
  queueRender();
}

async function savePermissions() {
  if (!state.profileId || saving) return;

  const keys = new Set([...Object.keys(state.original), ...Object.keys(state.draft)]);
  const changes = Array.from(keys)
    .map(key => {
      const [recurso_chave, acao] = key.split(':');
      return {
        recurso_chave,
        acao,
        anterior: Boolean(state.original[key]),
        proximo: Boolean(state.draft[key])
      };
    })
    .filter(item => item.anterior !== item.proximo);

  if (!changes.length) {
    state.dirty = false;
    message = 'Nenhuma alteração pendente.';
    queueRender();
    return;
  }

  try {
    saving = true;
    message = '';
    queueRender();

    const response = await chamarApi('saveAdminProfilePermissionsBatch', {
      perfil_id: state.profileId,
      alteracoes: changes.map(item => ({
        recurso_chave: item.recurso_chave,
        acao: item.acao,
        permitido: item.proximo
      }))
    });

    if (!response.ok) {
      throw new Error(response.message || 'Não foi possível salvar permissões do perfil.');
    }

    loadedProfileId = '';
    await loadPermissions(state.profileId);
    message = 'Permissões do perfil atualizadas.';
  } catch (error) {
    message = error.message || 'Erro ao salvar permissões do perfil.';
  } finally {
    saving = false;
    queueRender();
  }
}

function backToProfile() {
  if (state.dirty && !window.confirm('Existem alterações não salvas. Deseja voltar mesmo assim?')) {
    return;
  }

  const profileId = state.profileId || getProfileScreenState().id;
  message = '';
  if (typeof window.abrirTelaEditarPerfilAdmin === 'function') {
    window.abrirTelaEditarPerfilAdmin(profileId);
  }
}

function handleClick(event) {
  const scope = event.target?.closest?.('.admin-profile-permissions-stable');
  if (!scope || !isActive()) return;

  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const action = button.dataset.action;
  const moduleKey = button.dataset.module || '';

  if (action === 'toggle-module') {
    state.expanded[moduleKey] = !(state.expanded?.[moduleKey] !== false);
    queueRender();
  } else if (action === 'expand-all') {
    setAllModules(true);
  } else if (action === 'collapse-all') {
    setAllModules(false);
  } else if (action === 'grant-module') {
    applyModule(moduleKey, true);
  } else if (action === 'remove-module') {
    applyModule(moduleKey, false);
  } else if (action === 'grant-all') {
    applyAll(true);
  } else if (action === 'remove-all') {
    applyAll(false);
  } else if (action === 'save') {
    savePermissions();
  } else if (action === 'back-profile') {
    backToProfile();
  }
}

function handleChange(event) {
  const scope = event.target?.closest?.('.admin-profile-permissions-stable');
  if (!scope || !isActive()) return;

  const input = event.target;
  if (input?.dataset?.action !== 'toggle-permission') return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  togglePermission(input.dataset.resource || '', input.dataset.permissionAction || '', input.checked);
}

function scheduleRenderStable() {
  APPLY_DELAYS.forEach(delay => window.setTimeout(renderStablePermissions, delay));
}

function start() {
  injectStyles();
  scheduleRenderStable();
}

document.addEventListener('click', handleClick, true);
document.addEventListener('change', handleChange, true);
window.addEventListener('hubAdminPerfilTelaAtualizada', scheduleRenderStable);
window.addEventListener('hubAdminPerfilTelaRenderSolicitado', scheduleRenderStable);
window.addEventListener('load', start);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
