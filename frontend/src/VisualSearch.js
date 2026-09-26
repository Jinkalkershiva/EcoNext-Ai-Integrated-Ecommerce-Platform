import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Search, X, AlertCircle, ChevronLeft } from 'lucide-react';
import { apiService } from './api';
import { ProductCard } from './components';
import { AnimatedButton } from './components';

const VisualSearch = ({ onBack, onProductClick }) => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setResults([]);
      setError(null);
    } else {
      setError('Please select a valid image file.');
      setImage(null);
      setImagePreview(null);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!image) {
      setError('Please select an image first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.visualSearch(image);
      if (response.status === 'success') {
        setResults(response.results || []);
        if (!response.results || response.results.length === 0) {
          setError('No similar products found. Try a different image.');
        }
      } else {
        setError(response.message || response.detail || 'Search failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred during the search.');
      console.error(err);
    }
    setLoading(false);
  }, [image]);

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    setResults([]);
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="visual-search-container"
      style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}
    >
      <AnimatedButton onClick={onBack} variant="outline" style={{ marginBottom: '2rem' }}>
        <ChevronLeft size={16} /> Back to Home
      </AnimatedButton>

      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Snap & Shop</h1>
        <p style={{ fontSize: '1.2rem', color: '#666' }}>Upload an image to find visually similar products.</p>
      </div>

      <div className="upload-area" style={{
        border: '2px dashed #ddd',
        borderRadius: '12px',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#fafafa',
        marginBottom: '2rem',
        position: 'relative'
      }}>
        <AnimatePresence>
          {imagePreview ? (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <img src={imagePreview} alt="Preview" style={{ maxHeight: '200px', borderRadius: '8px', marginBottom: '1rem' }} />
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <AnimatedButton onClick={handleSearch} disabled={loading}>
                  <Search size={18} /> {loading ? 'Searching...' : 'Search for Similar Items'}
                </AnimatedButton>
                <AnimatedButton onClick={clearImage} variant="danger" outline>
                  <X size={18} /> Remove Image
                </AnimatedButton>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <input
                type="file"
                id="visual-search-upload"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="visual-search-upload" style={{ cursor: 'pointer' }}>
                <Upload size={48} style={{ color: '#3B82F6', marginBottom: '1rem' }} />
                <p style={{ color: '#555', fontSize: '1.1rem' }}>
                  Click to upload or drag and drop an image
                </p>
                <p style={{ color: '#888' }}>PNG, JPG, GIF up to 10MB</p>
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '1rem',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '2rem'
          }}
        >
          <AlertCircle size={20} /> {error}
        </motion.div>
      )}

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '2rem' }}
          >
            <div className="loader" />
            <p style={{ marginTop: '1rem', color: '#555' }}>Analyzing image and finding matches...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {results.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 style={{ marginBottom: '1.5rem' }}>Search Results</h2>
            <div className="product-grid">
              {results.map(({ product, similarity_score }) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ProductCard
                    product={product}
                    onViewDetails={() => onProductClick(product.id)}
                  >
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#E0E7FF',
                      color: '#3730A3',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      textAlign: 'center'
                    }}>
                      {Math.round(similarity_score * 100)}% Match
                    </div>
                  </ProductCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VisualSearch;
