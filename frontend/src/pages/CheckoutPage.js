import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api';
import Button from '../components/common/Button';
import ErrorMessage from '../components/common/ErrorMessage';
import {
  CheckCircle2,
  ArrowLeft,
  CreditCard,
  Truck,
  Lock,
  MapPin,
  Plus,
  Home,
  Briefcase,
  ShieldCheck,
  Leaf,
  Check,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Zap,
  Phone
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatOrderReference, normalizeOrderId } from '../utils/orderUtils';
import './CheckoutPage.css';

export const CheckoutPage = ({ onOrderSuccess }) => {
  const { cart, cartTotal, clearCart } = useCart();
  const { navigateTo, goBack } = useNavigation();
  const { user, isAuthenticated } = useAuth();

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [addressSuccessMsg, setAddressSuccessMsg] = useState('');
  const [addressErrorMsg, setAddressErrorMsg] = useState('');
  const [duplicateAddress, setDuplicateAddress] = useState(null);

  const [formData, setFormData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    landmark: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'India',
    addressType: 'HOME',
    paymentMethod: 'cod',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);

  // Fetch saved user addresses if authenticated
  const fetchAddresses = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiService.getSavedAddresses();
      const addrList = Array.isArray(res) ? res : (res?.addresses || res?.data || []);
      setSavedAddresses(addrList);
      if (addrList.length > 0) {
        // Pick default or first address if none selected yet
        setSelectedAddressId((prevId) => {
          if (prevId && addrList.some((a) => a.id === prevId)) return prevId;
          const defaultAddr = addrList.find((a) => a.is_default) || addrList[0];
          applyAddressToForm(defaultAddr);
          return defaultAddr.id;
        });
        setShowNewAddressForm(false);
      } else {
        setShowNewAddressForm(true);
      }
    } catch (err) {
      console.error('Failed to load saved addresses:', err);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [isAuthenticated]);

  const applyAddressToForm = (addr) => {
    if (!addr) return;
    const nameParts = (addr.full_name || '').split(' ');
    setFormData((prev) => ({
      ...prev,
      firstName: nameParts[0] || user?.first_name || '',
      lastName: nameParts.slice(1).join(' ') || user?.last_name || '',
      phone: addr.phone || prev.phone,
      address: addr.address_line || prev.address,
      landmark: addr.landmark || '',
      city: addr.city || prev.city,
      state: addr.state || prev.state,
      zipcode: addr.zipcode || prev.zipcode,
      country: addr.country || 'India',
      addressType: addr.address_type || 'HOME',
    }));
  };

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setShowNewAddressForm(false);
    setEditingAddressId(null);
    setDuplicateAddress(null);
    setAddressSuccessMsg('');
    setAddressErrorMsg('');
    applyAddressToForm(addr);
    setErrors({});
  };

  const handleStartAddNewAddress = () => {
    setEditingAddressId(null);
    setDuplicateAddress(null);
    setAddressSuccessMsg('');
    setAddressErrorMsg('');
    setFormData((prev) => ({
      ...prev,
      firstName: user?.first_name || '',
      lastName: user?.last_name || '',
      email: user?.email || '',
      phone: '',
      address: '',
      landmark: '',
      city: '',
      state: '',
      zipcode: '',
      country: 'India',
      addressType: 'HOME',
    }));
    setShowNewAddressForm(true);
    setErrors({});
  };

  const handleStartEditAddress = (addr, e) => {
    if (e) e.stopPropagation();
    setEditingAddressId(addr.id);
    setDuplicateAddress(null);
    setAddressSuccessMsg('');
    setAddressErrorMsg('');
    applyAddressToForm(addr);
    setShowNewAddressForm(true);
    setErrors({});
  };

  const handleCancelAddressForm = () => {
    setShowNewAddressForm(false);
    setEditingAddressId(null);
    setDuplicateAddress(null);
    setAddressSuccessMsg('');
    setAddressErrorMsg('');
    setErrors({});
    if (selectedAddressId) {
      const active = savedAddresses.find((a) => a.id === selectedAddressId);
      if (active) applyAddressToForm(active);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
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
    if (!formData.zipcode.trim()) newErrors.zipcode = 'PIN code required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAddress = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    if (!isAuthenticated) {
      setShowNewAddressForm(false);
      return;
    }

    setSavingAddress(true);
    setAddressSuccessMsg('');
    setAddressErrorMsg('');
    setDuplicateAddress(null);

    const payload = {
      full_name: `${formData.firstName} ${formData.lastName}`.trim(),
      phone: formData.phone.trim(),
      address_line: formData.address.trim(),
      landmark: (formData.landmark || '').trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      zipcode: formData.zipcode.trim(),
      country: formData.country || 'India',
      address_type: formData.addressType || 'HOME',
      is_default: savedAddresses.length === 0 || !editingAddressId,
    };

    try {
      let res;
      if (editingAddressId) {
        res = await apiService.updateAddress(editingAddressId, payload);
      } else {
        res = await apiService.saveAddress(payload);
      }

      if (res && res.status === 'duplicate') {
        const existing = res.address || res.data;
        setDuplicateAddress(existing);
        setAddressErrorMsg('Address already saved.');
        return;
      }

      if (res && (res.status === 'success' || res.id || res.address)) {
        const savedAddr = res.address || res.data || res;
        setAddressSuccessMsg(
          editingAddressId
            ? 'Address updated successfully.'
            : 'Address saved successfully.'
        );

        await fetchAddresses();

        setSelectedAddressId(savedAddr.id);
        applyAddressToForm(savedAddr);
        setEditingAddressId(null);
        setDuplicateAddress(null);
        setTimeout(() => {
          setShowNewAddressForm(false);
          setAddressSuccessMsg('');
        }, 1200);
      } else {
        setAddressErrorMsg(res?.message || 'Unable to save address. Please try again.');
      }
    } catch (err) {
      console.error('Failed to save address:', err);
      const errMsg = err?.data?.message || err?.message || 'Unable to save address. Please try again.';
      setAddressErrorMsg(errMsg);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleUseDuplicateAddress = () => {
    if (duplicateAddress) {
      handleSelectSavedAddress(duplicateAddress);
    }
  };

  const handleConfirmDeleteAddress = async (addrId, e) => {
    if (e) e.stopPropagation();
    setDeleting(true);
    try {
      await apiService.deleteAddress(addrId);
      setSavedAddresses((prev) => prev.filter((a) => a.id !== addrId));
      if (selectedAddressId === addrId) {
        const remaining = savedAddresses.filter((a) => a.id !== addrId);
        if (remaining.length > 0) {
          const next = remaining[0];
          setSelectedAddressId(next.id);
          applyAddressToForm(next);
        } else {
          setSelectedAddressId(null);
          setShowNewAddressForm(true);
        }
      }
      setDeletingAddressId(null);
    } catch (err) {
      console.error('Failed to delete address:', err);
    } finally {
      setDeleting(false);
    }
  };

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

  const handleSubmitOrder = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    if (cart.length === 0) {
      setErrors({ submit: 'Your cart is empty. Please add items before placing an order.' });
      return;
    }

    setLoading(true);
    setErrors({});

    const shippingData = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      address: formData.landmark ? `${formData.address} (Landmark: ${formData.landmark})` : formData.address,
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
          throw new Error('Razorpay SDK could not be loaded. Please check your connection or choose Cash on Delivery.');
        }

        // Initialize server-side Razorpay order
        const payOrderRes = await apiService.createPaymentOrder({
          amount: cartTotal,
          currency: 'INR',
          phone: formData.phone,
          cartItems: cart.map(item => ({
            product_id: item.product?.id || item.id,
            quantity: item.quantity,
            variant_id: item.variant?.id || null
          }))
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
          description: 'Eco-Certified Marketplace Order',
          order_id: razorpayOrderId,
          prefill: {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            contact: formData.phone,
          },
          theme: {
            color: '#059669',
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
              const orderResponse = await apiService.createOrder({
                ...shippingData,
                payment_method: 'razorpay',
                razorpay_order_id: rzpResponse.razorpay_order_id || razorpayOrderId,
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
          setPaymentInfo({ status: 'PENDING', method: 'Cash on Delivery (COD)' });
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
          <div className="confirmation-icon-circle">
            <CheckCircle2 size={48} />
          </div>

          <div>
            <h1 className="confirmation-title">Order Placed Successfully</h1>
            <p className="confirmation-subtitle">
              Order ID: {placedOrder.order_reference_number || formatOrderReference(placedOrder.id)} • 100% Carbon-Neutral Delivery Active
            </p>
          </div>

          <div className="confirmation-details-box">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <MapPin size={18} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <strong>Delivering to:</strong> {formData.firstName} {formData.lastName} ({formData.phone})<br />
                <span style={{ color: 'var(--text-muted)' }}>
                  {formData.address}{formData.landmark ? `, ${formData.landmark}` : ''}, {formData.city}, {formData.state} - {formData.zipcode}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Truck size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <div>
                <strong>Payment Mode:</strong> {formData.paymentMethod === 'cod' ? 'Cash on Delivery (OTP on Delivery)' : 'Razorpay Online (Verified & Paid)'}
              </div>
            </div>

            {paymentInfo && paymentInfo.transactionId && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Zap size={13} aria-hidden="true" />
                <span>Payment Ref: {paymentInfo.transactionId}</span>
              </div>
            )}
          </div>

          <div className="confirmation-security-notice">
            <ShieldCheck size={16} style={{ color: '#059669' }} />
            <span>Delivery OTP verification will be required upon package arrival.</span>
          </div>

          <div className="confirmation-actions-row">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigateTo('order-tracking', {
                orderId: placedOrder.order_reference_number || placedOrder.id,
                id: placedOrder.order_reference_number || placedOrder.id
              })}
              icon={<Truck size={18} />}
            >
              Track Order Live
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigateTo('home')}>
              Continue Shopping
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Back Link */}
      <div style={{ margin: '1rem 0 1.5rem 0' }}>
        <Button variant="ghost" size="sm" onClick={goBack} icon={<ArrowLeft size={16} />}>
          Back to Cart
        </Button>
      </div>

      <div className="checkout-page-grid">
        {/* Left Column: Delivery Address & Payment */}
        <div className="checkout-main-content">
          {errors.submit && <ErrorMessage message={errors.submit} />}

          {/* Section 1: Saved Addresses & Delivery Location */}
          <div className="checkout-section-card">
            <div className="section-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span className="section-step-badge">1</span>
                <div>
                  <h2 className="section-card-title">Saved Delivery Addresses</h2>
                  <p className="section-card-desc">Select a saved address or enter a new delivery location</p>
                </div>
              </div>

              {savedAddresses.length > 0 && (
                <button
                  type="button"
                  className="add-address-toggle-btn"
                  onClick={showNewAddressForm ? handleCancelAddressForm : handleStartAddNewAddress}
                >
                  {showNewAddressForm ? 'Back to Saved Addresses' : '+ Add New Address'}
                </button>
              )}
            </div>

            {/* Address Success Notification */}
            {addressSuccessMsg && (
              <div className="address-alert-banner success">
                <CheckCircle2 size={16} />
                <span>{addressSuccessMsg}</span>
              </div>
            )}

            {/* Address Error / Duplicate Notification */}
            {addressErrorMsg && (
              <div className={`address-alert-banner ${duplicateAddress ? 'warning' : 'error'}`}>
                <AlertCircle size={16} />
                <div style={{ flex: 1 }}>
                  <span>{addressErrorMsg}</span>
                  {duplicateAddress && (
                    <div style={{ marginTop: '0.35rem' }}>
                      <button
                        type="button"
                        className="use-duplicate-btn"
                        onClick={handleUseDuplicateAddress}
                      >
                        Use Existing Address
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty saved addresses notice */}
            {savedAddresses.length === 0 && !showNewAddressForm && (
              <div style={{ padding: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No saved addresses yet.
              </div>
            )}

            {/* Saved Addresses List */}
            {!showNewAddressForm && savedAddresses.length > 0 && (
              <div className="saved-addresses-grid">
                {savedAddresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  const isDeleting = deletingAddressId === addr.id;

                  return (
                    <div
                      key={addr.id}
                      className={`saved-address-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectSavedAddress(addr)}
                    >
                      <div className="saved-address-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <input
                            type="radio"
                            name="selectedAddress"
                            checked={isSelected}
                            onChange={() => handleSelectSavedAddress(addr)}
                          />
                          <span className="address-type-pill">
                            {addr.address_type === 'WORK' ? <Briefcase size={12} /> : <Home size={12} />}
                            {addr.address_type || 'HOME'}
                          </span>
                        </div>
                        {addr.is_default && <span className="default-address-pill">Default</span>}
                      </div>

                      <div className="saved-address-body">
                        <div className="saved-address-name">{addr.full_name}</div>
                        <div className="saved-address-phone" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Phone size={13} aria-hidden="true" />
                          <span>{addr.phone}</span>
                        </div>
                        <div className="saved-address-text">
                          {addr.address_line}{addr.landmark ? `, Near ${addr.landmark}` : ''}, {addr.city}, {addr.state} - {addr.zipcode}
                        </div>
                      </div>

                      {/* Card Actions: Use, Edit, Delete */}
                      <div className="saved-address-actions-row">
                        <button
                          type="button"
                          className={`saved-addr-action-btn ${isSelected ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSavedAddress(addr);
                          }}
                        >
                          {isSelected ? (
                            <>
                              <Check size={12} /> Selected
                            </>
                          ) : (
                            'Use This Address'
                          )}
                        </button>

                        <button
                          type="button"
                          className="saved-addr-icon-btn"
                          title="Edit Address"
                          onClick={(e) => handleStartEditAddress(addr, e)}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="saved-addr-icon-btn delete"
                          title="Delete Address"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingAddressId(addr.id);
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>

                      {/* Inline Delete Confirmation */}
                      {isDeleting && (
                        <div className="delete-confirm-box" onClick={(e) => e.stopPropagation()}>
                          <span className="delete-confirm-text">Delete this saved address?</span>
                          <div className="delete-confirm-btns">
                            <button
                              type="button"
                              className="confirm-btn cancel"
                              onClick={() => setDeletingAddressId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="confirm-btn delete"
                              disabled={deleting}
                              onClick={(e) => handleConfirmDeleteAddress(addr.id, e)}
                            >
                              {deleting ? 'Deleting...' : 'Delete Address'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* New / Edit Address Form */}
            {(showNewAddressForm || savedAddresses.length === 0) && (
              <form onSubmit={handleSaveAddress} className="checkout-address-form">
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                </div>

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
                    {errors.firstName && <span className="form-error-msg">{errors.firstName}</span>}
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
                    {errors.lastName && <span className="form-error-msg">{errors.lastName}</span>}
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
                    {errors.email && <span className="form-error-msg">{errors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      className="form-input"
                      placeholder="10-digit mobile number"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                    {errors.phone && <span className="form-error-msg">{errors.phone}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">House / Flat / Street Address *</label>
                  <input
                    type="text"
                    name="address"
                    className="form-input"
                    placeholder="Flat / House No., Building Name, Street / Colony"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />
                  {errors.address && <span className="form-error-msg">{errors.address}</span>}
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Landmark (Optional)</label>
                    <input
                      type="text"
                      name="landmark"
                      className="form-input"
                      placeholder="e.g. Near Metro Station / Temple"
                      value={formData.landmark}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">PIN / Postal Code *</label>
                    <input
                      type="text"
                      name="zipcode"
                      className="form-input"
                      placeholder="6-digit PIN code (e.g. 500001)"
                      value={formData.zipcode}
                      onChange={handleChange}
                      required
                    />
                    {errors.zipcode && <span className="form-error-msg">{errors.zipcode}</span>}
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input
                      type="text"
                      name="city"
                      className="form-input"
                      placeholder="e.g. Hyderabad"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                    {errors.city && <span className="form-error-msg">{errors.city}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input
                      type="text"
                      name="state"
                      className="form-input"
                      placeholder="e.g. Telangana"
                      value={formData.state}
                      onChange={handleChange}
                      required
                    />
                    {errors.state && <span className="form-error-msg">{errors.state}</span>}
                  </div>
                </div>

                <div className="address-type-selector-row">
                  <span className="form-label" style={{ margin: 0 }}>Address Type:</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['HOME', 'WORK', 'OTHER'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`addr-type-btn ${formData.addressType === type ? 'active' : ''}`}
                        onClick={() => setFormData((prev) => ({ ...prev, addressType: type }))}
                      >
                        {type === 'HOME' && <Home size={13} />}
                        {type === 'WORK' && <Briefcase size={13} />}
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Explicit Address Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={savingAddress}
                    icon={<Check size={16} />}
                  >
                    {savingAddress
                      ? 'Saving Address...'
                      : editingAddressId
                      ? 'Update Address'
                      : 'Save Address'}
                  </Button>

                  {savedAddresses.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={handleCancelAddressForm}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Section 2: Payment Method */}
          <div className="checkout-section-card">
            <div className="section-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span className="section-step-badge">2</span>
                <div>
                  <h2 className="section-card-title">Payment Method</h2>
                  <p className="section-card-desc">Choose your preferred verified payment method</p>
                </div>
              </div>
            </div>

            <div className="payment-options-list">
              {/* Cash on Delivery */}
              <label className={`payment-option-card ${formData.paymentMethod === 'cod' ? 'selected' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={formData.paymentMethod === 'cod'}
                    onChange={handleChange}
                    style={{ marginTop: '3px' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div className="payment-option-title-row">
                      <span className="payment-title">Cash on Delivery (COD)</span>
                      <span className="payment-tag free">OTP Secured</span>
                    </div>
                    <span className="payment-subtext">
                      Pay via cash, QR code, or UPI at your doorstep upon verified delivery.
                    </span>
                  </div>
                </div>
              </label>

              {/* Razorpay Gateway */}
              <label className={`payment-option-card ${formData.paymentMethod === 'razorpay' ? 'selected' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={formData.paymentMethod === 'razorpay'}
                    onChange={handleChange}
                    style={{ marginTop: '3px' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div className="payment-option-title-row">
                      <span className="payment-title">Razorpay Secure Online Gateway</span>
                      <span className="payment-tag secure">Instant & Protected</span>
                    </div>
                    <span className="payment-subtext">
                      Supports UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, and NetBanking with 256-bit encryption.
                    </span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Price Breakdown */}
        <div className="checkout-sidebar-summary">
          <div className="summary-card-inner">
            <h3 className="summary-card-title">
              Order Summary ({cart.length} {cart.length === 1 ? 'item' : 'items'})
            </h3>

            {/* Cart Items List with Variants */}
            <div className="summary-items-list">
              {cart.map((item, idx) => {
                const itemImg = item.product?.image_url || item.image_url || item.imageUrl || '';
                const itemPrice = Number(item.current_price || item.product?.current_price || item.price || 0);
                const variantLabel = item.variant?.size || item.variant?.sku || (item.variant ? `Variant #${item.variant.id}` : null);

                return (
                  <div key={item.id || idx} className="summary-item-row">
                    <div className="summary-item-img-box">
                      {itemImg ? (
                        <img src={itemImg} alt={item.product?.name || item.name} />
                      ) : (
                        <div className="summary-item-placeholder">Eco</div>
                      )}
                    </div>

                    <div className="summary-item-info">
                      <div className="summary-item-name">{item.product?.name || item.name}</div>
                      {variantLabel && (
                        <div className="summary-item-variant">Size/Variant: <strong>{variantLabel}</strong></div>
                      )}
                      <div className="summary-item-qty-price">
                        <span>Qty: {item.quantity}</span>
                        <span className="summary-item-price">
                          ₹{(itemPrice * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pricing Breakdown */}
            <div className="price-breakdown-box">
              <div className="breakdown-row">
                <span>Total Item MRP</span>
                <span>₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="breakdown-row">
                <span>Carbon Neutral Offset</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>FREE (EcoNext)</span>
              </div>
              <div className="breakdown-row">
                <span>Delivery Fee</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>FREE</span>
              </div>
              <div className="breakdown-total-row">
                <span>Total Amount</span>
                <span className="breakdown-total-val">
                  ₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              onClick={handleSubmitOrder}
              icon={<Lock size={16} />}
            >
              {loading
                ? 'Processing...'
                : formData.paymentMethod === 'razorpay'
                ? `Pay ₹${cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} & Place Order`
                : `Confirm COD Order (₹${cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`}
            </Button>

            <div className="checkout-trust-badges">
              <div className="trust-badge-item">
                <ShieldCheck size={14} color="#059669" />
                <span>100% Safe Payments</span>
              </div>
              <div className="trust-badge-item">
                <Leaf size={14} color="#059669" />
                <span>Zero Plastic Packaging</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
