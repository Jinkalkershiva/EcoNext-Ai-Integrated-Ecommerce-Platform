import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { apiService } from '../api';
import ProductGrid from '../components/product/ProductGrid';
import FilterSidebar from '../components/product/FilterSidebar';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { Leaf, ArrowLeft } from 'lucide-react';

export const SegmentPage = ({ segmentName, defaultFilters = {} }) => {
  const { navigateTo, goBack } = useNavigation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(defaultFilters);

  const segmentDescriptions = {
    Kids: 'Safe, hypoallergenic, organic cotton and non-toxic goods designed for little ones.',
    Teens: 'Trendsetting, ethical street apparel and zero-waste lifestyle gear for the next generation.',
    Men: 'Durable, responsibly sourced menswear, natural grooming, and long-lasting essentials.',
    Women: 'Conscious fashion, certified clean botanical beauty, and artisan-crafted goods.',
    Unisex: 'Minimalist, gender-neutral sustainable lifestyle essentials built to last.',
  };

  const fetchSegmentProducts = useCallback(async (filterSet) => {
    setLoading(true);
    try {
      const mergedFilters = {
        ...defaultFilters,
        ...filterSet,
        page: 1,
        per_page: 30
      };
      const data = await apiService.getProducts(mergedFilters);
      if (data && data.status === 'success') {
        setProducts(data.products || []);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.warn('Error fetching segment products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [defaultFilters]);

  useEffect(() => {
    fetchSegmentProducts(filters);
  }, [filters, fetchSegmentProducts]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="container">
      {/* Back Button */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Button variant="ghost" size="sm" onClick={goBack} icon={<ArrowLeft size={16} />}>
          Back
        </Button>
      </div>

      {/* Segment Hero Header */}
      <div
        style={{
          padding: '2.5rem 2rem',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, var(--bg-surface-sunken) 0%, var(--color-primary-subtle) 100%)',
          border: '1px solid var(--color-primary-light)',
          marginBottom: '2.5rem'
        }}
      >
        <Badge variant="eco" size="sm" icon={<Leaf size={11} />}>
          Curated Segment
        </Badge>
        <h1 style={{ fontSize: '2.25rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          EcoNext {segmentName}
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', fontSize: '1.05rem', lineHeight: 1.5 }}>
          {segmentDescriptions[segmentName] || 'Sustainable products tailored to your conscious lifestyle.'}
        </p>
      </div>

      {/* Segment Grid Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: '2rem',
          alignItems: 'flex-start'
        }}
      >
        <FilterSidebar
          initialFilters={filters}
          onFilterChange={handleFilterChange}
          hideSegments={true}
        />

        <div>
          <div className="section-header" style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Showing {products.length} products
            </span>
          </div>

          <ProductGrid
            products={products}
            loading={loading}
            onViewDetails={(id) => navigateTo(`product/${id}`)}
            emptyMessage={`No ${segmentName} products found with the current filter settings.`}
          />
        </div>
      </div>
    </div>
  );
};

export default SegmentPage;
