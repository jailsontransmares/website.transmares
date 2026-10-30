import { renderHubPagination } from './hubPagination.js';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Renderiza o contêiner global de uma tabela e seu controle de paginação. */
export function renderHubDataTable({
  tableHtml,
  wrapperClass = 'admin-table-wrap',
  itemLabel = 'registros',
  ariaLabel = 'Paginação',
  className = ''
} = {}) {
  const classes = ['hub-data-table-component', className].filter(Boolean).join(' ');
  return `
    <section class="${escapeHtml(classes)}" data-hub-data-table-component data-hub-pagination-item-label="${escapeHtml(itemLabel)}" data-hub-pagination-label="${escapeHtml(ariaLabel)}">
      <div class="${escapeHtml(wrapperClass)}">${tableHtml || ''}</div>
      ${renderHubPagination({ itemLabel, ariaLabel, totalItems: 0, hidden: true })}
    </section>
  `;
}
