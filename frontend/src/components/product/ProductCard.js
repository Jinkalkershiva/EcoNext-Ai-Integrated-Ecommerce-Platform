import React, { useState } from 'react';
import { ShoppingBag, Heart, Leaf, TrendingUp, Star, Eye, Truck } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useCart } from '../../context/CartContext';
import './ProductCard.css';

export const ProductCard = ({ product: rawProduct, onViewDetails, onAddToCart, children }) => {
  const { navigateTo } = useNavigation();
  const { addToCart } = useCart();
  const [isFavorited, setIsFavorited] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Safely extract product object in case endpoint returned wrapped format { product: {...}, rank }
  const product = rawProduct?.product || rawProduct;

  if (!product) return null;

  const currentPrice = Number(product.current_price || product.price || 0);
  const originalPrice = product.original_price ? Number(product.original_price) : null;
  const discountPercent = originalPrice && originalPrice > currentPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : (product.discount_percent || null);

  const categoryName = product.category?.name || product.category_name || (typeof product.category === 'string' ? product.category : null) || 'Sustainable Pick';
  const isTrending = Boolean(product.isTrending || product.is_trending || (product.id && product.id % 3 === 0));
  const ecoTags = Array.isArray(product.eco_tags) ? product.eco_tags : [];
  const primaryEcoTag = ecoTags.length > 0 ? (typeof ecoTags[0] === 'object' ? ecoTags[0].name : ecoTags[0]) : '100% Eco-Certified';

  const reviewsCount = Number(product.reviews_count || product.ratings_count || 0);
  const ratingScore = product.rating && Number(product.rating) > 0 ? Number(product.rating).toFixed(1) : null;

  // Extract available sizes from variants if present
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const availableSizes = variants.map(v => v.size || v.sku).filter(Boolean);

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(product.id);
    } else {
      navigateTo(`product/${product.id}`);
    }
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    const defaultVariant = variants.length > 0 ? variants.find(v => v.stock > 0) || variants[0] : null;
    if (onAddToCart) {
      onAddToCart(product, defaultVariant);
    } else {
      addToCart(product, 1, defaultVariant);
    }
  };

  const toggleFavorite = (e) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
  };

  const dbImageUrl = product.image_url || product.imageUrl || product.image;

  return (
    <div className="product-card">
      {/* 1. Media Image with Floating Badges */}
      <div className="product-card-media" onClick={handleCardClick}>
        {!imageError && dbImageUrl ? (
          <img
            src={dbImageUrl}
            alt={product.name || 'EcoNext'}
            className="product-card-image"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="product-card-image-placeholder">
            <Leaf size={28} style={{ opacity: 0.5, color: 'var(--color-primary)' }} />
            <span>{product.name || 'EcoNext'}</span>
          </div>
        )}

        {/* Floating Badges */}
        <div className="product-card-badges">
          {discountPercent && discountPercent > 0 ? (
            <span className="product-badge-discount">{discountPercent}% OFF</span>
          ) : null}
          {isTrending && (
            <span className="product-badge-trending">
              <TrendingUp size={11} /> Trending
            </span>
          )}
          {primaryEcoTag && (
            <span className="product-badge-eco">
              <Leaf size={10} /> {primaryEcoTag}
            </span>
          )}
        </div>

        {/* Wishlist Heart Toggle */}
        <button
          type="button"
          className={`product-card-fav-btn ${isFavorited ? 'active' : ''}`}
          onClick={toggleFavorite}
          aria-label={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
          title={isFavorited ? 'In Wishlist' : 'Add to Wishlist'}
        >
          <Heart size={15} fill={isFavorited ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* 2. Product Card Body */}
      <div className="product-card-body">
        <span className="product-card-category">{categoryName}</span>

        <h3 className="product-card-title" onClick={handleCardClick} title={product.name}>
          {product.name}
        </h3>

        {/* Rating Row */}
        <div className="product-card-rating">
          {ratingScore && reviewsCount > 0 ? (
            <>
              <span className="product-card-rating-chip">
                <Star size={11} fill="currentColor" />
                <span>{ratingScore}</span>
              </span>
              <span className="product-card-reviews-count">({reviewsCount})</span>
            </>
          ) : (
            <span
              className="product-card-reviews-count"
              style={{
                fontStyle: 'normal',
                color: 'var(--color-primary)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Leaf size={11} aria-hidden="true" />
              <span>Sustainable</span>
            </span>
          )}
          <span className="product-free-delivery-tag">
            <Truck size={10} /> Free Delivery
          </span>
        </div>

        {/* Available Sizes preview if exists */}
        {availableSizes.length > 0 && (
          <div className="product-card-sizes-row">
            <span className="sizes-label">Sizes:</span>
            <span className="sizes-list">
              {availableSizes.slice(0, 5).join(', ')}{availableSizes.length > 5 ? ` +${availableSizes.length - 5}` : ''}
            </span>
          </div>
        )}

        {/* Price & Discount */}
        <div className="product-card-meta">
          <div className="product-card-price-group">
            <span className="product-card-price">
              ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
            {originalPrice && originalPrice > currentPrice && (
              <span className="product-card-orig-price">
                ₹{originalPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            )}
            {discountPercent && discountPercent > 0 && (
              <span className="product-card-discount-tag">{discountPercent}% off</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="product-card-actions">
          <button
            type="button"
            className="product-add-cart-btn"
            onClick={handleAddClick}
          >
            <ShoppingBag size={14} />
            <span>Add to Cart</span>
          </button>
          <button
            type="button"
            className="product-details-btn"
            onClick={handleCardClick}
            title="View Details"
          >
            <Eye size={14} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};

export default ProductCard;
