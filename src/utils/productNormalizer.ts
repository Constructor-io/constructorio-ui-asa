export interface Product {
  id: string;
  name: string;
  imageUrl?: string;
  price?: number;
  salePrice?: number;
  description?: string;
  badge?: string;
}

export function normalizeItemToProduct(item: any): Product {
  const data = item.data || {};
  return {
    id: data.id || data.result_id || item.value || '',
    name: item.value || data.item_name || '',
    imageUrl: data.image_url,
    price: data.price,
    salePrice: data.sale_price,
    description: data.description,
    badge: data.badge,
  };
}
