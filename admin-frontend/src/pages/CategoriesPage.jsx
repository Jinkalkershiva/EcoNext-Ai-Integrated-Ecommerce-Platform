import React, { useState, useEffect } from 'react';
import { catalogOpsApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';

export const CategoriesPage = () => {
  const { hasPermission, isAdmin } = useAuth();
  const canManage = isAdmin() || hasPermission('CATALOG_MANAGE');

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    isActive: true
  });

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await catalogOpsApi.getCategories();
      setCategories(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setSelectedCategory(null);
    setFormData({ name: '', slug: '', description: '', isActive: true });
    setShowModal(true);
  };

  const openEditModal = (cat) => {
    setSelectedCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug || '',
      description: cat.description || '',
      isActive: cat.isActive !== false
    });
    setShowModal(true);
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData({ ...formData, name, slug: selectedCategory ? formData.slug : slug });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (selectedCategory) {
        await catalogOpsApi.updateCategory(selectedCategory.id, formData);
        setSuccess(`Category "${formData.name}" updated successfully.`);
      } else {
        await catalogOpsApi.createCategory(formData);
        setSuccess(`Category "${formData.name}" created successfully.`);
      }
      setShowModal(false);
      loadCategories();
    } catch (err) {
      setError(err.message || 'Failed to save category');
    }
  };

  const columns = [
    {
      header: 'Category Name',
      key: 'name',
      render: (row) => (
        <div>
          <span className="font-semibold">{row.name}</span>
          <div className="mono-text text-muted text-xs">/{row.slug}</div>
        </div>
      )
    },
    {
      header: 'Description',
      key: 'description'
    },
    {
      header: 'Status',
      key: 'isActive',
      render: (row) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <div className="action-buttons-group">
          {canManage && (
            <button className="btn btn-secondary btn-xs" onClick={() => openEditModal(row)}>
              Edit
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="categories-page">
      {error && (
        <div className="alert alert-danger mb-4">
          <span>⚠️ {error}</span>
          <button className="btn-close" onClick={() => setError('')}>✕</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-4">
          <span>✅ {success}</span>
          <button className="btn-close" onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      <div className="card">
        <DataTable
          columns={columns}
          data={categories}
          loading={loading}
          searchPlaceholder="Search categories..."
          actions={
            canManage && (
              <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
                ➕ Create Category
              </button>
            )
          }
        />
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedCategory ? `Edit Category: ${selectedCategory.name}` : 'Create Eco Category'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category Name *</label>
            <input
              type="text"
              className="input"
              required
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g. Sustainable Apparel"
            />
          </div>

          <div className="form-group">
            <label className="form-label">URL Slug *</label>
            <input
              type="text"
              className="input mono-text"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="e.g. sustainable-apparel"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="input"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Short description of this eco product segment..."
            />
          </div>

          <div className="form-group">
            <label className="form-checkbox-label">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <span>Active in Public Catalog</span>
            </label>
          </div>

          <div className="modal-actions-right mt-4">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {selectedCategory ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
