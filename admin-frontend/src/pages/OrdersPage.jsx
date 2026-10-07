import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Truck,
  Navigation,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Eye,
  ArrowRight,
  MapPin,
  User,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  ShieldCheck,
  FileText,
  RefreshCw,
  IndianRupee,
  X,
  Check,
  ChevronRight,
  ExternalLink,
  Ban,
  Activity,
  Layers,
  Compass
} from 'lucide-react';
import { orderOpsApi, fulfillmentApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';

const ORDER_LIFECYCLE_STEPS = [
  { key: 'ORDER_PLACED', label: 'Order Placed', icon: Clock },
  { key: 'ORDER_CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'PACKED', label: 'Packed', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: Truck },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 }
];

/**
 * Normalizes raw order objects coming from Django REST API or Java Spring Boot microservices
 */
const normalizeOrder = (o) => {
  if (!o) return null;
  const rawStatus = (o.canonical_status || o.currentStatus || o.status || 'ORDER_PLACED').toUpperCase().replace(/ /g, '_');
  let currentStatus = rawStatus;
  if (rawStatus === 'CONFIRMED' || rawStatus === 'PAYMENT_CONFIRMED' || rawStatus === 'ORDER_ACCEPTED') currentStatus = 'ORDER_CONFIRMED';
  else if (rawStatus === 'PENDING') currentStatus = 'ORDER_PLACED';

  const refNumber = o.order_reference_number || o.orderReferenceNumber || `ORD-${String(o.id).padStart(5, '0')}`;
  const custName = o.customer_name || o.customerName || o.recipient_name || o.recipientName || (o.user ? `${o.user.first_name || ''} ${o.user.last_name || ''}`.trim() : '') || 'Valued Customer';
  const custEmail = o.customer_email || o.customerEmail || o.email || (o.user?.email || '');
  const custPhone = o.customer_phone || o.customerPhone || o.phone || '';
  const totalAmt = Number(o.total_price ?? o.totalAmount ?? o.total ?? 0);

  const rawItems = o.items || [];
  const normalizedItems = rawItems.map((it, idx) => ({
    id: it.id || idx,
    productName: it.product?.name || it.productName || 'Sustainable Item',
    sku: it.product?.sku || it.sku || `SKU-${it.product?.id || it.id || idx}`,
    quantity: it.quantity || 1,
    priceAtPurchase: Number(it.price_at_purchase ?? it.priceAtPurchase ?? it.product?.current_price ?? 0),
    subtotal: Number(it.subtotal ?? (Number(it.price_at_purchase ?? it.product?.current_price ?? 0) * (it.quantity || 1)))
  }));

  const rawHistory = o.status_history || o.statusHistory || o.timeline || [];
  const normalizedTimeline = rawHistory.map(h => ({
    fromStatus: (h.from_status || h.fromStatus || '').toUpperCase(),
    toStatus: (h.to_status || h.toStatus || '').toUpperCase(),
    changedByUsername: h.changed_by_name || h.changedByUsername || (h.changed_by?.username || 'Staff Operator'),
    reasonNote: h.note || h.reasonNote || '',
    carrierName: h.carrier_name || h.carrierName || '',
    trackingNumber: h.tracking_number || h.trackingNumber || '',
    timestamp: h.timestamp || h.created_at
  }));

  // Linked shipment detection
  const firstShp = (o.shipments && o.shipments.length > 0) ? o.shipments[0] : null;
  const shipmentId = o.shipment_id || o.shipmentId || (firstShp ? firstShp.id : null);
  let shipmentNumber = o.shipment_number || o.shipmentNumber || (firstShp ? (firstShp.shipmentNumber || firstShp.shipment_number) : null);
  let shipmentStatus = o.shipment_status || o.shipmentStatus || (firstShp ? (firstShp.status || 'CREATED') : (o.shipments?.length ? 'PROVISIONED' : null));

  if (currentStatus === 'DELIVERED') {
    if (!shipmentStatus || shipmentStatus === 'NOT_PROVISIONED') shipmentStatus = 'DELIVERED';
    if (!shipmentNumber) shipmentNumber = `SHP-${String(o.id).padStart(5, '0')}`;
  }

  return {
    ...o,
    id: o.id,
    orderReferenceNumber: refNumber,
    customerName: custName,
    customerEmail: custEmail,
    customerPhone: custPhone,
    totalAmount: totalAmt,
    paymentMethod: o.payment_method || o.paymentMethod || 'Razorpay / Online',
    paymentStatus: (o.payment_status || o.paymentStatus || 'PAID').toUpperCase(),
    currentStatus,
    status: o.status,
    shippingAddress: o.shipping_address || o.shippingAddress || '',
    city: o.city || '',
    state: o.state || '',
    zipcode: o.zipcode || '',
    country: o.country || 'India',
    carrierName: o.carrier_name || o.carrierName || 'EcoExpress Carbon-Neutral',
    trackingNumber: o.tracking_number || o.trackingNumber || `ECO-AWB-${o.id + 100000}`,
    shipmentId,
    shipmentNumber,
    shipmentStatus,
    createdAt: o.created_at || o.createdAt,
    updatedAt: o.updated_at || o.updatedAt,
    items: normalizedItems,
    timeline: normalizedTimeline
  };
};

export const OrdersPage = () => {
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = useAuth();
  const canCancel = isAdmin() || hasPermission('ORDER_STATUS_UPDATE');

  const [orders, setOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Tracking Modal
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingShipment, setTrackingShipment] = useState(null);
  const [trackingEvents, setTrackingEvents] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Cancellation Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('Customer requested order cancellation');
  const [cancelling, setCancelling] = useState(false);

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalOrders: 0,
    confirmedOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0
  });

  const loadOrders = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const data = await orderOpsApi.getOrders({
        page: 0,
        size: 100,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: searchQuery || undefined
      });
      const rawList = data.content || (Array.isArray(data) ? data : (data.orders || data.data || []));
      const normalizedList = rawList.map(normalizeOrder).filter(Boolean);
      setOrders(normalizedList);

      // Compute client-side aggregations
      const total = normalizedList.length;
      let confirmed = 0;
      let processing = 0;
      let shipped = 0;
      let delivered = 0;
      let cancelled = 0;
      let rev = 0;

      normalizedList.forEach(o => {
        rev += Number(o.totalAmount || 0);
        const st = o.currentStatus;
        if (st === 'ORDER_CONFIRMED' || st === 'ORDER_PLACED') confirmed++;
        else if (st === 'PROCESSING' || st === 'PACKED') processing++;
        else if (st === 'SHIPPED' || st === 'IN_TRANSIT' || st === 'OUT_FOR_DELIVERY') shipped++;
        else if (st === 'DELIVERED') delivered++;
        else if (st === 'CANCELLED') cancelled++;
      });

      setSummary({
        totalOrders: total,
        confirmedOrders: confirmed,
        processingOrders: processing,
        shippedOrders: shipped,
        deliveredOrders: delivered,
        cancelledOrders: cancelled,
        totalRevenue: rev
      });
    } catch (err) {
      if (showSpinner) {
        setError(err.message || 'Failed to load orders from backend');
      }
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [selectedStatus, searchQuery]);

  // Initial load and auto-polling every 8 seconds for real-time storefront sync
  useEffect(() => {
    loadOrders(true);

    const interval = setInterval(() => {
      loadOrders(false);
    }, 8000);

    const onFocus = () => loadOrders(false);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadOrders]);

  // Handle View Order Details
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  // Handle Open Fulfillment
  const handleOpenFulfillment = (order) => {
    navigate(`/fulfillment?orderId=${order.id}`);
  };

  // Handle Track Shipment
  const handleTrackShipment = async (order) => {
    setTrackingShipment(null);
    setTrackingEvents([]);
    setTrackingLoading(true);
    setShowTrackingModal(true);
    try {
      let shpData = null;
      if (order.shipmentId) {
        shpData = await fulfillmentApi.getShipmentById(order.shipmentId);
      } else {
        const list = await fulfillmentApi.getShipmentsByOrderId(order.id);
        if (list && list.length > 0) {
          shpData = list[0];
        }
      }

      if (shpData) {
        setTrackingShipment(shpData);
        // Load shipment events
        try {
          const events = await fulfillmentApi.getShipmentEvents(shpData.id);
          setTrackingEvents(events || []);
        } catch {
          setTrackingEvents([]);
        }
      } else {
        setTrackingShipment({
          orderId: order.id,
          shipmentNumber: order.shipmentNumber || 'Pending Provisioning',
          status: 'NOT_PROVISIONED',
          carrierName: order.carrierName,
          trackingNumber: order.trackingNumber,
          destination: `${order.shippingAddress}, ${order.city}, ${order.state}`
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch shipment tracking details');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Handle Request Cancellation
  const handleOpenCancelModal = (order) => {
    setOrderToCancel(order);
    setCancelReason('Customer requested cancellation');
    setShowCancelModal(true);
  };

  const handleConfirmCancellation = async () => {
    if (!orderToCancel) return;
    setCancelling(true);
    setError('');
    try {
      await orderOpsApi.updateOrderStatus(orderToCancel.id, {
        status: 'CANCELLED',
        reasonNote: cancelReason || 'Order cancelled by staff request'
      });
      setSuccess(`Order #${orderToCancel.orderReferenceNumber} was cancelled successfully.`);
      setShowCancelModal(false);
      setOrderToCancel(null);
      loadOrders(false);
    } catch (err) {
      setError(err.message || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  // Status Filter Counts
  const filterTabs = [
    { key: 'ALL', label: 'All Orders', count: summary.totalOrders },
    { key: 'ORDER_PLACED', label: 'Placed', count: orders.filter(o => o.currentStatus === 'ORDER_PLACED').length },
    { key: 'ORDER_CONFIRMED', label: 'Confirmed', count: summary.confirmedOrders },
    { key: 'PROCESSING', label: 'Processing', count: orders.filter(o => o.currentStatus === 'PROCESSING').length },
    { key: 'PACKED', label: 'Packed', count: orders.filter(o => o.currentStatus === 'PACKED').length },
    { key: 'SHIPPED', label: 'Shipped', count: orders.filter(o => o.currentStatus === 'SHIPPED').length },
    { key: 'IN_TRANSIT', label: 'In Transit', count: orders.filter(o => o.currentStatus === 'IN_TRANSIT').length },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', count: orders.filter(o => o.currentStatus === 'OUT_FOR_DELIVERY').length },
    { key: 'DELIVERED', label: 'Delivered', count: summary.deliveredOrders },
    { key: 'CANCELLED', label: 'Cancelled', count: summary.cancelledOrders }
  ];

  // Table Columns Definition
  const columns = [
    {
      key: 'orderId',
      title: 'Order ID',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            #{row.orderReferenceNumber}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <Calendar size={12} />
            {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
          </div>
        </div>
      )
    },
    {
      key: 'customer',
      title: 'Customer Details',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
            {row.customerName}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <Mail size={12} />
            {row.customerEmail || 'No email provided'}
          </div>
          {row.city && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <MapPin size={11} />
              {row.city}, {row.state}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'payment',
      title: 'Payment',
      render: (row) => {
        const isPaid = row.paymentStatus === 'PAID' || row.paymentStatus === 'VERIFIED';
        return (
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
              ₹{Number(row.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: isPaid ? '#059669' : '#d97706',
                  textTransform: 'uppercase'
                }}
              >
                {row.paymentStatus}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {row.paymentMethod?.toUpperCase().includes('COD') ? 'COD' : 'Online / UPI'}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'orderStatus',
      title: 'Order Status',
      render: (row) => (
        <StatusBadge status={row.currentStatus} />
      )
    },
    {
      key: 'shipment',
      title: 'Shipment',
      render: (row) => {
        const hasShp = Boolean(row.shipmentNumber || row.shipmentId);
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Truck size={13} style={{ color: hasShp ? '#0284c7' : '#94a3b8' }} />
              <span style={{ fontWeight: 600, fontSize: '0.82rem', color: hasShp ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {row.shipmentNumber || (hasShp ? `SHP-${row.id}-01` : 'Awaiting Fulfillment')}
              </span>
            </div>
            {row.shipmentStatus && row.shipmentStatus !== 'NOT_PROVISIONED' ? (
              <div style={{ marginTop: '4px' }}>
                <StatusBadge status={row.shipmentStatus} />
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Not dispatched yet
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      title: 'Allowed Actions',
      render: (row) => {
        const isCancellable = ['ORDER_PLACED', 'ORDER_CONFIRMED', 'PROCESSING'].includes(row.currentStatus);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {/* 1. View Order Details */}
            <button
              onClick={() => handleViewOrder(row)}
              className="btn btn-outline btn-sm"
              title="View complete order details, item breakdown & payment metadata"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.78rem',
                padding: '4px 8px'
              }}
            >
              <Eye size={13} />
              Details
            </button>

            {/* 2. Open Fulfillment */}
            <button
              onClick={() => handleOpenFulfillment(row)}
              className="btn btn-primary btn-sm"
              title="Open physical movement & fulfillment operations in Fulfillment Hub"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.78rem',
                padding: '4px 8px',
                backgroundColor: '#059669',
                borderColor: '#059669'
              }}
            >
              <Truck size={13} />
              Fulfillment
            </button>

            {/* 3. Track Shipment */}
            <button
              onClick={() => handleTrackShipment(row)}
              className="btn btn-outline btn-sm"
              title="Track physical vehicle, GPS telemetry and shipment audit trail"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.78rem',
                padding: '4px 8px'
              }}
            >
              <Navigation size={13} />
              Track
            </button>

            {/* 4. Request Cancellation */}
            {canCancel && isCancellable && (
              <button
                onClick={() => handleOpenCancelModal(row)}
                className="btn btn-ghost btn-sm"
                title="Request cancellation for this order"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.78rem',
                  padding: '4px 8px',
                  color: '#dc2626'
                }}
              >
                <Ban size={13} />
                Cancel
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="orders-page" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Order Lifecycle Monitor
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            Production read-oriented monitoring view. Physical dispatch, packaging & GPS transitions are managed strictly in the Fulfillment module.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => loadOrders(true)}
            className="btn btn-outline"
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => navigate('/fulfillment')}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', backgroundColor: '#059669', borderColor: '#059669' }}
          >
            <Truck size={15} />
            Open Fulfillment Hub
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Orders</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{summary.totalOrders}</div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0284c7', textTransform: 'uppercase' }}>Confirmed</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>{summary.confirmedOrders}</div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>In Fulfillment</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>{summary.processingOrders}</div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' }}>Shipped / Transit</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>{summary.shippedOrders}</div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase' }}>Delivered</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{summary.deliveredOrders}</div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Revenue</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>
            ₹{Number(summary.totalRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#b91c1c', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}><X size={16} /></button>
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', color: '#047857', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#047857' }}><X size={16} /></button>
        </div>
      )}

      {/* Filter Bar & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatus(tab.key)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: selectedStatus === tab.key ? '1px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: selectedStatus === tab.key ? 'var(--primary)' : 'var(--surface)',
                color: selectedStatus === tab.key ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
              <span style={{
                fontSize: '0.72rem',
                padding: '1px 5px',
                borderRadius: '10px',
                backgroundColor: selectedStatus === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--border)',
                color: selectedStatus === tab.key ? '#ffffff' : 'var(--text-muted)'
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search Order ID, Customer, Tracking..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                fontSize: '0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Order Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          emptyMessage={
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <Package size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>No orders found</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                {searchQuery ? `No orders matched search query "${searchQuery}"` : 'No orders in this status category.'}
              </div>
            </div>
          }
        />
      </div>

      {/* ========================================== */}
      {/* 1. VIEW ORDER DETAILS MODAL                */}
      {/* ========================================== */}
      <Modal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title={selectedOrder ? `Order #${selectedOrder.orderReferenceNumber}` : 'Order Details'}
        maxWidth="850px"
      >
        {selectedOrder && (
          <div>
            {/* Header badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status: </span>
                <StatusBadge status={selectedOrder.currentStatus} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Payment: </span>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: selectedOrder.paymentStatus === 'PAID' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: selectedOrder.paymentStatus === 'PAID' ? '#059669' : '#d97706'
                }}>
                  {selectedOrder.paymentStatus} ({selectedOrder.paymentMethod})
                </span>
              </div>
            </div>

            {/* Customer & Shipping Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ padding: '14px', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} />
                  Customer Information
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{selectedOrder.customerName}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Email: {selectedOrder.customerEmail || 'N/A'}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Phone: {selectedOrder.customerPhone || 'N/A'}</div>
              </div>

              <div style={{ padding: '14px', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} />
                  Delivery Address
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {selectedOrder.shippingAddress || 'No street address provided'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {[selectedOrder.city, selectedOrder.state, selectedOrder.zipcode, selectedOrder.country].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>

            {/* Linked Shipment Details Box */}
            <div style={{ padding: '14px', background: 'rgba(2, 132, 199, 0.05)', border: '1px solid rgba(2, 132, 199, 0.2)', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={16} />
                  Linked Physical Shipment
                </div>
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    handleOpenFulfillment(selectedOrder);
                  }}
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Manage in Fulfillment
                  <ExternalLink size={12} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Shipment #: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedOrder.shipmentNumber || 'Pending Provisioning'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Carrier: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedOrder.carrierName}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Tracking / AWB: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedOrder.trackingNumber}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Shipment Status: </span>
                  <span style={{ fontWeight: 700, color: '#0284c7' }}>{selectedOrder.shipmentStatus || 'CREATED'}</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                Ordered Products ({selectedOrder.items?.length || 0})
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)' }}>Product</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>Price</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {it.productName}
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SKU: {it.sku}</div>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{it.quantity}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{it.priceAtPurchase.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>₹{it.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--background)' }}>
                      <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Total:</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#047857', fontSize: '0.95rem' }}>
                        ₹{Number(selectedOrder.totalAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Progression Bar */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                Order Lifecycle Progression
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                {ORDER_LIFECYCLE_STEPS.map((st, i) => {
                  const currIdx = ORDER_LIFECYCLE_STEPS.findIndex(s => s.key === selectedOrder.currentStatus);
                  const isCompleted = currIdx >= i && selectedOrder.currentStatus !== 'CANCELLED';
                  const isCurrent = currIdx === i && selectedOrder.currentStatus !== 'CANCELLED';
                  const StepIcon = st.icon;

                  return (
                    <div key={st.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isCurrent ? '#059669' : (isCompleted ? '#10b981' : 'var(--border)'),
                        color: isCompleted || isCurrent ? '#ffffff' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '6px',
                        boxShadow: isCurrent ? '0 0 0 4px rgba(16, 185, 129, 0.2)' : 'none'
                      }}>
                        <StepIcon size={16} />
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--primary)' : 'var(--text-secondary)', textAlign: 'center' }}>
                        {st.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status History Timeline */}
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Complete Audit Timeline History
              </div>
              {selectedOrder.timeline && selectedOrder.timeline.length > 0 ? (
                <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: '16px', marginLeft: '8px' }}>
                  {selectedOrder.timeline.map((h, idx) => (
                    <div key={idx} style={{ position: 'relative', marginBottom: '14px' }}>
                      <div style={{ position: 'absolute', left: '-22px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        By: {h.changedByUsername} • {h.timestamp ? new Date(h.timestamp).toLocaleString('en-IN') : 'Recent'}
                      </div>
                      {h.reasonNote && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>
                          Note: "{h.reasonNote}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Order created at {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('en-IN') : 'Recent'}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================== */}
      {/* 2. SHIPMENT TRACKING MODAL                 */}
      {/* ========================================== */}
      <Modal
        isOpen={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
        title={trackingShipment ? `Shipment Tracking #${trackingShipment.shipmentNumber}` : 'Shipment Tracking'}
        maxWidth="750px"
      >
        {trackingLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <RefreshCw size={30} className="spin" style={{ color: 'var(--primary)', margin: '0 auto 10px auto' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Loading live tracking metadata...</div>
          </div>
        ) : trackingShipment ? (
          <div>
            {/* Live GPS Telemetry card (Active only for DISPATCHED, IN_TRANSIT, OUT_FOR_DELIVERY) */}
            {['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(trackingShipment.status) ? (
              <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>
                  <Compass size={18} className="spin" />
                  Live GPS Radar Active
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Vehicle Number: </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{trackingShipment.vehicleNumber || 'KA-01-EQ-9124'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Carrier: </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{trackingShipment.carrierName || 'EcoExpress'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Current Coordinates: </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {trackingShipment.currentLatitude ? `${trackingShipment.currentLatitude}, ${trackingShipment.currentLongitude}` : '12.9716° N, 77.5946° E'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Route Corridor: </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{trackingShipment.route || 'Green Corridor'}</span>
                  </div>
                </div>
              </div>
            ) : trackingShipment.status === 'DELIVERED' ? (
              <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', borderRadius: '8px', color: '#047857', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <CheckCircle2 size={18} />
                Shipment has been safely delivered to customer. Physical telemetry session closed.
              </div>
            ) : (
              <div style={{ padding: '14px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid #f59e0b', borderRadius: '8px', color: '#b45309', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <Clock size={18} />
                Shipment is currently in warehouse packaging state. Live GPS telemetry will activate once dispatched for transit.
              </div>
            )}

            {/* Shipment Milestones Timeline */}
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                Shipment Audit Milestones
              </div>
              {trackingEvents && trackingEvents.length > 0 ? (
                <div style={{ borderLeft: '2px solid #0284c7', paddingLeft: '16px', marginLeft: '8px' }}>
                  {trackingEvents.map((evt, idx) => (
                    <div key={idx} style={{ position: 'relative', marginBottom: '14px' }}>
                      <div style={{ position: 'absolute', left: '-22px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {evt.oldStatus ? `${evt.oldStatus} → ${evt.newStatus}` : evt.newStatus}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Changed By: {evt.changedBy || 'Staff'} ({evt.changedRole || 'Warehouse Staff'}) • {evt.createdAt ? new Date(evt.createdAt).toLocaleString('en-IN') : 'Recent'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Shipment registered for Order #{trackingShipment.orderId}. Handover to carrier pending.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ========================================== */}
      {/* 3. REQUEST CANCELLATION MODAL             */}
      {/* ========================================== */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title={orderToCancel ? `Request Cancellation for #${orderToCancel.orderReferenceNumber}` : 'Cancel Order'}
        maxWidth="500px"
      >
        {orderToCancel && (
          <div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to cancel order <strong>#{orderToCancel.orderReferenceNumber}</strong>?
              If already paid, an automated refund request will be initialized.
            </p>

            <div style={{ margin: '16px 0' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Cancellation Reason Note:
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowCancelModal(false)} className="btn btn-outline" disabled={cancelling}>
                Close
              </button>
              <button onClick={handleConfirmCancellation} className="btn btn-danger" disabled={cancelling}>
                {cancelling ? 'Cancelling...' : 'Confirm Order Cancellation'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrdersPage;
