import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { apiService } from '../api';
import {
  KidsHero,
  KidsMarquee,
  KidsProductSlider,
  KidsFeatureGrid,
  KidsCategoryGrid,
} from '../components/kids';
import ProductGrid from '../components/product/ProductGrid';
import FilterSidebar from '../components/product/FilterSidebar';
import Button from '../components/common/Button';
import { ArrowLeft } from 'lucide-react';

export const KidsPage = () => {
  const { navigateTo, goBack } = useNavigation();
  const { addToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [trendingKids, setTrendingKids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filters, setFilters] = useState({ age_group: 'Kids' });

  // Load Kids Products from real API
  const fetchKidsProducts = useCallback(async (filterSet, categoryQuery) => {
    setLoading(true);
    try {
      const mergedFilters = {
        age_group: 'Kids',
        ...filterSet,
        page: 1,
        per_page: 30,
      };

      if (categoryQuery) {
        mergedFilters.category = categoryQuery;
      }

      const data = await apiService.getProducts(mergedFilters);
      if (data && data.status === 'success') {
        const prods = data.products || [];
        setProducts(prods);
        // Take first 6 as trending/featured
        setTrendingKids(prods.slice(0, 6));
      } else {
        setProducts([]);
        setTrendingKids([]);
      }
    } catch (err) {
      console.warn('Error fetching Kids products:', err);
      setProducts([]);
      setTrendingKids([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKidsProducts(filters, selectedCategory);
  }, [filters, selectedCategory, fetchKidsProducts]);

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, age_group: 'Kids' }));
  };

  return (
    <div className="container">
      {/* Back to Home Button */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          icon={<ArrowLeft size={16} />}
        >
          Back
        </Button>
      </div>

      {/* 1. Kids Hero (Inspired by Reference HTML) */}
      <KidsHero
        eyebrow="✨ Fun, Safe & Sustainable Choices"
        title="Shop smarter."
        highlight="Live greener."
        subtitle="Verified non-toxic, organic kids goods, price predictions, and visual search — all in one colorful, eco-friendly playground."
        onExplore={() => {
          const el = document.getElementById('kids-catalog-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onVisualSearch={() => navigateTo('visual-search')}
      />

      {/* 2. Purple Marquee Band */}
      <KidsMarquee />

      {/* 3. Trending Picks Product Slider */}
      {trendingKids.length > 0 && (
        <section style={{ margin: 'var(--space-8) 0' }}>
          <KidsProductSlider
            title="Trending eco picks"
            subtitle="Swipe through today's best-loved sustainable finds for kids"
            products={trendingKids}
            onViewDetails={(id) => navigateTo(`product/${id}`)}
            onAddToCart={(prod) => addToCart(prod, 1)}
          />
        </section>
      )}

      {/* 4. Interactive Activity Categories */}
      <KidsCategoryGrid
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
      />

      {/* 5. 3-Column Kids Feature Cards (From Reference HTML) */}
      <KidsFeatureGrid
        onVisualSearchClick={() => navigateTo('visual-search')}
      />

      {/* 6. Filterable Kids Catalog Section */}
      <section id="kids-catalog-section" style={{ margin: 'var(--space-10) 0' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 'var(--space-6)',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.85rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              All Kids Sustainable Essentials
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
              Organic cotton clothing, wooden toys, recycled bags, and zero-plastic accessories
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            gap: 'var(--space-6)',
            alignItems: 'flex-start',
          }}
          className="kids-catalog-grid-layout"
        >
          <FilterSidebar
            initialFilters={filters}
            onFilterChange={handleFilterChange}
            hideSegments={true}
          />

          <div>
            <ProductGrid
              products={products}
              loading={loading}
              onViewDetails={(id) => navigateTo(`product/${id}`)}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default KidsPage;
