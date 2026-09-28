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
  RotateCcw,
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
  Send,
  RefreshCw,
  IndianRupee,
  X,
  Check,
  ChevronRight,
  Sparkles,
  Ban
} from 'lucide-react';
import { orderOpsApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';

// Sequential forward-only state machine transition map
const ALLOWED_NEXT_STATUSES = {
  ORDER_PLACED: ['ORDER_CONFIRMED', 'CANCELLED'],
  ORDER_CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: []
};

// Distinct semantic action button configurations
const ACTION_BUTTON_CONFIG = {
  ORDER_PLACED: {
    nextStatus: 'ORDER_CONFIRMED',
    label: 'Confirm Order',
    bgColor: '#2563eb', // blue
    hoverColor: '#1d4ed8',
    icon: CheckCircle2
  },
  ORDER_CONFIRMED: {
    nextStatus: 'PROCESSING',
    label: 'Start Processing',
    bgColor: '#7c3aed', // purple
    hoverColor: '#6d28d9',
    icon: Package
  },
  PROCESSING: {
    nextStatus: 'PACKED',
    label: 'Pack Order',
    bgColor: '#d97706', // orange
    hoverColor: '#b45309',
    icon: Package
  },
  PACKED: {
    nextStatus: 'SHIPPED',
    label: 'Ship Order',
    bgColor: '#0891b2', // cyan
    hoverColor: '#0e7490',
    icon: Truck
  },
  SHIPPED: {
    nextStatus: 'IN_TRANSIT',
    label: 'Mark In Transit',
    bgColor: '#2563eb', // blue
    hoverColor: '#1d4ed8',
    icon: Truck
  },
  IN_TRANSIT: {
    nextStatus: 'OUT_FOR_DELIVERY',
    label: 'Out for Delivery',
    bgColor: '#ea580c', // orange
    hoverColor: '#c2410c',
    icon: Truck
  },
  OUT_FOR_DELIVERY: {
    nextStatus: 'DELIVERED',
    label: 'Mark Delivered',
    bgColor: '#16a34a', // green
    hoverColor: '#15803d',
    icon: CheckCircle2
  }
};

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

const CARRIER_OPTIONS = [
  'EcoExpress Carbon-Neutral (Default)',
  'BlueDart Express Direct',
  'Delhivery Surface Logistics',
  'DTDC Air Courier',
  'Shadowfax Hyperlocal',
  'FedEx India Priority'
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
    createdAt: o.created_at || o.createdAt,
    updatedAt: o.updated_at || o.updatedAt,
    items: normalizedItems,
    timeline: normalizedTimeline
  };
};

