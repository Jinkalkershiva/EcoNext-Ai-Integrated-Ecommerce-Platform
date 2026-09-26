import React from 'react';
import './KidsMarquee.css';

export const KidsMarquee = ({ items = [] }) => {
  const defaultItems = [
    '🌍 100% Carbon-Neutral Shipping',
    '🌱 Learn & Grow',
    '♻️ Zero-Waste Packaging',
    '🎨 Create & Explore',
    '💚 50,000+ Conscious Families',
    '⭐ Kids Favorites',
    '🔥 7-Day Price Forecasting',
    '📚 Learn Through Shopping',
    '📸 Snap & Shop Visual AI',
  ];

  const list = items.length > 0 ? items : defaultItems;
  // Duplicate for seamless 0 to -50% loop
  const duplicated = [...list, ...list];

  return (
    <div className="kids-marquee-band" aria-hidden="true">
      <div className="kids-marquee-track">
        {duplicated.map((text, idx) => (
          <span key={idx}>{text}</span>
        ))}
      </div>
    </div>
  );
};

export default KidsMarquee;
