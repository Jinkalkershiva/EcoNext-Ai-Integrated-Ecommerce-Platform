import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Check } from 'lucide-react';
import { apiService } from './api';
import { AnimatedButton } from './components';

export const ProfilePage = ({ user, authToken, onBack }) => {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    country: '',
  });
  const [errors, setErrors] = useState({});

  const loadProfile = useCallback(async () => {
    try {
      const data = await apiService.getCurrentUser();
      if (data.status === 'success') {
        setProfile(data.profile);
        setFormData({
          phone: data.profile.phone || '',
          address: data.profile.address || '',
          city: data.profile.city || '',
          state: data.profile.state || '',
          zipcode: data.profile.zipcode || '',
          country: data.profile.country || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
    setLoading(false);
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const data = await apiService.getOrders(authToken);
      if (data.status === 'success') {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }, [authToken]);

  useEffect(() => {
    loadProfile();
    loadOrders();
  }, [loadProfile, loadOrders]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await apiService.updateProfile(formData);
      if (response.status === 'success') {
        setProfile(response.profile);
        setEditing(false);
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      setErrors({ submit: 'Failed to update profile' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <motion.div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="loading" style={{ display: 'inline-block' }}></div>
        <p style={{ marginTop: '1rem', color: '#666' }}>Loading profile...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 0' }}
    >
      <motion.div
        onClick={onBack}
        style={{ marginBottom: '2rem', cursor: 'pointer' }}
        whileHover={{ x: -5 }}
      >
        <AnimatedButton variant="outline">
          <ChevronLeft size={18} style={{ marginRight: '8px' }} />
          Back
        </AnimatedButton>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Profile Information */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Profile Information</h2>
            <AnimatedButton
              onClick={() => setEditing(!editing)}
              variant={editing ? 'outline' : 'primary'}
              size="sm"
            >
              {editing ? 'Cancel' : 'Edit'}
            </AnimatedButton>
          </div>

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '1rem',
                padding: '1rem',
                background: '#D1FAE5',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                color: '#065F46',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center'
              }}
            >
              <Check size={18} />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {!editing ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Username
                </p>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>{user?.username}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Email
                </p>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>{user?.email}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Phone
                </p>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>{profile?.phone || 'Not provided'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Address
                </p>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>{profile?.address || 'Not provided'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  City
                </p>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>{profile?.city || 'Not provided'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  State
                </p>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>{profile?.state || 'Not provided'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Zipcode
                </p>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>{profile?.zipcode || 'Not provided'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Country
                </p>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>{profile?.country || 'Not provided'}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main St"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="New York"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="NY"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                    Zipcode
                  </label>
                  <input
                    type="text"
                    name="zipcode"
                    value={formData.zipcode}
                    onChange={handleChange}
                    placeholder="10001"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="USA"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
              </div>

              <AnimatedButton
                type="submit"
                variant="primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={saving}
              >
                {saving ? 'Saving...' : '✓ Save Changes'}
              </AnimatedButton>
            </form>
          )}
        </motion.div>

        {/* Orders History */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          <h2 style={{ marginBottom: '1.5rem' }}>Order History</h2>

          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#999' }}>
              <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</p>
              <p>No orders yet</p>
            </div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {orders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    background: '#F9FAFB'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <p style={{ margin: 0, fontWeight: '600' }}>Order #{order.id}</p>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: order.status === 'delivered' ? '#D1FAE5' : order.status === 'shipped' ? '#DDD6FE' : '#FED7AA',
                      color: order.status === 'delivered' ? '#065F46' : order.status === 'shipped' ? '#4338CA' : '#92400E'
                    }}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
                    Total: <strong>₹{order.total_price}</strong>
                  </p>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', color: '#999' }}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', color: '#999' }}>
                    Items: {order.items?.length || 0}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ProfilePage;
