import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import createProductCardRenderer from '../../../src/components/ResultsBlock/renderProductCard';
import { Product } from '../../../src/utils/productNormalizer';
import { PLACEHOLDER_IMAGE } from '../../../src/constants';

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

  it('exposes the title as a keyboard-focusable button when onProductClick is provided', async () => {
    const onProductClick = jest.fn();
    renderCard({ onProductClick });

    const title = screen.getByRole('button', { name: 'Sneaker' });
    title.focus();
    await userEvent.keyboard('{Enter}');
    expect(onProductClick).toHaveBeenCalledWith(product);
  });

  it('keeps the title non-interactive when onProductClick is not provided', () => {
    renderCard({});
    expect(screen.queryByRole('button', { name: 'Sneaker' })).not.toBeInTheDocument();
    expect(screen.getByText('Sneaker')).toBeInTheDocument();
  });

  it('includes the price in the title button name when a currency is provided', () => {
    renderCard({ onProductClick: jest.fn(), currency: '$' });
    expect(screen.getByRole('button', { name: 'Sneaker, $ 20' })).toBeInTheDocument();
  });

  it('prefers the sale price in the title button name', () => {
    renderCard({ onProductClick: jest.fn(), currency: '$' }, { ...product, salePrice: 15 });
    expect(screen.getByRole('button', { name: 'Sneaker, $ 15' })).toBeInTheDocument();
  });

  it('does not fire onProductClick twice when the title button is clicked', async () => {
    const onProductClick = jest.fn();
    renderCard({ onProductClick });

    await userEvent.click(screen.getByRole('button', { name: 'Sneaker' }));
    expect(onProductClick).toHaveBeenCalledTimes(1);
  });
});
