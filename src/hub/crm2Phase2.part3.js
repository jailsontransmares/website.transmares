function renderCpfVerificationCrm2() {
  const gate = crm2PfState.cpfGate;
  const verified = gate.status === 'not-found';
  return `
    <section class="hub-form-section crm2-pf-cpf-verification" aria-labelledby="crm2-pf-cpf-title">
      <form class="hub-form-grid" onsubmit="crm2PfSearchCpf(event)" novalidate>
        <label class="${gate.status === 'invalid' ? 'is-invalid' : ''}">
          <span>CPF *</span>
          <span class="crm2-pf-cpf-input-wrap">
            <input class="config-input" name="cpf" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="Consulte o CPF antes de iniciar o cadastro." value="${escapeAttrCrm2(maskCpfCrm2(gate.value))}" oninput="crm2PfMaskCpf(this)" onkeydown="crm2PfCpfKeydown(event)" ${verified ? 'readonly' : ''} required autofocus aria-invalid="${gate.status === 'invalid' ? 'true' : 'false'}" aria-describedby="crm2-pf-cpf-message">
            ${verified
              ? '<button class="crm2-pf-cpf-icon" type="button" onclick="crm2PfChangeCpf()" aria-label="Alterar CPF" title="Alterar CPF"><i data-lucide="eraser" aria-hidden="true"></i></button>'
              : '<button class="crm2-pf-cpf-icon" type="submit" aria-label="Consultar CPF" title="Consultar CPF"><i data-lucide="search" aria-hidden="true"></i></button>'}
          </span>
          ${gate.status === 'invalid' ? '<small id="crm2-pf-cpf-message" class="crm2-field-error">Informe um CPF válido para continuar.</small>' : ''}
        </label>
      </form>
      ${gate.status === 'found' ? `
        <div class="crm2-pf-cpf-result is-found" role="alert">
          <strong>Este CPF já possui cadastro.</strong>
          <div class="hub-form-screen-actions">
            <button class="secondary-btn" type="button" onclick="crm2PfOpenDetail('${escapeAttrCrm2(gate.personId)}')">Abrir cadastro</button>
            <button class="secondary-btn" type="button" onclick="crm2PfChangeCpf()">Consultar outro CPF</button>
            <button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('201')">Voltar</button>
          </div>
        </div>
      ` : ''}
      ${gate.status === 'not-found' ? '<p class="crm2-pf-cpf-result is-not-found" role="status"><strong>CPF não encontrado. Iniciar novo cadastro.</strong></p>' : ''}
    </section>
  `;
}

