function renderCpfVerificationCrm2(values = {}) {
  const gate = crm2PfState.cpfGate;
  const verified = gate.status === 'not-found';
  const showPersonalFields = verified;
  return `
    <section class="hub-form-section crm2-pf-cpf-verification" aria-labelledby="crm2-pf-cpf-title">
      <div class="hub-form-section-title">
        <strong id="crm2-pf-cpf-title">Dados pessoais</strong>
      </div>
      <form class="hub-form-grid ${gate.status === 'found' ? 'crm2-pf-cpf-has-found-actions' : ''} ${showPersonalFields ? 'crm2-pf-cpf-has-personal-fields' : ''}" onsubmit="crm2PfSearchCpf(event)" novalidate>
        <label class="${gate.status === 'invalid' ? 'is-invalid' : ''}">
          <span>CPF *</span>
          <span class="crm2-pf-cpf-input-wrap">
            <input class="config-input" name="cpf" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="Consulte o CPF antes de iniciar o cadastro." value="${escapeAttrCrm2(maskCpfCrm2(gate.value))}" oninput="crm2PfMaskCpf(this)" onkeydown="crm2PfCpfKeydown(event)" ${verified ? 'readonly' : ''} required autofocus aria-invalid="${gate.status === 'invalid' ? 'true' : 'false'}" aria-describedby="crm2-pf-cpf-message">
            ${verified
              ? '<button class="crm2-pf-cpf-icon" type="button" onclick="crm2PfChangeCpf()" aria-label="Alterar CPF" title="Alterar CPF"><i data-lucide="eraser" aria-hidden="true"></i></button>'
              : '<button class="crm2-pf-cpf-icon" type="submit" aria-label="Consultar CPF" title="Consultar CPF"><i data-lucide="search" aria-hidden="true"></i></button>'}
          </span>
          ${gate.status === 'invalid' ? '<small id="crm2-pf-cpf-message" class="crm2-field-error">Informe um CPF válido para continuar.</small>' : ''}
          ${gate.status === 'found' ? '<small id="crm2-pf-cpf-found-message" class="crm2-pf-cpf-found-message" role="alert">Já existe cadastro para este CPF</small>' : ''}
        </label>
        ${showPersonalFields ? formFieldCrm2({ label: 'Nome completo/nome social', name: 'nome', value: values.nome, required: true, formId: 'crm2-pf-form' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'Data de nascimento', name: 'nascimento', value: values.nascimento, type: 'date', formId: 'crm2-pf-form' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'CEI/CAEPF', name: 'cei', value: values.cei, formId: 'crm2-pf-form', className: 'crm2-pf-grid-cei' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'Telefone', name: 'telefone', value: maskPhoneCrm2(values.telefone), extra: 'inputmode="tel" maxlength="15" onkeyup="crm2PfMaskPhone(this)"', formId: 'crm2-pf-form', className: 'crm2-pf-grid-phone crm2-pf-grid-row-2' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'E-mail', name: 'email', value: values.email, type: 'email', formId: 'crm2-pf-form', className: 'crm2-pf-grid-email crm2-pf-grid-row-2' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'Origem', name: 'origem', value: values.origem, type: 'select', options: [{ value: 'Indicação', label: 'Indicação' }, { value: 'Site', label: 'Site' }, { value: 'Parceiro', label: 'Parceiro' }, { value: 'Evento', label: 'Evento' }, { value: 'Outro', label: 'Outro' }], formId: 'crm2-pf-form', className: 'crm2-pf-grid-origin' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'Parceiro de indicação', name: 'parceiro', value: values.parceiro, type: 'select', options: crm2PfPartnerOptions(), formId: 'crm2-pf-form', className: 'crm2-pf-grid-partner' }) : ''}
        ${gate.status === 'found' ? `
          <div class="crm2-pf-cpf-found-actions" role="group" aria-label="Ações do CPF">
            <button class="secondary-btn" type="button" onclick="crm2PfOpenDetail('${escapeAttrCrm2(gate.personId)}')">Abrir cadastro</button>
            <button class="secondary-btn" type="button" onclick="crm2PfChangeCpf()">Consultar outro CPF</button>
          </div>
        ` : ''}
      </form>
    </section>
  `;
}

