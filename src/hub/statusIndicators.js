import { obterRotuloStatusHub } from './statusLabels.js';

function escaparAtributo(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizarClasseStatus(status) {
  return String(status || 'pendente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-') || 'pendente';
}

export function renderHubStatusDot(status, descricao = 'do registro') {
  const rotulo = obterRotuloStatusHub(status, 'Pendente');
  const statusClasse = normalizarClasseStatus(status);
  const nomeAcessivel = `Status ${descricao}: ${rotulo}`;

  return `<span class="hub-status-dot status-${escaparAtributo(statusClasse)}" role="img" title="${escaparAtributo(nomeAcessivel)}" aria-label="${escaparAtributo(nomeAcessivel)}"></span>`;
}

export function renderHubStatusLegend(itens, descricao = 'Legenda de status') {
  return `
    <footer class="hub-status-legend" aria-label="${escaparAtributo(descricao)}">
      ${itens.map(({ status, rotulo }) => `
        <span class="hub-status-legend-item">
          <span class="hub-status-dot status-${escaparAtributo(normalizarClasseStatus(status))}" aria-hidden="true"></span>
          <span>${escaparAtributo(rotulo || obterRotuloStatusHub(status))}</span>
        </span>
      `).join('')}
    </footer>
  `;
}
