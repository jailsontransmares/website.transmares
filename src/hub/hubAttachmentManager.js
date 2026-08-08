import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Padrão global de anexos do Hub.
 *
 * O módulo concentra as regras compartilhadas de inclusão, visualização,
 * seleção em lote, download, exclusão e responsividade. A persistência e as
 * permissões continuam sendo responsabilidade da tela que o utiliza.
 */
export const HUB_ATTACHMENT_MANAGER_NAME = 'HubAttachmentManager';
export const HUB_ATTACHMENT_MANAGER_VERSION = '2.0.0';

export const HUB_ATTACHMENT_VIEW_MODES = Object.freeze({
  LIST: 'list',
  GRID: 'grid'
});

export const HUB_ATTACHMENT_ACTIONS = Object.freeze({
  SELECT: 'select',
  DOWNLOAD_ALL: 'download-all',
  DOWNLOAD_SELECTED: 'download-selected',
  CHANGE_VIEW: 'change-view',
  INCLUDE: 'include',
  EDIT: 'edit',
  SAVE_EDIT: 'save-edit',
  CANCEL_EDIT: 'cancel-edit',
  VIEW: 'view',
  PICK_EXPIRATION: 'pick-expiration',
  DELETE: 'delete',
  DELETE_SELECTED: 'delete-selected'
});

export const HUB_ATTACHMENT_PERMISSIONS = Object.freeze({
  VIEW: 'view',
  EDIT: 'update',
  DELETE: 'delete'
});

export const HUB_ATTACHMENT_MANAGER_RULES = Object.freeze({
  contract: 'crm2-global',
  version: HUB_ATTACHMENT_MANAGER_VERSION,
  toolbar: 'icon-only-with-tooltip',
  desktopGridColumns: 3,
  tabletGridColumns: 2,
  mobileGridColumns: 1,
  maxPreviewNameLines: 2,
  supportsMultipleFiles: true,
  supportsOptionalExpiration: true,
  supportsInlineFileNameEdit: true,
  supportsInlineExpirationEdit: true,
  supportsNativeExpirationPicker: true,
  supportsRealPreview: true,
  supportsOriginalFileDownload: true,
  supportsDragAndDrop: true,
  zipMultipleDownloads: true,
  permissions: HUB_ATTACHMENT_PERMISSIONS
});

export function getHubAttachmentManagerAttributes(extra = {}) {
  return {
    'data-attachment-manager': HUB_ATTACHMENT_MANAGER_NAME,
    'data-attachment-manager-version': HUB_ATTACHMENT_MANAGER_VERSION,
    'data-attachment-contract': HUB_ATTACHMENT_MANAGER_RULES.contract,
    ...extra
  };
}

