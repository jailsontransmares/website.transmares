const CADASTRO_TAB_BY_ROUTE = Object.freeze({
  '201': 'pf',
  '202': 'pj',
  '203': 'vinculos',
  'crm2-pf': 'pf',
  'crm2-pj': 'pj',
  'crm2-vinculos': 'vinculos'
});

export function resolveCrm2CadastroTab(route = '') {
  return CADASTRO_TAB_BY_ROUTE[String(route)] || 'pf';
}
