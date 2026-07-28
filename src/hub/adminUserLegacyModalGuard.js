const INSTALL_DELAYS = [0, 80, 180, 360, 700, 1200, 1800];
const WRAPPED_FLAG = '__hubAdminUserLegacyGuardWrapped';

let originalOpenRecordModal = null;
let originalEditUser = null;
let originalOpenUserPermissions = null;

function getUserScreenState() {
  if (typeof window.hubObterEstadoUsuarioTelaAdmin !== 'function') {
    return { modo: '', id: '', etapa: 'dados' };
  }

  return window.hubObterEstadoUsuarioTelaAdmin() || { modo: '', id: '', etapa: 'dados' };
}

function isUserScreenOpen() {
  const state = getUserScreenState();
  return Boolean(state.modo);
}

function openNewUserScreen() {
  if (typeof window.abrirTelaNovoUsuarioAdmin === 'function') {
    window.abrirTelaNovoUsuarioAdmin();
    return true;
  }
  return false;
}

function openEditUserScreen(userId = '') {
  if (typeof window.abrirTelaEditarUsuarioAdmin === 'function') {
    window.abrirTelaEditarUsuarioAdmin(userId);
    return true;
  }
  return false;
}

function openUserPermissionsScreen(userId = '') {
  if (typeof window.abrirTelaPermissoesUsuarioAdmin === 'function') {
    window.abrirTelaPermissoesUsuarioAdmin(userId);
    return true;
  }
  return false;
}

function shouldRouteUsersEntity(entity = '') {
  const normalized = String(entity || '').trim().toLowerCase();
  return normalized === 'usuarios' || normalized === 'usuario';
}

function installOpenRecordModalGuard() {
  if (typeof window.abrirModalNovoRegistro !== 'function') return;
  if (window.abrirModalNovoRegistro[WRAPPED_FLAG]) return;

  originalOpenRecordModal = originalOpenRecordModal || window.abrirModalNovoRegistro;

  function abrirModalNovoRegistroGuard(entity, ...args) {
    if (shouldRouteUsersEntity(entity) && openNewUserScreen()) {
      return;
    }

    return originalOpenRecordModal.apply(this, [entity, ...args]);
  }

  abrirModalNovoRegistroGuard[WRAPPED_FLAG] = true;
  window.abrirModalNovoRegistro = abrirModalNovoRegistroGuard;
}

function installEditUserGuard() {
  if (typeof window.editarUsuarioAdmin !== 'function') return;
  if (window.editarUsuarioAdmin[WRAPPED_FLAG]) return;

  originalEditUser = originalEditUser || window.editarUsuarioAdmin;

  function editarUsuarioAdminGuard(userId = '', ...args) {
    if (openEditUserScreen(userId)) {
      return;
    }

    return originalEditUser.apply(this, [userId, ...args]);
  }

  editarUsuarioAdminGuard[WRAPPED_FLAG] = true;
  window.editarUsuarioAdmin = editarUsuarioAdminGuard;
}

function installUserPermissionsGuard() {
  if (typeof window.abrirPermissoesUsuarioAdmin !== 'function') return;
  if (window.abrirPermissoesUsuarioAdmin[WRAPPED_FLAG]) return;

  originalOpenUserPermissions = originalOpenUserPermissions || window.abrirPermissoesUsuarioAdmin;

  function abrirPermissoesUsuarioAdminGuard(userId = '', options = {}, ...args) {
    if (options?.permitirModalLegado === true || options?.legacyModal === true) {
      return originalOpenUserPermissions.apply(this, [userId, options, ...args]);
    }

    if (openUserPermissionsScreen(userId)) {
      return;
    }

    return originalOpenUserPermissions.apply(this, [userId, options, ...args]);
  }

  abrirPermissoesUsuarioAdminGuard[WRAPPED_FLAG] = true;
  window.abrirPermissoesUsuarioAdmin = abrirPermissoesUsuarioAdminGuard;
}

function installLegacyModalGuards() {
  installOpenRecordModalGuard();
  installEditUserGuard();
  installUserPermissionsGuard();
}

function scheduleLegacyModalGuards() {
  INSTALL_DELAYS.forEach(delay => window.setTimeout(installLegacyModalGuards, delay));
}

window.addEventListener('hubAdminUsuarioTelaAtualizada', scheduleLegacyModalGuards);
window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', scheduleLegacyModalGuards);
window.addEventListener('load', scheduleLegacyModalGuards);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleLegacyModalGuards);
} else {
  scheduleLegacyModalGuards();
}
