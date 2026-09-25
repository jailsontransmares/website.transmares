function escapeCpfAttribute(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("'", '&#039;');
}

/** Shared inline CPF field; each CRM module supplies its own lookup behavior. */
export function renderCrm2CpfSearchField({ value = '', form = '', onInput = '', onBlur = '', onSearch = '', required = false } = {}) {
  const formAttribute = form ? ` form="${escapeCpfAttribute(form)}"` : '';
  return `<span class="crm2-pf-cpf-input-wrap"><input class="config-input" name="pfCpf"${formAttribute} value="${escapeCpfAttribute(value)}" placeholder="000.000.000-00" inputmode="numeric" maxlength="14"${required ? ' required' : ''}${onInput ? ` oninput="${escapeCpfAttribute(onInput)}"` : ''}${onBlur ? ` onblur="${escapeCpfAttribute(onBlur)}"` : ''}><button class="crm2-pf-cpf-icon" type="button" title="Buscar CPF" aria-label="Buscar CPF" onclick="${escapeCpfAttribute(onSearch)}(this.closest('.crm2-pf-cpf-input-wrap').querySelector('[name=pfCpf]').value, this)"><i data-lucide="search" aria-hidden="true"></i></button></span>`;
}
