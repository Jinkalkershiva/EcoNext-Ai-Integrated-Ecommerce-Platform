import React from 'react';
import { Star } from 'lucide-react';

export const Rating = ({
  score = 5,
  max = 5,
  size = 14,
  showScore = true,
  count = null,
  style = {}
}) => {
  const numScore = parseFloat(score) || 0;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {[...Array(max)].map((_, i) => {
          const filled = i < Math.floor(numScore);
          const half = !filled && i < numScore;
          return (
            <Star
              key={i}
              size={size}
              fill={filled ? '#F59E0B' : half ? 'url(#half-star)' : 'none'}
              color="#F59E0B"
              strokeWidth={1.5}
            />
          );
        })}
      </div>
      {showScore && (
        <span style={{ fontWeight: '600', color: 'var(--text-primary)', marginLeft: '2px' }}>
          {numScore.toFixed(1)}
        </span>
      )}
      {count !== null && (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          ({count})
        </span>
      )}
    </div>
  );
};

export default Rating;