function crm2PfPartnerOptions() {
  const records = typeof window.hubObterParceirosIndicacao === 'function'
    ? window.hubObterParceirosIndicacao()
    : [];
  const options = records
    .filter((record) => !['inativo', 'arquivado'].includes(record.status))
    .map((record) => String(record.nome_completo || record.nome || '').trim())
    .filter(Boolean)
    .filter((value, index, valuesList) => valuesList.indexOf(value) === index)
    .map((value) => ({ value, label: value }));
  return options;
}

function renderFormAttachmentsCrm2(person, editing, verified) {
  const existing = editing ? (person?.anexos || []).map((attachment, index) => ({ ...attachment, source: 'existing', index })) : [];
  const pending = (crm2PfState.draftAttachments || []).map((attachment, index) => ({ ...attachment, source: 'draft', index }));
  const attachments = [...existing, ...pending];
  return `
    <section class="hub-form-section crm2-pf-attachments-mock ${verified ? '' : 'is-disabled'}" aria-labelledby="crm2-pf-attachments-title">
      <div class="hub-form-section-title crm2-pf-attachments-header"><strong id="crm2-pf-attachments-title">Anexos</strong><button class="icon-btn crm2-pf-include-attachment" type="button" onclick="crm2PfOpenAttachmentPicker()" aria-label="Incluir anexo" title="Incluir anexo" ${verified ? '' : 'disabled'}><i data-lucide="paperclip" aria-hidden="true"></i></button></div>
      <input id="crm2-pf-attachment-picker" class="crm2-visually-hidden-input" type="file" onchange="crm2PfSelectAttachment(this)" ${verified ? '' : 'disabled'}>
      <div class="crm2-pf-attachment-dropzone" role="button" tabindex="0" aria-label="Adicionar anexo por arrastar e soltar ou selecionar arquivo" ondragover="crm2PfDragOverAttachment(event)" ondragleave="crm2PfDragLeaveAttachment(event)" ondrop="crm2PfDropAttachment(event)" onkeydown="crm2PfDropzoneKeydown(event)">
        <i data-lucide="upload-cloud" aria-hidden="true"></i>
        <span>Arraste e solte um arquivo aqui</span>
        <small>ou use o ícone de anexo</small>
      </div>
      ${crm2PfState.attachmentDraft ? `
        <div class="crm2-pf-attachment-editor" role="group" aria-label="Configurar anexo selecionado">
          <label><span>Nome do arquivo</span><input class="config-input" type="text" value="${escapeAttrCrm2(crm2PfState.attachmentDraft.nome)}" oninput="crm2PfUpdateAttachmentDraft('nome', this.value)" autofocus></label>
          <label><span>Validade opcional</span><input class="config-input" type="date" value="${escapeAttrCrm2(crm2PfState.attachmentDraft.validade)}" onchange="crm2PfUpdateAttachmentDraft('validade', this.value)"></label>
          <div class="crm2-pf-attachment-editor-actions">
            <button class="secondary-btn" type="button" onclick="crm2PfCancelAttachmentDraft()">Cancelar</button>
            <button class="save-btn" type="button" onclick="crm2PfConfirmAttachmentDraft()">Adicionar</button>
          </div>
        </div>
      ` : ''}
      ${attachments.length ? `<div class="crm2-pf-form-attachment-list" aria-label="Anexos selecionados">${attachments.map((attachment) => `
        <article class="crm2-pf-form-attachment-row">
          <i data-lucide="archive" aria-hidden="true"></i>
          <strong>${escapeHtmlCrm2(attachment.nome)}</strong>
          <span class="crm2-pf-attachment-validity-pill">${attachment.validade ? escapeHtmlCrm2(formatDateCrm2(attachment.validade)) : 'Sem validade'}</span>
          <div class="crm2-pf-attachment-row-actions">
            ${crm2PfState.canView ? `<button class="secondary-btn" type="button" onclick="crm2PfViewAttachment('${attachment.source}', ${attachment.index}, '${escapeAttrCrm2(attachment.nome)}')">Visualizar</button>` : ''}
            ${crm2PfState.canDelete ? `<button class="secondary-btn" type="button" onclick="crm2PfDeleteFormAttachment('${attachment.source}', ${attachment.index}, '${escapeAttrCrm2(attachment.nome)}')">Excluir</button>` : ''}
          </div>
        </article>
      `).join('')}</div>` : ''}
    </section>
  `;
}

