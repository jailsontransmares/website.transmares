Object.assign(window, {
  crm2PfRender: renderCrm2Phase2,
  navegarParaCrm2Rota: navigateCrm2Route,
  crm2PfOpenForm: openFormCrm2,
  crm2PfCloseForm() {
    resetFormCrm2();
    setMessageCrm2('');
    rerenderCrm2Phase2();
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
    rerenderCrm2Phase2();
  },
  crm2PfContinueCpf() {
    if (!crm2CanEdit() || crm2PfState.cpfGate.status !== 'not-found') return;
    crm2PfState.formMode = 'create';
    crm2PfState.draft = { cpf: crm2PfState.cpfGate.value };
    crm2PfState.errors = {};
    rerenderCrm2Phase2();
  },
  crm2PfMaskCpf(input) {
    input.value = maskCpfCrm2(input.value);
  },
  crm2PfMaskPhone(input) {
    input.value = maskPhoneCrm2(input.value);
  },
  crm2PfTrackChange(input) {
    if (crm2PfState.formMode !== 'edit' || !input?.name) return;
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
    rerenderCrm2Phase2();
  },
  crm2PfCloseDetail() {
    crm2PfState.detailId = '';
    crm2PfState.detailTab = 'dados';
    setMessageCrm2('');
    rerenderCrm2Phase2();
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

document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-crm2-pf-action]')?.dataset.crm2PfAction;
  if (action !== 'open-create') return;
  event.preventDefault();
  if (event.target.closest('button')?.disabled) return;
  openFormCrm2('create');
});

const crm2Observer = new MutationObserver(() => {
  if (!currentRouteCodeCrm2()) return;
  window.requestAnimationFrame(mountCrm2Phase2);
});

crm2Observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', () => window.setTimeout(mountCrm2Phase2, 0));
window.addEventListener('DOMContentLoaded', mountCrm2Phase2, { once: true });
window.setTimeout(mountCrm2Phase2, 0);
