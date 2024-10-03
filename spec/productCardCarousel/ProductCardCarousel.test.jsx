import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import ProductCard from '../../src/components/ProductCard/ProductCard';
import './matchMediaFix';
import ProductCardCarousel from '../../src/components/ProductCardCarousel/ProductCardCarousel';
import carouselItems from '../local_examples/carouselItems.json';

describe('Product Card Carousel', () => {
  it('renders correctly', () => {
    const { container } = render(
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

    expect(container).toHaveTextContent('Tomatoes On The Vine Red');
    expect(container).toHaveTextContent('Tomatoes Roma Red');
    expect(container).toHaveTextContent('NatureSweet Tomatoes Cherubs Heavenly Salad - 10.5 Oz');

    expect(container.querySelectorAll('.slick-track > div[aria-hidden=false]').length).toBe(4);
  });

  it('displays different number of products when optional param is sent', () => {
    const { container } = render(
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

    expect(container).toHaveTextContent('Tomatoes On The Vine Red');
    expect(container).toHaveTextContent('Tomatoes Roma Red');

    expect(container.querySelectorAll('.slick-track > div[aria-hidden=false]').length).toBe(2);
  });
});
