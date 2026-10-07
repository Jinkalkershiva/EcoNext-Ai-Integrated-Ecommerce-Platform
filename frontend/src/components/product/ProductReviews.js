import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api';
import { Star, CheckCircle, ThumbsUp, Camera, X, Plus, ChevronDown, MessageSquare } from 'lucide-react';
import Button from '../common/Button';
import './ProductReviews.css';

export const ProductReviews = ({ productId }) => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({
    average_rating: 0.0,
    ratings_count: 0,
    reviews_count: 0,
    rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    customer_photos: []
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState({});
  const [activePhotoModal, setActivePhotoModal] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);

  const fetchInitialReviews = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const data = await apiService.getProductReviews(productId, 1, 2);
      if (data && data.status === 'success') {
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setHasMore(Boolean(data.has_more));
        setPage(1);
        if (data.summary) {
          setSummary(data.summary);
        } else {
          setSummary({
            average_rating: data.average_rating || 0.0,
            ratings_count: data.total_ratings || 0,
            reviews_count: data.total_reviews || 0,
            rating_distribution: data.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            customer_photos: data.customer_photos || []
          });
        }
      }
    } catch (err) {
      console.error('Failed to load product reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchInitialReviews();
  }, [fetchInitialReviews]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const data = await apiService.getProductReviews(productId, nextPage, 4);
      if (data && data.status === 'success') {
        const newReviews = Array.isArray(data.reviews) ? data.reviews : [];
        setReviews(prev => [...prev, ...newReviews]);
        setHasMore(Boolean(data.has_more));
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Failed to load more reviews:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleHelpfulClick = async (reviewId) => {
    if (helpfulVotes[reviewId]) return;
    try {
      const res = await apiService.markReviewHelpful(reviewId);
      if (res && res.status === 'success') {
        setHelpfulVotes(prev => ({ ...prev, [reviewId]: true }));
        setReviews(prev =>
          prev.map(r => (r.id === reviewId ? { ...r, helpful_votes: res.helpful_votes } : r))
        );
      }
    } catch (err) {
      console.error('Failed to vote helpful:', err);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 5) {
      alert('You can upload up to 5 photos.');
      return;
    }
    const newFiles = [...selectedFiles, ...files].slice(0, 5);
    setSelectedFiles(newFiles);

    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setFilePreviews(newPreviews);
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    const newPreviews = filePreviews.filter((_, i) => i !== index);
    setFilePreviews(newPreviews);
  };

  const handleSubmitReview = async (e) => {
    if (e) e.preventDefault();
    if (submitting) return; // Prevent double-clicks

    if (!isAuthenticated) {
      setSubmitError('Please log in to submit a review.');
      return;
    }
    if (!comment.trim()) {
      setSubmitError('Review text is required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      let res;
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        formData.append('rating', String(rating));
        if (title.trim()) formData.append('title', title.trim());
        formData.append('comment', comment.trim());
        selectedFiles.forEach(file => {
          formData.append('images', file);
        });
        res = await apiService.submitProductReview(productId, formData);
      } else {
        res = await apiService.submitProductReview(productId, {
          rating,
          title: title.trim(),
          comment: comment.trim()
        });
      }

      if (res && res.status === 'success') {
        setSubmitSuccess(true);
        setTimeout(() => {
          setIsModalOpen(false);
          setSubmitSuccess(false);
          setTitle('');
          setComment('');
          setSelectedFiles([]);
          setFilePreviews([]);
          fetchInitialReviews();
        }, 1200);
      } else {
        setSubmitError(res?.message || 'Unable to save the review. Please try again.');
      }
    } catch (err) {
      console.error('Submit review error:', err);
      if (err.status === 401) {
        setSubmitError('Please log in to submit a review.');
      } else if (err.status === 403) {
        setSubmitError('You are not eligible to submit this review.');
      } else if (err.status === 400) {
        setSubmitError(err.message || 'Please check your review details and try again.');
      } else if (err.status >= 500) {
        setSubmitError('Unable to save the review. Please try again.');
      } else {
        setSubmitError(err.message || 'Unable to reach EcoNext server.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = Number(summary.average_rating || 0).toFixed(1);
  const totalReviewsCount = summary.reviews_count || summary.ratings_count || 0;
  const dist = summary.rating_distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const customerPhotos = Array.isArray(summary.customer_photos) ? summary.customer_photos : [];

  return (
    <div className="reviews-section-container" id="product-reviews-section">
      {/* 1. Header Bar */}
      <div className="reviews-header-bar">
        <div>
          <h2 className="reviews-main-title">Ratings & Customer Reviews</h2>
          <span className="reviews-sub-label">
            {totalReviewsCount > 0
              ? `Real verified buyer feedback from ${totalReviewsCount} review${totalReviewsCount === 1 ? '' : 's'}`
              : 'Authentic feedback from verified EcoNext buyers'}
          </span>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            if (!isAuthenticated) {
              alert('Please sign in to write a customer review.');
              return;
            }
            setSubmitError(null);
            setIsModalOpen(true);
          }}
          icon={<Plus size={16} />}
        >
          Write a Review
        </Button>
      </div>

      {/* 2. Rating Summary & Distribution Scorecard */}
      <div className="rating-summary-grid">
        <div className="rating-score-box">
          <div className="big-rating-number">{avgRating}</div>
          <div className="rating-stars-row">
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                size={20}
                fill={s <= Math.round(Number(avgRating)) && Number(avgRating) > 0 ? '#F59E0B' : 'none'}
                color={s <= Math.round(Number(avgRating)) && Number(avgRating) > 0 ? '#F59E0B' : '#D1D5DB'}
              />
            ))}
          </div>
          <div className="rating-count-label">
            {totalReviewsCount > 0
              ? `${totalReviewsCount} Verified Rating${totalReviewsCount === 1 ? '' : 's'}`
              : 'No ratings yet'}
          </div>
        </div>

        <div className="rating-distribution-list">
          {[5, 4, 3, 2, 1].map(stars => {
            const count = dist[stars] || 0;
            const percentage = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
            const classMap = { 5: 'five', 4: 'four', 3: 'three', 2: 'two', 1: 'one' };
            return (
              <div key={stars} className="distribution-row">
                <span className="distribution-label">
                  {stars} <Star size={11} fill="#F59E0B" color="#F59E0B" />
                </span>
                <div className="distribution-track">
                  <div
                    className={`distribution-fill ${classMap[stars]}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="distribution-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Customer Photo Strip */}
      {customerPhotos.length > 0 && (
        <div className="customer-photos-section">
          <div className="customer-photos-title">
            <Camera size={15} /> Customer Photos ({customerPhotos.length})
          </div>
          <div className="customer-photos-strip">
            {customerPhotos.map((photo, idx) => {
              const url = typeof photo === 'string' ? photo : photo.url || photo.image_url;
              return (
                <div
                  key={idx}
                  className="customer-photo-thumb"
                  onClick={() => setActivePhotoModal(url)}
                >
                  <img src={url} alt={`Customer review photo ${idx + 1}`} loading="lazy" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Customer Review Cards */}
      <div className="reviews-list-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Loading authentic reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="reviews-empty-state">
            <MessageSquare size={36} style={{ color: 'var(--color-primary)', opacity: 0.6, marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0, color: 'var(--text-secondary)' }}>
              No reviews yet. Be the first to share your experience!
            </p>
          </div>
        ) : (
          reviews.map(rev => {
            const revDate = rev.created_at
              ? new Date(rev.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'Recent';
            const userInitial = rev.user_initial || (rev.user_name ? rev.user_name.charAt(0).toUpperCase() : 'U');

            return (
              <div key={rev.id} className="review-card">
                <div className="review-author-row">
                  <div className="review-author-info">
                    <div className="review-avatar-circle">{userInitial}</div>
                    <div>
                      <div className="review-author-name">{rev.user_name || 'EcoNext Customer'}</div>
                      <div className="review-date">{revDate}</div>
                    </div>
                  </div>
                  {rev.is_verified_purchase && (
                    <span className="verified-badge">
                      <CheckCircle size={13} /> Verified Purchase
                    </span>
                  )}
                </div>

                <div className="review-stars-title-row">
                  <span className="review-rating-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>{rev.rating}</span>
                    <Star size={11} fill="currentColor" aria-hidden="true" />
                  </span>
                  {rev.title && <span className="review-title">{rev.title}</span>}
                </div>

                <p className="review-body-text">{rev.comment}</p>

                {rev.images && rev.images.length > 0 && (
                  <div className="review-images-grid">
                    {rev.images.map((img, i) => {
                      const imgUrl = img.url || img.image_url;
                      return (
                        <div
                          key={img.id || i}
                          className="review-attached-img"
                          onClick={() => setActivePhotoModal(imgUrl)}
                        >
                          <img src={imgUrl} alt="Review attachment" loading="lazy" />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="review-actions-row">
                  <button
                    type="button"
                    className="helpful-btn"
                    onClick={() => handleHelpfulClick(rev.id)}
                    disabled={helpfulVotes[rev.id]}
                  >
                    <ThumbsUp size={13} />
                    {helpfulVotes[rev.id]
                      ? `Helpful (${(rev.helpful_votes || 0) + 1})`
                      : `Helpful (${rev.helpful_votes || 0})`}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Pagination / View all comments button */}
      {hasMore ? (
        <div className="reviews-view-all-box">
          <Button
            variant="outline"
            size="md"
            onClick={handleLoadMore}
            disabled={loadingMore}
            icon={<ChevronDown size={16} />}
            aria-label="Load more customer reviews"
          >
            {loadingMore ? 'Loading More Reviews...' : 'View More Reviews'}
          </Button>
        </div>
      ) : (
        reviews.length > 2 && (
          <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            All reviews loaded.
          </div>
        )
      )}

      {/* 6. Photo Fullview Modal */}
      {activePhotoModal && (
        <div className="write-review-modal-overlay" onClick={() => setActivePhotoModal(null)}>
          <div
            style={{
              position: 'relative',
              maxWidth: '85vw',
              maxHeight: '85vh',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              backgroundColor: '#000'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePhotoModal(null)}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'rgba(0,0,0,0.75)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
            >
              <X size={18} />
            </button>
            <img
              src={activePhotoModal}
              alt="Customer photo fullview"
              style={{ width: '100%', height: 'auto', maxHeight: '85vh', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}

      {/* 7. Write / Submit Review Modal */}
      {isModalOpen && (
        <div className="write-review-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="write-review-modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Write a Customer Review</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {submitSuccess ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-primary)' }}>
                <CheckCircle size={48} style={{ margin: '0 auto 1rem auto' }} />
                <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>Thank You!</h4>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Your verified customer review has been saved to the database.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {submitError && (
                  <div className="review-error-banner">
                    {submitError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Your Rating
                  </label>
                  <div className="star-rating-picker">
                    {[1, 2, 3, 4, 5].map(starVal => (
                      <button
                        key={starVal}
                        type="button"
                        className={`star-btn ${starVal <= rating ? 'active' : ''}`}
                        onClick={() => setRating(starVal)}
                        aria-label={`Rate ${starVal} star${starVal > 1 ? 's' : ''}`}
                      >
                        <Star size={26} fill={starVal <= rating ? '#F59E0B' : 'none'} color={starVal <= rating ? '#F59E0B' : '#D1D5DB'} />
                      </button>
                    ))}
                    <span style={{ marginLeft: '0.5rem', fontWeight: 700, color: '#F59E0B' }}>
                      {rating} of 5 Stars
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Headline / Summary (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Excellent fabric and eco packaging!"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="review-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Written Review <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe what you liked or disliked about this sustainable product, its fit, and quality..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    className="review-textarea"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Upload Photos (Up to 5)
                  </label>
                  <label className="review-photo-upload-label">
                    <Camera size={16} />
                    Add Customer Photos
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {filePreviews.length > 0 && (
                    <div className="upload-previews-row">
                      {filePreviews.map((previewUrl, idx) => (
                        <div key={idx} className="upload-preview-item">
                          <img src={previewUrl} alt={`Upload preview ${idx + 1}`} />
                          <button
                            type="button"
                            className="remove-upload-btn"
                            onClick={() => removeFile(idx)}
                            aria-label="Remove photo"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting || !comment.trim()}
                    aria-label="Save and submit customer review"
                  >
                    {submitting ? 'Saving...' : 'Save Review'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
