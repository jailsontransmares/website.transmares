import { chamarApi } from './api.js';

const STYLE_ID = 'admin-user-permissions-v2-style';
const BOOT_DELAYS = [0, 80, 180, 360, 700];

window.hubAdminUserPermissionsV2Ativa = true;

let recursos = [];
let usuarios = [];
let perfis = [];
let permissoesPerfil = [];
let usuarioCarregado = '';
let carregando = false;
let salvando = false;
let mensagem = '';
let renderPendente = false;
let ultimoAcionamento = { chave: '', tempo: 0 };

const estado = {
  usuarioId: '',
  usuario: {},
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

function obterEstadoTelaUsuario() {
  if (typeof window.hubObterEstadoUsuarioTelaAdmin !== 'function') {
    return { modo: '', id: '', etapa: 'dados' };
  }

  return window.hubObterEstadoUsuarioTelaAdmin() || { modo: '', id: '', etapa: 'dados' };
}

function telaAtiva() {
  const atual = obterEstadoTelaUsuario();
  return atual.modo === 'editar' && atual.etapa === 'permissoes' && Boolean(atual.id);
}

function obterCardDestino() {
  const shell = document.querySelector('.admin-user-direct-shell');
  return shell?.querySelector('.admin-user-direct-card') || null;
}

function injetarEstilos() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-user-direct-card.is-user-permissions-v2 {
      padding: 0 !important;
      overflow: visible !important;
      min-height: 0 !important;
    }

    .admin-user-permissions-v2 {
      display: grid;
      grid-template-rows: auto auto minmax(0, auto) auto;
      min-height: 0;
      color: var(--text-strong, #0f172a);
    }

    .admin-user-permissions-v2-head,
    .admin-user-permissions-v2-toolbar,
    .admin-user-permissions-v2-footer {
      padding: 16px 20px;
      background: rgba(248, 250, 252, 0.86);
      border-color: rgba(148, 163, 184, 0.18);
    }

    body.dark .admin-user-permissions-v2-head,
    body.dark .admin-user-permissions-v2-toolbar,
    body.dark .admin-user-permissions-v2-footer {
      background: rgba(15, 23, 42, 0.78);
      border-color: rgba(148, 163, 184, 0.16);
    }

    .admin-user-permissions-v2-head { border-bottom: 1px solid rgba(148, 163, 184, 0.18); }
    .admin-user-permissions-v2-toolbar { border-bottom: 1px solid rgba(148, 163, 184, 0.14); }
    .admin-user-permissions-v2-footer {
      border-top: 1px solid rgba(148, 163, 184, 0.18);
      position: sticky;
      bottom: 0;
      z-index: 30;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }

    .admin-user-permissions-v2-head h4 { margin: 0; font-size: 1.06rem; font-weight: 850; letter-spacing: -0.025em; }
    .admin-user-permissions-v2-head p,
    .admin-user-permissions-v2-status { margin: 5px 0 0; color: var(--text-muted, #64748b); font-size: 0.84rem; }

    .admin-user-permissions-v2-toolbar,
    .admin-user-permissions-v2-toolbar-group,
    .admin-user-permissions-v2-footer,
    .admin-user-permissions-v2-footer-actions,
    .admin-user-permissions-v2-module-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }

    .admin-user-permissions-v2-toolbar,
    .admin-user-permissions-v2-footer { justify-content: space-between; }

    .admin-user-permissions-v2-body {
      display: grid;
      align-content: start;
      gap: 14px;
      padding: 16px 20px 24px;
      min-height: 0;
      max-height: none;
      overflow: visible;
    }

    .admin-user-permissions-v2-card {
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.76);
      overflow: hidden;
    }

    body.dark .admin-user-permissions-v2-card { background: rgba(15, 23, 42, 0.42); border-color: rgba(148, 163, 184, 0.16); }

    .admin-user-permissions-v2-module-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 58px;
      padding: 12px 14px;
      background: rgba(248, 250, 252, 0.78);
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
    }

    body.dark .admin-user-permissions-v2-module-head { background: rgba(30, 41, 59, 0.48); }

    .admin-user-permissions-v2-toggle {
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

    .admin-user-permissions-v2-toggle span {
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

    .admin-user-permissions-v2-table-wrap { width: 100%; max-width: 100%; overflow-x: auto; overflow-y: visible; }
    .admin-user-permissions-v2-card.is-collapsed .admin-user-permissions-v2-table-wrap { display: none; }

    .admin-user-permissions-v2-table {
      width: max-content;
      min-width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .admin-user-permissions-v2-table th,
    .admin-user-permissions-v2-table td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      text-align: center;
      vertical-align: middle;
      white-space: nowrap;
      font-size: 0.82rem;
    }

    .admin-user-permissions-v2-table th:first-child,
    .admin-user-permissions-v2-table td:first-child {
      position: sticky;
      left: 0;
      z-index: 2;
      text-align: left;
      min-width: 260px;
      max-width: 380px;
      white-space: normal;
      background: rgba(248, 250, 252, 0.98);
    }

    body.dark .admin-user-permissions-v2-table th:first-child,
    body.dark .admin-user-permissions-v2-table td:first-child { background: rgba(15, 23, 42, 0.98); }

    .admin-user-permissions-v2-table th { color: var(--text-muted, #64748b); font-weight: 800; background: rgba(248, 250, 252, 0.84); }
    .admin-user-permissions-v2-empty { color: var(--text-muted, #94a3b8); }
    .admin-user-permissions-v2-check { display: grid; justify-items: center; gap: 4px; }
    .admin-user-permissions-v2-check input { width: 18px; height: 18px; accent-color: var(--cor-principal, #294895); cursor: pointer; }
    .admin-user-permissions-v2-effect { font-size: 0.68rem; color: var(--text-muted, #64748b); }
    .admin-user-permissions-v2-effect.is-allow { color: #15803d; }
    .admin-user-permissions-v2-effect.is-deny { color: #b91c1c; }
    .admin-user-permissions-v2-message { margin: 0; padding: 10px 12px; border-radius: 14px; background: rgba(41, 72, 149, 0.08); color: var(--text-strong, #0f172a); font-size: 0.84rem; }

    @media (max-width: 760px) {
      .admin-user-permissions-v2-toolbar,
      .admin-user-permissions-v2-footer { align-items: stretch; flex-direction: column; }
      .admin-user-permissions-v2-toolbar-group,
      .admin-user-permissions-v2-footer-actions,
      .admin-user-permissions-v2 .filter-btn,
      .admin-user-permissions-v2 .secondary-btn,
      .admin-user-permissions-v2 .save-btn { width: 100%; }
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

function ordemAcao(acao) {
  const ordem = { view: 1, view_secret: 2, create: 3, update: 4, delete: 5, execute: 6, importar: 7, excluir_importacao: 8, emitir_recibo: 9, cancelar_recibo: 10, manage_permissions: 11, block: 12 };
  return ordem[acao] || 999;
}

function construirModulos() {
  const porChave = new Map((recursos || []).map(recurso => [recurso.chave, recurso]));
  const modulosRaiz = (recursos || [])
    .filter(recurso => recurso.tipo === 'modulo')
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

  function moduloRaiz(recurso) {
    let atual = recurso;
    while (atual?.recurso_pai) {
      const pai = porChave.get(atual.recurso_pai);
      if (!pai) break;
      if (pai.tipo === 'modulo') return pai;
      atual = pai;
    }
    return recurso?.tipo === 'modulo' ? recurso : null;
  }

  function rotuloRecurso(recurso) {
    const partes = [];
    let atual = recurso;
    while (atual) {
      partes.unshift(atual.nome || atual.chave);
      if (!atual.recurso_pai) break;
      atual = porChave.get(atual.recurso_pai);
    }
    if (partes.length > 1) partes.shift();
    return partes.join(' / ') || recurso.nome || recurso.chave;
  }

  return modulosRaiz.map(modulo => {
    const relacionados = (recursos || [])
      .filter(recurso => {
        if (!recurso?.chave) return false;
        if (recurso.chave === modulo.chave) return true;
        return moduloRaiz(recurso)?.chave === modulo.chave;
      })
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

    const funcionais = relacionados.filter(recurso => recurso.chave !== modulo.chave);
    const linhas = (funcionais.length ? funcionais : [modulo]).map(recurso => ({
      ...recurso,
      modulo_chave: modulo.chave,
      modulo_nome: modulo.nome || modulo.chave,
      rotulo_recurso: rotuloRecurso(recurso)
    }));

    const acoes = Array.from(new Set(linhas.flatMap(recurso => acoesDisponiveis(recurso))))
      .sort((a, b) => ordemAcao(a) - ordemAcao(b));

    return {
      chave: modulo.chave,
      nome: modulo.nome || modulo.chave,
      linhas,
      acoes
    };
  });
}

function mapearPermissoesUsuario(lista) {
  return (lista || []).reduce((acc, item) => {
    acc[`${item.recurso_chave}:${item.acao}`] = item.efeito || '';
    return acc;
  }, {});
}

function mapearPermissoesPerfil(perfilId) {
  return (permissoesPerfil || []).reduce((acc, item) => {
    if (item.perfil_id === perfilId && item.permitido !== false) {
      acc[`${item.recurso_chave}:${item.acao}`] = true;
    }
    return acc;
  }, {});
}

function obterPerfilUsuario() {
  const perfilId = estado.usuario?.perfil_id || '';
  return perfis.find(perfil => perfil.id === perfilId) || {};
}

function temAlteracoes(original, rascunho) {
  const chaves = new Set([...Object.keys(original || {}), ...Object.keys(rascunho || {})]);
  return Array.from(chaves).some(chave => (original[chave] || '') !== (rascunho[chave] || ''));
}

function permissaoHerdada(chave) {
  const perfilId = estado.usuario?.perfil_id || '';
  const herdadas = mapearPermissoesPerfil(perfilId);
  return Boolean(herdadas[chave]);
}

function efeitoFinal(chave) {
  const efeito = estado.rascunho[chave] || '';
  if (efeito === 'permitir') return true;
  if (efeito === 'negar') return false;
  return permissaoHerdada(chave);
}

function rotuloEfeito(chave) {
  const efeito = estado.rascunho[chave] || '';
  if (efeito === 'permitir') return ['Permitido', 'is-allow'];
  if (efeito === 'negar') return ['Bloqueado', 'is-deny'];
  return [permissaoHerdada(chave) ? 'Herdado' : 'Padrão', ''];
}

async function carregarPermissoes(usuarioId, forcar = false) {
  if (!usuarioId || carregando) return;
  if (!forcar && usuarioCarregado === usuarioId && recursos.length) return;

  try {
    carregando = true;
    mensagem = '';
    renderizarPermissoesV2();

    const [usuariosResponse, permissoesUsuarioResponse, permissoesAdminResponse] = await Promise.all([
      chamarApi('listAdminUsers'),
      chamarApi('listAdminUserPermissions', { usuario_id: usuarioId }),
      chamarApi('listAdminPermissions')
    ]);

    if (!usuariosResponse.ok) throw new Error(usuariosResponse.message || 'Não foi possível carregar usuários.');
    if (!permissoesUsuarioResponse.ok) throw new Error(permissoesUsuarioResponse.message || 'Não foi possível carregar permissões individuais.');
    if (!permissoesAdminResponse.ok) throw new Error(permissoesAdminResponse.message || 'Não foi possível carregar permissões-base.');

    usuarios = usuariosResponse.data?.records || [];
    recursos = permissoesUsuarioResponse.data?.recursos || permissoesAdminResponse.data?.recursos || [];
    perfis = permissoesAdminResponse.data?.perfis || [];
    permissoesPerfil = permissoesAdminResponse.data?.permissoes || [];

    const usuario = permissoesUsuarioResponse.data?.usuario
      || usuarios.find(item => item.id === usuarioId)
      || {};
    const original = mapearPermissoesUsuario(permissoesUsuarioResponse.data?.permissoes || []);
    const modulos = construirModulos();

    estado.usuarioId = usuarioId;
    estado.usuario = usuario;
    estado.expandidos = modulos.reduce((acc, modulo) => {
      acc[modulo.chave] = estado.expandidos?.[modulo.chave] ?? true;
      return acc;
    }, {});
    estado.original = original;
    estado.rascunho = { ...original };
    estado.alterado = false;
    usuarioCarregado = usuarioId;
  } catch (erro) {
    mensagem = erro.message || 'Erro ao carregar permissões do usuário.';
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

function textoStatus() {
  if (salvando) return 'Salvando alterações...';
  if (estado.alterado) return 'Há alterações não salvas.';
  return 'Nenhuma alteração pendente.';
}

function renderTabela(modulo) {
  return `
    <div class="admin-user-permissions-v2-table-wrap">
      <table class="admin-user-permissions-v2-table">
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
                if (!acoesDisponiveis(recurso).includes(acao)) return '<td class="admin-user-permissions-v2-empty">-</td>';
                const chave = `${recurso.chave}:${acao}`;
                const [rotulo, classe] = rotuloEfeito(chave);
                return `
                  <td>
                    <label class="admin-user-permissions-v2-check">
                      <input type="checkbox" data-user-v2-action="toggle-permission" data-resource="${escapeAttr(recurso.chave)}" data-permission-action="${escapeAttr(acao)}" ${efeitoFinal(chave) ? 'checked' : ''} ${salvando ? 'disabled' : ''}>
                      <small class="admin-user-permissions-v2-effect ${classe}">${escapeHtml(rotulo)}</small>
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
    <article class="admin-user-permissions-v2-card ${aberto ? 'is-open' : 'is-collapsed'}" data-module="${escapeAttr(modulo.chave)}">
      <div class="admin-user-permissions-v2-module-head">
        <button class="admin-user-permissions-v2-toggle" type="button" data-user-v2-action="toggle-module" data-module="${escapeAttr(modulo.chave)}" aria-expanded="${aberto ? 'true' : 'false'}">
          <span aria-hidden="true">${aberto ? '-' : '+'}</span>
          <strong>${escapeHtml(modulo.nome)}</strong>
        </button>
        <div class="admin-user-permissions-v2-module-actions">
          <button class="filter-btn" type="button" data-user-v2-action="allow-module" data-module="${escapeAttr(modulo.chave)}" ${salvando ? 'disabled' : ''}>Conceder tudo</button>
          <button class="filter-btn" type="button" data-user-v2-action="deny-module" data-module="${escapeAttr(modulo.chave)}" ${salvando ? 'disabled' : ''}>Bloquear tudo</button>
          <button class="filter-btn" type="button" data-user-v2-action="reset-module" data-module="${escapeAttr(modulo.chave)}" ${salvando ? 'disabled' : ''}>Restaurar padrão</button>
        </div>
      </div>
      ${aberto ? renderTabela(modulo) : ''}
    </article>
  `;
}

function renderTela() {
  const nomeUsuario = estado.usuario?.nome || estado.usuario?.email || 'Usuário';
  const perfil = obterPerfilUsuario();
  const nomePerfil = perfil.nome || perfil.slug || 'perfil vinculado';
  const modulos = construirModulos();

  if (carregando) {
    return `
      <section class="admin-user-permissions-v2" data-user-permissions-v2="true">
        <div class="admin-user-permissions-v2-head"><h4>Permissões adicionais</h4><p>Carregando permissões do usuário...</p></div>
        <div class="admin-user-permissions-v2-body"><p class="quick-link-empty">Carregando permissões adicionais...</p></div>
      </section>
    `;
  }

  return `
    <section class="admin-user-permissions-v2" data-user-permissions-v2="true">
      <div class="admin-user-permissions-v2-head">
        <h4>Permissões adicionais</h4>
        <p>Permissões específicas de ${escapeHtml(nomeUsuario)}. O padrão herdado vem do perfil ${escapeHtml(nomePerfil)}.</p>
      </div>

      <div class="admin-user-permissions-v2-toolbar">
        <div class="admin-user-permissions-v2-toolbar-group">
          <button class="filter-btn" type="button" data-user-v2-action="expand-all" ${salvando ? 'disabled' : ''}>Expandir todos</button>
          <button class="filter-btn" type="button" data-user-v2-action="collapse-all" ${salvando ? 'disabled' : ''}>Recolher todos</button>
        </div>
        <div class="admin-user-permissions-v2-toolbar-group">
          <button class="filter-btn" type="button" data-user-v2-action="allow-all" ${salvando ? 'disabled' : ''}>Conceder tudo</button>
          <button class="filter-btn" type="button" data-user-v2-action="deny-all" ${salvando ? 'disabled' : ''}>Bloquear tudo</button>
          <button class="filter-btn" type="button" data-user-v2-action="reset-all" ${salvando ? 'disabled' : ''}>Restaurar padrão</button>
        </div>
      </div>

      <div class="admin-user-permissions-v2-body">
        ${mensagem ? `<p class="admin-user-permissions-v2-message">${escapeHtml(mensagem)}</p>` : ''}
        ${modulos.length ? modulos.map(renderModulo).join('') : '<p class="quick-link-empty">Nenhum recurso disponível para permissões.</p>'}
      </div>

      <div class="admin-user-permissions-v2-footer">
        <p class="admin-user-permissions-v2-status">${escapeHtml(textoStatus())}</p>
        <div class="admin-user-permissions-v2-footer-actions">
          <button class="secondary-btn" type="button" data-user-v2-action="back-user" ${salvando ? 'disabled' : ''}>Voltar para usuário</button>
          <button class="save-btn" type="button" data-user-v2-action="save" ${salvando || !estado.alterado ? 'disabled' : ''}>${salvando ? 'Salvando...' : 'Salvar alterações'}</button>
        </div>
      </div>
    </section>
  `;
}

async function renderizarPermissoesV2() {
  injetarEstilos();
  if (!telaAtiva()) return;

  const tela = obterEstadoTelaUsuario();
  const card = obterCardDestino();
  if (!card) return;

  card.classList.add('is-user-permissions-v2');
  card.innerHTML = renderTela();

  if (usuarioCarregado !== tela.id || !recursos.length) {
    if (!carregando) {
      await carregarPermissoes(tela.id);
      card.innerHTML = renderTela();
    }
  }
}

function setTodosModulos(expandir) {
  construirModulos().forEach(modulo => {
    estado.expandidos[modulo.chave] = Boolean(expandir);
  });
  agendarRender();
}

function aplicarModulo(chaveModulo, efeito) {
  const modulo = construirModulos().find(item => item.chave === chaveModulo);
  if (!modulo) return;

  const rascunho = { ...estado.rascunho };
  modulo.linhas.forEach(recurso => {
    acoesDisponiveis(recurso).forEach(acao => {
      const chave = `${recurso.chave}:${acao}`;
      if (efeito) rascunho[chave] = efeito;
      else delete rascunho[chave];
    });
  });

  estado.rascunho = rascunho;
  estado.alterado = temAlteracoes(estado.original, rascunho);
  agendarRender();
}

function aplicarTodos(efeito) {
  const rascunho = { ...estado.rascunho };
  construirModulos().forEach(modulo => {
    modulo.linhas.forEach(recurso => {
      acoesDisponiveis(recurso).forEach(acao => {
        const chave = `${recurso.chave}:${acao}`;
        if (efeito) rascunho[chave] = efeito;
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
  const herdado = permissaoHerdada(chave);
  const rascunho = { ...estado.rascunho };

  if (marcado === herdado) {
    delete rascunho[chave];
  } else {
    rascunho[chave] = marcado ? 'permitir' : 'negar';
  }

  estado.rascunho = rascunho;
  estado.alterado = temAlteracoes(estado.original, rascunho);
  agendarRender();
}

async function salvarPermissoes() {
  if (!estado.usuarioId || salvando) return;

  const chaves = new Set([...Object.keys(estado.original), ...Object.keys(estado.rascunho)]);
  const alteracoes = Array.from(chaves)
    .map(chave => {
      const [recurso_chave, acao] = chave.split(':');
      return {
        recurso_chave,
        acao,
        anterior: estado.original[chave] || '',
        proximo: estado.rascunho[chave] || ''
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

    const response = await chamarApi('saveAdminUserPermissionsBatch', {
      usuario_id: estado.usuarioId,
      alteracoes: alteracoes.map(item => ({
        recurso_chave: item.recurso_chave,
        acao: item.acao,
        efeito: item.proximo
      }))
    });

    if (!response.ok) throw new Error(response.message || 'Não foi possível salvar as permissões adicionais.');

    await carregarPermissoes(estado.usuarioId, true);
    mensagem = 'Permissões adicionais atualizadas.';
  } catch (erro) {
    mensagem = erro.message || 'Erro ao salvar permissões adicionais.';
  } finally {
    salvando = false;
    agendarRender();
  }
}

function voltarParaUsuario() {
  if (estado.alterado && !window.confirm('Existem alterações não salvas. Deseja voltar mesmo assim?')) return;

  const usuarioId = estado.usuarioId || obterEstadoTelaUsuario().id;
  mensagem = '';
  if (typeof window.abrirTelaEditarUsuarioAdmin === 'function') {
    window.abrirTelaEditarUsuarioAdmin(usuarioId);
  }
}

function ignorarDuploClique(chave) {
  const agora = Date.now();
  if (ultimoAcionamento.chave === chave && agora - ultimoAcionamento.tempo < 220) return true;
  ultimoAcionamento = { chave, tempo: agora };
  return false;
}

function manipularClick(event) {
  const escopo = event.target?.closest?.('.admin-user-permissions-v2');
  if (!escopo || !telaAtiva()) return;

  const controle = event.target.closest('button[data-user-v2-action]');
  if (!controle || controle.disabled) return;

  const acao = controle.dataset.userV2Action;
  const chaveModulo = controle.dataset.module || '';
  const chaveClick = `${acao}:${chaveModulo}`;
  if (ignorarDuploClique(chaveClick)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  if (acao === 'toggle-module') {
    estado.expandidos[chaveModulo] = !(estado.expandidos?.[chaveModulo] !== false);
    agendarRender();
  } else if (acao === 'expand-all') {
    setTodosModulos(true);
  } else if (acao === 'collapse-all') {
    setTodosModulos(false);
  } else if (acao === 'allow-module') {
    aplicarModulo(chaveModulo, 'permitir');
  } else if (acao === 'deny-module') {
    aplicarModulo(chaveModulo, 'negar');
  } else if (acao === 'reset-module') {
    aplicarModulo(chaveModulo, '');
  } else if (acao === 'allow-all') {
    aplicarTodos('permitir');
  } else if (acao === 'deny-all') {
    aplicarTodos('negar');
  } else if (acao === 'reset-all') {
    aplicarTodos('');
  } else if (acao === 'save') {
    salvarPermissoes();
  } else if (acao === 'back-user') {
    voltarParaUsuario();
  }
}

function manipularChange(event) {
  const escopo = event.target?.closest?.('.admin-user-permissions-v2');
  if (!escopo || !telaAtiva()) return;

  const input = event.target;
  if (input?.dataset?.userV2Action !== 'toggle-permission') return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  alternarPermissao(input.dataset.resource || '', input.dataset.permissionAction || '', input.checked);
}

function removerModaisLegadosUsuario() {
  document.querySelectorAll('.admin-user-modal.is-permissions-stage, .modal-backdrop').forEach(elemento => {
    if (elemento.querySelector?.('.admin-user-modal.is-permissions-stage') || elemento.classList?.contains('is-permissions-stage')) {
      elemento.remove();
    }
  });
  document.body.classList.remove('modal-open', 'no-scroll', 'is-modal-open');
}

function agendarBoot() {
  BOOT_DELAYS.forEach(delay => {
    window.setTimeout(() => {
      renderizarPermissoesV2();
      if (telaAtiva()) removerModaisLegadosUsuario();
    }, delay);
  });
}

function iniciar() {
  injetarEstilos();
  agendarBoot();
}

document.addEventListener('click', manipularClick, true);
document.addEventListener('change', manipularChange, true);
window.addEventListener('hubAdminUsuarioTelaAtualizada', agendarBoot);
window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', agendarBoot);
window.addEventListener('load', iniciar);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
