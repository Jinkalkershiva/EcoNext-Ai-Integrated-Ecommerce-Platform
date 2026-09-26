import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ShoppingCart, AlertCircle } from 'lucide-react';
import { apiService } from './api';
import { AnimatedButton, PricePredictorCard } from './components';

export const ProductDetailView = ({ productId, onAddToCart, onBack }) => {
  const [product, setProduct] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.getProductDetail(productId);
        if (data.status === 'success') {
          setProduct(data.product);
          setPrediction(data.price_prediction);
        } else {
          setError('Failed to load product');
        }
      } catch (err) {
        console.error('Error loading product:', err);
        setError('Failed to load product');
      }
      setLoading(false);
    };
    loadProduct();
  }, [productId]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="loading"></div>
        <p>Loading product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
        <AlertCircle size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <h2>Product not found</h2>
        <p>{error || "The product you're looking for doesn't exist or has been removed."}</p>
        <AnimatedButton onClick={onBack} variant="primary">
          <ChevronLeft size={20} />
          Go Back
        </AnimatedButton>
      </div>
    );
  }

  return (
    <motion.div
      className="product-detail"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Back Button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <AnimatedButton
          onClick={onBack}
          variant="outline"
          size="sm"
        >
          <ChevronLeft size={18} />
          Back
        </AnimatedButton>
      </div>

      {/* Main Content */}
      <div className="product-detail-grid">
        {/* Image */}
        <div className="product-detail-image">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              style={{ width: '100%', height: 'auto', borderRadius: '12px', display: 'block' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="no-image">No Image Available</div>
          )}
        </div>

        {/* Details */}
        <div className="product-detail-content">
          {/* Title */}
          <h1>{product.name}</h1>

          {/* Category */}
          <p className="product-category-text">
            {product.category?.name || 'Uncategorized'}
          </p>

          {/* Price */}
          <div className="price-section">
            <div className="current-price">
              ₹{product.current_price ? Number(product.current_price).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
            </div>
          </div>

          {/* Price Predictor Component */}
          {prediction && (
            <PricePredictorCard
              prediction={prediction}
              currentPrice={product.current_price}
            />
          )}

          {/* Description */}
          {product.description && (
            <div className="description-section">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>
          )}

          {/* Stock Status */}
          {product.stock !== undefined && (
            <div className="stock-section">
              <span className={`stock-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                {product.stock > 0 ? `✓ In Stock (${product.stock})` : 'Out of Stock'}
              </span>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {product.tags.map((tag, idx) => (
                <span key={idx} style={{
                  background: '#E8F5E9',
                  color: '#2E7D32',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="action-buttons" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <AnimatedButton
              onClick={() => onAddToCart(product)}
              variant="primary"
              size="lg"
            >
              <ShoppingCart size={20} />
              Add to Cart
            </AnimatedButton>
            <AnimatedButton
              onClick={onBack}
              variant="outline"
              size="lg"
            >
              Continue Shopping
            </AnimatedButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductDetailView;
