import { supabase, exigirSupabaseConfigurado } from './supabaseClient.js';

const STYLE_ID = 'admin-user-direct-screen-style';
let observerInstalled = false;
let rendering = false;
let loadingPermissionsFor = '';
let originalAbrirModalNovoRegistro = null;
let originalEditarUsuarioAdmin = null;
let originalFecharModalNovoRegistro = null;
let originalVoltarListaUsuariosAdmin = null;
let originalAbrirPermissoesUsuarioAdmin = null;
let originalSalvarPermissoesUsuarioAdmin = null;
let cachePerfis = [];
let cacheUsuarios = new Map();

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
  return typeof window.hubObterEstadoUsuarioTelaAdmin === 'function'
    ? window.hubObterEstadoUsuarioTelaAdmin()
    : { modo: '', id: '', etapa: 'dados' };
}

function definirEstadoTela(estado, options = {}) {
  if (typeof window.hubDefinirEstadoUsuarioTelaAdmin === 'function') {
    return window.hubDefinirEstadoUsuarioTelaAdmin(estado, options);
  }
  return estado;
}

function limparEstadoTelaDireta() {
  definirEstadoTela({ modo: '', id: '', etapa: 'dados' });
}

function obterPainelUsuarios() {
  return Array.from(document.querySelectorAll('.admin-panel')).find(panel => {
    const titulo = panel.querySelector('.admin-users-header-row h2, .admin-panel-header h2')?.textContent?.trim().toLowerCase();
    return titulo === 'usuários' || titulo === 'usuarios';
  }) || null;
}

function normalizarStatus(status = 'ativo') {
  const valor = String(status || '').trim().toLowerCase();
  if (['ativo', 'inativo', 'arquivado'].includes(valor)) return valor;
  if (valor === 'bloqueado' || valor === 'pendente') return 'inativo';
  return 'ativo';
}

