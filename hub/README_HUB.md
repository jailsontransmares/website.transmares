# Hub Transmares

Este diretório contém o HTML de entrada do Painel Operacional TRS. O código da aplicação fica em `src/hub`.

## Acesso

O Hub deve ser publicado como aplicação estática própria em:

- `https://hub.transmares.com.br`

Durante desenvolvimento local ou no build completo do site, ele também pode ser acessado pela pasta:

- `/hub/`

## Build exclusivo

O build dedicado do Hub é:

- `npm run build:hub`

Saída esperada:

- `dist-hub/index.html`
- `dist-hub/assets/`

No Render, configurar o Static Site com:

- Build Command: `npm ci && npm run build:hub`
- Publish Directory: `dist-hub`
- Rewrite SPA: `/*` para `/index.html`

## Observações

- O hub é uma aplicação estática em HTML/CSS/JS.
- A integração principal usa Supabase via variáveis de ambiente Vite.
- `VITE_LEGACY_APPS_SCRIPT_URL` deve ser mantida apenas enquanto houver módulos usando fallback legado.
- O Hub recebeu `noindex,nofollow` para reduzir risco de indexação em mecanismos de busca.
