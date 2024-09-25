import React, { useMemo } from 'react';
import Slider, { Settings } from 'react-slick';
import NavArrow, { Direction } from '../NavArrow/NavArrow';

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
}

export default function ProductCardCarousel(
  props: React.PropsWithChildren & ProductCardCarouselProps,
) {
  const { children, productDisplayCount, productCountPerScroll } = props;

  const settings = useMemo(
    () => ({
      ...defaultSettings,
      slidesToShow: productDisplayCount ?? defaultSettings.slidesToShow,
      slidesToScroll: productCountPerScroll ?? defaultSettings.slidesToScroll,
    }),
    [productCountPerScroll, productDisplayCount],
  );

  return <Slider {...settings}>{children}</Slider>;
}
