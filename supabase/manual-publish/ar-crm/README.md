# Publicação manual do CRM AR

## 1. Migration

Abra o SQL Editor do projeto Supabase e execute uma vez, nesta ordem:

1. `01-ar-crm-comment-links.sql`
2. `02-ar-crm-comment-interactions.sql`

## 2. Edge Function

No painel Supabase, abra Edge Functions, selecione `ar-crm` e substitua o código pelo conteúdo de `index.ts`.

Mantenha os secrets já existentes, especialmente `CLICKUP_API_TOKEN` e `CLICKUP_LIST_IDS`.

## 3. Validação

Abra um cadastro no CRM, clique em `Responder`, envie uma resposta e confirme:

- a resposta aparece abaixo do comentário original no HUB;
- no ClickUp ela aparece como comentário normal;
- a resposta permanece após recarregar a página.
- o botão de reação permite adicionar/remover emojis;
- ao digitar `@`, aparecem somente usuários ativos;
- a menção permanece destacada no HUB após recarregar.
