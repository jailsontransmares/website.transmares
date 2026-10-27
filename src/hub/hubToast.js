const ACTIVE_TOASTS = new Map();
const ACTIVE_MESSAGES = new Map();
const RECENT_MESSAGES = new Map();
const TOAST_DURATION = 5000;

function getToastHost() {
  let host = document.getElementById('hub-toast-host');
  if (host) return host;
  host = document.createElement('div');
  host.id = 'hub-toast-host';
  host.className = 'hub-toast-host';
  host.setAttribute('aria-label', 'Notificações');
  document.body.appendChild(host);
  return host;
}

function hideToast(toast, key) {
  if (!toast) return;
  window.clearTimeout(toast._hubToastTimer);
  toast.remove();
  for (const [activeKey, activeToast] of ACTIVE_TOASTS) {
    if (activeToast === toast) ACTIVE_TOASTS.delete(activeKey);
  }
  if (toast._hubToastMessageKey && ACTIVE_MESSAGES.get(toast._hubToastMessageKey) === toast) ACTIVE_MESSAGES.delete(toast._hubToastMessageKey);
}

function showHubToast(message, options = {}) {
  const text = String(message ?? '').trim();
  if (!text || !document.body) return null;

  const type = ['success', 'error', 'warning', 'info'].includes(options.type) ? options.type : 'info';
  const dedupeKey = options.dedupeKey ? String(options.dedupeKey) : '';
  const messageKey = type + ':' + text;
  const duplicate = ACTIVE_MESSAGES.get(messageKey);
  const existing = dedupeKey ? ACTIVE_TOASTS.get(dedupeKey) : null;
  if (duplicate) {
    if (existing && existing !== duplicate) hideToast(existing, dedupeKey);
    if (dedupeKey) ACTIVE_TOASTS.set(dedupeKey, duplicate);
    return duplicate;
  }
  if (existing) hideToast(existing, dedupeKey);

  const toast = document.createElement('div');
  toast.className = `hub-toast is-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  toast.setAttribute('aria-atomic', 'true');

  const content = document.createElement('span');
  content.className = 'hub-toast-message';
  content.textContent = text;
  toast.appendChild(content);

  if (typeof options.action?.onClick === 'function' && options.action.label) {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'hub-toast-action';
    action.textContent = String(options.action.label);
    action.addEventListener('click', () => options.action.onClick());
    toast.appendChild(action);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'hub-toast-close';
  close.setAttribute('aria-label', 'Fechar notificação');
  close.textContent = '×';
  close.addEventListener('click', () => hideToast(toast, dedupeKey));
  toast.appendChild(close);

  getToastHost().appendChild(toast);
  toast._hubToastMessageKey = messageKey;
  ACTIVE_MESSAGES.set(messageKey, toast);
  if (dedupeKey) ACTIVE_TOASTS.set(dedupeKey, toast);
  const duration = Number(options.duration) > 0 ? Number(options.duration) : type === 'error' ? 8000 : TOAST_DURATION;
  toast._hubToastTimer = window.setTimeout(() => hideToast(toast, dedupeKey), duration);
  return toast;
}

function classifyAdminMessage(element, text) {
  if (element.classList.contains('error') || element.classList.contains('is-error')) return 'error';
  if (element.classList.contains('warning')) return 'warning';
  if (element.classList.contains('success')) return 'success';
  if (/\b(erro|error|falha|falhou|inválid[oa]|não foi possível|não foi encontrado|não foi encontrada|não pode|não é possível|não possui permissão|sem permissão|não autorizado|não autorizada|selecione ao menos|selecione lançamentos|informe|confira|bloqueou|bloqueada)\b/i.test(text)) return 'error';
  if (/\b(sucesso|salvo|salva|cadastrad[oa]|atualizad[oa]|excluíd[oa]|emitid[oa]|importad[oa]|concluíd[oa])\b/i.test(text)) return 'success';
  return 'info';
}

function isTransientAdminMessage(text) {
  return /\b(carregando|consultando|salvando|buscando|processando|aguarde)\b/i.test(text);
}

function processAdminMessage(element) {
  if (!(element instanceof HTMLElement) || element.dataset.hubToastProcessed) return;
  if (element.closest('[hidden], [aria-hidden="true"], .admin-user-direct-hidden')) return;
  if (element.matches('[data-admin-user-form-error]')) return;
  const text = element.textContent?.trim();
  if (!text || isTransientAdminMessage(text)) return;

  element.dataset.hubToastProcessed = 'true';
  const type = classifyAdminMessage(element, text);
  const signature = `${type}:${text}`;
  const now = Date.now();
  if (now - (RECENT_MESSAGES.get(signature) || 0) > 5000) {
    RECENT_MESSAGES.set(signature, now);
    showHubToast(text, { type, dedupeKey: `admin-message:${signature}` });
  }
  element.remove();
}

function processAddedNode(node) {
  if (!(node instanceof Element)) return;
  if (node.matches('.admin-message')) processAdminMessage(node);
  node.querySelectorAll('.admin-message').forEach(processAdminMessage);
}

function initializeHubToast() {
  if (!document.body || document.body.dataset.hubToastInitialized) return;
  document.body.dataset.hubToastInitialized = 'true';
  document.body.querySelectorAll('.admin-message').forEach(processAdminMessage);
  new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach(processAddedNode));
  }).observe(document.body, { childList: true, subtree: true });
}

window.hubToast = {
  show: showHubToast,
  success: (message, options) => showHubToast(message, { ...options, type: 'success' }),
  error: (message, options) => showHubToast(message, { ...options, type: 'error' }),
  warning: (message, options) => showHubToast(message, { ...options, type: 'warning' }),
  info: (message, options) => showHubToast(message, { ...options, type: 'info' }),
  dismiss: (key) => hideToast(ACTIVE_TOASTS.get(String(key)), String(key))
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeHubToast, { once: true });
else initializeHubToast();