function renderPersonFormCrm2() {
  const route = currentPfRouteCrm2();
  const editing = route.view === 'edit' || crm2PfState.formMode === 'edit';
  const person = editing ? getPersonCrm2(route.id || crm2PfState.detailId) : null;
  const values = { ...(person || {}), ...crm2PfState.draft };
  const verified = editing || crm2PfState.cpfGate.status === 'not-found';

  if (typeof window.hubCarregarParceirosIndicacao === 'function' && !window.hubObterParceirosIndicacao?.().length) {
    window.hubCarregarParceirosIndicacao().catch(() => {});
  }

  return `
    <section class="hub-form-screen crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-pessoa-form-title">
      <header class="hub-form-screen-header">
        <div>
          <h2 id="crm2-pessoa-form-title">${editing ? 'Editar cadastro' : 'Novo cadastro PF'}</h2>
        </div>
        <div class="crm2-pf-form-header-actions">
          ${!editing && crm2PfState.cpfGate.status === 'not-found' ? '<span class="crm2-pf-status-pill is-novo-cadastro" role="status">Novo cadastro</span>' : ''}
          <button class="secondary-btn" type="button" onclick="crm2PfCancelForm()">Voltar para a lista</button>
        </div>
      </header>

      ${crm2PfState.message ? `<p class="admin-message" role="status">${escapeHtmlCrm2(crm2PfState.message)}</p>` : ''}

      ${!editing ? renderCpfVerificationCrm2(values) : ''}

      <form id="crm2-pf-form" class="hub-form-screen-content crm2-pf-form" onsubmit="crm2PfSave(event)" novalidate ${verified ? '' : 'hidden'}>
        ${editing ? `<section class="hub-form-section" aria-labelledby="crm2-pf-personal-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-personal-title">Dados pessoais</strong></div>
          <div class="hub-form-grid">
            ${formFieldCrm2({ label: 'Nome completo/nome social', name: 'nome', value: values.nome, required: true })}
            ${formFieldCrm2({ label: 'CPF', name: 'cpf', value: maskCpfCrm2(values.cpf || crm2PfState.cpfGate.value), required: true, extra: 'inputmode="numeric" maxlength="14" readonly' })}
            ${formFieldCrm2({ label: 'CEI/CAEPF', name: 'cei', value: values.cei })}
            ${formFieldCrm2({ label: 'Data de nascimento', name: 'nascimento', value: values.nascimento, type: 'date' })}
          </div>
        </section>` : ''}

        ${editing ? `<section class="hub-form-section" aria-labelledby="crm2-pf-contact-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-contact-title">Contato</strong></div>
          <div class="hub-form-grid">
            ${formFieldCrm2({ label: 'Telefone', name: 'telefone', value: maskPhoneCrm2(values.telefone), extra: 'inputmode="tel" maxlength="15" onkeyup="crm2PfMaskPhone(this)"' })}
            ${formFieldCrm2({ label: 'E-mail', name: 'email', value: values.email, type: 'email' })}
            ${formFieldCrm2({ label: 'Origem', name: 'origem', value: values.origem, type: 'select', options: [{ value: 'Indicação', label: 'Indicação' }, { value: 'Site', label: 'Site' }, { value: 'Parceiro', label: 'Parceiro' }, { value: 'Evento', label: 'Evento' }, { value: 'Outro', label: 'Outro' }] })}
            ${formFieldCrm2({ label: 'Parceiro de indicação', name: 'parceiro', value: values.parceiro, type: 'select', options: crm2PfPartnerOptions() })}
          </div>
        </section>` : ''}

        <div class="crm2-pf-notes-attachments-grid">
          <section class="hub-form-section crm2-pf-notes-block ${verified ? '' : 'is-disabled'}" aria-labelledby="crm2-pf-notes-title">
            <div class="hub-form-grid">
              ${formFieldCrm2({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea' })}
            </div>
          </section>
          ${renderFormAttachmentsCrm2(person, editing, verified)}
        </div>

        <div class="hub-form-screen-actions crm2-pf-form-footer">
          <button class="secondary-btn" type="button" onclick="crm2PfCancelForm()">Cancelar</button>
          <button class="save-btn" type="submit" ${verified ? '' : 'disabled'}>${editing ? 'Salvar alterações' : 'Salvar'}</button>
        </div>
      </form>
    </section>
  `;
}

