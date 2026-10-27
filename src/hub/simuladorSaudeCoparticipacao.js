export const COPARTICIPACAO_TABLE_FORMAT = 'simulador_saude.coparticipacao.tabela';
export const COPARTICIPACAO_TABLE_VERSION = 1;

const PROCEDURE_COLUMN_ID = 'procedimento';

function makeId(prefix) {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${value}`;
}

function defaultColumns(procedureLabel = 'Procedimento') {
  return [
    { id: PROCEDURE_COLUMN_ID, label: procedureLabel },
    { id: 'coparticipacao-parcial', label: 'Coparticipação parcial' },
    { id: 'coparticipacao-total', label: 'Coparticipação total' }
  ];
}

function legacyLines(value) {
  if (typeof value === 'string') return value.split(/\r?\n/).filter(line => line.trim());
  if (Array.isArray(value)) return value.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      return [item.procedimento || item.nome, item.descricao || item.cobertura, item.valor != null ? `R$ ${item.valor}` : ''].filter(Boolean).join(': ');
    }
    return String(item ?? '');
  }).filter(line => line.trim());
  if (value && typeof value === 'object') {
    const lines = Object.entries(value)
      .filter(([key]) => key !== 'observacao')
      .map(([key, rule]) => `${key}: ${typeof rule === 'object' && rule !== null ? JSON.stringify(rule) : String(rule ?? '')}`)
      .filter(line => line.trim());
    if (value.observacao) lines.push(`Observação: ${String(value.observacao)}`);
    return lines;
  }
  return [];
}

export function isCoparticipacaoTable(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && value.formato === COPARTICIPACAO_TABLE_FORMAT);
}

export function normalizeCoparticipacaoTable(value) {
  if (!isCoparticipacaoTable(value)) {
    const lines = legacyLines(value);
    const columns = defaultColumns(lines.length ? 'Procedimento / regra anterior' : 'Procedimento');
    return {
      formato: COPARTICIPACAO_TABLE_FORMAT,
      versao: COPARTICIPACAO_TABLE_VERSION,
      colunas: columns,
      linhas: lines.map(text => ({
        id: makeId('linha'),
        celulas: { [PROCEDURE_COLUMN_ID]: text, 'coparticipacao-parcial': '', 'coparticipacao-total': '' }
      })),
      legadoConvertido: lines.length > 0
    };
  }

  const sourceColumns = Array.isArray(value.colunas) ? value.colunas : [];
  const usedColumnIds = new Set();
  const colunas = sourceColumns.filter(column => column && typeof column === 'object').map((column, index) => {
    let id = String(column.id || makeId(`coluna-${index + 1}`));
    if (usedColumnIds.has(id)) id = makeId(`coluna-${index + 1}`);
    usedColumnIds.add(id);
    return { id, label: String(column.label ?? column.titulo ?? '').trim() };
  });
  const safeColumns = colunas.length ? colunas : defaultColumns();
  const usedRowIds = new Set();
  const linhas = (Array.isArray(value.linhas) ? value.linhas : [])
    .filter(row => row && typeof row === 'object')
    .map(row => {
      const sourceCells = row.celulas && typeof row.celulas === 'object' ? row.celulas : {};
      let id = String(row.id || makeId('linha'));
      if (usedRowIds.has(id)) id = makeId('linha');
      usedRowIds.add(id);
      return {
        id,
        celulas: Object.fromEntries(safeColumns
          .map(column => [column.id, String(sourceCells[column.id] ?? '')]))
      };
    });

  return {
    formato: COPARTICIPACAO_TABLE_FORMAT,
    versao: COPARTICIPACAO_TABLE_VERSION,
    colunas: safeColumns,
    linhas
  };
}

export function formatCoparticipacaoTable(value) {
  if (!isCoparticipacaoTable(value)) return null;
  const table = normalizeCoparticipacaoTable(value);
  return table.linhas.map(row => table.colunas
    .map(column => {
      const cell = String(row.celulas[column.id] ?? '').trim();
      return cell ? `${column.label || 'Coluna'}: ${cell}` : '';
    })
    .filter(Boolean)
    .join(' | '))
    .filter(Boolean)
    .join('\n');
}

export function createCoparticipacaoColumn() {
  return { id: makeId('coluna'), label: 'Nova coluna' };
}

export function createCoparticipacaoRow(columns) {
  return {
    id: makeId('linha'),
    celulas: Object.fromEntries(columns.map(column => [column.id, '']))
  };
}
