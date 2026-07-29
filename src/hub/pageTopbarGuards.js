function obterBaseHub() {
  const pathname = window.location.pathname || '/';
  return pathname === '/hub' || pathname.startsWith('/hub/') ? '/hub' : '';
}

function voltarHomePerfil() {
  const base = obterBaseHub() || '/hub';
  window.history.pushState({}, '', `${base}/`);
  window.dispatchEvent(new Event('popstate'));
}

function injetarEstilosGuardaTopbar() {
  if (document.getElementById('hub-page-topbar-guards-style')) return;

  const style = document.createElement('style');
  style.id = 'hub-page-topbar-guards-style';
  style.textContent = `
    .hub-page-topbar-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      min-width: 160px;
      gap: 10px;
    }
  `;
  document.head.appendChild(style);
}

function aplicarAcaoTopo(seletorPagina, htmlBotao) {
  const topbar = document.querySelector(`${seletorPagina} .topbar`);
  if (!topbar) return;

  const alvo = topbar.querySelector('.hub-user-menu-host, .user-box');
  if (!alvo || alvo.dataset.topbarGuardApplied === 'true') return;

  alvo.className = 'hub-page-topbar-actions';
  alvo.dataset.topbarGuardApplied = 'true';
  alvo.innerHTML = htmlBotao;
}

function aplicarGuardasTopbar() {
  injetarEstilosGuardaTopbar();

  aplicarAcaoTopo(
    '.hub-profile-page',
    '<button class="secondary-btn" type="button" onclick="hubPerfilTopbarVoltar()">Voltar</button>'
  );

}

function iniciarGuardasTopbar() {
  aplicarGuardasTopbar();

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(aplicarGuardasTopbar);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

window.hubPerfilTopbarVoltar = voltarHomePerfil;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarGuardasTopbar);
} else {
  iniciarGuardasTopbar();
}
