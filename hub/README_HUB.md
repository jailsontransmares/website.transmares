# Hub Transmares

Este diretório contém o Painel Operacional TRS migrado para dentro do mesmo projeto Netlify do site institucional.

## Acesso de teste

Enquanto o domínio oficial não estiver configurado:

- `/hub/` no domínio temporário do Netlify

Exemplo:

- `https://transmares.netlify.app/hub/`

## Acesso futuro

Após configurar DNS/domínio no Netlify:

- `https://hub.transmaresseguros.com.br`

## Observações

- O hub é uma aplicação estática em HTML/CSS/JS.
- A integração atual usa Google Apps Script via `config.js`.
- O código do Apps Script (`Code.gs`) não foi publicado aqui para evitar exposição desnecessária de backend.
- A pasta `.git`, scripts locais e arquivos de handoff não foram incluídos na versão pública.
- O hub recebeu `noindex,nofollow` para reduzir risco de indexação em mecanismos de busca.
