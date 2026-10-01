import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Truck,
  Package,
  MapPin,
  Navigation,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  Eye,
  Send,
  Radio,
  Layers,
  Calendar,
  X,
  Plus,
  Box,
  Compass,
  ArrowRight,
  ShieldCheck,
  Check,
  Activity,
  ChevronRight,
  ExternalLink,
  Info,
  Map,
  RotateCw,
  KeyRound,
  Filter,
  SlidersHorizontal,
  Building,
  Hash
} from 'lucide-react';
import { fulfillmentApi, orderOpsApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { createTrackingClient } from '../utils/stompClient';

const SHIPMENT_STATUSES = [
  'ALL',
  'CREATED',
  'PACKED',
  'DISPATCHED',
  'IN_TRANSIT',
  'ARRIVED_AT_HUB',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED_DELIVERY',
  'CANCELLED'
];

const CARRIER_OPTIONS = [
  'All Carriers',
  'EcoExpress Carbon-Neutral (Default)',
  'BlueDart Express Surface',
  'Delhivery Logistics',
  'Shadowfax Hyperlocal',
  'DTDC Express'
];

const WAREHOUSE_OPTIONS = [
  'All Warehouses',
  'Bengaluru Central Fulfillment Hub',
  'Hyderabad Regional Logistics Hub',
  'Mumbai West Central Warehouse',
  'Delhi-NCR North Logistics Center'
];

const STATE_OPTIONS = [
  'All States',
  'Telangana',
  'Karnataka',
  'Maharashtra',
  'Delhi',
  'Tamil Nadu',
  'Gujarat',
  'Uttar Pradesh'
];

// Production staff actions mapping strictly according to Amazon/Flipkart responsibility separation
const SHIPMENT_STAFF_ACTIONS = {
  CREATED: {
    nextStatus: 'PACKED',
    label: 'Mark Packed',
    icon: Package,
    btnClass: 'btn-primary',
    bg: '#d97706' // orange
  },
  PACKED: {
    nextStatus: 'DISPATCHED',
    label: 'Dispatch Shipment',
    icon: Truck,
    btnClass: 'btn-primary',
    bg: '#0284c7' // cyan/blue
  },
  DISPATCHED: {
    nextStatus: 'IN_TRANSIT',
    label: 'Start Transit',
    icon: Navigation,
    btnClass: 'btn-primary',
    bg: '#2563eb' // blue
  },
  IN_TRANSIT: {
    nextStatus: 'ARRIVED_AT_HUB',
    label: 'Arrived At Hub',
    icon: Building,
    btnClass: 'btn-primary',
    bg: '#7c3aed' // purple
  },
  ARRIVED_AT_HUB: {
    nextStatus: 'OUT_FOR_DELIVERY',
    label: 'Out For Delivery',
    icon: Truck,
    btnClass: 'btn-primary',
    bg: '#ea580c' // deep orange
  },
  OUT_FOR_DELIVERY: {
    nextStatus: 'DELIVERED',
    label: 'Verify Delivery OTP',
    icon: KeyRound,
    btnClass: 'btn-primary',
    bg: '#16a34a', // green
    isOtpFlow: true
  }
};

export const FulfillmentPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';

  const { hasPermission, isAdmin } = useAuth();
  const canUpdate = isAdmin() || hasPermission('ORDER_STATUS_UPDATE') || hasPermission('ORDER_PROCESS');

  const [activeTab, setActiveTab] = useState('shipments'); // 'shipments' | 'awaiting' | 'containers'
  const [shipments, setShipments] = useState([]);
  const [ordersAwaiting, setOrdersAwaiting] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Enterprise Location & Carrier Filters
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(initialOrderId ? `ORD-${initialOrderId}` : '');
  const [selectedWarehouse, setSelectedWarehouse] = useState('All Warehouses');
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedPincode, setSelectedPincode] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('All Carriers');
  const [selectedHub, setSelectedHub] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // WebSocket Live Stomp State
  const [wsConnected, setWsConnected] = useState(false);
  const stompClientRef = useRef(null);

  // Modals
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [shipmentTrackingHistory, setShipmentTrackingHistory] = useState([]);
  const [shipmentAuditEvents, setShipmentAuditEvents] = useState([]);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Delivery OTP Modal States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpTargetShipment, setOtpTargetShipment] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Provision Physical Shipment Modal
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [orderLookupData, setOrderLookupData] = useState(null);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    targetOrderId: initialOrderId || '',
    carrierName: 'EcoExpress Carbon-Neutral (Default)',
    trackingNumber: '',
    vehicleNumber: 'KA-01-EQ-9124',
    origin: 'Bengaluru Central Fulfillment Hub',
    destination: '',
    route: 'BLR-HYD-DEL Expressway Corridor',
    estimatedDays: 3
  });

  // Direct status transition in flight
  const [transitioningId, setTransitioningId] = useState(null);

  // 1. Fetch Shipments with Enterprise Location Filters
  const loadShipments = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const data = await fulfillmentApi.searchShipments({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: searchQuery || undefined,
        warehouse: selectedWarehouse !== 'All Warehouses' ? selectedWarehouse : undefined,
        state: selectedState !== 'All States' ? selectedState : undefined,
        city: selectedCity.trim() || undefined,
        pincode: selectedPincode.trim() || undefined,
        carrier: selectedCarrier !== 'All Carriers' ? selectedCarrier : undefined,
        hub: selectedHub.trim() || undefined,
        page: 0,
        size: 100
      });
      const list = data?.content || (Array.isArray(data) ? data : []);
      setShipments(list);
    } catch (err) {
      if (showSpinner) setError(err.message || 'Failed to load shipments');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [selectedStatus, searchQuery, selectedWarehouse, selectedState, selectedCity, selectedPincode, selectedCarrier, selectedHub]);

  // 2. Fetch Orders Awaiting Fulfillment
  const loadOrdersAwaiting = useCallback(async () => {
    try {
      const res = await orderOpsApi.getOrders({ status: 'ALL', size: 100 });
      const allOrders = res?.orders || res?.content || (Array.isArray(res) ? res : []);
      const filtered = allOrders.filter((o) => {
        const st = (o.status || o.currentStatus || '').toUpperCase();
        return ['ORDER_PLACED', 'ORDER_CONFIRMED', 'PROCESSING', 'PAID'].includes(st);
      });
      setOrdersAwaiting(filtered);
    } catch {
      setOrdersAwaiting([]);
    }
  }, []);

  // 3. Fetch Containers
  const loadContainers = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await fulfillmentApi.searchContainers({
        page: 0,
        size: 100
      });
      const list = data?.content || (Array.isArray(data) ? data : []);
      setContainers(list);
    } catch {
      setContainers([]);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  // Initial Load and Auto-refresh polling
  useEffect(() => {
    loadShipments(true);
    loadOrdersAwaiting();
    loadContainers(false);

    const interval = setInterval(() => {
      loadShipments(false);
      loadOrdersAwaiting();
    }, 8000);

    return () => clearInterval(interval);
  }, [loadShipments, loadOrdersAwaiting, loadContainers]);

  // STOMP WebSocket Connection for Real-Time Synchronization
  useEffect(() => {
    const client = createTrackingClient();
    stompClientRef.current = client;

    client.onConnect(() => {
      setWsConnected(true);
      client.subscribe('/topic/fulfillment/activity', () => {
        loadShipments(false);
        loadOrdersAwaiting();
      });
    });

    client.onDisconnect(() => {
      setWsConnected(false);
    });

    client.connect();

    return () => {
      client.disconnect();
    };
  }, [loadShipments, loadOrdersAwaiting]);

  // Cooldown countdown timer
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  // Handle Target Order Lookup for Provisioning
  const handleValidateOrder = async (orderIdToLookup = provisionForm.targetOrderId) => {
    const cleaned = String(orderIdToLookup).replace(/[^0-9]/g, '');
    if (!cleaned) {
      setError('Please enter a valid numeric Order ID (e.g. 41 or ORD-41).');
      return;
    }

    setLookupLoading(true);
    setError('');
    try {
      const res = await orderOpsApi.getOrderById(cleaned);
      const o = res?.order || res?.data || res;
      if (!o || !o.id) {
        throw new Error(`Order ORD-${cleaned} was not found in database.`);
      }

      setOrderLookupData(o);
      const addr = [
        o.shipping_address || o.shippingAddress,
        o.city,
        o.state,
        o.zipcode || o.pincode
      ].filter(Boolean).join(', ') || 'Customer Delivery Address';

      setProvisionForm((prev) => ({
        ...prev,
        targetOrderId: String(o.id),
        destination: addr,
        trackingNumber: o.tracking_number || `ECO-AWB-${o.id * 100 + 41}`,
        carrierName: o.carrier_name || 'EcoExpress Carbon-Neutral (Default)'
      }));
    } catch (err) {
      setError(err.message || 'Order not found in database.');
      setOrderLookupData(null);
    } finally {
      setLookupLoading(false);
    }
  };

  // Handle Provisioning Submit
  const handleProvisionShipment = async (e) => {
    e.preventDefault();
    if (!provisionForm.targetOrderId) {
      setError('Target Order ID is required.');
      return;
    }

    setProvisioning(true);
    setError('');
    try {
      const payload = {
        orderId: Number(provisionForm.targetOrderId),
        carrierName: provisionForm.carrierName,
        trackingNumber: provisionForm.trackingNumber,
        vehicleNumber: provisionForm.vehicleNumber,
        origin: provisionForm.origin,
        destination: provisionForm.destination,
        route: provisionForm.route,
        currentLatitude: 12.9716,
        currentLongitude: 77.5946,
        estimatedDelivery: new Date(Date.now() + provisionForm.estimatedDays * 86400000).toISOString()
      };

      const res = await fulfillmentApi.createShipment(payload);
      setSuccess(`Shipment #${res?.shipmentNumber || 'CREATED'} created successfully.`);
      setShowProvisionModal(false);
      setOrderLookupData(null);
      loadShipments(true);
      loadOrdersAwaiting();
    } catch (err) {
      setError(err.message || 'Failed to create shipment.');
    } finally {
      setProvisioning(false);
    }
  };

  // Transition Shipment State
  const handleTransitionStatus = async (shipment, nextStatus) => {
    setTransitioningId(shipment.id);
    setError('');
    try {
      const res = await fulfillmentApi.updateShipmentStatus(shipment.id, nextStatus);
      setSuccess(`Shipment #${shipment.shipmentNumber} transitioned to ${nextStatus}.`);
      loadShipments(false);
    } catch (err) {
      setError(err.message || `Failed to transition shipment to ${nextStatus}`);
    } finally {
      setTransitioningId(null);
    }
  };

  // Open Delivery OTP Modal
  const handleOpenOtpModal = async (shipment) => {
    setOtpTargetShipment(shipment);
    setEnteredOtp('');
    setOtpError('');
    setOtpSuccess('');
    setShowOtpModal(true);

    // Trigger OTP dispatch on modal open if not already active
    setOtpSending(true);
    try {
      const res = await fulfillmentApi.sendDeliveryOtp(shipment.id);
      setOtpSuccess(res?.message || 'Secure 6-digit Delivery PIN dispatched to customer email.');
      setOtpCooldown(45);
    } catch (err) {
      setOtpError(err.message || 'Failed to dispatch Delivery PIN.');
    } finally {
      setOtpSending(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!otpTargetShipment || otpCooldown > 0) return;
    setOtpSending(true);
    setOtpError('');
    setOtpSuccess('');
    try {
      const res = await fulfillmentApi.sendDeliveryOtp(otpTargetShipment.id);
      setOtpSuccess('Fresh 6-digit Delivery OTP sent to customer email.');
      setOtpCooldown(60);
    } catch (err) {
      setOtpError(err.message || 'Failed to resend Delivery OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  // Verify Delivery OTP Submit
  const handleVerifyOtpSubmit = async (e) => {
    e?.preventDefault();
    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      setOtpError('Please enter a valid 6-digit numeric OTP.');
      return;
    }

    setOtpVerifying(true);
    setOtpError('');
    try {
      const res = await fulfillmentApi.verifyDeliveryOtp(otpTargetShipment.id, enteredOtp.trim());
      setSuccess(res?.message || `Shipment #${otpTargetShipment.shipmentNumber} successfully marked DELIVERED!`);
      setShowOtpModal(false);
      setOtpTargetShipment(null);
      loadShipments(true);
      loadOrdersAwaiting();
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Open Tracking Modal
  const handleOpenTrackingModal = async (shipment) => {
    setSelectedShipment(shipment);
    setShowTrackingModal(true);
    setTrackingLoading(true);
    setShipmentTrackingHistory([]);
    setShipmentAuditEvents([]);
    try {
      const [trackingRes, eventsRes] = await Promise.all([
        fulfillmentApi.getShipmentTracking(shipment.id).catch(() => []),
        fulfillmentApi.getShipmentEvents(shipment.id).catch(() => [])
      ]);
      setShipmentTrackingHistory(trackingRes || []);
      setShipmentAuditEvents(eventsRes || []);
    } catch {
      // Fallback
    } finally {
      setTrackingLoading(false);
    }
  };

  // Table Columns Definition
  const shipmentColumns = [
    {
      key: 'shipmentNumber',
      title: 'Shipment / Order ID',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
            #{row.shipmentNumber}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <span style={{ fontWeight: 600 }}>Order:</span> #{row.orderId}
          </div>
        </div>
      )
    },
    {
      key: 'route',
      title: 'Origin → Destination',
      render: (row) => (
        <div style={{ maxWidth: '240px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {row.origin || 'Fulfillment Hub'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
            <MapPin size={11} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.destination || 'Delivery Address'}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'carrier',
      title: 'Carrier / Vehicle',
      render: (row) => (
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.carrierName || 'EcoExpress'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            AWB: {row.trackingNumber || 'Pending'} • {row.vehicleNumber || 'KA-01-EQ-9124'}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Shipment Status',
      render: (row) => (
        <StatusBadge status={row.status} />
      )
    },
    {
      key: 'gpsActive',
      title: 'GPS Status',
      render: (row) => {
        const isGpsActive = ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(row.status);
        return isGpsActive ? (
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            color: '#059669',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Radio size={11} className="spin" />
            LIVE GPS
          </span>
        ) : row.status === 'DELIVERED' ? (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Completed</span>
        ) : (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pre-Transit</span>
        );
      }
    },
    {
      key: 'staffAction',
      title: 'Physical Movement Action',
      render: (row) => {
        const actionConfig = SHIPMENT_STAFF_ACTIONS[row.status];
        const isTransitioning = transitioningId === row.id;

        if (row.status === 'DELIVERED') {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 600, fontSize: '0.82rem' }}>
              <CheckCircle2 size={15} />
              Delivered
            </div>
          );
        }

        if (row.status === 'CANCELLED') {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontWeight: 600, fontSize: '0.82rem' }}>
              <X size={15} />
              Cancelled
            </div>
          );
        }

        if (!actionConfig) {
          return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Action</span>;
        }

        const ActionIcon = actionConfig.icon;

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => {
                if (actionConfig.isOtpFlow) {
                  handleOpenOtpModal(row);
                } else {
                  handleTransitionStatus(row, actionConfig.nextStatus);
                }
              }}
              disabled={isTransitioning || !canUpdate}
              className={`btn btn-sm ${actionConfig.btnClass}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.78rem',
                padding: '4px 10px',
                backgroundColor: actionConfig.bg,
                borderColor: actionConfig.bg
              }}
            >
              {isTransitioning ? (
                <RefreshCw size={13} className="spin" />
              ) : (
                <ActionIcon size={13} />
              )}
              {actionConfig.label}
            </button>

            <button
              onClick={() => handleOpenTrackingModal(row)}
              className="btn btn-outline btn-sm"
              title="Track physical shipment milestones"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              <Navigation size={12} />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="fulfillment-page" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={26} style={{ color: '#059669' }} />
            Fulfillment & Physical Movement Control
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            Authoritative engine for physical package transitions, linehaul dispatch, GPS tracking, and OTP verification.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: '20px',
            backgroundColor: wsConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: wsConnected ? '#047857' : '#b91c1c'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: wsConnected ? '#10b981' : '#ef4444' }} />
            {wsConnected ? 'STOMP Live Sync Active' : 'Connecting WebSocket...'}
          </div>

          <button
            onClick={() => {
              setProvisionForm({
                targetOrderId: initialOrderId || '',
                carrierName: 'EcoExpress Carbon-Neutral (Default)',
                trackingNumber: '',
                vehicleNumber: 'KA-01-EQ-9124',
                origin: 'Bengaluru Central Fulfillment Hub',
                destination: '',
                route: 'BLR-HYD-DEL Expressway Corridor',
                estimatedDays: 3
              });
              setShowProvisionModal(true);
            }}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', backgroundColor: '#059669', borderColor: '#059669' }}
          >
            <Plus size={15} />
            Provision Shipment
          </button>
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('shipments')}
          style={{
            padding: '10px 18px',
            fontSize: '0.88rem',
            fontWeight: 700,
            border: 'none',
            borderBottom: activeTab === 'shipments' ? '2px solid #059669' : '2px solid transparent',
            color: activeTab === 'shipments' ? '#059669' : 'var(--text-secondary)',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Truck size={16} />
          Active Shipments ({shipments.length})
        </button>

        <button
          onClick={() => setActiveTab('awaiting')}
          style={{
            padding: '10px 18px',
            fontSize: '0.88rem',
            fontWeight: 700,
            border: 'none',
            borderBottom: activeTab === 'awaiting' ? '2px solid #059669' : '2px solid transparent',
            color: activeTab === 'awaiting' ? '#059669' : 'var(--text-secondary)',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Box size={16} />
          Orders Awaiting Fulfillment ({ordersAwaiting.length})
        </button>
      </div>

      {activeTab === 'shipments' ? (
        <div>
          {/* Status Quick Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {SHIPMENT_STATUSES.map(st => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: selectedStatus === st ? '1px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: selectedStatus === st ? 'var(--primary)' : 'var(--surface)',
                    color: selectedStatus === st ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`btn btn-sm ${showAdvancedFilters ? 'btn-primary' : 'btn-outline'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}
              >
                <SlidersHorizontal size={14} />
                Enterprise Filters
              </button>

              <div style={{ position: 'relative', width: '240px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search Shipment, Order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    fontSize: '0.82rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Enterprise Location & Metadata Filter Panel */}
          {showAdvancedFilters && (
            <div style={{
              padding: '16px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Warehouse / Origin
                </label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}
                >
                  {WAREHOUSE_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Destination State
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}
                >
                  {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hyderabad, Bengaluru"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Pincode
                </label>
                <input
                  type="text"
                  placeholder="e.g. 500033"
                  value={selectedPincode}
                  onChange={(e) => setSelectedPincode(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Carrier
                </label>
                <select
                  value={selectedCarrier}
                  onChange={(e) => setSelectedCarrier(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}
                >
                  {CARRIER_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => loadShipments(true)}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, padding: '7px', fontSize: '0.8rem' }}
                >
                  Apply Filters
                </button>
                <button
                  onClick={() => {
                    setSelectedWarehouse('All Warehouses');
                    setSelectedState('All States');
                    setSelectedCity('');
                    setSelectedPincode('');
                    setSelectedCarrier('All Carriers');
                    setSelectedHub('');
                    setSelectedStatus('ALL');
                    setSearchQuery('');
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ padding: '7px', fontSize: '0.8rem' }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Shipments Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <DataTable
              columns={shipmentColumns}
              data={shipments}
              loading={loading}
              emptyMessage={
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <Truck size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>No shipments found</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                    Click "Provision Shipment" above to allocate orders and start physical movement.
                  </div>
                </div>
              }
            />
          </div>
        </div>
      ) : (
        /* Orders Awaiting Fulfillment Tab */
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <DataTable
              columns={[
                {
                  key: 'orderId',
                  title: 'Order ID',
                  render: (row) => (
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                      #{row.order_reference_number || `ORD-${row.id}`}
                    </div>
                  )
                },
                {
                  key: 'customer',
                  title: 'Customer',
                  render: (row) => (
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        {row.recipient_name || row.customer_name || 'Customer'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {row.city}, {row.state}
                      </div>
                    </div>
                  )
                },
                {
                  key: 'total',
                  title: 'Order Total',
                  render: (row) => (
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      ₹{Number(row.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  )
                },
                {
                  key: 'status',
                  title: 'Order Status',
                  render: (row) => <StatusBadge status={row.status} />
                },
                {
                  key: 'action',
                  title: 'Action',
                  render: (row) => (
                    <button
                      onClick={() => {
                        setProvisionForm({
                          targetOrderId: String(row.id),
                          carrierName: 'EcoExpress Carbon-Neutral (Default)',
                          trackingNumber: `ECO-AWB-${row.id * 100 + 1}`,
                          vehicleNumber: 'KA-01-EQ-9124',
                          origin: 'Bengaluru Central Fulfillment Hub',
                          destination: [row.shipping_address, row.city, row.state, row.zipcode].filter(Boolean).join(', '),
                          route: 'Green Linehaul Corridor',
                          estimatedDays: 3
                        });
                        setShowProvisionModal(true);
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', backgroundColor: '#059669', borderColor: '#059669' }}
                    >
                      <Package size={13} />
                      Provision Shipment
                    </button>
                  )
                }
              ]}
              data={ordersAwaiting}
              loading={false}
              emptyMessage={
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <CheckCircle2 size={40} style={{ color: '#10b981', margin: '0 auto 12px auto' }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>All orders fulfilled!</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                    There are currently no pending orders waiting for physical packaging.
                  </div>
                </div>
              }
            />
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 1. DELIVERY OTP VERIFICATION MODAL         */}
      {/* ========================================== */}
      <Modal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        title={otpTargetShipment ? `Delivery Verification PIN • Order #${otpTargetShipment.orderId}` : 'Delivery Verification'}
        maxWidth="500px"
      >
        {otpTargetShipment && (
          <div>
            <div style={{ textAlign: 'center', padding: '10px 0 20px 0' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto'
              }}>
                <ShieldCheck size={28} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Verify Delivery PIN
              </h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Ask customer for the 6-digit PIN sent to their registered email before handing over package.
              </p>
            </div>

            {otpError && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', color: '#b91c1c', fontSize: '0.82rem', marginBottom: '14px' }}>
                {otpError}
              </div>
            )}

            {otpSuccess && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '6px', color: '#047857', fontSize: '0.82rem', marginBottom: '14px' }}>
                {otpSuccess}
              </div>
            )}

            <form onSubmit={handleVerifyOtpSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', textAlign: 'center' }}>
                  Enter 6-Digit Delivery OTP:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="• • • • • •"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    letterSpacing: '8px',
                    textAlign: 'center',
                    borderRadius: '8px',
                    border: '2px solid #059669',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpSending || otpCooldown > 0}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.8rem', color: '#0284c7' }}
                >
                  {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP to Customer'}
                </button>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  TTL: 5 Minutes (Max 5 attempts)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowOtpModal(false)} className="btn btn-outline" disabled={otpVerifying}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={otpVerifying || enteredOtp.length !== 6}
                  style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', minWidth: '140px' }}
                >
                  {otpVerifying ? 'Verifying...' : 'Verify Delivery'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* ========================================== */}
      {/* 2. PROVISION SHIPMENT MODAL                */}
      {/* ========================================== */}
      <Modal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        title="Provision Physical Shipment"
        maxWidth="600px"
      >
        <form onSubmit={handleProvisionShipment}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              Target Order ID (e.g. 41 or ORD-41)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={provisionForm.targetOrderId}
                onChange={(e) => setProvisionForm({ ...provisionForm, targetOrderId: e.target.value })}
                placeholder="Enter numeric Order ID"
                style={{ flex: 1, padding: '8px 10px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                required
              />
              <button
                type="button"
                onClick={() => handleValidateOrder()}
                disabled={lookupLoading}
                className="btn btn-outline btn-sm"
              >
                {lookupLoading ? 'Checking...' : 'Lookup Order'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Carrier Name
              </label>
              <select
                value={provisionForm.carrierName}
                onChange={(e) => setProvisionForm({ ...provisionForm, carrierName: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
              >
                {CARRIER_OPTIONS.filter(c => c !== 'All Carriers').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Vehicle Number
              </label>
              <input
                type="text"
                value={provisionForm.vehicleNumber}
                onChange={(e) => setProvisionForm({ ...provisionForm, vehicleNumber: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              Origin Fulfillment Hub
            </label>
            <input
              type="text"
              value={provisionForm.origin}
              onChange={(e) => setProvisionForm({ ...provisionForm, origin: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              Delivery Destination
            </label>
            <input
              type="text"
              value={provisionForm.destination}
              onChange={(e) => setProvisionForm({ ...provisionForm, destination: e.target.value })}
              placeholder="Customer Delivery Address"
              style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button type="button" onClick={() => setShowProvisionModal(false)} className="btn btn-outline" disabled={provisioning}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={provisioning} style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
              {provisioning ? 'Creating Shipment...' : 'Create & Dispatch to Packing'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================== */}
      {/* 3. TRACKING & AUDIT MILESTONES MODAL       */}
      {/* ========================================== */}
      <Modal
        isOpen={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
        title={selectedShipment ? `Shipment #${selectedShipment.shipmentNumber} • Order #${selectedShipment.orderId}` : 'Shipment Tracking'}
        maxWidth="750px"
      >
        {trackingLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <RefreshCw size={28} className="spin" style={{ color: '#059669', margin: '0 auto 10px auto' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Loading tracking milestones & audit trail...</div>
          </div>
        ) : selectedShipment ? (
          <div>
            {/* Live GPS Radar: active only for DISPATCHED, IN_TRANSIT, OUT_FOR_DELIVERY */}
            {['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(selectedShipment.status) ? (
              <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>
                  <Compass size={18} className="spin" />
                  Live GPS Telemetry Active
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Vehicle Number: </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedShipment.vehicleNumber || 'KA-01-EQ-9124'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Carrier: </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedShipment.carrierName || 'EcoExpress'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Coordinates: </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedShipment.currentLatitude ? `${selectedShipment.currentLatitude}, ${selectedShipment.currentLongitude}` : '12.9716° N, 77.5946° E'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Route: </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedShipment.route || 'Green Corridor BLR-HYD'}</span>
                  </div>
                </div>
              </div>
            ) : selectedShipment.status === 'DELIVERED' ? (
              <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', borderRadius: '8px', color: '#047857', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <CheckCircle2 size={18} />
                Shipment successfully delivered to destination. Live physical telemetry session closed.
              </div>
            ) : (
              <div style={{ padding: '14px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid #f59e0b', borderRadius: '8px', color: '#b45309', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <Clock size={18} />
                Shipment is in {selectedShipment.status} stage. GPS tracking activates upon linehaul dispatch.
              </div>
            )}

            {/* Audit Milestones Timeline from shipment_events */}
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                Shipment Events & Audit Trail
              </div>

              {shipmentAuditEvents && shipmentAuditEvents.length > 0 ? (
                <div style={{ borderLeft: '2px solid #0284c7', paddingLeft: '16px', marginLeft: '8px' }}>
                  {shipmentAuditEvents.map((evt, idx) => (
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
                  Initial shipment created for Order #{selectedShipment.orderId}.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default FulfillmentPage;
