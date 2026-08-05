function renderCpfGateCrm2() {
  const gate = crm2PfState.cpfGate;
  return `
    <div class="modal-backdrop crm2-pf-cpf-modal" role="dialog" aria-modal="true" aria-labelledby="crm2-cpf-check-title" aria-describedby="crm2-cpf-check-description" onclick="if(event.target === this) crm2PfCloseForm()">
      <section class="small-modal">
        <div class="small-modal-header">
        <div>
          <span class="ar-crm-phase1-kicker">NOVO CADASTRO · ETAPA PRÉVIA</span>
          <h3 id="crm2-cpf-check-title">Buscar CPF</h3>
          <p id="crm2-cpf-check-description">Consulte os registros mockados antes de iniciar um novo cadastro.</p>
        </div>
        <button class="icon-btn" type="button" onclick="crm2PfCloseForm()" aria-label="Fechar" title="Fechar">×</button>
        </div>
      <form class="crm2-pf-cpf-search" onsubmit="crm2PfSearchCpf(event)" novalidate>
        <label>
          <span>CPF</span>
          <input class="config-input" name="cpf" inputmode="numeric" autocomplete="off" maxlength="14" value="${escapeAttrCrm2(maskCpfCrm2(gate.value))}" oninput="crm2PfMaskCpf(this)" required autofocus>
        </label>
        <div class="small-modal-actions">
          <button class="secondary-btn" type="button" onclick="crm2PfCloseForm()">Cancelar</button>
          <button class="save-btn" type="submit">Buscar CPF</button>
        </div>
      </form>
      ${gate.status ? `
        <div class="crm2-pf-cpf-result is-${escapeAttrCrm2(gate.status)}" role="status">
          <strong>${escapeHtmlCrm2(gate.message)}</strong>
          ${gate.status === 'found' ? `<button class="secondary-btn" type="button" onclick="crm2PfOpenDetail('${escapeAttrCrm2(gate.personId)}')">Abrir cadastro existente</button>` : ''}
          ${gate.status === 'not-found' ? '<button class="save-btn" type="button" onclick="crm2PfContinueCpf()">Cadastrar nova pessoa</button>' : ''}
        </div>
      ` : ''}
      </section>
    </div>
  `;
}

function renderPersonFormCrm2() {
  const editing = crm2PfState.formMode === 'edit';
  const person = editing ? getPersonCrm2(crm2PfState.detailId) : null;
  const values = { ...(person || {}), ...crm2PfState.draft };
  const statusLabel = personStatusLabelCrm2(person || { pedidos: [] });

  return `
    <section class="admin-panel crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-pessoa-form-title">
      <div class="admin-panel-header">
        <div>
          <span class="ar-crm-phase1-kicker">${editing ? 'EDIÇÃO' : 'NOVO CADASTRO'} · MOCK</span>
          <h3 id="crm2-pessoa-form-title">${editing ? 'Editar pessoa física' : 'Nova pessoa física'}</h3>
          <p>O salvamento acontece somente no estado local da página.</p>
        </div>
        <button class="secondary-btn" type="button" onclick="crm2PfCloseForm()">Cancelar</button>
      </div>

      ${crm2PfState.message ? `<p class="admin-message" role="status">${escapeHtmlCrm2(crm2PfState.message)}</p>` : ''}

      <form class="crm2-pf-form" onsubmit="crm2PfSave(event)" novalidate>
        <div class="crm2-pf-form-grid">
          <label class="crm2-pf-status-automatico">
            <span>Status automático</span>
            <input class="config-input" type="text" value="${escapeAttrCrm2(statusLabel)}" disabled>
            <small>Calculado de acordo com os pedidos ativos e vencidos.</small>
          </label>
          ${formFieldCrm2({ label: 'Nome completo/nome social', name: 'nome', value: values.nome, required: true })}
          ${formFieldCrm2({ label: 'CPF', name: 'cpf', value: maskCpfCrm2(values.cpf), required: true, extra: 'inputmode="numeric" maxlength="14" onkeyup="crm2PfMaskCpf(this)"' })}
          ${formFieldCrm2({ label: 'CEI/CAEPF', name: 'cei', value: values.cei })}
          ${formFieldCrm2({ label: 'Data de nascimento', name: 'nascimento', value: values.nascimento, type: 'date' })}
          ${formFieldCrm2({ label: 'Telefone', name: 'telefone', value: maskPhoneCrm2(values.telefone), extra: 'inputmode="tel" maxlength="15" onkeyup="crm2PfMaskPhone(this)"' })}
          ${formFieldCrm2({ label: 'E-mail', name: 'email', value: values.email, type: 'email' })}
          ${formFieldCrm2({ label: 'Origem', name: 'origem', value: values.origem })}
          ${formFieldCrm2({ label: 'Parceiro de indicação', name: 'parceiro', value: values.parceiro })}
          ${formFieldCrm2({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea', wide: true })}
        </div>

        <fieldset class="crm2-pf-attachments-mock">
          <legend>Anexo opcional</legend>
          <p>A seleção valida o fluxo visual, mas o arquivo não é enviado.</p>
          <div class="crm2-pf-form-attachment-fields">
            <label><span>Arquivo</span><input class="config-input" type="file" name="anexoArquivo"></label>
            <label><span>Validade</span><input class="config-input" type="date" name="anexoValidade"></label>
          </div>
          ${editing && (person?.anexos || []).length ? `<div class="crm2-pf-form-existing-attachments"><strong>Anexos atuais</strong>${person.anexos.map((attachment) => `<span>${escapeHtmlCrm2(attachment.nome)}</span>`).join('')}</div>` : ''}
        </fieldset>

        <div class="admin-panel-actions">
          <button class="secondary-btn" type="button" onclick="crm2PfCloseForm()">Cancelar</button>
          <button class="primary-btn" type="submit">Salvar apenas em memória</button>
        </div>
      </form>
    </section>
  `;
}

function renderCrm2Phase2() {
  if (crm2PfState.formMode === 'cpf-check') {
    const list = renderPeopleListCrm2();
    const modal = renderCpfGateCrm2().replace('modal-backdrop crm2-pf-cpf-modal', 'modal-backdrop hub-modal-backdrop--contained crm2-pf-cpf-modal');
    const closingTag = list.lastIndexOf('</section>');
    return `${list.slice(0, closingTag)}${modal}${list.slice(closingTag)}`;
  }
  if (crm2PfState.formMode) return renderPersonFormCrm2();
  if (crm2PfState.detailId) return renderPersonDetailCrm2(getPersonCrm2(crm2PfState.detailId));
  return renderPeopleListCrm2();
}

function renderIntoCurrentCrm2Target() {
  const target = document.querySelector('.crm2-pessoas-page');
  if (!target) return false;
  if (!crm2PfState.mounted) {
    const createButton = target.querySelector('button[onclick*="crm2PfOpenForm"], button[onclick*="abrirFormularioPessoaFisicaCrm2"]');
    if (createButton) crm2PfState.canEdit = !createButton.disabled;
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
  } else {
    crm2PfState.detailId = '';
    crm2PfState.formMode = 'cpf-check';
    crm2PfState.cpfGate = { value: '', status: '', personId: '', message: '' };
    crm2PfState.draft = {};
  }
  rerenderCrm2Phase2();
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

  resetFormCrm2();
  crm2PfState.detailTab = 'dados';
  rerenderCrm2Phase2();
}
