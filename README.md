# Transmares Seguros — Site Estático

Primeira versão de migração do site da Transmares Seguros para HTML/CSS/JS.

## Estrutura

- `index.html`: página inicial
- `blog.html`: listagem do blog
- `contato.html`: contato
- `servicos/`: páginas individuais de serviços
- `artigos/`: páginas individuais do blog
- `assets/css/styles.css`: estilos globais
- `assets/js/main.js`: interações básicas

## Deploy recomendado

1. Criar repositório no GitHub.
2. Subir estes arquivos.
3. Conectar o repositório ao Netlify Free.
4. Publicar primeiro no domínio temporário do Netlify.
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
