import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { apiService, tokenStore } from '../api';
import { createTrackingClient } from '../utils/stompClient';
import { normalizeOrderId, formatOrderReference, matchesOrderId } from '../utils/orderUtils';
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
  AlertCircle,
  RotateCcw,
  AlertTriangle,
  X,
  FileText,
  ShieldAlert,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './OrderTrackingPage.css';

const RETURN_REASONS = [
  'Damaged / Defective product received',
  'Quality not as expected',
  'Wrong item or size delivered',
  'Missing items or accessories in package',
  'Product differs from website description',
  'Other'
];

const CANCELLATION_REASONS = [
  'Ordered by mistake',
  'Expected delivery date too late',
  'Found a better price elsewhere',
  'Need to change shipping address',
  'Item not needed anymore',
  'Other'
];

export const OrderTrackingPage = () => {
  const { params, navigateTo } = useNavigation();
  const { isAuthenticated } = useAuth();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [wsStatus, setWsStatus] = useState('connecting'); // 'connected' | 'connecting' | 'disconnected'
  const [liveLocation, setLiveLocation] = useState(null);
  const [lastLiveEvent, setLastLiveEvent] = useState(null);



  // Cancellation Modal States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ordered by mistake');
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Return Request Modal States
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('Damaged / Defective product received');
  const [returnCustomReason, setReturnCustomReason] = useState('');
  const [conditionCheck1, setConditionCheck1] = useState(true);
  const [conditionCheck2, setConditionCheck2] = useState(true);
  const [conditionCheck3, setConditionCheck3] = useState(true);
  const [conditionNote, setConditionNote] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const targetOrderId = params?.orderId || params?.id || params?.rawOrderId;
  const stompClientRef = useRef(null);

  const loadOrders = useCallback(async (selectId = null) => {
    if (!isAuthenticated && !tokenStore.isAuthenticated()) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const targetId = selectId || targetOrderId;
      const cleanTargetId = targetId ? normalizeOrderId(targetId) : null;

      const res = await apiService.getOrders();
      const orderList = Array.isArray(res) ? res : (res?.orders || res?.data || []);
      setOrders(orderList);

      if (orderList.length > 0) {
        if (targetId) {
          let matched = orderList.find((o) => matchesOrderId(o, targetId));

          if (!matched && cleanTargetId) {
            // Try fetching directly via single order endpoint
            try {
              const singleRes = await apiService.getOrderDetail(cleanTargetId);
              if (singleRes && singleRes.order) {
                matched = singleRes.order;
                setOrders((prev) => [singleRes.order, ...prev.filter((x) => !matchesOrderId(x, singleRes.order))]);
              }
            } catch (singleErr) {
              console.warn('Single order fetch fallback failed:', singleErr);
            }
          }

          if (matched) {
            setSelectedOrder(matched);
            setError(null);
          } else {
            setSelectedOrder(null);
            setError(`Order #${targetId} not found.`);
          }
        } else {
          // Re-sync currently selected order or select first
          setSelectedOrder((prev) => {
            if (prev) {
              const refreshed = orderList.find((o) => matchesOrderId(o, prev));
              if (refreshed) return refreshed;
            }
            return orderList[0];
          });
        }
      } else if (targetId) {
        // orderList is empty from list endpoint, attempt fetching single order directly
        try {
          const singleRes = await apiService.getOrderDetail(cleanTargetId || targetId);
          if (singleRes && singleRes.order) {
            setOrders((prev) => [singleRes.order, ...prev.filter((x) => !matchesOrderId(x, singleRes.order))]);
            setSelectedOrder(singleRes.order);
            setError(null);
          } else {
            setSelectedOrder(null);
            setError(`Order #${targetId} not found.`);
          }
        } catch (singleErr) {
          setSelectedOrder(null);
          setError(`Order #${targetId} not found.`);
        }
      } else {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Failed to load user orders:', err);
      // Fallback single order attempt without clearing prior order list
      const targetId = selectId || targetOrderId;
      const cleanTargetId = targetId ? normalizeOrderId(targetId) : null;
      if (cleanTargetId || targetId) {
        try {
          const singleRes = await apiService.getOrderDetail(cleanTargetId || targetId);
          if (singleRes && singleRes.order) {
            setOrders((prev) => [singleRes.order, ...prev.filter((x) => !matchesOrderId(x, singleRes.order))]);
            setSelectedOrder(singleRes.order);
            setError(null);
            return;
          }
        } catch (e) {
          // ignore
        }
      }
      setError(targetId ? `Order #${targetId} not found.` : (err.message || 'Unable to load orders.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetOrderId, isAuthenticated]);

  useEffect(() => {
    loadOrders(targetOrderId);
  }, [targetOrderId]);

  // WebSocket Live Stomp
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

    // 1. Subscribe to order-specific topic
    const orderSub = client.subscribe(`/topic/orders/${selectedOrder.id}`, (data) => {
      if (!data) return;
      setLastLiveEvent(data);

      if (data.eventType === 'SHIPMENT_STATUS_UPDATED' || data.status) {
        const newStatus = (data.status || '').toUpperCase();
        setSelectedOrder((prev) => {
          if (!prev || String(prev.id) !== String(data.orderId)) return prev;

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

        setOrders((prevOrders) =>
          prevOrders.map((ord) =>
            String(ord.id) === String(data.orderId) || (data.orderId && matchesOrderId(ord, data.orderId))
              ? { ...ord, status: newStatus }
              : ord
          )
        );
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

    // 2. If shipment ID is available, also subscribe to shipment topic
    const activeShipmentId = selectedOrder.shipment_id || selectedOrder.shipments?.[0]?.id;
    let shipmentSub = null;
    if (activeShipmentId) {
      shipmentSub = client.subscribe(`/topic/shipments/${activeShipmentId}`, (data) => {
        if (!data) return;
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
    }

    return () => {
      if (orderSub && orderSub.unsubscribe) {
        orderSub.unsubscribe();
      }
      if (shipmentSub && shipmentSub.unsubscribe) {
        shipmentSub.unsubscribe();
      }
      client.disconnect();
      setWsStatus('disconnected');
    };
  }, [selectedOrder?.id, selectedOrder?.shipment_id]);

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    await loadOrders(selectedOrder?.id);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim();
    const found = orders.find(
      (o) => matchesOrderId(o, query) || o.order_reference_number?.toLowerCase().includes(query.toLowerCase())
    );
    if (found) {
      setSelectedOrder(found);
      setError(null);
      setOtpSuccess(null);
      setOtpError(null);
    } else {
      // Authoritative backend fallback query by order ID or reference
      try {
        const cleanId = normalizeOrderId(query);
        const singleRes = await apiService.getOrderDetail(cleanId || query);
        if (singleRes && singleRes.order) {
          setSelectedOrder(singleRes.order);
          setOrders((prev) => [singleRes.order, ...prev.filter((x) => !matchesOrderId(x, singleRes.order))]);
          setError(null);
          setOtpSuccess(null);
          setOtpError(null);
          return;
        }
      } catch (searchErr) {
        // Fallback to searching order list endpoint
        try {
          const listRes = await apiService.getOrders();
          const list = Array.isArray(listRes) ? listRes : (listRes?.orders || listRes?.data || []);
          if (list.length > 0) {
            setOrders(list);
            const refound = list.find(
              (o) => matchesOrderId(o, query) || o.order_reference_number?.toLowerCase().includes(query.toLowerCase())
            );
            if (refound) {
              setSelectedOrder(refound);
              setError(null);
              setOtpSuccess(null);
              setOtpError(null);
              return;
            }
          }
        } catch (ignored) {}
      }
      setError(`No order found matching "${searchQuery}".`);
    }
  };

  // Cancellation Handler
  const handleCancelOrderSubmit = async () => {
    if (!selectedOrder) return;
    setCancelling(true);
    setError(null);
    try {
      const finalReason = cancelReason === 'Other' ? cancelCustomReason : cancelReason;
      await apiService.cancelOrder(selectedOrder.id, finalReason);
      setSuccess(`Order #${selectedOrder.order_reference_number || selectedOrder.id} cancelled successfully.`);
      setShowCancelModal(false);
      await loadOrders(selectedOrder.id);
    } catch (err) {
      setError(err.message || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  // Return Request Handler
  const handleReturnSubmit = async () => {
    if (!selectedOrder) return;
    if (!conditionCheck1 || !conditionCheck2 || !conditionCheck3) {
      setError('Please acknowledge all product condition requirements before submitting return.');
      return;
    }

    setSubmittingReturn(true);
    setError(null);
    try {
      const finalReason = returnReason === 'Other' ? returnCustomReason : returnReason;
      const conditionSummary = `Checklist confirmed: [Unused: yes, Tags: intact, Packaging: original]. Notes: ${conditionNote || 'Standard condition'}`;
      await apiService.requestOrderReturn(selectedOrder.id, {
        reason: finalReason,
        condition_note: conditionSummary
      });
      setSuccess('Return request submitted successfully. Reverse pickup label is being prepared.');
      setShowReturnModal(false);
      await loadOrders(selectedOrder.id);
    } catch (err) {
      setError(err.message || 'Failed to submit return request.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    const s = (status || '').toUpperCase();
    if (s.includes('DELIVERED')) return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', label: 'Delivered' };
    if (s.includes('RETURN_REQUESTED')) return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa', label: 'Return Requested' };
    if (s.includes('RETURN_APPROVED')) return { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', label: 'Return Approved' };
    if (s.includes('RETURN_IN_TRANSIT')) return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', label: 'Return In Transit' };
    if (s.includes('RETURN_RECEIVED')) return { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff', label: 'Return Received' };
    if (s.includes('RETURNED') || s.includes('REFUNDED')) return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', label: 'Refunded' };
    if (s.includes('RETURN_REJECTED')) return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', label: 'Return Rejected' };
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

  if (!isAuthenticated && !tokenStore.isAuthenticated()) {
    return (
      <div className="container tracking-page-container">
        <div className="tracking-header-section">
          <div>
            <h1 className="tracking-header-title">Order Tracking & History</h1>
            <p className="tracking-header-subtitle">Track your carbon-neutral deliveries in real-time</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
          <Lock size={52} style={{ color: 'var(--color-primary)', margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>Sign In Required</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
            Please sign in to your EcoNext account to view your past orders, delivery details, and live GPS tracking telemetry.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Button variant="primary" size="md" onClick={() => navigateTo('login')}>
              Sign In to View Orders
            </Button>
            <Button variant="ghost" size="md" onClick={() => navigateTo('products')}>
              Explore Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0 && !selectedOrder) {
    return (
      <div className="container tracking-page-container">
        <div className="tracking-header-section">
          <div>
            <h1 className="tracking-header-title">Order Tracking & History</h1>
            <p className="tracking-header-subtitle">Track your carbon-neutral deliveries in real-time</p>
          </div>
        </div>

        {error ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: 'var(--bg-surface)', border: '1px solid #fecaca', borderRadius: 'var(--radius-lg)' }}>
            <AlertCircle size={52} style={{ color: '#dc2626', margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.35rem', color: '#991b1b', marginBottom: '0.5rem' }}>
              {targetOrderId ? 'Order Not Found' : 'Unable to Load Orders'}
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
              {error}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="primary" size="md" onClick={() => loadOrders(targetOrderId)}>
                Try Again
              </Button>
              <Button variant="ghost" size="md" onClick={() => navigateTo('products')}>
                Explore Products
              </Button>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    );
  }

  const badge = getStatusBadgeStyle(selectedOrder?.status);
  const timeline = selectedOrder?.tracking_timeline || [];
  const statusUpper = (selectedOrder?.status || '').toUpperCase();
  const isOutForDelivery = statusUpper === 'OUT_FOR_DELIVERY';
  const isDelivered = statusUpper === 'DELIVERED';
  const isCancellable = ['ORDER_PLACED', 'ORDER_CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_SHIPMENT'].includes(statusUpper);
  const isReturnActive = ['RETURN_REQUESTED', 'INSPECTION_REQUIRED', 'RETURN_APPROVED', 'RETURN_IN_TRANSIT', 'RETURN_RECEIVED', 'INSPECTION_PASSED', 'REFUND_PENDING', 'REFUNDED', 'RETURNED', 'RETURN_REJECTED'].includes(statusUpper);

  // Return policy calculation
  const isReturnEligible = selectedOrder?.return_eligibility?.is_eligible !== false && (selectedOrder?.is_return_eligible !== false);
  const returnWindowDays = selectedOrder?.return_eligibility?.window_days || 7;

  // Compute active GPS coordinates and carrier data
  const currentLat = liveLocation?.latitude || selectedOrder?.current_latitude || selectedOrder?.shipments?.[0]?.current_latitude;
  const currentLon = liveLocation?.longitude || selectedOrder?.current_longitude || selectedOrder?.shipments?.[0]?.current_longitude;
  const currentVehicle = liveLocation?.vehicleNumber || selectedOrder?.vehicle_number || selectedOrder?.shipments?.[0]?.vehicle_number || 'EcoLogistics Electric Fleet';
  const currentCarrier = selectedOrder?.carrier_name || selectedOrder?.shipments?.[0]?.carrier_name || 'EcoExpress Carbon-Neutral';
  const currentTrackingNumber = selectedOrder?.tracking_number || selectedOrder?.shipments?.[0]?.tracking_number || (selectedOrder?.id ? `ECO-AWB-${selectedOrder.id + 100000}` : '');
  const currentRoute = selectedOrder?.route || selectedOrder?.shipments?.[0]?.route;
  const mapsUrl = (currentLat && currentLon) ? `https://www.google.com/maps?q=${currentLat},${currentLon}` : null;
  const isStaged = isCancellable && !currentLat;

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

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {isCancellable && (
            <button
              onClick={() => {
                setCancelReason('Ordered by mistake');
                setCancelCustomReason('');
                setShowCancelModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: '#dc2626',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <AlertCircle size={14} />
              Cancel Order
            </button>
          )}

          {isDelivered && !isReturnActive && (
            <button
              onClick={() => {
                setReturnReason('Damaged / Defective product received');
                setReturnCustomReason('');
                setConditionNote('');
                setShowReturnModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #059669',
                backgroundColor: 'rgba(5, 150, 105, 0.08)',
                color: '#059669',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} />
              Request Return
            </button>
          )}

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

      {success && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {success}
        </div>
      )}

      {/* Grid: Left Orders List, Right Detailed Tracking */}
      <div className="tracking-grid-layout">
        {/* Left Sidebar: My Orders */}
        <div className="orders-list-sidebar">
          <div className="orders-list-title">
            <span>Your Orders ({orders.length})</span>
          </div>

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
                    setSuccess(null);
                    setOtpSuccess(null);
                    setOtpError(null);
                    window.history.replaceState({ page: 'order-tracking', params: { orderId: ord.id, id: ord.id } }, '', `#/orders/${ord.id}/tracking`);
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

            {/* Return Policy Snapshot Banner (For Delivered Orders) */}
            {isDelivered && (
              <div style={{ padding: '1rem', backgroundColor: 'rgba(5, 150, 105, 0.06)', border: '1px solid #10b981', borderRadius: '8px', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={24} style={{ color: '#059669', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#065f46' }}>
                      {isReturnEligible ? `${returnWindowDays}-Day Return Policy Guaranteed` : 'Product Policy: Non-Returnable'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#047857' }}>
                      {isReturnEligible
                        ? 'Snapshotted policy at checkout: 7-day doorstep return window with original tags intact.'
                        : 'This product was purchased under non-returnable policy terms.'}
                    </div>
                  </div>
                </div>

                {!isReturnActive && isReturnEligible && (
                  <button
                    onClick={() => {
                      setReturnReason('Damaged / Defective product received');
                      setReturnCustomReason('');
                      setConditionNote('');
                      setShowReturnModal(true);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ backgroundColor: '#059669', borderColor: '#059669', fontSize: '0.8rem' }}
                  >
                    Initiate Return
                  </button>
                )}
              </div>
            )}

            {/* Reverse Logistics Stepper (When Return is in Progress) */}
            {isReturnActive && (
              <div style={{ padding: '1.25rem', backgroundColor: 'rgba(59, 130, 246, 0.06)', border: '1px solid #3b82f6', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <RotateCcw size={18} style={{ color: '#2563eb' }} />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e40af' }}>
                    Reverse Logistics & Refund Lifecycle
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', textAlign: 'center' }}>
                  <div style={{ padding: '8px', backgroundColor: '#dbeafe', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#1e40af' }}>
                    1. Return Requested
                  </div>
                  <div style={{ padding: '8px', backgroundColor: statusUpper.includes('APPROVED') || statusUpper.includes('IN_TRANSIT') || statusUpper.includes('RECEIVED') || statusUpper.includes('RETURNED') ? '#dbeafe' : '#f1f5f9', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#1e40af' }}>
                    2. Reverse Label Created
                  </div>
                  <div style={{ padding: '8px', backgroundColor: statusUpper.includes('RECEIVED') || statusUpper.includes('RETURNED') ? '#dbeafe' : '#f1f5f9', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#1e40af' }}>
                    3. Warehouse Inspection
                  </div>
                  <div style={{ padding: '8px', backgroundColor: statusUpper.includes('RETURNED') || statusUpper.includes('REFUNDED') ? '#dcfce7' : '#f1f5f9', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#15803d' }}>
                    4. Refund Credited (₹{Number(selectedOrder.total_price || 0).toFixed(2)})
                  </div>
                </div>
              </div>
            )}

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
                  <span className="carrier-item-val">{currentCarrier}</span>
                </div>
              </div>

              <div className="carrier-item">
                <div className="carrier-item-icon">
                  <Package size={18} />
                </div>
                <div className="carrier-item-text">
                  <span className="carrier-item-label">Tracking / AWB Number</span>
                  <span className="carrier-item-val" style={{ fontFamily: 'var(--font-mono)' }}>
                    {currentTrackingNumber}
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

            {/* Staging State Notice: When order is paid/confirmed but not yet dispatched */}
            {isStaged && (
              <div
                style={{
                  padding: '1.15rem 1.35rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-lg, 12px)',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#15803d',
                    flexShrink: 0
                  }}
                >
                  <Package size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#166534', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Check size={14} aria-hidden="true" />
                    <span>Warehouse Staging & Eco-Packaging Active</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#15803d' }}>
                    Your order is confirmed and payment verified. Items are being packed in 100% biodegradable materials at our fulfillment center. Real-time GPS telemetry will activate once the carrier vehicle is dispatched.
                  </div>
                </div>
              </div>
            )}

            {/* Secure Delivery PIN Informational Banner (Customer receives PIN, delivery partner verifies) */}
            {isOutForDelivery && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                  border: '2px solid #10b981',
                  borderRadius: 'var(--radius-lg, 12px)',
                  padding: '1.5rem',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.12)',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <KeyRound size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#064e3b' }}>
                      Secure Delivery PIN Dispatched
                    </h4>
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.86rem', color: '#047857', lineHeight: 1.5 }}>
                      Your order is <strong>Out for Delivery</strong>! Your confidential 6-digit delivery PIN has been dispatched to your registered email ({selectedOrder.email || selectedOrder.customer_email || 'address on file'}).
                    </p>
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(5, 150, 105, 0.08)', borderRadius: '8px', border: '1px solid rgba(5, 150, 105, 0.25)', fontSize: '0.82rem', color: '#065f46' }}>
                      <strong>Handover Instructions:</strong> Please tell this 6-digit PIN directly to the delivery partner when they arrive at your door. The delivery partner will enter the PIN into their verification terminal to confirm contactless handover.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GPS Telemetry Stream */}
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
                      backgroundColor: wsStatus === 'connected' ? '#10b981' : '#f59e0b'
                    }}
                  />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Radio size={16} color={wsStatus === 'connected' ? '#10b981' : 'var(--text-muted)'} />
                    Live Logistics Telemetry Stream
                  </h4>
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
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '0.9rem', color: currentLat ? '#059669' : 'var(--text-secondary)' }}>
                    {currentLat && currentLon
                      ? `${Number(currentLat).toFixed(4)}° N, ${Number(currentLon).toFixed(4)}° E`
                      : (isStaged ? 'Fulfillment Hub Staging' : 'Telemetry Ready')}
                  </span>
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: '#059669', marginTop: '4px' }}>
                      <ExternalLink size={12} /> Google Maps
                    </a>
                  )}
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Vehicle / Fleet
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Truck size={14} aria-hidden="true" />
                    <span>{currentVehicle}</span>
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    Destination
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={14} aria-hidden="true" />
                    <span>{selectedOrder.city}, {selectedOrder.state}</span>
                  </span>
                  {currentRoute && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                      Route: {currentRoute}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items with Snapshot Return Policy */}
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
                          <img src={imgUrl} alt={product.name || 'Product'} className="tracking-item-img" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <div className="tracking-item-img-placeholder">Product</div>
                        )}
                        <div className="tracking-item-details">
                          <span className="tracking-item-name">{product.name || 'Eco-Certified Product'}</span>
                          <span className="tracking-item-qty">
                            Quantity: <strong>{item.quantity}</strong> • Unit Price: ₹{Number(item.price_at_purchase || product.current_price || 0).toFixed(2)}
                          </span>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', padding: '2px 6px', backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#059669', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              {item.return_eligible !== false ? (
                                <>
                                  <Check size={11} aria-hidden="true" />
                                  <span>{item.return_window_days || 7}-Day Return Policy</span>
                                </>
                              ) : (
                                <>
                                  <X size={11} aria-hidden="true" />
                                  <span>Non-Returnable</span>
                                </>
                              )}
                            </span>
                            {item.condition_required && (
                              <span style={{ fontSize: '0.72rem', padding: '2px 6px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '4px' }}>
                                Condition: {item.condition_required}
                              </span>
                            )}
                          </div>
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
              <div className="tracking-info-block">
                <h4><MapPin size={16} /> Delivery Address</h4>
                <p><strong>{selectedOrder.recipient_name || selectedOrder.customer_name || 'Customer'}</strong></p>
                <p>{selectedOrder.shipping_address}</p>
                <p>{selectedOrder.city}, {selectedOrder.state} - {selectedOrder.zipcode}</p>
                <p>{selectedOrder.country || 'India'}</p>
              </div>

              <div className="tracking-info-block">
                <h4><CreditCard size={16} /> Payment Information</h4>
                <p><strong>Method: </strong>{selectedOrder.payment_method?.toUpperCase() || 'RAZORPAY / UPI'}</p>
                <p><strong>Status: </strong><span style={{ color: '#16a34a', fontWeight: 700 }}>{selectedOrder.payment_status || 'PAID'}</span></p>
                {selectedOrder.refund_status && selectedOrder.refund_status !== 'NONE' && (
                  <p><strong>Refund Status: </strong><span style={{ color: '#2563eb', fontWeight: 700 }}>{selectedOrder.refund_status}</span></p>
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

      {/* Modal: Cancel Order */}
      {showCancelModal && selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-surface, #fff)', padding: '24px', borderRadius: '12px', maxWidth: '480px', width: '90%' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.15rem' }}>Cancel Order #{selectedOrder.order_reference_number || selectedOrder.id}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Are you sure you want to cancel this order? An automatic refund will be triggered immediately.
            </p>

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Reason for cancellation:</label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default)', marginBottom: '12px' }}
            >
              {CANCELLATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            {cancelReason === 'Other' && (
              <textarea
                placeholder="Please describe why you are cancelling..."
                value={cancelCustomReason}
                onChange={(e) => setCancelCustomReason(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default)', marginBottom: '12px' }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button variant="ghost" size="sm" onClick={() => setShowCancelModal(false)}>Keep Order</Button>
              <Button variant="primary" size="sm" onClick={handleCancelOrderSubmit} disabled={cancelling} style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}>
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Request Return */}
      {showReturnModal && selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-surface, #fff)', padding: '24px', borderRadius: '12px', maxWidth: '520px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.15rem' }}>Request Return for Order #{selectedOrder.order_reference_number || selectedOrder.id}</h3>

            <div style={{ padding: '10px', backgroundColor: '#f0fdf4', border: '1px solid #10b981', borderRadius: '6px', fontSize: '0.8rem', color: '#065f46', marginBottom: '14px' }}>
              <strong>Return Policy:</strong> {returnWindowDays}-day return window. Full refund of ₹{Number(selectedOrder.total_price || 0).toFixed(2)} upon physical warehouse inspection.
            </div>

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Reason for Return:</label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default)', marginBottom: '12px' }}
            >
              {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            {returnReason === 'Other' && (
              <textarea
                placeholder="Specify reason..."
                value={returnCustomReason}
                onChange={(e) => setReturnCustomReason(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default)', marginBottom: '12px' }}
              />
            )}

            <div style={{ marginTop: '10px', marginBottom: '14px', borderTop: '1px solid var(--border-default)', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px' }}>Product Condition Confirmation:</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', marginBottom: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={conditionCheck1} onChange={(e) => setConditionCheck1(e.target.checked)} />
                Product is in unused and unwashed condition
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', marginBottom: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={conditionCheck2} onChange={(e) => setConditionCheck2(e.target.checked)} />
                Original brand tags and barcodes are intact
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', marginBottom: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={conditionCheck3} onChange={(e) => setConditionCheck3(e.target.checked)} />
                Original product packaging and box are undamaged
              </label>
            </div>

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Additional Comments (Optional):</label>
            <input
              type="text"
              placeholder="e.g. Size was slightly tight on waist..."
              value={conditionNote}
              onChange={(e) => setConditionNote(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default)', marginBottom: '16px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="ghost" size="sm" onClick={() => setShowReturnModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleReturnSubmit} disabled={submittingReturn} style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                {submittingReturn ? 'Submitting...' : 'Submit Return Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
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
