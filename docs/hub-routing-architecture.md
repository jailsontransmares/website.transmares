# Arquitetura de rotas do HUB

## Objetivo

Manter uma convenção global, modular e evolutiva para URLs, navegação e telas do HUB sem quebrar rotas legadas nem acoplar cada módulo ao roteador principal.

## Contrato atual

- O contrato central fica em `src/hub/routeConfig.js`.
- `routeConfig.js` define a versão do esquema, a base opcional `/hub`, aliases, rotas especiais e o mapa de abas administrativas.
- `menuTree.js` é a fonte declarativa da navegação visível, permissões e status de cada item.
- `app.js` coordena renderização e delega a tela ao módulo; não deve concentrar novos mapas de URL.
- `routeAliases.js` só normaliza entradas legadas para a rota canônica.
- `adminRouteSync.js` traduz a rota administrativa para o estado interno da tela.

## Convenção de URLs

```text
/                                   Hub / início
/operacoes/<modulo>                 Módulos operacionais
/admin/<dominio>/<recurso>          Administração por domínio
/financeiro/<contexto>/<recurso>    Financeiro
/rh-dp/<contexto>/<recurso>         RH & DP
/perfil                             Página especial do usuário
/notificacoes                       Página especial de notificações
```

Itens-pai (`operacoes`, `admin` e seus domínios) são agrupadores de menu e não precisam de uma tela própria.

## Regras para novas rotas

1. Registrar a rota canônica no `routeConfig.js` quando houver regra de compatibilidade, estado especial ou conversão de segmento.
2. Registrar o item visual no `menuTree.js`, incluindo `permission`, `moduleId`, `status` e `legacyRoute` quando necessário.
3. Implementar o módulo em arquivo próprio, expondo uma entrada `abrir()` ou equivalente; o roteador não deve receber a lógica da tela.
4. Manter aliases por pelo menos um ciclo de migração e testar a URL canônica e a legada com e sem base `/hub`.
5. Evitar hash para páginas novas. Hash permanece apenas como compatibilidade com estados internos legados.

## Fases de evolução

### Fase 1 — fundação (aplicada)

- Consolidar regras duplicadas de base, aliases e rotas administrativas.
- Preservar `/painel-ar`, `/admin#<aba>`, `/admin/usuarios`, `/admin/perfis` e `/configuracoes/corretora`.
- Manter o menu declarativo como fonte da navegação.

### Fase 2 — módulos isolados

- Separar cada domínio em `src/hub/modules/<dominio>/` com página, estado, serviço e estilos locais.
- Manter `app.js` apenas como composição temporária enquanto os módulos são extraídos incrementalmente.
- Adicionar testes de contrato para aliases e permissões antes de remover qualquer fallback.

### Fase 3 — roteador formal

- Introduzir um registro de rotas com `id`, `path`, `module`, `loader`, `permission` e `legacyPaths`.
- Validar rotas declarativas no build para detectar duplicidade, módulo ausente e alias apontando para destino inválido.
- Remover aliases somente após telemetria/uso confirmado e comunicação de migração.

## Critérios de aceite

- A navegação do menu e os breadcrumbs usam a mesma rota canônica.
- Acesso direto, refresh e voltar/avançar do navegador funcionam em cada rota ativa.
- Rotas legadas continuam abrindo a tela correta durante a migração.
- Permissões continuam sendo aplicadas antes do carregamento do módulo.
- `npm run build:hub` conclui sem erro.
