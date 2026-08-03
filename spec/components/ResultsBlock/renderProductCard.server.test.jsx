import { renderServerSide } from '../../test-utils.server';
import createProductCardRenderer from '../../../src/components/ResultsBlock/renderProductCard';

const product = {
  id: 'p1',
  name: 'Trail Runner',
  imageUrl: 'https://cdn.test/p1.jpg',
  price: 99,
};

const renderCard = (options = {}, overrides = {}) =>
  renderServerSide(createProductCardRenderer(options)({ product: { ...product, ...overrides } }));

describe('renderProductCard (SSR)', () => {
  it('renders the product name and image into the server markup', () => {
    const html = renderCard();

    expect(html).toContain('Trail Runner');
    expect(html).toContain('https://cdn.test/p1.jpg');
  });

  it('falls back to the inline placeholder image when the product has none', () => {
    const html = renderCard({}, { imageUrl: undefined });

    expect(html).toContain('src="data:image/svg+xml,');
    expect(html).not.toContain('https://cdn.test/p1.jpg');
  });

  it('renders the sale badge when the product carries one', () => {
    const html = renderCard({}, { badge: 'Sale' });

    expect(html).toContain('cio-asa-product-card__badge');
    expect(html).toContain('Sale');
  });

  it('omits the badge when the product has none', () => {
    const html = renderCard();

    expect(html).not.toContain('cio-asa-product-card__badge');
  });

  it('renders the price only when a currency is configured', () => {
    expect(renderCard({ currency: '$' })).toContain('cio-asa-product-card__price');
    expect(renderCard()).not.toContain('cio-asa-product-card__price');
  });

  it('renders the add-to-cart button only when an onAddToCart handler is supplied', () => {
    const withHandler = renderCard({ onAddToCart: jest.fn(), addToCartText: 'Add to bag' });

    expect(withHandler).toContain('Add to bag');
    expect(renderCard()).not.toContain('cio-asa-product-card__add-to-cart');
  });

  it('does not invoke the click handlers during server rendering', () => {
    const onProductClick = jest.fn();
    const onAddToCart = jest.fn();

    renderCard({ onProductClick, onAddToCart });

    expect(onProductClick).not.toHaveBeenCalled();
    expect(onAddToCart).not.toHaveBeenCalled();
  });
});
