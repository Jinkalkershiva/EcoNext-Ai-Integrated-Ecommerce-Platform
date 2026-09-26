import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, TrendingUp } from 'lucide-react';
import styles from './ProductCard.module.css';

export const ProductCard = ({ product, onAddCart, onViewDetails, children }) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    },
    hover: {
      y: -8,
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
      transition: { duration: 0.3 }
    }
  };

  const imageVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.1 },
    whileTap: { scale: 0.95 }
  };

  const badgeVariants = {
    initial: { scale: 0, rotate: -45 },
    animate: { scale: 1, rotate: 0 },
  };

  return (
    <motion.div
      className={styles.card}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      transition={{ duration: 0.3 }}
    >
      {/* Image Container */}
      <motion.div className={styles.imageContainer}>
        <motion.img
          src={product.image_url || 'https://via.placeholder.com/250'}
          alt={product.name}
          className={styles.image}
          variants={imageVariants}
          whileHover="hover"
          whileTap="whileTap"
          onLoad={() => setIsImageLoaded(true)}
        />
        {!isImageLoaded && (
          <motion.div
            className={styles.skeleton}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Badge */}
        {product.isTrending && (
          <motion.div
            className={styles.badge}
            variants={badgeVariants}
            animate="animate"
          >
            <TrendingUp size={16} />
            <span>Trending</span>
          </motion.div>
        )}

        {/* Favorite Button */}
        <motion.button
          className={styles.favoriteBtn}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsFavorited(!isFavorited)}
        >
          <Heart
            size={20}
            fill={isFavorited ? 'currentColor' : 'none'}
            color={isFavorited ? '#f44336' : '#999'}
          />
        </motion.button>
      </motion.div>

      {/* Content */}
      <div className={styles.content}>
        <motion.h3
          className={styles.title}
          whileHover={{ color: '#4CAF50' }}
        >
          {product.name}
        </motion.h3>

        <p className={styles.description}>
          {product.description?.substring(0, 60) || 'No description'}...
        </p>

        {/* Price Section */}
        <div className={styles.priceSection}>
          <motion.div
            className={styles.price}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            ₹{product.current_price ? Number(product.current_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (product.price ? Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00')}
          </motion.div>
          {product.originalPrice && (
            <motion.span
              className={styles.originalPrice}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              ₹{Number(product.originalPrice).toFixed(2)}
            </motion.span>
          )}
        </div>

        {/* Rating */}
        {product.rating && (
          <div className={styles.rating}>
            {'⭐'.repeat(Math.floor(product.rating))}
            <span className={styles.ratingText}>({product.rating})</span>
          </div>
        )}

        {/* Actions */}
        <motion.div
          className={styles.actions}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            className={styles.detailsBtn}
            whileHover={{ scale: 1.05, backgroundColor: '#45a049' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewDetails(product.id)}
          >
            View Details
          </motion.button>
          <motion.button
            className={styles.cartBtn}
            whileHover={{ scale: 1.05, backgroundColor: '#1976D2' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddCart && onAddCart(product)}
          >
            <ShoppingCart size={18} />
            Add to Cart
          </motion.button>
        </motion.div>
        {children}
      </div>
    </motion.div>
  );
};

export default ProductCard;
