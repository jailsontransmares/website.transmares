export const CRM2_ORIGIN_OPTIONS = [
  'Contador(a)',
  'Administradora de Condomínio',
  'Cliente da Corretora',
  'Anúncios/redes sociais',
  'Indicação',
  'Hotsite Certisign',
  'Projeto PSAR',
  'Outros'
];

export function normalizarOrigemCrm2(value = '') {
  const current = String(value || '').trim();
  return CRM2_ORIGIN_OPTIONS.includes(current) ? current : (current ? 'Outros' : '');
}
