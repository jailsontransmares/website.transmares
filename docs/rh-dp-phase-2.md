# RH & DP — Fase 2: Cadastro pessoal

## Objetivo

Implementar o cadastro manual de colaboradores para controle interno da Transmares, sem fluxo de admissão, vínculo profissional ou arquivos.

## Entregas

- Listagem com busca, filtro de status, resumo e paginação.
- Inclusão, visualização e edição do cadastro.
- Inativação e reativação sem exclusão do colaborador.
- Dados pessoais, contatos, emergência e endereço.
- Documentos cadastrais protegidos por permissão específica.
- Dependentes em registros separados e sem limite fixo.
- Salvamento transacional por RPC com `security invoker`.
- Auditoria automática de inclusões e alterações.
- RLS e privilégios explícitos nas três tabelas.

## Modelo de dados

### `rh_colaboradores`

Dados pessoais, contatos, emergência, endereço, observações e status do cadastro.

Campos obrigatórios:

- Nome completo;
- Data de nascimento;
- Ao menos um telefone ou e-mail;
- Status.

### `rh_documentos_cadastrais`

CPF, RG/CNH, título eleitoral, CTPS, PIS e documento militar.

- Um registro documental por colaborador;
- CPF obrigatório e único;
- Acesso condicionado a `rh_dp.colaboradores:view_sensitive`.

### `rh_dependentes`

Nome, data de nascimento, parentesco e status interno.

- Sem limite fixo;
- Remoções na interface geram inativação do registro;
- Dados anteriores permanecem na auditoria.

## Regras aplicadas

- O cadastro de colaborador não pode ser excluído.
- CPF é normalizado para 11 dígitos e validado na interface.
- CEP é normalizado para oito dígitos.
- UFs são normalizadas em letras maiúsculas.
- E-mail é normalizado em letras minúsculas.
- Usuários sem acesso a dados sensíveis não consultam documentos ou dependentes nem pela API.
- Inclusão exige as permissões de criar e ver dados sensíveis porque o CPF é obrigatório.
- Edição sem acesso sensível altera apenas o cadastro pessoal e preserva documentos e dependentes.
- Inativação exige as permissões de editar e arquivar.

## Segurança

- `anon` não possui privilégios nas tabelas ou na RPC.
- `authenticated` depende das políticas RLS e das permissões efetivas do Hub.
- A RPC `rh_salvar_cadastro_pessoal` usa `security invoker` e respeita RLS.
- Inclusão, atualização e inativação alimentam `rh_auditoria`.
- Nenhuma política de exclusão foi criada.

## Validações executadas

- Build do Hub concluído.
- Migration testada previamente em transação com `rollback`.
- Migration aplicada no projeto `website.production`.
- Criação e atualização de cadastro aprovadas.
- Inclusão e atualização de dependentes aprovadas.
- CPF duplicado bloqueado.
- Auditoria gerada.
- Administrador com acesso integral validado.
- Perfil comum sem permissão recebeu zero registros nas três tabelas.
- Dados fictícios e auditorias de teste revertidos integralmente.
- Advisors sem alerta de segurança relacionado à Fase 2.

## Limites desta fase

Não foram implementados:

- Vínculo, admissão, cargo, função, CBO, salário ou jornada;
- Histórico profissional;
- Arquivos e Google Drive;
- Férias, ocorrências, afastamentos ou fechamento mensal;
- Desligamento, alertas e relatórios.
