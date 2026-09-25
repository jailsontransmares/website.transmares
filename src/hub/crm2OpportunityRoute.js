export function resolveCrm2OpportunityRoute(pathname = '') {
  const segments = String(pathname).split('/').filter(Boolean);
  const opportunityIndex = segments.findIndex((segment, index) => segment === 'painel-ar' && segments[index + 1] === '205');

  if (opportunityIndex >= 0) {
    const tail = segments.slice(opportunityIndex + 2);
    if (tail[0] === 'oportunidade' && tail[1] === 'novo') return { active: true, view: 'opp-new', id: '' };
    if (tail[0] === 'oportunidade' && tail[2] === 'editar') return { active: true, view: 'opp-edit', id: tail[1] || '' };
    if (tail[0] === 'oportunidade' && tail[1]) return { active: true, view: 'opp-detail', id: tail[1] };
    return { active: true, view: 'list', id: '' };
  }

  const crmIndex = segments.findIndex((segment, index) => segment === 'painel-ar' && segments[index + 1] === '200');
  if (crmIndex >= 0 && segments.length === crmIndex + 2) return { active: true, view: 'list', id: '', isCrmHome: true };
  return { active: false, view: 'list', id: '' };
}
