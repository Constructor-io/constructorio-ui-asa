import React, { useMemo } from 'react';
import Slider, { Settings } from 'react-slick';
import NavArrow, { Direction } from '../NavArrow/NavArrow';
import ProductCard from '../ProductCard/ProductCard';
import { AsaSearchResult } from '../../hooks/useAsaResults';

const defaultSettings: Settings = {
  infinite: true,
  speed: 500,
  slidesToShow: 4,
  slidesToScroll: 1,
  prevArrow: <NavArrow direction={Direction.PREV} />,
  nextArrow: <NavArrow direction={Direction.NEXT} />,
  responsive: [
    {
      breakpoint: 1250,
      settings: {
        slidesToShow: 3,
      },
    },
    {
      breakpoint: 1024,
      settings: {
        slidesToShow: 2,
      },
    },
    {
      breakpoint: 600,
      settings: {
        slidesToShow: 1,
      },
    },
    {
      breakpoint: 450,
      settings: {
        slidesToShow: 1,
        dots: true,
      },
    },
  ],
};

interface ProductCardCarouselProps {
  productDisplayCount?: number;
  productCountPerScroll?: number;
  searchResult: AsaSearchResult;
}

export default function ProductCardCarousel(
  props: React.PropsWithChildren & ProductCardCarouselProps,
) {
  const { children, productDisplayCount, productCountPerScroll, searchResult } = props;

  const settings = useMemo(
    () => ({
      ...defaultSettings,
      slidesToShow: productDisplayCount ?? defaultSettings.slidesToShow,
      slidesToScroll: productCountPerScroll ?? defaultSettings.slidesToScroll,
    }),
    [productCountPerScroll, productDisplayCount],
  );

  const title = searchResult.response.search_request.display_name;
  const subText = searchResult.text;

  const defaultMarkup = (
    <>
      {title && <div className='cio-carousel-title'>{title}</div>}
      {subText && <div className='cio-carousel-subtext'>{subText}</div>}
      <Slider {...settings}>
        {searchResult.response.results.map((product) => (
          <ProductCard
            productInfo={{
              name: product.value,
              price: product.data.price,
              url: product.data.url,
              imageUrl: product.data.image_url,
            }}
            formatPrice={(number) => `$${number}`}
          />
        ))}
      </Slider>
    </>
  );

  return <div>{children || defaultMarkup}</div>;
}
