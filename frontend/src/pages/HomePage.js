import React, { useState, useEffect } from 'react';
import {
  Leaf,
  Sparkles,
  ArrowRight,
  Camera,
  Cpu,
  TrendingUp,
  CheckCircle,
  Tag,
  Zap,
  Flame,
  Baby,
  Backpack,
  User,
  Users,
  Shirt,
} from 'lucide-react';
import { apiService } from '../api';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// Marketplace UI Components
import HeroCarousel from '../components/common/HeroCarousel';
import BenefitStrip from '../components/common/BenefitStrip';
import CategoryDiscovery from '../components/common/CategoryDiscovery';
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
  const [budgetProducts, setBudgetProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadHomeData = async () => {
      setLoading(true);
      try {
        const [prodData, trendData] = await Promise.all([
          apiService.getProducts(1, 16),
          apiService.getTrendingProducts(),
        ]);

        if (isMounted) {
          if (prodData && prodData.status === 'success') {
            const allProds = prodData.products || [];
            setProducts(allProds);
            // Budget deals: items under ₹1500 or sorted by price
            const underBudget = allProds.filter(p => Number(p.current_price || p.price || 0) <= 1500);
            setBudgetProducts(underBudget.length >= 4 ? underBudget : allProds.slice(0, 6));
          }
          if (trendData && trendData.status === 'success') {
            const rawTrending = trendData.trending_products || [];
            const normalizedTrending = rawTrending.map(item => item.product || item);
            setTrendingProducts(normalizedTrending);
          }
        }
      } catch (err) {
        console.warn('Error loading homepage marketplace data:', err.message);
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
    { key: 'kids', title: 'EcoNext Kids', desc: 'Organic, non-toxic certified baby & kids essentials', icon: Baby, badge: 'Certified Safe' },
    { key: 'teens', title: 'EcoNext Teens', desc: 'Ethical street fashion, bags & recycled accessories', icon: Backpack, badge: 'Trending Now' },
    { key: 'men', title: 'EcoNext Men', desc: 'Sustainable apparel, grooming & daily eco gear', icon: Shirt, badge: 'Pure Organic' },
    { key: 'women', title: 'EcoNext Women', desc: 'Conscious fashion, botanical beauty & home goods', icon: User, badge: 'Cruelty Free' },
    { key: 'unisex', title: 'EcoNext Unisex', desc: 'Universal sustainable picks & zero-waste lifestyle', icon: Users, badge: '100% Vegan' },
  ];

  const aiFeatures = [
    {
      icon: <Camera size={22} />,
      title: 'Snap & Shop Visual Search',
      description: 'Upload any product photo or screenshot. Our computer vision neural network matches verified sustainable alternatives instantly.',
      cta: 'Try Visual Search',
      action: () => navigateTo('visual-search'),
    },
    {
      icon: <Cpu size={22} />,
      title: '7-Day Price Regression Forecasts',
      description: 'Predictive pricing intelligence analyzes volatility patterns and recommends the optimal day to purchase at the lowest price.',
      cta: 'Explore Catalog',
      action: () => navigateTo('products'),
    },
    {
      icon: <Sparkles size={22} />,
      title: 'EcoNext AI Sustainability Copilot',
      description: 'Consult our conversational AI assistant to compare carbon footprints, check GOTS certifications, and curate eco gift sets.',
      cta: 'Chat with Copilot',
      action: () => {
        const copilotBtn = document.querySelector('.copilot-toggle-btn');
        if (copilotBtn) copilotBtn.click();
      },
    },
  ];

  return (
    <div className="homepage-wrapper">
      {/* 1. Promotional Marketplace Hero Carousel */}
      <HeroCarousel />

      {/* 2. Marketplace Trust & Value Benefit Strip */}
      <BenefitStrip />

      {/* 3. Visual Category Discovery Row */}
      <CategoryDiscovery />

      {/* 4. Trending Eco Picks (Horizontal High-Density Slider) */}
      <section className="merchandising-section">
        <ProductSlider
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={22} style={{ color: '#EF4444' }} />
              Trending Sustainable Picks
            </span>
          }
          subtitle="Top-rated conscious essentials loved by 50,000+ eco-conscious shoppers this week"
          products={trendingProducts.length > 0 ? trendingProducts : products.slice(0, 8)}
          onViewDetails={(id) => navigateTo(`product/${id}`)}
          onAddToCart={(prod) => addToCart(prod, 1)}
          headerAction={
            <button
              type="button"
              className="section-view-all-btn"
              onClick={() => navigateTo('trending')}
            >
              View All <ArrowRight size={15} />
            </button>
          }
        />
      </section>

      {/* 5. Mid-Page High-Conversion Promotional Banner */}
      <section className="promotional-mid-banner">
        <div className="promo-banner-content">
          <div className="promo-badge">
            <Zap size={13} />
            <span>SEASONAL SUSTAINABLE FESTIVAL</span>
          </div>
          <h2 className="promo-banner-title">
            Switch to Zero-Waste Living with Up to 40% OFF
          </h2>
          <p className="promo-banner-desc">
            Explore 100% plastic-free kitchenware, compostable home essentials, and certified organic textiles. Handcrafted by ethical artisan cooperatives with zero carbon footprint.
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="promo-banner-btn"
              onClick={() => navigateTo('products')}
            >
              Shop Sustainable Festival <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* 6. Budget Deals & Eco Picks Under ₹1500 */}
      {budgetProducts.length > 0 && (
        <section className="merchandising-section">
          <ProductSlider
            title={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={20} style={{ color: 'var(--color-primary)' }} />
                Eco Budget Deals &bull; Under ₹1,500
              </span>
            }
            subtitle="Affordable sustainable alternatives that don't compromise on quality or planet impact"
            products={budgetProducts}
            onViewDetails={(id) => navigateTo(`product/${id}`)}
            onAddToCart={(prod) => addToCart(prod, 1)}
            headerAction={
              <button
                type="button"
                className="section-view-all-btn"
                onClick={() => navigateTo('products')}
              >
                Browse All Deals <ArrowRight size={15} />
              </button>
            }
          />
        </section>
      )}

      {/* 7. Shop By Persona Segment Cards */}
      <section className="merchandising-section">
        <div className="section-header-row">
          <div className="section-title-wrap">
            <h2 className="section-main-title">
              <Leaf size={20} style={{ color: 'var(--color-primary)' }} />
              Shop by Lifestyle & Persona
            </h2>
            <span className="section-sub-title">
              Curated conscious collections tailored for every member of the family
            </span>
          </div>
          <button
            type="button"
            className="section-view-all-btn"
            onClick={() => navigateTo('products')}
          >
            Explore All Segments <ArrowRight size={15} />
          </button>
        </div>

        <div className="segment-cards-grid">
          {segments.map((seg) => {
            const IconComponent = seg.icon;
            return (
              <div
                key={seg.key}
                className="segment-card"
                onClick={() => navigateTo(seg.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigateTo(seg.key)}
              >
                <div className="segment-card-icon">
                  <IconComponent size={26} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div className="segment-card-title">{seg.title}</div>
                <div className="segment-card-desc">{seg.desc}</div>
                {seg.badge && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <Badge variant="eco" size="sm">
                      {seg.badge}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. AI Innovation & Machine Learning Showcase */}
      <section className="ai-showcase-section">
        <div className="section-title-wrap">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-primary)', fontWeight: 800, fontSize: '0.8125rem' }}>
            <Sparkles size={16} />
            <span>AI-POWERED COMMERCE</span>
          </div>
          <h2 className="section-main-title" style={{ fontSize: '1.45rem' }}>
            Next-Generation Smart Shopping Technology
          </h2>
          <span className="section-sub-title">
            EcoNext integrates computer vision, machine learning price forecasting, and neural conversational assistants to make conscious buying seamless.
          </span>
        </div>

        <div className="ai-cards-grid">
          {aiFeatures.map((feature, idx) => (
            <div key={idx} className="ai-card">
              <div className="ai-card-icon-wrap">{feature.icon}</div>
              <div className="ai-card-title">{feature.title}</div>
              <div className="ai-card-desc">{feature.description}</div>
              <div className="ai-card-action">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={feature.action}
                  icon={<ArrowRight size={14} />}
                  iconPosition="right"
                >
                  {feature.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9. Personalized Recommendations (When Authenticated) */}
      {isAuthenticated && (
        <section className="merchandising-section">
          <RecommendationWidget />
        </section>
      )}

      {/* 10. Verified Full Marketplace Catalog Grid (4-5 Column Dense Grid) */}
      <section className="merchandising-section">
        <div className="section-header-row">
          <div className="section-title-wrap">
            <h2 className="section-main-title">
              <TrendingUp size={20} style={{ color: 'var(--color-primary)' }} />
              Explore Full Marketplace Catalog
            </h2>
            <span className="section-sub-title">
              All items verified for sustainable sourcing, fair-trade manufacturing, and recyclable packaging
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

      {/* 11. Sustainability & ESG Impact Trust Banner */}
      <section className="sustainability-trust-card">
        <div className="trust-card-content">
          <Badge variant="eco" size="sm" icon={<Leaf size={12} />}>
            Verified ESG Commitment
          </Badge>
          <h2 className="trust-card-title">
            100% Transparent Sustainability. Zero Greenwashing.
          </h2>
          <p className="trust-card-desc">
            Every product on EcoNext passes our strict 4-point verification framework: fair-trade labor, non-toxic organic materials, plastic-free packaging, and certified carbon-neutral shipping.
          </p>
        </div>

        <div className="trust-card-stats">
          <div className="trust-stat-box">
            <div className="trust-stat-num">100%</div>
            <div className="trust-stat-label">Verified Certifications</div>
          </div>
          <div className="trust-stat-box">
            <div className="trust-stat-num">0 kg</div>
            <div className="trust-stat-label">Net Carbon Footprint</div>
          </div>
          <div className="trust-stat-box">
            <div className="trust-stat-num">4.9/5</div>
            <div className="trust-stat-label">Customer Quality Rating</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
