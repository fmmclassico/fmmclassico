'use client';

import { useMemo } from 'react';
import { Autoplay, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import './hero-slider.css';

export type HeroSlide = {
  id: string;
  type: 'welcome' | 'image';
  eyebrow?: string;
  title: string;
  description: string;
  image?: string;
  alt?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

const heroSlides: HeroSlide[] = [
  {
    id: 'welcome',
    type: 'welcome',
    eyebrow: 'WELCOME TO FMM CLASSICO',
    title:
      'Online shopping for smartphones, phone accessories, electronics, home appliances, and lifestyle products.',
    description:
      'Create an account or sign in to save your wishlist, track orders, view order history, manage your account information, and enjoy faster checkout.',
  },
  {
    id: 'phones',
    type: 'image',
    title: 'PHONES',
    description: 'Latest models. Top performance. Unbeatable prices.',
    image: '/images/hero-phones.png',
    alt: 'Phones',
  },
  {
    id: 'accessories',
    type: 'image',
    title: 'PHONE ACCESSORIES',
    description: 'Chargers, earbuds, cases, speakers and more for everyday use.',
    image: '/images/hero-accessories.png',
    alt: 'Phone accessories',
  },
  {
    id: 'electronics',
    type: 'image',
    title: 'ELECTRONICS',
    description: 'Quality electronics selected for performance and reliability.',
    image: '/images/hero-electronics.png',
    alt: 'Electronics',
  },
  {
    id: 'home-appliances',
    type: 'image',
    title: 'HOME APPLIANCES',
    description: 'Essential appliances for comfort, convenience, and everyday living.',
    image: '/images/hero-home-appliances.png',
    alt: 'Home appliances',
  },
];

export default function HeroSlider() {
  const slides = useMemo(() => heroSlides, []);

  return (
    <section className="hero-slider">
      <Swiper
        modules={[Autoplay, Pagination]}
        slidesPerView={1}
        loop={true}
        speed={700}
        autoplay={{
          delay: 10000,
          disableOnInteraction: false,
          pauseOnMouseEnter: false,
          waitForTransition: true,
        }}
        pagination={{
          clickable: true,
        }}
        onInit={(swiper) => {
          if (swiper.params.autoplay && typeof swiper.params.autoplay !== 'boolean') {
            swiper.params.autoplay.delay = 10000;
          }
          if (swiper.autoplay) swiper.autoplay.start();
        }}
        onSlideChange={(swiper) => {
          const realIndex = swiper.realIndex;
          const delay = realIndex === 0 ? 10000 : 6000;

          if (swiper.params.autoplay && typeof swiper.params.autoplay !== 'boolean') {
            swiper.params.autoplay.delay = delay;
          }

          if (swiper.autoplay) {
            swiper.autoplay.stop();
            swiper.autoplay.start();
          }
        }}
        className="hero-slider__swiper"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id}>
            {slide.type === 'welcome' ? (
              <article className="hero-slide hero-slide--welcome">
                <div className="hero-slide__content hero-slide__content--single">
                  {slide.eyebrow ? (
                    <span className="hero-slide__eyebrow">{slide.eyebrow}</span>
                  ) : null}

                  <h2 className="hero-slide__title hero-slide__title--welcome">{slide.title}</h2>
                  <p className="hero-slide__desc hero-slide__desc--welcome">{slide.description}</p>
                </div>
              </article>
            ) : (
              <article className="hero-slide hero-slide--image">
                <div className="hero-slide__content hero-slide__content--split">
                  <div className="hero-slide__text">
                    <h2 className="hero-slide__title">{slide.title}</h2>
                    <p className="hero-slide__desc">{slide.description}</p>
                  </div>

                  <div className="hero-slide__media">
                    <img src={slide.image} alt={slide.alt || slide.title} />
                  </div>
                </div>
              </article>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
