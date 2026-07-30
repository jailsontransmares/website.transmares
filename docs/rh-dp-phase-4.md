# RH & DP - Fase 4

## Objetivo

Implementar o controle interno de arquivos vinculados aos colaboradores, preparando o Hub para a integração futura com Google Drive.

Esta fase registra metadados, links e IDs do Drive. Ela ainda não faz upload automático de arquivos nem cria pastas no Google Drive.

## Escopo entregue

- Lista de arquivos no modal do colaborador.
- Inclusão, edição e exclusão lógica de vínculos de arquivos.
- Categoria, tipo de documento, nome, descrição, datas, validade e observações.
- Link público/compartilhado do Google Drive.
- ID do arquivo, ID da pasta e link de pré-visualização quando disponíveis.
- Abertura do arquivo em nova aba para perfis com permissão de download.
- Retenção documental padrão de 10 anos.

## Banco de dados

### `rh_arquivos_colaboradores`

Tabela de metadados de arquivos vinculados a colaboradores.

O arquivo físico permanece no Google Drive. O Hub armazena apenas dados de controle e referência.

## Regras

- Um arquivo deve ter link do Google Drive ou ID do arquivo.
- Exclusão é lógica, com `status = 'excluido'`.
- Arquivos excluídos deixam a lista padrão, mas permanecem rastreáveis no banco e na auditoria.
- A validade não pode ser anterior à data de referência.
- A retenção é preenchida automaticamente com base na configuração de RH&DP.

## Segurança

- RLS habilitado.
- `anon` sem privilégios.
- `authenticated` com privilégios mínimos de `select`, `insert` e `update`.
- Visualização exige `rh_dp.colaboradores:view` e `rh_dp.documentos:view`.
- Inclusão exige `rh_dp.documentos:create`.
- Edição exige `rh_dp.documentos:update`.
- Exclusão lógica exige `rh_dp.documentos:delete`.
- Abertura/download no frontend exige `rh_dp.documentos:download`.
- Auditoria automática em inclusão, edição e exclusão lógica.

## Limites desta fase

- Sem upload automático para Google Drive.
- Sem criação automática de pasta por colaborador.
- Sem OAuth/credenciais do Google configuradas no Hub.
- Sem leitura binária ou armazenamento local de arquivos.
