import React from 'react';
import Slider, { Settings } from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import NavArrow from '../NavArrow/NavArrow';

export default function ProductCardCarousel(props: React.PropsWithChildren) {
  const { children } = props;
  const settings: Settings = {
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    prevArrow: <NavArrow direction='Prev' />,
    nextArrow: <NavArrow direction='Next' />,
  };

  return <Slider {...settings}>{children}</Slider>;
}
