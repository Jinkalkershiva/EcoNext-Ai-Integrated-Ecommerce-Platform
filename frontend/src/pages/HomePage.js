import React, { useState, useEffect } from 'react';
import {
  Leaf,
  Sparkles,
  ArrowRight,
  Camera,
  Cpu,
  TrendingUp,
  CheckCircle,
  ShoppingBag,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { apiService } from '../api';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// Reusable UI Components
import Hero from '../components/common/Hero';
import Marquee from '../components/common/Marquee';
import FeatureGrid from '../components/common/FeatureGrid';
import ProductSlider from '../components/product/ProductSlider';
import ProductGrid from '../components/product/ProductGrid';
import RecommendationWidget from '../components/ai/RecommendationWidget';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

import './HomePage.css';

export const HomePage = () => {
  const { navigateTo } = useNavigation();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  const [products, setProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadHomeData = async () => {
      setLoading(true);
      try {
        const [prodData, trendData] = await Promise.all([
          apiService.getProducts(1, 8),
          apiService.getTrendingProducts(),
        ]);

        if (isMounted) {
          if (prodData && prodData.status === 'success') {
            setProducts(prodData.products || []);
          }
          if (trendData && trendData.status === 'success') {
            setTrendingProducts(trendData.trending_products || []);
          }
        }
      } catch (err) {
        console.warn('Error loading homepage data:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadHomeData();
    return () => {
      isMounted = false;
    };
  }, []);

  const segments = [
    { key: 'kids', title: 'EcoNext Kids', desc: 'Safe, organic, and non-toxic essentials', icon: '🌱' },
    { key: 'teens', title: 'EcoNext Teens', desc: 'Ethical street fashion & accessories', icon: '⚡' },
    { key: 'men', title: 'EcoNext Men', desc: 'Sustainable apparel, grooming & daily goods', icon: '👔' },
    { key: 'women', title: 'EcoNext Women', desc: 'Conscious fashion, skincare & home goods', icon: '🌿' },
    { key: 'unisex', title: 'EcoNext Unisex', desc: 'Universal sustainable lifestyle picks', icon: '✨' },
  ];

  const featuredProduct = products[0] || {
    id: 1,
    name: 'Bamboo Fibre Reusable Thermal Flask',
    current_price: 1299,
    image_url:
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80',
    description:
      'Double-walled vacuum insulated, certified organic bamboo exterior with zero plastic packaging.',
  };

  // Marquee Band Items
  const marqueeItems = [
    { text: '100% Eco-Certified Materials', icon: <Leaf size={14} /> },
    { text: 'Machine Learning Price Forecasts', icon: <Cpu size={14} /> },
    { text: 'Carbon-Neutral Worldwide Delivery', icon: <Globe size={14} /> },
    { text: 'Zero Plastic Packaging Guarantee', icon: <ShieldCheck size={14} /> },
    { text: 'Visual AI Snap & Shop', icon: <Sparkles size={14} /> },
    { text: 'Transparent Supply Chains', icon: <CheckCircle size={14} /> },
  ];

  // 3-Column AI Feature Cards
  const aiFeatures = [
    {
      icon: <Camera size={24} />,
      title: 'Snap & Shop (Visual Search)',
      description:
        'Upload any photo or screenshot. Our computer vision model instantly matches visually similar sustainable alternatives in our verified catalog.',
      variant: 'primary',
      footer: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateTo('visual-search')}
        >
          Try Visual Search
        </Button>
      ),
    },
    {
      icon: <Cpu size={24} />,
      title: '7-Day Price Forecasting',
      description:
        'Trained linear regression models analyze product price volatility to forecast upcoming trends and advise the best time to purchase.',
      variant: 'accent',
      footer: (
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)' }}>
          Available on all product detail pages
        </span>
      ),
    },
    {
      icon: <Sparkles size={24} />,
      title: 'EcoNext AI Assistant',
      description:
        'Chat with our intelligent shopping assistant to evaluate material biodegradability, compare sustainability scores, and get curated recommendations.',
      variant: 'tertiary',
      footer: (
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)' }}>
          Click the AI assistant widget in bottom-right
        </span>
      ),
    },
  ];

  return (
    <div className="container">
      {/* 1. Hero Section (Two-column with CTAs and animated visual panel) */}
      <Hero
        tag="AI-Driven Sustainable Commerce"
        tagIcon={<Sparkles size={14} />}
        headline={
          <>
            Shop Smarter. <br />
            Live <span className="highlight">Greener.</span>
          </>
        }
        subtext="Discover verified eco-friendly goods powered by machine learning price predictions, visual snap-search, and personalized sustainability curation."
        primaryCta={{
          text: 'Explore Collection',
          onClick: () => navigateTo('products'),
          icon: <ArrowRight size={18} />,
        }}
        secondaryCta={{
          text: 'Snap & Shop (Visual AI)',
          onClick: () => navigateTo('visual-search'),
          icon: <Camera size={18} />,
        }}
        stats={[
          { value: '100%', label: 'Eco-Certified Goods' },
          { value: '7-Day', label: 'Price Forecasting' },
          { value: '0 kg', label: 'Net Carbon Footprint' },
        ]}
        visual={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
              <img
                src={
                  featuredProduct.image_url ||
                  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80'
                }
                alt={featuredProduct.name}
                style={{
                  width: '100%',
                  aspectRatio: '16/11',
                  objectFit: 'cover',
                  display: 'block',
                  borderRadius: 'var(--radius-md)',
                }}
              />
              <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                <Badge variant="eco" size="sm" icon={<Leaf size={11} />}>
                  Eco Verified Pick
                </Badge>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '4px' }}>
              <div>
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    margin: 0,
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                  }}
                  onClick={() => navigateTo(`product/${featuredProduct.id}`)}
                >
                  {featuredProduct.name}
                </h3>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: 'var(--color-price)',
                    marginTop: '4px',
                  }}
                >
                  ₹
                  {Number(featuredProduct.current_price || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => addToCart(featuredProduct, 1)}
                icon={<ShoppingBag size={15} />}
              >
                Add
              </Button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface-sunken)',
                border: '1px solid var(--border-subtle)',
                marginTop: '4px',
              }}
            >
              <ShieldCheck size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Best Price Guarantee
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  AI Forecast: Buy today for lowest weekly rate
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* 2. Full-Width Marquee Band Directly Under Hero */}
      <Marquee items={marqueeItems} speed={32} />

      {/* 3. Trending Picks Section using ProductSlider */}
      <section style={{ margin: 'var(--space-10) 0' }}>
        <ProductSlider
          title="Trending Eco Picks"
          subtitle="Most loved sustainable essentials curated by our community"
          products={trendingProducts.length > 0 ? trendingProducts : products.slice(0, 6)}
          onViewDetails={(id) => navigateTo(`product/${id}`)}
          onAddToCart={(prod) => addToCart(prod, 1)}
          headerAction={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTo('trending')}
              icon={<TrendingUp size={14} />}
            >
              View All
            </Button>
          }
        />
      </section>

      {/* 4. FeatureGrid (3 Columns of Key Capabilities) */}
      <section style={{ margin: 'var(--space-12) 0' }}>
        <FeatureGrid
          title="Intelligent Eco-Commerce"
          subtitle="We leverage practical machine learning to save you money, eliminate greenwashing, and make conscious shopping effortless."
          features={aiFeatures}
        />
      </section>

      {/* 5. Shop By Persona Segment Cards */}
      <section style={{ margin: 'var(--space-10) 0' }}>
        <div className="section-header">
          <div className="section-title-group">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
              Shop By Persona
            </h2>
            <span className="section-subtitle">
              Tailored sustainable selections for every lifestyle
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateTo('products')}
            icon={<ArrowRight size={14} />}
            iconPosition="right"
          >
            Explore All
          </Button>
        </div>

        <div className="segment-cards-grid">
          {segments.map((seg) => (
            <div
              key={seg.key}
              className="segment-card"
              onClick={() => navigateTo(seg.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigateTo(seg.key)}
            >
              <div className="segment-card-icon">{seg.icon}</div>
              <div className="segment-card-title">{seg.title}</div>
              <div className="segment-card-desc">{seg.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Authenticated Personalized Recommendations */}
      {isAuthenticated && (
        <section style={{ margin: 'var(--space-10) 0' }}>
          <RecommendationWidget />
        </section>
      )}

      {/* 7. Curated Full Eco Catalog Grid */}
      <section style={{ margin: 'var(--space-12) 0' }}>
        <div className="section-header">
          <div className="section-title-group">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
              Explore Full Catalog
            </h2>
            <span className="section-subtitle">
              Verified sustainable products made from renewable, recycled, and non-toxic materials
            </span>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigateTo('products')}>
            View All Products
          </Button>
        </div>

        <ProductGrid
          products={products}
          loading={loading}
          onViewDetails={(id) => navigateTo(`product/${id}`)}
        />
      </section>

      {/* 8. Sustainability & Impact Banner */}
      <section className="sustainability-banner">
        <div>
          <Badge variant="eco" size="sm" icon={<Leaf size={12} />}>
            Our Commitment
          </Badge>
          <h2 style={{ margin: 'var(--space-3) 0 var(--space-4) 0', fontSize: '1.75rem', fontWeight: 800 }}>
            Transparent Sustainability. Zero Greenwashing.
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-6)',
              lineHeight: 1.6,
              fontSize: '0.95rem',
            }}
          >
            Every product on EcoNext passes our strict verification framework: fair-trade labor, non-toxic organic materials, plastic-free packaging, and certified carbon-offset shipping.
          </p>
          <Button variant="primary" size="md" onClick={() => navigateTo('products')}>
            Shop With Impact
          </Button>
        </div>

        <div className="sustainability-points">
          <div className="sustainability-point-item">
            <CheckCircle
              size={22}
              style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }}
            />
            <div className="sustainability-point-text">
              <strong>Verified Certifications:</strong> We cross-check GOTS, FSC, Fair-Trade, and Cruelty-Free credentials.
            </div>
          </div>
          <div className="sustainability-point-item">
            <CheckCircle
              size={22}
              style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }}
            />
            <div className="sustainability-point-text">
              <strong>Plastic-Neutral Packaging:</strong> All merchant partners use compostable or 100% recycled shipping boxes.
            </div>
          </div>
          <div className="sustainability-point-item">
            <CheckCircle
              size={22}
              style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }}
            />
            <div className="sustainability-point-text">
              <strong>Community Carbon Offsets:</strong> A percentage of every sale funds verified local reforestation projects.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
