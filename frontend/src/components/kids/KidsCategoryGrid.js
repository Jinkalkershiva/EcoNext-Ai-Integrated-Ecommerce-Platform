import React from 'react';
import './KidsCategoryGrid.css';

export const KidsCategoryGrid = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const categories = [
    { id: 'all', name: 'All Kids Picks', icon: '✨', bg: 'var(--color-primary-light)' },
    { id: 'toys', name: 'Safe Toys', icon: '🧸', bg: 'var(--color-secondary-light)' },
    { id: 'clothing', name: 'Organic Clothes', icon: '👕', bg: 'var(--color-accent-light)' },
    { id: 'school', name: 'School Essentials', icon: '🎒', bg: 'var(--color-tertiary-light)' },
    { id: 'books', name: 'Books & Learning', icon: '📚', bg: 'var(--color-quaternary-light, #FFF4D6)' },
    { id: 'art', name: 'Art & Craft', icon: '🎨', bg: 'var(--color-primary-light)' },
    { id: 'care', name: 'Gentle Care', icon: '🧼', bg: 'var(--color-secondary-light)' },
  ];

  return (
    <div className="kids-categories-wrap">
      <div className="kids-cat-head">
        <div>
          <h2>Explore By Activity</h2>
          <p>Find non-toxic, sustainable items tailored for young explorers</p>
        </div>
      </div>

      <div className="kids-categories-grid">
        {categories.map((cat) => {
          const isActive = (selectedCategory || 'all') === cat.id;
          return (
            <div
              key={cat.id}
              className={`kids-category-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.id === 'all' ? null : cat.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === 'Enter' && onSelectCategory(cat.id === 'all' ? null : cat.id)
              }
            >
              <div className="kids-cat-icon-box" style={{ backgroundColor: cat.bg }}>
                {cat.icon}
              </div>
              <span className="kids-cat-name">{cat.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KidsCategoryGrid;
