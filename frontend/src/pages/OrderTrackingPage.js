import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api';
import { createTrackingClient } from '../utils/stompClient';
import Button from '../components/common/Button';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  CheckCheck,
  XCircle,
  RefreshCw,
  ShoppingBag,
  MapPin,
  CreditCard,
  Calendar,
  ShieldCheck,
  Search,
  ExternalLink,
  Radio,
  Lock,
  KeyRound,
  Send,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './OrderTrackingPage.css';

export const OrderTrackingPage = () => {
  const { params, navigateTo } = useNavigation();
  const { isAuthenticated } = useAuth();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [wsStatus, setWsStatus] = useState('connecting'); // 'connected' | 'connecting' | 'disconnected'
  const [liveLocation, setLiveLocation] = useState(null);
  const [lastLiveEvent, setLastLiveEvent] = useState(null);

  // Delivery OTP Verification States
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [otpResent, setOtpResent] = useState(false);

  const targetOrderId = params?.orderId || params?.id;
  const stompClientRef = useRef(null);

  const loadOrders = useCallback(async (selectId = null) => {
    try {
      setError(null);
      const res = await apiService.getOrders();
      const orderList = Array.isArray(res) ? res : (res?.orders || res?.data || []);
      setOrders(orderList);

      if (orderList.length > 0) {
        if (selectId) {
          const matched = orderList.find(
            o => String(o.id) === String(selectId) || o.order_reference_number === selectId
          );
          setSelectedOrder(matched || orderList[0]);
        } else if (!selectedOrder) {
          setSelectedOrder(orderList[0]);
        } else {
          // Re-sync currently selected order
          const refreshed = orderList.find(o => o.id === selectedOrder.id);
          if (refreshed) setSelectedOrder(refreshed);
        }
      } else {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Failed to load user orders:', err);
      setError('Unable to load orders from backend. Please ensure you are logged in.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedOrder]);

  useEffect(() => {
    loadOrders(targetOrderId);
  }, [targetOrderId]);

  // idx-11: Order Operations Service (WebSocket / STOMP) → Customer Frontend
  // reason: Stream real-time vehicle GPS coordinates and shipment milestone state transitions.
  useEffect(() => {
    if (!selectedOrder?.id) return;

    setWsStatus('connecting');
    const client = createTrackingClient();
    stompClientRef.current = client;

    client.onConnect(() => {
      setWsStatus('connected');
    });

    client.onDisconnect(() => {
      setWsStatus('disconnected');
    });

    client.connect();

    // Subscribe to STOMP channel for this specific order
    const orderSub = client.subscribe(`/topic/orders/${selectedOrder.id}`, (data) => {
      if (!data) return;
      setLastLiveEvent(data);

      if (data.eventType === 'SHIPMENT_STATUS_UPDATED' || data.status) {
        const newStatus = (data.status || '').toUpperCase();
        setSelectedOrder((prev) => {
          if (!prev || String(prev.id) !== String(data.orderId)) return prev;

          // Dynamically update timeline steps based on incoming state
          const updatedTimeline = (prev.tracking_timeline || []).map((step) => {
            if (newStatus === 'DELIVERED') {
              return { ...step, state: 'completed' };
            }
            if (step.step === newStatus) {
              return { ...step, state: 'current', timestamp: new Date().toISOString() };
            }
            return step;
          });

          return {
            ...prev,
            status: newStatus,
            carrier_name: data.carrierName || prev.carrier_name,
            tracking_number: data.trackingNumber || prev.tracking_number,
            tracking_timeline: updatedTimeline
          };
        });
      }

      if (data.eventType === 'SHIPMENT_LOCATION_UPDATED' || (data.latitude && data.longitude)) {
        setLiveLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          locationName: data.locationName,
          status: data.status || selectedOrder.status,
          trackingNumber: data.trackingNumber,
          vehicleNumber: data.vehicleNumber,
          shipmentNumber: data.shipmentNumber,
          note: data.note,
          timestamp: data.timestamp || new Date().toISOString()
        });
      }
    });

    return () => {
      if (orderSub && orderSub.unsubscribe) {
        orderSub.unsubscribe();
      }
      client.disconnect();
      setWsStatus('disconnected');
    };
  }, [selectedOrder?.id]);

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    await loadOrders(selectedOrder?.id);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const cleanQuery = searchQuery.trim().replace(/^ORD-/, '').replace(/^#/, '');
    const found = orders.find(
      o => String(o.id) === cleanQuery || o.order_reference_number?.includes(searchQuery.trim())
    );
    if (found) {
      setSelectedOrder(found);
      setError(null);
      setOtpSuccess(null);
      setOtpError(null);
    } else {
      setError(`No order found matching "${searchQuery}".`);
    }
  };

  // Delivery OTP Verification Handler
  const handleVerifyDeliveryOtp = async (e) => {
    e?.preventDefault();
    if (!deliveryOtp.trim()) {
      setOtpError('Please enter the 6-digit delivery PIN.');
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    setOtpSuccess(null);
    try {
      const res = await apiService.verifyOrderDeliveryOtp(selectedOrder.id, deliveryOtp.trim());
      const successMsg = res?.message || 'Delivery PIN verified successfully! Order marked as DELIVERED.';
      setOtpSuccess(successMsg);
      setDeliveryOtp('');

      // Instantly update selected order status locally and in order list
      setSelectedOrder((prev) => {
        if (!prev) return prev;
        const updatedTimeline = (prev.tracking_timeline || []).map((step) => ({
          ...step,
          state: 'completed',
          timestamp: step.step === 'DELIVERED' ? new Date().toISOString() : step.timestamp
        }));

        return {
          ...prev,
          status: 'DELIVERED',
          tracking_timeline: updatedTimeline
        };
      });

      setOrders((prevOrders) =>
        prevOrders.map((ord) =>
          ord.id === selectedOrder.id ? { ...ord, status: 'DELIVERED' } : ord
        )
      );
    } catch (err) {
      const msg = err?.data?.message || err?.message || 'Invalid or expired Delivery PIN. Please try again.';
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  // Delivery OTP Resend Handler
  const handleResendDeliveryOtp = async () => {
    setOtpLoading(true);
    setOtpError(null);
    try {
      await apiService.sendOrderDeliveryOtp(selectedOrder.id);
      setOtpResent(true);
      setOtpSuccess('A fresh 6-digit Delivery PIN has been sent to your email.');
      setTimeout(() => setOtpResent(false), 30000);
    } catch (err) {
      const msg = err?.data?.message || err?.message || 'Failed to resend Delivery PIN. Please try again.';
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    const s = (status || '').toUpperCase();
    if (s.includes('DELIVERED')) return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', label: 'Delivered' };
    if (s.includes('SHIPPED') || s.includes('TRANSIT')) return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', label: 'In Transit' };
    if (s.includes('OUT_FOR_DELIVERY')) return { bg: '#fef3c7', text: '#b45309', border: '#fde68a', label: 'Out for Delivery' };
    if (s.includes('PROCESSING') || s.includes('ACCEPTED') || s.includes('CONFIRMED')) return { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff', label: 'Processing' };
    if (s.includes('CANCELLED') || s.includes('FAILED')) return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', label: 'Cancelled' };
    return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', label: 'Order Placed' };
  };

  if (loading) {
    return (
      <div className="container tracking-page-container">
        <div style={{ textAlign: 'center', padding: '5rem 0' }}>
          <RefreshCw size={36} className="spinner" style={{ color: 'var(--color-primary)', margin: '0 auto 1rem auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>Retrieving live order tracking & fulfillment telemetry...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container tracking-page-container">
        <div className="tracking-header-section">
          <div>
            <h1 className="tracking-header-title">Order Tracking & History</h1>
            <p className="tracking-header-subtitle">Track your carbon-neutral deliveries in real-time</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
          <ShoppingBag size={56} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>No Orders Found Yet</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
            You haven't placed any sustainable orders yet. Discover our collection of eco-certified fashion and lifestyle products.
          </p>
          <Button variant="primary" size="md" onClick={() => navigateTo('products')}>
            Explore Sustainable Products
          </Button>
        </div>
      </div>
    );
  }

  const badge = getStatusBadgeStyle(selectedOrder?.status);
  const timeline = selectedOrder?.tracking_timeline || [];
  const isOutForDelivery = (selectedOrder?.status || '').toUpperCase() === 'OUT_FOR_DELIVERY';
  const isDelivered = (selectedOrder?.status || '').toUpperCase() === 'DELIVERED';

  // Compute active GPS coordinates
  const currentLat = liveLocation?.latitude || selectedOrder?.current_latitude;
  const currentLon = liveLocation?.longitude || selectedOrder?.current_longitude;
  const mapsUrl = (currentLat && currentLon) ? `https://www.google.com/maps?q=${currentLat},${currentLon}` : null;

  return (
    <div className="container tracking-page-container">
      {/* Top Header */}
      <div className="tracking-header-section">
        <div>
          <h1 className="tracking-header-title">Order Tracking & History</h1>
          <p className="tracking-header-subtitle">
            Live end-to-end telemetry for order #{selectedOrder?.order_reference_number || `ORD-${selectedOrder?.id}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefreshStatus}
            disabled={refreshing}
            icon={<RefreshCw size={15} className={refreshing ? 'spinner' : ''} />}
          >
            {refreshing ? 'Syncing...' : 'Refresh Status'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateTo('products')}
            icon={<ShoppingBag size={15} />}
          >
            Continue Shopping
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Grid: Left Orders List, Right Detailed Tracking */}
      <div className="tracking-grid-layout">
        {/* Left Sidebar: My Orders */}
        <div className="orders-list-sidebar">
          <div className="orders-list-title">
            <span>Your Orders ({orders.length})</span>
          </div>

          {/* Quick Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.35rem' }}>
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.65rem' }}
              placeholder="Search by Order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" variant="secondary" size="sm">
              <Search size={14} />
            </Button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '520px', overflowY: 'auto' }}>
            {orders.map((ord) => {
              const isSelected = selectedOrder?.id === ord.id;
              const ordBadge = getStatusBadgeStyle(ord.status);
              const dateStr = new Date(ord.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div
                  key={ord.id}
                  className={`order-mini-card ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedOrder(ord);
                    setError(null);
                    setOtpSuccess(null);
                    setOtpError(null);
                  }}
                >
                  <div className="order-mini-header">
                    <span className="order-mini-ref">
                      #{ord.order_reference_number || `ORD-${ord.id}`}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: ordBadge.bg,
                        color: ordBadge.text,
                        border: `1px solid ${ordBadge.border}`,
                        fontWeight: 600
                      }}
                    >
                      {ordBadge.label}
                    </span>
                  </div>

                  <div className="order-mini-date">
                    <Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    {dateStr}
                  </div>

                  <div className="order-mini-footer">
                    <span style={{ color: 'var(--text-muted)' }}>
                      {ord.items?.length || 1} item(s)
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      ₹{Number(ord.total_price || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Pane */}
        {selectedOrder ? (
          <motion.div
            key={selectedOrder.id}
            className="tracking-detail-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Overview Header */}
            <div className="tracking-order-overview">
              <div className="overview-main">
                <h2>
                  Order #{selectedOrder.order_reference_number || `ORD-${selectedOrder.id}`}
                </h2>
                <div className="overview-meta">
                  <span>
                    <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span>•</span>
                  <span>
                    Total: <strong style={{ color: 'var(--color-primary)' }}>₹{Number(selectedOrder.total_price || 0).toFixed(2)}</strong>
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.95rem',
                  borderRadius: '9999px',
                  backgroundColor: badge.bg,
                  color: badge.text,
                  border: `1px solid ${badge.border}`,
                  fontWeight: 700,
                  fontSize: '0.875rem'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: badge.text }} />
                {badge.label}
              </div>
            </div>

            {/* Visual Order-Status Timeline */}
            <div className="timeline-section-card">
              <div className="timeline-section-header">
                <h3>
                  <Truck size={20} color="var(--color-primary)" />
                  Fulfillment & Delivery Progress
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  100% Carbon-Neutral Shipping
                </span>
              </div>

              <div className="stepper-horizontal">
                {timeline.map((item, idx) => {
                  let NodeIcon = CircleIcon;
                  if (item.state === 'completed') NodeIcon = CheckCircle2;
                  else if (item.state === 'current') NodeIcon = CurrentStepIcon(item.step);
                  else if (item.state === 'cancelled') NodeIcon = XCircle;

                  const formattedTime = item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : null;

                  return (
                    <div
                      key={item.step || idx}
                      className={`stepper-node ${item.state}`}
                    >
                      <div className="stepper-icon-circle">
                        <NodeIcon size={18} />
                      </div>
                      <div className="stepper-label">{item.title}</div>
                      {formattedTime && (
                        <div className="stepper-timestamp">{formattedTime}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Carrier & Tracking Bar */}
            <div className="carrier-info-bar">
              <div className="carrier-item">
                <div className="carrier-item-icon">
                  <Truck size={18} />
                </div>
                <div className="carrier-item-text">
                  <span className="carrier-item-label">Delivery Partner</span>
                  <span className="carrier-item-val">{selectedOrder.carrier_name || 'EcoExpress Carbon-Neutral'}</span>
                </div>
              </div>

              <div className="carrier-item">
                <div className="carrier-item-icon">
                  <Package size={18} />
                </div>
                <div className="carrier-item-text">
                  <span className="carrier-item-label">Tracking / AWB Number</span>
                  <span className="carrier-item-val" style={{ fontFamily: 'var(--font-mono)' }}>
                    {selectedOrder.tracking_number || `ECO-AWB-${selectedOrder.id + 100000}`}
                  </span>
                </div>
              </div>

              <div className="carrier-item">
                <div className="carrier-item-icon">
                  <Clock size={18} />
                </div>
                <div className="carrier-item-text">
                  <span className="carrier-item-label">Estimated Delivery</span>
                  <span className="carrier-item-val">
                    {selectedOrder.estimated_delivery
                      ? new Date(selectedOrder.estimated_delivery).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                      : 'Within 3-4 Business Days'}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Delivery PIN / OTP Verification Widget (Shown when OUT_FOR_DELIVERY) */}
            {isOutForDelivery && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                  border: '2px solid #10b981',
                  borderRadius: 'var(--radius-lg, 12px)',
                  padding: '1.5rem',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.12)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <KeyRound size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#064e3b' }}>
                        Secure Delivery PIN Verification
                      </h4>
                      <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#047857' }}>
                        Your package is Out for Delivery! Enter the 6-digit PIN sent to your email to confirm package handover.
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '9999px',
                      backgroundColor: '#d1fae5',
                      color: '#065f46',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      border: '1px solid #a7f3d0'
                    }}
                  >
                    🔐 PIN Active (10m TTL)
                  </span>
                </div>

                <form onSubmit={handleVerifyDeliveryOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="text"
                      maxLength={6}
                      pattern="[0-9]*"
                      className="form-input"
                      placeholder="Enter 6-Digit PIN"
                      value={deliveryOtp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setDeliveryOtp(val);
                        setOtpError(null);
                      }}
                      style={{
                        maxWidth: '220px',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        letterSpacing: '4px',
                        textAlign: 'center',
                        fontFamily: 'var(--font-mono, monospace)',
                        border: '2px solid #059669',
                        padding: '0.55rem 0.75rem',
                        backgroundColor: '#ffffff'
                      }}
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={otpLoading || deliveryOtp.length < 4}
                      icon={<CheckCheck size={18} />}
                      style={{ backgroundColor: '#059669', borderColor: '#059669', fontWeight: 700 }}
                    >
                      {otpLoading ? 'Verifying...' : 'Verify & Mark Delivered'}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={handleResendDeliveryOtp}
                      disabled={otpLoading || otpResent}
                      icon={<Send size={15} />}
                    >
                      {otpResent ? 'PIN Resent' : 'Resend PIN'}
                    </Button>
                  </div>

                  {otpError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.35rem' }}>
                      <AlertCircle size={16} />
                      {otpError}
                    </div>
                  )}

                  {otpSuccess && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857', fontSize: '0.85rem', fontWeight: 700, marginTop: '0.35rem' }}>
                      <CheckCircle2 size={16} />
                      {otpSuccess}
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Delivery Success Confirmation Card */}
            {isDelivered && (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: 'var(--radius-lg, 12px)',
                  padding: '1.2rem 1.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCheck size={22} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#166534' }}>
                    Package Delivered Successfully!
                  </h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#15803d' }}>
                    Thank you for supporting 100% sustainable, carbon-neutral commerce with EcoNext.
                  </p>
                </div>
              </div>
            )}

            {/* Live Real-Time Vehicle GPS Telemetry Stream */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(6, 95, 70, 0.03) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: '1.15rem 1.35rem',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: wsStatus === 'connected' ? '#10b981' : wsStatus === 'connecting' ? '#f59e0b' : '#94a3b8',
                      boxShadow: wsStatus === 'connected' ? '0 0 0 3px rgba(16, 185, 129, 0.3)' : 'none',
                      animation: wsStatus === 'connected' ? 'pulse 2s infinite' : 'none'
                    }}
                  />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Radio size={16} color={wsStatus === 'connected' ? '#10b981' : 'var(--text-muted)'} />
                    Live Logistics & GPS Telemetry Stream
                  </h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      backgroundColor: wsStatus === 'connected' ? '#dcfce7' : wsStatus === 'connecting' ? '#fef3c7' : '#f1f5f9',
                      color: wsStatus === 'connected' ? '#15803d' : wsStatus === 'connecting' ? '#b45309' : '#64748b',
                      fontWeight: 700,
                      border: wsStatus === 'connected' ? '1px solid #bbf7d0' : wsStatus === 'connecting' ? '1px solid #fde68a' : '1px solid #e2e8f0'
                    }}
                  >
                    {wsStatus === 'connected' ? '● STOMP WebSocket Live' : wsStatus === 'connecting' ? '○ Connecting...' : '○ Standby Mode'}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  padding: '0.9rem 1.1rem',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border-default, #e2e8f0)'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Current GPS Coordinates
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '0.9rem', color: currentLat ? '#059669' : 'var(--text-secondary)' }}>
                      {currentLat && currentLon
                        ? `${Number(currentLat).toFixed(4)}° N, ${Number(currentLon).toFixed(4)}° E`
                        : 'Awaiting first GPS ping'}
                    </span>

                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.78rem',
                          color: '#059669',
                          fontWeight: 700,
                          textDecoration: 'none',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          width: 'fit-content'
                        }}
                      >
                        <ExternalLink size={13} />
                        Open in Google Maps
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Logistics Vehicle
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    🚚 {liveLocation?.vehicleNumber || selectedOrder.vehicle_number || 'EcoLogistics Electric Fleet'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Current Location / Hub
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    📍 {liveLocation?.locationName || selectedOrder.city || 'Regional Fulfillment Hub'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Telemetry Timestamp
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {liveLocation?.timestamp
                      ? new Date(liveLocation.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : 'Real-time telemetry ready'}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Items List */}
            <div className="tracking-items-section">
              <h3>Items in this Order ({selectedOrder.items?.length || 0})</h3>
              <div>
                {selectedOrder.items?.map((item) => {
                  const product = item.product || {};
                  const itemSubtotal = Number(item.price_at_purchase || product.current_price || 0) * item.quantity;
                  const imgUrl = product.image_url;

                  return (
                    <div key={item.id} className="tracking-item-row">
                      <div className="tracking-item-left">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={product.name || 'Product'}
                            className="tracking-item-img"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="tracking-item-img-placeholder">
                            Image unavailable
                          </div>
                        )}
                        <div className="tracking-item-details">
                          <span className="tracking-item-name">{product.name || 'Eco-Certified Product'}</span>
                          <span className="tracking-item-qty">
                            Quantity: <strong>{item.quantity}</strong> • Unit Price: ₹{Number(item.price_at_purchase || product.current_price || 0).toFixed(2)}
                          </span>
                          {product.category && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                              🌿 {typeof product.category === 'object' ? product.category.name : product.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="tracking-item-price">
                        ₹{itemSubtotal.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Two Column: Shipping Address & Payment Summary */}
            <div className="tracking-info-grid">
              {/* Shipping Address */}
              <div className="tracking-info-block">
                <h4>
                  <MapPin size={16} /> Delivery Address
                </h4>
                <p>
                  <strong>{selectedOrder.recipient_name || selectedOrder.customer_name || 'Customer'}</strong>
                </p>
                <p>{selectedOrder.shipping_address}</p>
                <p>
                  {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.zipcode}
                </p>
                <p>{selectedOrder.country || 'India'}</p>
                {selectedOrder.phone && (
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Contact Phone: {selectedOrder.phone}
                  </p>
                )}
              </div>

              {/* Payment Details */}
              <div className="tracking-info-block">
                <h4>
                  <CreditCard size={16} /> Payment Information
                </h4>
                <p>
                  <strong>Method: </strong>
                  {selectedOrder.payment_method === 'razorpay'
                    ? 'Razorpay Online Gateway (UPI / Cards)'
                    : selectedOrder.payment_method === 'cod'
                    ? 'Cash on Delivery (COD)'
                    : selectedOrder.payment_method?.toUpperCase()}
                </p>
                <p>
                  <strong>Payment Status: </strong>
                  <span
                    style={{
                      color: selectedOrder.payment_status === 'VERIFIED' || selectedOrder.payment_status === 'PAID'
                        ? 'var(--color-success, #16a34a)'
                        : 'var(--color-warning, #d97706)',
                      fontWeight: 700
                    }}
                  >
                    {selectedOrder.payment_status || 'PENDING'}
                  </span>
                </p>
                {selectedOrder.razorpay_payment_id && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Transaction ID: <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedOrder.razorpay_payment_id}</span>
                  </p>
                )}

                <div className="order-totals-summary">
                  <div className="order-totals-row">
                    <span>Subtotal</span>
                    <span>₹{Number(selectedOrder.total_price || 0).toFixed(2)}</span>
                  </div>
                  <div className="order-totals-row">
                    <span>Carbon-Neutral Delivery</span>
                    <span style={{ color: 'var(--color-success, #16a34a)', fontWeight: 600 }}>FREE</span>
                  </div>
                  <div className="order-totals-final">
                    <span>Total Paid</span>
                    <span>₹{Number(selectedOrder.total_price || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
            <p className="text-muted">Select an order from the list on the left to view detailed tracking telemetry.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Icon for Default Step Node
function CircleIcon(props) {
  return (
    <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function CurrentStepIcon(stepKey) {
  switch (stepKey) {
    case 'PACKED':
      return Package;
    case 'IN_TRANSIT':
      return Truck;
    case 'SHIPPED':
      return Truck;
    case 'OUT_FOR_DELIVERY':
      return Truck;
    case 'PROCESSING':
      return Package;
    case 'ORDER_CONFIRMED':
    case 'ORDER_ACCEPTED':
      return CheckCircle2;
    case 'PAYMENT_CONFIRMED':
      return ShieldCheck;
    case 'DELIVERED':
      return CheckCheck;
    default:
      return Clock;
  }
}

export default OrderTrackingPage;
