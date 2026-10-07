import React, { useState, useCallback } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { apiService } from '../api';
import ProductCard from '../components/product/ProductCard';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { Camera, Upload, X, Search, Sparkles, ArrowLeft, Sun, Target, Focus } from 'lucide-react';
import { motion } from 'framer-motion';
import './VisualSearchPage.css';

export const VisualSearchPage = () => {
  const { navigateTo, goBack } = useNavigation();
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
      setResults([]);
      setError(null);
    } else {
      setError('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!imageFile) {
      setError('Please upload an image first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.visualSearch(imageFile);
      if (response && response.status === 'success') {
        const found = response.results || [];
        setResults(found);
        if (found.length === 0) {
          setError('No matching eco products found for this image. Try another photo!');
        }
      } else {
        setError(response?.message || 'Visual search could not find close matches.');
      }
    } catch (err) {
      console.error('Visual search error:', err);
      setError('Visual search error. Make sure your backend API service is running.');
    } finally {
      setLoading(false);
    }
  }, [imageFile]);

  const clearImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setResults([]);
    setError(null);
  };

  return (
    <div className="container">
      {/* Back Button */}
      <div style={{ margin: '1rem 0 1.5rem 0' }}>
        <Button variant="ghost" size="sm" onClick={goBack} icon={<ArrowLeft size={16} />}>
          Back
        </Button>
      </div>

      {/* Hero Headline */}
      <div className="visual-search-hero">
        <Badge variant="accent" size="sm" icon={<Sparkles size={12} />}>
          Computer Vision AI
        </Badge>
        <h1 style={{ fontSize: '2.5rem', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          Snap & Shop Visual Search
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.5 }}>
          Seen an outfit, bag, or home item you love? Upload an image and our AI will discover identical or closest sustainable alternatives.
        </p>
      </div>

      {/* Upload Zone / Image Preview */}
      {!previewUrl ? (
        <div
          className={`visual-dropzone-box ${dragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('visual-file-input')?.click()}
        >
          <input
            type="file"
            id="visual-file-input"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />

          <div className="visual-upload-icon-circle">
            <Camera size={32} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>
              Drag & Drop your image here
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              or click to browse your photos (JPG, PNG, WEBP up to 10MB)
            </p>
          </div>

          <Button variant="outline" size="sm" icon={<Upload size={14} />}>
            Choose File
          </Button>
        </div>
      ) : (
        <div className="visual-preview-card">
          <img src={previewUrl} alt="Uploaded product preview" className="visual-preview-img" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Image Ready for Analysis</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {imageFile?.name} ({(imageFile?.size / 1024).toFixed(0)} KB)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="md"
                onClick={handleSearch}
                loading={loading}
                icon={<Search size={16} />}
              >
                {loading ? 'Analyzing with Computer Vision...' : 'Find Eco Matches'}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={clearImage}
                disabled={loading}
                icon={<X size={16} />}
              >
                Change Photo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <ErrorMessage message={error} style={{ maxWidth: '720px', margin: '0 auto 2rem auto' }} />}

      {/* Loading State */}
      {loading && (
        <div style={{ padding: '3rem 0', textAlign: 'center' }}>
          <LoadingSpinner text="Scanning catalog vectors and matching materials..." fullPage />
        </div>
      )}

      {/* Search Results Grid */}
      {results.length > 0 && !loading && (
        <section style={{ marginTop: '3rem' }}>
          <div className="section-header">
            <div className="section-title-group">
              <h2>Visually Similar Eco Products</h2>
              <span className="section-subtitle">
                Found {results.length} sustainable matches ranked by visual feature similarity
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {results.map(({ product, similarity_score }, idx) => (
              <motion.div
                key={product.id || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <ProductCard
                  product={product}
                  onViewDetails={() => navigateTo(`product/${product.id}`)}
                >
                  {similarity_score !== undefined && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.35rem 0.6rem',
                        backgroundColor: 'var(--color-primary-subtle)',
                        color: 'var(--color-primary)',
                        border: '1px solid var(--color-primary-light)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Target size={13} aria-hidden="true" />
                      <span>{Math.round(similarity_score * 100)}% Visual Match</span>
                    </div>
                  )}
                </ProductCard>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Tips Section */}
      <div className="visual-tips-grid">
        <div className="visual-tip-card">
          <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <Sun size={18} /> Good Lighting
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Take pictures in bright natural light to capture true fabric colors and textures.
          </p>
        </div>

        <div className="visual-tip-card">
          <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <Focus size={18} /> Single Item Focus
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Crop the photo tightly around the specific shoe, apparel, or bottle you want to find.
          </p>
        </div>

        <div className="visual-tip-card">
          <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <Target size={18} /> Plain Background
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Neutral backgrounds yield the highest accuracy similarity matching scores.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VisualSearchPage;
