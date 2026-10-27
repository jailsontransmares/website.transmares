function escapeAttribute(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function renderButton({ label, onClick = '', className = 'secondary-btn', type = 'button', disabled = false, form = '', ariaLabel = '', shortcut = '' }) {
  const click = onClick ? ` onclick="${escapeAttribute(onClick)}"` : '';
  const formAttribute = form ? ` form="${escapeAttribute(form)}"` : '';
  const ariaAttribute = ariaLabel ? ` aria-label="${escapeAttribute(ariaLabel)}"` : '';
  const shortcutAttribute = shortcut ? ` data-hub-record-shortcut="${escapeAttribute(shortcut)}" aria-keyshortcuts="Control+${shortcut === 'edit' ? 'E' : 'S'}"` : '';
  return `<button class="${escapeAttribute(className)}" type="${type}"${click}${formAttribute}${ariaAttribute}${shortcutAttribute}${disabled ? ' disabled aria-disabled="true"' : ''}>${label}</button>`;
}

const workflowShortcutHandlers = new Map();

export function registerHubRecordShortcutHandler(flow, shortcut, handler) {
  if (!flow || !['edit', 'save'].includes(shortcut) || typeof handler !== 'function') return;
  workflowShortcutHandlers.set(`${flow}:${shortcut}`, handler);
}

export function renderHubRecordBackButton({ onClick, label = 'Voltar', ariaLabel = 'Voltar', className = 'icon-btn hub-record-back-button', disabled = false }) {
  return `<button class="${escapeAttribute(className)}" type="button" onclick="${escapeAttribute(onClick)}" aria-label="${escapeAttribute(ariaLabel)}" title="${escapeAttribute(ariaLabel)}"${disabled ? ' disabled aria-disabled="true"' : ''}><i data-lucide="chevron-left" aria-hidden="true"></i>${label ? `<span class="hub-record-back-label">${escapeAttribute(label)}</span>` : ''}</button>`;
}

export function renderHubRecordHeader({
  onBack,
  backAriaLabel = 'Voltar',
  className = 'hub-record-header',
  backClassName = 'icon-btn hub-record-back-button',
  contentClassName = 'hub-record-header-content',
  actionsClassName = 'hub-record-header-actions',
  content = '',
  actions = '',
  disabled = false
}) {
  return `<div class="${escapeAttribute(className)}">${renderHubRecordBackButton({ onClick: onBack, label: '', ariaLabel: backAriaLabel, className: backClassName, disabled })}<div class="${escapeAttribute(contentClassName)}">${content}</div>${actions ? `<div class="${escapeAttribute(actionsClassName)}">${actions}</div>` : ''}</div>`;
}

export function renderHubRecordEditButton({ onClick, label = 'Editar', className = 'secondary-btn hub-record-edit-button', disabled = false }) {
  return renderButton({ label: escapeAttribute(label), onClick, className, disabled, shortcut: 'edit' });
}

export function renderHubRecordFormFooter({
  flow,
  cancelLabel = 'Cancelar',
  cancelOnClick,
  cancelClassName = 'secondary-btn',
  cancelAriaLabel = '',
  previousLabel = 'Anterior',
  previousOnClick = '',
  nextLabel = 'Próxima',
  nextOnClick = '',
  saveLabel = 'Salvar',
  saveOnClick = '',
  saveForm = '',
  showPrevious = false,
  showNext = false,
  showSave = true,
  saveBeforeNext = false,
  saving = false,
  className = ''
}) {
  const disabled = saving;
  const previous = showPrevious ? renderButton({ label: escapeAttribute(previousLabel), onClick: previousOnClick, disabled }) : '';
  const next = showNext ? renderButton({ label: escapeAttribute(nextLabel), onClick: nextOnClick, className: 'save-btn', disabled }) : '';
  const save = showSave ? renderButton({ label: escapeAttribute(saving ? 'Salvando...' : saveLabel), onClick: saveOnClick, form: saveForm, className: 'save-btn', type: saveForm ? 'submit' : 'button', disabled, shortcut: 'save' }) : '';
  const actions = [previous, saveBeforeNext ? save : '', next, saveBeforeNext ? '' : save].join('');

  return `<div class="hub-form-screen-actions hub-record-workflow-footer ${escapeAttribute(className)}" data-hub-form-footer data-hub-record-flow="${escapeAttribute(flow)}"><div class="hub-record-footer-start">${renderButton({ label: escapeAttribute(cancelLabel), onClick: cancelOnClick, className: cancelClassName, disabled, ariaLabel: cancelAriaLabel })}</div><div class="hub-record-footer-actions">${actions}</div></div>`;
}

export function removeHubRecordWorkflowFooter(flow) {
  if (!flow || typeof document === 'undefined') return;
  const remove = () => document.querySelectorAll('body > [data-hub-record-flow]').forEach((footer) => {
    if (footer.dataset.hubRecordFlow === flow) footer.remove();
  });
  remove();
  window.requestAnimationFrame?.(remove);
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (event) => {
    if (!event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    const shortcut = key === 'e' ? 'edit' : key === 's' ? 'save' : '';
    if (!shortcut) return;

    const target = event.target instanceof Element ? event.target : null;
    if (shortcut === 'edit' && target?.closest('input, textarea, select, [contenteditable="true"]')) return;

    const button = [...document.querySelectorAll(`[data-hub-record-shortcut="${shortcut}"]`)]
      .find((candidate) => !candidate.disabled && candidate.getClientRects().length > 0);
    if (button) {
      event.preventDefault();
      button.click();
      return;
    }

    const activeFlow = [...document.querySelectorAll('body > [data-hub-record-flow]')]
      .find((footer) => footer.getClientRects().length > 0);
    if (!activeFlow) return;
    event.preventDefault();
    workflowShortcutHandlers.get(`${activeFlow.dataset.hubRecordFlow}:${shortcut}`)?.(event);
  });
}