export const OrdersPage = () => {
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = useAuth();
  const canUpdate = isAdmin() || hasPermission('ORDER_STATUS_UPDATE');

  const [orders, setOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);
  const [quickUpdatingId, setQuickUpdatingId] = useState(null);

  // Transition / Details Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [transitionForm, setTransitionForm] = useState({
    newStatus: '',
    reasonNote: '',
    trackingNumber: '',
    carrierName: 'EcoExpress Carbon-Neutral (Default)'
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadOrders(true);
  };

  const openOrderDetails = async (order) => {
    setError('');
    setConfirmStep(false);
    try {
      const raw = await orderOpsApi.getOrderById(order.id);
      const fullOrder = normalizeOrder(raw?.order || raw?.data || raw || order);
      setSelectedOrder(fullOrder);
      const allowed = ALLOWED_NEXT_STATUSES[fullOrder.currentStatus] || [];
      setTransitionForm({
        newStatus: allowed.length > 0 ? allowed[0] : '',
        reasonNote: '',
        trackingNumber: fullOrder.trackingNumber || `ECO-AWB-${fullOrder.id + 100000}`,
        carrierName: fullOrder.carrierName || 'EcoExpress Carbon-Neutral (Default)'
      });
      setShowOrderModal(true);
    } catch (err) {
      setError(err.message || 'Failed to load order details');
    }
  };

  const handleStatusTransition = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !transitionForm.newStatus) return;
    
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setUpdating(true);
    setError('');
    setSuccess('');
    try {
      const updatedRaw = await orderOpsApi.updateOrderStatus(selectedOrder.id, transitionForm);
      const updated = normalizeOrder(updatedRaw?.order || updatedRaw?.data || updatedRaw || selectedOrder);
      const refNum = selectedOrder.orderReferenceNumber || selectedOrder.id;
      setSuccess(`Order #${refNum} transitioned to ${transitionForm.newStatus.replace(/_/g, ' ')}. Notification dispatched.`);
      setSelectedOrder(updated);
      setConfirmStep(false);
      loadOrders(false);
    } catch (err) {
      setError(err.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  // Quick direct inline advance to next lifecycle stage
  const handleQuickAdvance = async (order, targetStatus = null) => {
    const allowed = ALLOWED_NEXT_STATUSES[order.currentStatus] || [];
    if (allowed.length === 0) return;
    const nextStatus = targetStatus || allowed[0];

    setQuickUpdatingId(order.id);
    setError('');
    setSuccess('');
    try {
      await orderOpsApi.updateOrderStatus(order.id, {
        status: nextStatus,
        newStatus: nextStatus,
        carrierName: order.carrierName || 'EcoExpress Carbon-Neutral',
        trackingNumber: order.trackingNumber || `ECO-AWB-${order.id + 100000}`,
        reasonNote: `Stage advanced to ${nextStatus.replace(/_/g, ' ')}`
      });
      setSuccess(`Order #${order.orderReferenceNumber} advanced to ${nextStatus.replace(/_/g, ' ')}.`);
      loadOrders(false);
    } catch (err) {
      setError(err.message || `Failed to advance order #${order.orderReferenceNumber}`);
    } finally {
      setQuickUpdatingId(null);
    }
  };

  const statusFilters = [
    { key: 'ALL', label: 'All Orders', icon: Package },
    { key: 'ORDER_PLACED', label: 'Placed', icon: Clock },
    { key: 'ORDER_CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
    { key: 'PROCESSING', label: 'Processing', icon: Package },
    { key: 'PACKED', label: 'Packed', icon: Package },
    { key: 'SHIPPED', label: 'Shipped', icon: Truck },
    { key: 'IN_TRANSIT', label: 'In Transit', icon: Truck },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
    { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
    { key: 'CANCELLED', label: 'Cancelled', icon: XCircle }
  ];

  const columns = [
    {
      header: 'Order Reference',
      key: 'orderReferenceNumber',
      render: (row) => {
        const ref = row.orderReferenceNumber || `ORD-${String(row.id).padStart(5, '0')}`;
        return (
          <div>
            <div className="font-bold mono-text text-primary flex items-center gap-1">
              <Package size={14} className="text-muted" />
              <span>#{ref}</span>
            </div>
            <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
              <Calendar size={12} />
              <span>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'Recent'}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Customer',
      key: 'customerName',
      render: (row) => (
        <div>
          <div className="font-medium flex items-center gap-1">
            <User size={13} className="text-muted" />
            <span>{row.customerName || 'Valued Customer'}</span>
          </div>
          <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
            <Mail size={12} />
            <span>{row.customerEmail || 'N/A'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Items',
      key: 'items',
      render: (row) => (
        <span className="badge badge-neutral badge-sm font-mono">
          {row.items?.length || 1} item{row.items?.length === 1 ? '' : 's'}
        </span>
      )
    },
    {
      header: 'Total Amount',
      key: 'totalAmount',
      render: (row) => (
        <div>
          <div className="font-semibold text-success flex items-center">
            <span>₹{Number(row.totalAmount || 0).toFixed(2)}</span>
          </div>
          <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
            <CreditCard size={11} />
            <span>{row.paymentMethod || 'Razorpay / Online'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Destination',
      key: 'city',
      render: (row) => (
        <div className="flex items-center gap-1 text-sm">
          <MapPin size={13} className="text-muted flex-shrink-0" />
          <span>{row.city || 'Standard'}, {row.state || 'IN'}</span>
        </div>
      )
    },
    {
      header: 'Payment Status',
      key: 'paymentStatus',
      render: (row) => {
        const ps = (row.paymentStatus || 'PAID').toUpperCase();
        const isPaid = ps === 'PAID' || ps === 'VERIFIED' || ps === 'COMPLETED';
        return (
          <span className={`badge ${isPaid ? 'badge-success' : 'badge-warning'} badge-xs`}>
            {isPaid ? <Check size={11} className="inline mr-1" /> : <Clock size={11} className="inline mr-1" />}
            {ps}
          </span>
        );
      }
    },
    {
      header: 'Fulfillment Status',
      key: 'currentStatus',
      render: (row) => <StatusBadge status={row.currentStatus || row.status} />
    },
    {
      header: 'Actions & Lifecycle Controls',
      key: 'actions',
      sortable: false,
      render: (row) => {
        const actionCfg = ACTION_BUTTON_CONFIG[row.currentStatus];
        const isUpdatingThis = quickUpdatingId === row.id;
        const ActionIcon = actionCfg?.icon || ChevronRight;
        const canCancel = canUpdate && !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(row.currentStatus);

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* View / Inspect (Neutral / Blue) */}
            <button
              className="btn btn-secondary btn-xs flex items-center gap-1"
              onClick={() => openOrderDetails(row)}
              title="Inspect order details and audit logs"
            >
              <Eye size={12} />
              <span>View</span>
            </button>

            {/* View Fulfillment / Telemetry */}
            <button
              className="btn btn-secondary btn-xs flex items-center gap-1"
              onClick={() => navigate(`/fulfillment?orderId=${row.id}`)}
              title="View GPS telemetry & fulfillment loads"
            >
              <Navigation size={11} className="text-emerald-500" />
              <span>Fulfillment</span>
            </button>

            {/* Semantic Forward Action Button */}
            {canUpdate && actionCfg && (
              <button
                type="button"
                className="btn btn-xs flex items-center gap-1 text-white font-medium shadow-sm transition-all"
                style={{
                  backgroundColor: actionCfg.bgColor,
                  borderColor: actionCfg.bgColor,
                  color: '#ffffff'
                }}
                onClick={() => handleQuickAdvance(row, actionCfg.nextStatus)}
                disabled={isUpdatingThis}
                title={`Advance to ${actionCfg.nextStatus.replace(/_/g, ' ')}`}
              >
                {isUpdatingThis ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <>
                    <ActionIcon size={12} />
                    <span>{actionCfg.label}</span>
                  </>
                )}
              </button>
            )}

            {/* Cancel Button (Red - only on valid non-terminal states) */}
            {canCancel && (
              <button
                type="button"
                className="btn btn-xs flex items-center gap-1 text-white shadow-sm"
                style={{
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  color: '#ffffff'
                }}
                onClick={() => {
                  if (window.confirm(`Are you sure you want to cancel Order #${row.orderReferenceNumber}?`)) {
                    handleQuickAdvance(row, 'CANCELLED');
                  }
                }}
                disabled={isUpdatingThis}
                title="Cancel Order"
              >
                <Ban size={11} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        );
      }
    }
  ];

  const allowedNext = selectedOrder ? (ALLOWED_NEXT_STATUSES[selectedOrder.currentStatus] || []) : [];

  return (
    <div className="orders-page">
      {/* Alert Banners */}
      {error && (
        <div className="alert alert-danger mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-danger flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button className="btn-close" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-success flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button className="btn-close" onClick={() => setSuccess('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header & Live Polling Status */}
      <div className="page-header-flex mb-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <Truck size={24} className="text-primary" />
            <span>Order Fulfillment & Lifecycle Operations</span>
          </h2>
          <p className="page-subtitle">
            Manage end-to-end customer order fulfillment, AWB logistics tracking, and automated lifecycle transitions.
          </p>
        </div>
        <div className="header-actions flex items-center gap-2">
          <span className="text-xs text-muted hidden sm:inline flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>Live Sync Active</span>
          </span>
          <button className="btn btn-secondary btn-sm flex items-center gap-1.5" onClick={() => loadOrders(true)} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="card p-3 mb-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {statusFilters.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = selectedStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`btn btn-xs flex items-center gap-1.5 ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedStatus(tab.key)}
                >
                  <TabIcon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 min-w-[240px]">
            <div className="search-input-wrapper relative w-full">
              <input
                type="text"
                className="input input-sm pl-8 w-full"
                placeholder="Search by ID, name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={14} className="text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">
              Filter
            </button>
          </form>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          searchPlaceholder="Filter listed orders..."
        />
      </div>

      {/* Order Details & Lifecycle Modal */}
      <Modal
        isOpen={showOrderModal}
        onClose={() => {
          setShowOrderModal(false);
          setConfirmStep(false);
        }}
        title={`Order Fulfillment: #${selectedOrder?.orderReferenceNumber || selectedOrder?.id}`}
        maxWidth="840px"
      >
        {selectedOrder && (
          <div className="order-details-wrapper">
            {/* Visual 8-Stage Stepper */}
            <div className="order-stepper-card p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] mb-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                <Truck size={14} className="text-primary" />
                <span>End-to-End Fulfillment Lifecycle</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center">
                {ORDER_LIFECYCLE_STEPS.map((step, idx) => {
                  const currentIdx = ORDER_LIFECYCLE_STEPS.findIndex(s => s.key === selectedOrder.currentStatus);
                  const isCompleted = currentIdx > idx;
                  const isCurrent = selectedOrder.currentStatus === step.key;
                  const isCancelled = selectedOrder.currentStatus === 'CANCELLED';
                  const StepIcon = step.icon;

                  let circleClass = 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]';
                  if (isCancelled) {
                    circleClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                  } else if (isCurrent) {
                    circleClass = 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/30';
                  } else if (isCompleted) {
                    circleClass = 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
                  }

                  return (
                    <div key={step.key} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${circleClass}`}>
                        {isCompleted ? <Check size={14} /> : <StepIcon size={14} />}
                      </div>
                      <span className={`text-[11px] mt-1.5 leading-tight ${isCurrent ? 'font-bold text-primary' : 'text-muted'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer & Address Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                  <User size={13} className="text-primary" />
                  <span>Customer & Contact</span>
                </div>
                <div className="font-semibold text-base">{selectedOrder.customerName || 'Valued Customer'}</div>
                <div className="text-sm text-muted flex items-center gap-1.5 mt-1">
                  <Mail size={13} />
                  <span>{selectedOrder.customerEmail || 'Email not provided'}</span>
                </div>
                <div className="text-sm text-muted flex items-center gap-1.5 mt-1">
                  <Phone size={13} />
                  <span>{selectedOrder.customerPhone || 'Phone not provided'}</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                  <MapPin size={13} className="text-primary" />
                  <span>Shipping Address & Dispatch Details</span>
                </div>
                <p className="text-sm font-medium">{selectedOrder.shippingAddress || 'Standard Delivery Address'}</p>
                <p className="text-sm text-muted mt-0.5">
                  {selectedOrder.city || 'City'}, {selectedOrder.state || 'State'} - {selectedOrder.zipcode || 'Postal Code'}
                </p>
                <p className="text-xs text-muted mt-0.5">{selectedOrder.country || 'India'}</p>
                {selectedOrder.trackingNumber && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted">Carrier:</span>
                      <span className="font-medium text-primary">{selectedOrder.carrierName || 'EcoExpress'}</span>
                      <span className="text-muted ml-1">AWB:</span>
                      <span className="font-mono font-bold">{selectedOrder.trackingNumber}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs flex items-center gap-1"
                      onClick={() => navigate(`/fulfillment?orderId=${selectedOrder.id}`)}
                    >
                      <Navigation size={11} className="text-emerald-500" />
                      <span>Live Telemetry</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Payment & Order Summary Strip */}
            <div className="p-3.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <div className="text-xs text-muted">Payment Method & Status</div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <span>{selectedOrder.paymentMethod || 'Razorpay / Online'}</span>
                    <span className="badge badge-success badge-xs">{selectedOrder.paymentStatus || 'PAID'}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.razorpayPaymentId && (
                <div>
                  <div className="text-xs text-muted">Transaction Reference</div>
                  <div className="font-mono text-xs font-medium">{selectedOrder.razorpayPaymentId}</div>
                </div>
              )}

              <div>
                <div className="text-xs text-muted">Total Payable Amount</div>
                <div className="font-bold text-lg text-success">
                  ₹{Number(selectedOrder.totalAmount || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                <Package size={13} className="text-primary" />
                <span>Purchased Line Items ({selectedOrder.items?.length || 0})</span>
              </div>
              <div className="table-responsive border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product Item</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th className="text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.length > 0 ? (
                      selectedOrder.items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td>
                            <div className="font-medium">{it.productName}</div>
                            {it.sku && <div className="text-xs text-muted mono-text">SKU: {it.sku}</div>}
                          </td>
                          <td className="font-mono">{it.quantity}</td>
                          <td>₹{Number(it.priceAtPurchase || 0).toFixed(2)}</td>
                          <td className="text-right font-semibold">₹{Number(it.subtotal || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-3 text-muted text-sm">
                          Standard Eco Product Order
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* State Machine Transition Form */}
            {canUpdate && allowedNext.length > 0 && (
              <form onSubmit={handleStatusTransition} className="p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] mb-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                  <Send size={14} />
                  <span>Execute Lifecycle State Transition</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="form-group">
                    <label className="form-label text-xs font-semibold">Target Next Status *</label>
                    <select
                      className="input input-sm"
                      value={transitionForm.newStatus}
                      onChange={(e) => {
                        setTransitionForm({ ...transitionForm, newStatus: e.target.value });
                        setConfirmStep(false);
                      }}
                      required
                    >
                      {allowedNext.map((st) => (
                        <option key={st} value={st}>
                          {st.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label text-xs font-semibold">Carrier Logistics Partner</label>
                    <select
                      className="input input-sm"
                      value={transitionForm.carrierName}
                      onChange={(e) => setTransitionForm({ ...transitionForm, carrierName: e.target.value })}
                    >
                      {CARRIER_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="form-group">
                    <label className="form-label text-xs font-semibold">Tracking / AWB Number</label>
                    <input
                      type="text"
                      className="input input-sm mono-text"
                      value={transitionForm.trackingNumber}
                      onChange={(e) => setTransitionForm({ ...transitionForm, trackingNumber: e.target.value })}
                      placeholder="e.g. ECO-AWB-981249"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label text-xs font-semibold">Operational Audit Note</label>
                    <input
                      type="text"
                      className="input input-sm"
                      value={transitionForm.reasonNote}
                      onChange={(e) => setTransitionForm({ ...transitionForm, reasonNote: e.target.value })}
                      placeholder="e.g. Quality verified and dispatched via EcoExpress"
                    />
                  </div>
                </div>

                {confirmStep && (
                  <div className="alert alert-warning mb-3 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} />
                      <span>
                        Confirm transitioning order to <strong>{transitionForm.newStatus.replace(/_/g, ' ')}</strong>? Customer notification (Email + SMS) will be triggered.
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Updating & Notifying...</span>
                      </>
                    ) : confirmStep ? (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Yes, Confirm & Sync Status</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Submit Status Transition</span>
                      </>
                    )}
                  </button>

                  {confirmStep && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setConfirmStep(false)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Historical State Transition Timeline */}
            <div className="p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-primary" />
                <span>Forensic Audit History & Stage Log</span>
              </div>

              <div className="timeline-list space-y-3">
                {(!selectedOrder.timeline || selectedOrder.timeline.length === 0) ? (
                  <p className="text-muted text-xs">No stage transitions logged yet.</p>
                ) : (
                  selectedOrder.timeline.map((t, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary">
                            {t.fromStatus ? `${t.fromStatus.replace(/_/g, ' ')} → ` : ''}
                            {t.toStatus ? t.toStatus.replace(/_/g, ' ') : ''}
                          </span>
                          <span className="text-muted text-[11px]">
                            {t.timestamp ? new Date(t.timestamp).toLocaleString() : ''}
                          </span>
                        </div>
                        <div className="text-muted mt-0.5">
                          Logged by: <span className="font-medium text-foreground">{t.changedByUsername || 'Staff Operator'}</span>
                        </div>
                        {t.reasonNote && (
                          <div className="text-[11px] text-muted italic mt-0.5 bg-[var(--surface)] p-1.5 rounded">
                            "{t.reasonNote}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrdersPage;
