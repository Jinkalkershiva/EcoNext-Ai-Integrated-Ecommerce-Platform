import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { apiService } from '../api';
import PricePredictorCard from '../components/ai/PricePredictorCard';
import ProductGrid from '../components/product/ProductGrid';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Rating from '../components/common/Rating';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { ArrowLeft, ShoppingCart, ShieldCheck, Truck, Leaf, Check, Share2 } from 'lucide-react';
import './ProductDetailPage.css';

export const ProductDetailPage = ({ productId: propProductId }) => {
  const { params, goBack, navigateTo } = useNavigation();
  const { addToCart } = useCart();

  const idToLoad = propProductId || params.id;

  const [product, setProduct] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [isCopied, setIsCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchProductData = async () => {
      if (!idToLoad) return;
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.getProductDetail(idToLoad);
        if (data && data.status === 'success') {
          setProduct(data.product);
          setSelectedImage(data.product.image_url || data.product.imageUrl || null);
          setPrediction(data.price_prediction);

          if (data.product?.category?.id || data.product?.category_id) {
            const catId = data.product?.category?.id || data.product?.category_id;
            try {
              const rel = await apiService.getCategoryProducts(catId);
              const list = Array.isArray(rel) ? rel : rel.products || [];
              setRelatedProducts(list.filter(p => p.id !== data.product.id).slice(0, 4));
            } catch {
              // Ignore related items fetch error
            }
          }
        } else {
          setError('Product not found or removed.');
        }
      } catch (err) {
        console.error('Error loading product details:', err);
        setError('Failed to load product details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [idToLoad]);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleBuyNow = () => {
    if (product) {
      addToCart(product, quantity);
      navigateTo('checkout');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0' }}>
        <LoadingSpinner text="Retrieving product intelligence & sustainability profile..." fullPage />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container" style={{ padding: '4rem 0' }}>
        <ErrorMessage message={error || 'Product not found'} onRetry={goBack} />
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Button variant="primary" onClick={() => navigateTo('products')}>
            Browse All Products
          </Button>
        </div>
      </div>
    );
  }

  const currentPrice = Number(product.current_price || product.price || 0);
  const ecoTags = Array.isArray(product.eco_tags) ? product.eco_tags : [];
  const inStock = product.stock === undefined || product.stock > 0;

  const primaryImg = product.image_url || product.imageUrl || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80';
  const additionalImgs = Array.isArray(product.additional_images) ? product.additional_images : (Array.isArray(product.additionalImages) ? product.additionalImages : []);
  const allImages = [primaryImg, ...additionalImgs].filter(Boolean);
  const displayImage = selectedImage || primaryImg;

  return (
    <div className="container">
      {/* Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '1rem 0 2rem 0' }}>
        <Button variant="ghost" size="sm" onClick={goBack} icon={<ArrowLeft size={16} />}>
          Back
        </Button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            icon={isCopied ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Share2 size={14} />}
          >
            {isCopied ? 'Link Copied!' : 'Share'}
          </Button>
        </div>
      </div>

      {/* Product Main Split Grid */}
      <div className="product-detail-layout">
        {/* Gallery on Left */}
        <div className="product-gallery-side">
          <div className="product-main-image-frame">
            <img
              src={displayImage}
              alt={product.name}
              className="product-main-image"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80';
              }}
            />
          </div>

          {allImages.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    overflow: 'hidden',
                    border: displayImage === img ? '2px solid var(--color-primary, #059669)' : '1px solid var(--border-subtle, #e2e8f0)',
                    padding: 0,
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-surface-sunken, #f8fafc)',
                    flexShrink: 0
                  }}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: 'var(--bg-surface-sunken)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}
            >
              <Truck size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Carbon-Neutral Free Delivery</span>
            </div>

            <div
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: 'var(--bg-surface-sunken)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}
            >
              <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Verified Eco-Certification</span>
            </div>
          </div>
        </div>

        {/* Info Column on Right */}
        <div className="product-info-side">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <Badge variant="primary" size="sm">
                {product.category?.name || product.category || 'Eco Category'}
              </Badge>
              {ecoTags.map((t, idx) => (
                <Badge key={idx} variant="eco" size="sm" icon={<Leaf size={11} />}>
                  {typeof t === 'object' ? t.name : t}
                </Badge>
              ))}
            </div>

            <h1 className="product-detail-title">{product.name}</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <Rating score={product.rating || 4.7} count={product.reviews_count || 38} size={16} />
              <span style={{ color: inStock ? 'var(--color-success)' : 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                {inStock ? `● In Stock (${product.stock ?? 'Ready'})` : '● Out of Stock'}
              </span>
            </div>
          </div>

          {/* Price Row */}
          <div className="product-detail-price-row">
            <span className="product-detail-current-price">
              ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {product.original_price && (
              <span className="product-detail-orig-price">
                ₹{Number(product.original_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            )}
            <Badge variant="accent" size="sm">
              All taxes included
            </Badge>
          </div>

          {/* AI Price Predictor Widget */}
          {prediction && (
            <PricePredictorCard
              prediction={prediction}
              currentPrice={currentPrice}
            />
          )}

          {/* Quantity and CTA Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Quantity:</span>
              <div className="product-quantity-selector">
                <button
                  type="button"
                  className="product-qty-btn"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="product-qty-value">{quantity}</span>
                <button
                  type="button"
                  className="product-qty-btn"
                  onClick={() => setQuantity(q => q + 1)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="product-cta-buttons-row">
              <Button
                variant="primary"
                size="lg"
                onClick={() => addToCart(product, quantity)}
                icon={<ShoppingCart size={18} />}
                disabled={!inStock}
              >
                Add to Cart
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleBuyNow}
                disabled={!inStock}
              >
                Buy Now
              </Button>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="product-tabs-container">
            <div className="product-tabs-nav">
              <button
                type="button"
                className={`product-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Description
              </button>
              <button
                type="button"
                className={`product-tab-btn ${activeTab === 'sustainability' ? 'active' : ''}`}
                onClick={() => setActiveTab('sustainability')}
              >
                Sustainability Profile
              </button>
              <button
                type="button"
                className={`product-tab-btn ${activeTab === 'shipping' ? 'active' : ''}`}
                onClick={() => setActiveTab('shipping')}
              >
                Shipping & Returns
              </button>
            </div>

            {activeTab === 'overview' && (
              <div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                  {product.description || 'This eco-friendly item is responsibly produced using sustainable materials, renewable energy, and ethical labor standards.'}
                </p>
              </div>
            )}

            {activeTab === 'sustainability' && (
              <div className="sustainability-spec-list">
                <div className="sustainability-spec-item">
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Material Standard
                  </span>
                  <span style={{ fontWeight: 600 }}>100% Organic / Upcycled Materials</span>
                </div>
                <div className="sustainability-spec-item">
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Packaging
                  </span>
                  <span style={{ fontWeight: 600 }}>Zero Plastic, Compostable Box</span>
                </div>
                <div className="sustainability-spec-item">
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Carbon Impact
                  </span>
                  <span style={{ fontWeight: 600 }}>1.8 kg CO₂e Offset Included</span>
                </div>
                <div className="sustainability-spec-item">
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Ethical Labor
                  </span>
                  <span style={{ fontWeight: 600 }}>Fair Trade Certified Partner</span>
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  • <strong>Standard Delivery:</strong> 3-5 business days across India.
                </p>
                <p style={{ marginBottom: '0.5rem' }}>
                  • <strong>Carbon Offset:</strong> All journeys are neutralised via verified solar and afforestation projects.
                </p>
                <p>
                  • <strong>Easy Returns:</strong> 15-day return policy for unopened and undamaged items.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Products Grid */}
      {relatedProducts.length > 0 && (
        <section style={{ marginTop: '5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '3rem' }}>
          <div className="section-header">
            <div className="section-title-group">
              <h2>You Might Also Like</h2>
              <span className="section-subtitle">Similar sustainable products in this category</span>
            </div>
          </div>
          <ProductGrid
            products={relatedProducts}
            onViewDetails={(id) => navigateTo(`product/${id}`)}
          />
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
