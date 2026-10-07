import React from 'react';
import ProductCard from './ProductCard';
import EmptyState from '../common/EmptyState';
import { PackageOpen, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const ProductGrid = ({
  products = [],
  loading = false,
  onViewDetails,
  onAddToCart,
  emptyMessage = 'No eco-friendly products found for this selection.',
  columns = 5,
}) => {
  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="card-base"
            style={{
              height: '350px',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div
              className="skeleton-box"
              style={{
                aspectRatio: '1 / 1',
                width: '100%',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface-sunken)',
              }}
            />
            <div className="skeleton-box" style={{ height: '12px', width: '30%', backgroundColor: 'var(--bg-surface-sunken)' }} />
            <div className="skeleton-box" style={{ height: '18px', width: '90%', backgroundColor: 'var(--bg-surface-sunken)' }} />
            <div className="skeleton-box" style={{ height: '14px', width: '50%', backgroundColor: 'var(--bg-surface-sunken)' }} />
            <div className="skeleton-box" style={{ height: '32px', width: '100%', marginTop: 'auto', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-sunken)' }} />
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen size={36} style={{ color: 'var(--color-primary)' }} />}
        title="No Products Found"
        description={emptyMessage}
      />
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: '1.25rem',
      }}
      className="marketplace-product-grid"
    >
      {products.map((item, idx) => {
        const product = item.product || item;
        return (
          <motion.div
            key={product.id || idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min((idx % 10) * 0.03, 0.25) }}
          >
            <ProductCard
              product={product}
              onViewDetails={onViewDetails}
              onAddToCart={onAddToCart}
            />
          </motion.div>
        );
      })}
    </div>
  );
};

export default ProductGrid;
