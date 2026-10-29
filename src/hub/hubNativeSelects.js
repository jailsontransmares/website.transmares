const SELECTOR = 'select:not([data-hub-native-select="skip"])';
const controls = new Set();
let observer = null;
let activeControl = null;
let nextId = 0;
let typeahead = '';
let typeaheadTimer = 0;

const PRESENTATION_PROPERTIES = [
  'backgroundColor', 'backgroundImage', 'borderStyle', 'borderWidth',
  'borderRadius', 'boxSizing', 'color', 'fontFamily', 'fontSize',
  'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'textTransform',
  'whiteSpace', 'height', 'minHeight', 'maxHeight', 'minWidth', 'maxWidth',
  'flex', 'flexBasis', 'flexGrow', 'flexShrink', 'alignSelf', 'margin', 'padding'
];
const VALUE_DESCRIPTOR = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
const INDEX_DESCRIPTOR = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');

function escapeSelector(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function getLabel(select) {
  const explicitLabel = select.getAttribute('aria-label') || select.getAttribute('title');
  if (explicitLabel) return explicitLabel.trim();
  const label = select.closest('label') || (select.id ? document.querySelector(`label[for="${escapeSelector(select.id)}"]`) : null);
  if (!label) return select.name || 'Campo de seleção';
  const copy = label.cloneNode(true);
  copy.querySelectorAll('select, input, textarea, button, small, svg, i').forEach(node => node.remove());
  return copy.textContent.replace(/\s+/g, ' ').trim() || select.name || 'Campo de seleção';
}

function labelFor(select) {
  const label = select.closest('label') || (select.id ? document.querySelector(`label[for="${escapeSelector(select.id)}"]`) : null);
  if (!label) return '';
  if (!label.id) label.id = `hub-select-label-${++nextId}`;
  return label.id;
}

function selectedOptions(select) {
  return Array.from(select.options).filter(option => option.selected);
}

function selectedText(select) {
  const selected = selectedOptions(select);
  if (select.multiple) {
    if (!selected.length) return select.dataset.placeholder || 'Selecione';
    if (selected.length > 2) return `${selected.length} selecionados`;
    return selected.map(option => option.label || option.textContent.trim()).join(', ');
  }
  const option = selected[0];
  return option ? (option.label || option.textContent.trim() || select.dataset.placeholder || 'Selecione') : (select.dataset.placeholder || 'Selecione');
}

function canClear(select) {
  return !select.required && select.dataset.clearable !== 'false';
}

function clearIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function optionEntries(select) {
  const entries = [];
  let groupLabel = '';
  Array.from(select.children).forEach(child => {
    if (child.tagName === 'OPTGROUP') {
      groupLabel = child.label || '';
      Array.from(child.children).forEach(option => entries.push({ option, groupLabel }));
      groupLabel = '';
    } else if (child.tagName === 'OPTION') {
      entries.push({ option: child, groupLabel: '' });
    }
  });
  return entries;
}

function syncClasses(control) {
  const { select, shell, trigger, clear } = control;
  const retained = Array.from(select.classList).filter(name => ![
    'hub-native-select-native', 'hub-native-select-shell', 'hub-native-select-trigger'
  ].includes(name));
  shell.className = ['hub-native-select-shell', ...retained].join(' ');
  trigger.className = ['hub-native-select-trigger', ...retained].join(' ');
  if (select.disabled) shell.classList.add('is-disabled');
  if (activeControl === control) shell.classList.add('is-open');
  if (clear) clear.hidden = !canClear(select) || (select.multiple ? selectedOptions(select).length === 0 : select.selectedIndex < 0 || select.value === '');
  trigger.disabled = select.disabled;
  trigger.tabIndex = select.disabled ? -1 : (control.originalTabIndex === null ? 0 : Number(control.originalTabIndex));
  trigger.setAttribute('aria-required', String(select.required));
  trigger.setAttribute('aria-label', getLabel(select));
  const invalid = select.getAttribute('aria-invalid') === 'true'
    || (trigger.getAttribute('aria-invalid') === 'true' && !select.validity.valid);
  trigger.setAttribute('aria-invalid', String(invalid));
  shell.classList.toggle('is-invalid', trigger.getAttribute('aria-invalid') === 'true');
  if (clear) {
    clear.disabled = select.disabled;
    clear.setAttribute('aria-label', `Limpar ${getLabel(select)}`);
    clear.title = `Limpar ${getLabel(select)}`;
  }
  if (select.multiple) trigger.setAttribute('aria-multiselectable', 'true');
  else trigger.removeAttribute('aria-multiselectable');
}

function syncPresentation(control) {
  if (!control.select.isConnected) return;
  const computed = window.getComputedStyle(control.select);
  PRESENTATION_PROPERTIES.forEach(property => {
    const value = computed[property];
    if (value) control.shell.style[property] = value;
  });
  control.shell.style.display = 'inline-flex';
  control.shell.style.alignItems = 'stretch';
  control.shell.style.boxSizing = 'border-box';
  control.shell.style.minWidth = '0';
  control.shell.style.position = 'relative';
  control.shell.style.cursor = control.select.disabled ? 'not-allowed' : 'pointer';
  control.shell.style.overflow = 'visible';
  control.shell.hidden = control.select.hidden || computed.display === 'none';
  control.trigger.style.font = 'inherit';
  control.trigger.style.color = 'inherit';
  control.trigger.style.textAlign = 'left';
  control.trigger.style.textTransform = 'inherit';
  control.trigger.style.cursor = control.select.disabled ? 'not-allowed' : 'pointer';
}

function syncValue(control) {
  const { select, value, trigger, clear } = control;
  const text = selectedText(select);
  value.textContent = text;
  trigger.setAttribute('aria-valuetext', text);
  if (select.validity.valid && trigger.getAttribute('aria-invalid') === 'true') {
    trigger.setAttribute('aria-invalid', 'false');
    control.shell.classList.remove('is-invalid');
  }
  if (clear) clear.hidden = !canClear(select) || (select.multiple ? selectedOptions(select).length === 0 : select.selectedIndex < 0 || select.value === '');
  if (control.menu && !control.menu.hidden) {
    renderOptions(control);
    const itemCount = control.menu.querySelectorAll('[role="option"]').length;
    if (itemCount) updateActiveOption(control, Math.min(control.activeIndex, itemCount - 1), false);
  }
}

function renderOptions(control) {
  const { select, menu } = control;
  if (!menu) return;
  menu.replaceChildren();
  menu.setAttribute('aria-multiselectable', String(Boolean(select.multiple)));
  let currentGroup = null;
  const entries = optionEntries(select);
  entries.forEach(({ option, groupLabel }, index) => {
    if (groupLabel && groupLabel !== currentGroup) {
      currentGroup = groupLabel;
      const group = document.createElement('div');
      group.className = 'hub-native-select-group-label';
      group.setAttribute('role', 'presentation');
      group.textContent = groupLabel;
      menu.appendChild(group);
    }
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'hub-filter-dropdown-option hub-native-select-option';
    item.id = `${control.id}-option-${index}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(option.selected));
    item.setAttribute('aria-disabled', String(option.disabled || Boolean(option.parentElement?.disabled)));
    item.disabled = option.disabled || Boolean(option.parentElement?.disabled);
    item.dataset.optionIndex = String(index);
    item.textContent = option.label || option.textContent.trim();
    if (option.selected) item.classList.add('is-selected');
    item.addEventListener('click', event => {
      event.preventDefault();
      chooseOption(control, index);
    });
    item.addEventListener('keydown', event => handleMenuKeydown(control, event, index));
    menu.appendChild(item);
  });
}

function updateActiveOption(control, index, focus = true) {
  const items = Array.from(control.menu?.querySelectorAll('[role="option"]') || []);
  if (!items.length) return;
  const enabledIndexes = items.map((item, itemIndex) => item.disabled ? -1 : itemIndex).filter(itemIndex => itemIndex >= 0);
  if (!enabledIndexes.length) return;
  const bounded = Math.max(0, Math.min(items.length - 1, index));
  let nextIndex = bounded;
  if (items[nextIndex]?.disabled) {
    nextIndex = enabledIndexes.reduce((nearest, itemIndex) => Math.abs(itemIndex - bounded) < Math.abs(nearest - bounded) ? itemIndex : nearest, enabledIndexes[0]);
  }
  control.activeIndex = nextIndex;
  items.forEach((item, itemIndex) => item.classList.toggle('is-active', itemIndex === nextIndex));
  control.trigger.setAttribute('aria-activedescendant', items[nextIndex].id);
  if (focus) items[nextIndex].focus({ preventScroll: true });
  items[nextIndex].scrollIntoView({ block: 'nearest' });
}

function positionMenu(control) {
  if (!control?.menu || control.menu.hidden || !control.trigger.isConnected) return;
  const rect = control.trigger.getBoundingClientRect();
  const menu = control.menu;
  const viewportPadding = 8;
  const width = Math.min(Math.max(rect.width, 180), window.innerWidth - viewportPadding * 2);
  menu.style.width = `${width}px`;
  menu.style.maxHeight = `min(320px, calc(100dvh - ${viewportPadding * 2}px))`;
  menu.style.left = `${Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - width - viewportPadding))}px`;
  menu.style.top = `${viewportPadding}px`;
  const menuHeight = menu.getBoundingClientRect().height;
  const below = window.innerHeight - rect.bottom - viewportPadding;
  const above = rect.top - viewportPadding;
  const top = below >= Math.min(menuHeight, 180) || below >= above
    ? Math.min(rect.bottom + 4, window.innerHeight - menuHeight - viewportPadding)
    : Math.max(viewportPadding, rect.top - menuHeight - 4);
  menu.style.top = `${Math.max(viewportPadding, top)}px`;
}

function closeControl(control, restoreFocus = false) {
  if (!control || activeControl !== control) return;
  activeControl = null;
  control.menu.hidden = true;
  control.trigger.setAttribute('aria-expanded', 'false');
  control.trigger.removeAttribute('aria-activedescendant');
  control.shell.classList.remove('is-open');
  if (restoreFocus && control.trigger.isConnected && !control.trigger.disabled) control.trigger.focus({ preventScroll: true });
}

function closeActiveControl(restoreFocus = false) {
  if (activeControl) closeControl(activeControl, restoreFocus);
}

function openControl(control, preferredIndex = null) {
  if (control.select.disabled || !control.select.options.length) return;
  if (activeControl && activeControl !== control) closeControl(activeControl);
  if (!control.menu) {
    const menu = document.createElement('div');
    menu.id = `${control.id}-menu`;
    menu.className = 'hub-filter-dropdown-menu hub-native-select-menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', getLabel(control.select));
    menu.dataset.hubNativeSelectMenu = 'true';
    control.menu = menu;
    document.body.appendChild(menu);
  } else if (!control.menu.isConnected) {
    document.body.appendChild(control.menu);
  }
  renderOptions(control);
  control.menu.hidden = false;
  control.trigger.setAttribute('aria-expanded', 'true');
  control.shell.classList.add('is-open');
  activeControl = control;
  const options = Array.from(control.select.options);
  const selected = control.select.multiple ? selectedOptions(control.select)[0] : control.select.options[control.select.selectedIndex];
  const index = preferredIndex ?? Math.max(0, options.indexOf(selected));
  positionMenu(control);
  updateActiveOption(control, index);
}

function fireNativeSelectionEvents(select) {
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function chooseOption(control, index) {
  const { select } = control;
  const option = select.options[index];
  if (!option || option.disabled || option.parentElement?.disabled) return;
  if (select.multiple) {
    option.selected = !option.selected;
    control.activeIndex = index;
    syncValue(control);
    fireNativeSelectionEvents(select);
    if (control.menu && !control.menu.hidden) updateActiveOption(control, index, true);
    return;
  }
  if (select.selectedIndex === index) {
    closeControl(control, true);
    return;
  }
  select.selectedIndex = index;
  syncValue(control);
  fireNativeSelectionEvents(select);
  if (activeControl === control) closeControl(control, true);
}

function clearSelection(control) {
  const { select } = control;
  if (!canClear(select)) return;
  if (select.multiple) {
    Array.from(select.options).forEach(option => { option.selected = false; });
  } else {
    const emptyOption = Array.from(select.options).find(option => option.value === '');
    select.selectedIndex = emptyOption ? emptyOption.index : -1;
  }
  syncValue(control);
  fireNativeSelectionEvents(select);
  closeControl(control, true);
}

function handleMenuKeydown(control, event, index) {
  const items = Array.from(control.menu?.querySelectorAll('[role="option"]') || []);
  if (!items.length) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    let target = index;
    do {
      target = (target + delta + items.length) % items.length;
    } while (items[target].disabled && target !== index);
    updateActiveOption(control, target);
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    updateActiveOption(control, event.key === 'Home' ? 0 : items.length - 1);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    chooseOption(control, index);
  } else if (event.key === 'Escape' || event.key === 'Tab') {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeControl(control, true);
    } else {
      event.preventDefault();
      closeControl(control);
      const focusable = Array.from(document.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]):not(.hub-native-select-native), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter(element => element.offsetParent !== null && !element.closest('[data-hub-native-select-menu]'));
      const triggerIndex = focusable.indexOf(control.trigger);
      const next = focusable[triggerIndex + (event.shiftKey ? -1 : 1)];
      next?.focus({ preventScroll: true });
    }
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    window.clearTimeout(typeaheadTimer);
    typeahead += event.key.toLocaleLowerCase();
    typeaheadTimer = window.setTimeout(() => { typeahead = ''; }, 650);
    const next = items.findIndex((item, itemIndex) => itemIndex > index && !item.disabled && item.textContent.trim().toLocaleLowerCase().startsWith(typeahead));
    const wrapped = next >= 0 ? next : items.findIndex(item => !item.disabled && item.textContent.trim().toLocaleLowerCase().startsWith(typeahead));
    if (wrapped >= 0) {
      event.preventDefault();
      updateActiveOption(control, wrapped);
    }
  }
}

function handleTriggerKeydown(control, event) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openControl(control, event.key === 'ArrowUp' ? control.select.options.length - 1 : null);
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    if (canClear(control.select)) {
      event.preventDefault();
      clearSelection(control);
    }
  } else if (event.key === 'Escape') {
    closeControl(control, true);
  }
}

function createControl(select) {
  if (select.dataset.hubNativeSelectEnhanced === 'true' || !select.parentNode) return null;
  const control = {
    id: `hub-native-select-${++nextId}`,
    select,
    shell: document.createElement('span'),
    trigger: document.createElement('button'),
    value: document.createElement('span'),
    clear: null,
    menu: null,
    activeIndex: 0,
    originalTabIndex: select.getAttribute('tabindex'),
    resizeObserver: null
  };
  control.shell.className = 'hub-native-select-shell';
  control.shell.dataset.hubNativeSelectShell = 'true';
  control.trigger.type = 'button';
  control.trigger.className = 'hub-native-select-trigger';
  control.trigger.setAttribute('role', 'combobox');
  control.trigger.setAttribute('aria-haspopup', 'listbox');
  control.trigger.setAttribute('aria-expanded', 'false');
  control.trigger.setAttribute('aria-controls', `${control.id}-menu`);
  control.trigger.setAttribute('aria-label', getLabel(select));
  control.trigger.tabIndex = select.disabled ? -1 : 0;
  const labelId = labelFor(select);
  if (labelId) control.trigger.setAttribute('aria-labelledby', labelId);
  control.value.className = 'hub-native-select-value';
  control.trigger.appendChild(control.value);
  control.clear = document.createElement('button');
  control.clear.type = 'button';
  control.clear.className = 'hub-native-select-clear';
  control.clear.setAttribute('aria-label', `Limpar ${getLabel(select)}`);
  control.clear.title = `Limpar ${getLabel(select)}`;
  control.clear.innerHTML = clearIcon();
  control.clear.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    clearSelection(control);
  });
  control.shell.append(control.trigger, control.clear);
  select.insertAdjacentElement('afterend', control.shell);
  select.classList.add('hub-native-select-native');
  select.dataset.hubNativeSelectEnhanced = 'true';
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  select.style.position = 'absolute';
  select.style.opacity = '0';
  select.style.pointerEvents = 'none';
  select.style.zIndex = '-1';
  select.style.clipPath = 'inset(50%)';
  control.trigger.addEventListener('click', () => {
    if (activeControl === control) closeControl(control);
    else openControl(control);
  });
  control.trigger.addEventListener('keydown', event => handleTriggerKeydown(control, event));
  select.addEventListener('change', () => syncValue(control));
  select.addEventListener('input', () => syncValue(control));
  if (VALUE_DESCRIPTOR?.get && VALUE_DESCRIPTOR?.set) {
    Object.defineProperty(select, 'value', {
      configurable: true,
      enumerable: true,
      get() { return VALUE_DESCRIPTOR.get.call(this); },
      set(value) {
        VALUE_DESCRIPTOR.set.call(this, value);
        syncValue(control);
      }
    });
  }
  if (INDEX_DESCRIPTOR?.get && INDEX_DESCRIPTOR?.set) {
    Object.defineProperty(select, 'selectedIndex', {
      configurable: true,
      enumerable: true,
      get() { return INDEX_DESCRIPTOR.get.call(this); },
      set(index) {
        INDEX_DESCRIPTOR.set.call(this, index);
        syncValue(control);
      }
    });
  }
  select.addEventListener('invalid', () => {
    control.trigger.setAttribute('aria-invalid', 'true');
    control.shell.classList.add('is-invalid');
    window.requestAnimationFrame(() => control.trigger.focus({ preventScroll: true }));
  });
  select.addEventListener('focus', () => {
    if (!select.disabled && document.activeElement === select) control.trigger.focus({ preventScroll: true });
  });
  if (select.form) {
    select.form.addEventListener('reset', () => window.setTimeout(() => syncValue(control), 0));
  }
  if (window.ResizeObserver && select.parentElement) {
    control.resizeObserver = new ResizeObserver(() => syncPresentation(control));
    control.resizeObserver.observe(select.parentElement);
  }
  controls.add(control);
  syncClasses(control);
  syncPresentation(control);
  syncValue(control);
  return control;
}

function refreshControl(control) {
  if (!control.select.isConnected) {
    closeControl(control);
    control.menu?.remove();
    control.resizeObserver?.disconnect();
    controls.delete(control);
    return;
  }
  syncClasses(control);
  syncPresentation(control);
  syncValue(control);
}

function scan(root = document) {
  if (root instanceof HTMLSelectElement && root.matches(SELECTOR)) createControl(root);
  root.querySelectorAll?.(SELECTOR).forEach(createControl);
}

function onMutations(mutations) {
  const changed = new Set();
  mutations.forEach(mutation => {
    if (mutation.type === 'attributes') {
      const target = mutation.target instanceof HTMLSelectElement ? mutation.target : mutation.target.closest?.('select');
      const control = Array.from(controls).find(item => item.select === target);
      if (control) changed.add(control);
    }
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        scan(node);
        if (node.matches(SELECTOR)) {
          const control = Array.from(controls).find(item => item.select === node);
          if (control) changed.add(control);
        }
        node.querySelectorAll?.(SELECTOR).forEach(select => {
          const control = Array.from(controls).find(item => item.select === select);
          if (control) changed.add(control);
        });
      });
      controls.forEach(control => {
        if (mutation.target === control.select || control.select.contains(mutation.target)) changed.add(control);
      });
    }
  });
  changed.forEach(refreshControl);
  controls.forEach(control => {
    if (!control.select.isConnected) refreshControl(control);
  });
}

function handleDocumentClick(event) {
  if (!activeControl) return;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('[data-hub-native-select-shell]') || target?.closest('[data-hub-native-select-menu]')) return;
  closeActiveControl();
}

function handleGlobalKeydown(event) {
  if (event.key === 'Escape' && activeControl) closeActiveControl(true);
}

function handleViewportChange() {
  controls.forEach(syncPresentation);
  if (activeControl) positionMenu(activeControl);
}

function handleLabelClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const label = target?.closest('label');
  if (!label || target.closest('button, input, select, textarea, a')) return;
  const select = label.control instanceof HTMLSelectElement ? label.control : null;
  const control = select ? Array.from(controls).find(item => item.select === select) : null;
  if (!control || control.trigger.disabled) return;
  event.preventDefault();
  control.trigger.focus({ preventScroll: true });
}

function initialize() {
  if (observer || !document.body) return;
  scan(document);
  observer = new MutationObserver(onMutations);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['aria-label', 'aria-invalid', 'class', 'data-clearable', 'data-placeholder', 'disabled', 'hidden', 'label', 'multiple', 'required', 'selected', 'style', 'title', 'value'],
    childList: true,
    characterData: true,
    subtree: true
  });
  document.addEventListener('click', handleDocumentClick, true);
  document.addEventListener('click', handleLabelClick, true);
  document.addEventListener('keydown', handleGlobalKeydown, true);
  window.addEventListener('resize', handleViewportChange, { passive: true });
  window.addEventListener('scroll', () => {
    if (activeControl) positionMenu(activeControl);
  }, true);
  const themeObserver = new MutationObserver(handleViewportChange);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
  if (document.body) themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
