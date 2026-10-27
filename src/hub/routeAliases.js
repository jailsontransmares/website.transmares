import { HUB_ROUTE_ALIASES, obterBaseHub, normalizarRotaHub } from './routeConfig.js';

function montarUrlAliasRotaHub(pathname = window.location.pathname || '/') {
  const [caminho = ''] = String(pathname || '/').split('#');
  const base = obterBaseHub(caminho);
  const rota = normalizarRotaHub(caminho);
  const destino = HUB_ROUTE_ALIASES[rota];

  if (!destino) {
    return '';
  }

  const [pathDestino, hashDestino = ''] = destino.split('#');
  const prefixo = base ? `${base}/` : '/';

  return `${prefixo}${pathDestino}${hashDestino ? `#${hashDestino}` : ''}`;
}

function aplicarAliasDeRotaHub() {
  const proximaUrl = montarUrlAliasRotaHub();

  if (!proximaUrl) {
    return;
  }

  window.history.replaceState({}, '', proximaUrl);
}

window.montarUrlAliasRotaHub = montarUrlAliasRotaHub;

aplicarAliasDeRotaHub();
