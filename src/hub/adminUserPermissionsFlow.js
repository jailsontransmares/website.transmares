const STYLE_ID = 'admin-user-permissions-flow-style';

const ACAO_BULK_LABELS = [
  'conceder tudo',
  'bloquear tudo',
  'restaurar padrao',
  'restaurar padrão'
];

const APLICACAO_DELAYS = [0, 120, 350, 700, 1200, 1800];

function normalizarTexto(texto = '') {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function obterEstadoPermissoesUsuario() {
  if (typeof window.hubObterEstadoUsuarioTelaAdmin !== 'function') return null;
  const estado = window.hubObterEstadoUsuarioTelaAdmin();
  if (!estado || estado.etapa !== 'permissoes' || !estado.id) return null;
  return estado;
}

function obterEscopoPermissoes() {
  return document.querySelector('.admin-user-direct-permissions');
}

function injetarEstilosPermissoesUsuario() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-user-direct-permissions .permission-modal-layout > .admin-user-permissions-actions,
    .admin-user-direct-permissions .permission-modal-layout .admin-user-permissions-actions {
      display: none !important;
    }

    .admin-user-direct-permissions > .admin-user-direct-actions {
      display: none !important;
    }

    .admin-user-direct-shell:has(.admin-user-direct-permissions) {
      max-height: calc(100vh - 120px);
    }

    .admin-user-direct-shell:has(.admin-user-direct-permissions) .admin-user-direct-card {
      min-height: 0;
      overflow: hidden;
    }

    .admin-user-direct-permissions {
      min-height: 0;
      display: flex !important;
      flex-direction: column;
      gap: 12px !important;
    }

    .admin-user-direct-permissions .permission-modal-layout {
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .admin-user-direct-permissions .permission-modal-content,
    .admin-user-direct-permissions .permissions-list,
    .admin-user-direct-permissions .permission-list,
    .admin-user-direct-permissions .admin-user-permissions-list {
      min-height: 0;
      max-height: calc(100vh - 330px) !important;
      overflow: auto !important;
      padding-right: 6px;
    }

    .admin-user-permissions-clean-footer {
      position: sticky;
      bottom: 0;
      z-index: 20;
      display: flex !important;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      margin-top: 14px;
      padding: 14px 0 0;
      border-top: 1px solid rgba(148, 163, 184, 0.22);
      background: inherit;
    }

    .admin-user-permissions-clean-footer .secondary-btn,
    .admin-user-permissions-clean-footer .save-btn {
      min-width: 132px;
      justify-content: center;
    }

    .admin-user-permissions-clean-footer .save-btn:disabled {
      opacity: 0.52;
      cursor: not-allowed;
      filter: grayscale(0.3);
    }

    .admin-user-permission-original-bulk-action {
      display: none !important;
    }

    .admin-user-permission-actions-menu {
      position: relative;
      display: inline-flex !important;
      align-items: center;
      justify-content: flex-end;
      margin-left: auto;
      z-index: 12;
    }

    .admin-user-permission-actions-trigger {
      min-height: 34px;
      padding: 7px 11px;
      border-radius: 999px;
      font-size: 0.78rem;
      white-space: nowrap;
    }

    .admin-user-permission-actions-list {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: 30;
      min-width: 180px;
      display: none;
      padding: 6px;
      border-radius: 14px;
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    body.dark .admin-user-permission-actions-list {
      background: rgba(15, 23, 42, 0.96);
      border-color: rgba(148, 163, 184, 0.18);
    }

    .admin-user-permission-actions-menu.is-open .admin-user-permission-actions-list {
      display: grid;
      gap: 4px;
    }

    .admin-user-permission-actions-list button {
      width: 100%;
      border: 0;
      border-radius: 10px;
      padding: 9px 10px;
      background: transparent;
      color: var(--text-strong, #0f172a);
      text-align: left;
      font: inherit;
      font-size: 0.82rem;
      cursor: pointer;
    }

    body.dark .admin-user-permission-actions-list button {
      color: var(--text-strong, #f8fafc);
    }

    .admin-user-permission-actions-list button:hover {
      background: rgba(41, 72, 149, 0.08);
    }

    @media (max-width: 760px) {
      .admin-user-direct-shell:has(.admin-user-direct-permissions) {
        max-height: none;
      }

      .admin-user-direct-permissions .permission-modal-content,
      .admin-user-direct-permissions .permissions-list,
      .admin-user-direct-permissions .permission-list,
      .admin-user-direct-permissions .admin-user-permissions-list {
        max-height: 62vh !important;
      }

      .admin-user-permissions-clean-footer {
        flex-direction: column-reverse;
        align-items: stretch;
      }

      .admin-user-permissions-clean-footer .secondary-btn,
      .admin-user-permissions-clean-footer .save-btn {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}

function existemAlteracoesPermissoes() {
  const escopo = obterEscopoPermissoes();
  if (!escopo) return false;

  return Array.from(escopo.querySelectorAll('input[type="checkbox"]')).some(input => {
    if (typeof input.defaultChecked === 'boolean') {
      return input.checked !== input.defaultChecked;
    }
    return input.dataset.originalChecked && String(input.checked) !== input.dataset.originalChecked;
  });
}

function confirmarSaidaComAlteracoesPermissoes() {
  if (!existemAlteracoesPermissoes()) return true;
  return window.confirm('Existem alterações de permissões não salvas. Deseja sair sem salvar?');
}

function marcarEstadoInicialPermissoes() {
  const escopo = obterEscopoPermissoes();
  if (!escopo) return;

  escopo.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.dataset.originalChecked = String(input.checked);
    input.defaultChecked = input.checked;
  });
}

function atualizarBotaoSalvarPermissoes() {
  const botao = document.querySelector('[data-admin-permissions-save-clean]');
  if (!botao) return;
  botao.disabled = !existemAlteracoesPermissoes();
}

function instalarMonitoramentoAlteracoes() {
  const escopo = obterEscopoPermissoes();
  if (!escopo || escopo.dataset.cleanFooterTracking === 'true') return;

  escopo.dataset.cleanFooterTracking = 'true';
  marcarEstadoInicialPermissoes();
  escopo.addEventListener('change', atualizarBotaoSalvarPermissoes);
  atualizarBotaoSalvarPermissoes();
}

function obterTipoAcaoBulk(botao) {
  const texto = normalizarTexto(botao?.textContent || '');
  if (!ACAO_BULK_LABELS.includes(texto)) return '';
  if (texto.includes('conceder')) return 'conceder';
  if (texto.includes('bloquear')) return 'bloquear';
  if (texto.includes('restaurar')) return 'restaurar';
  return '';
}

function obterBotoesBulkPorGrupo(grupo) {
  const encontrados = new Map();

  Array.from(grupo.querySelectorAll('button')).forEach(botao => {
    const tipo = obterTipoAcaoBulk(botao);
    if (!tipo) return;
    encontrados.set(tipo, botao);
  });

  return encontrados;
}

function obterContainerAcoesModulo(botao, escopo) {
  const containerExplicito = botao.closest([
    '.permission-module-actions',
    '.module-actions',
    '.admin-permission-module-actions',
    '.permission-actions',
    '.permissions-actions',
    '.bulk-actions'
  ].join(', '));

  if (containerExplicito) return containerExplicito;

  let atual = botao.parentElement;
  while (atual && atual !== escopo) {
    const botoesNoNivel = obterBotoesBulkPorGrupo(atual);
    if (botoesNoNivel.size >= 2) return atual;
    atual = atual.parentElement;
  }

  return botao.parentElement;
}

function executarAcaoBulkPermissoes(botaoOriginal, tipo) {
  if (!botaoOriginal) return;

  if (tipo === 'bloquear') {
    const confirmado = window.confirm('Deseja bloquear todas as permissões deste módulo?');
    if (!confirmado) return;
  }

  if (tipo === 'restaurar') {
    const confirmado = window.confirm('Deseja restaurar o padrão de permissões deste módulo?');
    if (!confirmado) return;
  }

  botaoOriginal.click();
  window.setTimeout(atualizarBotaoSalvarPermissoes, 0);
}

function fecharMenusAcoesPermissoes(menuAtual = null) {
  document.querySelectorAll('.admin-user-permission-actions-menu.is-open').forEach(menu => {
    if (menu !== menuAtual) menu.classList.remove('is-open');
  });
}

function criarMenuAcoesModulo(botoes) {
  const wrapper = document.createElement('div');
  wrapper.className = 'admin-user-permission-actions-menu';
  wrapper.innerHTML = `
    <button class="secondary-btn admin-user-permission-actions-trigger" type="button" aria-expanded="false">Ações</button>
    <div class="admin-user-permission-actions-list" role="menu">
      ${botoes.has('conceder') ? '<button type="button" data-bulk-action="conceder">Conceder tudo</button>' : ''}
      ${botoes.has('bloquear') ? '<button type="button" data-bulk-action="bloquear">Bloquear tudo</button>' : ''}
      ${botoes.has('restaurar') ? '<button type="button" data-bulk-action="restaurar">Restaurar padrão</button>' : ''}
    </div>
  `;

  const trigger = wrapper.querySelector('.admin-user-permission-actions-trigger');
  trigger?.addEventListener('click', event => {
    event.stopPropagation();
    const aberto = wrapper.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(aberto));
    fecharMenusAcoesPermissoes(wrapper);
  });

  wrapper.querySelectorAll('[data-bulk-action]').forEach(item => {
    item.addEventListener('click', event => {
      event.stopPropagation();
      const tipo = item.dataset.bulkAction;
      wrapper.classList.remove('is-open');
      trigger?.setAttribute('aria-expanded', 'false');
      executarAcaoBulkPermissoes(botoes.get(tipo), tipo);
    });
  });

  return wrapper;
}

function aplicarMenusAcoesPorModulo() {
  const escopo = obterEscopoPermissoes();
  if (!escopo) return;

  const candidatos = Array.from(escopo.querySelectorAll('button'))
    .filter(botao => obterTipoAcaoBulk(botao) && !botao.closest('.admin-user-permission-actions-menu'));

  const containers = Array.from(new Set(candidatos.map(botao => obterContainerAcoesModulo(botao, escopo)).filter(Boolean)));

  containers.forEach(container => {
    if (container.querySelector('.admin-user-permission-actions-menu')) return;

    const botoes = obterBotoesBulkPorGrupo(container);
    if (!botoes.size) return;

    botoes.forEach(botao => {
      botao.classList.add('admin-user-permission-original-bulk-action');
      botao.setAttribute('aria-hidden', 'true');
      botao.tabIndex = -1;
    });

    container.appendChild(criarMenuAcoesModulo(botoes));
  });
}

function voltarParaUsuarioComConfirmacao(usuarioId) {
  if (!confirmarSaidaComAlteracoesPermissoes()) return;

  if (typeof window.abrirTelaEditarUsuarioAdmin === 'function') {
    window.abrirTelaEditarUsuarioAdmin(usuarioId);
  }
}

function aplicarRodapePermissoesUsuario() {
  const estado = obterEstadoPermissoesUsuario();
  const escopo = obterEscopoPermissoes();
  if (!estado || !escopo) return;

  if (!escopo.querySelector('.admin-user-permissions-clean-footer')) {
    const footer = document.createElement('div');
    footer.className = 'admin-user-permissions-clean-footer';
    footer.innerHTML = `
      <button class="secondary-btn" type="button" onclick="hubAdminPermissoesVoltarParaUsuario('${estado.id}')">Voltar para usuário</button>
      <button class="save-btn" type="button" data-admin-permissions-save-clean onclick="hubAdminPermissoesSalvarAlteracoes('${estado.id}')" disabled>Salvar alterações</button>
    `;
    escopo.appendChild(footer);
  }

  instalarMonitoramentoAlteracoes();
  aplicarMenusAcoesPorModulo();
}

async function salvarAlteracoesPermissoesUsuario(usuarioId) {
  const botao = document.querySelector('[data-admin-permissions-save-clean]');
  if (botao?.disabled) return;

  if (botao) {
    botao.disabled = true;
    botao.textContent = 'Salvando...';
  }

  try {
    if (typeof window.salvarPermissoesUsuarioAdmin === 'function') {
      await window.salvarPermissoesUsuarioAdmin(usuarioId, false);
    }

    marcarEstadoInicialPermissoes();

    if (typeof window.abrirTelaEditarUsuarioAdmin === 'function') {
      window.abrirTelaEditarUsuarioAdmin(usuarioId);
    }
  } catch (erro) {
    if (botao) {
      botao.disabled = false;
      botao.textContent = 'Salvar alterações';
    }
    throw erro;
  }
}

function protegerFechamentoDaPagina(event) {
  if (!obterEstadoPermissoesUsuario() || !existemAlteracoesPermissoes()) return;

  event.preventDefault();
  event.returnValue = '';
}

function agendarAplicacaoRodape() {
  APLICACAO_DELAYS.forEach(delay => window.setTimeout(aplicarRodapePermissoesUsuario, delay));
}

function iniciarFluxoPermissoesUsuario() {
  injetarEstilosPermissoesUsuario();
  window.hubAdminPermissoesSalvarAlteracoes = salvarAlteracoesPermissoesUsuario;
  window.hubAdminPermissoesVoltarParaUsuario = voltarParaUsuarioComConfirmacao;
  agendarAplicacaoRodape();
}

window.addEventListener('click', event => {
  if (!event.target.closest?.('.admin-user-permission-actions-menu')) {
    fecharMenusAcoesPermissoes();
  }
  window.setTimeout(aplicarRodapePermissoesUsuario, 0);
});
window.addEventListener('change', () => window.setTimeout(aplicarRodapePermissoesUsuario, 0));
window.addEventListener('beforeunload', protegerFechamentoDaPagina);
window.addEventListener('hubAdminUsuarioTelaAtualizada', agendarAplicacaoRodape);
window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', agendarAplicacaoRodape);
window.addEventListener('load', agendarAplicacaoRodape);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarFluxoPermissoesUsuario);
} else {
  iniciarFluxoPermissoesUsuario();
}
