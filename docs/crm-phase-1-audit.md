# CRM AR — Auditoria da Fase 1

Data da auditoria: 2026-08-03

## Escopo confirmado

- A aba CRM está integrada ao Painel AR e usa o recurso `painel_ar.crm`.
- A leitura dos registros é feita pela Edge Function `ar-crm`; o navegador não acessa o ClickUp diretamente.
- O cadastro nativo usa o mesmo formulário do Hub e reaproveita produtos do módulo AR e opções de campos do ClickUp.
- A criação grava o item local e a pendência de sincronização em uma operação atômica.
- O worker `clickup-sync-worker` processa a outbox, cria ou atualiza a tarefa no ClickUp e registra tentativas e erros.
- As tabelas de CRM e a outbox possuem RLS; a outbox não é exposta para `anon` ou `authenticated`.

## Contrato funcional

### Permissões

- `painel_ar.crm:view`: visualizar lista, detalhes e atividade.
- `painel_ar.crm:execute`: criar, editar, sincronizar e interagir com registros.

### Fluxo de criação

1. Usuário autorizado abre “Novo cliente”.
2. O formulário carrega produtos e opções válidas.
3. A Edge Function valida a sessão, permissão, integração, produto e campos de lista.
4. A função `ar_crm_enqueue_create` grava `ar_crm_items` e `ar_crm_sync_outbox` juntos.
5. O worker cria a tarefa no ClickUp e grava o `ar_crm_clickup_mapping`.
6. Falhas ficam disponíveis para retry, com status e log de integração.

## Pendências identificadas

- Confirmar no projeto remoto se as migrations de criação nativa foram aplicadas.
- Publicar ou atualizar as Edge Functions `ar-crm` e `clickup-sync-worker`.
- Confirmar os secrets `CLICKUP_API_TOKEN` e `CLICKUP_LIST_IDS` no ambiente da Function.
- Executar homologação autenticada com perfis que tenham `view` e `execute`.
- Corrigir ou substituir o runtime local de `npm/npx` antes da validação de build e deploy.

## Critério de saída da Fase 1

O contrato, as dependências e os bloqueios estão documentados. A próxima fase pode validar schema, RLS e migrations sem alterar dados de produção automaticamente.

## Verificações posteriores

- O build do Hub passou com o runtime empacotado após restaurar `@supabase/supabase-js` e as dependências declaradas.
- A fila usa claim condicional por status para evitar processamento concorrente do mesmo registro.
- Criações usam o vínculo local como proteção contra duplicação em retries.
- O worker limita tentativas, devolve a pendência para a fila e marca erro após o limite.
- Logs de integração removem valores associados a tokens, secrets, credenciais e autorizações.
- A URL do agendamento do worker corresponde ao projeto Supabase configurado no ambiente local.

## Estado das fases

- Fase 1: concluída.
- Fase 2: concluída localmente; comparação com o remoto pendente.
- Fase 3: concluída; cadastro nativo validado e com verificação de datas.
- Fase 4: concluída em revisão estática; homologação externa pendente.
- Fase 5: concluída no escopo atual, com busca server-side, filtros por status e sincronização, paginação consistente, detalhe, edição, atividade, anexos e pedidos relacionados.
- Fase 6: homologação local concluída; publicação remota pendente por autenticação/transporte do CLI e sessão autenticada no navegador.

## Operação diária

- A lista aceita busca por nome, status do CRM e estado de sincronização.
- Os filtros são enviados à Edge Function, preservando contagem total e paginação.
- O detalhe mantém edição, atividade do ClickUp, comentários, anexos e consulta de pedidos relacionados.
- A limpeza dos filtros retorna à primeira página e recarrega os registros.

## Homologação e publicação

- O bundle de produção do Hub foi gerado com sucesso.
- O shell local carregou no navegador integrado.
- A tela autenticada não pôde ser validada porque a sessão do navegador estava sem login no Supabase.
- A consulta `supabase migration list --linked` falhou ao inicializar a role de login por erro de transporte.
- Nenhuma migration foi aplicada e nenhuma Edge Function foi publicada nesta etapa.
