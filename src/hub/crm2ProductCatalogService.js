import { carregarProdutosAR } from './services/arService.js';

let productCatalogCache = null;
let productCatalogRequest = null;

export async function loadCrm2ProductCatalog() {
  if (productCatalogCache) return productCatalogCache;
  if (!productCatalogRequest) {
    productCatalogRequest = carregarProdutosAR()
      .then((products) => {
        productCatalogCache = Array.isArray(products) ? products : [];
        return productCatalogCache;
      })
      .finally(() => {
        productCatalogRequest = null;
      });
  }
  return productCatalogRequest;
}
