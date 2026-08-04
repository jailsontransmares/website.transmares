# RH & DP — Fase 1: Fundação e segurança

## Objetivo

Preparar a base técnica do módulo de RH & DP sem implementar cadastros ou rotinas operacionais.

O módulo é exclusivamente de controle interno. Os registros oficiais permanecem sob responsabilidade da contabilidade.

## Entregas

- Módulo `rh_dp` registrado no controle de acesso existente.
- Administrador com acesso integral inicial.
- Demais perfis sem acesso automático, configuráveis pela tela de permissões.
- Configuração única da Transmares em `rh_configuracoes`.
- Auditoria imutável em `rh_auditoria`.
- RLS e privilégios explícitos nas tabelas expostas pela Data API.
- Funções de trigger mantidas no schema privado.
- Entrada ativa no menu e tela inicial sem funções operacionais.

## Configuração consolidada

- Empresa única: Transmares Corretora de Seguros.
- Finalidade: controle e gestão interna.
- Conta do Google Drive: `gestao@transmaresseguros.com.br`.
- Pasta raiz planejada: `Hub Transmares/DP e RH/Colaboradores`.
- Retenção documental: 10 anos.
- Exclusão automática: desativada.

## Recursos de acesso

| Recurso | Ações |
|---|---|
| `rh_dp` | visualizar |
| `rh_dp.dashboard` | visualizar |
| `rh_dp.colaboradores` | visualizar, ver dados sensíveis, criar, editar, arquivar |
| `rh_dp.documentos` | visualizar, criar, editar, excluir, baixar |
| `rh_dp.historicos` | visualizar |
| `rh_dp.ferias` | visualizar, criar, editar, cancelar |
| `rh_dp.ocorrencias` | visualizar, criar, editar |
| `rh_dp.fechamentos` | visualizar, criar, editar, fechar, reabrir |
| `rh_dp.desligamentos` | visualizar, criar, editar |
| `rh_dp.auditoria` | visualizar |
| `rh_dp.configuracoes` | visualizar, editar |

## Segurança

- `anon` não possui privilégios nas tabelas da fase.
- `authenticated` acessa dados somente após validação de `app_tem_permissao`.
- Usuários sem `rh_dp:view` não conseguem consultar a configuração.
- Apenas usuários com `rh_dp.configuracoes:update` podem editar a configuração.
- A auditoria não aceita inclusão, edição ou exclusão direta pelo cliente.
- Triggers registram o usuário, a ação, a entidade e os estados anterior e novo.

## Critérios validados

- Build do Hub concluído.
- Migration executada previamente em transação com rollback.
- Migration aplicada ao projeto Supabase.
- 11 recursos de acesso cadastrados.
- 31 permissões concedidas ao perfil Administrador.
- Teste de leitura, atualização e auditoria aprovado para Administrador.
- Teste de negação aprovado para perfil sem permissão.
- Advisors não apontaram falhas novas relacionadas às tabelas ou funções de RH & DP.

## Limite desta fase

Não foram criados ou alterados cadastros de colaboradores, dependentes, documentos, vínculos, férias, ocorrências, fechamentos ou desligamentos.
