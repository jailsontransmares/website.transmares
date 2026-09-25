function digitsOnly(value = '') {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Builds a read-only view of the relationships for one PF or PJ.
 * Central relationship records win over embedded legacy snapshots; snapshots
 * without a central ID remain visible for backward compatibility.
 */
export function resolveCrm2CadastroRelations({ records = [], references = [], identityField, identityValue, side }) {
  const identity = digitsOnly(identityValue);
  if (!identity || !['pf', 'pj'].includes(side)) return [];

  const getIdentity = (record) => digitsOnly(side === 'pf' ? record?.pfCpf : record?.pjCnpj);
  const canonicalById = new Map(records.filter((record) => record?.id).map((record) => [String(record.id), record]));
  const matchingCanonical = records.filter((record) => getIdentity(record) === identity);
  const result = new Map();

  const toView = (record, reference = {}) => side === 'pf'
    ? { ...reference, ...record, id: record.id, centralizado: true, razaoSocial: record.pjRazaoSocial, nome: record.pjRazaoSocial, cnpj: record.pjCnpj }
    : { ...reference, ...record, id: record.id, centralizado: true, vinculoId: record.id, nome: record.pfNome, cpf: record.pfCpf };

  matchingCanonical.forEach((record) => result.set(String(record.id), toView(record)));

  references.forEach((reference, index) => {
    const id = reference?.id || reference?.vinculoId;
    if (id && canonicalById.has(String(id))) {
      const canonical = canonicalById.get(String(id));
      if (getIdentity(canonical) === identity) result.set(String(id), toView(canonical, reference));
      return;
    }
    const referenceIdentity = digitsOnly(reference?.[identityField]);
    if (referenceIdentity && referenceIdentity !== identity) return;
    result.set(String(id || `legacy-${index}`), { ...reference, id: id || '', sourceIndex: index });
  });

  return [...result.values()];
}
