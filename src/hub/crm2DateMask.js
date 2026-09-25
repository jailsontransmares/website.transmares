function validIsoDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function maskCrm2Date(value = '') {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function normalizeCrm2Date(value = '') {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const brazilian = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brazilian) {
    const iso = `${brazilian[3]}-${brazilian[2]}-${brazilian[1]}`;
    return validIsoDate(iso) ? iso : raw;
  }
  return raw;
}

export function isValidCrm2Date(value = '') {
  return validIsoDate(value);
}

export function formatCrm2DateForInput(value = '') {
  const raw = String(value ?? '').trim();
  if (validIsoDate(raw)) return `${raw.slice(8, 10)}/${raw.slice(5, 7)}/${raw.slice(0, 4)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return maskCrm2Date(raw);
}

export function renderCrm2MaskedDateField({ id, name = 'nascimento', value = '', onInput, onPicker, onOpen, required = false, invalid = false, readOnly = false, inputClassName = '', autoField = false } = {}) {
  const safe = (item) => String(item ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll("'", '&#039;');
  const isoValue = normalizeCrm2Date(value);
  const pickerValue = isValidCrm2Date(isoValue) ? isoValue : '';
  return `<div class="crm2-birth-date-mask-wrap"><input id="${safe(id)}" class="config-input ${safe(inputClassName)}" type="text" name="${safe(name)}" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="dd/mm/aaaa" value="${safe(formatCrm2DateForInput(value))}"${required ? ' required' : ''}${readOnly ? ' readonly aria-readonly="true"' : ''}${autoField ? ' data-pf-auto-field="true"' : ''} aria-invalid="${invalid ? 'true' : 'false'}"${onInput && !readOnly ? ` oninput="${safe(onInput)}"` : ''}><button class="crm2-birth-date-picker" type="button" title="Selecionar data" aria-label="Selecionar data de nascimento"${readOnly ? ' disabled' : ''} onclick="${safe(onOpen)}(this)"><i data-lucide="calendar" aria-hidden="true"></i></button><input class="crm2-opp-next-action-native-date" type="date" value="${safe(pickerValue)}" aria-label="Selecionar data de nascimento"${readOnly ? ' disabled' : ''} onchange="${safe(onPicker)}(this)"></div>`;
}
