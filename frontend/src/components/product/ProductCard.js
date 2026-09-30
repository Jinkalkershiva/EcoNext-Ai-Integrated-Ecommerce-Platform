import React, { useState } from 'react';
import { ShoppingCart, Heart, Leaf, TrendingUp } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useCart } from '../../context/CartContext';
import Rating from '../common/Rating';
import Badge from '../common/Badge';
import Button from '../common/Button';
import './ProductCard.css';

export const ProductCard = ({ product, onViewDetails, onAddToCart, children }) => {
  const { navigateTo } = useNavigation();
  const { addToCart } = useCart();
  const [isFavorited, setIsFavorited] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!product) return null;

  const currentPrice = Number(product.current_price || product.price || 0);
  const originalPrice = product.original_price ? Number(product.original_price) : null;
  const categoryName = product.category?.name || product.category_name || product.category || 'Eco Pick';
  const isTrending = Boolean(product.isTrending || product.is_trending);
  const ecoTags = Array.isArray(product.eco_tags) ? product.eco_tags : [];

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(product.id);
    } else {
      navigateTo(`product/${product.id}`);
    }
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    } else {
      addToCart(product, 1);
    }
  };

  const toggleFavorite = (e) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
  };

  const fallbackImage = `https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80`;

  return (
    <div className="product-card">
      {/* Media Image */}
      <div className="product-card-media" onClick={handleCardClick}>
        <img
          src={!imageError && (product.image_url || product.imageUrl) ? (product.image_url || product.imageUrl) : fallbackImage}
          alt={product.name || 'Eco Product'}
          className="product-card-image"
          loading="lazy"
          onError={() => setImageError(true)}
        />

        {/* Badges Overlay */}
        <div className="product-card-badges">
          {isTrending && (
            <Badge variant="accent" size="sm" icon={<TrendingUp size={12} />}>
              Trending
            </Badge>
          )}
          {ecoTags.length > 0 && (
            <Badge variant="eco" size="sm" icon={<Leaf size={11} />}>
              {typeof ecoTags[0] === 'object' ? ecoTags[0].name : ecoTags[0]}
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          className={`product-card-fav-btn ${isFavorited ? 'active' : ''}`}
          onClick={toggleFavorite}
          aria-label="Add to favorites"
        >
          <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Body Content */}
      <div className="product-card-body">
        <div className="product-card-category">{categoryName}</div>

        <h3 className="product-card-title" onClick={handleCardClick} title={product.name}>
          {product.name}
        </h3>

        {/* Rating */}
        <Rating
          score={product.rating || (4.5 + (product.id % 5) * 0.1)}
          count={product.reviews_count || (12 + (product.id * 7) % 80)}
        />

        {/* Price Row */}
        <div className="product-card-meta">
          <div className="product-card-price-group">
            <span className="product-card-price">
              ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {originalPrice && originalPrice > currentPrice && (
              <span className="product-card-orig-price">
                ₹{originalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="product-card-actions">
          <Button
            variant="primary"
            size="sm"
            onClick={handleAddClick}
            icon={<ShoppingCart size={15} />}
          >
            Add to Cart
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCardClick}
          >
            Details
          </Button>
        </div>

        {children}
      </div>
    </div>
  );
};

export default ProductCard;
