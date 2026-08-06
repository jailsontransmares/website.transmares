const HUB_TABLE_MIN_WIDTH = 72;
const HUB_TABLE_MAX_WIDTH = 560;

function getHubTableStorageKey(table) {
  return `hub-table-widths:${table.dataset.resizeKey || table.className}`;
}

function getHubTableColumns(table) {
  const headers = [...table.querySelectorAll(':scope > thead > tr:first-child > th')];
  let colgroup = table.querySelector(':scope > colgroup[data-hub-resizable-columns]');
  if (!colgroup) {
    colgroup = document.createElement('colgroup');
    colgroup.dataset.hubResizableColumns = 'true';
    headers.forEach((header, index) => {
      const col = document.createElement('col');
      col.dataset.column = header.dataset.column || `column-${index}`;
      colgroup.appendChild(col);
    });
    table.insertBefore(colgroup, table.firstChild);
  }
  return { headers, columns: [...colgroup.children] };
}

function readHubTableWidths(table, columns) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(getHubTableStorageKey(table)) || '{}');
    columns.forEach((column) => {
      const width = Number(saved[column.dataset.column]);
      if (Number.isFinite(width)) column.style.width = `${Math.min(HUB_TABLE_MAX_WIDTH, Math.max(HUB_TABLE_MIN_WIDTH, width))}px`;
    });
  } catch { /* armazenamento local pode estar indisponível */ }
}

function saveHubTableWidths(table, columns) {
  try {
    const widths = Object.fromEntries(columns.map((column) => [column.dataset.column, Math.round(column.getBoundingClientRect().width)]));
    window.localStorage.setItem(getHubTableStorageKey(table), JSON.stringify(widths));
  } catch { /* armazenamento local pode estar indisponível */ }
}

function startHubTableResize(event, table, column, index) {
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = column.getBoundingClientRect().width;
  const pointerId = event.pointerId;
  const move = (moveEvent) => {
    const nextWidth = Math.min(HUB_TABLE_MAX_WIDTH, Math.max(HUB_TABLE_MIN_WIDTH, startWidth + moveEvent.clientX - startX));
    column.style.width = `${nextWidth}px`;
    table.style.cursor = 'col-resize';
  };
  const stop = () => {
    table.style.cursor = '';
    saveHubTableWidths(table, [...table.querySelectorAll(':scope > colgroup[data-hub-resizable-columns] > col')]);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
    try { event.currentTarget.releasePointerCapture(pointerId); } catch { /* captura pode já ter sido liberada */ }
  };
  event.currentTarget.setPointerCapture?.(pointerId);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', stop, { once: true });
  window.addEventListener('pointercancel', stop, { once: true });
  void index;
}

function initializeHubResizableTable(table) {
  if (!table || table.dataset.hubResizableReady === 'true') return;
  const { headers, columns } = getHubTableColumns(table);
  if (!headers.length || headers.length !== columns.length) return;
  table.dataset.hubResizableReady = 'true';
  readHubTableWidths(table, columns);
  if (table.dataset.resizableEditable !== 'true') return;
  headers.forEach((header, index) => {
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'hub-table-resize-handle';
    handle.setAttribute('aria-label', `Redimensionar coluna ${header.textContent.trim() || index + 1}`);
    handle.title = 'Redimensionar coluna';
    handle.addEventListener('pointerdown', (event) => startHubTableResize(event, table, columns[index], index));
    handle.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const current = columns[index].getBoundingClientRect().width;
      columns[index].style.width = `${Math.min(HUB_TABLE_MAX_WIDTH, Math.max(HUB_TABLE_MIN_WIDTH, current + (event.key === 'ArrowRight' ? 12 : -12)))}px`;
      saveHubTableWidths(table, columns);
    });
    header.appendChild(handle);
  });
}

export function initializeHubResizableTables(root = document) {
  root.querySelectorAll?.('table[data-resizable-table]').forEach(initializeHubResizableTable);
  if (root.matches?.('table[data-resizable-table]')) initializeHubResizableTable(root);
}
