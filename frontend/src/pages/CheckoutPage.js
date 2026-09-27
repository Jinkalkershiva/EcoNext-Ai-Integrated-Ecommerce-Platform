import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api';
import Button from '../components/common/Button';
import ErrorMessage from '../components/common/ErrorMessage';
import { CheckCircle2, ArrowLeft, CreditCard, Truck, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import './CheckoutPage.css';

export const CheckoutPage = ({ onOrderSuccess }) => {
  const { cart, cartTotal, clearCart } = useCart();
  const { navigateTo, goBack } = useNavigation();
  const { user, authToken } = useAuth();

  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'India',
    paymentMethod: 'cod',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name required';
    if (!formData.email.trim() || !formData.email.includes('@')) newErrors.email = 'Valid email required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number required';
    if (!formData.address.trim()) newErrors.address = 'Street address required';
    if (!formData.city.trim()) newErrors.city = 'City required';
    if (!formData.state.trim()) newErrors.state = 'State required';
    if (!formData.zipcode.trim()) newErrors.zipcode = 'PIN/ZIP code required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [paymentInfo, setPaymentInfo] = useState(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    const shippingData = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipcode: formData.zipcode,
      country: formData.country,
      payment_method: formData.paymentMethod === 'razorpay' ? 'razorpay' : 'cod',
    };

    if (formData.paymentMethod === 'razorpay') {
      try {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded || typeof window.Razorpay === 'undefined') {
          throw new Error('Could not load Razorpay gateway. Please check your network or choose Cash on Delivery.');
        }

        // Step 1: Initialize server-side Razorpay payment order
        const payOrderRes = await apiService.createPaymentOrder({
          amount: cartTotal,
          currency: 'INR',
          phone: formData.phone,
        });

        const payData = payOrderRes?.data || payOrderRes;
        const razorpayOrderId = payData.razorpay_order_id || payData.razorpayOrderId || payData.order_id;
        const keyId = payData.razorpay_key_id || payData.razorpayKeyId || payData.keyId || payData.key_id;
        const amountInPaise = payData.amount_in_paise || payData.amountInPaise || Math.round((payData.amount || cartTotal) * 100);

        if (!razorpayOrderId) {
          throw new Error(payOrderRes?.message || 'Failed to initialize payment gateway.');
        }


        const options = {
          key: keyId,
          amount: amountInPaise,
          currency: payData.currency || 'INR',
          name: 'EcoNext Platform',
          description: 'Eco-Certified Goods Purchase',
          order_id: razorpayOrderId,
          prefill: {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            contact: formData.phone,
          },
          theme: {
            color: '#16a34a',
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
              setErrors({ submit: 'Payment was cancelled. Your order has not been placed.' });
            },
          },
          handler: async function (rzpResponse) {
            try {
              setLoading(true);
              // Step 2: Finalize EcoNext Order ONLY after verified Razorpay checkout
              const orderResponse = await apiService.createOrder({
                ...shippingData,
                payment_method: 'razorpay',
                razorpay_order_id: rzpResponse.razorpay_order_id,
                razorpay_payment_id: rzpResponse.razorpay_payment_id,
                razorpay_signature: rzpResponse.razorpay_signature,
              });

              if (orderResponse && orderResponse.status === 'success') {
                const orderData = orderResponse.order;
                setPaymentInfo({
                  status: 'PAID',
                  transactionId: rzpResponse.razorpay_payment_id,
                  orderId: rzpResponse.razorpay_order_id,
                });
                setPlacedOrder(orderData);
                clearCart();
                if (onOrderSuccess) onOrderSuccess(orderData);
              } else {
                setErrors({ submit: orderResponse?.message || 'Payment received, but failed to confirm order. Please contact customer support.' });
              }
            } catch (vErr) {
              setErrors({ submit: vErr.message || 'Payment verification failed. Your order could not be placed.' });
            } finally {
              setLoading(false);
            }
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setLoading(false);
          setErrors({
            submit: `Payment failed: ${response?.error?.description || 'Transaction declined'}. Your order has not been placed.`,
          });
        });

        rzp.open();
        setLoading(false);
      } catch (payErr) {
        console.error('Payment initialization error:', payErr);
        setErrors({ submit: payErr.message || 'Could not initiate Razorpay payment.' });
        setLoading(false);
      }
    } else {
      // Cash on Delivery
      try {
        const response = await apiService.createOrder(shippingData);
        if (response && response.status === 'success') {
          const orderData = response.order || { id: Math.floor(100000 + Math.random() * 900000) };
          setPaymentInfo({ status: 'PENDING', method: 'Cash on Delivery' });
          setPlacedOrder(orderData);
          clearCart();
          if (onOrderSuccess) onOrderSuccess(orderData);
        } else {
          setErrors({ submit: response?.error || response?.message || 'Failed to place order.' });
        }
      } catch (err) {
        console.error('Order creation error:', err);
        setErrors({ submit: err.message || 'Could not complete order. Please check backend connection.' });
      } finally {
        setLoading(false);
      }
    }
  };

  if (placedOrder) {
    return (
      <div className="container">
        <motion.div
          className="checkout-confirmation-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle2 size={48} />
          </div>

          <div>
            <h1 style={{ fontSize: '1.85rem', marginBottom: '0.5rem' }}>Order Confirmed!</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Order #{placedOrder.id} • Carbon-Neutral Shipping Active
            </p>
          </div>

          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-surface-sunken)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              textAlign: 'left',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)'
            }}
          >
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Shipping to:</strong> {formData.firstName} {formData.lastName}, {formData.address}, {formData.city}, {formData.state} - {formData.zipcode}
            </div>
            <div style={{ marginBottom: paymentInfo ? '0.5rem' : '0' }}>
              <strong>Payment:</strong> {formData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay Online Gateway (Verified & Secure)'}
            </div>
            {paymentInfo && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
                ⚡ Payment Status: {paymentInfo.status || 'VERIFIED'} {paymentInfo.transactionId ? `• Txn: ${paymentInfo.transactionId}` : ''}
              </div>
            )}
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            A confirmation receipt and tracking updates have been dispatched to <strong>{formData.email}</strong>.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigateTo('order-tracking', { orderId: placedOrder.id, id: placedOrder.id })}
              icon={<Truck size={18} />}
            >
              Track Your Order Live
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigateTo('home')}>
              Return to Homepage
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Back Link */}
      <div style={{ margin: '1rem 0' }}>
        <Button variant="ghost" size="sm" onClick={goBack} icon={<ArrowLeft size={16} />}>
          Back to Cart
        </Button>
      </div>

      {/* Progress Steps Indicator */}
      <div className="checkout-steps-bar">
        <div className="checkout-step-node active">
          <div className="checkout-step-number">1</div>
          <span>Shipping Details</span>
        </div>
        <div style={{ width: '40px', height: '2px', backgroundColor: 'var(--border-default)' }} />
        <div className="checkout-step-node">
          <div className="checkout-step-number">2</div>
          <span>Payment & Eco-Packaging</span>
        </div>
        <div style={{ width: '40px', height: '2px', backgroundColor: 'var(--border-default)' }} />
        <div className="checkout-step-node">
          <div className="checkout-step-number">3</div>
          <span>Confirmation</span>
        </div>
      </div>

      <div className="checkout-page-grid">
        {/* Shipping Form */}
        <div className="checkout-form-card">
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>Shipping Address</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Where should we deliver your eco-packaged order?
            </p>
          </div>

          {errors.submit && <ErrorMessage message={errors.submit} />}

          <form onSubmit={handleSubmit} id="checkout-form">
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  className="form-input"
                  placeholder="e.g. Shiva"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
                {errors.firstName && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{errors.firstName}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  className="form-input"
                  placeholder="e.g. Kumar"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
                {errors.lastName && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{errors.lastName}</span>}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                {errors.email && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
                {errors.phone && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{errors.phone}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Street Address *</label>
              <input
                type="text"
                name="address"
                className="form-input"
                placeholder="House / Flat No., Building, Area, Landmark"
                value={formData.address}
                onChange={handleChange}
                required
              />
              {errors.address && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{errors.address}</span>}
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  name="city"
                  className="form-input"
                  placeholder="e.g. Mumbai"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
                {errors.city && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{errors.city}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">State *</label>
                <input
                  type="text"
                  name="state"
                  className="form-input"
                  placeholder="e.g. Maharashtra"
                  value={formData.state}
                  onChange={handleChange}
                  required
                />
                {errors.state && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{errors.state}</span>}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">PIN / Postal Code *</label>
                <input
                  type="text"
                  name="zipcode"
                  className="form-input"
                  placeholder="e.g. 400001"
                  value={formData.zipcode}
                  onChange={handleChange}
                  required
                />
                {errors.zipcode && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{errors.zipcode}</span>}
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

            {/* Payment Method Selector */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
              <label className="form-label" style={{ marginBottom: '0.75rem' }}>Payment Method</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: formData.paymentMethod === 'razorpay' ? 'var(--color-primary-subtle)' : 'var(--bg-surface)',
                    borderColor: formData.paymentMethod === 'razorpay' ? 'var(--color-primary)' : 'var(--border-default)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={formData.paymentMethod === 'razorpay'}
                    onChange={handleChange}
                  />
                  <CreditCard size={18} color="var(--color-primary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Razorpay Online Gateway (UPI, Cards, NetBanking)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fast 256-bit encrypted checkout via Spring Boot Payment Microservice</div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: formData.paymentMethod === 'cod' ? 'var(--color-primary-subtle)' : 'var(--bg-surface)',
                    borderColor: formData.paymentMethod === 'cod' ? 'var(--color-primary)' : 'var(--border-default)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={formData.paymentMethod === 'cod'}
                    onChange={handleChange}
                  />
                  <Truck size={18} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Cash on Delivery (COD)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pay safely in cash or UPI when your eco-friendly package arrives</div>
                  </div>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Right Summary Column */}
        <div className="cart-summary-card">
          <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            Items in Order ({cart.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '240px', overflowY: 'auto' }}>
            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{item.quantity}x</span>
                  <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ₹{(Number(item.current_price || 0) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="cart-summary-row">
              <span>Delivery</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>FREE (Carbon Neutral)</span>
            </div>
            <div className="cart-summary-total-row">
              <span>Total Payable</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                ₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <Button
            type="submit"
            form="checkout-form"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            icon={<Lock size={16} />}
          >
            {loading
              ? 'Processing...'
              : formData.paymentMethod === 'razorpay'
              ? `🔒 Pay ₹${cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} & Place Order`
              : `Place Order with COD (₹${cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`}
          </Button>

          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            🛡️ Protected by EcoNext Zero-Risk Guarantee
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
