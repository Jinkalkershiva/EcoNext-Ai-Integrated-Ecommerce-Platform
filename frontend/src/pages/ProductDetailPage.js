import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useCart } from '../context/CartContext';
import { apiService } from '../api';
import PricePredictorCard from '../components/ai/PricePredictorCard';
import ProductGrid from '../components/product/ProductGrid';
import ProductReviews from '../components/product/ProductReviews';
import ProductInquiryModal from '../components/product/ProductInquiryModal';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Rating from '../components/common/Rating';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import {
  ArrowLeft,
  ShoppingCart,
  ShieldCheck,
  Truck,
  Leaf,
  Check,
  Share2,
  Zap,
  RotateCcw,
  BadgePercent,
  MessageSquare,
  CheckCircle,
  XCircle
} from 'lucide-react';
import './ProductDetailPage.css';

export const ProductDetailPage = ({ productId: propProductId }) => {
  const { params, goBack, navigateTo } = useNavigation();
  const { addToCart } = useCart();

  const idToLoad = propProductId || params.id;

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [isCopied, setIsCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);

  useEffect(() => {
    const fetchProductData = async () => {
      if (!idToLoad) return;
      setLoading(true);
      setError(null);
      setImageError(false);
      try {
        const data = await apiService.getProductDetail(idToLoad);
        if (data && data.status === 'success') {
          const prod = data.product;
          setProduct(prod);
          setSelectedImage(prod.image_url || prod.imageUrl || null);
          setPrediction(data.price_prediction);

          // Auto-select first active variant if exists
          const variants = Array.isArray(prod.variants) ? prod.variants : [];
          if (variants.length > 0) {
            const activeVar = variants.find(v => v.stock > 0 && v.is_active !== false) || variants[0];
            setSelectedVariant(activeVar);
          } else {
            setSelectedVariant(null);
          }

          if (prod?.category?.id || prod?.category_id) {
            const catId = prod?.category?.id || prod?.category_id;
            try {
              const rel = await apiService.getCategoryProducts(catId);
              const list = Array.isArray(rel) ? rel : rel.products || [];
              setRelatedProducts(list.filter(p => p.id !== prod.id).slice(0, 4));
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

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity, selectedVariant);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2500);
    }
  };

  const handleBuyNow = () => {
    if (product) {
      addToCart(product, quantity, selectedVariant);
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

  // Dynamic price resolution based on selected variant
  const currentPrice = selectedVariant
    ? Number(selectedVariant.price)
    : Number(product.current_price || product.price || 0);

  const originalPrice = selectedVariant && selectedVariant.original_price
    ? Number(selectedVariant.original_price)
    : (product.original_price ? Number(product.original_price) : null);

  const discountPercent = originalPrice && originalPrice > currentPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : null;

  const currentStock = selectedVariant !== null && selectedVariant !== undefined
    ? Number(selectedVariant.stock ?? 0)
    : Number(product.stock ?? 10);

  const inStock = currentStock > 0;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const ecoTags = Array.isArray(product.eco_tags) ? product.eco_tags : [];

  const primaryImg = product.image_url || product.imageUrl || '';
  const additionalImgs = Array.isArray(product.additional_images) ? product.additional_images : (Array.isArray(product.additionalImages) ? product.additionalImages : []);
  const allImages = [primaryImg, ...additionalImgs].filter(Boolean);
  const displayImage = selectedImage || primaryImg;

  // Estimated delivery date (3 days from now)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 3);
  const deliveryDateStr = deliveryDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="container">
      {/* Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '1rem 0 1.5rem 0' }}>
        <Button variant="ghost" size="sm" onClick={goBack} icon={<ArrowLeft size={16} />}>
          Back
        </Button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsInquiryModalOpen(true)}
            icon={<MessageSquare size={14} />}
          >
            Ask Questions
          </Button>
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
            {displayImage && !imageError ? (
              <img
                src={displayImage}
                alt={product.name}
                className="product-main-image"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '380px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--bg-surface-sunken, #f8fafc)',
                  color: 'var(--text-muted, #64748b)',
                  fontSize: '1rem',
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md, 8px)',
                }}
              >
                Image unavailable
              </div>
            )}
          </div>

          {allImages.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    overflow: 'hidden',
                    border: displayImage === img ? '2.5px solid var(--color-primary, #059669)' : '1px solid var(--border-subtle, #e2e8f0)',
                    padding: 0,
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-surface-sunken, #f8fafc)',
                    flexShrink: 0,
                    boxShadow: displayImage === img ? '0 0 0 1px var(--color-primary, #059669)' : 'none'
                  }}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}

          {/* Value Badges Banner */}
          <div className="product-value-props-grid">
            <div className="value-prop-card">
              <Truck size={18} style={{ color: 'var(--color-primary)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Free Carbon-Neutral Delivery</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Orders dispatched in 24 hrs</div>
              </div>
            </div>

            <div className="value-prop-card">
              <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>100% Verified Sustainable</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Eco-grade materials & audit</div>
              </div>
            </div>

            <div className="value-prop-card">
              <RotateCcw size={18} style={{ color: 'var(--color-primary)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>7-Day Easy Returns</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Doorstep QC & instant refund</div>
              </div>
            </div>

            <div className="value-prop-card">
              <Zap size={18} style={{ color: 'var(--color-primary)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Cash on Delivery</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pay at doorstep with OTP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Column on Right */}
        <div className="product-info-side">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
              <Badge variant="primary" size="sm">
                {product.category?.name || product.category || 'Sustainable Catalog'}
              </Badge>
              {ecoTags.map((t, idx) => (
                <Badge key={idx} variant="eco" size="sm" icon={<Leaf size={11} />}>
                  {typeof t === 'object' ? t.name : t}
                </Badge>
              ))}
            </div>

            <h1 className="product-detail-title">{product.name}</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
              <a href="#product-reviews-section" style={{ textDecoration: 'none' }}>
                <Rating score={Number(product.rating || 0)} count={Number(product.reviews_count || product.ratings_count || 0)} size={16} />
              </a>
              <span className={`stock-status-tag ${inStock ? 'in-stock' : 'out-of-stock'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                {inStock ? <CheckCircle size={13} aria-hidden="true" /> : <XCircle size={13} aria-hidden="true" />}
                <span>{inStock ? `In Stock (${currentStock} available)` : 'Out of Stock'}</span>
              </span>
            </div>
          </div>

          {/* Dynamic Variant / Size-Based Pricing Row */}
          <div className="product-detail-price-card">
            <div className="product-detail-price-row">
              <span className="product-detail-current-price">
                ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {originalPrice && originalPrice > currentPrice && (
                <span className="product-detail-orig-price">
                  ₹{originalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              )}
              {discountPercent && (
                <span className="product-discount-pill">
                  <BadgePercent size={13} /> {discountPercent}% OFF
                </span>
              )}
            </div>

            <div className="product-tax-delivery-info">
              <span>Inclusive of all taxes</span>
              <span>•</span>
              <span className="free-delivery-badge">Free Delivery</span>
              <span>•</span>
              <span>Delivery by <strong>{deliveryDateStr}</strong></span>
            </div>
          </div>

          {/* Product Variants & Size Selector */}
          {variants.length > 0 && (
            <div className="variants-selector-box">
              <div className="variants-header-label">
                <span>Select Size / Variant:</span>
                {selectedVariant && (
                  <span className="selected-variant-text">
                    {selectedVariant.size || selectedVariant.sku} — <strong>₹{Number(selectedVariant.price).toLocaleString('en-IN')}</strong>
                  </span>
                )}
              </div>

              <div className="variants-pill-grid">
                {variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const isOutOfStock = v.stock <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => setSelectedVariant(v)}
                      className={`variant-pill-btn ${isSelected ? 'selected' : ''} ${isOutOfStock ? 'disabled' : ''}`}
                    >
                      <div className="variant-size-name">{v.size || v.sku}</div>
                      <div className="variant-price-tag">₹{Number(v.price).toLocaleString('en-IN')}</div>
                      {isOutOfStock && <span className="variant-sold-out-badge">Out of Stock</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Price Predictor Widget */}
          {prediction && (
            <PricePredictorCard
              prediction={prediction}
              currentPrice={currentPrice}
            />
          )}

          {/* Quantity and CTA Buttons */}
          <div className="product-cta-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Quantity:</span>
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
                  onClick={() => setQuantity(q => Math.min(currentStock || 10, q + 1))}
                  disabled={quantity >= currentStock}
                >
                  +
                </button>
              </div>
            </div>

            <div className="product-cta-buttons-row">
              <Button
                variant="primary"
                size="lg"
                onClick={handleAddToCart}
                icon={addedSuccess ? <Check size={18} /> : <ShoppingCart size={18} />}
                disabled={!inStock}
              >
                {addedSuccess ? 'Added to Cart' : 'Add to Cart'}
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
                Product Details
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
                Shipping & Easy Returns
              </button>
            </div>

            {activeTab === 'overview' && (
              <div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: '0.95rem' }}>
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
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65 }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  • <strong>Standard Delivery:</strong> 3-5 business days across India with carbon-neutral transit.
                </p>
                <p style={{ marginBottom: '0.5rem' }}>
                  • <strong>Delivery Verification:</strong> Secured by delivery OTP at your doorstep.
                </p>
                <p>
                  • <strong>7-Day Returns:</strong> Hassle-free returns with quality inspection and automated refunds.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ratings and Customer Verified Reviews Component */}
      <ProductReviews
        productId={product.id}
      />

      {/* Related Products Grid */}
      {relatedProducts.length > 0 && (
        <section style={{ marginTop: '5rem', borderTop: '1.5px solid var(--border-subtle)', paddingTop: '3rem' }}>
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
      {/* Product Inquiry & AI Assistant Modal */}
      <ProductInquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        product={product}
        selectedVariant={selectedVariant}
      />
    </div>
  );
};

export default ProductDetailPage;
