# Transmares Seguros — Site Estático

Primeira versão de migração do site da Transmares Seguros para HTML/CSS/JS.

## Estrutura

- `index.html`: página inicial
- `blog.html`: listagem do blog
- `contato.html`: contato
- `servicos/`: páginas individuais de serviços
- `artigos/`: páginas individuais do blog
- `src/site/styles.css`: estilos globais do site institucional
- `src/site/main.js`: interações básicas do site institucional
- `src/hub/style.css`: estilos do Hub/Painel
- `src/hub/app.js`: aplicação principal do Hub/Painel

## Deploy recomendado — Site institucional

1. Criar repositório no GitHub.
2. Subir estes arquivos.
3. Conectar o repositório ao serviço de hospedagem estática escolhido.
4. Publicar primeiro em domínio temporário.
5. Validar páginas e links.
6. Só depois apontar o DNS do domínio oficial.

## Observações

- Esta versão é estática e não possui backend.
- Os CTAs externos foram preservados:
  - Cotação Online: https://transmares.aggilizador.com.br
  - Certificados Digitais: https://loja.certisign.com.br
  - SAC/Assistência: https://beacons.ai
- Os 5 artigos do blog foram migrados em versão completa/editada a partir do conteúdo público atual. Recomenda-se revisar juridicamente/SEO antes da publicação final, especialmente os artigos antigos de 2021.

## Atualização de artigos — Fase 7.1

Foram revisados e atualizados os dois artigos antigos de 2021:

- Certificado Digital por Videoconferência: como emitir com segurança
- Consórcio de Imóveis: como funciona e quando vale a pena

As URLs internas foram preservadas para não quebrar links/redirecionamentos.

## Fase 8.1 — Redesign visual/UX

Foram atualizados:
- Home com posicionamento mais consultivo e orientado à conversão.
- Menu principal mais enxuto com mega menu de soluções por perfil.
- Cards de soluções organizados por necessidade: Para Você, Para Empresas e Soluções Complementares.
- Faixa de confiança abaixo do hero.
- Seção "Como funciona" para explicar a jornada de atendimento.
- Blog renomeado visualmente como Central de Conteúdo.
- CSS global reestruturado com visual mais moderno, premium e responsivo.

## Fase 8.1.1 — Polimento visual

Foram refinados:
- Hero com bloco visual proprietário em vez de card abstrato.
- CTA secundário "Falar com especialista".
- Textos dos cards de soluções com foco em dor/uso do cliente.
- Separação visual entre grupos de soluções.
- Menu mobile mais enxuto, ocultando descrições longas.
- Favicon provisório em SVG.
- Ajustes de hover, hierarquia e escaneabilidade.

## Fase 8.2 — Páginas internas de serviços

Foram padronizadas as 10 páginas de serviços com:
- Hero específico do serviço.
- Bloco de resumo.
- Navegação lateral interna.
- Seções: Para quem é indicado, Benefícios/coberturas, Como a Transmares ajuda, FAQ e CTA final.
- Textos mais comerciais e escaneáveis.
- Layout responsivo para mobile.

## Fase 8.3 — Blog, artigos e contato

Foram refinados:
- Blog transformado em Central de Conteúdo com hero, artigo em destaque e cards.
- Página de contato com rotas claras: cotação, e-mail, SAC e assuntos principais.
- Artigos receberam CTA final mais alinhado ao conteúdo e à conversão.
- CSS responsivo para blog, contato e artigos.

## Hub — Subdomínio próprio

O Painel Operacional TRS continua no mesmo repositório, mas deve ser publicado como uma aplicação estática própria:

- `https://hub.transmares.com.br`

Build exclusivo do Hub:

- `npm run build:hub`
- diretório de publicação: `dist-hub`

Configuração recomendada no Render:

- Tipo: Static Site
- Build Command: `npm ci && npm run build:hub`
- Publish Directory: `dist-hub`
- Rewrite SPA: `/*` para `/index.html`

O build do Hub usa `vite.hub.config.js`, publica os assets de `public/hub` na raiz do serviço e mantém o painel funcionando tanto em `/hub/` quanto na raiz do subdomínio.


## Fase 9 — Vite + Supabase

Projeto migrado para Vite Vanilla na raiz do repositório.

- `npm run dev`: ambiente local.
- `npm run build`: build completo do site.
- `npm run build:site`: alias explícito do build completo do site.
- `npm run build:hub`: build exclusivo do Hub para `dist-hub`.
- `npm run preview`: prévia local do build.
- `src/hub/supabaseClient.js`: cliente Supabase via variáveis de ambiente.
- `src/hub/services/arService.js`: leitura de `produtos_ar`, `parceiros` e geração inicial de links AR.
- `src/hub/api.js`: camada de dados do Hub com Supabase e fallback temporário do Apps Script legado.
- `backup/fase-vite-supabase-original`: cópia dos arquivos antes desta fase.

Limpeza desta versão:

- Os arquivos duplicados antigos fora de `backup/` foram removidos.
- Assets públicos finais ficaram em `public/`.
- Código fonte editável ficou em `src/`.
- A pasta `backup/` foi preservada integralmente.

Configure as variáveis no serviço que publicar o Hub:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_LEGACY_APPS_SCRIPT_URL` temporariamente, enquanto os módulos antigos ainda não forem migrados.
