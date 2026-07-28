import { chamarApi } from './api.js';

const STYLE_ID = 'admin-profile-permissions-v2-style';
const APPLY_DELAYS = [0, 80, 180, 360, 700, 1200];

let recursos = [];
let perfis = [];
let permissoes = [];
let perfilCarregado = '';
let carregando = false;
let salvando = false;
let mensagem = '';
let renderPendente = false;
let ultimoAcionamento = { chave: '', tempo: 0 };

const estado = {
  perfilId: '',
  expandidos: {},
  original: {},
  rascunho: {},
  alterado: false
};

function escapeHtml(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(valor) {
  return escapeHtml(valor);
}

function normalizarTexto(valor = '') {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function obterEstadoTelaPerfil() {
  if (typeof window.hubObterEstadoPerfilTelaAdmin !== 'function') {
    return { modo: '', id: '', etapa: 'dados' };
  }

  return window.hubObterEstadoPerfilTelaAdmin() || { modo: '', id: '', etapa: 'dados' };
}

function telaAtiva() {
  const atual = obterEstadoTelaPerfil();
  return atual.modo === 'editar' && atual.etapa === 'permissoes' && Boolean(atual.id);
}

function obterCardDestino() {
  const shell = document.querySelector('.admin-profile-direct-shell');
  return shell?.querySelector('.admin-profile-direct-card') || null;
}

function injetarEstilos() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-profile-direct-card.is-profile-permissions-v2 {
      padding: 0 !important;
      overflow: visible !important;
      min-height: 0 !important;
    }

    .admin-profile-permissions-v2 {
      display: grid;
      grid-template-rows: auto auto minmax(0, auto) auto;
      min-height: 0;
      color: var(--text-strong, #0f172a);
    }

    .admin-profile-permissions-v2-head,
    .admin-profile-permissions-v2-toolbar,
    .admin-profile-permissions-v2-footer {
      padding: 16px 20px;
      background: rgba(248, 250, 252, 0.86);
      border-color: rgba(148, 163, 184, 0.18);
    }

    body.dark .admin-profile-permissions-v2-head,
    body.dark .admin-profile-permissions-v2-toolbar,
    body.dark .admin-profile-permissions-v2-footer {
      background: rgba(15, 23, 42, 0.78);
      border-color: rgba(148, 163, 184, 0.16);
    }

    .admin-profile-permissions-v2-head { border-bottom: 1px solid rgba(148, 163, 184, 0.18); }
    .admin-profile-permissions-v2-toolbar { border-bottom: 1px solid rgba(148, 163, 184, 0.14); }
    .admin-profile-permissions-v2-footer { border-top: 1px solid rgba(148, 163, 184, 0.18); position: sticky; bottom: 0; z-index: 30; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }

    .admin-profile-permissions-v2-head h4 { margin: 0; font-size: 1.06rem; font-weight: 850; letter-spacing: -0.025em; }
    .admin-profile-permissions-v2-head p,
    .admin-profile-permissions-v2-status { margin: 5px 0 0; color: var(--text-muted, #64748b); font-size: 0.84rem; }

    .admin-profile-permissions-v2-toolbar,
    .admin-profile-permissions-v2-toolbar-group,
    .admin-profile-permissions-v2-footer,
    .admin-profile-permissions-v2-footer-actions,
    .admin-profile-permissions-v2-module-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }

    .admin-profile-permissions-v2-toolbar,
    .admin-profile-permissions-v2-footer { justify-content: space-between; }

    .admin-profile-permissions-v2-body {
      display: grid;
      align-content: start;
      gap: 14px;
      padding: 16px 20px 24px;
      min-height: 0;
      max-height: none;
      overflow: visible;
    }

    .admin-profile-permissions-v2-card {
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.76);
      overflow: hidden;
    }

    body.dark .admin-profile-permissions-v2-card { background: rgba(15, 23, 42, 0.42); border-color: rgba(148, 163, 184, 0.16); }

    .admin-profile-permissions-v2-module-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 58px;
      padding: 12px 14px;
      background: rgba(248, 250, 252, 0.78);
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
    }

    body.dark .admin-profile-permissions-v2-module-head { background: rgba(30, 41, 59, 0.48); }

    .admin-profile-permissions-v2-toggle {
      appearance: none;
      border: 0;
      background: transparent;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      color: var(--text-strong, #0f172a);
      font: inherit;
      font-weight: 820;
      text-align: left;
      cursor: pointer;
    }

    .admin-profile-permissions-v2-toggle span {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(41, 72, 149, 0.1);
      color: var(--cor-principal, #294895);
      font-weight: 900;
      flex: 0 0 auto;
    }

    .admin-profile-permissions-v2-table-wrap { width: 100%; max-width: 100%; overflow-x: auto; overflow-y: visible; }
    .admin-profile-permissions-v2-card.is-collapsed .admin-profile-permissions-v2-table-wrap { display: none; }

    .admin-profile-permissions-v2-table {
      width: max-content;
      min-width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .admin-profile-permissions-v2-table th,
    .admin-profile-permissions-v2-table td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      text-align: center;
      vertical-align: middle;
      white-space: nowrap;
      font-size: 0.82rem;
    }

    .admin-profile-permissions-v2-table th:first-child,
    .admin-profile-permissions-v2-table td:first-child {
      position: sticky;
      left: 0;
      z-index: 2;
      text-align: left;
      min-width: 260px;
      max-width: 380px;
      white-space: normal;
      background: rgba(248, 250, 252, 0.98);
    }

    body.dark .admin-profile-permissions-v2-table th:first-child,
    body.dark .admin-profile-permissions-v2-table td:first-child { background: rgba(15, 23, 42, 0.98); }

    .admin-profile-permissions-v2-table th { color: var(--text-muted, #64748b); font-weight: 800; background: rgba(248, 250, 252, 0.84); }
    .admin-profile-permissions-v2-empty { color: var(--text-muted, #94a3b8); }
    .admin-profile-permissions-v2-check input { width: 18px; height: 18px; accent-color: var(--cor-principal, #294895); cursor: pointer; }
    .admin-profile-permissions-v2-message { margin: 0; padding: 10px 12px; border-radius: 14px; background: rgba(41, 72, 149, 0.08); color: var(--text-strong, #0f172a); font-size: 0.84rem; }

    @media (max-width: 760px) {
      .admin-profile-permissions-v2-toolbar,
      .admin-profile-permissions-v2-footer { align-items: stretch; flex-direction: column; }
      .admin-profile-permissions-v2-toolbar-group,
      .admin-profile-permissions-v2-footer-actions,
      .admin-profile-permissions-v2 .filter-btn,
      .admin-profile-permissions-v2 .secondary-btn,
      .admin-profile-permissions-v2 .save-btn { width: 100%; }
    }
  `;

  document.head.appendChild(style);
}

function rotuloAcao(acao) {
  const rotulos = {
    view: 'Visualizar',
    create: 'Criar',
    update: 'Editar',
    delete: 'Excluir',
    execute: 'Executar',
    view_secret: 'Ver senha',
    importar: 'Importar repasse',
    excluir_importacao: 'Excluir importação',
    emitir_recibo: 'Emitir recibo',
    cancelar_recibo: 'Cancelar recibo',
    manage_permissions: 'Gerenciar permissões',
    block: 'Bloquear'
  };
  return rotulos[acao] || acao;
}

function acoesDisponiveis(recurso) {
  const chave = recurso?.chave || '';
  const mapa = {
    links_corretora: ['view'],
    links_ar: ['view'],
    links_gestao: ['view'],
    painel_ar: ['view'],
    'painel_ar.gerar_links': ['view', 'execute'],
    'painel_ar.validacoes': ['view', 'importar', 'excluir_importacao', 'emitir_recibo', 'cancelar_recibo'],
    'painel_ar.validacoes.importacao': ['view', 'importar', 'excluir_importacao'],
    'painel_ar.validacoes.recibos': ['view', 'emitir_recibo', 'cancelar_recibo'],
    central_senhas: ['view', 'view_secret', 'create', 'update', 'delete'],
    admin: ['view'],
    'admin.usuarios': ['view', 'create', 'update', 'manage_permissions'],
    'admin.perfis': ['view', 'create', 'update'],
    'admin.permissoes': ['view', 'update']
  };
  return mapa[chave] || ['view'];
}

function grupoRecurso(recurso) {
  const chave = recurso?.chave || '';
  if (chave.startsWith('admin')) return 'Administração';
  if (chave === 'central_senhas') return 'Central de Senhas';
  if (chave.startsWith('painel_ar')) return 'Painel AR';
  if (chave.startsWith('links_')) return 'Links';
  return 'Outros';
}

function ordemAcao(acao) {
  const ordem = { view: 1, view_secret: 2, create: 3, update: 4, delete: 5, execute: 6, importar: 7, excluir_importacao: 8, emitir_recibo: 9, cancelar_recibo: 10, manage_permissions: 11, block: 12 };
  return ordem[acao] || 999;
}

function montarModulos() {
  const grupos = {};

  recursos.forEach(recurso => {
    const nome = grupoRecurso(recurso);
    const chave = normalizarTexto(nome) || 'outros';
    grupos[chave] ||= { chave, nome, acoes: [], linhas: [] };
    grupos[chave].linhas.push(recurso);
    acoesDisponiveis(recurso).forEach(acao => {
      if (!grupos[chave].acoes.includes(acao)) grupos[chave].acoes.push(acao);
    });
  });

  return Object.values(grupos)
    .map(grupo => ({
      ...grupo,
      acoes: grupo.acoes.sort((a, b) => ordemAcao(a) - ordemAcao(b)),
      linhas: grupo.linhas.sort((a, b) => String(a.rotulo_recurso || a.nome || a.chave).localeCompare(String(b.rotulo_recurso || b.nome || b.chave), 'pt-BR'))
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function mapaPermissoesPerfil(perfilId) {
  return permissoes.reduce((acc, item) => {
    if (item.perfil_id === perfilId && item.permitido !== false) {
      acc[`${item.recurso_chave}:${item.acao}`] = true;
    }
    return acc;
  }, {});
}

function temAlteracoes(original, rascunho) {
  const chaves = new Set([...Object.keys(original || {}), ...Object.keys(rascunho || {})]);
  return Array.from(chaves).some(chave => Boolean(original[chave]) !== Boolean(rascunho[chave]));
}

function perfilAtual() {
  return perfis.find(perfil => perfil.id === estado.perfilId) || {};
}

async function carregarPermissoes(perfilId) {
  if (!perfilId || carregando) return;
  if (perfilCarregado === perfilId && recursos.length) return;

  try {
    carregando = true;
    mensagem = '';
    renderizarPermissoesV2();

    const response = await chamarApi('listAdminPermissions');
    if (!response.ok) throw new Error(response.message || 'Não foi possível carregar permissões do perfil.');

    recursos = response.data?.recursos || [];
    perfis = response.data?.perfis || [];
    permissoes = response.data?.permissoes || [];

    const modulos = montarModulos();
    const original = mapaPermissoesPerfil(perfilId);

    estado.perfilId = perfilId;
    estado.expandidos = modulos.reduce((acc, modulo) => {
      acc[modulo.chave] = estado.expandidos?.[modulo.chave] ?? true;
      return acc;
    }, {});
    estado.original = original;
    estado.rascunho = { ...original };
    estado.alterado = false;
    perfilCarregado = perfilId;
  } catch (erro) {
    mensagem = erro.message || 'Erro ao carregar permissões do perfil.';
  } finally {
    carregando = false;
  }
}

function agendarRender() {
  if (renderPendente) return;
  renderPendente = true;
  window.requestAnimationFrame(() => {
    renderPendente = false;
    renderizarPermissoesV2();
  });
}

function statusTexto() {
  if (salvando) return 'Salvando alterações...';
  if (estado.alterado) return 'Há alterações não salvas.';
  return 'Nenhuma alteração pendente.';
}

function renderTabela(modulo) {
  return `
    <div class="admin-profile-permissions-v2-table-wrap">
      <table class="admin-profile-permissions-v2-table">
        <thead>
          <tr>
            <th>Recurso</th>
            ${modulo.acoes.map(acao => `<th>${escapeHtml(rotuloAcao(acao))}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${modulo.linhas.map(recurso => `
            <tr>
              <td><strong>${escapeHtml(recurso.rotulo_recurso || recurso.nome || recurso.chave)}</strong></td>
              ${modulo.acoes.map(acao => {
                if (!acoesDisponiveis(recurso).includes(acao)) return '<td class="admin-profile-permissions-v2-empty">-</td>';
                const chave = `${recurso.chave}:${acao}`;
                return `
                  <td>
                    <label class="admin-profile-permissions-v2-check">
                      <input type="checkbox" data-v2-action="toggle-permission" data-resource="${escapeAttr(recurso.chave)}" data-permission-action="${escapeAttr(acao)}" ${estado.rascunho[chave] ? 'checked' : ''} ${salvando ? 'disabled' : ''}>
                    </label>
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderModulo(modulo) {
  const aberto = estado.expandidos?.[modulo.chave] !== false;
  return `
    <article class="admin-profile-permissions-v2-card ${aberto ? 'is-open' : 'is-collapsed'}" data-module="${escapeAttr(modulo.chave)}">
      <div class="admin-profile-permissions-v2-module-head">
        <button class="admin-profile-permissions-v2-toggle" type="button" data-v2-action="toggle-module" data-module="${escapeAttr(modulo.chave)}" aria-expanded="${aberto ? 'true' : 'false'}">
          <span aria-hidden="true">${aberto ? '-' : '+'}</span>
          <strong>${escapeHtml(modulo.nome)}</strong>
        </button>
        <div class="admin-profile-permissions-v2-module-actions">
          <button class="filter-btn" type="button" data-v2-action="grant-module" data-module="${escapeAttr(modulo.chave)}" ${salvando ? 'disabled' : ''}>Conceder tudo</button>
          <button class="filter-btn" type="button" data-v2-action="remove-module" data-module="${escapeAttr(modulo.chave)}" ${salvando ? 'disabled' : ''}>Remover tudo</button>
        </div>
      </div>
      ${aberto ? renderTabela(modulo) : ''}
    </article>
  `;
}

function renderTela() {
  const perfil = perfilAtual();
  const nomePerfil = perfil.nome || perfil.slug || 'Perfil';
  const modulos = montarModulos();

  if (carregando) {
    return `
      <section class="admin-profile-permissions-v2" data-profile-permissions-v2="true">
        <div class="admin-profile-permissions-v2-head"><h4>Permissões do perfil</h4><p>Carregando permissões-base...</p></div>
        <div class="admin-profile-permissions-v2-body"><p class="quick-link-empty">Carregando permissões do perfil...</p></div>
      </section>
    `;
  }

  return `
    <section class="admin-profile-permissions-v2" data-profile-permissions-v2="true">
      <div class="admin-profile-permissions-v2-head">
        <h4>Permissões do perfil</h4>
        <p>Permissões-base aplicadas ao perfil ${escapeHtml(nomePerfil)}.</p>
      </div>

      <div class="admin-profile-permissions-v2-toolbar">
        <div class="admin-profile-permissions-v2-toolbar-group">
          <button class="filter-btn" type="button" data-v2-action="expand-all" ${salvando ? 'disabled' : ''}>Expandir todos</button>
          <button class="filter-btn" type="button" data-v2-action="collapse-all" ${salvando ? 'disabled' : ''}>Recolher todos</button>
        </div>
        <div class="admin-profile-permissions-v2-toolbar-group">
          <button class="filter-btn" type="button" data-v2-action="grant-all" ${salvando ? 'disabled' : ''}>Conceder tudo</button>
          <button class="filter-btn" type="button" data-v2-action="remove-all" ${salvando ? 'disabled' : ''}>Remover tudo</button>
        </div>
      </div>

      <div class="admin-profile-permissions-v2-body">
        ${mensagem ? `<p class="admin-profile-permissions-v2-message">${escapeHtml(mensagem)}</p>` : ''}
        ${modulos.length ? modulos.map(renderModulo).join('') : '<p class="quick-link-empty">Nenhum recurso disponível para permissões.</p>'}
      </div>

      <div class="admin-profile-permissions-v2-footer">
        <p class="admin-profile-permissions-v2-status">${escapeHtml(statusTexto())}</p>
        <div class="admin-profile-permissions-v2-footer-actions">
          <button class="secondary-btn" type="button" data-v2-action="back-profile" ${salvando ? 'disabled' : ''}>Voltar para perfil</button>
          <button class="save-btn" type="button" data-v2-action="save" ${salvando || !estado.alterado ? 'disabled' : ''}>${salvando ? 'Salvando...' : 'Salvar alterações'}</button>
        </div>
      </div>
    </section>
  `;
}

async function renderizarPermissoesV2() {
  injetarEstilos();
  if (!telaAtiva()) return;

  const tela = obterEstadoTelaPerfil();
  const card = obterCardDestino();
  if (!card) return;

  card.classList.add('is-profile-permissions-v2');
  card.classList.remove('is-profile-permissions-stable', 'is-profile-permissions-direct');

  if (perfilCarregado !== tela.id || !recursos.length) {
    if (!carregando) {
      await carregarPermissoes(tela.id);
    }
  }

  card.innerHTML = renderTela();
}

function setTodosModulos(expandir) {
  montarModulos().forEach(modulo => {
    estado.expandidos[modulo.chave] = Boolean(expandir);
  });
  agendarRender();
}

function aplicarModulo(chaveModulo, conceder) {
  const modulo = montarModulos().find(item => item.chave === chaveModulo);
  if (!modulo) return;

  const rascunho = { ...estado.rascunho };
  modulo.linhas.forEach(recurso => {
    acoesDisponiveis(recurso).forEach(acao => {
      const chave = `${recurso.chave}:${acao}`;
      if (conceder) rascunho[chave] = true;
      else delete rascunho[chave];
    });
  });

  estado.rascunho = rascunho;
  estado.alterado = temAlteracoes(estado.original, rascunho);
  agendarRender();
}

function aplicarTodos(conceder) {
  const rascunho = { ...estado.rascunho };
  montarModulos().forEach(modulo => {
    modulo.linhas.forEach(recurso => {
      acoesDisponiveis(recurso).forEach(acao => {
        const chave = `${recurso.chave}:${acao}`;
        if (conceder) rascunho[chave] = true;
        else delete rascunho[chave];
      });
    });
  });

  estado.rascunho = rascunho;
  estado.alterado = temAlteracoes(estado.original, rascunho);
  agendarRender();
}

function alternarPermissao(recursoChave, acao, marcado) {
  const chave = `${recursoChave}:${acao}`;
  const rascunho = { ...estado.rascunho };
  if (marcado) rascunho[chave] = true;
  else delete rascunho[chave];
  estado.rascunho = rascunho;
  estado.alterado = temAlteracoes(estado.original, rascunho);
  agendarRender();
}

async function salvarPermissoes() {
  if (!estado.perfilId || salvando) return;

  const chaves = new Set([...Object.keys(estado.original), ...Object.keys(estado.rascunho)]);
  const alteracoes = Array.from(chaves)
    .map(chave => {
      const [recurso_chave, acao] = chave.split(':');
      return {
        recurso_chave,
        acao,
        anterior: Boolean(estado.original[chave]),
        proximo: Boolean(estado.rascunho[chave])
      };
    })
    .filter(item => item.anterior !== item.proximo);

  if (!alteracoes.length) {
    estado.alterado = false;
    mensagem = 'Nenhuma alteração pendente.';
    agendarRender();
    return;
  }

  try {
    salvando = true;
    mensagem = '';
    agendarRender();

    const response = await chamarApi('saveAdminProfilePermissionsBatch', {
      perfil_id: estado.perfilId,
      alteracoes: alteracoes.map(item => ({
        recurso_chave: item.recurso_chave,
        acao: item.acao,
        permitido: item.proximo
      }))
    });

    if (!response.ok) throw new Error(response.message || 'Não foi possível salvar permissões do perfil.');

    perfilCarregado = '';
    await carregarPermissoes(estado.perfilId);
    mensagem = 'Permissões do perfil atualizadas.';
  } catch (erro) {
    mensagem = erro.message || 'Erro ao salvar permissões do perfil.';
  } finally {
    salvando = false;
    agendarRender();
  }
}

function voltarParaPerfil() {
  if (estado.alterado && !window.confirm('Existem alterações não salvas. Deseja voltar mesmo assim?')) return;
  const perfilId = estado.perfilId || obterEstadoTelaPerfil().id;
  mensagem = '';
  if (typeof window.abrirTelaEditarPerfilAdmin === 'function') {
    window.abrirTelaEditarPerfilAdmin(perfilId);
  }
}

function executarAcao(botao) {
  const acao = botao.dataset.v2Action || '';
  const modulo = botao.dataset.module || '';

  if (acao === 'toggle-module') {
    estado.expandidos[modulo] = !(estado.expandidos?.[modulo] !== false);
    agendarRender();
  } else if (acao === 'expand-all') {
    setTodosModulos(true);
  } else if (acao === 'collapse-all') {
    setTodosModulos(false);
  } else if (acao === 'grant-module') {
    aplicarModulo(modulo, true);
  } else if (acao === 'remove-module') {
    aplicarModulo(modulo, false);
  } else if (acao === 'grant-all') {
    aplicarTodos(true);
  } else if (acao === 'remove-all') {
    aplicarTodos(false);
  } else if (acao === 'save') {
    salvarPermissoes();
  } else if (acao === 'back-profile') {
    voltarParaPerfil();
  }
}

function deveIgnorarDuplicado(chave) {
  const agora = Date.now();
  if (ultimoAcionamento.chave === chave && agora - ultimoAcionamento.tempo < 350) return true;
  ultimoAcionamento = { chave, tempo: agora };
  return false;
}

function tratarEventoBotao(event) {
  if (!telaAtiva()) return;
  const escopo = event.target?.closest?.('.admin-profile-permissions-v2');
  if (!escopo) return;

  const botao = event.target.closest('button[data-v2-action]');
  if (!botao || botao.disabled) return;

  const chave = `${botao.dataset.v2Action || ''}:${botao.dataset.module || ''}`;
  if (deveIgnorarDuplicado(chave)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  executarAcao(botao);
}

function tratarChange(event) {
  if (!telaAtiva()) return;
  const escopo = event.target?.closest?.('.admin-profile-permissions-v2');
  if (!escopo) return;

  const input = event.target;
  if (input?.dataset?.v2Action !== 'toggle-permission') return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  alternarPermissao(input.dataset.resource || '', input.dataset.permissionAction || '', input.checked);
}

function agendarRenderizacaoV2() {
  APPLY_DELAYS.forEach(delay => window.setTimeout(renderizarPermissoesV2, delay));
}

function iniciar() {
  injetarEstilos();
  agendarRenderizacaoV2();
}

document.addEventListener('pointerdown', tratarEventoBotao, true);
document.addEventListener('click', tratarEventoBotao, true);
document.addEventListener('change', tratarChange, true);
window.addEventListener('hubAdminPerfilTelaAtualizada', agendarRenderizacaoV2);
window.addEventListener('hubAdminPerfilTelaRenderSolicitado', agendarRenderizacaoV2);
window.addEventListener('load', iniciar);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
