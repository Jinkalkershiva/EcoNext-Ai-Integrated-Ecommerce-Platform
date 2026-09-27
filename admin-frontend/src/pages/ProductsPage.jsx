import React, { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { catalogOpsApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';

export const ProductsPage = () => {
  const { hasPermission, isAdmin } = useAuth();
  const canManage = isAdmin() || hasPermission('CATALOG_MANAGE');

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form State
  const initialForm = {
    name: '',
    sku: '',
    description: '',
    price: '',
    stockQuantity: 50,
    lowStockThreshold: 10,
    categoryId: '',
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

  const openCreateModal = () => {
    setSelectedProduct(null);
    setFormData({
      ...initialForm,
      categoryId: categories.length > 0 ? categories[0].id : ''
    });
    setShowProductModal(true);
  };

  const openEditModal = (prod) => {
    setSelectedProduct(prod);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      description: prod.description || '',
      price: prod.price,
      stockQuantity: prod.stockQuantity,
      lowStockThreshold: prod.lowStockThreshold,
      categoryId: prod.categoryId || (categories.length > 0 ? categories[0].id : ''),
      tags: prod.tags || '',
      sustainabilityScore: prod.sustainabilityScore || 80,
      carbonFootprintKg: prod.carbonFootprintKg || 0,
      ecoCertifications: prod.ecoCertifications || '',
      materialsUsed: prod.materialsUsed || '',
      status: prod.status || 'ACTIVE'
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (selectedProduct) {
        await catalogOpsApi.updateProduct(selectedProduct.id, formData);
        setSuccess(`Product "${formData.name}" updated successfully.`);
      } else {
        await catalogOpsApi.createProduct(formData);
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
      render: (row) => (
        <div>
          <div className="font-semibold text-sm">{row.name}</div>
          <div className="text-xs text-muted mono-text">SKU: {row.sku}</div>
          {row.categoryName && <span className="badge badge-neutral badge-xs mt-1">{row.categoryName}</span>}
        </div>
      )
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
            Manage sustainable inventory items, pricing, carbon footprint metrics, and categories.
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
              <button className="btn btn-primary btn-sm flex items-center gap-1.5" onClick={openCreateModal}>
                <Plus size={14} />
                <span>Create Eco Product</span>
              </button>
            )
          }
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title={selectedProduct ? `Edit Product: ${selectedProduct.name}` : 'Create New Eco Product'}
        maxWidth="720px"
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