export async function hydrateHubPdfThumbnails(root = document) {
  const canvases = Array.from(root.querySelectorAll?.('canvas[data-hub-pdf-thumbnail]') || []);
  await Promise.all(canvases.map(async (canvas) => {
    if (canvas.dataset.pdfThumbnailState || !canvas.dataset.pdfSource) return;
    const source = canvas.dataset.pdfSource;
    let pdf = null;
    canvas.dataset.pdfThumbnailState = 'loading';
    try {
      const documentTask = pdfjsLib.getDocument({ url: source });
      pdf = await documentTask.promise;
      if (!canvas.isConnected) return;
      const page = await pdf.getPage(1);
      if (!canvas.isConnected) return;
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(1, canvas.parentElement?.clientWidth || 180);
      const availableHeight = Math.max(1, canvas.parentElement?.clientHeight || 112);
      const scale = Math.min(availableWidth / baseViewport.width, availableHeight / baseViewport.height);
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale: scale * ratio });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${Math.ceil(viewport.width / ratio)}px`;
      canvas.style.height = `${Math.ceil(viewport.height / ratio)}px`;
      const canvasContext = canvas.getContext('2d', { alpha: true });
      if (!canvasContext) throw new Error('Contexto 2D indisponível para a miniatura PDF.');
      await page.render({ canvasContext, viewport }).promise;
      if (!canvas.isConnected) return;
      canvas.dataset.pdfThumbnailState = 'ready';
    } catch (error) {
      console.error('[HubAttachmentManager] Falha ao hidratar miniatura PDF.', error);
      if (!canvas.isConnected) return;
      canvas.dataset.pdfThumbnailState = 'error';
      const fallback = Object.assign(document.createElement('span'), {
        className: 'crm2-pf-pdf-thumbnail-fallback',
        textContent: 'Prévia indisponível'
      });
      canvas.parentElement?.append(fallback);
    } finally {
      if (pdf) await pdf.destroy().catch(() => {});
    }
  }));
}

export function getHubAttachmentPreviewKind(attachment = {}) {
  const name = String(attachment.nome || attachment.arquivoOriginal || '');
  const type = String(attachment.tipo || '').toLowerCase();
  if (type.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg)$/i.test(name)) return 'image';
  if (type.includes('pdf') || /\.pdf$/i.test(name)) return 'pdf';
  return 'unavailable';
}

export function getHubAttachmentPreviewSource(attachment = {}) {
  if (attachment.previewUrl || attachment.url) return attachment.previewUrl || attachment.url;
  if (attachment.arquivo instanceof Blob && typeof URL !== 'undefined') {
    attachment.previewUrl = URL.createObjectURL(attachment.arquivo);
    return attachment.previewUrl;
  }
  return '';
}

function escapeHubAttachmentHtml(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeHubAttachmentAttr(value = '') {
  return escapeHubAttachmentHtml(value).replaceAll('`', '&#096;');
}

function hubAttachmentNameParts(name = '') {
  const value = String(name || '');
  const match = value.match(/(\.[^.]+)$/);
  return { base: match ? value.slice(0, -match[1].length) : value, extension: match?.[1] || '' };
}

function hubAttachmentHandler(handlers, name, ...args) {
  const handler = handlers?.[name];
  return typeof handler === 'function' ? String(handler(...args) || '') : '';
}

function renderHubAttachmentAction({ icon, label, title = label, onclick = '', className = '', dataAttribute = '' }) {
  return `<button class="icon-btn${className ? ` ${className}` : ''}" type="button" aria-label="${escapeHubAttachmentAttr(label)}" title="${escapeHubAttachmentAttr(title)}"${dataAttribute ? ` ${dataAttribute}` : ''}${onclick ? ` onclick="${escapeHubAttachmentAttr(onclick)}"` : ''}><i data-lucide="${escapeHubAttachmentAttr(icon)}" aria-hidden="true"></i></button>`;
}

function renderHubAttachmentPreview(attachment, action, previewClass = '') {
  const name = String(attachment?.nome || attachment?.arquivoOriginal || 'Anexo');
  const kind = getHubAttachmentPreviewKind(attachment);
  const source = getHubAttachmentPreviewSource(attachment);
  const classes = `crm2-pf-attachment-preview${previewClass ? ` ${previewClass}` : ''}`;
  const interaction = action ? `role="button" tabindex="0" onclick="${escapeHubAttachmentAttr(action)}" onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); ${escapeHubAttachmentAttr(action)}; }"` : 'aria-disabled="true"';
  if (kind === 'image' && source) return `<div class="${classes} is-image" ${interaction}><img src="${escapeHubAttachmentAttr(source)}" alt="Prévia de ${escapeHubAttachmentAttr(name)}" loading="lazy"></div>`;
  if (kind === 'pdf' && source) return `<div class="${classes} is-pdf" ${interaction}><canvas data-hub-pdf-thumbnail="true" data-pdf-source="${escapeHubAttachmentAttr(source)}" aria-label="Miniatura de ${escapeHubAttachmentAttr(name)}"></canvas></div>`;
  return `<div class="${classes} is-unavailable" ${interaction}><span>Prévia indisponível</span></div>`;
}

/** Renderiza o contrato global do bloco de anexos usado pelo CRM 2.0. */
export function renderHubAttachmentManager({
  id = 'hub-attachments-title',
  className = '',
  attachments = [],
  drafts = [],
  editing = false,
  canView = true,
  canInclude = false,
  canEdit = false,
  canDelete = false,
  showBatchActions = false,
  selectionMode = false,
  selectedKeys = [],
  viewMode = HUB_ATTACHMENT_VIEW_MODES.LIST,
  inlineEditKey = '',
  inlineDraft = null,
  confirmingKey = '',
  formatDate = (value) => value || 'Sem validade',
  handlers = {},
  emptyMessage = 'Nenhum anexo.',
  emptyHint = 'Os anexos podem ser incluídos durante a edição.',
  includePickerId = '',
  dropzone = ''
} = {}) {
  const safeViewMode = viewMode === HUB_ATTACHMENT_VIEW_MODES.GRID ? HUB_ATTACHMENT_VIEW_MODES.GRID : HUB_ATTACHMENT_VIEW_MODES.LIST;
  const selected = new Set(selectedKeys || []);
  const keyOf = (attachment) => `${attachment.source}:${attachment.index}`;
  const selectedCount = attachments.filter((attachment) => selected.has(keyOf(attachment))).length;
  const hasDrafts = drafts.length > 0;
  const toolbarVisible = Boolean(showBatchActions && !hasDrafts);
  const previewClass = 'crm2-pj-attachment-preview';
  const handler = (name, ...args) => hubAttachmentHandler(handlers, name, ...args);
  const draftNameClass = 'crm2-pj-attachment-inline-name crm2-pf-attachment-name-input';
  const draftNameInputClass = 'config-input crm2-pj-attachment-inline-input';
  const draftExtensionTag = 'small';
  const draftDateClass = 'crm2-pf-attachment-validity-pill crm2-pj-attachment-date-editor crm2-pf-attachment-inline-date';
  const draftDateInputClass = 'config-input crm2-pj-attachment-inline-input';
  const draftDatePickerClass = 'crm2-pj-date-picker-trigger';
  const draftDateNativeClass = 'crm2-pj-attachment-date-native';
  const includeAction = canInclude
    ? (editing
      ? `<label class="icon-btn crm2-pf-include-attachment" title="Incluir anexo" aria-label="Incluir anexo"><i data-lucide="file-plus-2" aria-hidden="true"></i>${includePickerId ? `<input id="${escapeHubAttachmentAttr(includePickerId)}" type="file" multiple hidden onchange="${escapeHubAttachmentAttr(handler('selectFiles'))}">` : `<input type="file" multiple hidden onchange="${escapeHubAttachmentAttr(handler('selectFiles'))}">`}</label>`
      : renderHubAttachmentAction({ icon: 'file-plus-2', label: 'Incluir anexo', title: 'Incluir anexo', className: 'crm2-pf-include-attachment', onclick: handler('openEdit') }))
    : '';
  const toolbar = toolbarVisible ? `<div class="crm2-pf-attachment-batch-toolbar" role="toolbar" aria-label="Ações dos anexos">${renderHubAttachmentAction({ icon: 'list-checks', label: selectionMode ? 'Sair do modo de seleção' : 'Selecionar anexos', title: selectionMode ? 'Sair da seleção' : 'Selecionar anexos', onclick: handler('toggleSelection'), className: selectionMode ? 'is-active' : '' })}${renderHubAttachmentAction({ icon: 'download', label: 'Baixar todos os anexos', title: 'Baixar todos', onclick: handler('downloadAll') })}${selectionMode && selectedCount ? renderHubAttachmentAction({ icon: 'download-cloud', label: 'Baixar anexos selecionados', title: 'Baixar selecionados', onclick: handler('downloadSelected') }) : ''}${selectionMode && selectedCount && canDelete ? renderHubAttachmentAction({ icon: 'trash-2', label: 'Excluir anexos selecionados', title: 'Excluir selecionados', onclick: handler('deleteSelected') }) : ''}<span class="crm2-pf-attachment-toolbar-divider" aria-hidden="true"></span>${renderHubAttachmentAction({ icon: 'list', label: 'Exibir anexos em lista', title: 'Exibir em lista', onclick: handler('setView', 'list'), className: safeViewMode === 'list' ? 'is-active' : '' })}${renderHubAttachmentAction({ icon: 'layout-grid', label: 'Exibir anexos em miniaturas', title: 'Exibir em miniaturas', onclick: handler('setView', 'grid'), className: safeViewMode === 'grid' ? 'is-active' : '' })}</div>${selectedCount ? `<span class="crm2-pf-attachment-selection-count" role="status">${selectedCount} selecionado(s)</span>` : ''}` : '';
  const draftEditor = hasDrafts ? `<div class="crm2-pf-form-attachment-list crm2-pf-attachment-draft-list" role="group" aria-label="Configurar anexo selecionado">${drafts.map((draft, index) => `<article class="crm2-pf-form-attachment-row crm2-pf-attachment-draft-row"><div class="crm2-pf-attachment-name-cell"><span class="${draftNameClass}"><input class="${draftNameInputClass}" type="text" value="${escapeHubAttachmentAttr(draft.nome)}" ${index === 0 ? 'autofocus' : ''} aria-label="Nome do arquivo" oninput="${escapeHubAttachmentAttr(handler('updateDraftName', index))}"><${draftExtensionTag} aria-label="Extensão do arquivo">${escapeHubAttachmentHtml(draft.extensao || '')}</${draftExtensionTag}></span></div><span class="${draftDateClass}"><input class="${draftDateInputClass}" type="text" value="${escapeHubAttachmentAttr(draft.displayValidade || (draft.validade ? formatDate(draft.validade) : ''))}" placeholder="dd/mm/aaaa" inputmode="numeric" maxlength="10" aria-label="Vencimento do arquivo" oninput="${escapeHubAttachmentAttr(handler('maskDraftDate', index))}"><label class="icon-btn ${draftDatePickerClass} hub-date-input" title="Selecionar data" aria-label="Selecionar data"><i data-lucide="calendar" aria-hidden="true"></i><input class="${draftDateNativeClass}" type="date" value="${escapeHubAttachmentAttr(draft.validade || '')}" aria-label="Selecionar vencimento" onchange="${escapeHubAttachmentAttr(handler('pickDraftDate', index, 'this.value'))}"></label></span></article>`).join('')}</div>` : '';
  const rows = attachments.map((attachment) => {
    const key = keyOf(attachment);
    const isSelected = selected.has(key);
    const inlineEditing = inlineEditKey === key;
    const confirming = confirmingKey === key;
    const currentDraft = inlineDraft || attachment;
    const parts = hubAttachmentNameParts(inlineEditing ? currentDraft.nome : attachment.nome);
    const viewAction = handler('view', attachment.source, attachment.index, attachment.nome);
    const dateValue = currentDraft.displayValidade || (currentDraft.validade ? formatDate(currentDraft.validade) : '');
    const dateEditor = !confirming && inlineEditing && safeViewMode === HUB_ATTACHMENT_VIEW_MODES.LIST
      ? `<span class="crm2-pf-attachment-validity-pill crm2-pj-attachment-date-editor crm2-pf-attachment-inline-date"><input class="config-input crm2-pj-attachment-inline-input crm2-pf-attachment-inline-input" type="text" value="${escapeHubAttachmentAttr(dateValue)}" placeholder="dd/mm/aaaa" inputmode="numeric" maxlength="10" aria-label="Vencimento do arquivo" oninput="${escapeHubAttachmentAttr(handler('maskDate'))}"><label class="icon-btn crm2-pj-date-picker-trigger crm2-pf-date-picker-trigger hub-date-input" title="Selecionar data" aria-label="Selecionar data"><i data-lucide="calendar" aria-hidden="true"></i><input class="crm2-pj-attachment-date-native crm2-pf-attachment-date-native" type="date" value="${escapeHubAttachmentAttr(currentDraft.validade || '')}" aria-label="Selecionar vencimento" onchange="${escapeHubAttachmentAttr(handler('pickDate'))}"></label></span>`
      : `<span class="crm2-pf-attachment-validity-text">${escapeHubAttachmentHtml(formatDate(attachment.validade))}</span>`;
    const rowActions = confirming
      ? `<button class="secondary-btn" type="button" onclick="${escapeHubAttachmentAttr(handler('confirmDelete'))}">Sim</button><button class="secondary-btn" type="button" onclick="${escapeHubAttachmentAttr(handler('cancelDelete'))}">Não</button>`
      : inlineEditing
      ? `${renderHubAttachmentAction({ icon: 'check', label: 'Salvar edição do anexo', title: 'Salvar', onclick: handler('saveInlineEdit') })}${renderHubAttachmentAction({ icon: 'x', label: 'Cancelar edição do anexo', title: 'Cancelar', onclick: handler('cancelInlineEdit') })}`
      : `${canEdit ? renderHubAttachmentAction({ icon: 'pencil', label: `Editar anexo ${attachment.nome}`, title: 'Editar', onclick: handler('editInline', attachment.source, attachment.index), dataAttribute: 'data-hub-attachment-edit="true"' }) : ''}${canView ? renderHubAttachmentAction({ icon: 'download', label: `Baixar anexo ${attachment.nome}`, title: 'Baixar', onclick: handler('download', attachment.source, attachment.index) }) : ''}${canDelete ? renderHubAttachmentAction({ icon: 'trash-2', label: `Excluir anexo ${attachment.nome}`, title: 'Excluir', onclick: handler('delete', attachment.source, attachment.index, attachment.nome) }) : ''}`;
    const nameCell = confirming
      ? '<div class="crm2-pf-attachment-confirmation" role="alert"><span>Confirmar exclusão?</span></div>'
      : inlineEditing ? `<span class="crm2-pj-attachment-inline-name crm2-pf-attachment-inline-name"><input class="config-input crm2-pj-attachment-inline-input crm2-pf-attachment-inline-input" type="text" value="${escapeHubAttachmentAttr(parts.base)}" aria-label="Nome do arquivo" oninput="${escapeHubAttachmentAttr(handler('updateInlineName'))}"><small aria-label="Extensão do arquivo">${escapeHubAttachmentHtml(currentDraft.extensao || parts.extension)}</small></span>`
        : `<strong role="button" tabindex="0" aria-label="Visualizar anexo ${escapeHubAttachmentAttr(attachment.nome)}" onclick="${escapeHubAttachmentAttr(viewAction)}" onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); ${escapeHubAttachmentAttr(viewAction)}; }">${escapeHubAttachmentHtml(attachment.nome)}</strong>`;
    return `<article class="crm2-pf-form-attachment-row${isSelected ? ' is-selected' : ''}${confirming ? ' is-confirming' : ''}">${toolbarVisible && selectionMode && !confirming ? `<label class="crm2-pf-attachment-select"><input type="checkbox" aria-label="Selecionar anexo ${escapeHubAttachmentAttr(attachment.nome)}" ${isSelected ? 'checked' : ''} onchange="${escapeHubAttachmentAttr(handler('toggleSelected', attachment.source, attachment.index))}"><span aria-hidden="true"></span></label>` : ''}${!confirming && safeViewMode === HUB_ATTACHMENT_VIEW_MODES.GRID ? renderHubAttachmentPreview(attachment, viewAction, previewClass) : !confirming ? '<i data-lucide="archive" aria-hidden="true"></i>' : ''}<div class="crm2-pf-attachment-name-cell">${nameCell}</div>${dateEditor}<div class="crm2-pf-attachment-row-actions">${rowActions}</div></article>`;
  }).join('');
  const attachmentList = attachments.length
    ? `<div class="crm2-pf-form-attachment-list ${safeViewMode === HUB_ATTACHMENT_VIEW_MODES.GRID ? 'is-grid-view' : ''}" aria-label="Anexos selecionados">${rows}</div>`
    : hasDrafts ? ''
      : `<div class="crm2-pessoas-state is-compact"><strong>${escapeHubAttachmentHtml(emptyMessage)}</strong><span>${escapeHubAttachmentHtml(emptyHint)}</span></div>`;
  return `<div class="hub-attachment-manager crm2-attachment-manager crm2-pf-attachments-block ${escapeHubAttachmentAttr(className)}" data-attachment-manager="${HUB_ATTACHMENT_MANAGER_NAME}" data-attachment-manager-version="${HUB_ATTACHMENT_MANAGER_VERSION}" data-attachment-contract="${HUB_ATTACHMENT_MANAGER_RULES.contract}"><div class="hub-form-section-title crm2-pf-attachments-header"><strong id="${escapeHubAttachmentAttr(id)}">Anexos</strong><div class="crm2-pf-attachments-header-actions">${hasDrafts && handler('cancelDraft') ? renderHubAttachmentAction({ icon: 'x', label: 'Cancelar inclusão de anexo', title: 'Cancelar inclusão', onclick: handler('cancelDraft') }) : ''}${hasDrafts && handler('confirmDraft') ? renderHubAttachmentAction({ icon: 'check', label: 'Adicionar anexo', title: 'Adicionar anexo', onclick: handler('confirmDraft') }) : ''}${toolbar}${includeAction}</div></div><section class="crm2-pf-attachments-content" aria-labelledby="${escapeHubAttachmentAttr(id)}">${dropzone}${draftEditor}${attachmentList}</section></div>`;
}

export function getHubAttachmentFileExtension(name = '') {
  const value = String(name || '');
  const index = value.lastIndexOf('.');
  return index > 0 ? value.slice(index) : '';
}

export function sanitizeHubAttachmentFileName(name = 'anexo') {
  return String(name || 'anexo').replace(/[\\/:*?"<>|]/g, '-').trim() || 'anexo';
}

export function getHubAttachmentDownloadName(name = 'anexo', fallbackExtension = '.txt') {
  const sanitized = sanitizeHubAttachmentFileName(name);
  return getHubAttachmentFileExtension(sanitized) ? sanitized : `${sanitized}${fallbackExtension}`;
}
