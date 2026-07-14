export interface Product {
  id: string;
  name: string;
  url?: string;
  imageUrl?: string;
  price?: string | number;
  salePrice?: string | number;
  description?: string;
  badge?: string;
}

export function normalizeItemToProduct(item: any): Product {
  const data = item.data || {};
  return {
    id: data.id || data.result_id || item.value || '',
    name: item.value || data.item_name || '',
    url: data.url,
    imageUrl: data.image_url || data.imageUrl,
    price: data.price,
    salePrice: data.sale_price || data.salePrice,
    description: data.description,
    badge: data.sale_price || data.salePrice ? 'Sale' : undefined,
  };
}
