import React from 'react';
import './KidsFeatureGrid.css';

export const KidsFeatureGrid = ({
  title = 'Built with real intelligence',
  subtitle = 'Practical AI that saves money and cuts greenwashing',
  onVisualSearchClick,
}) => {
  const features = [
    {
      icon: '📸',
      color: 'var(--color-primary, #FF5D8F)',
      title: 'Visual Search',
      description:
        'Upload a photo or drawing and instantly find similar sustainable alternatives in our verified catalog.',
      onClick: onVisualSearchClick,
    },
    {
      icon: '📈',
      color: 'var(--color-accent, #FF9142)',
      title: 'Price Forecasting',
      description:
        'Know whether to buy now or wait, based on 7-day price trend predictions from machine learning models.',
    },
    {
      icon: '💬',
      color: 'var(--color-tertiary, #7B61FF)',
      title: 'AI Shopping Assistant',
      description:
        'Ask about organic materials, compare non-toxic products, and get eco ideas in plain, friendly language.',
    },
  ];

  return (
    <section className="kids-features-section">
      <div className="kids-features-head">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="kids-features-grid">
        {features.map((feat, idx) => (
          <div
            key={idx}
            className="kids-feat-card"
            style={{ cursor: feat.onClick ? 'pointer' : 'default' }}
            onClick={feat.onClick}
          >
            <div className="kids-feat-icon" style={{ backgroundColor: feat.color }}>
              {feat.icon}
            </div>
            <h3>{feat.title}</h3>
            <p>{feat.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default KidsFeatureGrid;
