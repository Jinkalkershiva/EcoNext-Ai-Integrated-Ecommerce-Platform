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
  Share2,
  Compass,
  ArrowRight,
  ShieldCheck,
  Check,
  Activity
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

const CONTAINER_STATUSES = [
  'ALL',
  'CREATED',
  'PACKED',
  'DISPATCHED',
  'IN_TRANSIT',
  'ARRIVED_AT_HUB',
  'CLOSED'
];

const ALLOWED_SHIPMENT_TRANSITIONS = {
  CREATED: ['PACKED', 'CANCELLED'],
  PACKED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED_AT_HUB', 'OUT_FOR_DELIVERY', 'FAILED_DELIVERY', 'CANCELLED'],
  ARRIVED_AT_HUB: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_DELIVERY', 'CANCELLED'],
  FAILED_DELIVERY: ['OUT_FOR_DELIVERY', 'RETURNED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: []
};

const ALLOWED_CONTAINER_TRANSITIONS = {
  CREATED: ['PACKED', 'CLOSED'],
  PACKED: ['DISPATCHED', 'CLOSED'],
  DISPATCHED: ['IN_TRANSIT', 'CLOSED'],
  IN_TRANSIT: ['ARRIVED_AT_HUB', 'CLOSED'],
  ARRIVED_AT_HUB: ['IN_TRANSIT', 'CLOSED'],
  CLOSED: []
};

const CARRIERS = [
  'EcoExpress Carbon-Neutral (Default)',
  'BlueDart Express Surface',
  'Delhivery Logistics',
  'Shadowfax Hyperlocal',
  'DTDC Express'
];

export const FulfillmentPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';

  const { hasPermission, isAdmin } = useAuth();
  const canUpdate = isAdmin() || hasPermission('ORDER_STATUS_UPDATE') || hasPermission('ORDER_PROCESS');

  const [activeTab, setActiveTab] = useState('shipments'); // 'shipments' | 'containers'
  const [shipments, setShipments] = useState([]);
  const [containers, setContainers] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(initialOrderId ? `ORD-${initialOrderId}` : '');
  const [orderIdFilter, setOrderIdFilter] = useState(initialOrderId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // WebSocket Live Stomp State
  const [wsConnected, setWsConnected] = useState(false);
  const stompClientRef = useRef(null);

  // Modals & Active Selections
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [shipmentTrackingHistory, setShipmentTrackingHistory] = useState([]);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState({ id: null, type: 'shipment', current: '', next: '' });
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [showGpsModal, setShowGpsModal] = useState(false);
  const [gpsForm, setGpsForm] = useState({
    id: null,
    type: 'shipment',
    latitude: '',
    longitude: '',
    locationName: '',
    note: ''
  });
  const [gpsUpdating, setGpsUpdating] = useState(false);

  const [showCreateShipmentModal, setShowCreateShipmentModal] = useState(false);
  const [createShipmentForm, setCreateShipmentForm] = useState({
    orderId: '',
    carrierName: 'EcoExpress Carbon-Neutral (Default)',
    trackingNumber: '',
    vehicleNumber: '',
    origin: 'Bengaluru Central Fulfillment Hub',
    destination: '',
    route: 'BLR-HYD-DEL Expressway Corridor',
    estimatedDeliveryDays: 3,
    itemIds: []
  });
  const [orderLookupData, setOrderLookupData] = useState(null);
  const [creatingShipment, setCreatingShipment] = useState(false);

  const [showCreateContainerModal, setShowCreateContainerModal] = useState(false);
  const [createContainerForm, setCreateContainerForm] = useState({
    containerCode: '',
    origin: 'Bengaluru Logistics Yard',
    destination: 'Mumbai Inland Terminal',
    route: 'National Highway 48 Freight Route',
    initialLatitude: '12.9716',
    initialLongitude: '77.5946'
  });
  const [creatingContainer, setCreatingContainer] = useState(false);

  // 1. Fetch Shipments
  const loadShipments = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const data = await fulfillmentApi.searchShipments({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: searchQuery || undefined,
        orderId: orderIdFilter ? Number(orderIdFilter) : undefined,
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
  }, [selectedStatus, searchQuery, orderIdFilter]);

  // 2. Fetch Containers
  const loadContainers = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const data = await fulfillmentApi.searchContainers({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: searchQuery || undefined,
        page: 0,
        size: 100
      });
      const list = data?.content || (Array.isArray(data) ? data : []);
      setContainers(list);
    } catch (err) {
      if (showSpinner) setError(err.message || 'Failed to load containers');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [selectedStatus, searchQuery]);

  // Handle Tab Switch
  useEffect(() => {
    setSelectedStatus('ALL');
    if (activeTab === 'shipments') {
      loadShipments(true);
    } else {
      loadContainers(true);
    }
  }, [activeTab, loadShipments, loadContainers]);

  // STOMP WebSocket Connection & Live Telemetry Subscriptions
  useEffect(() => {
    const client = createTrackingClient();
    stompClientRef.current = client;

    client.onConnect(() => {
      setWsConnected(true);
      // Global broadcast topics if applicable
    });

    client.onDisconnect(() => {
      setWsConnected(false);
    });

    client.connect();

    return () => {
      client.disconnect();
    };
  }, []);

  // Subscribe to specific shipment topic when tracking modal is open
  useEffect(() => {
    if (!showTrackingModal || !selectedShipment?.id || !stompClientRef.current) return;

    const sub = stompClientRef.current.subscribe(
      `/topic/shipments/${selectedShipment.id}`,
      (event) => {
        // Live GPS / Status Event Received
        if (event.status || event.currentLatitude || event.latitude) {
          setSelectedShipment((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: event.status || prev.status,
              currentLatitude: event.latitude || event.currentLatitude || prev.currentLatitude,
              currentLongitude: event.longitude || event.currentLongitude || prev.currentLongitude,
              lastLocationUpdate: event.timestamp || new Date().toISOString()
            };
          });

          // Prepend event to tracking history
          setShipmentTrackingHistory((prev) => [
            {
              id: Date.now(),
              shipmentId: selectedShipment.id,
              status: event.status || selectedShipment.status,
              latitude: event.latitude || event.currentLatitude,
              longitude: event.longitude || event.currentLongitude,
              locationName: event.locationName || 'Live GPS Telemetry Ping',
              description: event.description || event.note || 'Real-time telemetry event received via STOMP broker',
              timestamp: event.timestamp || new Date().toISOString()
            },
            ...prev
          ]);

          // Update main shipments table entry silently
          setShipments((prevList) =>
            prevList.map((s) =>
              s.id === selectedShipment.id
                ? {
                    ...s,
                    status: event.status || s.status,
                    currentLatitude: event.latitude || event.currentLatitude || s.currentLatitude,
                    currentLongitude: event.longitude || event.currentLongitude || s.currentLongitude,
                    lastLocationUpdate: event.timestamp || new Date().toISOString()
                  }
                : s
            )
          );
        }
      }
    );

    return () => {
      sub.unsubscribe();
    };
  }, [showTrackingModal, selectedShipment?.id]);

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

  // Open Status Transition Modal
  const openStatusModal = (item, type = 'shipment') => {
    const allowed = type === 'shipment'
      ? (ALLOWED_SHIPMENT_TRANSITIONS[item.status] || [])
      : (ALLOWED_CONTAINER_TRANSITIONS[item.status] || []);

    setStatusTarget({
      id: item.id,
      type,
      current: item.status,
      next: allowed.length > 0 ? allowed[0] : ''
    });
    setShowStatusModal(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusTarget.id || !statusTarget.next) return;

    setStatusUpdating(true);
    setError('');
    setSuccess('');
    try {
      if (statusTarget.type === 'shipment') {
        const updated = await fulfillmentApi.updateShipmentStatus(statusTarget.id, statusTarget.next);
        setSuccess(`Shipment #${statusTarget.id} status updated to ${statusTarget.next}.`);
        if (selectedShipment && selectedShipment.id === statusTarget.id) {
          setSelectedShipment(updated);
        }
        loadShipments(false);
      } else {
        const updated = await fulfillmentApi.updateContainerStatus(statusTarget.id, statusTarget.next);
        setSuccess(`Container #${statusTarget.id} status updated to ${statusTarget.next}.`);
        loadContainers(false);
      }
      setShowStatusModal(false);
    } catch (err) {
      setError(err.message || 'Failed to update status transition');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Open GPS Update Modal
  const openGpsModal = (item, type = 'shipment') => {
    setGpsForm({
      id: item.id,
      type,
      latitude: item.currentLatitude ? String(item.currentLatitude) : '12.9716',
      longitude: item.currentLongitude ? String(item.currentLongitude) : '77.5946',
      locationName: item.destination ? `En route to ${item.destination}` : 'Highway Checkpoint',
      note: 'Routine GPS telemetry update logged by logistics operations'
    });
    setShowGpsModal(true);
  };

  const handleGpsSubmit = async (e) => {
    e.preventDefault();
    if (!gpsForm.id || !gpsForm.latitude || !gpsForm.longitude) return;

    setGpsUpdating(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        latitude: parseFloat(gpsForm.latitude),
        longitude: parseFloat(gpsForm.longitude),
        locationName: gpsForm.locationName,
        note: gpsForm.note
      };

      if (gpsForm.type === 'shipment') {
        const updated = await fulfillmentApi.updateShipmentLocation(gpsForm.id, payload);
        setSuccess(`Shipment #${gpsForm.id} GPS telemetry updated (${payload.latitude}, ${payload.longitude}).`);
        if (selectedShipment && selectedShipment.id === gpsForm.id) {
          setSelectedShipment(updated);
        }
        loadShipments(false);
      } else {
        const updated = await fulfillmentApi.updateContainerLocation(gpsForm.id, payload);
        setSuccess(`Container #${gpsForm.id} GPS coordinates updated.`);
        loadContainers(false);
      }
      setShowGpsModal(false);
    } catch (err) {
      setError(err.message || 'Failed to update GPS telemetry');
    } finally {
      setGpsUpdating(false);
    }
  };

  // Order Lookup for Creating Shipment
  const handleOrderLookup = async (orderId) => {
    if (!orderId) return;
    try {
      const res = await orderOpsApi.getOrderById(orderId);
      const o = res?.order || res?.data || res;
      if (o) {
        setOrderLookupData(o);
        setCreateShipmentForm((prev) => ({
          ...prev,
          orderId: String(o.id),
          destination: `${o.city || ''}, ${o.state || ''} ${o.zipcode || ''}`.trim() || 'Customer Delivery Address',
          trackingNumber: `ECO-AWB-${o.id + 100000}`,
          vehicleNumber: `KA-01-EQ-${Math.floor(1000 + Math.random() * 9000)}`,
          itemIds: o.items ? o.items.map((it) => it.id) : []
        }));
      }
    } catch (err) {
      setError('Order not found for allocation: ' + err.message);
    }
  };

  const handleCreateShipmentSubmit = async (e) => {
    e.preventDefault();
    if (!createShipmentForm.orderId) return;

    setCreatingShipment(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        orderId: parseInt(createShipmentForm.orderId, 10),
        carrierName: createShipmentForm.carrierName,
        trackingNumber: createShipmentForm.trackingNumber,
        vehicleNumber: createShipmentForm.vehicleNumber,
        origin: createShipmentForm.origin,
        destination: createShipmentForm.destination,
        route: createShipmentForm.route,
        estimatedDeliveryDays: parseInt(createShipmentForm.estimatedDeliveryDays, 10) || 3,
        itemIds: createShipmentForm.itemIds.length > 0 ? createShipmentForm.itemIds : undefined
      };

      const created = await fulfillmentApi.createShipment(payload);
      setSuccess(`Shipment #${created.shipmentNumber || created.id} successfully created and dispatched.`);
      setShowCreateShipmentModal(false);
      loadShipments(false);
    } catch (err) {
      setError(err.message || 'Failed to create shipment');
    } finally {
      setCreatingShipment(false);
    }
  };

  const handleCreateContainerSubmit = async (e) => {
    e.preventDefault();
    setCreatingContainer(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        containerCode: createContainerForm.containerCode || `CONT-ECO-${Math.floor(1000 + Math.random() * 9000)}`,
        origin: createContainerForm.origin,
        destination: createContainerForm.destination,
        route: createContainerForm.route,
        initialLatitude: parseFloat(createContainerForm.initialLatitude),
        initialLongitude: parseFloat(createContainerForm.initialLongitude)
      };

      const created = await fulfillmentApi.createContainer(payload);
      setSuccess(`Container [${created.containerCode}] provisioned successfully.`);
      setShowCreateContainerModal(false);
      loadContainers(false);
    } catch (err) {
      setError(err.message || 'Failed to provision container');
    } finally {
      setCreatingContainer(false);
    }
  };

  // Metrics Counters
  const totalShipments = shipments.length;
  const inTransitCount = shipments.filter((s) => ['IN_TRANSIT', 'DISPATCHED', 'ARRIVED_AT_HUB'].includes(s.status)).length;
  const outForDeliveryCount = shipments.filter((s) => s.status === 'OUT_FOR_DELIVERY').length;
  const totalContainers = containers.length;

  // Shipment Table Columns
  const shipmentColumns = [
    {
      header: 'Shipment & Order No',
      key: 'shipmentNumber',
      render: (row) => (
        <div>
          <div className="font-bold mono-text text-primary flex items-center gap-1">
            <Truck size={14} className="text-muted" />
            <span>#{row.shipmentNumber || `SHP-${row.id}`}</span>
          </div>
          <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
            <Package size={12} />
            <span>Order #{row.orderId}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Carrier & Vehicle',
      key: 'carrierName',
      render: (row) => (
        <div>
          <div className="font-medium text-sm">{row.carrierName || 'EcoExpress Direct'}</div>
          <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
            <Compass size={12} />
            <span className="mono-text font-semibold">{row.vehicleNumber || 'Standard Carrier Fleet'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Logistics Route',
      key: 'origin',
      render: (row) => (
        <div className="text-xs">
          <div className="flex items-center gap-1 font-medium">
            <MapPin size={12} className="text-muted" />
            <span>{row.origin || 'Fulfillment Hub'}</span>
            <ArrowRight size={11} className="text-muted" />
            <span>{row.destination || 'Customer Address'}</span>
          </div>
          {row.route && <div className="text-[11px] text-muted italic mt-0.5">{row.route}</div>}
        </div>
      )
    },
    {
      header: 'Fulfillment Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Live GPS Telemetry',
      key: 'currentLatitude',
      render: (row) => {
        const hasGps = row.currentLatitude && row.currentLongitude;
        return hasGps ? (
          <div>
            <div className="flex items-center gap-1.5 mono-text text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>{Number(row.currentLatitude).toFixed(4)}°, {Number(row.currentLongitude).toFixed(4)}°</span>
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              {row.lastLocationUpdate ? new Date(row.lastLocationUpdate).toLocaleTimeString() : 'Recent'}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted italic flex items-center gap-1">
            <Navigation size={12} />
            <span>GPS Pending Dispatch</span>
          </span>
        );
      }
    },
    {
      header: 'Est. Delivery',
      key: 'estimatedDelivery',
      render: (row) => (
        <div className="text-xs text-muted flex items-center gap-1">
          <Calendar size={12} />
          <span>{row.estimatedDelivery ? new Date(row.estimatedDelivery).toLocaleDateString() : '3-5 Days'}</span>
        </div>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => {
        const allowed = ALLOWED_SHIPMENT_TRANSITIONS[row.status] || [];
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              className="btn btn-secondary btn-xs flex items-center gap-1"
              onClick={() => openShipmentTracking(row)}
              title="Inspect live telemetry & items"
            >
              <Eye size={12} />
              <span>Track</span>
            </button>

            {canUpdate && allowed.length > 0 && (
              <button
                className="btn btn-primary btn-xs flex items-center gap-1 text-white"
                onClick={() => openStatusModal(row, 'shipment')}
                title="Transition status"
              >
                <Send size={11} />
                <span>Status</span>
              </button>
            )}

            {canUpdate && (
              <button
                className="btn btn-secondary btn-xs flex items-center gap-1"
                onClick={() => openGpsModal(row, 'shipment')}
                title="Update physical GPS coordinates"
              >
                <Navigation size={11} className="text-emerald-500" />
                <span>GPS</span>
              </button>
            )}
          </div>
        );
      }
    }
  ];

  // Container Table Columns
  const containerColumns = [
    {
      header: 'Container Code',
      key: 'containerCode',
      render: (row) => (
        <div className="font-bold mono-text text-primary flex items-center gap-1.5">
          <Box size={14} className="text-muted" />
          <span>{row.containerCode}</span>
        </div>
      )
    },
    {
      header: 'Operational Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Corridor & Route',
      key: 'origin',
      render: (row) => (
        <div className="text-xs">
          <div className="flex items-center gap-1 font-medium">
            <span>{row.origin}</span>
            <ArrowRight size={11} className="text-muted" />
            <span>{row.destination}</span>
          </div>
          {row.route && <div className="text-[11px] text-muted italic mt-0.5">{row.route}</div>}
        </div>
      )
    },
    {
      header: 'Allocated Loads',
      key: 'shipmentCount',
      render: (row) => (
        <span className="badge badge-neutral badge-sm font-mono">
          {row.shipmentCount || 0} shipment{row.shipmentCount === 1 ? '' : 's'}
        </span>
      )
    },
    {
      header: 'Telemetry Coordinates',
      key: 'currentLatitude',
      render: (row) => (
        <div className="mono-text text-xs text-muted flex items-center gap-1">
          <Navigation size={12} className="text-emerald-500" />
          <span>{row.currentLatitude ? `${Number(row.currentLatitude).toFixed(4)}°, ${Number(row.currentLongitude).toFixed(4)}°` : 'Stationary Yard'}</span>
        </div>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => {
        const allowed = ALLOWED_CONTAINER_TRANSITIONS[row.status] || [];
        return (
          <div className="flex items-center gap-1.5">
            {canUpdate && allowed.length > 0 && (
              <button
                className="btn btn-primary btn-xs flex items-center gap-1 text-white"
                onClick={() => openStatusModal(row, 'container')}
              >
                <Send size={11} />
                <span>Status</span>
              </button>
            )}
            {canUpdate && (
              <button
                className="btn btn-secondary btn-xs flex items-center gap-1"
                onClick={() => openGpsModal(row, 'container')}
              >
                <Navigation size={11} className="text-emerald-500" />
                <span>GPS</span>
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="fulfillment-page space-y-4">
      {/* Alert Banners */}
      {error && (
        <div className="alert alert-danger flex items-center justify-between">
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
        <div className="alert alert-success flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-success flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button className="btn-close" onClick={() => setSuccess('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header & Live STOMP Indicator */}
      <div className="page-header-flex">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <Truck size={24} className="text-primary" />
            <span>Logistics Fulfillment & Physical GPS Tracking</span>
          </h2>
          <p className="page-subtitle">
            Manage physical freight loads, multi-shipment dispatch, GPS coordinates, and real-time STOMP telemetry.
          </p>
        </div>
        <div className="header-actions flex items-center gap-2">
          <div className={`badge ${wsConnected ? 'badge-success' : 'badge-warning'} badge-sm flex items-center gap-1.5`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span>{wsConnected ? 'STOMP Telemetry Live' : 'Connecting STOMP...'}</span>
          </div>
          {canUpdate && (
            <>
              <button
                className="btn btn-primary btn-sm flex items-center gap-1.5 text-white"
                onClick={() => {
                  setOrderLookupData(null);
                  setShowCreateShipmentModal(true);
                }}
              >
                <Plus size={14} />
                <span>New Shipment</span>
              </button>
              <button
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                onClick={() => setShowCreateContainerModal(true)}
              >
                <Box size={14} />
                <span>New Container</span>
              </button>
            </>
          )}
          <button
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            onClick={() => (activeTab === 'shipments' ? loadShipments(true) : loadContainers(true))}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Truck size={20} />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Total Shipments</div>
            <div className="text-xl font-bold">{totalShipments}</div>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Navigation size={20} />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Active In-Transit</div>
            <div className="text-xl font-bold">{inTransitCount}</div>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Package size={20} />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Out for Delivery</div>
            <div className="text-xl font-bold">{outForDeliveryCount}</div>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Box size={20} />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Logistics Containers</div>
            <div className="text-xl font-bold">{totalContainers}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Shipments vs Containers) */}
      <div className="card p-2">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 mb-3">
          <button
            type="button"
            className={`btn btn-sm flex items-center gap-1.5 ${activeTab === 'shipments' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('shipments')}
          >
            <Truck size={15} />
            <span>Physical Shipments</span>
            <span className="badge badge-neutral badge-xs ml-1">{shipments.length}</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm flex items-center gap-1.5 ${activeTab === 'containers' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('containers')}
          >
            <Box size={15} />
            <span>Freight Containers</span>
            <span className="badge badge-neutral badge-xs ml-1">{containers.length}</span>
          </button>
        </div>

        {/* Sub-Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {(activeTab === 'shipments' ? SHIPMENT_STATUSES : CONTAINER_STATUSES).map((st) => (
              <button
                key={st}
                type="button"
                className={`btn btn-xs ${selectedStatus === st ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedStatus(st)}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {orderIdFilter && (
              <button
                type="button"
                className="btn btn-secondary btn-xs flex items-center gap-1"
                onClick={() => {
                  setOrderIdFilter('');
                  setSearchParams({});
                }}
              >
                <X size={12} />
                <span>Clear Order #{orderIdFilter} Filter</span>
              </button>
            )}
            <div className="search-input-wrapper relative min-w-[220px]">
              <input
                type="text"
                className="input input-sm pl-8 w-full"
                placeholder={activeTab === 'shipments' ? 'Search by AWB, vehicle, carrier...' : 'Search containers...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={14} className="text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card">
        {activeTab === 'shipments' ? (
          <DataTable
            columns={shipmentColumns}
            data={shipments}
            loading={loading}
            searchPlaceholder="Filter loaded shipments..."
          />
        ) : (
          <DataTable
            columns={containerColumns}
            data={containers}
            loading={loading}
            searchPlaceholder="Filter loaded containers..."
          />
        )}
      </div>

      {/* 1. Shipment Detailed Tracking Modal (Live STOMP) */}
      <Modal
        isOpen={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
        title={`Shipment Telemetry: #${selectedShipment?.shipmentNumber || selectedShipment?.id}`}
        maxWidth="840px"
      >
        {selectedShipment && (
          <div className="space-y-4">
            {/* Live GPS Telemetry Card */}
            <div className="p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Activity size={15} />
                  <span>Real-Time GPS Telemetry & Physical Status</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <StatusBadge status={selectedShipment.status} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)]">
                  <div className="text-xs text-muted">Current GPS Position</div>
                  <div className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedShipment.currentLatitude && selectedShipment.currentLongitude
                      ? `${Number(selectedShipment.currentLatitude).toFixed(4)}°, ${Number(selectedShipment.currentLongitude).toFixed(4)}°`
                      : 'Stationary at Dispatch Origin'}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)]">
                  <div className="text-xs text-muted">Assigned Physical Vehicle</div>
                  <div className="font-mono text-sm font-bold mt-0.5">
                    {selectedShipment.vehicleNumber || 'Carrier Standard Vehicle'}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)]">
                  <div className="text-xs text-muted">Carrier & Tracking AWB</div>
                  <div className="text-sm font-semibold mt-0.5 flex items-center gap-1">
                    <span>{selectedShipment.carrierName || 'EcoExpress'}</span>
                    <span className="mono-text font-bold text-xs text-muted">({selectedShipment.trackingNumber})</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-muted">
                <div>
                  Origin: <span className="font-medium text-foreground">{selectedShipment.origin}</span> → Destination: <span className="font-medium text-foreground">{selectedShipment.destination}</span>
                </div>
                <div>
                  Last Ping: {selectedShipment.lastLocationUpdate ? new Date(selectedShipment.lastLocationUpdate).toLocaleString() : 'Recent'}
                </div>
              </div>
            </div>

            {/* Allocated Order Items */}
            <div className="p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                <Package size={13} className="text-primary" />
                <span>Allocated Order Items ({selectedShipment.items?.length || 0})</span>
              </div>
              <div className="table-responsive border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                <table className="data-table text-xs">
                  <thead>
                    <tr>
                      <th>Product Item</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedShipment.items && selectedShipment.items.length > 0 ? (
                      selectedShipment.items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td>
                            <div className="font-medium">{it.productName || `Item #${it.orderItemId}`}</div>
                            {it.sku && <div className="text-[11px] text-muted font-mono">{it.sku}</div>}
                          </td>
                          <td className="font-mono">{it.quantity}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="text-center py-2.5 text-muted">
                          All items under Order #{selectedShipment.orderId}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Historical Tracking Timeline */}
            <div className="p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-primary" />
                <span>Telemetry Audit & Location Event Stream</span>
              </div>

              <div className="space-y-3">
                {shipmentTrackingHistory.length === 0 ? (
                  <p className="text-xs text-muted italic">No historical location milestones recorded yet.</p>
                ) : (
                  shipmentTrackingHistory.map((ev, idx) => (
                    <div key={ev.id || idx} className="flex items-start gap-3 text-xs">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary">{ev.locationName || ev.status}</span>
                          <span className="text-muted text-[11px]">{ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}</span>
                        </div>
                        {ev.latitude && ev.longitude && (
                          <div className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {Number(ev.latitude).toFixed(4)}° N, {Number(ev.longitude).toFixed(4)}° E
                          </div>
                        )}
                        {ev.description && (
                          <div className="text-[11px] text-muted mt-0.5 bg-[var(--surface)] p-1.5 rounded">
                            {ev.description}
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

      {/* 2. Status Transition Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={`Update ${statusTarget.type === 'shipment' ? 'Shipment' : 'Container'} Status: #${statusTarget.id}`}
        maxWidth="500px"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label text-xs font-semibold">Current State</label>
            <div className="mt-1">
              <StatusBadge status={statusTarget.current} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Select Next Transition State *</label>
            <select
              className="input input-sm w-full"
              value={statusTarget.next}
              onChange={(e) => setStatusTarget({ ...statusTarget, next: e.target.value })}
              required
            >
              {(statusTarget.type === 'shipment'
                ? (ALLOWED_SHIPMENT_TRANSITIONS[statusTarget.current] || [])
                : (ALLOWED_CONTAINER_TRANSITIONS[statusTarget.current] || [])
              ).map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowStatusModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm flex items-center gap-1.5 text-white"
              disabled={statusUpdating || !statusTarget.next}
            >
              {statusUpdating ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
              <span>{statusUpdating ? 'Publishing Event...' : 'Confirm Transition'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. GPS Location Update Modal */}
      <Modal
        isOpen={showGpsModal}
        onClose={() => setShowGpsModal(false)}
        title={`Inject GPS Telemetry: ${gpsForm.type === 'shipment' ? 'Shipment' : 'Container'} #${gpsForm.id}`}
        maxWidth="540px"
      >
        <form onSubmit={handleGpsSubmit} className="space-y-3">
          <p className="text-xs text-muted">
            Submitting coordinates updates physical telemetry, pushes a Kafka event, and broadcasts to live WebSocket STOMP subscribers.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Latitude (°N) *</label>
              <input
                type="number"
                step="any"
                className="input input-sm font-mono w-full"
                value={gpsForm.latitude}
                onChange={(e) => setGpsForm({ ...gpsForm, latitude: e.target.value })}
                placeholder="e.g. 12.9716"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Longitude (°E) *</label>
              <input
                type="number"
                step="any"
                className="input input-sm font-mono w-full"
                value={gpsForm.longitude}
                onChange={(e) => setGpsForm({ ...gpsForm, longitude: e.target.value })}
                placeholder="e.g. 77.5946"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Location / Milestone Name</label>
            <input
              type="text"
              className="input input-sm w-full"
              value={gpsForm.locationName}
              onChange={(e) => setGpsForm({ ...gpsForm, locationName: e.target.value })}
              placeholder="e.g. Toll Plaza Kilometer 42, NH-48"
            />
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Operational Telemetry Note</label>
            <input
              type="text"
              className="input input-sm w-full"
              value={gpsForm.note}
              onChange={(e) => setGpsForm({ ...gpsForm, note: e.target.value })}
              placeholder="e.g. Vehicle moving at 65 km/h on schedule"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowGpsModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm flex items-center gap-1.5 text-white"
              disabled={gpsUpdating}
            >
              {gpsUpdating ? <RefreshCw size={13} className="animate-spin" /> : <Navigation size={13} />}
              <span>{gpsUpdating ? 'Broadcasting Ping...' : 'Transmit GPS Ping'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. Create Shipment Modal */}
      <Modal
        isOpen={showCreateShipmentModal}
        onClose={() => setShowCreateShipmentModal(false)}
        title="Provision Physical Freight Shipment"
        maxWidth="640px"
      >
        <form onSubmit={handleCreateShipmentSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Target Order ID *</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="input input-sm w-full"
                  value={createShipmentForm.orderId}
                  onChange={(e) => {
                    setCreateShipmentForm({ ...createShipmentForm, orderId: e.target.value });
                    if (e.target.value) handleOrderLookup(e.target.value);
                  }}
                  placeholder="e.g. 1"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Carrier Logistics Partner</label>
              <select
                className="input input-sm w-full"
                value={createShipmentForm.carrierName}
                onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, carrierName: e.target.value })}
              >
                {CARRIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Tracking / AWB Number</label>
              <input
                type="text"
                className="input input-sm mono-text w-full"
                value={createShipmentForm.trackingNumber}
                onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, trackingNumber: e.target.value })}
                placeholder="e.g. ECO-AWB-91823"
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Vehicle / Truck Plate</label>
              <input
                type="text"
                className="input input-sm mono-text w-full"
                value={createShipmentForm.vehicleNumber}
                onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, vehicleNumber: e.target.value })}
                placeholder="e.g. KA-01-EQ-9812"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Origin Dispatch Yard</label>
              <input
                type="text"
                className="input input-sm w-full"
                value={createShipmentForm.origin}
                onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, origin: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Destination Address</label>
              <input
                type="text"
                className="input input-sm w-full"
                value={createShipmentForm.destination}
                onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, destination: e.target.value })}
                placeholder="City, State"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Freight Expressway Corridor</label>
            <input
              type="text"
              className="input input-sm w-full"
              value={createShipmentForm.route}
              onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, route: e.target.value })}
            />
          </div>

          {orderLookupData && (
            <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)] text-xs">
              <div className="font-semibold text-primary">Found Order #{orderLookupData.id}</div>
              <div className="text-muted mt-0.5">
                Customer: {orderLookupData.customer_name || orderLookupData.customerName || 'Customer'} | Items: {orderLookupData.items?.length || 1}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowCreateShipmentModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm flex items-center gap-1.5 text-white"
              disabled={creatingShipment}
            >
              {creatingShipment ? <RefreshCw size={13} className="animate-spin" /> : <Truck size={13} />}
              <span>{creatingShipment ? 'Creating Shipment...' : 'Create & Dispatch Shipment'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. Create Container Modal */}
      <Modal
        isOpen={showCreateContainerModal}
        onClose={() => setShowCreateContainerModal(false)}
        title="Provision Freight Logistics Container"
        maxWidth="540px"
      >
        <form onSubmit={handleCreateContainerSubmit} className="space-y-3">
          <div className="form-group">
            <label className="form-label text-xs font-semibold">Container Code / Identifier</label>
            <input
              type="text"
              className="input input-sm mono-text w-full"
              value={createContainerForm.containerCode}
              onChange={(e) => setCreateContainerForm({ ...createContainerForm, containerCode: e.target.value })}
              placeholder="e.g. CONT-ECO-8819 (leave blank to auto-generate)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Origin Hub</label>
              <input
                type="text"
                className="input input-sm w-full"
                value={createContainerForm.origin}
                onChange={(e) => setCreateContainerForm({ ...createContainerForm, origin: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Destination Terminal</label>
              <input
                type="text"
                className="input input-sm w-full"
                value={createContainerForm.destination}
                onChange={(e) => setCreateContainerForm({ ...createContainerForm, destination: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Freight Route</label>
            <input
              type="text"
              className="input input-sm w-full"
              value={createContainerForm.route}
              onChange={(e) => setCreateContainerForm({ ...createContainerForm, route: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowCreateContainerModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm flex items-center gap-1.5 text-white"
              disabled={creatingContainer}
            >
              {creatingContainer ? <RefreshCw size={13} className="animate-spin" /> : <Box size={13} />}
              <span>{creatingContainer ? 'Provisioning...' : 'Create Container'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FulfillmentPage;
