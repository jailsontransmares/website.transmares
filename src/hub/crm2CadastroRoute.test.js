import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCrm2CadastroTab } from './crm2CadastroRoute.js';

test('canonical Cadastro routes select the matching tab', () => {
  assert.equal(resolveCrm2CadastroTab('201'), 'pf');
  assert.equal(resolveCrm2CadastroTab('202'), 'pj');
  assert.equal(resolveCrm2CadastroTab('203'), 'vinculos');
});

test('legacy CRM 2 tab routes keep PJ and Vínculos out of the PF tab', () => {
  assert.equal(resolveCrm2CadastroTab('crm2-pf'), 'pf');
  assert.equal(resolveCrm2CadastroTab('crm2-pj'), 'pj');
  assert.equal(resolveCrm2CadastroTab('crm2-vinculos'), 'vinculos');
});
