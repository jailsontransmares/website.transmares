const INSTALL_DELAYS = [0, 80, 180, 360, 700, 1200, 1800];
const WRAPPED_FLAG = '__hubAdminProfileLegacyGuardWrapped';

let originalOpenRecordModal = null;
let originalEditProfile = null;
let originalOpenProfilePermissions = null;
let originalCloseRecordModal = null;

function getProfileScreenState() {
  if (typeof window.hubObterEstadoPerfilTelaAdmin !== 'function') {
    return { modo: '', id: '', etapa: 'dados' };
  }

  return window.hubObterEstadoPerfilTelaAdmin() || { modo: '', id: '', etapa: 'dados' };
}

function isProfileScreenOpen() {
  return Boolean(getProfileScreenState().modo);
}

function openNewProfileScreen() {
  if (typeof window.abrirTelaNovoPerfilAdmin === 'function') {
    window.abrirTelaNovoPerfilAdmin();
    return true;
  }

  return false;
}

function openEditProfileScreen(profileId = '') {
  if (typeof window.abrirTelaEditarPerfilAdmin === 'function') {
    window.abrirTelaEditarPerfilAdmin(profileId);
    return true;
  }

  return false;
}

function openProfilePermissionsScreen(profileId = '') {
  if (typeof window.abrirTelaPermissoesPerfilAdmin === 'function') {
    window.abrirTelaPermissoesPerfilAdmin(profileId);
    return true;
  }

  return false;
}

function shouldRouteProfilesEntity(entity = '') {
  const normalized = String(entity || '').trim().toLowerCase();
  return normalized === 'perfis' || normalized === 'perfil' || normalized === 'perfis_acesso';
}

function installOpenRecordModalGuard() {
  if (typeof window.abrirModalNovoRegistro !== 'function') return;
  if (window.abrirModalNovoRegistro[WRAPPED_FLAG]) return;

  originalOpenRecordModal = originalOpenRecordModal || window.abrirModalNovoRegistro;

  function abrirModalNovoRegistroProfileGuard(entity, ...args) {
    if (shouldRouteProfilesEntity(entity) && openNewProfileScreen()) {
      return;
    }

    return originalOpenRecordModal.apply(this, [entity, ...args]);
  }

  abrirModalNovoRegistroProfileGuard[WRAPPED_FLAG] = true;
  abrirModalNovoRegistroProfileGuard.__original = originalOpenRecordModal;
  window.abrirModalNovoRegistro = abrirModalNovoRegistroProfileGuard;
}

function installEditProfileGuard() {
  if (typeof window.editarPerfilAdmin !== 'function') return;
  if (window.editarPerfilAdmin[WRAPPED_FLAG]) return;

  originalEditProfile = originalEditProfile || window.editarPerfilAdmin;

  function editarPerfilAdminProfileGuard(profileId = '', ...args) {
    if (openEditProfileScreen(profileId)) {
      return;
    }

    return originalEditProfile.apply(this, [profileId, ...args]);
  }

  editarPerfilAdminProfileGuard[WRAPPED_FLAG] = true;
  editarPerfilAdminProfileGuard.__original = originalEditProfile;
  window.editarPerfilAdmin = editarPerfilAdminProfileGuard;
}

function installOpenProfilePermissionsGuard() {
  if (typeof window.abrirPermissoesPerfilAdmin !== 'function') return;
  if (window.abrirPermissoesPerfilAdmin[WRAPPED_FLAG]) return;

  originalOpenProfilePermissions = originalOpenProfilePermissions || window.abrirPermissoesPerfilAdmin;

  function abrirPermissoesPerfilAdminProfileGuard(profileId = '', options = {}, ...args) {
    if (options?.permitirModalLegado === true || options?.legacyModal === true) {
      return originalOpenProfilePermissions.apply(this, [profileId, options, ...args]);
    }

    if (openProfilePermissionsScreen(profileId)) {
      return;
    }

    return originalOpenProfilePermissions.apply(this, [profileId, options, ...args]);
  }

  abrirPermissoesPerfilAdminProfileGuard[WRAPPED_FLAG] = true;
  abrirPermissoesPerfilAdminProfileGuard.__original = originalOpenProfilePermissions;
  window.abrirPermissoesPerfilAdmin = abrirPermissoesPerfilAdminProfileGuard;
}

function installCloseRecordModalGuard() {
  if (typeof window.fecharModalNovoRegistro !== 'function') return;
  if (window.fecharModalNovoRegistro[WRAPPED_FLAG]) return;

  originalCloseRecordModal = originalCloseRecordModal || window.fecharModalNovoRegistro;

  function fecharModalNovoRegistroProfileGuard(...args) {
    if (isProfileScreenOpen() && typeof window.voltarListaPerfisAdmin === 'function') {
      window.voltarListaPerfisAdmin();
      return;
    }

    return originalCloseRecordModal.apply(this, args);
  }

  fecharModalNovoRegistroProfileGuard[WRAPPED_FLAG] = true;
  fecharModalNovoRegistroProfileGuard.__original = originalCloseRecordModal;
  window.fecharModalNovoRegistro = fecharModalNovoRegistroProfileGuard;
}

function installProfileLegacyModalGuards() {
  installOpenRecordModalGuard();
  installEditProfileGuard();
  installOpenProfilePermissionsGuard();
  installCloseRecordModalGuard();
}

function scheduleProfileLegacyModalGuards() {
  INSTALL_DELAYS.forEach(delay => window.setTimeout(installProfileLegacyModalGuards, delay));
}

window.addEventListener('hubAdminPerfilTelaAtualizada', scheduleProfileLegacyModalGuards);
window.addEventListener('hubAdminPerfilTelaRenderSolicitado', scheduleProfileLegacyModalGuards);
window.addEventListener('hubAdminUsuarioTelaAtualizada', scheduleProfileLegacyModalGuards);
window.addEventListener('load', scheduleProfileLegacyModalGuards);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleProfileLegacyModalGuards);
} else {
  scheduleProfileLegacyModalGuards();
}
