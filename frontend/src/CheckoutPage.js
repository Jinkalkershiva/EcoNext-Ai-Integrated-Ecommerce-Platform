import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { apiService } from './api';
import { AnimatedButton } from './components';

export const CheckoutPage = ({ cart, onBack, onOrderSuccess, authToken }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    country: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.zipcode.trim()) newErrors.zipcode = 'Zipcode is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const shippingData = {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipcode: formData.zipcode,
        country: formData.country,
      };

      const response = await apiService.createOrder(shippingData, authToken);

      if (response.status === 'success') {
        setOrderPlaced(true);
        if (onOrderSuccess) {
          onOrderSuccess(response.order);
        }
      } else {
        setErrors({ submit: response.error || 'Failed to place order' });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to place order. Please try again.' });
    }
    setLoading(false);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.current_price) * item.quantity), 0);

  if (orderPlaced) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}
      >
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '3rem 2rem',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ marginBottom: '1rem' }}>Order Placed Successfully!</h2>
          <p style={{ color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
            Your order has been confirmed and will be shipped to your address shortly.
            You'll receive a confirmation email with tracking details.
          </p>
          <AnimatedButton onClick={() => onBack()} variant="primary" style={{ width: '100%' }}>
            Continue Shopping
          </AnimatedButton>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 0' }}
    >
      <motion.div
        onClick={onBack}
        style={{ marginBottom: '2rem', cursor: 'pointer' }}
        whileHover={{ x: -5 }}
      >
        <AnimatedButton variant="outline">
          <ChevronLeft size={18} style={{ marginRight: '8px' }} />
          Back to Cart
        </AnimatedButton>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Shipping Form */}
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
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Shipping Address</h2>
          <form onSubmit={handleSubmit}>
            {errors.submit && (
              <div style={{
                padding: '1rem',
                marginBottom: '1rem',
                background: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                color: '#7F1D1D',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start'
              }}>
                <AlertCircle size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{errors.submit}</span>
              </div>
            )}

            <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: errors.firstName ? '2px solid #EF4444' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                />
                {errors.firstName && <small style={{ color: '#EF4444', marginTop: '0.25rem' }}>{errors.firstName}</small>}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: errors.lastName ? '2px solid #EF4444' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                />
                {errors.lastName && <small style={{ color: '#EF4444', marginTop: '0.25rem' }}>{errors.lastName}</small>}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: errors.email ? '2px solid #EF4444' : '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
              {errors.email && <small style={{ color: '#EF4444', marginTop: '0.25rem' }}>{errors.email}</small>}
            </div>

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
                  border: errors.phone ? '2px solid #EF4444' : '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
              {errors.phone && <small style={{ color: '#EF4444', marginTop: '0.25rem' }}>{errors.phone}</small>}
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
                  border: errors.address ? '2px solid #EF4444' : '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
              {errors.address && <small style={{ color: '#EF4444', marginTop: '0.25rem' }}>{errors.address}</small>}
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
                    border: errors.city ? '2px solid #EF4444' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                />
                {errors.city && <small style={{ color: '#EF4444', marginTop: '0.25rem' }}>{errors.city}</small>}
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
                    border: errors.state ? '2px solid #EF4444' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                />
                {errors.state && <small style={{ color: '#EF4444', marginTop: '0.25rem' }}>{errors.state}</small>}
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
                    border: errors.zipcode ? '2px solid #EF4444' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                />
                {errors.zipcode && <small style={{ color: '#EF4444', marginTop: '0.25rem' }}>{errors.zipcode}</small>}
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
                    border: errors.country ? '2px solid #EF4444' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                />
                {errors.country && <small style={{ color: '#EF4444', marginTop: '0.25rem' }}>{errors.country}</small>}
              </div>
            </div>

            <AnimatedButton
              type="submit"
              variant="primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : '💳 Complete Order'}
            </AnimatedButton>
          </form>
        </motion.div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            height: 'fit-content'
          }}
        >
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Order Summary</h2>

          <div style={{ marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
            {cart.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '1rem',
                  marginBottom: '1rem',
                  borderBottom: '1px solid #E5E7EB'
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: '500', marginBottom: '0.25rem' }}>{item.name}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#999' }}>Qty: {item.quantity}</p>
                </div>
                <p style={{ margin: 0, fontWeight: '600', color: '#10B981' }}>
                  ₹{(item.current_price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div style={{
            borderTop: '2px solid #E5E7EB',
            paddingTop: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#10B981'
          }}>
            <span>Total:</span>
            <span>₹{cartTotal.toFixed(2)}</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CheckoutPage;
