import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderCrm2CadastroListHeader,
  renderCrm2CadastroListToolbar,
  renderCrm2CadastroPagination,
  renderCrm2CadastroState
} from './crm2CadastroUi.js';

test('shared cadastro header keeps module-specific title and route while sharing actions', () => {
  const html = renderCrm2CadastroListHeader({ title: 'Pessoas jurídicas', titleId: 'pj-title', routeCode: '202' });
  assert.match(html, /ROTA 202 · CRM 2\.0/);
  assert.match(html, /id="pj-title">Pessoas jurídicas/);
  assert.match(html, /Voltar ao CRM 2\.0/);
});

test('shared toolbar preserves each module submit handler and filter controls', () => {
  const html = renderCrm2CadastroListToolbar('crm2PjApplyFilters(event)', '<button>Filtros PJ</button>');
  assert.match(html, /onsubmit="crm2PjApplyFilters\(event\)"/);
  assert.match(html, /Filtros PJ/);
  assert.match(html, /role="search"/);
});

test('shared state keeps alert and loading semantics configurable', () => {
  const html = renderCrm2CadastroState({ title: 'Erro', description: 'Tente novamente.', state: 'error', loading: true, action: '<button>Tentar</button>' });
  assert.match(html, /role="alert"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /hub-loading-spinner/);
  assert.match(html, /<button>Tentar<\/button>/);
});

test('shared pagination disables bounds and preserves module callbacks', () => {
  const html = renderCrm2CadastroPagination({ label: 'vínculos', page: 1, totalPages: 2, totalItems: 24, previousAction: 'crm2VinculosSetPage(0)', nextAction: 'crm2VinculosSetPage(2)' });
  assert.match(html, /Paginação de vínculos/);
  assert.match(html, /crm2VinculosSetPage\(0\).*disabled/);
  assert.match(html, /crm2VinculosSetPage\(2\)/);
});
