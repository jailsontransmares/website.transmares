import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CRM2_FALLBACK_PRODUCTS,
  formatCrm2ProductPrice,
  findCrm2Product,
  getCrm2ProductPrice,
  normalizeCrm2ProductCatalog,
  searchCrm2Products
} from './crm2ProductCatalog.js';

test('the fallback catalog and its prices are shared and normalized', () => {
  const catalog = normalizeCrm2ProductCatalog([]);

  assert.equal(catalog.length, CRM2_FALLBACK_PRODUCTS.length);
  assert.equal(getCrm2ProductPrice([], 'e-CPF A3'), '390,00');
  assert.equal(findCrm2Product([], 'e-CNPJ A1')?.value, 'e-CNPJ A1');
});

test('the product catalog prefers discounted price and falls back to regular price', () => {
  const catalog = normalizeCrm2ProductCatalog([
    { descricao_comercial: 'Certificado A', product_id: 'SKU-A', preco_com_desconto: '125.50', preco_sem_desconto: '150.00' },
    { descricao_comercial: 'Certificado B', product_id: 'SKU-B', preco_com_desconto: '', preco_sem_desconto: '200.00' }
  ]);

  assert.equal(getCrm2ProductPrice(catalog, 'SKU-A'), '125.50');
  assert.equal(getCrm2ProductPrice(catalog, 'Certificado B'), '200.00');
});

test('product lookup and suggestions accept SKU and normalized product names', () => {
  const catalog = [{ descricao_comercial: 'Renovação de certificado', product_id: 'REN-01', preco_sem_desconto: '480,00' }];

  assert.equal(findCrm2Product(catalog, 'renovacao de certificado')?.sku, 'REN-01');
  assert.equal(searchCrm2Products(catalog, 'ren-01')[0]?.value, 'Renovação de certificado');
});

test('catalog prices format consistently from Brazilian or decimal database values', () => {
  const format = (value) => formatCrm2ProductPrice(value).replaceAll('\u00a0', ' ');
  assert.equal(format('1.250,50'), 'R$ 1.250,50');
  assert.equal(format('1250.50'), 'R$ 1.250,50');
});
