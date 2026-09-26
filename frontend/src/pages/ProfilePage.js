import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { apiService } from '../api';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { Package, Edit3, Check, ArrowLeft, LogOut, SlidersHorizontal } from 'lucide-react';
import './ProfilePage.css';

export const ProfilePage = () => {
  const { user, authToken, logout, updateUser } = useAuth();
  const { navigateTo, goBack } = useNavigation();

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'India',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [userData, ordersData] = await Promise.all([
        apiService.getCurrentUser(),
        apiService.getOrders(authToken),
      ]);

      if (userData && userData.status === 'success' && userData.profile) {
        setProfile(userData.profile);
        setFormData({
          phone: userData.profile.phone || '',
          address: userData.profile.address || '',
          city: userData.profile.city || '',
          state: userData.profile.state || '',
          zipcode: userData.profile.zipcode || '',
          country: userData.profile.country || 'India',
        });
      }

      if (ordersData && ordersData.status === 'success') {
        setOrders(ordersData.orders || []);
      }
    } catch (err) {
      console.warn('Profile loading note:', err.message);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const response = await apiService.updateProfile(formData);
      if (response && response.status === 'success') {
        setProfile(response.profile);
        updateUser({ profile: response.profile });
        setEditing(false);
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(response?.message || 'Failed to update profile.');
      }
    } catch (err) {
      setErrorMsg('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0' }}>
        <LoadingSpinner text="Loading your account profile and order history..." fullPage />
      </div>
    );
  }

  return (
    <div className="container">
      {/* Back and Heading */}
      <div style={{ margin: '1rem 0' }}>
        <Button variant="ghost" size="sm" onClick={goBack} icon={<ArrowLeft size={16} />}>
          Back
        </Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Account Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage your personal credentials, address book, and track recent orders
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateTo('preferences')}
            icon={<SlidersHorizontal size={15} />}
          >
            Eco Preferences
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              logout();
              navigateTo('home');
            }}
            icon={<LogOut size={15} />}
            style={{ color: 'var(--color-danger)' }}
          >
            Sign Out
          </Button>
        </div>
      </div>

      <div className="profile-page-grid">
        {/* Profile Information Card */}
        <div className="profile-card">
          <div className="profile-avatar-row">
            <div className="profile-avatar-large">
              {(user?.username || user?.first_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>{user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{user?.username} • Eco Member</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Profile & Delivery Details</h3>
            <Button
              variant={editing ? 'ghost' : 'outline'}
              size="sm"
              onClick={() => setEditing(!editing)}
              icon={<Edit3 size={14} />}
            >
              {editing ? 'Cancel' : 'Edit Info'}
            </Button>
          </div>

          {successMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--color-success-bg)',
                border: '1px solid var(--color-success-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-success-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              <Check size={16} /> {successMsg}
            </div>
          )}

          {errorMsg && <ErrorMessage message={errorMsg} />}

          {!editing ? (
            <div className="profile-info-grid">
              <div>
                <div className="profile-field-label">Email Address</div>
                <div className="profile-field-value">{user?.email || 'Not provided'}</div>
              </div>
              <div>
                <div className="profile-field-label">Phone</div>
                <div className="profile-field-value">{profile?.phone || 'Not provided'}</div>
              </div>
              <div>
                <div className="profile-field-label">Address</div>
                <div className="profile-field-value">{profile?.address || 'Not provided'}</div>
              </div>
              <div>
                <div className="profile-field-label">City & State</div>
                <div className="profile-field-value">{profile?.city ? `${profile.city}, ${profile.state || ''}` : 'Not provided'}</div>
              </div>
              <div>
                <div className="profile-field-label">Postal / ZIP Code</div>
                <div className="profile-field-value">{profile?.zipcode || 'Not provided'}</div>
              </div>
              <div>
                <div className="profile-field-label">Country</div>
                <div className="profile-field-value">{profile?.country || 'India'}</div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Street Address</label>
                <input
                  type="text"
                  name="address"
                  className="form-input"
                  placeholder="123 Green Way, Eco Park"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    name="city"
                    className="form-input"
                    placeholder="Mumbai"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    name="state"
                    className="form-input"
                    placeholder="Maharashtra"
                    value={formData.state}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">PIN Code</label>
                  <input
                    type="text"
                    name="zipcode"
                    className="form-input"
                    placeholder="400001"
                    value={formData.zipcode}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input
                    type="text"
                    name="country"
                    className="form-input"
                    value={formData.country}
                    disabled
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={saving}
                icon={<Check size={16} />}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          )}
        </div>

        {/* Order History Column */}
        <div className="profile-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Order History ({orders.length})</h2>
            <Badge variant="eco" size="sm">
              All Orders Carbon-Neutral
            </Badge>
          </div>

          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Package size={44} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
              <h3>No past orders yet</h3>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
                When you make your first sustainable purchase, order tracking will appear here.
              </p>
              <Button variant="primary" size="sm" onClick={() => navigateTo('products')}>
                Discover Products
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '550px', overflowY: 'auto' }}>
              {orders.map((order) => {
                const status = (order.status || 'processing').toLowerCase();
                const badgeVariant =
                  status === 'delivered' ? 'success' : status === 'shipped' ? 'accent' : 'warning';

                const getStatusStep = (st) => {
                  switch (st) {
                    case 'pending': return 1;
                    case 'confirmed':
                    case 'processing': return 2;
                    case 'shipped': return 3;
                    case 'delivered': return 4;
                    default: return 1;
                  }
                };

                const currentStep = getStatusStep(status);
                const isCancelled = status === 'cancelled';

                return (
                  <div key={order.id} className="order-history-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        Order #{order.id}
                      </div>
                      <Badge variant={badgeVariant} size="sm">
                        {status.toUpperCase()}
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>Placed on {new Date(order.created_at || Date.now()).toLocaleDateString()}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)' }}>
                        ₹{parseFloat(order.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Live Order Tracker Timeline */}
                    {!isCancelled ? (
                      <div className="order-tracker-timeline">
                        <div className="order-tracker-line">
                          <div
                            className="order-tracker-line-fill"
                            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                          />
                        </div>

                        <div className={`order-tracker-step ${currentStep >= 1 ? 'completed' : ''}`}>
                          <div className="order-tracker-dot">✓</div>
                          <span>Placed</span>
                        </div>

                        <div className={`order-tracker-step ${currentStep >= 2 ? (currentStep === 2 ? 'active' : 'completed') : ''}`}>
                          <div className="order-tracker-dot">{currentStep >= 2 ? '✓' : '2'}</div>
                          <span>Processing</span>
                        </div>

                        <div className={`order-tracker-step ${currentStep >= 3 ? (currentStep === 3 ? 'active' : 'completed') : ''}`}>
                          <div className="order-tracker-dot">{currentStep >= 3 ? '✓' : '3'}</div>
                          <span>Shipped</span>
                        </div>

                        <div className={`order-tracker-step ${currentStep >= 4 ? 'completed' : ''}`}>
                          <div className="order-tracker-dot">{currentStep >= 4 ? '✓' : '4'}</div>
                          <span>Delivered</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                        ⚠️ Order was cancelled.
                      </div>
                    )}

                    {order.items && order.items.length > 0 && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                        {order.items.length} item{order.items.length > 1 ? 's' : ''} in package • Carbon-Neutral Delivery
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
