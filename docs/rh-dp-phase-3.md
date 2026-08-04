# RH & DP - Fase 3

## Objetivo

Implementar o vínculo profissional do colaborador para controle interno da Transmares.

Esta fase não inclui histórico formal de alterações, cálculo de folha, arquivos do Google Drive, desligamento operacional ou integração com a contabilidade.

## Escopo entregue

- Tipo de vínculo.
- Data de admissão e data de desligamento informativa.
- Cargo, função, CBO, área e gestor responsável.
- Situação profissional.
- Tipo e valor de remuneração.
- Modelo de jornada, carga horária, horários, intervalo e dias de trabalho.
- Observações do vínculo.

## Banco de dados

### `rh_vinculos_profissionais`

Registro único por colaborador.

Campos sensíveis, como remuneração e jornada, ficam protegidos pela permissão `rh_dp.colaboradores:view_sensitive`.

## Regras

- O cadastro pessoal continua sendo a entidade principal.
- O vínculo profissional é salvo junto com o cadastro, na mesma operação transacional.
- A data de desligamento não pode ser anterior à admissão.
- A remuneração não pode ser negativa.
- A carga horária semanal deve ficar entre 0 e 80 horas.
- O CBO aceita o formato `000000` ou `0000-00`.
- Não há cálculo automático de salário, jornada, folha, férias ou rescisão.

## Segurança

- RLS habilitado na tabela de vínculo.
- `anon` sem privilégios.
- `authenticated` com privilégios mínimos de `select`, `insert` e `update`, sempre filtrados por RLS.
- Visualização condicionada a `rh_dp.colaboradores:view` e `rh_dp.colaboradores:view_sensitive`.
- Inclusão condicionada a `rh_dp.colaboradores:create` ou `rh_dp.colaboradores:update`, além de `view_sensitive`.
- Edição condicionada a `rh_dp.colaboradores:update` e `view_sensitive`.
- Auditoria automática em inserções e alterações.

## Critérios de aceite

- Administrador consegue salvar vínculo profissional junto ao cadastro.
- Usuário sem dados sensíveis não consegue consultar vínculo pela API.
- Usuário sem permissão de edição não consegue alterar vínculo.
- A RPC continua compatível com cadastro pessoal, documentos e dependentes.
- Build do Hub conclui sem erro.
