import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  RotateCw
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
  'EcoExpress Carbon-Neutral (Default)',
  'BlueDart Express Surface',
  'Delhivery Logistics',
  'Shadowfax Hyperlocal',
  'DTDC Express'
];

// Explicit forward state transitions graph
const ALLOWED_SHIPMENT_TRANSITIONS = {
  CREATED: [{ next: 'PACKED', label: 'Mark as Packed', action: 'Confirm Package Ready' }],
  PACKED: [{ next: 'DISPATCHED', label: 'Dispatch Shipment', action: 'Leave Fulfillment Hub' }],
  DISPATCHED: [{ next: 'IN_TRANSIT', label: 'Start / Confirm In-Transit', action: 'Hand to Carrier Linehaul' }],
  IN_TRANSIT: [
    { next: 'ARRIVED_AT_HUB', label: 'Arrived at Destination Hub', action: 'Inland Checkpoint Received' },
    { next: 'OUT_FOR_DELIVERY', label: 'Send Out for Delivery', action: 'Hand to Last-Mile Courier' }
  ],
  ARRIVED_AT_HUB: [{ next: 'OUT_FOR_DELIVERY', label: 'Send Out for Delivery', action: 'Last-Mile Executive Dispatched' }],
  OUT_FOR_DELIVERY: [
    { next: 'DELIVERED', label: 'Mark Delivered', action: 'Customer Delivery Confirmed' },
    { next: 'FAILED_DELIVERY', label: 'Report Delivery Exception', action: 'Customer Unavailable / Reschedule' }
  ],
  FAILED_DELIVERY: [{ next: 'OUT_FOR_DELIVERY', label: 'Re-attempt Delivery', action: 'Next Day Courier Delivery' }],
  DELIVERED: [],
  CANCELLED: []
};

