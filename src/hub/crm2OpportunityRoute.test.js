import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCrm2OpportunityRoute } from './crm2OpportunityRoute.js';

test('CRM 2.0 root displays opportunities and leaves sequential registration separate', () => {
  assert.deepEqual(resolveCrm2OpportunityRoute('/hub/painel-ar/200'), { active: true, view: 'list', id: '', isCrmHome: true });
  assert.deepEqual(resolveCrm2OpportunityRoute('/hub/painel-ar/200/cadastro'), { active: false, view: 'list', id: '' });
});

test('existing opportunity list, create, detail and edit routes remain available', () => {
  assert.deepEqual(resolveCrm2OpportunityRoute('/hub/painel-ar/205'), { active: true, view: 'list', id: '' });
  assert.deepEqual(resolveCrm2OpportunityRoute('/hub/painel-ar/205/oportunidade/novo'), { active: true, view: 'opp-new', id: '' });
  assert.deepEqual(resolveCrm2OpportunityRoute('/hub/painel-ar/205/oportunidade/opp-1'), { active: true, view: 'opp-detail', id: 'opp-1' });
  assert.deepEqual(resolveCrm2OpportunityRoute('/hub/painel-ar/205/oportunidade/opp-1/editar'), { active: true, view: 'opp-edit', id: 'opp-1' });
});
