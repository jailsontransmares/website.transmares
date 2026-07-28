import { chamarApi } from './api.js';

const STYLE_ID = 'admin-profile-direct-screen-style';

let renderScheduled = false;
let rendering = false;
let saving = false;
let message = '';
let cachePerfis = [];

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

function obterEstadoTela() {
  return typeof window.hubObterEstadoPerfilTelaAdmin === 'function'
    ? window.hubObterEstadoPerfilTelaAdmin()
    : { modo: '', id: '', etapa: 'dados' };
}

function definirEstadoTela(estado, options = {}) {
  if (typeof window.hubDefinirEstadoPerfilTelaAdmin === 'function') {
    return window.hubDefinirEstadoPerfilTelaAdmin(estado, options);
  }

  return estado;
}

function obterPainelPerfis() {
  return Array.from(document.querySelectorAll('.admin-panel')).find(panel => {
    const titulo = panel.querySelector('.admin-profiles-header-row h2, .admin-panel-header h2')?.textContent?.trim().toLowerCase();
    return titulo === 'perfis de acesso' || titulo === 'perfis';
  }) || null;
}

function normalizarStatus(status = 'ativo') {
  return String(status || '').trim().toLowerCase() === 'inativo' ? 'inativo' : 'ativo';
}

function injetarEstilos() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-profile-direct-hidden > .admin-panel-header,
    .admin-profile-direct-hidden > .admin-message,
    .admin-profile-direct-hidden > .quick-link-empty,
    .admin-profile-direct-hidden > .crud-list,
    .admin-profile-direct-hidden > .admin-users-pagination,
    .admin-profile-direct-hidden > .admin-profiles-pagination,
    .admin-profile-direct-hidden > .modal-backdrop {
      display: none !important;
    }

    .admin-profile-direct-shell {
      width: 100%;
      max-width: 1120px;
      margin: 18px auto 0;
      display: grid;
      gap: 18px;
      animation: adminProfileDirectEnter 160ms ease-out;
    }

    @keyframes adminProfileDirectEnter {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .admin-profile-direct-header,
    .admin-profile-direct-card {
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: rgba(255, 255, 255, 0.84);
      box-shadow: 0 22px 70px rgba(15, 23, 42, 0.10);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }

    body.dark .admin-profile-direct-header,
    body.dark .admin-profile-direct-card {
      background: rgba(15, 23, 42, 0.76);
      border-color: rgba(148, 163, 184, 0.18);
    }

    .admin-profile-direct-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 22px;
      border-radius: 26px;
      position: relative;
      overflow: hidden;
    }

    .admin-profile-direct-header::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at top left, rgba(41, 72, 149, 0.16), transparent 34%),
        radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.12), transparent 32%);
      pointer-events: none;
    }

    .admin-profile-direct-header > * {
      position: relative;
      z-index: 1;
    }

    .admin-profile-direct-header h3 {
      margin: 0;
      font-size: clamp(1.12rem, 1.6vw, 1.36rem);
      font-weight: 850;
      letter-spacing: -0.035em;
      color: var(--text-strong, #0f172a);
    }

    .admin-profile-direct-header p {
      margin: 5px 0 0;
      max-width: 640px;
      color: var(--text-muted, #64748b);
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .admin-profile-direct-card {
      border-radius: 28px;
      padding: 22px;
      display: grid;
      gap: 18px;
    }

    .admin-profile-direct-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.75fr);
      gap: 18px;
      align-items: start;
    }

    .admin-profile-direct-section {
      display: grid;
      gap: 14px;
      min-width: 0;
      border-radius: 24px;
      background: rgba(248, 250, 252, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.22);
      padding: 20px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.52);
    }

    body.dark .admin-profile-direct-section {
      background: rgba(30, 41, 59, 0.48);
      border-color: rgba(148, 163, 184, 0.16);
    }

    .admin-profile-direct-section h4 {
      margin: 0;
      color: var(--text-strong, #0f172a);
      font-size: 1.02rem;
      font-weight: 820;
      letter-spacing: -0.02em;
    }

    .admin-profile-direct-section p {
      margin: 4px 0 0;
      color: var(--text-muted, #64748b);
      font-size: 0.82rem;
      line-height: 1.4;
    }

    .admin-profile-direct-fields {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .admin-profile-direct-section label {
      display: grid;
      gap: 7px;
      margin: 0;
      min-width: 0;
      align-content: start;
    }

    .admin-profile-direct-section label span,
    .admin-profile-direct-kpi span {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--text-muted, #64748b);
    }

    .admin-profile-direct-section .config-input {
      width: 100%;
      min-width: 0;
      min-height: 42px;
      border-radius: 14px;
    }

    .admin-profile-direct-actions,
    .admin-profile-direct-inline-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .admin-profile-direct-actions {
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(148, 163, 184, 0.18);
      padding-top: 16px;
    }

    .admin-profile-direct-actions-right {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-end;
    }

    .admin-profile-direct-note {
      margin: 0;
      padding: 10px 12px;
      border-radius: 14px;
      background: rgba(41, 72, 149, 0.08);
      color: var(--text-muted, #64748b);
      font-size: 0.8rem;
    }

    .admin-profile-direct-message {
      margin: 0;
      padding: 12px 14px;
      border-radius: 16px;
      background: rgba(41, 72, 149, 0.08);
      color: var(--text-strong, #0f172a);
      font-size: 0.88rem;
    }

    .admin-profile-direct-kpis {
      display: grid;
      gap: 10px;
    }

    .admin-profile-direct-kpi {
      display: grid;
      gap: 4px;
      padding: 12px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.62);
      border: 1px solid rgba(148, 163, 184, 0.18);
    }

    body.dark .admin-profile-direct-kpi {
      background: rgba(15, 23, 42, 0.38);
    }

    .admin-profile-direct-kpi strong {
      color: var(--text-strong, #0f172a);
      font-size: 0.94rem;
    }

    @media (max-width: 980px) {
      .admin-profile-direct-layout { grid-template-columns: 1fr; }
      .admin-profile-direct-shell { max-width: 100%; }
    }

    @media (max-width: 760px) {
      .admin-profile-direct-header { flex-direction: column; border-radius: 20px; }
      .admin-profile-direct-header .secondary-btn { width: 100%; }
      .admin-profile-direct-card { padding: 14px; border-radius: 20px; }
      .admin-profile-direct-section { padding: 15px; border-radius: 20px; }
      .admin-profile-direct-fields { grid-template-columns: 1fr; }
      .admin-profile-direct-actions { flex-direction: column-reverse; align-items: stretch; }
      .admin-profile-direct-actions-right,
      .admin-profile-direct-actions .save-btn,
      .admin-profile-direct-actions .secondary-btn { width: 100%; }
    }
  `;

  document.head.appendChild(style);
}

async function carregarPerfis() {
  try {
    const response = await chamarApi('listAdminProfiles');
    if (!response.ok) {
      throw new Error(response.message || 'Não foi possível carregar perfis.');
    }

    cachePerfis = response.data?.records || [];
  } catch (_erro) {
    cachePerfis = [];
  }

  return cachePerfis;
}

function obterPerfil(id = '') {
  if (!id) return {};
  return cachePerfis.find(perfil => perfil.id === id) || {};
}

function renderOptionsStatus(statusAtual = 'ativo') {
  const atual = normalizarStatus(statusAtual);
  return ['ativo', 'inativo'].map(status => `
    <option value="${status}" ${status === atual ? 'selected' : ''}>${status.charAt(0).toUpperCase()}${status.slice(1)}</option>
  `).join('');
}

function obterValorCampo(id = '') {
  return document.getElementById(id)?.value || '';
}

function obterPayloadPerfil(id = '') {
  const prefixo = id ? `perfil_${id}` : 'perfil_novo';

  return {
    id: id || '',
    slug: obterValorCampo(`${prefixo}_slug`).trim(),
    nome: obterValorCampo(`${prefixo}_nome`).trim(),
    descricao: obterValorCampo(`${prefixo}_descricao`).trim(),
    nivel: '20',
    status: normalizarStatus(obterValorCampo(`${prefixo}_status`) || 'ativo')
  };
}

function validarPayloadPerfil(payload) {
  if (!payload.slug) return 'Informe o identificador do perfil.';
  if (!payload.nome) return 'Informe o nome do perfil.';
  return '';
}

async function recarregarListaPerfis() {
  if (typeof window.carregarPerfisAdmin === 'function') {
    await window.carregarPerfisAdmin();
    return;
  }

  if (typeof window.renderAdministracao === 'function') {
    window.renderAdministracao();
  }
}

async function salvarPerfilTelaDireta(id = '') {
  const payload = obterPayloadPerfil(id);
  const erroValidacao = validarPayloadPerfil(payload);

  if (erroValidacao) {
    message = erroValidacao;
    agendarRenderizacaoDireta();
    return;
  }

  try {
    saving = true;
    message = '';
    agendarRenderizacaoDireta();

    const response = await chamarApi('saveAdminProfile', payload);
    if (!response.ok) {
      throw new Error(response.message || 'Não foi possível salvar o perfil.');
    }

    saving = false;
    message = '';
    definirEstadoTela({ modo: '', id: '', etapa: 'dados' }, { render: false });
    await recarregarListaPerfis();
  } catch (erro) {
    saving = false;
    message = erro.message || 'Erro ao salvar perfil.';
    agendarRenderizacaoDireta();
  }
}

async function excluirPerfilTelaDireta(id = '') {
  const perfil = obterPerfil(id);
  const nomePerfil = perfil.nome || perfil.slug || 'este perfil';

  if (!id) {
    message = 'Perfil não identificado para exclusão.';
    agendarRenderizacaoDireta();
    return;
  }

  if (perfil.sistema) {
    message = 'Perfis do sistema não podem ser excluídos.';
    agendarRenderizacaoDireta();
    return;
  }

  if (!window.confirm(`Excluir o perfil "${nomePerfil}"? Esta ação não pode ser desfeita.`)) {
    return;
  }

  try {
    saving = true;
    message = '';
    agendarRenderizacaoDireta();

    const response = await chamarApi('deleteAdminProfile', { id });
    if (!response.ok) {
      throw new Error(response.message || 'Não foi possível excluir o perfil.');
    }

    saving = false;
    message = '';
    definirEstadoTela({ modo: '', id: '', etapa: 'dados' }, { render: false });
    await recarregarListaPerfis();
  } catch (erro) {
    saving = false;
    message = erro.message || 'Erro ao excluir perfil.';
    agendarRenderizacaoDireta();
  }
}

function renderTelaDadosPerfil(estado, perfil) {
  const editando = estado.modo === 'editar';
  const perfilId = editando ? estado.id : '';
  const prefixo = editando ? `perfil_${perfilId}` : 'perfil_novo';
  const slug = editando ? (perfil.slug || '') : '';
  const nome = editando ? (perfil.nome || '') : '';
  const descricao = editando ? (perfil.descricao || '') : '';
  const status = normalizarStatus(editando ? perfil.status || 'ativo' : 'ativo');
  const totalPermissoes = Number(perfil.permissoes_ativas ?? perfil.total_permissoes ?? perfil.permissoes_base ?? 0) || 0;

  return `
    ${message ? `<p class="admin-profile-direct-message">${escapeHtml(message)}</p>` : ''}

    <div class="admin-profile-direct-layout">
      <section class="admin-profile-direct-section">
        <div>
          <h4>Dados do perfil</h4>
          <p>Defina a identificação, descrição e status deste perfil de acesso.</p>
        </div>

        <div class="admin-profile-direct-fields">
          <label>
            <span>Identificador</span>
            <input id="${prefixo}_slug" class="config-input" type="text" value="${escapeAttr(slug)}" placeholder="ex: financeiro" ${editando ? 'readonly' : ''}>
          </label>
          <label>
            <span>Status</span>
            <select id="${prefixo}_status" class="config-input">${renderOptionsStatus(status)}</select>
          </label>
          <label>
            <span>Nome</span>
            <input id="${prefixo}_nome" class="config-input" type="text" value="${escapeAttr(nome)}" placeholder="Nome do perfil">
          </label>
          <label>
            <span>Descrição</span>
            <input id="${prefixo}_descricao" class="config-input" type="text" value="${escapeAttr(descricao)}" placeholder="Descrição do perfil">
          </label>
        </div>

        ${editando ? '<p class="admin-profile-direct-note">O identificador do perfil é mantido como somente leitura para preservar vínculos e permissões existentes.</p>' : ''}
      </section>

      <section class="admin-profile-direct-section">
        <div>
          <h4>Permissões-base</h4>
          <p>As permissões do perfil serão abertas em tela contínua na próxima etapa da migração.</p>
        </div>

        <div class="admin-profile-direct-kpis">
          <div class="admin-profile-direct-kpi">
            <span>Permissões atuais</span>
            <strong>${editando ? `${totalPermissoes} permissão${totalPermissoes === 1 ? '' : 'ões'}-base` : 'Disponível após salvar'}</strong>
          </div>
          <div class="admin-profile-direct-kpi">
            <span>Fluxo</span>
            <strong>${editando ? 'Editar perfil → editar permissões' : 'Salvar perfil → editar permissões'}</strong>
          </div>
        </div>

        ${editando ? `
          <div class="admin-profile-direct-inline-actions">
            <button class="secondary-btn" type="button" onclick="abrirTelaPermissoesPerfilAdmin('${escapeAttr(perfilId)}')">Editar permissões</button>
          </div>
        ` : '<p class="admin-profile-direct-note">Salve o perfil antes de definir permissões-base.</p>'}
      </section>
    </div>

    <div class="admin-profile-direct-actions">
      <div>
        ${editando ? `<button class="secondary-btn danger" type="button" onclick="hubAdminProfileDirectExcluirPerfil('${escapeAttr(perfilId)}')" ${perfil.sistema ? 'disabled title="Perfis do sistema não podem ser excluídos"' : ''}>Excluir perfil</button>` : ''}
      </div>
      <div class="admin-profile-direct-actions-right">
        <button class="secondary-btn" type="button" onclick="voltarListaPerfisAdmin()" ${saving ? 'disabled' : ''}>Voltar</button>
        <button class="save-btn" type="button" onclick="hubAdminProfileDirectSalvarPerfil('${escapeAttr(perfilId)}')" ${saving ? 'disabled' : ''}>${saving ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </div>
  `;
}

function renderTelaPermissoesPerfil(estado) {
  return `
    <section class="admin-profile-direct-section">
      <div>
        <h4>Permissões do perfil</h4>
        <p>A tela contínua de permissões do perfil será migrada na próxima fase. Por enquanto, volte aos dados do perfil.</p>
      </div>
      <div class="admin-profile-direct-actions">
        <div></div>
        <div class="admin-profile-direct-actions-right">
          <button class="secondary-btn" type="button" onclick="abrirTelaEditarPerfilAdmin('${escapeAttr(estado.id)}')">Voltar para perfil</button>
        </div>
      </div>
    </section>
  `;
}

function agendarRenderizacaoDireta() {
  if (renderScheduled) return;
  renderScheduled = true;

  window.requestAnimationFrame(() => {
    renderScheduled = false;
    renderizarTelaDireta();
  });
}

async function renderizarTelaDireta() {
  if (rendering) return;
  const estado = obterEstadoTela();
  const painel = obterPainelPerfis();

  injetarEstilos();

  if (!painel) return;

  if (!estado.modo) {
    painel.classList.remove('admin-profile-direct-hidden');
    painel.querySelector('.admin-profile-direct-shell')?.remove();
    return;
  }

  rendering = true;

  try {
    painel.classList.add('admin-profile-direct-hidden');
    painel.querySelector('.admin-profile-direct-shell')?.remove();

    const perfis = await carregarPerfis();
    const perfil = estado.modo === 'editar'
      ? obterPerfil(estado.id)
      : {};

    const titulo = estado.etapa === 'permissoes'
      ? 'Permissões do perfil'
      : estado.modo === 'editar'
        ? 'Editar perfil'
        : 'Adicionar perfil';
    const descricao = estado.etapa === 'permissoes'
      ? 'Gerencie as permissões-base deste perfil de acesso.'
      : 'Preencha os dados cadastrais e de acesso do perfil.';

    const shell = document.createElement('div');
    shell.className = 'admin-profile-direct-shell';
    shell.innerHTML = `
      <div class="admin-profile-direct-header">
        <div>
          <h3>${escapeHtml(titulo)}</h3>
          <p>${escapeHtml(descricao)}</p>
        </div>
        <button class="secondary-btn" type="button" onclick="voltarListaPerfisAdmin()" ${saving ? 'disabled' : ''}>Voltar para lista</button>
      </div>
      <section class="admin-profile-direct-card">
        ${estado.etapa === 'permissoes'
          ? renderTelaPermissoesPerfil(estado)
          : renderTelaDadosPerfil(estado, perfil, perfis)}
      </section>
    `;

    painel.appendChild(shell);
  } finally {
    rendering = false;
  }
}

function iniciar() {
  window.hubAdminProfileDirectSalvarPerfil = salvarPerfilTelaDireta;
  window.hubAdminProfileDirectExcluirPerfil = excluirPerfilTelaDireta;
  injetarEstilos();
  agendarRenderizacaoDireta();
}

window.addEventListener('hubAdminPerfilTelaAtualizada', agendarRenderizacaoDireta);
window.addEventListener('hubAdminPerfilTelaRenderSolicitado', agendarRenderizacaoDireta);
window.addEventListener('load', agendarRenderizacaoDireta);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