function renderCrm2Phase2() {
  const route = currentPfRouteCrm2();
  if (route.view === 'new') {
    crm2PfState.formMode = 'create';
    return renderPersonFormCrm2();
  }
  if (route.view === 'edit') {
    crm2PfState.formMode = 'edit';
    crm2PfState.detailId = route.id;
    return renderPersonFormCrm2();
  }
  if (route.view === 'detail') {
    crm2PfState.formMode = '';
    crm2PfState.detailId = route.id;
    return renderPersonDetailCrm2(getPersonCrm2(route.id));
  }
  crm2PfState.formMode = '';
  crm2PfState.detailId = '';
  return renderPeopleListCrm2();
}

function renderIntoCurrentCrm2Target() {
  const target = document.querySelector('.crm2-pessoas-page');
  if (!target) return false;
  if (!crm2PfState.mounted) {
    crm2PfState.mounted = true;
  }
  target.outerHTML = renderCrm2Phase2();
  enhancePeopleTableCrm2();
  return true;
}

function enhancePeopleTableCrm2() {
  const table = document.querySelector('.crm2-pessoas-table');
  if (!table) return;

  const columnIds = [
    'crm2-pf-col-name',
    'crm2-pf-col-cpf',
    'crm2-pf-col-phone',
    'crm2-pf-col-email',
    'crm2-pf-col-updated',
    'crm2-pf-col-actions'
  ];
  const columnLabels = [
    'Nome completo/nome social',
    'CPF',
    'Telefone',
    'E-mail',
    'Última atualização',
    'Ações'
  ];
  const caption = table.querySelector('caption');
  if (caption) caption.textContent = 'Pessoas físicas cadastradas no CRM 2.0';

  table.querySelectorAll('thead th').forEach((header, index) => {
    header.scope = 'col';
    if (columnIds[index]) header.id = columnIds[index];
    if (columnLabels[index]) header.textContent = columnLabels[index];
  });

  table.querySelectorAll('tbody tr').forEach((row) => {
    row.querySelectorAll('td').forEach((cell, index) => {
      if (columnIds[index]) cell.setAttribute('headers', columnIds[index]);
    });
    const status = row.querySelector('td:first-child small');
    if (status) {
      status.classList.add('crm2-pessoas-status');
      status.classList.add(`is-${normalizeSearchCrm2(status.textContent).replace(/\s+/g, '-')}`);
      status.setAttribute('role', 'status');
    }
  });
}

