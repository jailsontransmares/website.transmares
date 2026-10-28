export const CARENCIA_TABLE_FORMAT = 'simulador_saude.carencias.tabela';
export const CARENCIA_TABLE_VERSION = 1;

const COLUMNS = [
  { id: 'regra', label: 'Procedimento' },
  { id: 'prazo', label: 'Prazo' }
];

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function legacyRows(value) {
  if (typeof value === 'string') return value.split(/\r?\n/).filter(line => line.trim());
  if (Array.isArray(value)) return value.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const prazo = item.prazo || item.periodo || '';
      const regra = item.cobertura || item.procedimento || item.regra || item.descricao || item.nome || '';
      return { prazo, regra };
    }
    return String(item ?? '');
  }).filter(item => typeof item !== 'string' || item.trim());
  if (value && typeof value === 'object') return Object.entries(value)
    .filter(([key]) => key !== 'observacao')
    .map(([prazo, regra]) => ({ prazo, regra: typeof regra === 'string' ? regra : JSON.stringify(regra ?? '') }));
  return [];
}

export function isCarenciaTable(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && value.formato === CARENCIA_TABLE_FORMAT);
}

export function normalizeCarenciaTable(value) {
  if (!isCarenciaTable(value)) {
    const entries = legacyRows(value);
    return {
      formato: CARENCIA_TABLE_FORMAT,
      versao: CARENCIA_TABLE_VERSION,
      colunas: COLUMNS,
      linhas: entries.map(entry => {
        let prazo = '';
        let regra = '';
        if (typeof entry === 'string') {
          const match = entry.match(/^\s*([^:]+?)\s*:\s*(.+)\s*$/);
          if (match) [, prazo, regra] = match;
          else regra = entry;
        } else {
          prazo = String(entry.prazo ?? '');
          regra = String(entry.regra ?? '');
        }
        return { id: makeId(), celulas: { prazo, regra } };
      }),
      legadoConvertido: entries.length > 0
    };
  }

  const linhas = (Array.isArray(value.linhas) ? value.linhas : [])
    .filter(row => row && typeof row === 'object')
    .map(row => ({
      id: String(row.id || makeId()),
      celulas: Object.fromEntries(COLUMNS.map(column => [
        column.id,
        String(row.celulas?.[column.id] ?? '')
      ]))
    }));
  return { formato: CARENCIA_TABLE_FORMAT, versao: CARENCIA_TABLE_VERSION, colunas: COLUMNS, linhas };
}

export function createCarenciaRow() {
  return { id: makeId(), celulas: { prazo: '', regra: '' } };
}
