import { chamarApi } from './api.js';

const APPLY_DELAYS = [0, 80, 180, 360, 700, 1200];

let perfisCache = null;
let usuariosCache = null;
let carregando = false;
let aplicarPendente = false;

function escapeHtml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function obterEstadoUsuarioTela() {
  if (typeof window.hubObterEstadoUsuarioTelaAdmin !== 'function') {
    return { modo: '', id: '', etapa: 'dados' };
  }

  return window.hubObterEstadoUsuarioTelaAdmin() || { modo: '', id: '', etapa: 'dados' };
}

function telaDadosUsuarioAtiva() {
  const estado = obterEstadoUsuarioTela();
  return (estado.modo === 'editar' || estado.modo === 'novo') && estado.etapa !== 'permissoes';
}

function obterSelectPerfil() {
  const estado = obterEstadoUsuarioTela();
  const id = estado.modo === 'editar' && estado.id ? `usuario_${estado.id}_perfil` : 'usuario_novo_perfil';
  return document.getElementById(id);
}

function ordenarPerfis(perfis = []) {
  return [...perfis].sort((a, b) => String(a.nome || a.slug || '').localeCompare(String(b.nome || b.slug || ''), 'pt-BR'));
}

function obterPerfilAtualUsuario() {
  const estado = obterEstadoUsuarioTela();
  if (estado.modo !== 'editar' || !estado.id) return '';

  const usuario = (usuariosCache || []).find(item => String(item.id) === String(estado.id));
  return usuario?.perfil_id || '';
}

function renderizarOptionsPerfil(perfis = [], perfilAtual = '') {
  const options = ['<option value="">Selecione</option>'];

  ordenarPerfis(perfis)
    .filter(perfil => perfil.status !== 'inativo' || String(perfil.id) === String(perfilAtual))
    .forEach(perfil => {
      const valor = String(perfil.id || '');
      const rotulo = perfil.nome || perfil.slug || 'Perfil';
      options.push(`<option value="${escapeHtml(valor)}" ${valor === String(perfilAtual) ? 'selected' : ''}>${escapeHtml(rotulo)}</option>`);
    });

  return options.join('');
}

async function carregarDadosPerfilUsuario() {
  if (perfisCache && usuariosCache) return;
  if (carregando) return;

  carregando = true;
  try {
    const [perfisResponse, usuariosResponse] = await Promise.all([
      perfisCache ? Promise.resolve(null) : chamarApi('listAdminProfiles'),
      usuariosCache ? Promise.resolve(null) : chamarApi('listAdminUsers')
    ]);

    if (perfisResponse) {
      if (!perfisResponse.ok) throw new Error(perfisResponse.message || 'Não foi possível carregar perfis.');
      perfisCache = perfisResponse.data?.records || [];
    }

    if (usuariosResponse) {
      if (!usuariosResponse.ok) throw new Error(usuariosResponse.message || 'Não foi possível carregar usuários.');
      usuariosCache = usuariosResponse.data?.records || [];
    }
  } catch (_erro) {
    perfisCache ||= [];
    usuariosCache ||= [];
  } finally {
    carregando = false;
  }
}

async function aplicarPerfisNoSelect() {
  if (!telaDadosUsuarioAtiva()) return;

  const select = obterSelectPerfil();
  if (!select) return;

  await carregarDadosPerfilUsuario();

  const perfilAtual = select.value || select.dataset.perfilAtual || obterPerfilAtualUsuario();
  const perfis = perfisCache || [];

  if (!perfis.length) return;

  const assinatura = `${perfilAtual}:${perfis.map(perfil => `${perfil.id}:${perfil.status}`).join('|')}`;
  if (select.dataset.perfisCarregadosAssinatura === assinatura && select.options.length > 1) return;

  select.innerHTML = renderizarOptionsPerfil(perfis, perfilAtual);
  select.value = perfilAtual || '';
  select.dataset.perfilAtual = perfilAtual || '';
  select.dataset.perfisCarregadosAssinatura = assinatura;
}

function agendarAplicacaoPerfis() {
  if (aplicarPendente) return;
  aplicarPendente = true;

  window.requestAnimationFrame(() => {
    aplicarPendente = false;
    aplicarPerfisNoSelect();
  });
}

function invalidarCacheUsuarios(event) {
  const id = event?.detail?.id || '';
  if (!id) {
    usuariosCache = null;
  } else if (usuariosCache) {
    usuariosCache = usuariosCache.filter(item => String(item.id) !== String(id));
  }
  agendarAplicacaoPerfis();
}

function iniciarObserver() {
  const observer = new MutationObserver(agendarAplicacaoPerfis);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

APPLY_DELAYS.forEach(delay => window.setTimeout(agendarAplicacaoPerfis, delay));
window.addEventListener('hubAdminUsuarioTelaAtualizada', agendarAplicacaoPerfis);
window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', agendarAplicacaoPerfis);
window.addEventListener('hubAdminUsuariosAtualizados', invalidarCacheUsuarios);
window.addEventListener('hubAdminPerfisAtualizados', () => {
  perfisCache = null;
  agendarAplicacaoPerfis();
});
window.addEventListener('load', agendarAplicacaoPerfis);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    iniciarObserver();
    agendarAplicacaoPerfis();
  });
} else {
  iniciarObserver();
  agendarAplicacaoPerfis();
}
