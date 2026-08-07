const FORM_FOOTER_SELECTOR = '[data-hub-form-footer]';
const UNPORTED_FORM_FOOTER_SELECTOR = `${FORM_FOOTER_SELECTOR}:not([data-hub-form-footer-portaled="true"])`;

function listPortaledFormFooters() {
  return document.body.querySelectorAll(`:scope > ${FORM_FOOTER_SELECTOR}`);
}

export function removeHubFormFooterPortals() {
  listPortaledFormFooters().forEach((footer) => footer.remove());
}

export function portalHubFormFooter(root = document) {
  const footer = root.querySelector?.(UNPORTED_FORM_FOOTER_SELECTOR);
  if (!footer) return false;

  listPortaledFormFooters().forEach((portaledFooter) => {
    if (portaledFooter !== footer) portaledFooter.remove();
  });

  const form = footer.closest('form');
  if (form?.id) footer.querySelector('button[type="submit"]')?.setAttribute('form', form.id);
  footer.dataset.hubFormFooterPortaled = 'true';
  document.body.appendChild(footer);
  return true;
}

function iniciarObserverHubFormFooter() {
  const iniciar = () => {
    const observer = new MutationObserver((mutations) => {
      const adicionouFooter = mutations.some(({ addedNodes }) => [...addedNodes].some((node) => (
        node.nodeType === Node.ELEMENT_NODE
          && (node.matches?.(UNPORTED_FORM_FOOTER_SELECTOR)
            || node.querySelector?.(UNPORTED_FORM_FOOTER_SELECTOR))
      )));
      if (adicionouFooter) portalHubFormFooter(document);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
}

iniciarObserverHubFormFooter();

Object.assign(window, {
  hubPortalFormFooter: portalHubFormFooter,
  hubRemoveFormFooterPortals: removeHubFormFooterPortals
});
