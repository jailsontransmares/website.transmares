export const CRM2_FALLBACK_PRODUCTS = [
  { descricao_comercial: 'e-CPF A3', preco_com_desconto: '390,00', product_id: 'e-CPF A3', grupo: 'e-CPF' },
  { descricao_comercial: 'e-CNPJ A1', preco_com_desconto: '540,00', product_id: 'e-CNPJ A1', grupo: 'PJ' },
  { descricao_comercial: 'e-CNPJ A3', preco_com_desconto: '890,00', product_id: 'e-CNPJ A3', grupo: 'PJ' },
  { descricao_comercial: 'Renovação de certificado', preco_com_desconto: '480,00', product_id: 'Renovação de certificado', grupo: 'PJ' }
];

export function normalizeCrm2Product(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCrm2ProductCatalog(products = []) {
  const source = Array.isArray(products) && products.length ? products : CRM2_FALLBACK_PRODUCTS;
  return source
    .filter((item) => item && (item.descricao_comercial || item.label || item.value || item.product_id || item.sku))
    .map((item) => {
      const label = String(item.descricao_comercial || item.label || item.value || item.product_id || item.sku || '').trim();
      const discountedPrice = item.preco_com_desconto ?? item.price;
      const price = discountedPrice !== null && discountedPrice !== undefined && String(discountedPrice).trim() !== ''
        ? discountedPrice
        : item.preco_sem_desconto ?? item.price ?? '';
      return {
        value: label,
        label,
        sku: String(item.product_id || item.sku || '').trim(),
        group: String(item.tipo_certificado || item.grupo || '').trim(),
        price: String(price).trim()
      };
    });
}

export function findCrm2Product(catalog, value = '') {
  const normalized = normalizeCrm2Product(value);
  if (!normalized) return null;
  return normalizeCrm2ProductCatalog(catalog).find((item) =>
    normalizeCrm2Product(item.value) === normalized || normalizeCrm2Product(item.sku) === normalized
  ) || null;
}

export function getCrm2ProductPrice(catalog, value = '') {
  return findCrm2Product(catalog, value)?.price || '';
}

export function parseCrm2Money(value = '') {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim().replace(/^R\$\s*/i, '');
  if (!raw) return 0;
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function formatCrm2ProductPrice(value = '') {
  const amount = parseCrm2Money(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
    : 'Preço indisponível';
}

export function searchCrm2Products(catalog, query = '', limit = 8) {
  const normalized = normalizeCrm2Product(query);
  return normalizeCrm2ProductCatalog(catalog)
    .filter((item) => !normalized || normalizeCrm2Product(`${item.label} ${item.sku}`).includes(normalized))
    .slice(0, limit);
}
