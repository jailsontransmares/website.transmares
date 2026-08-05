import { obterContextoAcessoHub, observarContextoAcessoHub } from './services/hubAccessContext.js';
import { hasPermission } from './services/permissionService.js';

(() => {

  crm2PfState.canView = false;
  crm2PfState.canEdit = false;
  crm2PfState.canDelete = false;

  const originalRenderPeopleListCrm2 = renderPeopleListCrm2;
  const originalRenderPersonDetailCrm2 = renderPersonDetailCrm2;
  const originalRenderPersonDataCrm2 = renderPersonDataCrm2;

  function injectRowPermissionsCrm2(html = '') {
    return String(html).replace(
      /<button type="button" role="menuitem" onclick="crm2PfEdit\('([^']+)'\)"[^>]*>Editar<\/button>/g,
      (button, personId) => {
        const editButton = crm2PfState.canEdit ? button : '';
        const deleteButton = crm2PfState.canDelete
          ? `<button class="danger-text" type="button" role="menuitem" onclick="crm2PfDelete('${escapeAttrCrm2(personId)}')">Excluir</button>`
          : '';
        return `${editButton}${deleteButton}`;
      }
    );
  }

  function injectDetailPermissionsCrm2(html = '', person = {}) {
    const editPattern = /<button class="save-btn" type="button" onclick="crm2PfEdit\('[^']+'\)"[^>]*>Editar<\/button>/;
    return String(html).replace(editPattern, (button) => {
      const editButton = crm2PfState.canEdit ? button : '';
      const deleteButton = crm2PfState.canDelete
        ? `<button class="secondary-btn" type="button" onclick="crm2PfDelete('${escapeAttrCrm2(person.id)}')">Excluir</button>`
        : '';
      return `${deleteButton}${editButton}`;
    });
  }

  function applyAttachmentPermissionsCrm2(html = '') {
    if (crm2PfState.canDelete) return html;
    return String(html).replace(
      /<button class="secondary-btn" type="button" onclick="crm2PfRemoveAttachment\('[^']+',\s*\d+\)">Remover<\/button>/g,
      ''
    );
  }

  renderPeopleListCrm2 = function renderPeopleListWithPermissionsCrm2() {
    return injectRowPermissionsCrm2(originalRenderPeopleListCrm2());
  };

  renderPersonDetailCrm2 = function renderPersonDetailWithPermissionsCrm2(person) {
    return injectDetailPermissionsCrm2(originalRenderPersonDetailCrm2(person), person || {});
  };

  renderPersonDataCrm2 = function renderPersonDataWithPermissionsCrm2(person) {
    return applyAttachmentPermissionsCrm2(originalRenderPersonDataCrm2(person));
  };

  window.crm2PfDelete = function crm2PfDelete(personId) {
    if (!crm2PfState.canDelete) return;
    const person = getPersonCrm2(personId);
    if (!person) return;

    const confirmed = window.confirm(
      `Excluir “${person.nome}” apenas do estado mockado desta página? Nenhum dado externo será alterado.`
    );
    if (!confirmed) return;

    crm2PfState.items = crm2PfState.items.filter((item) => item.id !== personId);
    if (crm2PfState.detailId === personId) {
      crm2PfState.detailId = '';
      crm2PfState.detailTab = 'dados';
    }
    resetFormCrm2();
    setMessageCrm2('Pessoa física excluída apenas do estado mockado. Nenhum dado foi persistido.');
    rerenderCrm2Phase2();
  };

  const originalRemoveAttachmentCrm2 = window.crm2PfRemoveAttachment;
  window.crm2PfRemoveAttachment = function crm2PfRemoveAttachmentWithPermission(personId, index) {
    if (!crm2PfState.canDelete) return;
    return originalRemoveAttachmentCrm2?.(personId, index);
  };

  function renderPermissionDeniedCrm2() {
    if (currentRouteCodeCrm2() !== '201') return;
    const target = document.querySelector('.crm2-pessoas-page');
    if (!target) return;
    target.outerHTML = `
      <section class="admin-panel crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-access-denied-title">
        <div class="crm2-pessoas-state is-error" role="alert">
          <strong id="crm2-access-denied-title">Acesso não autorizado.</strong>
          <span>É necessária a permissão Visualizar para acessar Pessoas físicas.</span>
          <button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button>
        </div>
      </section>
    `;
  }

  function applyPermissionsCrm2(context, hasPermission) {
    const permissions = context?.permissions || {};
    const resolvePermission = (action) => hasPermission(permissions, 'painel_ar', action);
    crm2PfState.canView = resolvePermission('view');
    crm2PfState.canEdit = resolvePermission('update');
    crm2PfState.canDelete = resolvePermission('delete');

    // Compatibilidade interna com os componentes existentes da Fase 2.
    // A origem desta capacidade passa a ser exclusivamente a permissão Editar (update).

    if (currentRouteCodeCrm2() !== '201') return;
    if (!crm2PfState.canView) {
      renderPermissionDeniedCrm2();
      return;
    }

    const target = document.querySelector('.crm2-pessoas-page');
    if (!target) return;
    if (target.dataset.crm2Phase2Enhanced === 'true') {
      rerenderCrm2Phase2();
    } else {
      mountCrm2Phase2();
    }
  }

  const syncPermissions = (context = obterContextoAcessoHub()) => {
    applyPermissionsCrm2(context, hasPermission);
  };

  observarContextoAcessoHub(syncPermissions);
  syncPermissions();
  /* legacy async error fallback removed */
  /*
    console.error('Não foi possível carregar as permissões do CRM 2.0.', error);
    crm2PfState.canView = true;
    crm2PfState.canEdit = false;
    crm2PfState.canDelete = false;
  });
  */
})();
