import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { apiService } from '../api';
import ProductGrid from '../components/product/ProductGrid';
import FilterSidebar from '../components/product/FilterSidebar';
import SearchBar from '../components/search/SearchBar';
import ErrorMessage from '../components/common/ErrorMessage';
import Badge from '../components/common/Badge';

export const ProductsPage = () => {
  const { params, navigateTo } = useNavigation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    category: '',
    age_group: '',
    gender_category: '',
    price_min: '',
    price_max: '',
    eco_tags: [],
    sort_by: '-created_at',
  });
  const [searchQuery, setSearchQuery] = useState(params.q || '');

  const fetchProducts = useCallback(async (filtersToApply, query) => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (query && query.trim()) {
        data = await apiService.intentSearch(query.trim());
        if (data.status === 'success' && data.results) {
          if (Array.isArray(data.results)) {
            setProducts(data.results);
          } else if (typeof data.results === 'object') {
            const flattened = Object.values(data.results).flat();
            setProducts(flattened);
          }
        } else {
          setProducts([]);
        }
      } else {
        const queryParams = {
          page: 1,
          per_page: 40,
          ...filtersToApply
        };
        data = await apiService.getProducts(queryParams);
        if (data.status === 'success') {
          setProducts(data.products || []);
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
    fetchProducts(activeFilters, q);
  }, [params.q, activeFilters, fetchProducts]);

  const handleFilterChange = (newFilters) => {
    setActiveFilters(newFilters);
    fetchProducts(newFilters, searchQuery);
  };

  const handleSearch = (newQuery) => {
    setSearchQuery(newQuery);
    fetchProducts(activeFilters, newQuery);
  };

  return (
    <div className="container">
      {/* Page Header */}
      <div style={{ margin: '1.5rem 0 2.5rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem' }}>
              {searchQuery ? `Search Results for "${searchQuery}"` : 'All Eco-Friendly Products'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginTop: '0.25rem' }}>
              {loading ? 'Finding sustainable products...' : `Showing ${products.length} certified sustainable items`}
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: '380px' }}>
            <SearchBar
              initialValue={searchQuery}
              onSearch={handleSearch}
              placeholder="Filter by name, material, or keyword..."
            />
          </div>
        </div>

        {/* Active Filter Badges */}
        {(activeFilters.category || activeFilters.eco_tags.length > 0 || searchQuery) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Filters:</span>
            {searchQuery && (
              <Badge variant="accent" size="sm">
                Query: {searchQuery}
              </Badge>
            )}
            {activeFilters.category && (
              <Badge variant="primary" size="sm">
                Category: {activeFilters.category}
              </Badge>
            )}
            {activeFilters.eco_tags.map(t => (
              <Badge key={t} variant="eco" size="sm">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Main Layout Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: '2rem',
          alignItems: 'flex-start'
        }}
        className="products-page-layout"
      >
        {/* Left Filter Sidebar */}
        <div>
          <FilterSidebar
            initialFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Right Products Content */}
        <div>
          {error && <ErrorMessage message={error} onRetry={() => fetchProducts(activeFilters, searchQuery)} />}

          <ProductGrid
            products={products}
            loading={loading}
            onViewDetails={(id) => navigateTo(`product/${id}`)}
            emptyMessage={
              searchQuery
                ? `No products found matching "${searchQuery}". Try a different search term or reset filters.`
                : 'No eco products matched your specific filter combination.'
            }
          />
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