function renderPersonFormCrm2() {
  const route = currentPfRouteCrm2();
  const editing = route.view === 'edit' || crm2PfState.formMode === 'edit';
  const person = editing ? getPersonCrm2(route.id || crm2PfState.detailId) : null;
  const values = { ...(person || {}), ...crm2PfState.draft };
  const statusLabel = personStatusLabelCrm2(person || { pedidos: [] });
  const verified = editing || crm2PfState.cpfGate.status === 'not-found';

  return `
    <section class="hub-form-screen crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-pessoa-form-title">
      <header class="hub-form-screen-header">
        <div>
          <h2 id="crm2-pessoa-form-title">${editing ? 'Editar cadastro' : 'Incluir cadastro de Pessoa Física'}</h2>
        </div>
        <button class="secondary-btn" type="button" onclick="crm2PfCancelForm()">Voltar para a lista</button>
      </header>

      ${crm2PfState.message ? `<p class="admin-message" role="status">${escapeHtmlCrm2(crm2PfState.message)}</p>` : ''}

      ${!editing ? renderCpfVerificationCrm2() : ''}

      <form class="hub-form-screen-content crm2-pf-form" onsubmit="crm2PfSave(event)" novalidate ${verified ? '' : 'hidden'}>
        <section class="hub-form-section ${verified ? '' : 'is-disabled'}" aria-labelledby="crm2-pf-personal-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-personal-title">Dados pessoais</strong><span>Identificação da pessoa física.</span></div>
          <div class="hub-form-grid">
            <label class="crm2-pf-status-automatico">
              <span>Status automático</span>
              <span class="crm2-pf-status-pill is-${escapeAttrCrm2(normalizeSearchCrm2(statusLabel).replace(/\s+/g, '-'))}" role="status">${escapeHtmlCrm2(statusLabel)}</span>
              <small>Calculado com base nos pedidos e vínculos existentes.</small>
            </label>
            ${formFieldCrm2({ label: 'Nome completo/nome social', name: 'nome', value: values.nome, required: true })}
            ${formFieldCrm2({ label: 'CPF', name: 'cpf', value: maskCpfCrm2(values.cpf || crm2PfState.cpfGate.value), required: true, extra: 'inputmode="numeric" maxlength="14" readonly' })}
            ${formFieldCrm2({ label: 'CEI/CAEPF', name: 'cei', value: values.cei })}
            ${formFieldCrm2({ label: 'Data de nascimento', name: 'nascimento', value: values.nascimento, type: 'date' })}
          </div>
        </section>

        <section class="hub-form-section ${verified ? '' : 'is-disabled'}" aria-labelledby="crm2-pf-contact-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-contact-title">Contato</strong><span>Telefone e comunicação.</span></div>
          <div class="hub-form-grid">
            ${formFieldCrm2({ label: 'Telefone', name: 'telefone', value: maskPhoneCrm2(values.telefone), extra: 'inputmode="tel" maxlength="15" onkeyup="crm2PfMaskPhone(this)"' })}
            ${formFieldCrm2({ label: 'E-mail', name: 'email', value: values.email, type: 'email' })}
          </div>
        </section>

        <section class="hub-form-section ${verified ? '' : 'is-disabled'}" aria-labelledby="crm2-pf-origin-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-origin-title">Origem e indicação</strong><span>Contexto de acompanhamento.</span></div>
          <div class="hub-form-grid">
            ${formFieldCrm2({ label: 'Origem', name: 'origem', value: values.origem })}
            ${formFieldCrm2({ label: 'Parceiro de indicação', name: 'parceiro', value: values.parceiro })}
          </div>
        </section>

        <section class="hub-form-section ${verified ? '' : 'is-disabled'}" aria-labelledby="crm2-pf-notes-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-notes-title">Observações</strong><span>Informações complementares.</span></div>
          <div class="hub-form-grid">
            ${formFieldCrm2({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea', wide: true })}
          </div>
        </section>

        <section class="hub-form-section crm2-pf-attachments-mock ${verified ? '' : 'is-disabled'}" aria-labelledby="crm2-pf-attachments-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-attachments-title">Anexos</strong><span>Arquivos mockados e validade.</span></div>
          <p>A seleção valida o fluxo visual, mas o arquivo não é enviado.</p>
          <div class="crm2-pf-form-attachment-fields">
            <label><span>Arquivo</span><input class="config-input" type="file" name="anexoArquivo" ${verified ? '' : 'disabled'}></label>
            <label><span>Validade</span><input class="config-input" type="date" name="anexoValidade" ${verified ? '' : 'disabled'}></label>
          </div>
          ${editing && (person?.anexos || []).length ? `<div class="crm2-pf-form-existing-attachments"><strong>Anexos atuais</strong>${person.anexos.map((attachment) => `<span>${escapeHtmlCrm2(attachment.nome)}</span>`).join('')}</div>` : ''}
        </section>

        <div class="hub-form-screen-actions">
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

function fileToAttachmentCrm2(file, expiration = '') {
  return {
    nome: file?.name || 'Arquivo selecionado',
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
  const file = form.elements.anexoArquivo?.files?.[0] || null;
  const attachmentExpiration = String(data.get('anexoValidade') || '');
  data.delete('anexoArquivo');
  data.delete('anexoValidade');
  const values = Object.fromEntries(data.entries());
  values.nome = String(values.nome || '').trim();
  values.cpf = String(values.cpf || '').replace(/\D/g, '');
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
  const newAttachment = file ? fileToAttachmentCrm2(file, attachmentExpiration) : null;

  if (crm2PfState.formMode === 'edit') {
    const person = getPersonCrm2(crm2PfState.detailId);
    if (!person) return;
    const changes = describeChangesCrm2(person, values);
    Object.assign(person, values, { atualizadoEm: now });
    if (newAttachment) person.anexos = [...(person.anexos || []), newAttachment];
    if (changes.length) registerTimelineCrm2(person, `Dados atualizados. ${changes.join(' | ')}`, 'Atualização');
    if (newAttachment) registerTimelineCrm2(person, `Anexo incluído: ${newAttachment.nome}.`, 'Anexo');
    setMessageCrm2(changes.length || newAttachment
      ? 'Pessoa física atualizada no estado mockado. Nenhum dado foi persistido.'
      : 'Nenhuma alteração foi identificada.');
  } else {
    const id = `pf-mock-${Date.now()}`;
    const person = {
      ...values,
      id,
      cadastroEm: now,
      atualizadoEm: now,
      anexos: newAttachment ? [newAttachment] : [],
      empresas: [],
      pedidos: [],
      timeline: [{ data: now, usuario: 'Usuário atual', descricao: 'Cadastro criado.', tipo: 'Cadastro' }]
    };
    if (newAttachment) person.timeline.push({ data: now, usuario: 'Usuário atual', descricao: `Anexo incluído: ${newAttachment.nome}.`, tipo: 'Anexo' });
    crm2PfState.items.unshift(person);
    crm2PfState.detailId = id;
    setMessageCrm2('Pessoa física criada no estado mockado. Nenhum dado foi persistido.');
  }

  const savedId = crm2PfState.detailId;
  resetFormCrm2();
  crm2PfState.detailTab = 'dados';
  navigateCrm2Route('201', savedId);
}
