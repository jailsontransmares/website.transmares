Object.assign(window, {
  crm2PfRender: renderCrm2Phase2,
  navegarParaCrm2Rota: navigateCrm2Route,
  crm2PfOpenForm: openFormCrm2,
  crm2PfCancelForm() {
    const hasDraft = Object.values(crm2PfState.draft || {}).some((value) => String(value || '').trim());
    if (hasDraft && !window.confirm('Descartar os dados preenchidos?')) return;
    resetFormCrm2();
    setMessageCrm2('');
    navigateCrm2Route('201');
  },
  crm2PfSearchCpf(event) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get('cpf') || '').replace(/\D/g, '');
    crm2PfState.cpfGate.value = value;
    if (!validateCpfCrm2(value)) {
      Object.assign(crm2PfState.cpfGate, { status: 'invalid', personId: '', message: 'Informe um CPF válido para continuar.' });
    } else {
      const person = crm2PfState.items.find((item) => item.cpf === value);
      if (person) {
        Object.assign(crm2PfState.cpfGate, { status: 'found', personId: person.id, message: 'CPF já cadastrado. A criação de duplicidade foi bloqueada.' });
      } else {
        Object.assign(crm2PfState.cpfGate, { status: 'not-found', personId: '', message: 'CPF não encontrado. O novo cadastro pode ser iniciado.' });
      }
    }
    crm2PfState.draft = { cpf: value };
    rerenderCrm2Phase2();
  },
  crm2PfChangeCpf() {
    crm2PfState.cpfGate = { value: '', status: '', personId: '', message: '' };
    crm2PfState.draft = {};
    crm2PfState.errors = {};
    rerenderCrm2Phase2();
    window.requestAnimationFrame(() => document.querySelector('.crm2-pf-cpf-verification input[name="cpf"]')?.focus());
  },
  crm2PfMaskCpf(input) {
    input.value = maskCpfCrm2(input.value);
    if (!input.value && ['found', 'not-found'].includes(crm2PfState.cpfGate.status)) {
      crm2PfChangeCpf();
    }
  },
  crm2PfCpfKeydown(event) {
    if (!event?.currentTarget || !['Backspace', 'Delete'].includes(event.key)) return;
    if (crm2PfState.cpfGate.status !== 'not-found') return;
    event.preventDefault();
    crm2PfChangeCpf();
  },
  crm2PfMaskPhone(input) {
    input.value = maskPhoneCrm2(input.value);
  },
  crm2PfToggleDropdown(trigger, event) {
    event?.stopPropagation();
    const menu = document.getElementById(trigger?.getAttribute('aria-controls') || '');
    if (!menu || trigger.disabled) return;
    document.querySelectorAll('.crm2-pf-select .hub-filter-dropdown-menu:not([hidden]), body > .hub-filter-dropdown-menu[data-dropdown-input-id]:not([hidden])').forEach((openMenu) => {
      if (openMenu !== menu) {
        openMenu.hidden = true;
        const openTrigger = document.getElementById(openMenu.dataset.dropdownInputId || '');
        openTrigger?.setAttribute('aria-expanded', 'false');
        const openCombo = openTrigger?.closest('.crm2-pf-select');
        if (openCombo && openMenu.parentElement === document.body) openCombo.appendChild(openMenu);
      }
    });
    const opening = menu.hidden;
    menu.hidden = !opening;
    trigger.setAttribute('aria-expanded', String(opening));
    if (!opening) return;
    if (menu.parentElement !== document.body) document.body.appendChild(menu);
    crm2PfPositionDropdown(menu, trigger);
  },
  crm2PfPositionDropdown(menu, trigger) {
    if (!menu || !trigger || menu.hidden) return;
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 6;
    const menuWidth = Math.min(rect.width, window.innerWidth - (viewportPadding * 2));
    const menuMaxHeight = Math.min(280, window.innerHeight - (viewportPadding * 2));
    menu.style.width = `${menuWidth}px`;
    menu.style.maxHeight = `${menuMaxHeight}px`;
    menu.style.overflowY = 'auto';
    const menuHeight = Math.min(menu.scrollHeight, menuMaxHeight);
    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
    const spaceAbove = rect.top - gap - viewportPadding;
    const openAbove = menuHeight > spaceBelow && spaceAbove > spaceBelow;
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - menuHeight - gap)
      : Math.min(rect.bottom + gap, window.innerHeight - menuHeight - viewportPadding);
    const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - menuWidth - viewportPadding);
    menu.style.left = `${left}px`;
    menu.style.top = `${Math.max(viewportPadding, top)}px`;
  },
  crm2PfRepositionOpenDropdowns() {
    document.querySelectorAll('.crm2-pf-select .hub-filter-dropdown-menu:not([hidden])').forEach((menu) => {
      const trigger = document.getElementById(menu.dataset.dropdownInputId || '');
      crm2PfPositionDropdown(menu, trigger);
    });
    document.querySelectorAll('body > .hub-filter-dropdown-menu[data-dropdown-input-id]:not([hidden])').forEach((menu) => {
      const trigger = document.getElementById(menu.dataset.dropdownInputId || '');
      crm2PfPositionDropdown(menu, trigger);
    });
  },
  crm2PfFilterDropdown(input, event) {
    event?.stopPropagation();
    const menu = document.getElementById(input?.dataset?.dropdownMenuId || '');
    if (!menu) return;
    input.dataset.selectedValue = '';
    const normalized = String(input.value || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    menu.querySelectorAll('[role="option"]').forEach((option) => {
      const label = String(option.dataset.label || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      option.hidden = Boolean(normalized) && !label.includes(normalized);
    });
    if (menu.hidden) {
      if (menu.parentElement !== document.body) document.body.appendChild(menu);
      menu.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }
    crm2PfPositionDropdown(menu, input);
  },
  crm2PfSelectDropdown(option) {
    const menu = option?.closest('.hub-filter-dropdown-menu');
    const trigger = document.getElementById(menu?.dataset?.dropdownInputId || '');
    if (!menu || !trigger) return;
    trigger.value = option.dataset.label || '';
    trigger.dataset.selectedValue = option.dataset.value || '';
    menu.querySelectorAll('[role="option"]').forEach((item) => {
      const selected = item === option;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    const combo = trigger.closest('.crm2-pf-select');
    if (combo && menu.parentElement === document.body) combo.appendChild(menu);
    crm2PfTrackChange(trigger);
    trigger.focus();
  },
  crm2PfDropdownKeydown(event, element) {
    if (!['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') {
      const trigger = element?.classList.contains('crm2-pf-select-trigger')
        ? element
        : document.getElementById(element?.closest('.hub-filter-dropdown-menu')?.dataset?.dropdownInputId || '');
      const menu = document.getElementById(trigger?.dataset?.dropdownMenuId || trigger?.getAttribute('aria-controls') || '');
      if (menu) menu.hidden = true;
      trigger?.setAttribute('aria-expanded', 'false');
      trigger?.focus();
      return;
    }
    if (element?.classList.contains('crm2-pf-select-trigger')) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const menu = document.getElementById(element.getAttribute('aria-controls') || element.dataset.dropdownMenuId || '');
        if (menu?.hidden) crm2PfToggleDropdown(element, event);
        const options = [...(menu?.querySelectorAll('[role="option"]') || [])];
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') options[event.key === 'ArrowUp' ? options.length - 1 : 0]?.focus();
      }
      return;
    }
    const menu = element?.classList.contains('crm2-pf-select-trigger')
      ? document.getElementById(element.getAttribute('aria-controls') || element.dataset.dropdownMenuId || '')
      : element?.closest('.hub-filter-dropdown-menu');
    const options = [...(menu?.querySelectorAll('[role="option"]') || [])];
    const index = options.indexOf(element);
    if (event.key === 'Enter' || event.key === ' ') return crm2PfSelectDropdown(element);
    if (!options.length) return;
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? options.length - 1
        : event.key === 'ArrowUp'
          ? (index - 1 + options.length) % options.length
          : (index + 1) % options.length;
    options[next].focus();
  },
  crm2PfCloseDropdowns(event) {
    if (event?.target?.closest('.crm2-pf-select') && event.target.closest('.crm2-pf-select').contains(event.target)) return;
    document.querySelectorAll('.crm2-pf-select .hub-filter-dropdown-menu:not([hidden]), body > .hub-filter-dropdown-menu[data-dropdown-input-id]:not([hidden])').forEach((menu) => {
      menu.hidden = true;
      const trigger = document.getElementById(menu.dataset.dropdownInputId || '');
      trigger?.setAttribute('aria-expanded', 'false');
      const combo = trigger?.closest('.crm2-pf-select');
      if (combo && menu.parentElement === document.body) combo.appendChild(menu);
    });
  },
  crm2PfTrackChange(input) {
    if (!input?.name) return;
    crm2PfState.draft[input.name] = input.value;
    if (crm2PfState.formMode !== 'edit') return;
    const person = getPersonCrm2(crm2PfState.detailId);
    if (!person) return;
    const changed = normalizeComparableCrm2(input.name, input.value) !== normalizeComparableCrm2(input.name, person[input.name]);
    const fields = new Set(crm2PfState.changedFields);
    if (changed) fields.add(input.name); else fields.delete(input.name);
    crm2PfState.changedFields = [...fields];
    input.closest('label')?.classList.toggle('is-changed', changed);
  },
  crm2PfSave: savePersonCrm2,
  crm2PfOpenDetail(id) {
    if (!getPersonCrm2(id)) return;
    resetFormCrm2();
    crm2PfState.detailId = id;
    crm2PfState.detailTab = 'dados';
    setMessageCrm2('');
    navigateCrm2Route('201', id);
  },
  crm2PfCloseDetail() {
    crm2PfState.detailId = '';
    crm2PfState.detailTab = 'dados';
    setMessageCrm2('');
    navigateCrm2Route('201');
  },
  crm2PfEdit(id) {
    openFormCrm2('edit', id);
  },
  crm2PfSelectTab(tab) {
    if (!['dados', 'timeline', 'empresas', 'pedidos'].includes(tab)) return;
    crm2PfState.detailTab = tab;
    setMessageCrm2('');
    rerenderCrm2Phase2();
  },
  crm2PfSetSearch(value) {
    crm2PfState.search = String(value || '');
    crm2PfState.page = 1;
    rerenderCrm2Phase2();
    window.requestAnimationFrame(() => {
      const input = document.querySelector('.ar-crm-list-filters input[type="search"]');
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  },
  crm2PfApplyFilters(event) {
    event?.preventDefault();
    crm2PfState.page = 1;
    rerenderCrm2Phase2();
  },
  crm2PfSetFilter(type, value) {
    if (type === 'status') crm2PfState.statusFilter = String(value || '');
    if (type === 'origin') crm2PfState.originFilter = String(value || '');
    if (type === 'date') crm2PfState.registrationDateFilter = String(value || '');
    crm2PfState.page = 1;
    rerenderCrm2Phase2();
  },
  crm2PfClearFilters() {
    Object.assign(crm2PfState, { search: '', statusFilter: '', originFilter: '', registrationDateFilter: '', page: 1 });
    rerenderCrm2Phase2();
  },
  crm2PfSetListState(value) {
    if (!crm2CanEdit()) return;
    crm2PfState.listState = ['normal', 'loading', 'error', 'empty'].includes(value) ? value : 'normal';
    rerenderCrm2Phase2();
  },
  crm2PfSetPage(page) {
    crm2PfState.page = Math.max(1, Number(page) || 1);
    rerenderCrm2Phase2();
  },
  crm2PfAddNote(event, personId) {
    event.preventDefault();
    if (!crm2CanEdit()) return;
    const person = getPersonCrm2(personId);
    const note = String(new FormData(event.currentTarget).get('observacao') || '').trim();
    if (!person || !note) return;
    registerTimelineCrm2(person, `Observação interna adicionada: ${note}`, 'Observação interna');
    setMessageCrm2('Observação adicionada à timeline mockada.');
    rerenderCrm2Phase2();
  },
  crm2PfAddAttachment(event, personId) {
    event.preventDefault();
    if (!crm2CanEdit()) return;
    const person = getPersonCrm2(personId);
    const file = event.currentTarget.elements.arquivo?.files?.[0];
    const expiration = String(event.currentTarget.elements.validade?.value || '');
    if (!person || !file) return;
    const attachment = fileToAttachmentCrm2(file, expiration);
    person.anexos = [...(person.anexos || []), attachment];
    registerTimelineCrm2(person, `Anexo incluído: ${attachment.nome}.`, 'Anexo');
    setMessageCrm2('Anexo incluído apenas no estado local.');
    rerenderCrm2Phase2();
  },
  crm2PfReplaceAttachment(input, personId, index) {
    if (!crm2CanEdit()) return;
    const person = getPersonCrm2(personId);
    const file = input?.files?.[0];
    const previous = person?.anexos?.[index];
    if (!person || !file || !previous) return;
    const replacement = fileToAttachmentCrm2(file, previous.validade || '');
    person.anexos.splice(index, 1, replacement);
    registerTimelineCrm2(person, `Anexo substituído: ${previous.nome} → ${replacement.nome}.`, 'Anexo');
    setMessageCrm2('Anexo substituído apenas no estado local.');
    rerenderCrm2Phase2();
  },
  crm2PfRemoveAttachment(personId, index) {
    if (!crm2CanEdit()) return;
    const person = getPersonCrm2(personId);
    const attachment = person?.anexos?.[index];
    if (!person || !attachment) return;
    if (!window.confirm(`Remover o anexo “${attachment.nome}” do estado mockado?`)) return;
    person.anexos.splice(index, 1);
    registerTimelineCrm2(person, `Anexo removido: ${attachment.nome}.`, 'Anexo');
    setMessageCrm2('Anexo removido apenas do estado local.');
    rerenderCrm2Phase2();
  },
  crm2PfViewCompany(index) {
    const person = getPersonCrm2(crm2PfState.detailId);
    const company = person?.empresas?.[index];
    if (!company) return;
    setMessageCrm2(`A visualização de ${company.nome} será habilitada na Fase 3 — Pessoa Jurídica.`);
    rerenderCrm2Phase2();
  }
});

document.addEventListener('click', (event) => window.crm2PfCloseDropdowns?.(event));
document.addEventListener('scroll', () => window.crm2PfRepositionOpenDropdowns?.(), true);
window.addEventListener('resize', () => window.crm2PfRepositionOpenDropdowns?.());
window.addEventListener('hub-parceiros-indicacao-atualizados', () => {
  if (currentRouteCodeCrm2()) rerenderCrm2Phase2();
});

const crm2Observer = new MutationObserver(() => {
  if (!currentRouteCodeCrm2()) return;
  window.requestAnimationFrame(mountCrm2Phase2);
});

crm2Observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', () => window.setTimeout(mountCrm2Phase2, 0));
window.addEventListener('DOMContentLoaded', mountCrm2Phase2, { once: true });
window.setTimeout(mountCrm2Phase2, 0);
