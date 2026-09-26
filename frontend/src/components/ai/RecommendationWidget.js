import React, { useState, useEffect } from 'react';
import { apiService } from '../../api';
import ProductGrid from '../product/ProductGrid';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

export const RecommendationWidget = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const { navigateTo } = useNavigation();

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const response = await apiService.getRecommendations();
        let list = [];
        if (Array.isArray(response)) {
          list = response;
        } else if (Array.isArray(response?.recommendations)) {
          list = response.recommendations;
        } else if (Array.isArray(response?.results)) {
          list = response.results;
        }
        setRecommendations(list);
      } catch (err) {
        console.warn('Recommendation fetch note:', err.message);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <section style={{ margin: '3rem 0' }}>
      <div className="section-header">
        <div className="section-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: 'var(--color-accent)' }} />
            <h2>Recommended For You</h2>
          </div>
          <span className="section-subtitle">
            Tailored suggestions based on your eco-profile and browsing preferences
          </span>
        </div>

        <button
          type="button"
          className="filter-clear-btn"
          onClick={() => navigateTo('preferences')}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <SlidersHorizontal size={14} /> Refine Preferences
        </button>
      </div>

      <ProductGrid
        products={recommendations.slice(0, 4)}
        loading={loading}
        onViewDetails={(id) => navigateTo(`product/${id}`)}
      />
    </section>
  );
};

export default RecommendationWidget;
