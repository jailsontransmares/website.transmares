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

test('shared cadastro header can hide the route kicker and customize the back label', () => {
  const html = renderCrm2CadastroListHeader({ title: 'Pessoas físicas', titleId: 'pf-title', routeCode: '201', showRouteCode: false, backLabel: 'Voltar' });
  assert.doesNotMatch(html, /ROTA 201/);
  assert.match(html, /id="pf-title">Pessoas físicas/);
  assert.match(html, /aria-label="Voltar" title="Voltar"/);
});

test('shared toolbar preserves each module submit handler and filter controls', () => {
  const html = renderCrm2CadastroListToolbar('crm2PjApplyFilters(event)', '<button>Filtros PJ</button>');
  assert.match(html, /onsubmit="crm2PjApplyFilters\(event\)"/);
  assert.match(html, /Filtros PJ/);
  assert.match(html, /role="search"/);
});

test('shared toolbar allows a screen to isolate its layout classes', () => {
  const html = renderCrm2CadastroListToolbar('crm2PfApplyFilters(event)', '<input>', { className: 'crm2-cadastro-directory-toolbar', actionsClassName: 'crm2-cadastro-directory-toolbar-actions' });
  assert.match(html, /class="crm2-cadastro-directory-toolbar crm2-cadastro-list-toolbar"/);
  assert.match(html, /class="crm2-cadastro-directory-toolbar-actions"/);
  assert.doesNotMatch(html, /crm2-pf-filter-bar|crm2-pf-filter-actions/);
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

test('shared pagination can hide previous on the first page when requested', () => {
  const firstPage = renderCrm2CadastroPagination({ label: 'pessoas físicas', page: 1, totalPages: 2, totalItems: 24, previousAction: 'previous()', nextAction: 'next()', hidePreviousOnFirstPage: true });
  const secondPage = renderCrm2CadastroPagination({ label: 'pessoas físicas', page: 2, totalPages: 2, totalItems: 24, previousAction: 'previous()', nextAction: 'next()', hidePreviousOnFirstPage: true });
  assert.doesNotMatch(firstPage, />Anterior<\/button>/);
  assert.match(secondPage, /onclick="previous\(\)"\s*>Anterior<\/button>/);
});
