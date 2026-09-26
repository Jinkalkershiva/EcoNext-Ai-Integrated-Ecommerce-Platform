import React from 'react';
import './Marquee.css';

export const Marquee = ({
  items = [],
  speed = 28,
  className = '',
  reverse = false,
}) => {
  if (!items || items.length === 0) return null;

  // We duplicate the list to ensure 100% seamless infinite scroll from 0 to -50%
  const duplicatedItems = [...items, ...items];

  return (
    <div className={`marquee-wrapper ${className}`} aria-hidden="true">
      <div
        className="marquee-track"
        style={{
          animationDuration: `${speed}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        <div className="marquee-content">
          {duplicatedItems.map((item, index) => (
            <span key={index} className="marquee-item">
              {item.icon ? (
                <span className="marquee-icon">{item.icon}</span>
              ) : (
                <span className="marquee-accent-dot" />
              )}
              <span>{typeof item === 'string' ? item : item.text}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Marquee;
