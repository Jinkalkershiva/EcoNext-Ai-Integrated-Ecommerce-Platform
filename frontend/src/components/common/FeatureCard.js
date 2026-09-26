import React from 'react';
import './FeatureCard.css';

export const FeatureCard = ({
  icon,
  title,
  description,
  variant = 'primary',
  footer = null,
  onClick = null,
  className = '',
}) => {
  return (
    <div
      className={`feature-card ${className} ${onClick ? 'interactive' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
    >
      {icon && (
        <div className={`feature-card-icon-box variant-${variant}`}>
          {icon}
        </div>
      )}
      <h3 className="feature-card-title">{title}</h3>
      <p className="feature-card-description">{description}</p>
      {footer && <div className="feature-card-footer">{footer}</div>}
    </div>
  );
};

export default FeatureCard;
