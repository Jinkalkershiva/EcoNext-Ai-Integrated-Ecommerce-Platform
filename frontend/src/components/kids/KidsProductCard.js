import React, { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useCart } from '../../context/CartContext';
import './KidsProductCard.css';

export const KidsProductCard = ({
  product,
  index = 0,
  onViewDetails,
  onAddToCart,
}) => {
  const { navigateTo } = useNavigation();
  const { addToCart } = useCart();
  const [imgError, setImgError] = useState(false);

  if (!product) return null;

  // Colorful pastel-like cycling background colors for headers from the reference
  const headerColors = [
    'var(--color-secondary, #0FBF9F)',
    'var(--color-accent, #FF9142)',
    'var(--color-tertiary, #7B61FF)',
    'var(--color-primary, #FF5D8F)',
    'var(--color-quaternary, #FFC94A)',
  ];

  const badges = ['Eco Pick', 'Best Seller', 'New', 'Popular', 'Trending'];
  const emojis = ['🌱', '🧸', '🎨', '📚', '👕', '🧼', '🎒'];

  const chosenColor = headerColors[index % headerColors.length];
  const chosenBadge =
    (product.eco_tags && product.eco_tags[0]?.name) ||
    badges[index % badges.length];
  const chosenEmoji = emojis[index % emojis.length];

  const price = Number(product.current_price || product.price || 0);

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

  return (
    <div className="kids-card">
      <div
        className="kids-card-thumb"
        style={{ backgroundColor: chosenColor }}
        onClick={handleCardClick}
      >
        {!imgError && product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="kids-card-img"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="kids-card-fallback-emoji">{chosenEmoji}</span>
        )}
      </div>

      <div className="kids-card-info">
        <span
          className="kids-card-badge"
          style={{
            backgroundColor: chosenColor,
            color: index % 5 === 4 ? '#3A2E10' : '#FFFFFF',
          }}
        >
          {chosenBadge}
        </span>

        <h3
          className="kids-card-title"
          onClick={handleCardClick}
          title={product.name}
        >
          {product.name}
        </h3>

        <div className="kids-card-price-row">
          <div className="kids-card-price">
            ₹
            {price.toLocaleString('en-IN', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </div>

          <button
            type="button"
            className="kids-card-add-btn"
            onClick={handleAddClick}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingBag size={13} />
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default KidsProductCard;
