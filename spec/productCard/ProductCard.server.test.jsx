import React from 'react';
import ReactDOMServer from 'react-dom/server';
import '@testing-library/jest-dom';
import ProductCard from '../../src/components/ProductCard/ProductCard';

describe('Product Card', () => {
  it('renders correctly', () => {
    const productInfo = {
      name: 'item name',
      price: 4321,
      url: 'item url',
      imageUrl: 'image url',
    };

    const html = ReactDOMServer.renderToString(
      <ProductCard productInfo={productInfo} formatPrice={(price) => `$${price}`} />,
    );

    expect(html).toContain('item name');
    expect(html).toContain('$4321');
    expect(html).toContain('item url');
    expect(html).toContain('image url');
    expect(html).toContain('Add to Cart');
  });
});
