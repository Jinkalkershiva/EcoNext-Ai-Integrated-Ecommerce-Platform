import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, PackageOpen } from 'lucide-react';
import ProductCard from './ProductCard';
import './ProductSlider.css';

export const ProductSlider = ({
  products = [],
  loading = false,
  emptyMessage = 'No products available in this collection.',
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
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
  };

  useEffect(() => {
    checkScroll();
    const el = trackRef.current;
    if (!el) return;

    let timeoutId = null;
    const handleScrollEvent = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(checkScroll, 40);
    };

    el.addEventListener('scroll', handleScrollEvent, { passive: true });
    window.addEventListener('resize', handleScrollEvent);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      el.removeEventListener('scroll', handleScrollEvent);
      window.removeEventListener('resize', handleScrollEvent);
    };
  }, [products, loading]);

  const handleScroll = (direction) => {
    if (!trackRef.current) return;
    const containerWidth = trackRef.current.clientWidth;
    const scrollAmount = Math.max(260, Math.floor(containerWidth * 0.75));
    trackRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!loading && (!products || products.length === 0)) {
    if (!title && !subtitle) return null;
    return (
      <div className={`product-slider-container ${className}`}>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          {title && <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{title}</h2>}
          {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>{subtitle}</p>}
        </div>
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <PackageOpen size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
          <div>{emptyMessage}</div>
        </div>
      </div>
    );
  }

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
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
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
        {loading
          ? [...Array(6)].map((_, i) => (
              <div key={i} className="product-slider-item" style={{ minWidth: '220px' }}>
                <div
                  className="card-base"
                  style={{
                    height: '340px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div
                    className="skeleton-box"
                    style={{ aspectRatio: '1 / 1', width: '100%', borderRadius: 'var(--radius-sm)' }}
                  />
                  <div className="skeleton-box" style={{ height: '12px', width: '35%' }} />
                  <div className="skeleton-box" style={{ height: '16px', width: '85%' }} />
                  <div className="skeleton-box" style={{ height: '14px', width: '50%' }} />
                </div>
              </div>
            ))
          : products.map((item, idx) => {
              const prod = item?.product || item;
              return (
                <div key={prod?.id || idx} className="product-slider-item">
                  <ProductCard
                    product={prod}
                    onViewDetails={onViewDetails}
                    onAddToCart={onAddToCart}
                  />
                </div>
              );
            })}
      </div>
    </div>
  );
};

export default ProductSlider;
