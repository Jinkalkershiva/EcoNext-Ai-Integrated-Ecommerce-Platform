import React from 'react';
import FeatureCard from './FeatureCard';
import './FeatureCard.css';

export const FeatureGrid = ({
  features = [],
  className = '',
  title = null,
  subtitle = null,
}) => {
  if (!features || features.length === 0) return null;

  return (
    <div className={`feature-grid-section ${className}`}>
      {(title || subtitle) && (
        <div
          style={{
            textAlign: 'center',
            maxWidth: '640px',
            margin: '0 auto var(--space-8) auto',
          }}
        >
          {title && (
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 var(--space-2) 0' }}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="feature-grid">
        {features.map((feature, idx) => (
          <FeatureCard
            key={idx}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            variant={feature.variant || 'primary'}
            footer={feature.footer}
            onClick={feature.onClick}
          />
        ))}
      </div>
    </div>
  );
};

export default FeatureGrid;
