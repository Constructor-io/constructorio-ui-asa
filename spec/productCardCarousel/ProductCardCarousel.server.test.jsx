import React from 'react';
import ReactDOMServer from 'react-dom/server';
import '@testing-library/jest-dom';
import ProductCard from '../../src/components/ProductCard/ProductCard';
import './matchMediaFix';
import ProductCardCarousel from '../../src/components/ProductCardCarousel/ProductCardCarousel';
import carouselItems from '../local_examples/carouselItems.json';

describe('Product Card Carousel', () => {
  it('renders correctly', () => {
    const html = ReactDOMServer.renderToString(
      <ProductCardCarousel>
        {carouselItems.map((productInfo) => (
          <ProductCard
            formatPrice={(number) => `$${number}`}
            productInfo={productInfo}
            key={productInfo.name}
          />
        ))}
      </ProductCardCarousel>,
    );

    expect(html).toContain('Tomatoes On The Vine Red');
    expect(html).toContain('Tomatoes Roma Red');
    expect(html).toContain('NatureSweet Tomatoes Cherubs Heavenly Salad - 10.5 Oz');
  });

  it('displays different number of products when optional param is sent', () => {
    const html = ReactDOMServer.renderToString(
      <ProductCardCarousel productDisplayCount={2}>
        {carouselItems.map((productInfo) => (
          <ProductCard
            formatPrice={(number) => `$${number}`}
            productInfo={productInfo}
            key={productInfo.name}
          />
        ))}
      </ProductCardCarousel>,
    );

    expect(html).toContain('Tomatoes On The Vine Red');
    expect(html).toContain('Tomatoes Roma Red');
  });
});
