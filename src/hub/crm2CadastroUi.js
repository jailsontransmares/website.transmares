export function renderCrm2CadastroListHeader({ title, titleId, routeCode }) {
  return `<div class="admin-panel-header crm2-pessoas-list-header"><div><span class="ar-crm-phase1-kicker">ROTA ${routeCode} · CRM 2.0</span><h3 id="${titleId}">${title}</h3></div><div class="crm2-pessoas-header-actions"><button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button></div></div>`;
}

export function renderCrm2CadastroListToolbar(submitHandler, controls) {
  return `<form class="crm2-pf-filter-bar crm2-cadastro-list-toolbar" role="search" onsubmit="${submitHandler}"><div class="crm2-pf-filter-actions">${controls}</div></form>`;
}

export function renderCrm2CadastroState({ title, description, action = '', state = '', className = '', live = false, loading = false }) {
  const modifiers = [className, state === 'error' ? 'is-error' : ''].filter(Boolean).join(' ');
  const role = state === 'error' ? 'alert' : 'status';
  return `<div class="crm2-pessoas-state ${modifiers}" role="${role}"${live ? ' aria-live="polite"' : ''}${loading ? ' aria-busy="true"' : ''}>${loading ? '<span class="hub-loading-spinner" aria-hidden="true"></span>' : ''}<strong>${title}</strong><span>${description}</span>${action}</div>`;
}

export function renderCrm2CadastroPagination({ label, page, totalPages, totalItems, previousAction, nextAction }) {
  return `<div class="crm2-pessoas-pagination" aria-label="Paginação de ${label}"><span>Página <strong>${page}</strong> de <strong>${totalPages}</strong> · ${totalItems} registro(s)</span><div><button class="secondary-btn" type="button" onclick="${previousAction}" ${page <= 1 ? 'disabled' : ''}>Anterior</button><button class="secondary-btn" type="button" onclick="${nextAction}" ${page >= totalPages ? 'disabled' : ''}>Próxima</button></div></div>`;
}
