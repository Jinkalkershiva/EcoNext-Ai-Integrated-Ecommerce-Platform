import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import './ProductSlider.css';

export const ProductSlider = ({
  products = [],
  onViewDetails,
  onAddToCart,
  className = '',
  title = null,
  subtitle = null,
  headerAction = null,
}) => {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!trackRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const el = trackRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [products]);

  const handleScroll = (direction) => {
    if (!trackRef.current) return;
    const scrollAmount = 320;
    trackRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!products || products.length === 0) return null;

  return (
    <div className={`product-slider-container ${className}`}>
      {(title || headerAction || subtitle) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-4)',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            {title && (
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  margin: '4px 0 0 0',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {headerAction}
            <div className="product-slider-controls">
              <button
                type="button"
                className="product-slider-nav-btn"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="product-slider-nav-btn"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Scroll right"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="product-slider-track" ref={trackRef}>
        {products.map((product) => (
          <div key={product.id} className="product-slider-item">
            <ProductCard
              product={product}
              onViewDetails={onViewDetails}
              onAddToCart={onAddToCart}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductSlider;