export const FulfillmentPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';

  const { hasPermission, isAdmin } = useAuth();
  const canUpdate = isAdmin() || hasPermission('ORDER_STATUS_UPDATE') || hasPermission('ORDER_PROCESS');

  const [activeTab, setActiveTab] = useState('shipments'); // 'shipments' | 'awaiting' | 'containers'
  const [shipments, setShipments] = useState([]);
  const [ordersAwaiting, setOrdersAwaiting] = useState([]);
  const [containers, setContainers] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(initialOrderId ? `ORD-${initialOrderId}` : '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // WebSocket Live Stomp State
  const [wsConnected, setWsConnected] = useState(false);
  const stompClientRef = useRef(null);

  // Modals
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [shipmentTrackingHistory, setShipmentTrackingHistory] = useState([]);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  // Provision Physical Shipment Modal
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionStep, setProvisionStep] = useState(1);
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

  // GPS Telemetry Modal
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [gpsForm, setGpsForm] = useState({
    id: null,
    latitude: '12.9716',
    longitude: '77.5946',
    locationName: '',
    note: 'Routine GPS telemetry checkpoint update'
  });
  const [gpsUpdating, setGpsUpdating] = useState(false);

  // 1. Fetch Shipments
  const loadShipments = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const data = await fulfillmentApi.searchShipments({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: searchQuery || undefined,
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
  }, [selectedStatus, searchQuery]);

  // 2. Fetch Orders Awaiting Fulfillment
  const loadOrdersAwaiting = useCallback(async () => {
    try {
      const res = await orderOpsApi.getOrders({ status: 'ALL', size: 100 });
      const allOrders = res?.orders || res?.content || (Array.isArray(res) ? res : []);
      // Filter orders that are confirmed/placed and don't yet have active delivered shipment
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

  // Initial Load
  useEffect(() => {
    loadShipments(true);
    loadOrdersAwaiting();
    loadContainers(false);
  }, [loadShipments, loadOrdersAwaiting, loadContainers]);

  // STOMP WebSocket Connection
  useEffect(() => {
    const client = createTrackingClient();
    stompClientRef.current = client;

    client.onConnect(() => {
      setWsConnected(true);
      // Activity channel
      client.subscribe('/topic/fulfillment/activity', (msg) => {
        loadShipments(false);
      });
    });

    client.onDisconnect(() => {
      setWsConnected(false);
    });

    client.connect();

    return () => {
      client.disconnect();
    };
  }, [loadShipments]);

  // Handle Target Order Lookup & Pre-population
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
        throw new Error(`Order ORD-${cleaned} was not found in the database.`);
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
      setError(err.message || `Failed to find order ORD-${cleaned}`);
      setOrderLookupData(null);
    } finally {
      setLookupLoading(false);
    }
  };

  // Open Provision Modal for specific order
  const openProvisionForOrder = (order) => {
    const orderId = order.id || order.orderId;
    setProvisionForm({
      targetOrderId: String(orderId),
      carrierName: order.carrier_name || 'EcoExpress Carbon-Neutral (Default)',
      trackingNumber: order.tracking_number || `ECO-AWB-${orderId * 100 + 41}`,
      vehicleNumber: 'KA-01-EQ-9124',
      origin: 'Bengaluru Central Fulfillment Hub',
      destination: [order.shipping_address || order.shippingAddress, order.city, order.state, order.zipcode].filter(Boolean).join(', '),
      route: 'BLR-HYD-DEL Expressway Corridor',
      estimatedDays: 3
    });
    setOrderLookupData(order);
    setProvisionStep(1);
    setShowProvisionModal(true);
  };

  // Submit Physical Shipment Provisioning
  const handleCreateShipmentSubmit = async (e) => {
    e.preventDefault();
    if (!provisionForm.targetOrderId) {
      setError('Target Order ID is required.');
      return;
    }

    setProvisioning(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        orderId: parseInt(provisionForm.targetOrderId, 10),
        carrierName: provisionForm.carrierName,
        trackingNumber: provisionForm.trackingNumber,
        vehicleNumber: provisionForm.vehicleNumber,
        origin: provisionForm.origin,
        destination: provisionForm.destination,
        route: provisionForm.route,
        estimatedDeliveryDays: parseInt(provisionForm.estimatedDays, 10) || 3
      };

      const created = await fulfillmentApi.createShipment(payload);
      const shipNum = created.shipmentNumber || `SHP-${created.id}`;
      setSuccess(`Physical Shipment #${shipNum} provisioned successfully for Order ORD-${provisionForm.targetOrderId} (Status: CREATED).`);
      setShowProvisionModal(false);
      loadShipments(false);
      loadOrdersAwaiting();
    } catch (err) {
      setError(`Unable to create physical shipment. Reason: ${err.message || 'Validation rejected by fulfillment service.'}`);
    } finally {
      setProvisioning(false);
    }
  };

  // Execute Strict Forward Transition
  const handleDirectTransition = async (shipment, nextStatus) => {
    setTransitioningId(shipment.id);
    setError('');
    setSuccess('');
    try {
      const updated = await fulfillmentApi.updateShipmentStatus(shipment.id, nextStatus);
      setSuccess(`Shipment #${shipment.shipmentNumber || shipment.id} transitioned to ${nextStatus}.`);
      loadShipments(false);
      loadOrdersAwaiting();
    } catch (err) {
      setError(`Transition to ${nextStatus} failed: ${err.message}`);
    } finally {
      setTransitioningId(null);
    }
  };

  // Open Detailed Tracking Modal
  const openShipmentTracking = async (shipment) => {
    setSelectedShipment(shipment);
    setShowTrackingModal(true);
    try {
      const history = await fulfillmentApi.getShipmentTracking(shipment.id);
      setShipmentTrackingHistory(Array.isArray(history) ? history : []);
    } catch {
      setShipmentTrackingHistory([]);
    }
  };

  // Open GPS Update Modal
  const openGpsModal = (shipment) => {
    setGpsForm({
      id: shipment.id,
      latitude: shipment.currentLatitude ? String(shipment.currentLatitude) : '12.9716',
      longitude: shipment.currentLongitude ? String(shipment.currentLongitude) : '77.5946',
      locationName: `En route: ${shipment.destination || 'Highway Node'}`,
      note: 'Routine GPS telemetry coordinate checkpoint logged by driver'
    });
    setShowGpsModal(true);
  };

  const handleGpsSubmit = async (e) => {
    e.preventDefault();
    if (!gpsForm.id) return;

    setGpsUpdating(true);
    setError('');
    try {
      await fulfillmentApi.updateShipmentLocation(gpsForm.id, {
        latitude: parseFloat(gpsForm.latitude),
        longitude: parseFloat(gpsForm.longitude),
        locationName: gpsForm.locationName,
        note: gpsForm.note
      });
      setSuccess(`GPS Telemetry updated for Shipment #${gpsForm.id}.`);
      setShowGpsModal(false);
      loadShipments(false);
    } catch (err) {
      setError(`Failed to update GPS telemetry: ${err.message}`);
    } finally {
      setGpsUpdating(false);
    }
  };

  // Metrics Counters
  const totalShipments = shipments.length;
  const inTransitCount = shipments.filter((s) => ['IN_TRANSIT', 'DISPATCHED', 'ARRIVED_AT_HUB'].includes(s.status)).length;
  const outForDeliveryCount = shipments.filter((s) => s.status === 'OUT_FOR_DELIVERY').length;
  const totalContainers = containers.length;
  const awaitingFulfillmentCount = ordersAwaiting.length;
  const createdCount = shipments.filter((s) => s.status === 'CREATED').length;
  const packedCount = shipments.filter((s) => s.status === 'PACKED').length;

  // Next Action Required Item
  const activeActionableShipment = shipments.find((s) => ['CREATED', 'PACKED', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED_AT_HUB', 'OUT_FOR_DELIVERY'].includes(s.status));
  const activeActionableOrder = ordersAwaiting.length > 0 ? ordersAwaiting[0] : null;

  return (
    <div className="fulfillment-page space-y-6">
      {/* Header Banner */}
      <div className="card-header-flex">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Truck size={24} className="text-primary" />
            <span>Logistics Fulfillment & Physical GPS Tracking</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            End-to-end order fulfillment pipeline, physical shipment provisioning, carrier routing, and real-time STOMP telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              wsConnected
                ? 'bg-success-subtle text-success border-success'
                : 'bg-surface-raised text-muted border-border'
            }`}
          >
            <Radio size={14} className={wsConnected ? 'animate-pulse text-success' : ''} />
            <span>{wsConnected ? 'STOMP TELEMETRY LIVE' : 'CONNECTING WS...'}</span>
          </div>

          <button
            className="btn btn-primary btn-sm flex items-center gap-1.5"
            onClick={() => {
              setProvisionStep(1);
              setOrderLookupData(null);
              setProvisionForm({
                targetOrderId: '',
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
          >
            <Plus size={16} />
            <span>Provision Physical Shipment</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-danger flex items-center justify-between p-3 rounded-lg border border-danger">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-danger shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button className="btn-close" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success flex items-center justify-between p-3 rounded-lg border border-success">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-success shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
          <button className="btn-close" onClick={() => setSuccess('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* PART 3: VISIBLE PROCESS FLOW BANNER */}
      <div className="card bg-surface-raised border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Activity size={14} className="text-primary" />
            <span>FULFILLMENT PROCESS WORKFLOW</span>
          </span>
          <span className="text-2xs text-muted">Standard Operating Procedure (SOP)</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { step: '1', title: 'ORDER READY', desc: 'Paid & confirmed orders', action: 'Provision Shipment', count: awaitingFulfillmentCount, highlight: awaitingFulfillmentCount > 0 },
            { step: '2', title: 'PROVISIONED', desc: 'Shipment record created', action: 'Assign AWB & Carrier', count: createdCount, highlight: createdCount > 0 },
            { step: '3', title: 'PACKED', desc: 'Boxed & sealed in hub', action: 'Confirm Package Ready', count: packedCount, highlight: packedCount > 0 },
            { step: '4', title: 'DISPATCHED', desc: 'Left fulfillment center', action: 'Hand to Linehaul', count: shipments.filter(s => s.status === 'DISPATCHED').length },
            { step: '5', title: 'IN TRANSIT', desc: 'Expressway linehaul moving', action: 'Live GPS Telemetry', count: shipments.filter(s => s.status === 'IN_TRANSIT').length },
            { step: '6', title: 'HUB ARRIVAL', desc: 'Arrived at destination hub', action: 'Last-mile sorting', count: shipments.filter(s => s.status === 'ARRIVED_AT_HUB').length },
            { step: '7', title: 'OUT FOR DELIVERY', desc: 'Courier executive on way', action: 'Doorstep Delivery', count: outForDeliveryCount },
            { step: '8', title: 'DELIVERED', desc: 'Delivered to recipient', action: 'Completed', count: shipments.filter(s => s.status === 'DELIVERED').length }
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
                item.highlight
                  ? 'bg-primary-subtle border-primary text-primary font-semibold'
                  : 'bg-surface border-border text-body'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-2xs opacity-75">STEP {item.step}</span>
                  {item.count !== undefined && (
                    <span className="badge badge-secondary text-2xs px-1.5 py-0.2">{item.count}</span>
                  )}
                </div>
                <div className="font-bold text-xs truncate">{item.title}</div>
                <div className="text-2xs text-muted mt-0.5 leading-tight">{item.desc}</div>
              </div>
              <div className="text-2xs font-medium text-primary mt-2 pt-1 border-t border-border/50 truncate">
                {item.action}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PART 4: "WHAT SHOULD I DO NOW?" SECTION */}
      <div className="card p-4 border-l-4 border-l-primary bg-surface flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Clock size={14} />
            <span>NEXT ACTION REQUIRED</span>
          </span>

          {activeActionableOrder ? (
            <div className="mt-1">
              <span className="text-sm font-semibold">
                Order ORD-{activeActionableOrder.id} is confirmed and waiting for physical fulfillment.
              </span>
              <p className="text-xs text-muted mt-0.5">
                Recipient: <strong>{activeActionableOrder.recipient_name || activeActionableOrder.customer_name || 'Customer'}</strong> | Destination: <strong>{activeActionableOrder.city || 'Destination Hub'}</strong> | Total: <strong>₹{activeActionableOrder.total_price || activeActionableOrder.totalAmount}</strong>
              </p>
            </div>
          ) : activeActionableShipment ? (
            <div className="mt-1">
              <span className="text-sm font-semibold">
                Shipment #{activeActionableShipment.shipmentNumber || activeActionableShipment.id} is currently <strong>{activeActionableShipment.status}</strong>.
              </span>
              <p className="text-xs text-muted mt-0.5">
                Linked Order: <strong>ORD-{activeActionableShipment.orderId}</strong> | Carrier: <strong>{activeActionableShipment.carrierName}</strong> | Vehicle: <strong>{activeActionableShipment.vehicleNumber}</strong>
              </p>
            </div>
          ) : (
            <div className="mt-1 text-sm text-muted">
              All placed orders and physical shipments are up-to-date. No pending actions required.
            </div>
          )}
        </div>

        <div>
          {activeActionableOrder ? (
            <button
              className="btn btn-primary btn-sm flex items-center gap-1.5 font-bold"
              onClick={() => openProvisionForOrder(activeActionableOrder)}
            >
              <Truck size={14} />
              <span>Provision Physical Shipment</span>
            </button>
          ) : activeActionableShipment && ALLOWED_SHIPMENT_TRANSITIONS[activeActionableShipment.status]?.length > 0 ? (
            <button
              className="btn btn-primary btn-sm flex items-center gap-1.5 font-bold"
              onClick={() => handleDirectTransition(activeActionableShipment, ALLOWED_SHIPMENT_TRANSITIONS[activeActionableShipment.status][0].next)}
              disabled={transitioningId === activeActionableShipment.id}
            >
              <Check size={14} />
              <span>{ALLOWED_SHIPMENT_TRANSITIONS[activeActionableShipment.status][0].label}</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* PART 10: DASHBOARD METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="card p-3 text-center bg-surface">
          <div className="text-xs text-muted font-semibold">Total Shipments</div>
          <div className="text-xl font-bold font-mono text-primary mt-1">{totalShipments}</div>
        </div>

        <div className="card p-3 text-center bg-surface">
          <div className="text-xs text-muted font-semibold">Awaiting Fulfillment</div>
          <div className="text-xl font-bold font-mono text-warning mt-1">{awaitingFulfillmentCount}</div>
        </div>

        <div className="card p-3 text-center bg-surface">
          <div className="text-xs text-muted font-semibold">Awaiting Packing</div>
          <div className="text-xl font-bold font-mono text-body mt-1">{createdCount}</div>
        </div>

        <div className="card p-3 text-center bg-surface">
          <div className="text-xs text-muted font-semibold">Ready for Dispatch</div>
          <div className="text-xl font-bold font-mono text-body mt-1">{packedCount}</div>
        </div>

        <div className="card p-3 text-center bg-surface">
          <div className="text-xs text-muted font-semibold">Active In-Transit</div>
          <div className="text-xl font-bold font-mono text-info mt-1">{inTransitCount}</div>
        </div>

        <div className="card p-3 text-center bg-surface">
          <div className="text-xs text-muted font-semibold">Out for Delivery</div>
          <div className="text-xl font-bold font-mono text-warning mt-1">{outForDeliveryCount}</div>
        </div>

        <div className="card p-3 text-center bg-surface">
          <div className="text-xs text-muted font-semibold">Freight Containers</div>
          <div className="text-xl font-bold font-mono text-muted mt-1">{totalContainers}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-border">
        <button
          className={`tab-btn flex items-center gap-1.5 py-2.5 px-3 text-sm font-semibold border-b-2 ${
            activeTab === 'shipments' ? 'border-primary text-primary' : 'border-transparent text-muted'
          }`}
          onClick={() => setActiveTab('shipments')}
        >
          <Truck size={16} />
          <span>Physical Shipments ({shipments.length})</span>
        </button>

        <button
          className={`tab-btn flex items-center gap-1.5 py-2.5 px-3 text-sm font-semibold border-b-2 ${
            activeTab === 'awaiting' ? 'border-primary text-primary' : 'border-transparent text-muted'
          }`}
          onClick={() => {
            setActiveTab('awaiting');
            loadOrdersAwaiting();
          }}
        >
          <Package size={16} />
          <span>Orders Awaiting Fulfillment ({ordersAwaiting.length})</span>
        </button>

        <button
          className={`tab-btn flex items-center gap-1.5 py-2.5 px-3 text-sm font-semibold border-b-2 ${
            activeTab === 'containers' ? 'border-primary text-primary' : 'border-transparent text-muted'
          }`}
          onClick={() => {
            setActiveTab('containers');
            loadContainers(true);
          }}
        >
          <Box size={16} />
          <span>Freight Containers ({containers.length})</span>
        </button>
      </div>

      {/* TAB 1: Physical Shipments Table */}
      {activeTab === 'shipments' && (
        <div className="card">
          {/* Status Filter Chips */}
          <div className="p-3 border-b border-border flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-semibold text-muted mr-1">Status:</span>
            {SHIPMENT_STATUSES.map((st) => (
              <button
                key={st}
                className={`btn btn-xs ${
                  selectedStatus === st ? 'btn-primary font-bold' : 'btn-secondary'
                }`}
                onClick={() => setSelectedStatus(st)}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-12 text-center text-muted">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              <span>Loading physical shipments...</span>
            </div>
          ) : shipments.length === 0 ? (
            <div className="p-12 text-center text-muted">
              <Truck size={36} className="mx-auto mb-2 opacity-50" />
              <p className="font-semibold">No Physical Shipments Found</p>
              <p className="text-xs mt-1">Select an order from "Orders Awaiting Fulfillment" to provision a shipment.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table w-full text-xs">
                <thead>
                  <tr>
                    <th>Shipment & Order No</th>
                    <th>Carrier & Vehicle</th>
                    <th>AWB / Tracking</th>
                    <th>Destination</th>
                    <th>Status</th>
                    <th>Current GPS / Milestones</th>
                    <th>Responsible Staff Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => {
                    const allowedTransitions = ALLOWED_SHIPMENT_TRANSITIONS[s.status] || [];
                    const isInTransit = ['IN_TRANSIT', 'DISPATCHED', 'ARRIVED_AT_HUB', 'OUT_FOR_DELIVERY'].includes(s.status);

                    return (
                      <tr key={s.id} className="hover:bg-surface-raised">
                        {/* Shipment & Order No */}
                        <td>
                          <div className="font-bold font-mono text-primary flex items-center gap-1">
                            <Truck size={14} className="text-muted" />
                            <span>#{s.shipmentNumber || `SHP-${s.id}`}</span>
                          </div>
                          <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                            <Package size={12} />
                            <span>Order ORD-{s.orderId}</span>
                          </div>
                        </td>

                        {/* Carrier & Vehicle */}
                        <td>
                          <div className="font-semibold">{s.carrierName || 'EcoExpress Carbon-Neutral'}</div>
                          <div className="text-muted flex items-center gap-1 mt-0.5 font-mono">
                            <Compass size={12} />
                            <span>{s.vehicleNumber || 'KA-01-EQ-9124'}</span>
                          </div>
                        </td>

                        {/* AWB */}
                        <td className="font-mono text-muted">
                          {s.trackingNumber || 'ECO-AWB-PENDING'}
                        </td>

                        {/* Destination */}
                        <td className="max-w-xs truncate" title={s.destination}>
                          <div className="flex items-center gap-1">
                            <MapPin size={12} className="text-muted shrink-0" />
                            <span className="truncate">{s.destination || 'Customer Destination'}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <StatusBadge status={s.status} />
                        </td>

                        {/* GPS */}
                        <td>
                          {s.currentLatitude && s.currentLongitude ? (
                            <button
                              className="btn btn-secondary btn-xs flex items-center gap-1 font-mono text-success"
                              onClick={() => openShipmentTracking(s)}
                            >
                              <Navigation size={12} className="text-success" />
                              <span>{parseFloat(s.currentLatitude).toFixed(2)}, {parseFloat(s.currentLongitude).toFixed(2)}</span>
                            </button>
                          ) : isInTransit ? (
                            <button
                              className="btn btn-secondary btn-xs flex items-center gap-1 text-primary"
                              onClick={() => openGpsModal(s)}
                            >
                              <MapPin size={12} />
                              <span>Update GPS</span>
                            </button>
                          ) : (
                            <span className="text-muted text-2xs italic">GPS available in transit</span>
                          )}
                        </td>

                        {/* Responsible Actions */}
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {allowedTransitions.map((tr, trIdx) => (
                              <button
                                key={trIdx}
                                className={`btn btn-xs ${
                                  trIdx === 0 ? 'btn-primary font-bold' : 'btn-secondary'
                                }`}
                                onClick={() => handleDirectTransition(s, tr.next)}
                                disabled={transitioningId === s.id}
                              >
                                {transitioningId === s.id ? (
                                  <RefreshCw size={10} className="animate-spin" />
                                ) : (
                                  <Check size={10} />
                                )}
                                <span>{tr.label}</span>
                              </button>
                            ))}

                            <button
                              className="btn btn-secondary btn-xs"
                              onClick={() => openShipmentTracking(s)}
                              title="View Telemetry & Timeline"
                            >
                              <Eye size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Orders Awaiting Fulfillment */}
      {activeTab === 'awaiting' && (
        <div className="card">
          <div className="card-header-flex p-3 border-b border-border">
            <div>
              <h3 className="section-title text-sm flex items-center gap-2">
                <Package size={16} />
                <span>Orders Awaiting Physical Shipment Provisioning</span>
              </h3>
              <p className="text-xs text-muted">Confirmed and paid customer orders ready to be provisioned for dispatch.</p>
            </div>
            <button className="btn btn-secondary btn-xs" onClick={loadOrdersAwaiting}>
              <RefreshCw size={12} />
              <span>Refresh Orders</span>
            </button>
          </div>

          {ordersAwaiting.length === 0 ? (
            <div className="p-8 text-center text-muted text-xs">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-success" />
              <p className="font-semibold text-sm">All Orders Fulfilled</p>
              <p className="text-xs mt-1">There are currently no orders waiting for physical shipment provisioning.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table w-full text-xs">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer Name</th>
                    <th>Destination Address</th>
                    <th>Amount</th>
                    <th>Payment Status</th>
                    <th>Order Status</th>
                    <th>Shipment Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersAwaiting.map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono font-bold text-primary">ORD-{o.id}</td>
                      <td className="font-semibold">{o.recipient_name || o.customer_name || 'Customer'}</td>
                      <td className="max-w-xs truncate" title={o.shipping_address || o.shippingAddress}>
                        {[o.shipping_address || o.shippingAddress, o.city, o.state].filter(Boolean).join(', ') || 'Customer Address'}
                      </td>
                      <td className="font-mono font-semibold">₹{o.total_price || o.totalAmount}</td>
                      <td>
                        <span className="badge badge-success font-semibold">
                          {o.payment_status || 'PAID'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={o.status || o.currentStatus || 'ORDER_CONFIRMED'} />
                      </td>
                      <td>
                        <span className="badge badge-warning">NOT CREATED</span>
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-xs flex items-center gap-1 font-bold"
                          onClick={() => openProvisionForOrder(o)}
                        >
                          <Truck size={12} />
                          <span>Provision Shipment</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Freight Containers Tab */}
      {activeTab === 'containers' && (
        <div className="card">
          <div className="card-header-flex p-3 border-b border-border">
            <div>
              <h3 className="section-title text-sm flex items-center gap-2">
                <Box size={16} />
                <span>Freight Containers & Consolidated Dispatch Loads</span>
              </h3>
              <p className="text-xs text-muted">Consolidated multi-shipment logistics containers assigned to trucks.</p>
            </div>
          </div>

          {containers.length === 0 ? (
            <div className="p-8 text-center text-muted text-xs">No active freight containers provisioned.</div>
          ) : (
            <div className="table-responsive">
              <table className="table w-full text-xs">
                <thead>
                  <tr>
                    <th>Container Code</th>
                    <th>Origin Yard</th>
                    <th>Destination Terminal</th>
                    <th>Freight Route</th>
                    <th>Status</th>
                    <th>Assigned Shipments</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono font-bold text-primary">{c.containerCode}</td>
                      <td>{c.origin}</td>
                      <td>{c.destination}</td>
                      <td className="text-muted">{c.route}</td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="font-mono">{c.shipmentCount || 0} shipments</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: PROVISION PHYSICAL SHIPMENT (3-Step Modal)                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        title="PROVISION PHYSICAL LOGISTICS SHIPMENT"
        size="lg"
      >
        <form onSubmit={handleCreateShipmentSubmit} className="space-y-4">
          {/* Stepper Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border text-xs">
            <div className={`font-semibold ${provisionStep >= 1 ? 'text-primary' : 'text-muted'}`}>
              1. Select & Validate Order
            </div>
            <ChevronRight size={14} className="text-muted" />
            <div className={`font-semibold ${provisionStep >= 2 ? 'text-primary' : 'text-muted'}`}>
              2. Assign Logistics Partner
            </div>
            <ChevronRight size={14} className="text-muted" />
            <div className={`font-semibold ${provisionStep >= 3 ? 'text-primary' : 'text-muted'}`}>
              3. Review & Provision
            </div>
          </div>

          {/* STEP 1: Select Order */}
          {provisionStep === 1 && (
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label text-xs font-bold">Target Customer Order ID *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    placeholder="e.g. 41 or ORD-41"
                    value={provisionForm.targetOrderId}
                    onChange={(e) => setProvisionForm((prev) => ({ ...prev, targetOrderId: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary flex items-center gap-1 whitespace-nowrap"
                    onClick={() => handleValidateOrder()}
                    disabled={lookupLoading || !provisionForm.targetOrderId}
                  >
                    {lookupLoading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                    <span>Validate Order</span>
                  </button>
                </div>
              </div>

              {/* Order Validation Result Card */}
              {orderLookupData && (
                <div className="p-3 bg-surface-raised border border-success/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-success font-semibold text-xs">
                    <CheckCircle2 size={16} />
                    <span>✓ Order ORD-{orderLookupData.id} found and verified</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted">Customer:</span>{' '}
                      <strong>{orderLookupData.recipient_name || orderLookupData.customer_name || 'Customer'}</strong>
                    </div>
                    <div>
                      <span className="text-muted">Payment:</span>{' '}
                      <span className="badge badge-success text-2xs">PAID / CONFIRMED</span>
                    </div>
                  </div>

                  {/* Authoritative Read-Only Address loaded from order */}
                  <div className="mt-2 pt-2 border-t border-border">
                    <label className="text-2xs font-bold uppercase text-muted block mb-1">
                      Authoritative Destination Delivery Address (Loaded from Customer Order)
                    </label>
                    <div className="p-2 bg-surface rounded border border-border text-xs font-mono text-body">
                      {provisionForm.destination || 'Customer Address verified in database'}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  className="btn btn-primary flex items-center gap-1.5"
                  disabled={!orderLookupData}
                  onClick={() => setProvisionStep(2)}
                >
                  <span>Continue to Logistics Assignment</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Assign Logistics Partner */}
          {provisionStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs font-bold">Carrier Logistics Partner *</label>
                  <select
                    className="input text-xs"
                    value={provisionForm.carrierName}
                    onChange={(e) => setProvisionForm((prev) => ({ ...prev, carrierName: e.target.value }))}
                  >
                    {CARRIER_OPTIONS.map((c, idx) => (
                      <option key={idx} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label text-xs font-bold">Tracking / AWB Number</label>
                  <input
                    type="text"
                    className="input font-mono text-xs"
                    value={provisionForm.trackingNumber}
                    onChange={(e) => setProvisionForm((prev) => ({ ...prev, trackingNumber: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label text-xs font-bold">Vehicle / Truck Plate</label>
                  <input
                    type="text"
                    className="input font-mono text-xs"
                    value={provisionForm.vehicleNumber}
                    onChange={(e) => setProvisionForm((prev) => ({ ...prev, vehicleNumber: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label text-xs font-bold">Origin Dispatch Yard</label>
                  <input
                    type="text"
                    className="input text-xs"
                    value={provisionForm.origin}
                    onChange={(e) => setProvisionForm((prev) => ({ ...prev, origin: e.target.value }))}
                  />
                </div>

                <div className="form-group md:col-span-2">
                  <label className="form-label text-xs font-bold">Freight Expressway Corridor</label>
                  <input
                    type="text"
                    className="input text-xs"
                    value={provisionForm.route}
                    onChange={(e) => setProvisionForm((prev) => ({ ...prev, route: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setProvisionStep(1)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary flex items-center gap-1.5"
                  onClick={() => setProvisionStep(3)}
                >
                  <span>Review & Provision</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Submit */}
          {provisionStep === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-surface-raised border border-border rounded-lg space-y-2 text-xs">
                <div className="font-bold text-sm text-primary mb-2">Physical Shipment Review Summary</div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted">Target Order:</span> <strong>ORD-{provisionForm.targetOrderId}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Initial Status:</span> <span className="badge badge-success">CREATED</span>
                  </div>
                  <div>
                    <span className="text-muted">Carrier Partner:</span> <strong>{provisionForm.carrierName}</strong>
                  </div>
                  <div>
                    <span className="text-muted">AWB Number:</span> <strong className="font-mono">{provisionForm.trackingNumber}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Vehicle Number:</span> <strong className="font-mono">{provisionForm.vehicleNumber}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Origin Yard:</span> <strong>{provisionForm.origin}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <span className="text-muted block text-2xs uppercase font-bold">Destination Delivery Address:</span>
                  <p className="font-mono text-xs mt-0.5">{provisionForm.destination}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setProvisionStep(2)}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex items-center gap-2 font-bold"
                  disabled={provisioning}
                >
                  {provisioning ? <RefreshCw size={14} className="animate-spin" /> : <Truck size={14} />}
                  <span>{provisioning ? 'Provisioning Shipment...' : 'CREATE PHYSICAL SHIPMENT'}</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: GPS Telemetry & Tracking Timeline                                */}
      {/* ========================================================================= */}
      {showTrackingModal && selectedShipment && (
        <Modal
          isOpen={showTrackingModal}
          onClose={() => setShowTrackingModal(false)}
          title={`LIVE GPS TELEMETRY & TRACKING: #${selectedShipment.shipmentNumber || selectedShipment.id}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Telemetry Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-surface-raised rounded-lg border border-border">
              <div>
                <span className="text-muted block">Status:</span>
                <StatusBadge status={selectedShipment.status} />
              </div>
              <div>
                <span className="text-muted block">Vehicle Plate:</span>
                <strong className="font-mono">{selectedShipment.vehicleNumber || 'KA-01-EQ-9124'}</strong>
              </div>
              <div>
                <span className="text-muted block">Carrier:</span>
                <strong>{selectedShipment.carrierName}</strong>
              </div>
              <div>
                <span className="text-muted block">AWB:</span>
                <strong className="font-mono">{selectedShipment.trackingNumber}</strong>
              </div>
            </div>

            {/* Coordinates / Map Preview */}
            <div className="p-4 bg-surface rounded-lg border border-border text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-primary font-bold">
                <Navigation size={18} />
                <span>Current Coordinates: {selectedShipment.currentLatitude || '12.9716'}, {selectedShipment.currentLongitude || '77.5946'}</span>
              </div>
              <p className="text-2xs text-muted">
                Route: {selectedShipment.origin} → {selectedShipment.destination}
              </p>
            </div>

            {/* Milestone Timeline */}
            <div>
              <h4 className="font-bold text-xs uppercase text-muted mb-2">Historical Milestone Events</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {shipmentTrackingHistory.length === 0 ? (
                  <div className="text-muted text-center py-4">No milestone events recorded yet.</div>
                ) : (
                  shipmentTrackingHistory.map((ev, idx) => (
                    <div key={idx} className="p-2 bg-surface-raised rounded border border-border flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary">{ev.status}</span>
                          <span className="text-2xs text-muted font-mono">{ev.timestamp}</span>
                        </div>
                        <p className="text-2xs text-muted mt-0.5">{ev.description || ev.locationName}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button className="btn btn-secondary" onClick={() => setShowTrackingModal(false)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Update GPS Telemetry                                             */}
      {/* ========================================================================= */}
      {showGpsModal && (
        <Modal
          isOpen={showGpsModal}
          onClose={() => setShowGpsModal(false)}
          title="LOG PHYSICAL GPS TELEMETRY"
          size="md"
        >
          <form onSubmit={handleGpsSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="form-group">
                <label className="form-label font-bold">Latitude *</label>
                <input
                  type="text"
                  className="input font-mono"
                  value={gpsForm.latitude}
                  onChange={(e) => setGpsForm((p) => ({ ...p, latitude: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label font-bold">Longitude *</label>
                <input
                  type="text"
                  className="input font-mono"
                  value={gpsForm.longitude}
                  onChange={(e) => setGpsForm((p) => ({ ...p, longitude: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label font-bold">Location Milestone Name</label>
              <input
                type="text"
                className="input"
                value={gpsForm.locationName}
                onChange={(e) => setGpsForm((p) => ({ ...p, locationName: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label font-bold">Telemetry Note</label>
              <textarea
                className="input"
                rows={2}
                value={gpsForm.note}
                onChange={(e) => setGpsForm((p) => ({ ...p, note: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button type="button" className="btn btn-secondary" onClick={() => setShowGpsModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary font-bold" disabled={gpsUpdating}>
                {gpsUpdating ? 'Logging...' : 'Save GPS Telemetry'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default FulfillmentPage;