function enhanceCrm2Overview() {
  const title = document.getElementById('crm2-title');
  const panel = title?.closest('.admin-panel');
  if (!panel || panel.dataset.crm2Phase2Overview === 'true') return;

  const item201 = [...panel.querySelectorAll('.crm2-phase1-roadmap-item')]
    .find((item) => item.querySelector('.crm2-phase1-roadmap-code')?.textContent?.trim() === '201');
  if (item201) {
    item201.classList.add('is-actionable', 'is-available');
    item201.setAttribute('role', 'button');
    item201.setAttribute('tabindex', '0');
    item201.setAttribute('onclick', "navegarParaCrm2Rota('201')");
    item201.setAttribute('onkeydown', "if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navegarParaCrm2Rota('201'); }");
    const status = item201.querySelector('.crm2-phase1-roadmap-status');
    if (status) status.textContent = 'Disponível';
  }

  const primaryAction = panel.querySelector('.crm2-phase1-actions .primary-btn');
  if (primaryAction) {
    primaryAction.disabled = false;
    primaryAction.textContent = 'Abrir Pessoas físicas';
    primaryAction.setAttribute('onclick', "navegarParaCrm2Rota('201')");
  }

  const kicker = panel.querySelector('.ar-crm-phase1-kicker');
  if (kicker) kicker.textContent = 'FASES 1 E 2 · MOCK FUNCIONAL';
  panel.dataset.crm2Phase2Overview = 'true';
}

function mountCrm2Phase2() {
  const code = currentRouteCodeCrm2();
  if (code === '200') {
    resetFormCrm2();
    setMessageCrm2('');
    enhanceCrm2Overview();
    return;
  }
  if (code !== '201') return;
  const target = document.querySelector('.crm2-pessoas-page');
  if (!target || target.dataset.crm2Phase2Enhanced === 'true') return;
  renderIntoCurrentCrm2Target();
}

function rerenderCrm2Phase2() {
  if (currentRouteCodeCrm2() !== '201') return;
  const target = document.querySelector('.crm2-pessoas-page');
  if (!target) return;
  target.outerHTML = renderCrm2Phase2();
  enhancePeopleTableCrm2();
}

function setMessageCrm2(message = '') {
  crm2PfState.message = message;
}

function resetFormCrm2() {
  crm2PfState.formMode = '';
  crm2PfState.draft = {};
  crm2PfState.draftAttachments = [];
  crm2PfState.attachmentDraft = null;
  crm2PfState.errors = {};
  crm2PfState.changedFields = [];
  crm2PfState.cpfGate = { value: '', status: '', personId: '', message: '' };
}

function openFormCrm2(mode, id = '') {
  if (!crm2CanEdit()) return;
  crm2PfState.errors = {};
  crm2PfState.changedFields = [];
  crm2PfState.message = '';
  if (mode === 'edit') {
    const person = getPersonCrm2(id || crm2PfState.detailId);
    if (!person) return;
    crm2PfState.detailId = person.id;
    crm2PfState.formMode = 'edit';
    crm2PfState.draft = {};
    navigateCrm2Route('201', `${person.id}/editar`);
  } else {
    crm2PfState.detailId = '';
    crm2PfState.formMode = 'create';
    crm2PfState.cpfGate = { value: '', status: '', personId: '', message: '' };
    crm2PfState.draft = {};
    crm2PfState.draftAttachments = [];
    crm2PfState.attachmentDraft = null;
    navigateCrm2Route('201', 'novo');
  }
}

function normalizeComparableCrm2(field, value) {
  if (field === 'cpf' || field === 'telefone') return String(value || '').replace(/\D/g, '');
  return String(value || '').trim();
}

function describeChangesCrm2(original, updated) {
  const labels = {
    nome: 'Nome',
    cpf: 'CPF',
    cei: 'CEI/CAEPF',
    nascimento: 'Data de nascimento',
    telefone: 'Telefone',
    email: 'E-mail',
    origem: 'Origem',
    parceiro: 'Parceiro de indicação',
    observacoes: 'Observações'
  };
  return Object.entries(labels).flatMap(([field, label]) => {
    if (normalizeComparableCrm2(field, original[field]) === normalizeComparableCrm2(field, updated[field])) return [];
    return [`${label} — De: ${original[field] || '—'}; Para: ${updated[field] || '—'}`];
  });
}

