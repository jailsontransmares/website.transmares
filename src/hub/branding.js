import { supabase } from './supabaseClient.js';

const BRANDING_CACHE_KEY = 'hub_transmares_branding';
let brandingAtual = null;
let observerInstalado = false;

function obterBaseHub(pathname = window.location.pathname || '/') {
  return pathname === '/hub' || pathname.startsWith('/hub/') ? '/hub' : '';
}

function normalizarUrlLogo(logoUrl = '') {
  const url = String(logoUrl || '').trim();

  if (!url) {
    return '';
  }

  return url;
}

function obterLogoPadrao() {
  const base = obterBaseHub();
  return `${base}/assets/logo-transmares.png`;
}

function lerCacheBranding() {
  try {
    const bruto = window.localStorage.getItem(BRANDING_CACHE_KEY);
    return bruto ? JSON.parse(bruto) : null;
  } catch (_erro) {
    return null;
  }
}

function salvarCacheBranding(branding) {
  try {
    window.localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding || {}));
  } catch (_erro) {
    // Cache é apenas melhoria progressiva.
  }
}

function aplicarLogoEmImagem(img, logoUrl) {
  if (!img || !logoUrl) return;
  if (img.dataset.brandingApplied === logoUrl) return;

  img.src = logoUrl;
  img.dataset.brandingApplied = logoUrl;
}

function aplicarBrandingNoDom() {
  const branding = brandingAtual || lerCacheBranding() || {};
  const logoUrl = normalizarUrlLogo(branding.logo_url) || obterLogoPadrao();

  if (branding.nome_sistema) {
    document.title = branding.nome_sistema;
  }

  document.querySelectorAll('.login-logo img, .brand-logo-slot img').forEach(img => {
    aplicarLogoEmImagem(img, logoUrl);
  });

  document.querySelectorAll('.login-card > h1').forEach(titulo => {
    if (
      branding.nome_sistema
      && !titulo.dataset.brandingTitleLocked
      && titulo.textContent !== branding.nome_sistema
    ) {
      titulo.textContent = branding.nome_sistema;
    }
  });
}

async function carregarBrandingPublico() {
  const cache = lerCacheBranding();
  if (cache) {
    brandingAtual = cache;
    aplicarBrandingNoDom();
  }

  if (!supabase) {
    aplicarBrandingNoDom();
    return;
  }

  try {
    const { data, error } = await supabase.rpc('app_public_branding');

    if (error) {
      throw error;
    }

    const registro = Array.isArray(data) ? data[0] : data;

    if (registro) {
      brandingAtual = registro;
      salvarCacheBranding(registro);
      aplicarBrandingNoDom();
    }
  } catch (_erro) {
    aplicarBrandingNoDom();
  }
}

function instalarObserverBranding() {
  if (observerInstalado) return;
  observerInstalado = true;

  const observer = new MutationObserver(() => aplicarBrandingNoDom());
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function iniciar() {
  instalarObserverBranding();
  carregarBrandingPublico();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}

window.hubRecarregarBranding = carregarBrandingPublico;
