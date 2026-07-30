import { normalizeItemToProduct } from '../../src/utils/productNormalizer';

describe('normalizeItemToProduct', () => {
  it('maps data.* fields onto the Product shape', () => {
    const item = {
      value: 'Wonder Bread',
      data: {
        id: 'prod-1',
        url: 'https://example.com/bread',
        image_url: 'https://example.com/bread.jpg',
        price: 12.34,
        description: 'Classic white bread',
      },
    };

    expect(normalizeItemToProduct(item)).toEqual({
      id: 'prod-1',
      name: 'Wonder Bread',
      url: 'https://example.com/bread',
      imageUrl: 'https://example.com/bread.jpg',
      price: 12.34,
      salePrice: undefined,
      description: 'Classic white bread',
      badge: undefined,
    });
  });

  it('falls back through id sources: data.id -> data.result_id -> item.value', () => {
    expect(normalizeItemToProduct({ value: 'v', data: { result_id: 'r' } }).id).toBe('r');
    expect(normalizeItemToProduct({ value: 'v', data: {} }).id).toBe('v');
    expect(normalizeItemToProduct({ data: {} }).id).toBe('');
  });

  it('falls back through name sources: item.value -> data.item_name', () => {
    expect(normalizeItemToProduct({ data: { item_name: 'n' } }).name).toBe('n');
    expect(normalizeItemToProduct({ value: 'v', data: { item_name: 'n' } }).name).toBe('v');
    expect(normalizeItemToProduct({ data: {} }).name).toBe('');
  });

  it('accepts camelCase image and sale price aliases', () => {
    const product = normalizeItemToProduct({
      value: 'x',
      data: { imageUrl: 'https://img', salePrice: 5 },
    });
    expect(product.imageUrl).toBe('https://img');
    expect(product.salePrice).toBe(5);
  });

  it('adds a default "Sale" badge when a sale price is present', () => {
    expect(normalizeItemToProduct({ value: 'x', data: { sale_price: 5 } }).badge).toBe('Sale');
    expect(normalizeItemToProduct({ value: 'x', data: { salePrice: 5 } }).badge).toBe('Sale');
  });

  it('honours a custom saleBadgeText', () => {
    const product = normalizeItemToProduct(
      { value: 'x', data: { sale_price: 5 } },
      { saleBadgeText: 'Deal' },
    );
    expect(product.badge).toBe('Deal');
  });

  it('does not add a badge when there is no sale price', () => {
    expect(normalizeItemToProduct({ value: 'x', data: { price: 10 } }).badge).toBeUndefined();
  });

  it('handles a missing data object gracefully', () => {
    const product = normalizeItemToProduct({ value: 'only-value' });
    expect(product.id).toBe('only-value');
    expect(product.name).toBe('only-value');
    expect(product.badge).toBeUndefined();
  });
});
