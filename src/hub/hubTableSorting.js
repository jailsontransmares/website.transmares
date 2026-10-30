import { prepararPaginacaoTabelasGlobais } from './hubPagination.js';

const estadosOrdenacao = new WeakMap();
const ROTULOS_NAO_ORDENAVEIS = new Set(['acao', 'acoes', 'opcao', 'opcoes']);

function normalizarRotulo(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function cabecalhoPodeOrdenar(cabecalho) {
  if (cabecalho.querySelector('input, button, select, textarea, a, [role="button"]')) return false;
  return !ROTULOS_NAO_ORDENAVEIS.has(normalizarRotulo(cabecalho.textContent));
}

function prepararTabelasGlobais(raiz = document) {
  prepararPaginacaoTabelasGlobais(raiz);
  raiz.querySelectorAll?.('table.hub-data-table thead th').forEach((cabecalho) => {
    if (cabecalho.dataset.hubSortReady) return;
    cabecalho.dataset.hubSortReady = 'true';
    if (!cabecalhoPodeOrdenar(cabecalho)) return;

    cabecalho.dataset.hubSortable = 'true';
    cabecalho.tabIndex = 0;
    cabecalho.setAttribute('aria-sort', 'none');
    cabecalho.setAttribute('aria-label', `Ordenar por ${cabecalho.textContent.trim()}`);
  });
}

function dataOrdenacao(celula) {
  const texto = String(celula?.dataset.sortValue ?? celula?.textContent ?? '').trim();
  if (!texto) return { tipo: 'vazio', valor: '' };

  const data = texto.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (data) {
    const timestamp = Date.UTC(Number(data[3]), Number(data[2]) - 1, Number(data[1]));
    const valida = new Date(timestamp);
    if (valida.getUTCFullYear() === Number(data[3]) && valida.getUTCMonth() === Number(data[2]) - 1 && valida.getUTCDate() === Number(data[1])) {
      return { tipo: 'numero', valor: timestamp };
    }
  }

  const numero = texto.replace(/R\$|%|\s/g, '');
  if (/^[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+)?(?:,\d+|\.\d+)?$/.test(numero) && /\d/.test(numero)) {
    const normalizado = numero.includes(',')
      ? numero.replace(/\./g, '').replace(',', '.')
      : numero.includes('.') && /\.\d{3}$/.test(numero)
        ? numero.replace(/\./g, '')
        : numero;
    const valor = Number(normalizado);
    if (Number.isFinite(valor)) return { tipo: 'numero', valor };
  }

  return { tipo: 'texto', valor: texto };
}

function compararCelulas(a, b) {
  if (a.tipo === 'vazio' || b.tipo === 'vazio') {
    if (a.tipo === b.tipo) return 0;
    return a.tipo === 'vazio' ? 1 : -1;
  }
  if (a.tipo === 'numero' && b.tipo === 'numero') return a.valor - b.valor;
  return new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' }).compare(String(a.valor), String(b.valor));
}

function ordenarTabela(cabecalho) {
  const tabela = cabecalho.closest('table.hub-data-table');
  const corpo = tabela?.tBodies?.[0];
  const indice = cabecalho.cellIndex;
  if (!tabela || !corpo || indice < 0) return;

  const atual = estadosOrdenacao.get(tabela);
  const direcao = atual?.indice === indice && atual.direcao === 'ascending' ? 'descending' : 'ascending';
  const linhas = [...corpo.rows]
    .map((linha, ordemOriginal) => ({ linha, ordemOriginal, celula: linha.cells.length === 1 && linha.cells[0].colSpan > 1 ? null : linha.cells[indice] }))
    .filter(item => item.celula);
  const collatorDirection = direcao === 'ascending' ? 1 : -1;

  linhas.sort((linhaA, linhaB) => {
    const comparacao = compararCelulas(dataOrdenacao(linhaA.celula), dataOrdenacao(linhaB.celula));
    return comparacao ? comparacao * collatorDirection : linhaA.ordemOriginal - linhaB.ordemOriginal;
  });

  const fragmento = document.createDocumentFragment();
  linhas.forEach(({ linha }) => fragmento.appendChild(linha));
  corpo.appendChild(fragmento);

  tabela.querySelectorAll('thead th[data-hub-sortable="true"]').forEach((item) => {
    item.setAttribute('aria-sort', item === cabecalho ? direcao : 'none');
  });
  estadosOrdenacao.set(tabela, { indice, direcao });
  prepararPaginacaoTabelasGlobais(tabela);
}

document.addEventListener('click', (evento) => {
  const cabecalho = evento.target.closest?.('table.hub-data-table thead th[data-hub-sortable="true"]');
  if (cabecalho) ordenarTabela(cabecalho);
});

document.addEventListener('keydown', (evento) => {
  if (!['Enter', ' '].includes(evento.key)) return;
  const cabecalho = evento.target.closest?.('table.hub-data-table thead th[data-hub-sortable="true"]');
  if (!cabecalho) return;
  evento.preventDefault();
  ordenarTabela(cabecalho);
});

function iniciarOrdenacaoTabelasGlobais() {
  prepararTabelasGlobais();
  const observador = new MutationObserver((mutacoes) => {
    mutacoes.forEach((mutacao) => {
      mutacao.addedNodes.forEach((no) => {
        if (no.nodeType === Node.ELEMENT_NODE) prepararTabelasGlobais(no);
      });
    });
  });
  observador.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarOrdenacaoTabelasGlobais, { once: true });
} else {
  iniciarOrdenacaoTabelasGlobais();
}
