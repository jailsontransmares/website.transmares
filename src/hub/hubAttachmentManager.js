/**
 * Padrão global de anexos do Hub.
 *
 * O módulo concentra as regras compartilhadas de inclusão, visualização,
 * seleção em lote, download, exclusão e responsividade. A persistência e as
 * permissões continuam sendo responsabilidade da tela que o utiliza.
 */
export const HUB_ATTACHMENT_MANAGER_NAME = 'HubAttachmentManager';
export const HUB_ATTACHMENT_MANAGER_VERSION = '1.0.0';

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
  VIEW: 'view',
  DELETE: 'delete',
  DELETE_SELECTED: 'delete-selected'
});

export const HUB_ATTACHMENT_PERMISSIONS = Object.freeze({
  VIEW: 'view',
  EDIT: 'update',
  DELETE: 'delete'
});

export const HUB_ATTACHMENT_MANAGER_RULES = Object.freeze({
  toolbar: 'icon-only-with-tooltip',
  desktopGridColumns: 3,
  tabletGridColumns: 2,
  mobileGridColumns: 1,
  maxPreviewNameLines: 2,
  supportsMultipleFiles: true,
  supportsOptionalExpiration: true,
  supportsDragAndDrop: true,
  zipMultipleDownloads: true,
  permissions: HUB_ATTACHMENT_PERMISSIONS
});

export function getHubAttachmentPreviewKind(attachment = {}) {
  const name = String(attachment.nome || attachment.arquivoOriginal || '');
  const type = String(attachment.tipo || '').toLowerCase();
  if (type.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg)$/i.test(name)) return 'image';
  if (type.includes('pdf') || /\.pdf$/i.test(name)) return 'pdf';
  return 'unavailable';
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
