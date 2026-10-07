import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { apiService } from '../api';
import Button from '../components/common/Button';
import ErrorMessage from '../components/common/ErrorMessage';
import {
  ShieldAlert,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Leaf,
  X,
  RefreshCw,
  Eye,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './AdminPage.css';

export const AdminPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { navigateTo } = useNavigation();

  // Active Tab: 'overview' | 'products' | 'orders' | 'users' | 'categories'
  const [activeTab, setActiveTab] = useState('overview');

  // RBAC check
  const isAdmin = Boolean(
    isAuthenticated &&
    user &&
    (user.role === 'admin' || user.is_staff || user.is_superuser)
  );

  // States for data
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filter & Search states
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Product Modal (Add / Edit)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    brand: 'EcoNext Sustainable',
    category: '',
    current_price: '',
    original_price: '',
    stock: 25,
    gender_category: 'unisex',
    sustainability_score: 85,
    eco_rating: 'A',
    carbon_footprint_reduction_pct: 35,
    is_featured: false,
    description: '',
    image_url: '',
  });

  // Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });

  // Auto-clear success message after 4s
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(''), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  // Load Dashboard Data
  const loadDashboard = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await apiService.getAdminDashboard();
      if (res && res.status === 'success') {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      setErrorMessage(err.message || 'Could not fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Load Products
  const loadProducts = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const params = {};
      if (productSearch) params.search = productSearch;
      if (selectedCategory) params.category = selectedCategory;
      const res = await apiService.getAdminProducts(params);
      if (res && res.status === 'success') {
        setProducts(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      setErrorMessage(err.message || 'Could not fetch admin products.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, productSearch, selectedCategory]);

  // Load Orders
  const loadOrders = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const params = {};
      if (orderStatusFilter) params.status = orderStatusFilter;
      const res = await apiService.getAdminOrders(params);
      if (res && res.status === 'success') {
        setOrders(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      setErrorMessage(err.message || 'Could not fetch admin orders.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, orderStatusFilter]);

  // Load Users
  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const params = {};
      if (userSearch) params.search = userSearch;
      const res = await apiService.getAdminUsers(params);
      if (res && res.status === 'success') {
        setUsersList(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setErrorMessage(err.message || 'Could not fetch registered users.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userSearch]);

  // Load Categories
  const loadCategories = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await apiService.getAdminCategories();
      if (res && res.status === 'success') {
        setCategories(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, [isAdmin]);

  // Load tab-specific data on mount or tab change
  useEffect(() => {
    if (!isAdmin) return;
    loadCategories();
    if (activeTab === 'overview') loadDashboard();
    else if (activeTab === 'products') loadProducts();
    else if (activeTab === 'orders') loadOrders();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'categories') loadCategories();
  }, [activeTab, isAdmin, loadDashboard, loadProducts, loadOrders, loadUsers, loadCategories]);

  // Handle Order Status Change
  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      const res = await apiService.updateAdminOrderStatus(orderId, newStatus);
      if (res && res.status === 'success') {
        setSuccessMessage(`Order #${orderId} status updated to ${newStatus}`);
        loadOrders();
        if (activeTab === 'overview') loadDashboard();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update order status');
    }
  };

  // Handle Save Product (Create or Edit)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      if (editingProduct) {
        await apiService.updateAdminProduct(editingProduct.id, productFormData);
        setSuccessMessage(`Product "${productFormData.name}" updated successfully!`);
      } else {
        await apiService.createAdminProduct(productFormData);
        setSuccessMessage(`New product "${productFormData.name}" created successfully!`);
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      loadProducts();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save product.');
    }
  };

  // Open Edit Modal
  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setProductFormData({
      name: prod.name || '',
      brand: prod.brand || 'EcoNext Sustainable',
      category: prod.category_id || (prod.category ? prod.category.id : ''),
      current_price: prod.current_price || '',
      original_price: prod.original_price || '',
      stock: prod.stock !== undefined ? prod.stock : 20,
      gender_category: prod.gender_category || 'unisex',
      sustainability_score: prod.sustainability_score || 85,
      eco_rating: prod.eco_rating || 'A',
      carbon_footprint_reduction_pct: prod.carbon_footprint_reduction_pct || 30,
      is_featured: Boolean(prod.is_featured),
      description: prod.description || '',
      image_url: prod.image_url || '',
    });
    setIsProductModalOpen(true);
  };

  // Handle Delete Product
  const handleDeleteProduct = async (prodId, prodName) => {
    if (!window.confirm(`Are you sure you want to delete "${prodName}"?`)) return;
    try {
      await apiService.deleteAdminProduct(prodId);
      setSuccessMessage(`Product "${prodName}" deleted.`);
      loadProducts();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete product.');
    }
  };

  // Handle Create Category
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      const slug = categoryFormData.slug || categoryFormData.name.toLowerCase().replace(/\s+/g, '-');
      await apiService.createAdminCategory({ ...categoryFormData, slug });
      setSuccessMessage(`Category "${categoryFormData.name}" created!`);
      setIsCategoryModalOpen(false);
      setCategoryFormData({ name: '', slug: '', description: '' });
      loadCategories();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create category.');
    }
  };

  // Render Access Denied for non-admins
  if (!isAdmin) {
    return (
      <div className="container admin-page-container">
        <div className="admin-access-denied">
          <div className="icon-container">
            <ShieldAlert size={44} />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', fontWeight: 800 }}>
            Restricted Admin Area
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            You must be signed in with an administrative staff account (e.g. <code>admin / adminpassword123</code>) to access the EcoNext Management Console.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Button variant="secondary" onClick={() => navigateTo('home')}>
              Return Home
            </Button>
            <Button variant="primary" onClick={() => navigateTo('login')}>
              Admin Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container admin-page-container">
      {/* Header Banner */}
      <div className="admin-header-banner">
        <div className="admin-title-area">
          <h1>
            <LayoutDashboard size={28} style={{ color: 'var(--color-primary)' }} />
            EcoNext Admin Console
          </h1>
          <p>Enterprise Catalog &amp; Order Orchestration Dashboard</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="admin-role-badge">
            <CheckCircle size={13} /> {user.role || 'Staff Admin'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={15} />}
            onClick={() => {
              if (activeTab === 'overview') loadDashboard();
              else if (activeTab === 'products') loadProducts();
              else if (activeTab === 'orders') loadOrders();
              else if (activeTab === 'users') loadUsers();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ErrorMessage message={errorMessage} onRetry={() => setErrorMessage('')} />
        </div>
      )}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--color-success-bg, #dcfce7)',
            color: 'var(--color-success, #166534)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle size={18} /> {successMessage}
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <div className="admin-nav-tabs">
        <button
          className={`admin-nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={16} /> Overview
        </button>
        <button
          className={`admin-nav-tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package size={16} /> Products ({products.length || stats?.total_products || 0})
        </button>
        <button
          className={`admin-nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <ShoppingBag size={16} /> Orders ({orders.length || stats?.total_orders || 0})
        </button>
        <button
          className={`admin-nav-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} /> Users ({usersList.length || stats?.total_users || 0})
        </button>
        <button
          className={`admin-nav-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <Layers size={16} /> Categories ({categories.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW / DASHBOARD */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI Grid */}
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <div
                className="admin-kpi-icon"
                style={{ backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}
              >
                <DollarSign size={26} />
              </div>
              <div className="admin-kpi-info">
                <h4>Total Revenue</h4>
                <div className="kpi-value">
                  ₹{Number(stats?.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div
                className="admin-kpi-icon"
                style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}
              >
                <ShoppingBag size={26} />
              </div>
              <div className="admin-kpi-info">
                <h4>Total Orders</h4>
                <div className="kpi-value">{stats?.total_orders ?? 0}</div>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div
                className="admin-kpi-icon"
                style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}
              >
                <Users size={26} />
              </div>
              <div className="admin-kpi-info">
                <h4>Registered Users</h4>
                <div className="kpi-value">{stats?.total_users ?? 0}</div>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div
                className="admin-kpi-icon"
                style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}
              >
                <AlertTriangle size={26} />
              </div>
              <div className="admin-kpi-info">
                <h4>Low Stock Items</h4>
                <div className="kpi-value" style={{ color: stats?.low_stock_count > 0 ? '#b91c1c' : 'inherit' }}>
                  {stats?.low_stock_count ?? 0}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders in Overview */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3>
                <Clock size={18} /> Recent Customer Orders
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('orders')}>
                View All Orders
              </Button>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recent_orders && stats.recent_orders.length > 0 ? (
                    stats.recent_orders.map((ord) => (
                      <tr key={ord.id}>
                        <td>
                          <strong>#{ord.id}</strong>
                        </td>
                        <td>{ord.user_email || 'Customer'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          ₹{Number(ord.total_amount).toFixed(2)}
                        </td>
                        <td>
                          <span className={`status-badge ${ord.status}`}>
                            {ord.status}
                          </span>
                        </td>
                        <td>{new Date(ord.created_at).toLocaleDateString()}</td>
                        <td>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setActiveTab('orders');
                              setOrderStatusFilter('');
                            }}
                          >
                            Manage
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No orders recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>
              <Package size={18} /> Catalog Products Management
            </h3>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => {
                setEditingProduct(null);
                setProductFormData({
                  name: '',
                  brand: 'EcoNext Sustainable',
                  category: categories[0]?.id || '',
                  current_price: '',
                  original_price: '',
                  stock: 25,
                  gender_category: 'unisex',
                  sustainability_score: 85,
                  eco_rating: 'A',
                  carbon_footprint_reduction_pct: 35,
                  is_featured: false,
                  description: '',
                  image_url: '',
                });
                setIsProductModalOpen(true);
              }}
            >
              Add New Product
            </Button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="admin-toolbar">
            <div className="admin-search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search products by title or brand..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
            <select
              className="admin-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Products Table */}
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Eco Rating</th>
                  <th>Sustainability</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length > 0 ? (
                  products.map((p) => {
                    const isLow = p.stock <= 5 && p.stock > 0;
                    const isOut = p.stock === 0;
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: 'var(--radius-sm)',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'var(--bg-surface-sunken)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Leaf size={16} color="var(--color-primary)" />
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600 }}>{p.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {p.brand} • {p.gender_category}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{p.category_name || (p.category?.name) || '-'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          ₹{Number(p.current_price).toFixed(2)}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              isOut ? 'outstock' : isLow ? 'lowstock' : 'instock'
                            }`}
                          >
                            {isOut ? 'Out of Stock' : isLow ? `Low (${p.stock})` : `${p.stock} units`}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--color-primary)' }}>{p.eco_rating || 'A'}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div
                              style={{
                                width: '60px',
                                height: '6px',
                                backgroundColor: 'var(--border-subtle)',
                                borderRadius: '4px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${p.sustainability_score || 80}%`,
                                  height: '100%',
                                  backgroundColor: 'var(--color-primary)',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                              {p.sustainability_score}/100
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Eye size={14} />}
                              onClick={() => navigateTo('product-detail', { id: p.id })}
                              title="View in Store"
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Edit2 size={14} />}
                              onClick={() => handleOpenEditProduct(p)}
                              title="Edit Product"
                            />
                            <Button
                              variant="danger"
                              size="sm"
                              icon={<Trash2 size={14} />}
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              title="Delete Product"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>
              <ShoppingBag size={18} /> Customer Orders Lifecycle
            </h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select
                className="admin-select"
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer Email</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Payment</th>
                  <th>Current Status</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? (
                  orders.map((ord) => (
                    <tr key={ord.id}>
                      <td>
                        <strong>#{ord.id}</strong>
                      </td>
                      <td>
                        <div>{ord.user_email || 'Customer'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {ord.shipping_city}, {ord.shipping_state}
                        </div>
                      </td>
                      <td>{ord.items_count || (ord.items ? ord.items.length : 1)} items</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        ₹{Number(ord.total_amount).toFixed(2)}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                          {ord.payment_method || 'COD'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${ord.status}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td>
                        <select
                          className="admin-select"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          value={ord.status}
                          onChange={(e) => handleOrderStatusUpdate(ord.id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No orders found matching the filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>
              <Users size={18} /> Registered Platform Accounts
            </h3>
            <div className="admin-search-box" style={{ maxWidth: '300px' }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by username or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Staff Access</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length > 0 ? (
                  usersList.map((u) => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td>
                        <strong>{u.username}</strong>
                        {u.first_name && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {u.first_name} {u.last_name}
                          </div>
                        )}
                      </td>
                      <td>{u.email || '-'}</td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            backgroundColor: u.role === 'admin' ? 'var(--color-primary-subtle)' : 'var(--bg-surface-sunken)',
                            color: u.role === 'admin' ? 'var(--color-primary)' : 'var(--text-secondary)',
                          }}
                        >
                          {u.role || (u.is_staff ? 'admin' : 'customer')}
                        </span>
                      </td>
                      <td>
                        {u.is_staff || u.is_superuser ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                            <Check size={14} aria-hidden="true" />
                            <span>Yes</span>
                          </span>
                        ) : 'No'}
                      </td>
                      <td>
                        <span className={`status-badge ${u.is_active ? 'delivered' : 'cancelled'}`}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>{u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>
              <Layers size={18} /> Sustainable Product Categories
            </h3>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setIsCategoryModalOpen(true)}
            >
              Add Category
            </Button>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Category Name</th>
                  <th>Slug</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>#{cat.id}</td>
                    <td>
                      <strong>{cat.name}</strong>
                    </td>
                    <td>
                      <code>{cat.slug}</code>
                    </td>
                    <td>{cat.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRODUCT CREATE / EDIT MODAL */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="admin-modal-overlay" onClick={() => setIsProductModalOpen(false)}>
            <motion.div
              className="admin-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-header">
                <h3>{editingProduct ? 'Edit Catalog Product' : 'Add New Eco-Friendly Product'}</h3>
                <button
                  className="admin-modal-close"
                  onClick={() => setIsProductModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct}>
                <div className="admin-form-grid">
                  <div className="admin-form-group-full">
                    <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={productFormData.name}
                      onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                      placeholder="e.g. Organic Hemp Backpack"
                    />
                  </div>

                  <div>
                    <label className="form-label">Brand</label>
                    <input
                      type="text"
                      className="form-input"
                      value={productFormData.brand}
                      onChange={(e) => setProductFormData({ ...productFormData, brand: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Category *</label>
                    <select
                      className="form-input"
                      required
                      value={productFormData.category}
                      onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Current Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      required
                      value={productFormData.current_price}
                      onChange={(e) => setProductFormData({ ...productFormData, current_price: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Original Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={productFormData.original_price}
                      onChange={(e) => setProductFormData({ ...productFormData, original_price: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Stock Quantity</label>
                    <input
                      type="number"
                      className="form-input"
                      value={productFormData.stock}
                      onChange={(e) => setProductFormData({ ...productFormData, stock: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Target Segment</label>
                    <select
                      className="form-input"
                      value={productFormData.gender_category}
                      onChange={(e) => setProductFormData({ ...productFormData, gender_category: e.target.value })}
                    >
                      <option value="unisex">Unisex</option>
                      <option value="men">Men</option>
                      <option value="women">Women</option>
                      <option value="teens">Teens</option>
                      <option value="kids">Kids</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Sustainability Score (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-input"
                      value={productFormData.sustainability_score}
                      onChange={(e) => setProductFormData({ ...productFormData, sustainability_score: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Eco Rating</label>
                    <select
                      className="form-input"
                      value={productFormData.eco_rating}
                      onChange={(e) => setProductFormData({ ...productFormData, eco_rating: e.target.value })}
                    >
                      <option value="A+">A+ (Pioneer)</option>
                      <option value="A">A (Certified Organic)</option>
                      <option value="B+">B+ (Upcycled)</option>
                      <option value="B">B (Low Emission)</option>
                      <option value="C">C (Standard)</option>
                    </select>
                  </div>

                  <div className="admin-form-group-full">
                    <label className="form-label">Image URL</label>
                    <input
                      type="url"
                      className="form-input"
                      value={productFormData.image_url}
                      onChange={(e) => setProductFormData({ ...productFormData, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="admin-form-group-full">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-input"
                      rows="3"
                      value={productFormData.description}
                      onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <Button variant="secondary" onClick={() => setIsProductModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    {editingProduct ? 'Update Product' : 'Save Product'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CATEGORY MODAL */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="admin-modal-overlay" onClick={() => setIsCategoryModalOpen(false)}>
            <motion.div
              className="admin-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-header">
                <h3>Add New Sustainable Category</h3>
                <button
                  className="admin-modal-close"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveCategory}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Category Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                      placeholder="e.g. Bamboo Essentials"
                    />
                  </div>
                  <div>
                    <label className="form-label">Slug (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={categoryFormData.slug}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value })}
                      placeholder="e.g. bamboo-essentials"
                    />
                  </div>
                  <div>
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-input"
                      rows="3"
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <Button variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Create Category
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPage;
