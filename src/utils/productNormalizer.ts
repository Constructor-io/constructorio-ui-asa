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

export interface NormalizeOptions {
  saleBadgeText?: string;
}

export function normalizeItemToProduct(item: any, options?: NormalizeOptions): Product {
  const data = item.data || {};
  return {
    id: String(data.id ?? data.result_id ?? item.value ?? ''),
    name: String(item.value ?? data.item_name ?? ''),
    url: data.url,
    imageUrl: data.image_url ?? data.imageUrl,
    price: data.price,
    salePrice: data.sale_price ?? data.salePrice,
    description: data.description,
    badge:
      data.sale_price != null || data.salePrice != null
        ? options?.saleBadgeText ?? 'Sale'
        : undefined,
  };
}
