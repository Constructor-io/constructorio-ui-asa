import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import createProductCardRenderer from './renderProductCard';
import { Product } from '../../utils/productNormalizer';
import { PLACEHOLDER_IMAGE } from '../../constants';

const product: Product = {
  id: '1',
  name: 'Sneaker',
  imageUrl: 'https://img/1.jpg',
  price: 20,
  badge: 'Sale',
};

// The renderer returns a function expecting Carousel render props ({ product, ... }).
function renderCard(
  options: Parameters<typeof createProductCardRenderer>[0],
  p: Product = product,
) {
  const renderProductCard = createProductCardRenderer(options);
  return render(<div>{renderProductCard({ product: p } as any)}</div>);
}

describe('createProductCardRenderer', () => {
  it('renders the product name', () => {
    renderCard({});
    expect(screen.getByText('Sneaker')).toBeInTheDocument();
  });

  it('renders the sale badge when present', () => {
    renderCard({});
    expect(screen.getByText('Sale')).toBeInTheDocument();
  });

  it('falls back to the placeholder image when imageUrl is missing', () => {
    renderCard({}, { ...product, imageUrl: undefined });
    const img = document.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(PLACEHOLDER_IMAGE);
  });

  it('renders the price only when a currency is provided', () => {
    const { rerender } = renderCard({});
    expect(screen.queryByText(/20/)).not.toBeInTheDocument();

    rerender(<div>{createProductCardRenderer({ currency: 'USD' })({ product } as any)}</div>);
    expect(screen.getByText(/20/)).toBeInTheDocument();
  });

  it('renders an add-to-cart button and forwards the product on click', async () => {
    const onAddToCart = jest.fn();
    renderCard({ onAddToCart, addToCartText: 'Add to cart' });
    const button = screen.getByRole('button', { name: /add to cart/i });
    await userEvent.click(button);
    expect(onAddToCart).toHaveBeenCalledWith(product);
  });

  it('hides the add-to-cart button when no handler is provided', () => {
    renderCard({});
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
  });
});
