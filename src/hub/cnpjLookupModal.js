import { consultarCnpj } from './services/cnpjService.js';

const FIELD_LABELS = {
  cnpj: 'CNPJ', razaoSocial: 'Razão social', situacao: 'Situação na RFB', cep: 'CEP',
  endereco: 'Logradouro', numero: 'Número', complemento: 'Complemento', bairro: 'Bairro',
  municipio: 'Cidade', uf: 'UF'
};

const state = { open: false, loading: false, error: '', fromApi: false, data: {}, existing: null, onConfirm: null };

function escape(value = '') { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function digits(value = '') { return String(value ?? '').replace(/\D/g, ''); }
function maskCnpj(value = '') { const v = digits(value).slice(0, 14); return v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4').replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5'); }
function changed(field) { const current = String(state.data[field] || '').trim(); const previous = String(state.existing?.[field] || '').trim(); return Boolean(state.existing && current !== previous); }

function render() {
  document.querySelector('[data-cnpj-lookup-modal]')?.remove();
  if (!state.open) return;
  const fields = Object.keys(FIELD_LABELS).map((field) => `<label class="cnpj-lookup-field cnpj-lookup-field-${field} ${changed(field) ? 'is-changed' : ''}"><span>${FIELD_LABELS[field]}</span><input class="config-input" name="${field}" value="${escape(field === 'cnpj' ? maskCnpj(state.data[field]) : state.data[field] || '')}" ${field === 'cnpj' ? 'readonly' : ''}${['razaoSocial', 'endereco'].includes(field) ? ' data-cnpj-auto-fit="true"' : ''} oninput="window.cnpjLookupSetField('${field}', this.value)"></label>`).join('');
  const error = state.error ? `<p class="admin-message is-error" role="alert">${escape(state.error)} Preencha os campos manualmente e confirme.</p>` : '';
  const loading = state.loading ? '<p class="admin-message" role="status">Consultando CNPJ...</p>' : '';
  document.body.insertAdjacentHTML('beforeend', `<div class="cnpj-lookup-backdrop" data-cnpj-lookup-modal><section class="cnpj-lookup-modal" role="dialog" aria-modal="true" aria-labelledby="cnpj-lookup-title"><header><div><span class="ar-crm-phase1-kicker">CONSULTA DE CNPJ</span><h3 id="cnpj-lookup-title">Confirmar dados da empresa</h3></div><span class="cnpj-lookup-source">${state.fromApi ? 'Dados retornados pela API' : 'Preenchimento manual'}</span><button class="icon-btn" type="button" aria-label="Fechar" title="Fechar" onclick="window.cnpjLookupClose()">×</button></header>${error}${loading}<section class="cnpj-lookup-section" aria-labelledby="cnpj-lookup-data-title"><h4 id="cnpj-lookup-data-title">Dados cadastrais</h4><div class="cnpj-lookup-grid">${fields}</div></section><footer><button class="secondary-btn" type="button" onclick="window.cnpjLookupClose()">Cancelar</button><button class="save-btn" type="button" onclick="window.cnpjLookupConfirm()" ${state.loading ? 'disabled' : ''}>Confirmar dados</button></footer></section></div>`); fitAutoFields();
}

function fitAutoFields() {
  document.querySelectorAll('[data-cnpj-auto-fit="true"]').forEach((input) => {
    input.style.fontSize = '';
    let size = 11;
    while (input.scrollWidth > input.clientWidth + 1 && size > 9) {
      size -= 0.25;
      input.style.fontSize = `${size}px`;
    }
  });
}

async function lookup() {
  state.loading = true; state.error = ''; render();
  try {
    const result = await consultarCnpj(state.data.cnpj);
    if (!result.found || !result.data) throw new Error('CNPJ não localizado na API.');
    state.data = { ...state.data, ...result.data }; state.fromApi = true;
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Não foi possível consultar o CNPJ.';
  } finally { state.loading = false; render(); }
}

export function abrirConsultaCnpj({ value = '', existing = null, onConfirm } = {}) {
  state.open = true; state.loading = false; state.error = ''; state.fromApi = false; state.existing = existing || null; state.onConfirm = onConfirm;
  state.data = { cnpj: digits(value), ...(existing || {}) };
  state.data.cnpj = digits(value || existing?.cnpj || '');
  render();
  if (state.data.cnpj.length === 14) void lookup();
}

Object.assign(window, {
  cnpjLookupSetField(field, value) { if (Object.prototype.hasOwnProperty.call(FIELD_LABELS, field)) { state.data[field] = String(value || ''); if (['razaoSocial', 'endereco'].includes(field)) fitAutoFields(); } },
  cnpjLookupClose() { state.open = false; state.onConfirm = null; document.querySelector('[data-cnpj-lookup-modal]')?.remove(); },
  cnpjLookupConfirm() { if (!state.data.cnpj || state.data.cnpj.length !== 14) { state.error = 'Informe um CNPJ válido.'; render(); return; } state.onConfirm?.({ ...state.data, cnpj: digits(state.data.cnpj), fonte: state.fromApi ? 'api' : 'manual' }); window.cnpjLookupClose(); }
});
