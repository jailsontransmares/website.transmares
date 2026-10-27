import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCrm2CadastroRelations } from './crm2CadastroRelations.js';

const links = [
  { id: 'link-1', pfNome: 'Ana Silva', pfCpf: '123.456.789-00', pjRazaoSocial: 'Empresa A', pjCnpj: '11.222.333/0001-44', tipo: 'Titular', status: 'Ativo' },
  { id: 'link-2', pfNome: 'Bruno Lima', pfCpf: '98765432100', pjRazaoSocial: 'Empresa A', pjCnpj: '11222333000144', tipo: 'Contador', status: 'Ativo' },
  { id: 'link-3', pfNome: 'Ana Silva', pfCpf: '12345678900', pjRazaoSocial: 'Empresa B', pjCnpj: '55.666.777/0001-88', tipo: 'Representante legal', status: 'Inativo' }
];

test('PF view uses matching central relationships and excludes stale references for other PFs', () => {
  const result = resolveCrm2CadastroRelations({
    records: links,
    references: [
      { id: 'link-1', razaoSocial: 'nome desatualizado', cpf: '12345678900' },
      { id: 'link-2', razaoSocial: 'Empresa incorreta', cpf: '12345678900' },
      { razaoSocial: 'Empresa legada', cnpj: '00999888000100' }
    ],
    identityField: 'cpf',
    identityValue: '123.456.789-00',
    side: 'pf'
  });

  assert.deepEqual(result.map(({ id }) => id), ['link-1', 'link-3', '']);
  assert.equal(result[0].razaoSocial, 'Empresa A');
  assert.equal(result[0].centralizado, true);
  assert.equal(result[2].razaoSocial, 'Empresa legada');
  assert.equal(result[2].sourceIndex, 2);
});

test('PJ view uses matching central relationships and maps PF contact fields', () => {
  const result = resolveCrm2CadastroRelations({
    records: links,
    references: [{ vinculoId: 'link-1', nome: 'nome desatualizado', cnpj: '11222333000144' }],
    identityField: 'cnpj',
    identityValue: '11.222.333/0001-44',
    side: 'pj'
  });

  assert.deepEqual(result.map(({ id }) => id), ['link-1', 'link-2']);
  assert.equal(result[0].nome, 'Ana Silva');
  assert.equal(result[0].cpf, '123.456.789-00');
  assert.equal(result[0].vinculoId, 'link-1');
  assert.equal(result[0].centralizado, true);
});

test('unknown legacy references remain visible and invalid scopes return no links', () => {
  const reference = { vinculoId: 'legacy-link', nome: 'Pessoa antiga', cpf: '98765432100' };
  const result = resolveCrm2CadastroRelations({ records: [], references: [reference], identityField: 'cnpj', identityValue: '11222333000144', side: 'pj' });
  assert.equal(result[0].nome, 'Pessoa antiga');
  assert.equal(result[0].centralizado, undefined);
  assert.deepEqual(resolveCrm2CadastroRelations({ records: links, references: [], identityField: 'cpf', identityValue: '', side: 'pf' }), []);
});