function injetarEstilos() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-user-direct-hidden > .admin-panel-header,
    .admin-user-direct-hidden > .admin-message,
    .admin-user-direct-hidden > .quick-link-empty,
    .admin-user-direct-hidden > .crud-list,
    .admin-user-direct-hidden > .admin-users-pagination,
    .admin-user-direct-hidden > .modal-backdrop {
      display: none !important;
    }

    .admin-user-direct-shell {
      width: 100%;
      max-width: 1120px;
      margin: 18px auto 0;
      display: grid;
      gap: 18px;
      animation: adminUserDirectEnter 160ms ease-out;
    }

    @keyframes adminUserDirectEnter {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .admin-user-direct-header,
    .admin-user-direct-card {
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: rgba(255, 255, 255, 0.84);
      box-shadow: 0 22px 70px rgba(15, 23, 42, 0.10);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }

    body.dark .admin-user-direct-header,
    body.dark .admin-user-direct-card {
      background: rgba(15, 23, 42, 0.76);
      border-color: rgba(148, 163, 184, 0.18);
    }

    .admin-user-direct-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 22px;
      border-radius: 26px;
      position: relative;
      overflow: hidden;
    }

    .admin-user-direct-header::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at top left, rgba(41, 72, 149, 0.16), transparent 34%),
        radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.12), transparent 32%);
      pointer-events: none;
    }

    .admin-user-direct-header > * {
      position: relative;
      z-index: 1;
    }

    .admin-user-direct-header h3 {
      margin: 0;
      font-size: clamp(1.12rem, 1.6vw, 1.36rem);
      font-weight: 850;
      letter-spacing: -0.035em;
      color: var(--text-strong, #0f172a);
    }

    .admin-user-direct-header p {
      margin: 5px 0 0;
      max-width: 640px;
      color: var(--text-muted, #64748b);
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .admin-user-direct-card {
      border-radius: 28px;
      padding: 22px;
      display: grid;
      gap: 18px;
    }

    .admin-user-direct-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.75fr);
      gap: 18px;
      align-items: start;
    }

    .admin-user-direct-section {
      display: grid;
      gap: 14px;
      min-width: 0;
      border-radius: 24px;
      background: rgba(248, 250, 252, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.22);
      padding: 20px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.52);
    }

    body.dark .admin-user-direct-section {
      background: rgba(30, 41, 59, 0.48);
      border-color: rgba(148, 163, 184, 0.16);
    }

    .admin-user-direct-section h4 {
      margin: 0;
      color: var(--text-strong, #0f172a);
      font-size: 1.02rem;
      font-weight: 820;
      letter-spacing: -0.02em;
    }

    .admin-user-direct-section p {
      margin: 4px 0 0;
      color: var(--text-muted, #64748b);
      font-size: 0.82rem;
      line-height: 1.4;
    }

    .admin-user-direct-fields {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .admin-user-direct-section label {
      display: grid;
      gap: 7px;
      margin: 0;
      min-width: 0;
      align-content: start;
    }

    .admin-user-direct-section label span {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--text-muted, #64748b);
    }

    .admin-user-direct-section .config-input {
      width: 100%;
      min-width: 0;
      min-height: 42px;
      border-radius: 14px;
    }

    .admin-user-direct-actions,
    .admin-user-direct-inline-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .admin-user-direct-actions {
      justify-content: flex-end;
      border-top: 1px solid rgba(148, 163, 184, 0.18);
      padding-top: 16px;
    }

    .admin-user-direct-note {
      margin: 0;
      padding: 10px 12px;
      border-radius: 14px;
      background: rgba(41, 72, 149, 0.08);
      color: var(--text-muted, #64748b);
      font-size: 0.8rem;
    }

    .admin-user-direct-permissions .permission-modal-layout {
      max-height: none;
    }

    .admin-user-direct-permissions .permission-modal-content {
      max-height: min(68vh, 760px);
      overflow: auto;
      padding-right: 4px;
    }

    .admin-user-direct-permissions .admin-user-permissions-actions {
      position: sticky;
      bottom: 0;
      background: inherit;
      padding-top: 12px;
      margin-top: 12px;
      border-top: 1px solid rgba(148, 163, 184, 0.18);
    }

    @media (max-width: 980px) {
      .admin-user-direct-layout { grid-template-columns: 1fr; }
      .admin-user-direct-shell { max-width: 100%; }
    }

    @media (max-width: 760px) {
      .admin-user-direct-header { flex-direction: column; border-radius: 20px; }
      .admin-user-direct-header .secondary-btn { width: 100%; }
      .admin-user-direct-card { padding: 14px; border-radius: 20px; }
      .admin-user-direct-section { padding: 15px; border-radius: 20px; }
      .admin-user-direct-fields { grid-template-columns: 1fr; }
      .admin-user-direct-actions { flex-direction: column-reverse; align-items: stretch; }
      .admin-user-direct-actions .save-btn,
      .admin-user-direct-actions .secondary-btn { width: 100%; }
    }
  `;

  document.head.appendChild(style);
}

async function carregarPerfis() {
  if (cachePerfis.length) return cachePerfis;

  try {
    const client = exigirSupabaseConfigurado();
    const { data, error } = await client
      .from('perfis_acesso')
      .select('id, nome, slug, status')
      .order('nome', { ascending: true });

    if (error) throw error;
    cachePerfis = data || [];
  } catch (_erro) {
    cachePerfis = [];
  }

  return cachePerfis;
}

async function carregarUsuario(id) {
  if (!id) return {};
  if (cacheUsuarios.has(id)) return cacheUsuarios.get(id);

  try {
    const client = exigirSupabaseConfigurado();
    const { data, error } = await client
      .from('usuarios')
      .select('id, nome, email, perfil_id, status, cpf, telefone')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    cacheUsuarios.set(id, data || {});
  } catch (_erro) {
    cacheUsuarios.set(id, {});
  }

  return cacheUsuarios.get(id);
}

function invalidarCacheUsuario(id = '') {
  if (id) {
    cacheUsuarios.delete(id);
  } else {
    cacheUsuarios = new Map();
  }
}

function renderOptionsPerfis(perfis, perfilAtual = '') {
  const options = ['<option value="">Selecione</option>'];
  perfis
    .filter(perfil => perfil.status !== 'inativo' || perfil.id === perfilAtual)
    .forEach(perfil => {
      options.push(`<option value="${escapeAttr(perfil.id)}" ${perfil.id === perfilAtual ? 'selected' : ''}>${escapeHtml(perfil.nome || perfil.slug || 'Perfil')}</option>`);
    });
  return options.join('');
}

function renderOptionsStatus(statusAtual = 'ativo') {
  const atual = normalizarStatus(statusAtual);
  return ['ativo', 'inativo', 'arquivado'].map(status => `
    <option value="${status}" ${status === atual ? 'selected' : ''}>${status.charAt(0).toUpperCase()}${status.slice(1)}</option>
  `).join('');
}

function renderTelaDadosUsuario(estado, usuario, perfis) {
  const editando = estado.modo === 'editar';
  const usuarioId = editando ? estado.id : '';
  const prefixo = editando ? `usuario_${usuarioId}` : 'usuario_novo';

  return `
    <div class="admin-user-direct-layout">
      <section class="admin-user-direct-section">
        <div>
          <h4>Dados cadastrais</h4>
          <p>Informações básicas de identificação do usuário no Hub.</p>
        </div>
        <div class="admin-user-direct-fields">
          <label><span>Nome</span><input id="${prefixo}_nome" class="config-input" type="text" value="${escapeAttr(usuario.nome || '')}"></label>
          <label><span>E-mail</span><input id="${prefixo}_email" class="config-input" type="email" value="${escapeAttr(usuario.email || '')}"></label>
          <label><span>CPF</span><input id="${prefixo}_cpf" class="config-input" type="text" value="${escapeAttr(usuario.cpf || '')}" placeholder="000.000.000-00"></label>
          <label><span>Telefone</span><input id="${prefixo}_telefone" class="config-input" type="tel" value="${escapeAttr(usuario.telefone || '')}" placeholder="(00) 00000-0000"></label>
        </div>
      </section>

      <section class="admin-user-direct-section">
        <div>
          <h4>Acesso e permissões</h4>
          <p>Controle de perfil, status, senha e permissões adicionais.</p>
        </div>
        <label><span>Perfil</span><select id="${prefixo}_perfil" class="config-input">${renderOptionsPerfis(perfis, usuario.perfil_id || '')}</select></label>
        <label><span>Status</span><select id="${prefixo}_status" class="config-input">${renderOptionsStatus(usuario.status || 'ativo')}</select></label>
        <p class="admin-user-direct-note">Status padronizado com o Supabase: ativo, inativo ou arquivado. Para bloquear acesso, use inativo.</p>
        <label><span>${editando ? 'Nova senha administrativa' : 'Senha inicial'}</span><input id="${prefixo}_senha_admin" class="config-input" type="text" autocomplete="new-password" placeholder="${editando ? 'Opcional' : 'Gerar ou informar senha'}"></label>
        <div class="admin-user-direct-inline-actions">
          <button class="secondary-btn" type="button" onclick="hubAdminUsersGerarSenhaPhase5()">Gerar senha</button>
          ${editando ? `<button class="secondary-btn" type="button" onclick="abrirTelaPermissoesUsuarioAdmin('${escapeAttr(usuarioId)}')">Editar permissões</button>` : ''}
        </div>
      </section>
    </div>

    <div class="admin-user-direct-actions">
      <button class="secondary-btn" type="button" onclick="voltarListaUsuariosAdmin()">Voltar</button>
      <button class="save-btn" type="button" onclick="salvarUsuarioAdmin('${escapeAttr(usuarioId)}')">Salvar</button>
    </div>
  `;
}

function obterHtmlPermissoesLegadas() {
  const modal = document.querySelector('.admin-user-modal.is-permissions-stage');
  const conteudo = modal?.querySelector('.permission-modal-layout')?.outerHTML || '';
  const acoes = modal?.querySelector('.admin-user-permissions-actions')?.outerHTML || '';

  if (!conteudo) {
    return '';
  }

  return `${conteudo}${acoes}`;
}

function renderTelaPermissoesUsuario(estado) {
  const htmlPermissoes = obterHtmlPermissoesLegadas();

  return `
    <section class="admin-user-direct-section admin-user-direct-permissions">
      <div>
        <h4>Permissões adicionais</h4>
        <p>Gerencie as permissões específicas deste usuário mantendo as regras atuais de herança do perfil.</p>
      </div>
      ${htmlPermissoes || '<p class="quick-link-empty">Carregando permissões do usuário...</p>'}
      <div class="admin-user-direct-actions">
        <button class="secondary-btn" type="button" onclick="abrirTelaEditarUsuarioAdmin('${escapeAttr(estado.id)}')">Voltar para usuário</button>
      </div>
    </section>
  `;
}

async function sincronizarPermissoesLegadas(estado) {
  if (estado.etapa !== 'permissoes' || !estado.id) return;
  if (obterHtmlPermissoesLegadas()) return;
  if (loadingPermissionsFor === estado.id) return;
  if (typeof originalAbrirPermissoesUsuarioAdmin !== 'function') return;

  loadingPermissionsFor = estado.id;
  try {
    await originalAbrirPermissoesUsuarioAdmin(estado.id, { manterMensagem: true });
  } finally {
    loadingPermissionsFor = '';
    window.requestAnimationFrame(renderizarTelaDireta);
  }
}

async function renderizarTelaDireta() {
  if (rendering) return;
  const estado = obterEstadoTela();
  const painel = obterPainelUsuarios();

  injetarEstilos();

  if (!painel) return;

  if (!estado.modo) {
    painel.classList.remove('admin-user-direct-hidden');
    painel.querySelector('.admin-user-direct-shell')?.remove();
    return;
  }

  rendering = true;

  try {
    painel.classList.add('admin-user-direct-hidden');
    painel.querySelector('.admin-user-direct-shell')?.remove();

    const [perfis, usuario] = await Promise.all([
      carregarPerfis(),
      carregarUsuario(estado.id)
    ]);

    const titulo = estado.etapa === 'permissoes'
      ? 'Permissões do usuário'
      : estado.modo === 'editar'
        ? 'Editar usuário'
        : 'Adicionar usuário';
    const descricao = estado.etapa === 'permissoes'
      ? 'Gerencie as permissões adicionais deste usuário.'
      : 'Preencha os dados cadastrais e de acesso do usuário.';

    const shell = document.createElement('div');
    shell.className = 'admin-user-direct-shell';
    shell.innerHTML = `
      <div class="admin-user-direct-header">
        <div>
          <h3>${escapeHtml(titulo)}</h3>
          <p>${escapeHtml(descricao)}</p>
        </div>
        <button class="secondary-btn" type="button" onclick="voltarListaUsuariosAdmin()">Voltar para lista</button>
      </div>
      <section class="admin-user-direct-card">
        ${estado.etapa === 'permissoes'
          ? renderTelaPermissoesUsuario(estado)
          : renderTelaDadosUsuario(estado, usuario || {}, perfis)}
      </section>
    `;

    painel.appendChild(shell);
  } finally {
    rendering = false;
  }

  sincronizarPermissoesLegadas(estado);
}

function instalarOverrides() {
  if (!originalAbrirModalNovoRegistro && typeof window.abrirModalNovoRegistro === 'function') {
    originalAbrirModalNovoRegistro = window.abrirModalNovoRegistro;
    window.abrirModalNovoRegistro = function abrirModalNovoRegistroDireto(entidade) {
      if (entidade === 'usuarios') {
        window.abrirTelaNovoUsuarioAdmin?.();
        return;
      }
      return originalAbrirModalNovoRegistro.apply(this, arguments);
    };
  }

  if (!originalEditarUsuarioAdmin && typeof window.editarUsuarioAdmin === 'function') {
    originalEditarUsuarioAdmin = window.editarUsuarioAdmin;
    window.editarUsuarioAdmin = function editarUsuarioAdminDireto(id) {
      window.abrirTelaEditarUsuarioAdmin?.(id);
    };
  }

  if (!originalFecharModalNovoRegistro && typeof window.fecharModalNovoRegistro === 'function') {
    originalFecharModalNovoRegistro = window.fecharModalNovoRegistro;
    window.fecharModalNovoRegistro = function fecharModalNovoRegistroDireto() {
      const estado = obterEstadoTela();
      if (estado.modo) {
        limparEstadoTelaDireta();
        return;
      }
      return originalFecharModalNovoRegistro.apply(this, arguments);
    };
  }

  if (!originalVoltarListaUsuariosAdmin && typeof window.voltarListaUsuariosAdmin === 'function') {
    originalVoltarListaUsuariosAdmin = window.voltarListaUsuariosAdmin;
    window.voltarListaUsuariosAdmin = function voltarListaUsuariosAdminDireto() {
      if (typeof originalFecharModalNovoRegistro === 'function') {
        originalFecharModalNovoRegistro();
      }
      return originalVoltarListaUsuariosAdmin.apply(this, arguments);
    };
  }

  if (!originalAbrirPermissoesUsuarioAdmin && typeof window.abrirPermissoesUsuarioAdmin === 'function') {
    originalAbrirPermissoesUsuarioAdmin = window.abrirPermissoesUsuarioAdmin;
  }

  if (!originalSalvarPermissoesUsuarioAdmin && typeof window.salvarPermissoesUsuarioAdmin === 'function') {
    originalSalvarPermissoesUsuarioAdmin = window.salvarPermissoesUsuarioAdmin;
    window.salvarPermissoesUsuarioAdmin = async function salvarPermissoesUsuarioDireto(usuarioId, fecharAoSalvar = false) {
      const resultado = await originalSalvarPermissoesUsuarioAdmin.apply(this, arguments);
      if (fecharAoSalvar) {
        limparEstadoTelaDireta();
      } else {
        window.requestAnimationFrame(renderizarTelaDireta);
      }
      return resultado;
    };
  }
}

function instalarObserver() {
  if (observerInstalled) return;
  observerInstalled = true;

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(() => {
      instalarOverrides();
      renderizarTelaDireta();
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function iniciar() {
  if (!supabase) return;
  instalarOverrides();
  injetarEstilos();
  instalarObserver();
  renderizarTelaDireta();
}

window.addEventListener('hubAdminUsuarioTelaAtualizada', renderizarTelaDireta);
window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', renderizarTelaDireta);
window.addEventListener('hubAdminUsuariosAtualizados', event => invalidarCacheUsuario(event?.detail?.id || ''));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
