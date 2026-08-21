import './consultoria360.css';
import { chamarApi } from './api.js';

export const CONSULTORIA360_ROUTE = 'operacoes/corretora/consultoria-360';
export const CONSULTORIA360_PERMISSION = 'consultoria_360';

const STEPS = [
  { id: 1, label: 'Cliente e contexto' },
  { id: 2, label: 'Triagem' },
  { id: 3, label: 'Investigação' },
  { id: 4, label: 'Prioridades' }
];

const uiState = {
  view: 'cockpit',
  step: 1,
  notice: '',
  loading: false,
  error: '',
  data: {
    companies: [],
    clients: [],
    atendimentos: []
  },
  draft: {
    clientSource: 'avulso',
    clientId: '',
    clientName: '',
    occupation: '',
    mainInterest: '',
    protectionSignal: '',
    healthSignal: '',
    patrimonySignal: '',
    investigationNotes: ''
  }
};

let activeContext = null;

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value = '') {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function selectOptions(options, selected) {
  return options.map(option => `
    <option value="${escapeAttr(option.value)}" ${option.value === selected ? 'selected' : ''}>${escapeHtml(option.label)}</option>
  `).join('');
}

function field(label, name, value, { type = 'text', placeholder = '', wide = false } = {}) {
  const control = type === 'textarea'
    ? `<textarea class="config-input" name="${escapeAttr(name)}" rows="4" placeholder="${escapeAttr(placeholder)}" oninput="consultoria360AtualizarCampo(this.name, this.value)">${escapeHtml(value)}</textarea>`
    : `<input class="config-input" type="${escapeAttr(type)}" name="${escapeAttr(name)}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}" oninput="consultoria360AtualizarCampo(this.name, this.value)">`;

  return `<label class="consultoria360-field ${wide ? 'is-wide' : ''}"><span>${escapeHtml(label)}</span>${control}</label>`;
}

function renderAccessDenied(renderShell) {
  return renderShell({
    tituloPagina: 'Consultoria 360°',
    descricaoPagina: 'Acesso controlado pela permissão do Hub.',
    classeConteudo: 'consultoria360-page',
    conteudo: `
      <section class="admin-panel consultoria360-access-state" role="alert">
        <div class="admin-panel-header">
          <div>
            <span class="hub-page-kicker">Consultoria consultiva</span>
            <h2>Acesso não autorizado</h2>
            <p>É necessária a permissão Visualizar para acessar o Diagnóstico 360°.</p>
          </div>
        </div>
        <button class="secondary-btn" type="button" onclick="navegarHome()">Voltar para o início</button>
      </section>
    `
  });
}

function renderLoading(renderShell, message = 'Carregando dados da Consultoria 360°...') {
  return renderShell({
    tituloPagina: 'Consultoria 360°',
    descricaoPagina: 'Carregando o cockpit consultivo.',
    classeConteudo: 'consultoria360-page',
    conteudo: `<section class="admin-panel" aria-busy="true" aria-live="polite"><div class="admin-panel-header"><div><span class="hub-page-kicker">Consultoria consultiva</span><h2>Carregando</h2><p>${escapeHtml(message)}</p></div></div><div class="consultoria360-loading"><span class="hub-loading-spinner" aria-hidden="true"></span><span>Buscando dados do Hub...</span></div></section>`
  });
}

function renderStepper() {
  return `
    <ol class="consultoria360-stepper" aria-label="Etapas do diagnóstico">
      ${STEPS.map(step => `
        <li class="${uiState.step === step.id ? 'is-current' : ''} ${uiState.step > step.id ? 'is-complete' : ''}">
          <span>${step.id}</span><strong>${escapeHtml(step.label)}</strong>
        </li>
      `).join('')}
    </ol>
  `;
}

function renderNewDiagnostic(canEdit) {
  const draft = uiState.draft;
  const isLast = uiState.step === STEPS.length;
  const clients = uiState.data.clients || [];

  return `
    <section class="admin-panel consultoria360-workspace" aria-labelledby="consultoria360-workspace-title">
      <div class="admin-panel-header">
        <div>
          <span class="hub-page-kicker">Novo diagnóstico · Fase 1</span>
          <h2 id="consultoria360-workspace-title">Organizar uma conversa consultiva</h2>
          <p>Fluxo demonstrativo para validar a entrada do módulo no Hub. Ainda não salva dados no banco.</p>
        </div>
        <span class="consultoria360-status-chip">Mock de UX</span>
      </div>

      ${renderStepper()}

      <div class="consultoria360-workspace-body">
        ${uiState.step === 1 ? `
          <div class="consultoria360-copy-block">
            <span class="hub-page-kicker">Contexto</span>
            <h3>Comece pelo momento do cliente</h3>
            <p>O diagnóstico deve partir de um cadastro existente quando essa integração estiver disponível.</p>
          </div>
          <div class="consultoria360-form-grid">
            <label class="consultoria360-field is-wide"><span>Cliente vinculado</span><select class="config-input" name="clientId" onchange="consultoria360AtualizarCampo(this.name, this.value)"><option value="">Selecione um cliente existente</option>${clients.map(client => `<option value="${escapeAttr(client.id)}" ${client.id === draft.clientId ? 'selected' : ''}>${escapeHtml(client.nome_razao_social)}</option>`).join('')}</select><small>O diagnóstico usa o cadastro central de pessoas; nenhum cliente é duplicado.</small></label>
            ${field('Nome do cliente', 'clientName', draft.clientName, { placeholder: 'Ex.: Ana Carolina' })}
            ${field('Atividade profissional', 'occupation', draft.occupation, { placeholder: 'Ex.: Empresária' })}
            <label class="consultoria360-field"><span>Interesse principal declarado</span><select class="config-input" name="mainInterest" onchange="consultoria360AtualizarCampo(this.name, this.value)">${selectOptions([
              { value: '', label: 'Ainda não sabe' },
              { value: 'protecao', label: 'Proteção financeira' },
              { value: 'saude', label: 'Saúde' },
              { value: 'patrimonio', label: 'Patrimônio / projeto' }
            ], draft.mainInterest)}</select></label>
          </div>
        ` : ''}

        ${uiState.step === 2 ? `
          <div class="consultoria360-copy-block">
            <span class="hub-page-kicker">Triagem</span>
            <h3>Proteja. Planeje. Construa.</h3>
            <p>Uma leitura curta orienta quais frentes merecem investigação. A recomendação continua sendo do consultor.</p>
          </div>
          <div class="consultoria360-form-grid">
            ${['protectionSignal', 'healthSignal', 'patrimonySignal'].map((name, index) => {
              const labels = [
                ['Proteção financeira', 'Como você avalia hoje a proteção da renda e da família?'],
                ['Saúde', 'Como você avalia hoje acesso, rede e custo de saúde?'],
                ['Patrimônio / projetos', 'Existe uma aquisição ou projeto relevante no horizonte?']
              ];
              return `<label class="consultoria360-field is-wide"><span>${labels[index][0]}</span><small>${labels[index][1]}</small><select class="config-input" name="${name}" onchange="consultoria360AtualizarCampo(this.name, this.value)">${selectOptions([
                { value: '', label: 'Selecione uma leitura' },
                { value: 'baixo', label: 'Sem sinal relevante agora' },
                { value: 'medio', label: 'Vale acompanhar' },
                { value: 'alto', label: 'Merece aprofundamento' }
              ], draft[name])}</select></label>`;
            }).join('')}
          </div>
        ` : ''}

        ${uiState.step === 3 ? `
          <div class="consultoria360-copy-block">
            <span class="hub-page-kicker">Investigação direcionada</span>
            <h3>Registre o que precisa ser aprofundado</h3>
            <p>Na próxima fase, esta etapa será dinâmica e preservará as perguntas do standalone por pilar.</p>
          </div>
          <div class="consultoria360-investigation-grid">
            <article><i data-lucide="shield-check" aria-hidden="true"></i><strong>Proteção financeira</strong><span>Reserva, compromissos e coberturas conhecidas.</span></article>
            <article><i data-lucide="heart-pulse" aria-hidden="true"></i><strong>Saúde</strong><span>Perfil de utilização, rede e orçamento.</span></article>
            <article><i data-lucide="house" aria-hidden="true"></i><strong>Patrimônio / projetos</strong><span>Objetivo, horizonte e capacidade confortável.</span></article>
          </div>
          ${field('Observações iniciais', 'investigationNotes', draft.investigationNotes, { type: 'textarea', placeholder: 'Anote percepções para a próxima conversa.', wide: true })}
        ` : ''}

        ${uiState.step === 4 ? `
          <div class="consultoria360-copy-block">
            <span class="hub-page-kicker">Mapa de prioridades</span>
            <h3>Uma prioridade por vez</h3>
            <p>Os scores e a devolutiva consultiva entram na Fase 2, com regras puras versionadas e testes.</p>
          </div>
          <div class="consultoria360-priority-grid">
            ${['Proteção financeira', 'Saúde', 'Patrimônio / projetos'].map(label => `<article><span class="consultoria360-priority-placeholder">—</span><strong>${label}</strong><small>Indicador pendente da Fase 2</small></article>`).join('')}
          </div>
          <div class="consultoria360-notice" role="status"><i data-lucide="info" aria-hidden="true"></i><span>Este marco valida apenas a navegação e a linguagem da experiência. Nenhuma resposta será persistida.</span></div>
        ` : ''}
      </div>

      <div class="consultoria360-actions">
        <button class="secondary-btn" type="button" onclick="consultoria360VoltarCockpit()">Cancelar</button>
        <div>
          ${uiState.step === 1 && draft.clientId ? `<button class="secondary-btn" type="button" ${canEdit ? '' : 'disabled'} onclick="consultoria360SalvarRascunho()">Salvar rascunho</button>` : ''}
          ${uiState.step > 1 ? '<button class="secondary-btn" type="button" onclick="consultoria360VoltarEtapa()">Voltar</button>' : ''}
          <button class="save-btn" type="button" ${canEdit ? '' : 'disabled'} onclick="${isLast ? 'consultoria360ConcluirMock()' : 'consultoria360AvancarEtapa()'}">${isLast ? 'Concluir demonstração' : 'Continuar'}</button>
        </div>
      </div>
    </section>
  `;
}

function renderCockpit(renderShell, canEdit) {
  const atendimentos = Array.isArray(uiState.data.atendimentos) ? uiState.data.atendimentos : [];
  const activeCount = atendimentos.filter(item => ['rascunho', 'em_andamento'].includes(item.status)).length;
  const reviewCount = atendimentos.filter(item => item.proxima_revisao).length;
  const priorityCount = atendimentos.filter(item => item.prioridade_final).length;
  return renderShell({
    tituloPagina: 'Consultoria 360°',
    descricaoPagina: 'Proteção, planejamento e próximos passos em uma visão consultiva.',
    classeConteudo: 'consultoria360-page',
    conteudo: `
      <section class="admin-panel consultoria360-cockpit" aria-labelledby="consultoria360-title">
        <div class="admin-panel-header consultoria360-cockpit-header">
          <div>
            <span class="hub-page-kicker">Proteja · Planeje · Construa</span>
            <h2 id="consultoria360-title">Diagnóstico 360°</h2>
            <p>Uma leitura estruturada do momento do cliente para decidir o que merece atenção agora.</p>
          </div>
          <button class="save-btn" type="button" ${canEdit ? '' : 'disabled'} onclick="consultoria360NovoDiagnostico()"><i data-lucide="plus" aria-hidden="true"></i> Novo diagnóstico</button>
        </div>

        <div class="consultoria360-intro-card">
          <div><i data-lucide="compass" aria-hidden="true"></i></div>
          <div><strong>Consultoria orientada por contexto</strong><p>O sistema organiza informações e referências. A recomendação final continua sendo validada pelo consultor.</p></div>
        </div>

        <div class="consultoria360-metrics" aria-label="Resumo da carteira de consultoria">
          <article><span>Diagnósticos ativos</span><strong>${activeCount}</strong><small>${activeCount ? 'Em andamento no Hub' : 'Aguardando a primeira análise'}</small></article>
          <article><span>Revisões próximas</span><strong>${reviewCount}</strong><small>Serão acompanhadas no Cockpit</small></article>
          <article><span>Prioridades em acompanhamento</span><strong>${priorityCount}</strong><small>Com prioridade consultiva definida</small></article>
        </div>

        ${uiState.error ? `<div class="consultoria360-error" role="alert"><i data-lucide="circle-alert" aria-hidden="true"></i><div><strong>Não foi possível carregar o cockpit.</strong><p>${escapeHtml(uiState.error)}</p></div><button class="secondary-btn" type="button" onclick="consultoria360Recarregar()">Tentar novamente</button></div>` : ''}

        ${atendimentos.length ? `<div class="consultoria360-table-wrap"><table class="ar-crm-phase1-table consultoria360-table"><caption class="consultoria360-table-caption">Atendimentos persistidos no Hub</caption><thead><tr><th scope="col">Cliente</th><th scope="col">Status</th><th scope="col">Prioridade</th><th scope="col">Atualizado em</th></tr></thead><tbody>${atendimentos.map(item => `<tr><td><strong>${escapeHtml(item.cliente_snapshot?.nome_razao_social || 'Cliente vinculado')}</strong></td><td>${escapeHtml(item.status || '—')}</td><td>${escapeHtml(item.prioridade_final || 'A definir')}</td><td>${escapeHtml(item.updated_at ? new Date(item.updated_at).toLocaleDateString('pt-BR') : '—')}</td></tr>`).join('')}</tbody></table></div>` : `<div class="consultoria360-empty-state" role="status"><i data-lucide="clipboard-list" aria-hidden="true"></i><strong>Nenhum diagnóstico nesta visão</strong><p>Inicie uma análise para testar o fluxo nativo do Hub. A persistência real será usada a partir de um cliente existente.</p><button class="secondary-btn" type="button" ${canEdit ? '' : 'disabled'} onclick="consultoria360NovoDiagnostico()">Abrir fluxo demonstrativo</button></div>`}

        ${uiState.notice ? `<p class="consultoria360-feedback" role="status"><i data-lucide="check-circle-2" aria-hidden="true"></i>${escapeHtml(uiState.notice)}</p>` : ''}
      </section>
    `
  });
}

function rerender() {
  if (!activeContext) return;
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = renderConsultoria360Page(activeContext);
}

export function renderConsultoria360Page(context = {}) {
  activeContext = context;
  const { renderShell, pode = () => false } = context;
  const canView = pode(CONSULTORIA360_PERMISSION, 'view');
  const canEdit = pode(CONSULTORIA360_PERMISSION, 'create') || pode(CONSULTORIA360_PERMISSION, 'update');

  if (!canView) return renderAccessDenied(renderShell);
  if (uiState.loading) return renderLoading(renderShell);
  if (uiState.view === 'new') return renderShell({
    tituloPagina: 'Novo diagnóstico',
    descricaoPagina: 'Fluxo inicial da Consultoria 360°.',
    classeConteudo: 'consultoria360-page',
    conteudo: renderNewDiagnostic(canEdit)
  });

  return renderCockpit(renderShell, canEdit);
}

async function carregarDados() {
  uiState.loading = true;
  uiState.error = '';
  rerender();

  try {
    const companiesResponse = await chamarApi('listConsultoria360Companies');
    if (!companiesResponse.ok) throw new Error(companiesResponse.message || 'Não foi possível carregar as empresas.');
    uiState.data.companies = companiesResponse.data || [];
    const companyId = uiState.data.companies[0]?.id || '';
    activeContext.empresaId = companyId;

    if (companyId) {
      const dashboardResponse = await chamarApi('getConsultoria360Dashboard', { empresaId: companyId });
      if (!dashboardResponse.ok) throw new Error(dashboardResponse.message || 'Não foi possível carregar os atendimentos.');
      uiState.data.atendimentos = dashboardResponse.data || [];
    } else {
      uiState.data.atendimentos = [];
    }
  } catch (error) {
    uiState.error = error.message || 'Não foi possível carregar os dados da Consultoria 360°.';
  } finally {
    uiState.loading = false;
    rerender();
  }
}

export async function mountConsultoria360Page(context = {}) {
  activeContext = { ...context };
  const canView = context.pode?.(CONSULTORIA360_PERMISSION, 'view');
  if (!canView) {
    document.getElementById('app').innerHTML = renderConsultoria360Page(activeContext);
    return;
  }
  document.getElementById('app').innerHTML = renderConsultoria360Page(activeContext);
  await carregarDados();
}

export function renderCorretoraOperationalPage({ renderShell }) {
  return renderShell({
    tituloPagina: 'Operações da Corretora',
    descricaoPagina: 'Acesso às ferramentas operacionais da corretora.',
    classeConteudo: 'consultoria360-page',
    conteudo: `
      <section class="admin-panel consultoria360-cockpit">
        <div class="admin-panel-header">
          <div><span class="hub-page-kicker">Operações</span><h2>Corretora</h2><p>Escolha uma ferramenta para continuar.</p></div>
        </div>
        <button class="consultoria360-module-entry" type="button" onclick="navegarParaRota('/operacoes/corretora/consultoria-360')">
          <span><i data-lucide="compass" aria-hidden="true"></i></span><strong>Consultoria 360°</strong><small>Diagnóstico de proteção, saúde e patrimônio.</small><i data-lucide="arrow-right" aria-hidden="true"></i>
        </button>
      </section>
    `
  });
}

window.consultoria360NovoDiagnostico = () => {
  uiState.view = 'new';
  uiState.step = 1;
  uiState.notice = '';
  uiState.error = '';
  uiState.draft.clientId = '';
  uiState.data.clients = [];
  rerender();
  if (activeContext?.empresaId) {
    chamarApi('listConsultoria360Clients', { empresaId: activeContext.empresaId }).then(response => {
      if (response.ok) {
        uiState.data.clients = response.data || [];
        rerender();
      } else {
        uiState.error = response.message || 'Não foi possível carregar os clientes.';
        rerender();
      }
    });
  }
};
window.consultoria360VoltarCockpit = () => {
  uiState.view = 'cockpit';
  uiState.step = 1;
  rerender();
};
window.consultoria360AvancarEtapa = () => {
  uiState.step = Math.min(STEPS.length, uiState.step + 1);
  rerender();
};
window.consultoria360VoltarEtapa = () => {
  uiState.step = Math.max(1, uiState.step - 1);
  rerender();
};
window.consultoria360AtualizarCampo = (name, value) => {
  if (Object.prototype.hasOwnProperty.call(uiState.draft, name)) uiState.draft[name] = String(value ?? '');
};
window.consultoria360SalvarRascunho = async () => {
  if (!activeContext?.empresaId || !uiState.draft.clientId) return;
  uiState.loading = true;
  rerender();
  const client = uiState.data.clients.find(item => item.id === uiState.draft.clientId);
  const response = await chamarApi('createConsultoria360Atendimento', {
    empresa_id: activeContext.empresaId,
    pessoa_id: uiState.draft.clientId,
    cliente_snapshot: client || {},
    contexto: {
      occupation: uiState.draft.occupation,
      mainInterest: uiState.draft.mainInterest
    }
  });
  uiState.loading = false;
  if (!response.ok) {
    uiState.error = response.message || 'Não foi possível salvar o rascunho.';
    rerender();
    return;
  }
  uiState.view = 'cockpit';
  uiState.notice = 'Rascunho salvo no Supabase e vinculado ao cadastro existente.';
  uiState.data.atendimentos = [response.data, ...uiState.data.atendimentos];
  rerender();
};
window.consultoria360Recarregar = () => carregarDados();
window.consultoria360ConcluirMock = () => {
  uiState.view = 'cockpit';
  uiState.step = 1;
  uiState.notice = 'Demonstração concluída. Nenhum dado oficial foi salvo.';
  rerender();
};
