function obterBaseHub() {
  const pathname = window.location.pathname || '/';
  return pathname === '/hub' || pathname.startsWith('/hub/') ? '/hub' : '';
}

function navegarDadosCorretora() {
  const base = obterBaseHub() || '/hub';
  window.history.pushState({}, '', `${base}/configuracoes/corretora`);
  window.dispatchEvent(new Event('popstate'));
}

document.addEventListener('click', event => {
  const item = event.target.closest('[data-user-menu-action="configuracoes"]');

  if (!item) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  navegarDadosCorretora();
}, true);
