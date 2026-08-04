const MODAL_SELECTOR = '.modal-backdrop, .fin-modal-backdrop';
const DIALOG_SELECTOR = '[role="dialog"], .small-modal, .fin-modal';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

const previousFocus = new WeakMap();
let activeModal = null;

function isVisible(element) {
  return Boolean(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
}

function getDialog(backdrop) {
  return backdrop.querySelector(DIALOG_SELECTOR) || backdrop;
}

function getOpenModals() {
  return Array.from(document.querySelectorAll(MODAL_SELECTOR)).filter(isVisible);
}

function ensureHeadingId(dialog) {
  const heading = dialog.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading) return;

  if (!heading.id) {
    heading.id = `modal-title-${Math.random().toString(36).slice(2, 10)}`;
  }

  dialog.setAttribute('aria-labelledby', heading.id);
  dialog.removeAttribute('aria-label');
}

function enhanceModal(backdrop) {
  const dialog = getDialog(backdrop);
  if (!dialog) return;

  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
  ensureHeadingId(dialog);

  if (!previousFocus.has(backdrop)) {
    const focused = document.activeElement;
    previousFocus.set(backdrop, focused && !dialog.contains(focused) ? focused : null);
  }
}

function updateScrollLock() {
  document.body.classList.toggle('modal-is-open', getOpenModals().length > 0);
}

function focusInitialElement(dialog) {
  const target = dialog.querySelector('[autofocus], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])') || dialog;
  target.focus({ preventScroll: true });
}

function focusTrap(event) {
  if (event.key !== 'Tab' || !activeModal) return;

  const dialog = getDialog(activeModal);
  const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisible);
  if (!focusable.length) {
    event.preventDefault();
    dialog.focus({ preventScroll: true });
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function closeWithEscape() {
  if (!activeModal) return;

  const dialog = getDialog(activeModal);
  const closeButton = dialog.querySelector(
    '[data-modal-close], [data-rh-action^="close"], [data-fin-action*="close"], button[aria-label*="Fechar" i], button[title*="Fechar" i], .modal-close, .icon-btn'
  );

  if (closeButton && !closeButton.disabled) {
    closeButton.click();
    return;
  }

  activeModal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function syncModals() {
  const openModals = getOpenModals();
  openModals.forEach(enhanceModal);
  const nextModal = openModals[openModals.length - 1] || null;

  if (nextModal !== activeModal) {
    activeModal = nextModal;
    if (activeModal) {
      focusInitialElement(getDialog(activeModal));
    }
  }

  updateScrollLock();

  if (!activeModal && previousFocus.size) {
    // O foco é restaurado no callback de remoção abaixo para preservar a referência correta.
    document.querySelectorAll(MODAL_SELECTOR).forEach(modal => previousFocus.delete(modal));
  }
}

const observer = new MutationObserver(() => {
  const previousModal = activeModal;
  syncModals();

  if (!activeModal && previousModal) {
    const trigger = previousFocus.get(previousModal);
    previousFocus.delete(previousModal);
    if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
  }
});

document.addEventListener('keydown', event => {
  if (!activeModal) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeWithEscape();
    return;
  }
  focusTrap(event);
}, true);

observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
syncModals();
