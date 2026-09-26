import React from 'react';
import ProductCard from './ProductCard';
import EmptyState from '../common/EmptyState';
import { PackageOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export const ProductGrid = ({
  products = [],
  loading = false,
  onViewDetails,
  onAddToCart,
  emptyMessage = 'No eco-friendly products found for this selection.',
  columns = 4 // 2, 3, 4
}) => {
  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="card-base"
            style={{
              height: '340px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div className="skeleton-box" style={{ height: '170px', width: '100%', borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton-box" style={{ height: '14px', width: '40%' }} />
            <div className="skeleton-box" style={{ height: '20px', width: '85%' }} />
            <div className="skeleton-box" style={{ height: '16px', width: '60%', marginTop: 'auto' }} />
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen size={32} />}
        title="No Products Available"
        description={emptyMessage}
      />
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '1.5rem',
      }}
    >
      {products.map((item, idx) => {
        const product = item.product || item;
        return (
          <motion.div
            key={product.id || idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min((idx % 8) * 0.04, 0.3) }}
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
