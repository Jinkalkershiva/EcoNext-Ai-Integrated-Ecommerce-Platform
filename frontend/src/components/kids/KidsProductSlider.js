import React, { useRef } from 'react';
import KidsProductCard from './KidsProductCard';
import './KidsProductSlider.css';

export const KidsProductSlider = ({
  title = 'Trending eco picks',
  subtitle = "Swipe through today's best-loved sustainable finds",
  products = [],
  onViewDetails,
  onAddToCart,
  headerAction = null,
}) => {
  const sliderRef = useRef(null);

  const scrollSlide = (dir) => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: dir * 260, behavior: 'smooth' });
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <div className="kids-slider-wrap">
      <div className="kids-slider-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>

      <button
        type="button"
        className="kids-slide-btn left"
        onClick={() => scrollSlide(-1)}
        aria-label="Scroll left"
      >
        ‹
      </button>

      <div className="kids-slider-track" ref={sliderRef}>
        {products.map((product, idx) => (
          <KidsProductCard
            key={product.id || idx}
            product={product}
            index={idx}
            onViewDetails={onViewDetails}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>

      <button
        type="button"
        className="kids-slide-btn right"
        onClick={() => scrollSlide(1)}
        aria-label="Scroll right"
      >
        ›
      </button>
    </div>
  );
};

export default KidsProductSlider;
