import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import ProductCard from '../../src/components/ProductCard/ProductCard';

describe('Product Card', () => {
  it('renders correctly', () => {
    const productInfo = {
      name: 'item name',
      price: 4321,
      url: 'item url',
      imageUrl: 'image url',
    };

    const { container } = render(
      <ProductCard productInfo={productInfo} formatPrice={(price) => `$${price}`} />,
    );

    expect(container).toHaveTextContent('item name');
    expect(container).toHaveTextContent('$4321');
    expect(container.querySelector('a')).toHaveAttribute('href', 'item url');
    expect(container.querySelector('img')).toHaveAttribute('src', 'image url');
    expect(container.querySelector('button')).toHaveTextContent('Addy to Cart');
  });
});
