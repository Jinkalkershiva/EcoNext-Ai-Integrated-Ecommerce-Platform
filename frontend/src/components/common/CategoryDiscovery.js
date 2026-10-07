import React from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { Sparkles, ArrowRight } from 'lucide-react';
import './CategoryDiscovery.css';

export const CategoryDiscovery = () => {
  const { navigateTo } = useNavigation();

  const categories = [
    {
      id: 'women',
      name: "Women's Fashion",
      img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=200&q=80',
      action: () => navigateTo('women'),
    },
    {
      id: 'men',
      name: "Men's Apparel",
      img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=200&q=80',
      action: () => navigateTo('men'),
    },
    {
      id: 'kids',
      name: 'Kids & Baby',
      img: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=200&q=80',
      action: () => navigateTo('kids'),
    },
    {
      id: 'teens',
      name: 'Teens Streetwear',
      img: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=200&q=80',
      action: () => navigateTo('teens'),
    },
    {
      id: 'home',
      name: 'Home & Living',
      img: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=200&q=80',
      action: () => navigateTo('products', { category: 'Home & Living' }),
    },
    {
      id: 'personal-care',
      name: 'Personal Care',
      img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80',
      action: () => navigateTo('products', { category: 'Personal Care' }),
    },
    {
      id: 'zero-waste',
      name: 'Zero Waste',
      img: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=200&q=80',
      action: () => navigateTo('products', { eco_tags: ['Zero-Waste'] }),
    },
    {
      id: 'deals',
      name: 'Deals < ₹999',
      img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=200&q=80',
      action: () => navigateTo('products', { price_max: 999 }),
    },
  ];

  return (
    <section className="category-discovery-section">
      <div className="category-discovery-header">
        <h2 className="category-discovery-title">
          <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
          <span>Shop by Category</span>
        </h2>
        <button
          type="button"
          className="nav-link"
          style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}
          onClick={() => navigateTo('products')}
        >
          View All <ArrowRight size={14} style={{ display: 'inline', marginLeft: '2px' }} />
        </button>
      </div>

      <div className="category-discovery-scroll">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className="category-discovery-item"
            onClick={cat.action}
          >
            <div className="category-discovery-img-wrap">
              <img
                src={cat.img}
                alt={cat.name}
                className="category-discovery-img"
                loading="lazy"
              />
            </div>
            <span className="category-discovery-name">{cat.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoryDiscovery;
