import { normalizeItemToProduct } from '../../src/utils/productNormalizer';

describe('productNormalizer (SSR / node environment)', () => {
  it('maps a search result item to a product without a DOM', () => {
    const product = normalizeItemToProduct({
      value: 'Trail Runner',
      data: {
        id: 'p1',
        url: 'https://shop.test/p1',
        image_url: 'https://cdn.test/p1.jpg',
        price: 99,
        description: 'A shoe',
      },
    });

    expect(product).toEqual({
      id: 'p1',
      name: 'Trail Runner',
      url: 'https://shop.test/p1',
      imageUrl: 'https://cdn.test/p1.jpg',
      price: 99,
      salePrice: undefined,
      description: 'A shoe',
      badge: undefined,
    });
  });

  it('accepts camelCase metadata as well as snake_case', () => {
    const product = normalizeItemToProduct({
      value: 'Road Racer',
      data: { id: 'p2', imageUrl: 'https://cdn.test/p2.jpg', salePrice: 49 },
    });

    expect(product.imageUrl).toBe('https://cdn.test/p2.jpg');
    expect(product.salePrice).toBe(49);
  });

  it('adds a sale badge when a sale price is present', () => {
    expect(normalizeItemToProduct({ value: 'X', data: { sale_price: 10 } }).badge).toBe('Sale');
    expect(
      normalizeItemToProduct({ value: 'X', data: { sale_price: 10 } }, { saleBadgeText: 'Akcja' })
        .badge,
    ).toBe('Akcja');
  });

  it('omits the badge when there is no sale price', () => {
    expect(normalizeItemToProduct({ value: 'X', data: { price: 10 } }).badge).toBeUndefined();
  });

  it('falls back through the id and name candidates', () => {
    expect(normalizeItemToProduct({ value: 'Fallback' }).id).toBe('Fallback');
    expect(normalizeItemToProduct({ data: { id: 'p3', item_name: 'From data' } }).name).toBe(
      'From data',
    );
    expect(normalizeItemToProduct({}).id).toBe('');
    expect(normalizeItemToProduct({}).name).toBe('');
  });
});