function fileToAttachmentCrm2(file, expiration = '', customName = '') {
  return {
    nome: customName || file?.name || 'Arquivo selecionado',
    arquivoOriginal: file?.name || '',
    tipo: file?.type || file?.name?.split('.').pop()?.toUpperCase() || 'Arquivo',
    incluidoEm: new Date().toISOString(),
    validade: expiration
  };
}

function savePersonCrm2(event) {
  event.preventDefault();
  if (!crm2CanEdit()) return;
  const form = event.currentTarget;
  const data = new FormData(form);
  const values = Object.fromEntries(data.entries());
  values.nome = String(values.nome || '').trim();
  values.cpf = String(values.cpf || crm2PfState.cpfGate.value || '').replace(/\D/g, '');
  values.telefone = maskPhoneCrm2(values.telefone || '');
  values.email = String(values.email || '').trim();

  const errors = {};
  if (!values.nome) errors.nome = 'Informe o nome completo ou nome social.';
  if (!validateCpfCrm2(values.cpf)) errors.cpf = 'Informe um CPF válido.';
  if (!validateEmailCrm2(values.email)) errors.email = 'Informe um e-mail válido.';
  if (values.nascimento && new Date(`${values.nascimento}T00:00:00`) > new Date()) errors.nascimento = 'A data de nascimento não pode estar no futuro.';
  if (crm2PfState.items.some((item) => item.cpf === values.cpf && (crm2PfState.formMode !== 'edit' || item.id !== crm2PfState.detailId))) {
    errors.cpf = 'Já existe uma pessoa física mockada com este CPF.';
  }

  if (Object.keys(errors).length) {
    crm2PfState.errors = errors;
    crm2PfState.draft = { ...crm2PfState.draft, ...values };
    setMessageCrm2('Revise os campos destacados.');
    rerenderCrm2Phase2();
    return;
  }

  const now = new Date().toISOString();
  const pendingAttachments = [...(crm2PfState.draftAttachments || [])];

  if (crm2PfState.formMode === 'edit') {
    const person = getPersonCrm2(crm2PfState.detailId);
    if (!person) return;
    const changes = describeChangesCrm2(person, values);
    Object.assign(person, values, { atualizadoEm: now });
    if (pendingAttachments.length) person.anexos = [...(person.anexos || []), ...pendingAttachments];
    if (changes.length) registerTimelineCrm2(person, `Dados atualizados. ${changes.join(' | ')}`, 'Atualização');
    pendingAttachments.forEach((attachment) => registerTimelineCrm2(person, `Anexo incluído: ${attachment.nome}.`, 'Anexo'));
    setMessageCrm2(changes.length || pendingAttachments.length
      ? 'Pessoa física atualizada no estado mockado. Nenhum dado foi persistido.'
      : 'Nenhuma alteração foi identificada.');
  } else {
    const id = `pf-mock-${Date.now()}`;
    const person = {
      ...values,
      id,
      cadastroEm: now,
      atualizadoEm: now,
      anexos: pendingAttachments,
      empresas: [],
      pedidos: [],
      timeline: [{ data: now, usuario: 'Usuário atual', descricao: 'Cadastro criado.', tipo: 'Cadastro' }]
    };
    pendingAttachments.forEach((attachment) => person.timeline.push({ data: now, usuario: 'Usuário atual', descricao: `Anexo incluído: ${attachment.nome}.`, tipo: 'Anexo' }));
    crm2PfState.items.unshift(person);
    crm2PfState.detailId = id;
    setMessageCrm2('Pessoa física criada no estado mockado. Nenhum dado foi persistido.');
  }

  const savedId = crm2PfState.detailId;
  resetFormCrm2();
  crm2PfState.detailTab = 'dados';
  navigateCrm2Route('201', savedId);
}
