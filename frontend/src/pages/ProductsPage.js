import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { apiService } from '../api';
import ProductGrid from '../components/product/ProductGrid';
import FilterSidebar from '../components/product/FilterSidebar';
import ErrorMessage from '../components/common/ErrorMessage';
import { Filter, X, SlidersHorizontal } from 'lucide-react';
import './ProductsPage.css';

export const ProductsPage = () => {
  const { params, navigateTo } = useNavigation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortBy, setSortBy] = useState('-created_at');

  const [activeFilters, setActiveFilters] = useState({
    category: params.category || '',
    age_group: '',
    gender_category: '',
    price_min: '',
    price_max: '',
    eco_tags: [],
    sort_by: '-created_at',
  });
  const [searchQuery, setSearchQuery] = useState(params.q || '');

  // Keep category in sync if routed from subnav
  useEffect(() => {
    if (params.category) {
      setActiveFilters(prev => ({ ...prev, category: params.category }));
    }
  }, [params.category]);

  const fetchProducts = useCallback(async (filtersToApply, query, sort) => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (query && query.trim()) {
        data = await apiService.intentSearch(query.trim());
        if (data.status === 'success' && data.results) {
          let resultsList = [];
          if (Array.isArray(data.results)) {
            resultsList = data.results;
          } else if (typeof data.results === 'object') {
            resultsList = Object.values(data.results).flat();
          }

          // Client-side sorting for intent search results
          if (sort === 'price_asc') {
            resultsList.sort((a, b) => Number(a.current_price || a.price || 0) - Number(b.current_price || b.price || 0));
          } else if (sort === 'price_desc') {
            resultsList.sort((a, b) => Number(b.current_price || b.price || 0) - Number(a.current_price || a.price || 0));
          } else if (sort === 'rating') {
            resultsList.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
          }
          setProducts(resultsList);
        } else {
          setProducts([]);
        }
      } else {
        const queryParams = {
          page: 1,
          per_page: 50,
          ...filtersToApply,
          sort_by: sort,
        };
        data = await apiService.getProducts(queryParams);
        if (data.status === 'success') {
          let prods = data.products || [];
          if (sort === 'price_asc') {
            prods.sort((a, b) => Number(a.current_price || a.price || 0) - Number(b.current_price || b.price || 0));
          } else if (sort === 'price_desc') {
            prods.sort((a, b) => Number(b.current_price || b.price || 0) - Number(a.current_price || a.price || 0));
          } else if (sort === 'rating') {
            prods.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
          }
          setProducts(prods);
        } else {
          setProducts([]);
        }
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      setError('Could not load products. Please verify your backend server is active.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = params.q || '';
    setSearchQuery(q);
    fetchProducts(activeFilters, q, sortBy);
  }, [params.q, activeFilters, sortBy, fetchProducts]);

  const handleFilterChange = (newFilters) => {
    setActiveFilters(newFilters);
  };

  const handleSortChange = (e) => {
    const newSort = e.target.value;
    setSortBy(newSort);
  };

  const removeFilter = (key, val = null) => {
    if (key === 'eco_tags') {
      setActiveFilters(prev => ({
        ...prev,
        eco_tags: prev.eco_tags.filter(t => t !== val),
      }));
    } else if (key === 'query') {
      setSearchQuery('');
      navigateTo('products');
    } else if (key === 'price') {
      setActiveFilters(prev => ({
        ...prev,
        price_min: '',
        price_max: '',
      }));
    } else {
      setActiveFilters(prev => ({
        ...prev,
        [key]: '',
      }));
    }
  };

  const clearAllFilters = () => {
    setActiveFilters({
      category: '',
      age_group: '',
      gender_category: '',
      price_min: '',
      price_max: '',
      eco_tags: [],
      sort_by: '-created_at',
    });
    setSearchQuery('');
    navigateTo('products');
  };

  const hasActiveFilters = Boolean(
    activeFilters.category ||
    activeFilters.age_group ||
    activeFilters.gender_category ||
    activeFilters.price_min ||
    activeFilters.price_max ||
    activeFilters.eco_tags.length > 0 ||
    searchQuery
  );

  return (
    <div className="products-page-container">
      {/* PLP Marketplace Header Bar */}
      <div className="plp-header-bar">
        <div className="plp-header-title-group">
          <h1 className="plp-main-title">
            {searchQuery
              ? `Results for "${searchQuery}"`
              : activeFilters.category
              ? `${activeFilters.category} Collection`
              : 'All Verified Eco-Friendly Products'}
          </h1>
          <span className="plp-result-count">
            {loading ? 'Discovering certified items...' : `Showing ${products.length} conscious products`}
          </span>
        </div>

        <div className="plp-header-controls">
          <button
            type="button"
            className="plp-mobile-filter-btn"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <Filter size={15} />
            Filters {hasActiveFilters && `(${activeFilters.eco_tags.length + (activeFilters.category ? 1 : 0)})`}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <SlidersHorizontal size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              className="plp-sort-select"
              value={sortBy}
              onChange={handleSortChange}
              aria-label="Sort products"
            >
              <option value="-created_at">Featured & Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Customer Rating</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="plp-active-filters-row">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Active:
          </span>

          {searchQuery && (
            <span className="plp-filter-chip">
              Query: {searchQuery}
              <button
                type="button"
                className="plp-filter-chip-remove"
                onClick={() => removeFilter('query')}
                aria-label="Remove search query filter"
              >
                <X size={12} />
              </button>
            </span>
          )}

          {activeFilters.category && (
            <span className="plp-filter-chip">
              Category: {activeFilters.category}
              <button
                type="button"
                className="plp-filter-chip-remove"
                onClick={() => removeFilter('category')}
                aria-label="Remove category filter"
              >
                <X size={12} />
              </button>
            </span>
          )}

          {activeFilters.gender_category && (
            <span className="plp-filter-chip">
              Persona: {activeFilters.gender_category}
              <button
                type="button"
                className="plp-filter-chip-remove"
                onClick={() => removeFilter('gender_category')}
                aria-label="Remove persona filter"
              >
                <X size={12} />
              </button>
            </span>
          )}

          {(activeFilters.price_min || activeFilters.price_max) && (
            <span className="plp-filter-chip">
              ₹{activeFilters.price_min || 0} - ₹{activeFilters.price_max || '10,000+'}
              <button
                type="button"
                className="plp-filter-chip-remove"
                onClick={() => removeFilter('price')}
                aria-label="Remove price filter"
              >
                <X size={12} />
              </button>
            </span>
          )}

          {activeFilters.eco_tags.map(tag => (
            <span key={tag} className="plp-filter-chip">
              {tag}
              <button
                type="button"
                className="plp-filter-chip-remove"
                onClick={() => removeFilter('eco_tags', tag)}
                aria-label={`Remove ${tag} filter`}
              >
                <X size={12} />
              </button>
            </span>
          ))}

          <button
            type="button"
            className="plp-clear-all-btn"
            onClick={clearAllFilters}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Two-Column Layout Grid */}
      <div className="plp-body-layout">
        {/* Left Filter Sidebar */}
        <aside className={`plp-sidebar-column ${showMobileFilters ? 'mobile-open' : ''}`}>
          <FilterSidebar
            initialFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        </aside>

        {/* Right Products Content Grid */}
        <main className="plp-grid-column">
          {error && (
            <ErrorMessage
              message={error}
              onRetry={() => fetchProducts(activeFilters, searchQuery, sortBy)}
            />
          )}

          <ProductGrid
            products={products}
            loading={loading}
            onViewDetails={(id) => navigateTo(`product/${id}`)}
            emptyMessage={
              searchQuery
                ? `No sustainable products found matching "${searchQuery}". Try a different keyword or reset filters.`
                : 'No eco products matched your specific filter combination. Try adjusting price or tag selections.'
            }
          />
        </main>
      </div>
    </div>
  );
};

export default ProductsPage;
