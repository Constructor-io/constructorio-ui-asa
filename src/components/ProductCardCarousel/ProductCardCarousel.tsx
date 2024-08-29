import React, { useMemo } from 'react';
import Slider, { Settings } from 'react-slick';
import NavArrow, { Direction } from '../NavArrow/NavArrow';

const defaultSettings: Settings = {
  infinite: true,
  speed: 500,
  slidesToShow: 3,
  slidesToScroll: 1,
  prevArrow: <NavArrow direction={Direction.PREV} />,
  nextArrow: <NavArrow direction={Direction.NEXT} />,
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
