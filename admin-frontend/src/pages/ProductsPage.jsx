import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Leaf,
  Tag,
  X,
  Search,
  RefreshCw,
  ChevronDown,
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  Eye,
  Check
} from 'lucide-react';
import { catalogOpsApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';

export const ProductsPage = () => {
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = useAuth();
  const canManage = isAdmin() || hasPermission('CATALOG_MANAGE');

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dropdown Menu State
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef(null);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Universal Image Search State
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [imageSearchResults, setImageSearchResults] = useState([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState(false);

  // Form State
  const initialForm = {
    name: '',
    sku: '',
    description: '',
    price: '',
    stockQuantity: 50,
    lowStockThreshold: 10,
    categoryId: '',
    imageUrl: '',
    additionalImages: [],
    tags: 'eco-friendly, sustainable',
    sustainabilityScore: 85,
    carbonFootprintKg: 2.5,
    ecoCertifications: 'GOTS Certified Organic, Fair Trade',
    materialsUsed: '100% Organic Cotton',
    status: 'ACTIVE'
  };

  const [formData, setFormData] = useState(initialForm);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [prodsRes, catsRes] = await Promise.all([
        catalogOpsApi.getProducts({ page: 0, size: 100 }),
        catalogOpsApi.getCategories()
      ]);
      setProducts(prodsRes.content || prodsRes || []);
      setCategories(catsRes || []);
    } catch (err) {
      setError(err.message || 'Failed to load catalog products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenImageSearch = async (customQuery) => {
    setImageSearchOpen(true);
    const selectedCat = categories.find(c => String(c.id) === String(formData.categoryId));
    const catName = selectedCat ? selectedCat.name : '';
    const queryToUse = customQuery !== undefined ? customQuery : (imageSearchQuery || `${formData.name || ''} ${catName || ''}`.trim());
    setImageSearchQuery(queryToUse);
    setIsSearchingImages(true);
    try {
      const results = await catalogOpsApi.searchProductImages(queryToUse, catName);
      setImageSearchResults(results || []);
    } catch (err) {
      console.error('Image search failed', err);
    } finally {
      setIsSearchingImages(false);
    }
  };

  const handleSelectImageAsPrimary = (url) => {
    setFormData(prev => ({ ...prev, imageUrl: url }));
    setImagePreviewError(false);
  };

  const handleAddImageToGallery = (url) => {
    setFormData(prev => {
      const current = prev.additionalImages || [];
      if (!current.includes(url)) {
        return { ...prev, additionalImages: [...current, url] };
      }
      return prev;
    });
  };

  const handleAddAdditionalImageUrl = () => {
    setFormData(prev => ({
      ...prev,
      additionalImages: [...(prev.additionalImages || []), '']
    }));
  };

  const handleUpdateAdditionalImageUrl = (index, val) => {
    setFormData(prev => {
      const copy = [...(prev.additionalImages || [])];
      copy[index] = val;
      return { ...prev, additionalImages: copy };
    });
  };

  const handleRemoveAdditionalImageUrl = (index) => {
    setFormData(prev => {
      const copy = [...(prev.additionalImages || [])];
      copy.splice(index, 1);
      return { ...prev, additionalImages: copy };
    });
  };

  const openCreateModal = () => {
    setSelectedProduct(null);
    setFormData({
      ...initialForm,
      categoryId: categories.length > 0 ? categories[0].id : '',
      imageUrl: '',
      additionalImages: []
    });
    setImagePreviewError(false);
    setImageSearchOpen(false);
    setImageSearchResults([]);
    setShowProductModal(true);
  };

  const openEditModal = (prod) => {
    setSelectedProduct(prod);
    const addImgs = prod.additionalImages || prod.additional_images || (prod.image_features?.additional_images) || [];
    setFormData({
      name: prod.name,
      sku: prod.sku,
      description: prod.description || '',
      price: prod.price,
      stockQuantity: prod.stockQuantity,
      lowStockThreshold: prod.lowStockThreshold,
      categoryId: prod.categoryId || (categories.length > 0 ? categories[0].id : ''),
      imageUrl: prod.imageUrl || prod.image_url || '',
      additionalImages: Array.isArray(addImgs) ? addImgs : [],
      tags: prod.tags || '',
      sustainabilityScore: prod.sustainabilityScore || 80,
      carbonFootprintKg: prod.carbonFootprintKg || 0,
      ecoCertifications: prod.ecoCertifications || '',
      materialsUsed: prod.materialsUsed || '',
      status: prod.status || 'ACTIVE'
    });
    setImagePreviewError(false);
    setImageSearchOpen(false);
    setImageSearchResults([]);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...formData,
        additionalImages: (formData.additionalImages || []).filter(img => typeof img === 'string' && img.trim().length > 0)
      };
      if (selectedProduct) {
        await catalogOpsApi.updateProduct(selectedProduct.id, payload);
        setSuccess(`Product "${formData.name}" updated successfully.`);
      } else {
        await catalogOpsApi.createProduct(payload);
        setSuccess(`Product "${formData.name}" created and synced to catalog.`);
      }
      setShowProductModal(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    setError('');
    setSuccess('');
    try {
      await catalogOpsApi.deleteProduct(selectedProduct.id);
      setSuccess(`Product "${selectedProduct.name}" deleted.`);
      setShowDeleteModal(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete product');
    }
  };

  const columns = [
    {
      header: 'Product Details',
      key: 'name',
      render: (row) => {
        const primaryImg = row.imageUrl || row.image_url;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '6px',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-surface-hover, #f1f5f9)',
                border: '1px solid var(--border-color, #e2e8f0)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {primaryImg ? (
                <img
                  src={primaryImg}
                  alt={row.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <Package size={18} className="text-muted" style={{ opacity: 0.5 }} />
              )}
            </div>
            <div>
              <div className="font-semibold text-sm">{row.name}</div>
              <div className="text-xs text-muted mono-text">SKU: {row.sku}</div>
              {row.categoryName && <span className="badge badge-neutral badge-xs mt-1">{row.categoryName}</span>}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Price',
      key: 'price',
      render: (row) => <span className="font-semibold text-sm">₹{Number(row.price).toFixed(2)}</span>
    },
    {
      header: 'Stock',
      key: 'stockQuantity',
      render: (row) => {
        const isLow = row.stockQuantity <= (row.lowStockThreshold || 10);
        return (
          <div className={`font-semibold flex items-center gap-1 ${isLow ? 'text-danger' : 'text-success'}`}>
            <span>{row.stockQuantity}</span>
            {isLow && <AlertTriangle size={13} />}
          </div>
        );
      }
    },
    {
      header: 'Sustainability',
      key: 'sustainabilityScore',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="badge badge-success badge-xs flex items-center gap-1">
            <Leaf size={11} />
            <span>{row.sustainabilityScore || 0}/100</span>
          </span>
          {row.carbonFootprintKg && (
            <span className="text-xs text-muted">({row.carbonFootprintKg}kg)</span>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status || 'ACTIVE'} />
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <div className="action-buttons-group flex items-center gap-1">
          {canManage && (
            <>
              <button className="btn btn-secondary btn-xs flex items-center gap-1" onClick={() => openEditModal(row)}>
                <Edit size={12} />
                <span>Edit</span>
              </button>
              <button
                className="btn btn-danger btn-xs flex items-center gap-1"
                onClick={() => {
                  setSelectedProduct(row);
                  setShowDeleteModal(true);
                }}
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="products-page">
      {error && (
        <div className="alert alert-danger mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button className="btn-close" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
          <button className="btn-close" onClick={() => setSuccess('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="page-header-flex mb-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <Package size={24} className="text-primary" />
            <span>Eco Catalog Product Directory</span>
          </h2>
          <p className="page-subtitle">
            Manage sustainable inventory items, pricing, carbon footprint metrics, images, and categories.
          </p>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={products}
          loading={loading}
          searchPlaceholder="Search by name, SKU, or tags..."
          actions={
            canManage && (
              <div className="relative inline-block text-left" ref={addMenuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  aria-haspopup="true"
                  aria-expanded={showAddMenu}
                >
                  <Plus size={14} />
                  <span>+ Add Product</span>
                  <ChevronDown size={14} style={{ transform: showAddMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                </button>

                {showAddMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 6px)',
                      zIndex: 100,
                      minWidth: '240px',
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color, #e2e8f0)',
                      borderRadius: 'var(--radius-md, 8px)',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      padding: '0.4rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMenu(false);
                        openCreateModal();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        color: 'var(--text-primary, #1e293b)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm, 6px)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover, #f1f5f9)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Package size={16} className="text-primary" />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Create Single Product</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Manual entry form with images</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMenu(false);
                        navigate('/import');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        color: 'var(--text-primary, #1e293b)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm, 6px)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover, #f1f5f9)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <UploadCloud size={16} style={{ color: '#059669' }} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Bulk Import Products</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CSV / XLSX batch import wizard</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )
          }
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title={selectedProduct ? `Edit Product: ${selectedProduct.name}` : 'Create New Eco Product'}
        maxWidth="760px"
      >
        <form onSubmit={handleSaveProduct}>
          <div className="grid-2col">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Product Name *</label>
              <input
                type="text"
                className="input"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Organic Bamboo Water Bottle"
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">SKU (Stock Keeping Unit) *</label>
              <input
                type="text"
                className="input mono-text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g. ECO-BAM-001"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Product Description</label>
            <textarea
              className="input"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed sustainability specs and product features..."
            />
          </div>

          {/* Product Images & Universal Image Search Section */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated, rgba(255,255,255,0.03))',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #e2e8f0)',
              padding: '1rem',
              marginTop: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary, #059669)', fontSize: '0.85rem', fontWeight: 600 }}>
                <ImageIcon size={16} />
                <span>Product Images & Universal Search</span>
              </h4>
              <button
                type="button"
                className="btn btn-secondary btn-xs flex items-center gap-1.5"
                onClick={() => handleOpenImageSearch()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--primary-subtle, rgba(5, 150, 105, 0.1))',
                  color: 'var(--primary, #059669)',
                  border: '1px solid var(--primary-border, rgba(5, 150, 105, 0.3))',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <Sparkles size={13} />
                <span>{imageSearchOpen ? 'Refresh Search' : 'Universal Image Search'}</span>
              </button>
            </div>

            {/* Universal Image Search Interactive Drawer/Panel */}
            {imageSearchOpen && (
              <div
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  marginBottom: '1rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Universal Catalog Image Explorer
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageSearchOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={15} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    className="input"
                    value={imageSearchQuery}
                    onChange={(e) => setImageSearchQuery(e.target.value)}
                    placeholder="Search sustainable catalog images (e.g. Organic Cotton, Bamboo, Shoes)..."
                    style={{ flex: 1, fontSize: '0.8rem' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleOpenImageSearch(imageSearchQuery);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleOpenImageSearch(imageSearchQuery)}
                    disabled={isSearchingImages}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
                  >
                    {isSearchingImages ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                    <span>Search</span>
                  </button>
                </div>

                {/* Quick categories pills */}
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {['Apparel', 'Footwear', 'Home & Living', 'Kitchen', 'Bags', 'Personal Care', 'Accessories', 'Kids', 'Sports', 'Groceries'].map((catPill) => (
                    <button
                      key={catPill}
                      type="button"
                      onClick={() => handleOpenImageSearch(catPill)}
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #e2e8f0)',
                        backgroundColor: 'var(--bg-surface, #f8fafc)',
                        color: 'var(--text-secondary, #475569)',
                        cursor: 'pointer'
                      }}
                    >
                      {catPill}
                    </button>
                  ))}
                </div>

                {/* Results Grid */}
                {isSearchingImages ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Searching sustainable image library...
                  </div>
                ) : imageSearchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No specific images matched. Try another keyword or pick from suggested categories.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: '0.65rem',
                      maxHeight: '240px',
                      overflowY: 'auto',
                      padding: '0.2rem'
                    }}
                  >
                    {imageSearchResults.map((imgItem, idx) => {
                      const isSelectedPrimary = formData.imageUrl === imgItem.imageUrl;
                      const isSelectedGallery = (formData.additionalImages || []).includes(imgItem.imageUrl);
                      return (
                        <div
                          key={idx}
                          style={{
                            border: isSelectedPrimary ? '2px solid #059669' : '1px solid var(--border-color, #e2e8f0)',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: 'var(--card-bg, #ffffff)',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <div style={{ width: '100%', height: '85px', overflow: 'hidden', position: 'relative', backgroundColor: '#f1f5f9' }}>
                            <img
                              src={imgItem.thumbnailUrl || imgItem.imageUrl}
                              alt={imgItem.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              loading="lazy"
                            />
                            {isSelectedPrimary && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  backgroundColor: '#059669',
                                  color: '#fff',
                                  borderRadius: '50%',
                                  width: '18px',
                                  height: '18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px'
                                }}
                              >
                                <Check size={12} />
                              </div>
                            )}
                          </div>
                          <div style={{ padding: '0.4rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {imgItem.title}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                {imgItem.category}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => handleSelectImageAsPrimary(imgItem.imageUrl)}
                                style={{
                                  flex: 1,
                                  fontSize: '0.65rem',
                                  padding: '0.2rem 0.3rem',
                                  borderRadius: '4px',
                                  backgroundColor: isSelectedPrimary ? '#059669' : 'var(--bg-surface-hover, #f1f5f9)',
                                  color: isSelectedPrimary ? '#ffffff' : 'var(--text-primary)',
                                  border: '1px solid var(--border-color, #cbd5e1)',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                {isSelectedPrimary ? 'Primary' : 'Set Primary'}
                              </button>
                              <button
                                type="button"
                                title="Add to Additional Images"
                                onClick={() => handleAddImageToGallery(imgItem.imageUrl)}
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '0.2rem 0.4rem',
                                  borderRadius: '4px',
                                  backgroundColor: isSelectedGallery ? '#0284c7' : 'var(--bg-surface-hover, #f1f5f9)',
                                  color: isSelectedGallery ? '#ffffff' : 'var(--text-primary)',
                                  border: '1px solid var(--border-color, #cbd5e1)',
                                  cursor: 'pointer'
                                }}
                              >
                                + Gallery
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Primary Image URL & Live Preview */}
            <div className="grid-2col" style={{ alignItems: 'flex-start', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label text-xs font-semibold">Primary Image URL</label>
                <input
                  type="url"
                  className="input"
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setImagePreviewError(false);
                  }}
                  placeholder="https://images.unsplash.com/... or any HTTPS product image link"
                  style={{ fontSize: '0.8rem' }}
                />
                <p className="text-muted text-xs mt-1" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Provide a direct HTTPS URL or select an image using Universal Search above.
                </p>
              </div>

              {/* Live Preview Box */}
              <div style={{ width: '130px', flexShrink: 0 }}>
                <label className="form-label text-xs font-semibold" style={{ marginBottom: '0.35rem', display: 'block' }}>
                  Live Preview
                </label>
                <div
                  style={{
                    width: '130px',
                    height: '100px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: 'var(--bg-surface, #f8fafc)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                >
                  {formData.imageUrl && !imagePreviewError ? (
                    <img
                      src={formData.imageUrl}
                      alt="Primary Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={() => setImagePreviewError(true)}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-muted)' }}>
                      <ImageIcon size={22} style={{ margin: '0 auto 0.2rem auto', opacity: 0.5 }} />
                      <div style={{ fontSize: '0.65rem' }}>
                        {imagePreviewError ? 'Image unavailable' : 'No image'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Gallery Images */}
            <div className="mt-3 pt-2" style={{ borderTop: '1px dashed var(--border-color, #e2e8f0)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label className="form-label text-xs font-semibold" style={{ margin: 0 }}>
                  Additional Product Images (Gallery)
                </label>
                <button
                  type="button"
                  onClick={handleAddAdditionalImageUrl}
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-surface-hover, #f1f5f9)',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontWeight: 600
                  }}
                >
                  <Plus size={12} />
                  <span>+ Add Image URL</span>
                </button>
              </div>

              {(formData.additionalImages || []).length === 0 ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No additional gallery images added yet. Click "+ Add Image URL" or "+ Gallery" from Universal Search.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {(formData.additionalImages || []).map((imgUrl, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid var(--border-color, #cbd5e1)',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={`Gallery ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <ImageIcon size={14} style={{ opacity: 0.4 }} />
                        )}
                      </div>
                      <input
                        type="url"
                        className="input"
                        value={imgUrl}
                        onChange={(e) => handleUpdateAdditionalImageUrl(idx, e.target.value)}
                        placeholder={`Gallery Image #${idx + 1} HTTPS URL`}
                        style={{ flex: 1, fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAdditionalImageUrl(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          padding: '0.2rem'
                        }}
                        title="Remove image URL"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid-3col">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                className="input"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g. 1499.00"
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Initial Stock Quantity *</label>
              <input
                type="number"
                className="input"
                required
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Low Stock Threshold</label>
              <input
                type="number"
                className="input"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid-2col">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Category</label>
              <select
                className="input"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Operational Status</label>
              <select
                className="input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="ACTIVE">ACTIVE (Published)</option>
                <option value="INACTIVE">INACTIVE (Hidden)</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          {/* Sustainability Specs Section */}
          <div className="border-section mt-3 pt-3 p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
            <h4 className="section-subtitle flex items-center gap-1.5 text-xs font-semibold text-primary mb-3">
              <Leaf size={14} />
              <span>Sustainability Attributes & Life-Cycle Metrics</span>
            </h4>
            <div className="grid-2col">
              <div className="form-group">
                <label className="form-label text-xs font-semibold">Sustainability Score (0 - 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input"
                  value={formData.sustainabilityScore}
                  onChange={(e) => setFormData({ ...formData, sustainabilityScore: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-semibold">Carbon Footprint (kg CO₂e)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.carbonFootprintKg}
                  onChange={(e) => setFormData({ ...formData, carbonFootprintKg: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid-2col mt-2">
              <div className="form-group">
                <label className="form-label text-xs font-semibold">Eco Certifications</label>
                <input
                  type="text"
                  className="input"
                  value={formData.ecoCertifications}
                  onChange={(e) => setFormData({ ...formData, ecoCertifications: e.target.value })}
                  placeholder="e.g. GOTS, Fair Trade, FSC Certified"
                />
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-semibold">Materials Composition</label>
                <input
                  type="text"
                  className="input"
                  value={formData.materialsUsed}
                  onChange={(e) => setFormData({ ...formData, materialsUsed: e.target.value })}
                  placeholder="e.g. 100% Recycled PET, Organic Hemp"
                />
              </div>
            </div>
          </div>

          <div className="modal-actions-right mt-4">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowProductModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              {selectedProduct ? 'Update Product' : 'Create & Sync Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Product Deletion"
      >
        <p>
          Are you sure you want to delete <strong>{selectedProduct?.name}</strong> (SKU: {selectedProduct?.sku})?
        </p>
        <p className="text-muted text-xs mt-2">
          This operation will remove the item from the active operational catalog and sync deletion to downstream services.
        </p>
        <div className="modal-actions-right mt-4">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDeleteProduct}>
            Confirm Deletion
          </button>
        </div>
      </Modal>
    </div>
  );
};
