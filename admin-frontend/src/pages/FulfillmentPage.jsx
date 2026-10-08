import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Hash,
  Scale,
  Maximize2,
  RotateCcw,
  ShieldAlert,
  CheckSquare,
  Square,
  PackageCheck,
  Link as LinkIcon,
  Fuel,
  UserCheck,
  UserX,
  Phone,
  CreditCard,
  UserPlus
} from 'lucide-react';
import { fulfillmentApi, orderOpsApi, returnsApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { createTrackingClient } from '../utils/stompClient';

const SHIPMENT_STATUSES = [
  'ALL',
  'OPEN',
  'FULL',
  'ASSIGNED',
  'READY_FOR_DISPATCH',
  'IN_TRANSIT',
  'ARRIVED_AT_HUB',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED_DELIVERY',
  'CANCELLED'
];

const CARRIER_OPTIONS = [
  'All Carriers',
  'EcoExpress Carbon-Neutral Fleet',
  'BlueDart Express Surface',
  'Delhivery Logistics',
  'Shadowfax Hyperlocal',
  'DTDC Express'
];

const WAREHOUSE_CONFIGS = [
  {
    name: 'Gujarat Central Hub',
    code: 'WH-GUJ',
    city: 'Ahmedabad',
    state: 'Gujarat',
    serviceArea: 'Ahmedabad, Vadodara, Surat, Rajkot, Bhavnagar',
    defaultRoute: 'Gujarat Central Hub -> Maharashtra Logistics Hub -> Telangana Regional Hub -> Bengaluru Central Hub'
  },
  {
    name: 'Maharashtra Logistics Hub',
    code: 'WH-MAH',
    city: 'Mumbai',
    state: 'Maharashtra',
    serviceArea: 'Mumbai, Pune, Nagpur, Nashik, Aurangabad',
    defaultRoute: 'Maharashtra Logistics Hub -> Gujarat Central Hub -> Delhi-NCR North Logistics Center'
  },
  {
    name: 'Bengaluru Central Fulfillment Hub',
    code: 'WH-BLR',
    city: 'Bengaluru',
    state: 'Karnataka',
    serviceArea: 'Bengaluru, Mysuru, Hubballi, Mangaluru, Belagavi',
    defaultRoute: 'Bengaluru Central Fulfillment Hub -> Telangana Regional Hub -> Maharashtra Logistics Hub'
  },
  {
    name: 'Telangana Regional Hub',
    code: 'WH-TEL',
    city: 'Hyderabad',
    state: 'Telangana',
    serviceArea: 'Hyderabad, Warangal, Nizamabad, Karimnagar',
    defaultRoute: 'Telangana Regional Hub -> Bengaluru Central Hub -> Maharashtra Logistics Hub'
  },
  {
    name: 'Delhi-NCR North Logistics Center',
    code: 'WH-DEL',
    city: 'Delhi',
    state: 'Delhi',
    serviceArea: 'Delhi, Noida, Gurugram, Faridabad, Ghaziabad',
    defaultRoute: 'Delhi-NCR North Logistics Center -> Gujarat Central Hub -> Maharashtra Logistics Hub'
  }
];

const WAREHOUSE_OPTIONS = ['All Warehouses', ...WAREHOUSE_CONFIGS.map(w => w.name)];

const STATE_OPTIONS = [
  'All States',
  'Gujarat',
  'Maharashtra',
  'Telangana',
  'Karnataka',
  'Delhi',
  'Tamil Nadu',
  'Uttar Pradesh'
];

const EXCEPTION_REASONS = [
  'Route disruption',
  'Operational exception',
  'Urgent customer priority routing',
  'Hub bypass load balancing',
  'Other'
];

const SHIPMENT_STAFF_ACTIONS = {
  OPEN: {
    nextStatus: 'READY_FOR_DISPATCH',
    label: 'Mark Full',
    icon: Box,
    btnClass: 'btn-outline',
    bg: '#d97706'
  },
  FULL: {
    nextStatus: 'READY_FOR_DISPATCH',
    label: 'Ready for Dispatch',
    icon: CheckCircle2,
    btnClass: 'btn-primary',
    bg: '#0284c7'
  },
  ASSIGNED: {
    nextStatus: 'IN_TRANSIT',
    label: 'Dispatch Shipment',
    icon: Truck,
    btnClass: 'btn-primary',
    bg: '#0284c7'
  },
  READY_FOR_DISPATCH: {
    nextStatus: 'IN_TRANSIT',
    label: 'Dispatch Shipment',
    icon: Truck,
    btnClass: 'btn-primary',
    bg: '#0284c7'
  },
  CREATED: {
    nextStatus: 'READY_FOR_DISPATCH',
    label: 'Ready for Dispatch',
    icon: Package,
    btnClass: 'btn-primary',
    bg: '#d97706'
  },
  PACKED: {
    nextStatus: 'READY_FOR_DISPATCH',
    label: 'Ready for Dispatch',
    icon: Package,
    btnClass: 'btn-primary',
    bg: '#0284c7'
  },
  DISPATCHED: {
    nextStatus: 'IN_TRANSIT',
    label: 'Start Transit',
    icon: Navigation,
    btnClass: 'btn-primary',
    bg: '#2563eb'
  },
  IN_TRANSIT: {
    nextStatus: 'ARRIVED_AT_HUB',
    label: 'Arrived At Hub',
    icon: Building,
    btnClass: 'btn-primary',
    bg: '#7c3aed'
  },
  ARRIVED_AT_HUB: {
    nextStatus: 'OUT_FOR_DELIVERY',
    label: 'Out For Delivery',
    icon: Truck,
    btnClass: 'btn-primary',
    bg: '#ea580c'
  },
  OUT_FOR_DELIVERY: {
    nextStatus: 'DELIVERED',
    label: 'Verify Delivery OTP',
    icon: KeyRound,
    btnClass: 'btn-primary',
    bg: '#16a34a',
    isOtpFlow: true
  }
};

export const FulfillmentPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';
  const initialTab = searchParams.get('tab') || 'awaiting';

  const { user, hasPermission, isAdmin } = useAuth();
  const canUpdate = isAdmin() || hasPermission('ORDER_STATUS_UPDATE') || hasPermission('ORDER_PROCESS');

  // Active Warehouse Context
  const [activeWarehouse, setActiveWarehouse] = useState(user?.warehouse || 'Gujarat Central Hub');

  // Active Tab: 'awaiting' | 'shipments' | 'containers' | 'drivers' | 'in_transit' | 'out_for_delivery' | 'returns'
  const [activeTab, setActiveTab] = useState(initialTab);

  const [shipments, setShipments] = useState([]);
  const [ordersAwaiting, setOrdersAwaiting] = useState([]);
  const [containers, setContainers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [returnsList, setReturnsList] = useState([]);
  const [fulfillmentSummary, setFulfillmentSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Enterprise Filters
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedPincode, setSelectedPincode] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('All Carriers');
  const [selectedHub, setSelectedHub] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Multi-Order Selection State for Orders Ready Tab
  const [selectedOrderIds, setSelectedOrderIds] = useState(
    initialOrderId ? [Number(initialOrderId.replace(/[^0-9]/g, ''))].filter(n => !isNaN(n) && n > 0) : []
  );
  const [batchCompatibleShipments, setBatchCompatibleShipments] = useState([]);
  const [batchCompatibleLoading, setBatchCompatibleLoading] = useState(false);

  // WebSocket Live Stomp State
  const [wsConnected, setWsConnected] = useState(false);
  const stompClientRef = useRef(null);

  // Modals State
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [shipmentTrackingHistory, setShipmentTrackingHistory] = useState([]);
  const [shipmentAuditEvents, setShipmentAuditEvents] = useState([]);
  const [shipmentRouteExceptions, setShipmentRouteExceptions] = useState([]);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Add Single Order to Existing Shipment Modal
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [targetShipmentForAdd, setTargetShipmentForAdd] = useState(null);
  const [orderIdToAdd, setOrderIdToAdd] = useState('');
  const [compatibleShipmentsForSingleOrder, setCompatibleShipmentsForSingleOrder] = useState([]);
  const [selectedShipmentIdForSingleAdd, setSelectedShipmentIdForSingleAdd] = useState('');
  const [singleOrderAddMode, setSingleOrderAddMode] = useState('fromOrder'); // 'fromOrder' | 'fromShipment'
  const [addOrderLoading, setAddOrderLoading] = useState(false);
  const [routeMismatchDetected, setRouteMismatchDetected] = useState(false);
  const [routeMismatchMsg, setRouteMismatchMsg] = useState('');
  const [selectedExceptionReason, setSelectedExceptionReason] = useState('Route disruption');
  const [customExceptionReason, setCustomExceptionReason] = useState('');

  // Batch Assign Selected Orders Modal
  const [showBatchAssignModal, setShowBatchAssignModal] = useState(false);
  const [selectedTargetShipmentIdForBatch, setSelectedTargetShipmentIdForBatch] = useState('');
  const [batchAssignSubmitting, setBatchAssignSubmitting] = useState(false);

  // Assign Driver + Truck to Shipment Modal
  const [showAssignDriverTruckModal, setShowAssignDriverTruckModal] = useState(false);
  const [targetShipmentForDriverTruck, setTargetShipmentForDriverTruck] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedTruckContainerId, setSelectedTruckContainerId] = useState('');
  const [assigningDriverTruckLoading, setAssigningDriverTruckLoading] = useState(false);

  // Delivery OTP Modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpTargetShipment, setOtpTargetShipment] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Multi-Order Create Shipment Modal
  const [showCreateShipmentModal, setShowCreateShipmentModal] = useState(false);
  const [shipmentSubmitting, setShipmentSubmitting] = useState(false);
  const [createShipmentForm, setCreateShipmentForm] = useState({
    targetOrderIds: [],
    carrierName: 'EcoExpress Carbon-Neutral Fleet',
    trackingNumber: '',
    vehicleNumber: 'KA-01-EQ-9124 (EV Heavy Truck)',
    origin: activeWarehouse,
    destination: 'Bengaluru Central Fulfillment Hub',
    route: 'Gujarat Central Hub -> Maharashtra Logistics Hub -> Telangana Regional Hub -> Bengaluru Central Hub',
    containerId: '',
    maxWeightKg: '1000.00',
    maxVolumeM3: '10.00',
    routeException: false,
    exceptionReason: ''
  });

  // Create Container / Truck Modal
  const [showCreateContainerModal, setShowCreateContainerModal] = useState(false);
  const [containerSubmitting, setContainerSubmitting] = useState(false);
  const [createContainerForm, setCreateContainerForm] = useState({
    containerCode: '',
    vehicleNumber: 'MH-04-EV-8821 (EV 16T Heavy Carrier)',
    origin: activeWarehouse,
    destination: 'Bengaluru Central Fulfillment Hub',
    route: 'Gujarat Central Hub -> Maharashtra Logistics Hub -> Telangana Regional Hub -> Bengaluru Central Hub',
    maxWeightKg: '5000.00',
    maxVolumeM3: '45.00'
  });

  // Create Driver Modal
  const [showCreateDriverModal, setShowCreateDriverModal] = useState(false);
  const [driverSubmitting, setDriverSubmitting] = useState(false);
  const [createDriverForm, setCreateDriverForm] = useState({
    driverCode: '',
    name: '',
    phone: '',
    licenseNumber: '',
    warehouse: activeWarehouse
  });

  // Return Inspection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [targetReturnForReject, setTargetReturnForReject] = useState(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [returnProcessing, setReturnProcessing] = useState(false);

  // Direct status transition in flight
  const [transitioningId, setTransitioningId] = useState(null);

  // Current warehouse info object
  const currentWarehouseConfig = useMemo(() => {
    return WAREHOUSE_CONFIGS.find(w => w.name === activeWarehouse) || WAREHOUSE_CONFIGS[0];
  }, [activeWarehouse]);

  // 1. Fetch Shipments
  const loadShipments = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await fulfillmentApi.searchShipments({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: searchQuery || undefined,
        warehouse: activeWarehouse !== 'All Warehouses' ? activeWarehouse : undefined,
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
  }, [selectedStatus, searchQuery, activeWarehouse, selectedState, selectedCity, selectedPincode, selectedCarrier, selectedHub]);

  // 2. Fetch Orders Awaiting Fulfillment
  const loadOrdersAwaiting = useCallback(async () => {
    try {
      const res = await orderOpsApi.getOrders({ status: 'ALL', size: 150 });
      const allOrders = res?.orders || res?.content || (Array.isArray(res) ? res : []);
      const filtered = allOrders.filter((o) => {
        const st = (o.status || o.currentStatus || '').toUpperCase();
        return ['ORDER_PLACED', 'ORDER_CONFIRMED', 'PAID', 'PROCESSING', 'PACKED', 'READY_FOR_SHIPMENT'].includes(st);
      });
      setOrdersAwaiting(filtered);
    } catch {
      setOrdersAwaiting([]);
    }
  }, []);

  // 3. Fetch Returns
  const loadReturns = useCallback(async () => {
    try {
      const list = await returnsApi.getAllReturns();
      setReturnsList(Array.isArray(list) ? list : (list?.data || []));
    } catch {
      setReturnsList([]);
    }
  }, []);

  // 4. Fetch Containers / Trucks
  const loadContainers = useCallback(async () => {
    try {
      const data = await fulfillmentApi.searchContainers({
        page: 0,
        size: 100
      });
      const list = data?.content || (Array.isArray(data) ? data : []);
      // Filter by warehouse if applicable
      const filtered = activeWarehouse !== 'All Warehouses' 
        ? list.filter(c => !c.origin || c.origin === activeWarehouse)
        : list;
      setContainers(filtered);
    } catch {
      setContainers([]);
    }
  }, [activeWarehouse]);

  // 5. Fetch Drivers
  const loadDrivers = useCallback(async () => {
    try {
      const [allDriversRes, availDriversRes] = await Promise.all([
        fulfillmentApi.getDrivers({ warehouse: activeWarehouse !== 'All Warehouses' ? activeWarehouse : undefined }),
        fulfillmentApi.getAvailableDrivers(activeWarehouse !== 'All Warehouses' ? activeWarehouse : undefined)
      ]);
      setDrivers(Array.isArray(allDriversRes) ? allDriversRes : (allDriversRes?.content || []));
      setAvailableDrivers(Array.isArray(availDriversRes) ? availDriversRes : []);
    } catch {
      setDrivers([]);
      setAvailableDrivers([]);
    }
  }, [activeWarehouse]);

  // 6. Fetch Summary Analytics
  const loadSummary = useCallback(async () => {
    try {
      const data = await fulfillmentApi.getFulfillmentSummary();
      setFulfillmentSummary(data);
    } catch {
      // Fallback calculation derived from live state
    }
  }, []);

  // Initial Load & Periodic Sync
  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadShipments(false),
      loadOrdersAwaiting(),
      loadReturns(),
      loadContainers(),
      loadDrivers(),
      loadSummary()
    ]).finally(() => setLoading(false));

    const interval = setInterval(() => {
      loadShipments(false);
      loadOrdersAwaiting();
      loadReturns();
      loadContainers();
      loadDrivers();
      loadSummary();
    }, 12000);

    return () => clearInterval(interval);
  }, [loadShipments, loadOrdersAwaiting, loadReturns, loadContainers, loadDrivers, loadSummary]);

  // WebSocket Live Synchronization
  useEffect(() => {
    const client = createTrackingClient();
    stompClientRef.current = client;

    client.onConnect(() => {
      setWsConnected(true);
      client.subscribe('/topic/fulfillment/activity', () => {
        loadShipments(false);
        loadOrdersAwaiting();
        loadContainers();
        loadDrivers();
        loadSummary();
      });
      client.subscribe('/topic/fulfillment/analytics', () => {
        loadSummary();
      });
    });

    client.onDisconnect(() => {
      setWsConnected(false);
    });

    client.connect();

    return () => {
      client.disconnect();
    };
  }, [loadShipments, loadOrdersAwaiting, loadContainers, loadDrivers, loadSummary]);

  // Cooldown timer for Delivery OTP
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  // Dynamically load compatible shipments when selectedOrderIds changes
  useEffect(() => {
    if (selectedOrderIds.length > 0) {
      setBatchCompatibleLoading(true);
      fulfillmentApi.getCompatibleShipments({
        orderIds: selectedOrderIds,
        warehouse: activeWarehouse !== 'All Warehouses' ? activeWarehouse : undefined
      }).then((res) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        setBatchCompatibleShipments(list);
        if (list.length > 0) {
          setSelectedTargetShipmentIdForBatch(list[0].id.toString());
        } else {
          setSelectedTargetShipmentIdForBatch('');
        }
      }).catch(() => {
        setBatchCompatibleShipments([]);
      }).finally(() => {
        setBatchCompatibleLoading(false);
      });
    } else {
      setBatchCompatibleShipments([]);
    }
  }, [selectedOrderIds, activeWarehouse]);

  // Open shipments in warehouse available for assignment
  const openWarehouseShipments = useMemo(() => {
    return shipments.filter(s => s.status === 'OPEN' && s.canAcceptOrders !== false);
  }, [shipments]);

  // Available trucks in warehouse
  const availableTrucks = useMemo(() => {
    return containers.filter(c => c.status === 'AVAILABLE' || c.status === 'OPEN' || c.status === 'CREATED');
  }, [containers]);

  // Summary Metrics Derived
  const summaryMetrics = useMemo(() => {
    const readyForShipment = ordersAwaiting.length;
    const availableShipmentsCount = openWarehouseShipments.length;
    const unassignedTruckShipments = shipments.filter(s => !s.containerId && s.status !== 'DELIVERED' && s.status !== 'CANCELLED').length;
    const availableDriversCount = availableDrivers.length;
    const availableTrucksCount = availableTrucks.length;
    const inTransit = shipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'ARRIVED_AT_HUB').length;
    const outForDelivery = shipments.filter(s => s.status === 'OUT_FOR_DELIVERY').length;
    const delivered = fulfillmentSummary?.deliveredShipments ?? shipments.filter(s => s.status === 'DELIVERED').length;

    return {
      readyForShipment,
      availableShipmentsCount,
      unassignedTruckShipments,
      availableDriversCount,
      availableTrucksCount,
      inTransit,
      outForDelivery,
      delivered
    };
  }, [ordersAwaiting, openWarehouseShipments, shipments, availableDrivers, availableTrucks, fulfillmentSummary]);

  // Filtered views for specialized tabs
  const inTransitShipments = useMemo(() => {
    return shipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'ARRIVED_AT_HUB');
  }, [shipments]);

  const outForDeliveryShipments = useMemo(() => {
    return shipments.filter(s => s.status === 'OUT_FOR_DELIVERY');
  }, [shipments]);

  // Selected Orders Analysis in Orders Ready Tab
  const selectedOrdersData = useMemo(() => {
    const selected = ordersAwaiting.filter(o => selectedOrderIds.includes(o.id));
    const totalWeight = selected.reduce((acc, o) => acc + Number(o.total_weight_kg || 1.5), 0);
    const totalVolume = selected.reduce((acc, o) => acc + Number(o.total_volume_m3 || 0.006), 0);

    const distinctDestinations = [...new Set(selected.map(o => `${o.city || 'Bengaluru'}, ${o.state || 'Karnataka'}`).filter(Boolean))];
    const isRouteCompatible = distinctDestinations.length <= 1;

    return {
      selected,
      count: selected.length,
      totalWeight: totalWeight.toFixed(2),
      totalVolume: totalVolume.toFixed(3),
      destinations: distinctDestinations,
      isRouteCompatible,
      primaryDestination: distinctDestinations[0] || 'Bengaluru Central Fulfillment Hub'
    };
  }, [ordersAwaiting, selectedOrderIds]);

  // Multi-Select Handlers
  const toggleSelectOrder = (orderId) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelectAllOrders = () => {
    if (selectedOrderIds.length === ordersAwaiting.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(ordersAwaiting.map(o => o.id));
    }
  };

  // Open Add Single Order Modal from an Order row
  const handleOpenAssignOrderModal = async (order) => {
    setSingleOrderAddMode('fromOrder');
    setOrderIdToAdd(order.id.toString());
    setTargetShipmentForAdd(null);
    setSelectedShipmentIdForSingleAdd('');
    setRouteMismatchDetected(false);
    setRouteMismatchMsg('');
    setShowAddOrderModal(true);

    try {
      const compatible = await fulfillmentApi.getCompatibleShipments({
        orderId: order.id,
        warehouse: activeWarehouse !== 'All Warehouses' ? activeWarehouse : undefined,
        destination: `${order.city || ''}, ${order.state || ''}`
      });
      const list = Array.isArray(compatible) ? compatible : (compatible?.data || []);
      setCompatibleShipmentsForSingleOrder(list);
      if (list.length > 0) {
        setSelectedShipmentIdForSingleAdd(list[0].id.toString());
      }
    } catch {
      setCompatibleShipmentsForSingleOrder([]);
    }
  };

  // Open Add Order Modal from a Shipment row
  const handleOpenAddOrderFromShipment = (shipment) => {
    setSingleOrderAddMode('fromShipment');
    setTargetShipmentForAdd(shipment);
    setSelectedShipmentIdForSingleAdd(shipment.id.toString());
    setOrderIdToAdd('');
    setCompatibleShipmentsForSingleOrder([shipment]);
    setRouteMismatchDetected(false);
    setRouteMismatchMsg('');
    setShowAddOrderModal(true);
  };

  // Submit Add Single Order to Shipment
  const handleAddSingleOrderSubmit = async (forceException = false) => {
    const targetShipmentId = singleOrderAddMode === 'fromOrder'
      ? selectedShipmentIdForSingleAdd
      : (targetShipmentForAdd?.id || selectedShipmentIdForSingleAdd);

    const orderId = orderIdToAdd.trim().replace(/[^0-9]/g, '');

    if (!targetShipmentId || !orderId) return;

    setAddOrderLoading(true);
    setError('');
    setSuccess('');
    try {
      const exceptionReason = selectedExceptionReason === 'Other' ? customExceptionReason : selectedExceptionReason;
      await fulfillmentApi.assignOrderToShipment(
        Number(targetShipmentId),
        orderId,
        forceException,
        forceException ? exceptionReason : ''
      );
      setSuccess(`Order #${orderId} successfully assigned to Shipment #${targetShipmentId}`);
      setShowAddOrderModal(false);
      loadShipments(false);
      loadOrdersAwaiting();
      loadSummary();
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('ROUTE_MISMATCH')) {
        setRouteMismatchDetected(true);
        setRouteMismatchMsg(msg.replace('ROUTE_MISMATCH:', '').trim());
      } else {
        setError(msg);
      }
    } finally {
      setAddOrderLoading(false);
    }
  };

  // Batch Assign Selected Orders to Shipment Submit
  const handleBatchAssignSubmit = async (forceException = false) => {
    if (!selectedTargetShipmentIdForBatch || selectedOrderIds.length === 0) return;

    setBatchAssignSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const exceptionReason = selectedExceptionReason === 'Other' ? customExceptionReason : selectedExceptionReason;
      const res = await fulfillmentApi.batchAssignOrdersToShipment(
        Number(selectedTargetShipmentIdForBatch),
        {
          orderIds: selectedOrderIds.map(Number),
          routeException: forceException,
          exceptionReason: forceException ? exceptionReason : ''
        }
      );
      setSuccess(`Successfully assigned ${res?.assignedOrderCount || selectedOrderIds.length} orders to Shipment #${res?.shipmentNumber || selectedTargetShipmentIdForBatch}!`);
      setShowBatchAssignModal(false);
      setSelectedOrderIds([]);
      setActiveTab('shipments');
      loadShipments(false);
      loadOrdersAwaiting();
      loadSummary();
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('ROUTE_MISMATCH')) {
        setRouteMismatchDetected(true);
        setRouteMismatchMsg(msg.replace('ROUTE_MISMATCH:', '').trim());
      } else {
        setError(msg);
      }
    } finally {
      setBatchAssignSubmitting(false);
    }
  };

  // Open Assign Driver + Truck Modal
  const handleOpenAssignDriverTruckModal = (shipment) => {
    setTargetShipmentForDriverTruck(shipment);
    setSelectedDriverId(shipment.driverId ? shipment.driverId.toString() : '');
    setSelectedTruckContainerId(shipment.containerId ? shipment.containerId.toString() : '');
    setShowAssignDriverTruckModal(true);
  };

  // Submit Assign Driver + Truck
  const handleAssignDriverTruckSubmit = async (e) => {
    e.preventDefault();
    if (!targetShipmentForDriverTruck) return;

    setAssigningDriverTruckLoading(true);
    setError('');
    setSuccess('');

    try {
      const selectedDriver = drivers.find(d => d.id === Number(selectedDriverId));
      const selectedTruck = containers.find(c => c.id === Number(selectedTruckContainerId));

      const payload = {
        driverId: selectedDriver?.id || null,
        driverCode: selectedDriver?.driverCode || null,
        containerId: selectedTruck?.id || null,
        truckCode: selectedTruck?.containerCode || null,
        vehicleNumber: selectedTruck?.vehicleNumber || null
      };

      const res = await fulfillmentApi.assignDriverAndTruck(targetShipmentForDriverTruck.id, payload);
      setSuccess(`Driver [${res.driverName || selectedDriver?.name || 'Assigned'}] & Truck [${res.containerCode || selectedTruck?.containerCode || 'Assigned'}] allocated to Shipment #${targetShipmentForDriverTruck.shipmentNumber}!`);
      setShowAssignDriverTruckModal(false);
      setTargetShipmentForDriverTruck(null);
      loadShipments(false);
      loadContainers();
      loadDrivers();
      loadSummary();
    } catch (err) {
      setError(err.message || 'Failed to assign driver and truck.');
    } finally {
      setAssigningDriverTruckLoading(false);
    }
  };

  // Open Multi-Order Create Shipment Modal
  const handleOpenCreateShipmentModal = (preselectedIds = null) => {
    let targetIds = (Array.isArray(preselectedIds) && preselectedIds.length > 0)
      ? preselectedIds
      : selectedOrderIds;

    if (!targetIds || targetIds.length === 0) {
      setError('Please select at least one order awaiting fulfillment to create a shipment.');
      setActiveTab('awaiting');
      return;
    }

    const selected = ordersAwaiting.filter(o => targetIds.includes(o.id));
    const primaryDest = selected[0] ? `${selected[0].city || 'Bengaluru'}, ${selected[0].state || 'Karnataka'}` : 'Bengaluru Central Fulfillment Hub';
    const totalWeight = selected.reduce((acc, o) => acc + Number(o.total_weight_kg || 1.5), 0);
    const totalVolume = selected.reduce((acc, o) => acc + Number(o.total_volume_m3 || 0.006), 0);

    setCreateShipmentForm({
      targetOrderIds: targetIds,
      carrierName: 'EcoExpress Carbon-Neutral Fleet',
      trackingNumber: `ECO-AWB-${Date.now().toString().slice(-6)}`,
      vehicleNumber: 'KA-01-EQ-9124 (EV Heavy Truck)',
      origin: activeWarehouse !== 'All Warehouses' ? activeWarehouse : 'Gujarat Central Hub',
      destination: primaryDest,
      route: `${activeWarehouse !== 'All Warehouses' ? activeWarehouse : 'Gujarat Central Hub'} -> Maharashtra Logistics Hub -> Telangana Regional Hub -> ${primaryDest}`,
      containerId: '',
      maxWeightKg: Math.max(1000, Math.ceil(totalWeight * 2)).toString(),
      maxVolumeM3: Math.max(10, Math.ceil(totalVolume * 2)).toString(),
      routeException: false,
      exceptionReason: ''
    });
    setShowCreateShipmentModal(true);
  };

  // Submit Multi-Order Shipment
  const handleCreateShipmentSubmit = async (e) => {
    e.preventDefault();
    if (!createShipmentForm.targetOrderIds || createShipmentForm.targetOrderIds.length === 0) {
      setError('Cannot create shipment without at least one eligible order.');
      return;
    }
    setShipmentSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        orderIds: createShipmentForm.targetOrderIds.map(Number),
        carrierName: createShipmentForm.carrierName,
        trackingNumber: createShipmentForm.trackingNumber,
        vehicleNumber: createShipmentForm.vehicleNumber,
        origin: createShipmentForm.origin,
        destination: createShipmentForm.destination,
        route: createShipmentForm.route,
        containerId: createShipmentForm.containerId ? Number(createShipmentForm.containerId) : null,
        routeException: createShipmentForm.routeException,
        exceptionReason: createShipmentForm.routeException ? createShipmentForm.exceptionReason : null
      };

      const res = await fulfillmentApi.createShipment(payload);
      setSuccess(`Shipment #${res.shipmentNumber || 'Created'} created successfully with ${createShipmentForm.targetOrderIds.length} orders!`);
      setShowCreateShipmentModal(false);
      setSelectedOrderIds([]);
      setActiveTab('shipments');
      loadShipments(false);
      loadOrdersAwaiting();
      loadContainers();
      loadDrivers();
      loadSummary();
    } catch (err) {
      setError(err.message || 'Failed to create shipment.');
    } finally {
      setShipmentSubmitting(false);
    }
  };

  // Submit New Container / Truck
  const handleCreateContainerSubmit = async (e) => {
    e.preventDefault();
    setContainerSubmitting(true);
    setError('');
    try {
      const payload = {
        containerCode: createContainerForm.containerCode.trim().toUpperCase(),
        vehicleNumber: createContainerForm.vehicleNumber,
        origin: createContainerForm.origin,
        destination: createContainerForm.destination,
        route: createContainerForm.route,
        maxWeightKg: Number(createContainerForm.maxWeightKg || 5000),
        maxVolumeM3: Number(createContainerForm.maxVolumeM3 || 45)
      };

      const res = await fulfillmentApi.createContainer(payload);
      setSuccess(`Logistics Truck/Container [${res.containerCode || payload.containerCode}] provisioned in ${payload.origin}!`);
      setShowCreateContainerModal(false);
      setCreateContainerForm({
        containerCode: '',
        vehicleNumber: 'MH-04-EV-8821 (EV 16T Heavy Carrier)',
        origin: activeWarehouse !== 'All Warehouses' ? activeWarehouse : 'Gujarat Central Hub',
        destination: 'Bengaluru Central Fulfillment Hub',
        route: 'Gujarat Central Hub -> Maharashtra Logistics Hub -> Telangana Regional Hub -> Bengaluru Central Hub',
        maxWeightKg: '5000.00',
        maxVolumeM3: '45.00'
      });
      loadContainers();
    } catch (err) {
      setError(err.message || 'Failed to provision container.');
    } finally {
      setContainerSubmitting(false);
    }
  };

  // Submit New Driver
  const handleCreateDriverSubmit = async (e) => {
    e.preventDefault();
    setDriverSubmitting(true);
    setError('');
    try {
      const payload = {
        driverCode: createDriverForm.driverCode.trim().toUpperCase(),
        name: createDriverForm.name.trim(),
        phone: createDriverForm.phone.trim(),
        licenseNumber: createDriverForm.licenseNumber.trim(),
        warehouse: createDriverForm.warehouse
      };

      const res = await fulfillmentApi.createDriver(payload);
      setSuccess(`Driver [${res.name} (${res.driverCode})] registered successfully at ${payload.warehouse}!`);
      setShowCreateDriverModal(false);
      setCreateDriverForm({
        driverCode: '',
        name: '',
        phone: '',
        licenseNumber: '',
        warehouse: activeWarehouse !== 'All Warehouses' ? activeWarehouse : 'Gujarat Central Hub'
      });
      loadDrivers();
    } catch (err) {
      setError(err.message || 'Failed to register driver.');
    } finally {
      setDriverSubmitting(false);
    }
  };

  // Driver status toggle
  const handleToggleDriverStatus = async (driver, newStatus) => {
    try {
      await fulfillmentApi.updateDriverStatus(driver.id, newStatus);
      setSuccess(`Driver ${driver.name} status updated to ${newStatus}.`);
      loadDrivers();
    } catch (err) {
      setError(err.message || 'Failed to update driver status.');
    }
  };

  // Quick Action: Mark Shipment Full
  const handleMarkShipmentFull = async (shipment) => {
    try {
      await fulfillmentApi.markShipmentFull(shipment.id);
      setSuccess(`Shipment #${shipment.shipmentNumber} marked FULL and READY_FOR_DISPATCH.`);
      loadShipments(false);
      loadSummary();
    } catch (err) {
      setError(err.message || 'Failed to mark shipment full.');
    }
  };

  // Quick Action: Dispatch Shipment
  const handleDispatchShipment = async (shipment) => {
    try {
      await fulfillmentApi.dispatchShipment(shipment.id);
      setSuccess(`Shipment #${shipment.shipmentNumber} dispatched into transit corridor.`);
      loadShipments(false);
      loadOrdersAwaiting();
      loadContainers();
      loadDrivers();
      loadSummary();
    } catch (err) {
      setError(err.message || 'Failed to dispatch shipment.');
    }
  };

  // Status transition handler
  const handleTransitionStatus = async (shipment, nextStatus) => {
    setTransitioningId(shipment.id);
    setError('');
    setSuccess('');
    try {
      if (nextStatus === 'READY_FOR_DISPATCH') {
        await fulfillmentApi.markShipmentFull(shipment.id);
      } else if (nextStatus === 'IN_TRANSIT') {
        await fulfillmentApi.dispatchShipment(shipment.id);
      } else {
        await fulfillmentApi.updateShipmentStatus(shipment.id, nextStatus);
      }
      setSuccess(`Shipment #${shipment.shipmentNumber} transitioned to ${nextStatus}.`);
      loadShipments(false);
      loadOrdersAwaiting();
      loadContainers();
      loadDrivers();
      loadSummary();
    } catch (err) {
      setError(err.message || 'Failed to update shipment status');
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
      setSuccess(res?.message || `Shipment #${otpTargetShipment.shipmentNumber} marked DELIVERED!`);
      setShowOtpModal(false);
      setOtpTargetShipment(null);
      loadShipments(false);
      loadOrdersAwaiting();
      loadDrivers();
      loadSummary();
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
    setShipmentRouteExceptions([]);
    try {
      const [trackingRes, eventsRes, exceptionsRes] = await Promise.all([
        fulfillmentApi.getShipmentTracking(shipment.id).catch(() => []),
        fulfillmentApi.getShipmentEvents(shipment.id).catch(() => []),
        fulfillmentApi.getRouteExceptions(shipment.id).catch(() => [])
      ]);
      setShipmentTrackingHistory(trackingRes || []);
      setShipmentAuditEvents(eventsRes || []);
      setShipmentRouteExceptions(exceptionsRes || []);
    } catch {
      // ignore
    } finally {
      setTrackingLoading(false);
    }
  };

  // Returns Actions
  const handleApproveReturn = async (returnId) => {
    try {
      await returnsApi.approveReturn(returnId, 'Approved for reverse pickup');
      setSuccess(`Return request #${returnId} approved.`);
      loadReturns();
    } catch (err) {
      setError(err.message || 'Failed to approve return');
    }
  };

  const handleReceiveReturn = async (returnId) => {
    try {
      await returnsApi.receiveReturn(returnId, 'Physical inspection passed at warehouse hub');
      setSuccess(`Return item #${returnId} received, inspection passed, and refund triggered.`);
      loadReturns();
    } catch (err) {
      setError(err.message || 'Failed to receive return');
    }
  };

  const handleRejectReturnSubmit = async () => {
    if (!targetReturnForReject || !rejectionReasonText.trim()) return;
    setReturnProcessing(true);
    try {
      await returnsApi.rejectReturn(targetReturnForReject.id, rejectionReasonText.trim());
      setSuccess(`Return #${targetReturnForReject.id} rejected.`);
      setShowRejectModal(false);
      setTargetReturnForReject(null);
      loadReturns();
    } catch (err) {
      setError(err.message || 'Failed to reject return');
    } finally {
      setReturnProcessing(false);
    }
  };

  // Helper to render capacity bar
  const renderCapacityBar = (used, max, unit, label) => {
    const u = Number(used || 0);
    const m = Number(max || 1);
    const pct = Math.min(100, Math.round((u / m) * 100));
    const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';

    return (
      <div style={{ minWidth: '130px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '2px' }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{label}:</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            {u.toLocaleString()} / {m.toLocaleString()} {unit} ({pct}%)
          </span>
        </div>
        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '3px', transition: 'width 0.3s ease' }} />
        </div>
      </div>
    );
  };

  // Helper to render assigned order badges
  const renderAssignedOrders = (shipment) => {
    const orderIds = shipment.assignedOrderIds || (shipment.orderId ? [shipment.orderId] : []);
    const refNumbers = shipment.assignedOrderRefNumbers || [];
    const count = shipment.assignedOrderCount || orderIds.length || 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {refNumbers.length > 0 ? (
            refNumbers.map((ref, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(5, 150, 105, 0.1)',
                  color: '#059669',
                  fontSize: '0.72rem',
                  fontWeight: 600
                }}
              >
                #{ref}
              </span>
            ))
          ) : orderIds.length > 0 ? (
            orderIds.map((id, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(5, 150, 105, 0.1)',
                  color: '#059669',
                  fontSize: '0.72rem',
                  fontWeight: 600
                }}
              >
                #ORD-{id}
              </span>
            ))
          ) : (
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>No orders assigned</span>
          )}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Total: <strong>{count} {count === 1 ? 'order' : 'orders'}</strong>
        </div>
      </div>
    );
  };

  // Helper to render truck and driver allocation cell
  const renderTruckAndDriver = (shipment) => {
    const hasTruck = !!shipment.containerCode || !!shipment.containerId;
    const hasDriver = !!shipment.driverName || !!shipment.driverCode;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Truck info */}
        <div>
          {hasTruck ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}
              >
                <Box size={11} /> [{shipment.containerCode || `TRUCK-${shipment.containerId}`}]
              </span>
            </div>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                color: '#d97706',
                fontSize: '0.7rem',
                fontWeight: 600
              }}
            >
              <AlertTriangle size={10} /> No Truck
            </span>
          )}
        </div>

        {/* Driver info */}
        <div>
          {hasDriver ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <UserCheck size={12} style={{ color: '#059669' }} />
              <span>{shipment.driverName} ({shipment.driverCode})</span>
            </div>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                color: '#d97706',
                fontSize: '0.7rem',
                fontWeight: 600
              }}
            >
              <UserX size={10} /> No Driver
            </span>
          )}
        </div>

        {/* Assign Button if missing either */}
        {shipment.status !== 'DELIVERED' && shipment.status !== 'CANCELLED' && (
          <button
            onClick={() => handleOpenAssignDriverTruckModal(shipment)}
            className="btn btn-outline btn-xs"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', padding: '2px 6px', width: 'fit-content' }}
          >
            <Truck size={10} /> {(!hasTruck || !hasDriver) ? 'Assign Fleet / Driver' : 'Edit Allocation'}
          </button>
        )}
      </div>
    );
  };

  // Columns for Shipments Table
  const shipmentColumns = [
    {
      key: 'shipmentNumber',
      title: 'Shipment & Origin',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Truck size={14} style={{ color: '#059669' }} />
            #{row.shipmentNumber}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {row.origin || 'Gujarat Central Hub'} • {row.carrierName || 'EcoExpress'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            AWB: {row.trackingNumber || 'AWB-PENDING'}
          </div>
        </div>
      )
    },
    {
      key: 'assignedOrders',
      title: 'Assigned Orders',
      render: (row) => renderAssignedOrders(row)
    },
    {
      key: 'route',
      title: 'Destination Corridor',
      render: (row) => (
        <div style={{ maxWidth: '200px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.destination || 'Bengaluru Central Hub'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
            <Compass size={11} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.route || 'Direct corridor'}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'truckDriver',
      title: 'Truck & Driver Fleet',
      render: (row) => renderTruckAndDriver(row)
    },
    {
      key: 'capacity',
      title: 'Load Telemetry',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {renderCapacityBar(row.usedWeight, row.maxWeight, 'kg', 'Weight')}
          {renderCapacityBar(row.usedVolume, row.maxVolume, 'm³', 'Volume')}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'actions',
      title: 'Operational Actions',
      render: (row) => {
        const actionConfig = SHIPMENT_STAFF_ACTIONS[row.status];
        const isTransitioning = transitioningId === row.id;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {row.canAcceptOrders && row.status === 'OPEN' && (
                <button
                  onClick={() => handleOpenAddOrderFromShipment(row)}
                  className="btn btn-outline btn-xs"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem' }}
                >
                  <Plus size={11} /> Add Order
                </button>
              )}

              {row.status === 'OPEN' && (
                <button
                  onClick={() => handleMarkShipmentFull(row)}
                  className="btn btn-outline btn-xs"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: '#d97706', borderColor: '#d97706' }}
                >
                  <Box size={11} /> Mark Full
                </button>
              )}

              {(row.status === 'READY_FOR_DISPATCH' || row.status === 'FULL' || row.status === 'ASSIGNED') && (
                <button
                  onClick={() => handleDispatchShipment(row)}
                  className="btn btn-primary btn-xs"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                >
                  <Truck size={11} /> Dispatch
                </button>
              )}

              {actionConfig && row.status !== 'OPEN' && row.status !== 'READY_FOR_DISPATCH' && row.status !== 'FULL' && row.status !== 'ASSIGNED' && (
                <button
                  onClick={() => {
                    if (actionConfig.isOtpFlow) {
                      handleOpenOtpModal(row);
                    } else {
                      handleTransitionStatus(row, actionConfig.nextStatus);
                    }
                  }}
                  disabled={isTransitioning || !canUpdate}
                  className={`btn ${actionConfig.btnClass} btn-xs`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', backgroundColor: actionConfig.bg, borderColor: actionConfig.bg }}
                >
                  <actionConfig.icon size={11} />
                  {actionConfig.label}
                </button>
              )}
            </div>

            <button
              onClick={() => handleOpenTrackingModal(row)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#059669', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', textAlign: 'left' }}
            >
              <Eye size={11} /> Telemetry & Audits
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="container-fluid" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header & Warehouse Context Card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={24} style={{ color: '#059669' }} />
              Warehouse Logistics & Fulfillment Command Center
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Warehouse-isolated order fulfillment, shipment consolidation, truck load telemetry, and driver dispatch.
          </p>
        </div>

        {/* Warehouse Selector & Top Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Warehouse Context Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px' }}>
            <Building size={14} style={{ color: '#059669' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hub:</span>
            <select
              value={activeWarehouse}
              onChange={(e) => {
                setActiveWarehouse(e.target.value);
                setSelectedOrderIds([]);
              }}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {WAREHOUSE_CONFIGS.map(w => (
                <option key={w.code} value={w.name}>{w.name} ({w.city})</option>
              ))}
              <option value="All Warehouses">All Warehouses (Global View)</option>
            </select>
          </div>

          {wsConnected ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#059669', backgroundColor: 'rgba(5, 150, 105, 0.1)', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
              <Radio size={12} className="pulse" /> Live Stomp
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: 'var(--border)', padding: '4px 8px', borderRadius: '12px' }}>
              <Radio size={12} /> Polling Sync
            </span>
          )}

          <button
            onClick={() => {
              loadShipments(true);
              loadOrdersAwaiting();
              loadReturns();
              loadContainers();
              loadDrivers();
              loadSummary();
            }}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => {
              if (selectedOrderIds.length > 0) {
                handleOpenCreateShipmentModal(selectedOrderIds);
              } else {
                setError('Please select one or more ready orders from the list below to create a shipment.');
                setActiveTab('awaiting');
              }
            }}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#059669', borderColor: '#059669' }}
          >
            <Plus size={14} />
            New Shipment
          </button>
        </div>
      </div>

      {/* Active Warehouse Operational Banner */}
      <div style={{
        padding: '10px 16px',
        backgroundColor: 'rgba(5, 150, 105, 0.05)',
        border: '1px solid rgba(5, 150, 105, 0.2)',
        borderRadius: '6px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
          <span style={{ fontWeight: 700, color: '#059669' }}>
            📍 Operational Hub: {currentWarehouseConfig?.name || activeWarehouse}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Service Area: <strong>{currentWarehouseConfig?.serviceArea || 'Statewide Corridor'}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <span>Open Shipments: <strong style={{ color: '#059669' }}>{openWarehouseShipments.length}</strong></span>
          <span>Available Trucks: <strong style={{ color: '#2563eb' }}>{availableTrucks.length}</strong></span>
          <span>Ready Drivers: <strong style={{ color: '#7c3aed' }}>{availableDrivers.length}</strong></span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', color: '#b91c1c', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '6px', color: '#047857', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* Summary KPI Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <StatCard
          title="Ready Orders"
          value={summaryMetrics.readyForShipment}
          icon={PackageCheck}
          color="amber"
          subtitle="Awaiting allocation"
        />
        <StatCard
          title="Available Shipments"
          value={summaryMetrics.availableShipmentsCount}
          icon={Box}
          color="emerald"
          subtitle="Open for orders"
        />
        <StatCard
          title="Available Trucks"
          value={summaryMetrics.availableTrucksCount}
          icon={Truck}
          color="blue"
          subtitle="Ready containers"
        />
        <StatCard
          title="Available Drivers"
          value={summaryMetrics.availableDriversCount}
          icon={UserCheck}
          color="purple"
          subtitle="Ready for route"
        />
        <StatCard
          title="In Transit"
          value={summaryMetrics.inTransit}
          icon={Navigation}
          color="blue"
          subtitle="Active corridors"
        />
        <StatCard
          title="Out for Delivery"
          value={summaryMetrics.outForDelivery}
          icon={MapPin}
          color="orange"
          subtitle="Final mile PIN flow"
        />
        <StatCard
          title="Delivered"
          value={summaryMetrics.delivered}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Completed deliveries"
        />
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border)', marginBottom: '16px', overflowX: 'auto', paddingBottom: '2px' }}>
        <button
          onClick={() => setActiveTab('awaiting')}
          style={{
            padding: '8px 14px',
            border: 'none',
            borderBottom: activeTab === 'awaiting' ? '2px solid #059669' : '2px solid transparent',
            background: 'none',
            fontWeight: activeTab === 'awaiting' ? 700 : 500,
            color: activeTab === 'awaiting' ? '#059669' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Package size={15} />
          Orders Ready ({ordersAwaiting.length})
        </button>

        <button
          onClick={() => setActiveTab('shipments')}
          style={{
            padding: '8px 14px',
            border: 'none',
            borderBottom: activeTab === 'shipments' ? '2px solid #059669' : '2px solid transparent',
            background: 'none',
            fontWeight: activeTab === 'shipments' ? 700 : 500,
            color: activeTab === 'shipments' ? '#059669' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Truck size={15} />
          Shipments ({shipments.length})
        </button>

        <button
          onClick={() => setActiveTab('containers')}
          style={{
            padding: '8px 14px',
            border: 'none',
            borderBottom: activeTab === 'containers' ? '2px solid #059669' : '2px solid transparent',
            background: 'none',
            fontWeight: activeTab === 'containers' ? 700 : 500,
            color: activeTab === 'containers' ? '#059669' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Box size={15} />
          Trucks / Containers ({containers.length})
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          style={{
            padding: '8px 14px',
            border: 'none',
            borderBottom: activeTab === 'drivers' ? '2px solid #059669' : '2px solid transparent',
            background: 'none',
            fontWeight: activeTab === 'drivers' ? 700 : 500,
            color: activeTab === 'drivers' ? '#059669' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <UserCheck size={15} />
          Drivers Fleet ({drivers.length})
        </button>

        <button
          onClick={() => setActiveTab('in_transit')}
          style={{
            padding: '8px 14px',
            border: 'none',
            borderBottom: activeTab === 'in_transit' ? '2px solid #059669' : '2px solid transparent',
            background: 'none',
            fontWeight: activeTab === 'in_transit' ? 700 : 500,
            color: activeTab === 'in_transit' ? '#059669' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Navigation size={15} />
          In Transit ({inTransitShipments.length})
        </button>

        <button
          onClick={() => setActiveTab('out_for_delivery')}
          style={{
            padding: '8px 14px',
            border: 'none',
            borderBottom: activeTab === 'out_for_delivery' ? '2px solid #059669' : '2px solid transparent',
            background: 'none',
            fontWeight: activeTab === 'out_for_delivery' ? 700 : 500,
            color: activeTab === 'out_for_delivery' ? '#059669' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <MapPin size={15} />
          Out for Delivery ({outForDeliveryShipments.length})
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          style={{
            padding: '8px 14px',
            border: 'none',
            borderBottom: activeTab === 'returns' ? '2px solid #059669' : '2px solid transparent',
            background: 'none',
            fontWeight: activeTab === 'returns' ? 700 : 500,
            color: activeTab === 'returns' ? '#059669' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <RotateCcw size={15} />
          Returns & Reverse ({returnsList.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ORDERS READY FOR FULFILLMENT (EXISTING SHIPMENT REUSE FIRST) */}
      {/* ========================================================================= */}
      {activeTab === 'awaiting' && (
        <div>
          {/* Multi-Order Selection Action Banner */}
          {selectedOrderIds.length > 0 && (
            <div style={{
              padding: '14px 18px',
              backgroundColor: 'var(--surface)',
              border: '2px solid #059669',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    backgroundColor: '#059669',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.8rem'
                  }}>
                    {selectedOrdersData.count}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                    {selectedOrdersData.count} Orders Selected
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                  <span>Weight: <strong>{selectedOrdersData.totalWeight} kg</strong></span>
                  <span>Volume: <strong>{selectedOrdersData.totalVolume} m³</strong></span>
                </div>

                {batchCompatibleLoading ? (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={12} className="spin" /> Checking compatible shipments...
                  </span>
                ) : batchCompatibleShipments.length > 0 ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: '#059669',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    fontWeight: 600
                  }}>
                    <CheckCircle2 size={13} /> {batchCompatibleShipments.length} Compatible Existing Shipments in Hub
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    color: '#d97706',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    fontWeight: 600
                  }}>
                    <Info size={13} /> No open existing shipment matching destination — Create New Shipment
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setSelectedOrderIds([])}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.8rem' }}
                >
                  Clear Selection
                </button>

                {/* Direct batch assign to existing compatible shipment */}
                {batchCompatibleShipments.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedTargetShipmentIdForBatch(batchCompatibleShipments[0].id.toString());
                      setShowBatchAssignModal(true);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{
                      backgroundColor: '#2563eb',
                      borderColor: '#2563eb',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600
                    }}
                  >
                    <Box size={14} />
                    Add to Existing Shipment ({batchCompatibleShipments.length} available)
                  </button>
                )}

                <button
                  onClick={() => handleOpenCreateShipmentModal(selectedOrderIds)}
                  className="btn btn-primary btn-sm"
                  style={{
                    backgroundColor: '#059669',
                    borderColor: '#059669',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}
                >
                  <Plus size={14} />
                  Create New Shipment
                </button>
              </div>
            </div>
          )}

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <DataTable
              columns={[
                {
                  key: 'checkbox',
                  title: (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={ordersAwaiting.length > 0 && selectedOrderIds.length === ordersAwaiting.length}
                        onChange={toggleSelectAllOrders}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </div>
                  ),
                  sortable: false,
                  render: (row) => (
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(row.id)}
                        onChange={() => toggleSelectOrder(row.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </div>
                  )
                },
                {
                  key: 'orderId',
                  title: 'Order Reference',
                  render: (row) => (
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        #{row.order_reference_number || `ORD-${row.id}`}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Recent Order'}
                      </div>
                    </div>
                  )
                },
                {
                  key: 'customer',
                  title: 'Customer & Destination',
                  render: (row) => (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.customer_name || 'Customer'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {row.city || 'Bengaluru'}, {row.state || 'Karnataka'} {row.pincode ? `(${row.pincode})` : ''}
                      </div>
                    </div>
                  )
                },
                {
                  key: 'weightVolume',
                  title: 'Weight & Volume',
                  render: (row) => (
                    <div style={{ fontSize: '0.8rem' }}>
                      <div>Weight: <strong>{row.total_weight_kg || '1.50'} kg</strong></div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Volume: <strong>{row.total_volume_m3 || '0.006'} m³</strong></div>
                    </div>
                  )
                },
                {
                  key: 'status',
                  title: 'Status',
                  render: (row) => <StatusBadge status={row.status || row.currentStatus} />
                },
                {
                  key: 'action',
                  title: 'Fulfillment Allocation',
                  render: (row) => (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {/* Reuse Existing Shipment Button */}
                      <button
                        onClick={() => handleOpenAssignOrderModal(row)}
                        className="btn btn-outline btn-xs"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.74rem',
                          color: '#2563eb',
                          borderColor: '#2563eb'
                        }}
                      >
                        <Box size={11} /> Assign to Shipment
                      </button>

                      <button
                        onClick={() => handleOpenCreateShipmentModal([row.id])}
                        className="btn btn-primary btn-xs"
                        style={{ backgroundColor: '#059669', borderColor: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.74rem' }}
                      >
                        <Plus size={11} /> New Shipment
                      </button>
                    </div>
                  )
                }
              ]}
              data={ordersAwaiting}
              loading={loading}
              emptyMessage={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No paid orders currently awaiting shipment allocation in {activeWarehouse}</div>}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ACTIVE SHIPMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'shipments' && (
        <div>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search shipment number, tracking AWB or vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            >
              {SHIPMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            >
              {CARRIER_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <SlidersHorizontal size={13} /> Filters
            </button>
          </div>

          {/* Advanced Location Filters Bar */}
          {showAdvancedFilters && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', flexWrap: 'wrap' }}>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.82rem', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
              >
                {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <input
                type="text"
                placeholder="Filter City..."
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.82rem', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', width: '130px' }}
              />

              <input
                type="text"
                placeholder="Pincode..."
                value={selectedPincode}
                onChange={(e) => setSelectedPincode(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.82rem', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', width: '100px' }}
              />

              <button
                onClick={() => {
                  setSelectedState('All States');
                  setSelectedCity('');
                  setSelectedPincode('');
                }}
                className="btn btn-outline btn-xs"
                style={{ alignSelf: 'center' }}
              >
                Reset Filters
              </button>
            </div>
          )}

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <DataTable
              columns={shipmentColumns}
              data={shipments}
              loading={loading}
              emptyMessage={
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <Truck size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No active shipments found for {activeWarehouse}</div>
                </div>
              }
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LOGISTICS TRUCKS / CONTAINERS */}
      {/* ========================================================================= */}
      {activeTab === 'containers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Logistics Fleet Units in <strong>{activeWarehouse}</strong>: <strong>{containers.length} Heavy EV Trucks & Containers</strong>
            </div>
            <button
              onClick={() => setShowCreateContainerModal(true)}
              className="btn btn-primary btn-sm"
              style={{ backgroundColor: '#059669', borderColor: '#059669', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              Provision Truck / Container
            </button>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <DataTable
              columns={[
                {
                  key: 'containerCode',
                  title: 'Truck / Container Code',
                  render: (row) => (
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Box size={14} style={{ color: '#2563eb' }} />
                        [{row.containerCode}]
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {row.vehicleNumber || 'EV Heavy Truck Fleet'}
                      </div>
                    </div>
                  )
                },
                {
                  key: 'originDest',
                  title: 'Warehouse & Corridor',
                  render: (row) => (
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{row.origin || 'Gujarat Hub'} → {row.destination || 'Destination Hub'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {row.route || 'Direct corridor'}
                      </div>
                    </div>
                  )
                },
                {
                  key: 'assignedDriver',
                  title: 'Assigned Driver',
                  render: (row) => (
                    <div>
                      {row.driverName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <UserCheck size={13} style={{ color: '#059669' }} />
                          {row.driverName} ({row.driverCode})
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Unassigned Driver</span>
                      )}
                    </div>
                  )
                },
                {
                  key: 'weightCapacity',
                  title: 'Weight Capacity',
                  render: (row) => renderCapacityBar(row.usedWeightKg, row.maxWeightKg, 'kg', 'Weight')
                },
                {
                  key: 'volumeCapacity',
                  title: 'Volume Capacity',
                  render: (row) => renderCapacityBar(row.usedVolumeM3, row.maxVolumeM3, 'm³', 'Volume')
                },
                {
                  key: 'shipments',
                  title: 'Assigned Loads',
                  render: (row) => (
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {row.shipmentCount || 0} Shipments Loaded
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {row.canAcceptShipments ? (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>● Accepting Loads</span>
                        ) : (
                          <span style={{ color: '#ef4444', fontWeight: 600 }}>● Full / Dispatched</span>
                        )}
                      </div>
                    </div>
                  )
                },
                {
                  key: 'status',
                  title: 'Status',
                  render: (row) => <StatusBadge status={row.status} />
                },
                {
                  key: 'actions',
                  title: 'Fleet Actions',
                  render: (row) => (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {row.status === 'OPEN' && (
                        <button
                          onClick={async () => {
                            try {
                              await fulfillmentApi.updateContainerStatus(row.id, 'FULL');
                              setSuccess(`Container [${row.containerCode}] marked FULL.`);
                              loadContainers();
                            } catch (err) {
                              setError(err.message || 'Failed to update status');
                            }
                          }}
                          className="btn btn-outline btn-xs"
                          style={{ color: '#d97706', borderColor: '#d97706', fontSize: '0.72rem' }}
                        >
                          Mark Full
                        </button>
                      )}

                      {(row.status === 'FULL' || row.status === 'READY_FOR_DISPATCH' || row.status === 'ASSIGNED') && (
                        <button
                          onClick={async () => {
                            try {
                              await fulfillmentApi.updateContainerStatus(row.id, 'IN_TRANSIT');
                              setSuccess(`Container [${row.containerCode}] dispatched into transit.`);
                              loadContainers();
                            } catch (err) {
                              setError(err.message || 'Failed to dispatch container');
                            }
                          }}
                          className="btn btn-primary btn-xs"
                          style={{ backgroundColor: '#0284c7', borderColor: '#0284c7', fontSize: '0.72rem' }}
                        >
                          Dispatch
                        </button>
                      )}
                    </div>
                  )
                }
              ]}
              data={containers}
              loading={loading}
              emptyMessage={<div style={{ padding: '40px', textAlign: 'center' }}>No logistics containers found in {activeWarehouse}</div>}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DRIVERS FLEET */}
      {/* ========================================================================= */}
      {activeTab === 'drivers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Registered Drivers in <strong>{activeWarehouse}</strong>: <strong>{drivers.length} Drivers</strong> ({availableDrivers.length} Available)
            </div>
            <button
              onClick={() => {
                setCreateDriverForm({
                  driverCode: `DR-${Date.now().toString().slice(-3)}`,
                  name: '',
                  phone: '',
                  licenseNumber: '',
                  warehouse: activeWarehouse !== 'All Warehouses' ? activeWarehouse : 'Gujarat Central Hub'
                });
                setShowCreateDriverModal(true);
              }}
              className="btn btn-primary btn-sm"
              style={{ backgroundColor: '#059669', borderColor: '#059669', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <UserPlus size={14} />
              Register New Driver
            </button>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <DataTable
              columns={[
                {
                  key: 'driverCode',
                  title: 'Driver Code & Name',
                  render: (row) => (
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserCheck size={15} style={{ color: '#059669' }} />
                        {row.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Code: [{row.driverCode}] • DL: {row.licenseNumber || 'Verified'}
                      </div>
                    </div>
                  )
                },
                {
                  key: 'phone',
                  title: 'Contact Phone',
                  render: (row) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: 600 }}>
                      <Phone size={13} style={{ color: '#059669' }} />
                      {row.phone}
                    </div>
                  )
                },
                {
                  key: 'warehouse',
                  title: 'Authorized Base Warehouse',
                  render: (row) => (
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      {row.warehouse || 'Gujarat Central Hub'}
                    </div>
                  )
                },
                {
                  key: 'assignedShipment',
                  title: 'Active Assignment',
                  render: (row) => (
                    <div>
                      {row.assignedShipmentId ? (
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563eb' }}>
                          Shipment #{row.assignedShipmentId}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Idle / Standby</span>
                      )}
                    </div>
                  )
                },
                {
                  key: 'status',
                  title: 'Driver Status',
                  render: (row) => {
                    const statusColorMap = {
                      AVAILABLE: { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669', label: 'AVAILABLE' },
                      ASSIGNED: { bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', label: 'ASSIGNED' },
                      ON_ROUTE: { bg: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', label: 'ON ROUTE' },
                      OFFLINE: { bg: 'rgba(156, 163, 175, 0.1)', color: '#6b7280', label: 'OFFLINE' }
                    };
                    const conf = statusColorMap[row.status] || statusColorMap.AVAILABLE;

                    return (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: conf.bg,
                        color: conf.color,
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        ● {conf.label}
                      </span>
                    );
                  }
                },
                {
                  key: 'actions',
                  title: 'Management Actions',
                  render: (row) => (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {row.status !== 'AVAILABLE' && (
                        <button
                          onClick={() => handleToggleDriverStatus(row, 'AVAILABLE')}
                          className="btn btn-outline btn-xs"
                          style={{ color: '#059669', borderColor: '#059669', fontSize: '0.72rem' }}
                        >
                          Mark Available
                        </button>
                      )}
                      {row.status === 'AVAILABLE' && (
                        <button
                          onClick={() => handleToggleDriverStatus(row, 'OFFLINE')}
                          className="btn btn-outline btn-xs"
                          style={{ color: '#6b7280', borderColor: '#6b7280', fontSize: '0.72rem' }}
                        >
                          Mark Offline
                        </button>
                      )}
                    </div>
                  )
                }
              ]}
              data={drivers}
              loading={loading}
              emptyMessage={<div style={{ padding: '40px', textAlign: 'center' }}>No drivers registered for {activeWarehouse}</div>}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: IN TRANSIT SHIPMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'in_transit' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          <DataTable
            columns={shipmentColumns}
            data={inTransitShipments}
            loading={loading}
            emptyMessage={
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <Navigation size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No shipments currently in transit</div>
              </div>
            }
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: OUT FOR DELIVERY SHIPMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'out_for_delivery' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          <DataTable
            columns={shipmentColumns}
            data={outForDeliveryShipments}
            loading={loading}
            emptyMessage={
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <MapPin size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No shipments currently out for final-mile delivery</div>
              </div>
            }
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: RETURNS & REVERSE LOGISTICS */}
      {/* ========================================================================= */}
      {activeTab === 'returns' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          <DataTable
            columns={[
              {
                key: 'returnId',
                title: 'Return ID & Order',
                render: (row) => (
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                      #RET-{row.id}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Order: #{row.order_id || row.orderId}
                    </div>
                  </div>
                )
              },
              {
                key: 'customer',
                title: 'Customer & Reason',
                render: (row) => (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                      {row.customer_username || row.customerUsername || 'Customer'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 500 }}>
                      Reason: {row.reason}
                    </div>
                    {row.condition_note && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Condition: {row.condition_note}
                      </div>
                    )}
                  </div>
                )
              },
              {
                key: 'refundAmount',
                title: 'Refund Value',
                render: (row) => (
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    ₹{Number(row.refund_amount || row.refundAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                )
              },
              {
                key: 'status',
                title: 'Inspection Status',
                render: (row) => <StatusBadge status={row.status} />
              },
              {
                key: 'actions',
                title: 'Inspection Actions',
                render: (row) => (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {row.status === 'RETURN_REQUESTED' && (
                      <>
                        <button
                          onClick={() => handleApproveReturn(row.id)}
                          className="btn btn-primary btn-xs"
                          style={{ backgroundColor: '#059669', borderColor: '#059669', fontSize: '0.72rem' }}
                        >
                          Approve Return
                        </button>
                        <button
                          onClick={() => {
                            setTargetReturnForReject(row);
                            setRejectionReasonText('');
                            setShowRejectModal(true);
                          }}
                          className="btn btn-outline btn-xs"
                          style={{ color: '#ef4444', borderColor: '#ef4444', fontSize: '0.72rem' }}
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {(row.status === 'RETURN_APPROVED' || row.status === 'RETURN_IN_TRANSIT') && (
                      <button
                        onClick={() => handleReceiveReturn(row.id)}
                        className="btn btn-primary btn-xs"
                        style={{ backgroundColor: '#2563eb', borderColor: '#2563eb', fontSize: '0.72rem' }}
                      >
                        Receive & Inspect
                      </button>
                    )}

                    {row.status === 'RETURNED' && (
                      <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={13} /> Completed & Refunded
                      </span>
                    )}
                  </div>
                )
              }
            ]}
            data={returnsList}
            loading={loading}
            emptyMessage={
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <RotateCcw size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No customer return requests pending inspection</div>
              </div>
            }
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ASSIGN ORDER TO EXISTING SHIPMENT (REUSE FIRST) */}
      {/* ========================================================================= */}
      {showAddOrderModal && (
        <Modal
          isOpen={showAddOrderModal}
          onClose={() => setShowAddOrderModal(false)}
          title={`Assign Order #${orderIdToAdd || 'Selected'} to Existing Open Shipment`}
          maxWidth="600px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '10px 12px', backgroundColor: 'rgba(5, 150, 105, 0.08)', borderRadius: '6px', border: '1px solid rgba(5, 150, 105, 0.2)', fontSize: '0.82rem' }}>
              <div style={{ fontWeight: 700, color: '#059669', marginBottom: '4px' }}>Warehouse Shipment Consolidation</div>
              <div>Select an open compatible shipment in <strong>{activeWarehouse}</strong> to batch with this order.</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                Order ID to Assign:
              </label>
              <input
                type="text"
                value={orderIdToAdd}
                onChange={(e) => setOrderIdToAdd(e.target.value)}
                placeholder="e.g. 101 or ORD-101"
                style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                Select Open Compatible Shipment:
              </label>
              {compatibleShipmentsForSingleOrder.length > 0 ? (
                <select
                  value={selectedShipmentIdForSingleAdd}
                  onChange={(e) => setSelectedShipmentIdForSingleAdd(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                >
                  {compatibleShipmentsForSingleOrder.map(s => (
                    <option key={s.id} value={s.id}>
                      #{s.shipmentNumber} — {s.destination} (Load: {s.usedWeight || '0'}/{s.maxWeight || '1000'} kg) • Truck: {s.containerCode || 'Unassigned'}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ padding: '10px', backgroundColor: 'var(--background)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  No open shipments found currently matching this order's destination. You can choose any open shipment below or create a new shipment.
                  <select
                    value={selectedShipmentIdForSingleAdd}
                    onChange={(e) => setSelectedShipmentIdForSingleAdd(e.target.value)}
                    style={{ width: '100%', marginTop: '6px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                  >
                    <option value="">-- Choose Any Open Shipment --</option>
                    {openWarehouseShipments.map(s => (
                      <option key={s.id} value={s.id}>
                        #{s.shipmentNumber} — {s.destination} (Load: {s.usedWeight || '0'}/{s.maxWeight || '1000'} kg)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {routeMismatchDetected && (
              <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                  <ShieldAlert size={16} /> Route Mismatch Exception
                </div>
                <p style={{ fontSize: '0.8rem', color: '#b91c1c', margin: '0 0 8px 0' }}>
                  {routeMismatchMsg || 'Order destination is outside the shipment route corridor.'}
                </p>

                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '4px' }}>
                  Exception Reason Required:
                </label>
                <select
                  value={selectedExceptionReason}
                  onChange={(e) => setSelectedExceptionReason(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.8rem' }}
                >
                  {EXCEPTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowAddOrderModal(false)} className="btn btn-outline btn-sm">Cancel</button>

              {routeMismatchDetected ? (
                <button
                  type="button"
                  onClick={() => handleAddSingleOrderSubmit(true)}
                  disabled={addOrderLoading}
                  className="btn btn-danger btn-sm"
                  style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
                >
                  {addOrderLoading ? 'Authorizing...' : 'Authorize Exception & Assign'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAddSingleOrderSubmit(false)}
                  disabled={addOrderLoading || !selectedShipmentIdForSingleAdd || !orderIdToAdd.trim()}
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                >
                  {addOrderLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BATCH ASSIGN SELECTED ORDERS TO EXISTING SHIPMENT */}
      {/* ========================================================================= */}
      {showBatchAssignModal && (
        <Modal
          isOpen={showBatchAssignModal}
          onClose={() => setShowBatchAssignModal(false)}
          title={`Batch Assign ${selectedOrdersData.count} Orders to Existing Shipment`}
          maxWidth="600px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '10px 12px', backgroundColor: 'var(--background)', borderRadius: '6px', fontSize: '0.82rem' }}>
              <div><strong>Orders Selected:</strong> {selectedOrderIds.map(id => `#ORD-${id}`).join(', ')}</div>
              <div><strong>Total Weight:</strong> {selectedOrdersData.totalWeight} kg • <strong>Total Volume:</strong> {selectedOrdersData.totalVolume} m³</div>
              <div><strong>Destination:</strong> {selectedOrdersData.primaryDestination}</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                Select Compatible Target Shipment:
              </label>
              <select
                value={selectedTargetShipmentIdForBatch}
                onChange={(e) => setSelectedTargetShipmentIdForBatch(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              >
                {batchCompatibleShipments.map(s => (
                  <option key={s.id} value={s.id}>
                    #{s.shipmentNumber} — {s.destination} (Avail: {s.remainingWeight || '0'} kg / {s.remainingVolume || '0'} m³) • Truck: {s.containerCode || 'Unassigned'}
                  </option>
                ))}
              </select>
            </div>

            {routeMismatchDetected && (
              <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                  <ShieldAlert size={16} /> Route Mismatch Warning
                </div>
                <p style={{ fontSize: '0.8rem', color: '#b91c1c', margin: '0 0 8px 0' }}>
                  {routeMismatchMsg || 'Some order destinations are outside the shipment route corridor.'}
                </p>

                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '4px' }}>
                  Exception Reason Required:
                </label>
                <select
                  value={selectedExceptionReason}
                  onChange={(e) => setSelectedExceptionReason(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.8rem' }}
                >
                  {EXCEPTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowBatchAssignModal(false)} className="btn btn-outline btn-sm">Cancel</button>

              {routeMismatchDetected ? (
                <button
                  type="button"
                  onClick={() => handleBatchAssignSubmit(true)}
                  disabled={batchAssignSubmitting}
                  className="btn btn-danger btn-sm"
                  style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
                >
                  {batchAssignSubmitting ? 'Authorizing...' : 'Authorize & Batch Assign'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBatchAssignSubmit(false)}
                  disabled={batchAssignSubmitting || !selectedTargetShipmentIdForBatch}
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                >
                  {batchAssignSubmitting ? 'Assigning...' : `Batch Assign ${selectedOrdersData.count} Orders`}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ASSIGN DRIVER & TRUCK TO SHIPMENT */}
      {/* ========================================================================= */}
      {showAssignDriverTruckModal && targetShipmentForDriverTruck && (
        <Modal
          isOpen={showAssignDriverTruckModal}
          onClose={() => setShowAssignDriverTruckModal(false)}
          title={`Allocate Driver & Truck — Shipment #${targetShipmentForDriverTruck.shipmentNumber}`}
          maxWidth="600px"
        >
          <form onSubmit={handleAssignDriverTruckSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '10px 12px', backgroundColor: 'var(--background)', borderRadius: '6px', fontSize: '0.82rem' }}>
              <div><strong>Corridor Route:</strong> {targetShipmentForDriverTruck.origin || activeWarehouse} → {targetShipmentForDriverTruck.destination}</div>
              <div><strong>Shipment Load:</strong> {targetShipmentForDriverTruck.usedWeight || '0'} kg / {targetShipmentForDriverTruck.usedVolume || '0'} m³</div>
              <div><strong>Assigned Orders:</strong> {targetShipmentForDriverTruck.assignedOrderCount || 1} orders</div>
            </div>

            {/* Select Driver */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                Select Available Driver ({activeWarehouse}):
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              >
                <option value="">-- Choose Driver (or assign later) --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    [{d.driverCode}] {d.name} ({d.phone}) — Status: {d.status}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Truck / Container */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                Select Available Logistics Heavy Truck / Container ({activeWarehouse}):
              </label>
              <select
                value={selectedTruckContainerId}
                onChange={(e) => setSelectedTruckContainerId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              >
                <option value="">-- Choose Truck / Container (or assign later) --</option>
                {containers.map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.containerCode}] {c.vehicleNumber || 'EV Heavy Truck'} — Cap: {c.maxWeightKg || '5000'} kg ({c.origin} → {c.destination})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowAssignDriverTruckModal(false)} className="btn btn-outline btn-sm">Cancel</button>
              <button
                type="submit"
                disabled={assigningDriverTruckLoading}
                className="btn btn-primary btn-sm"
                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              >
                {assigningDriverTruckLoading ? 'Allocating...' : 'Allocate Fleet Units'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CREATE MULTI-ORDER SHIPMENT */}
      {/* ========================================================================= */}
      {showCreateShipmentModal && (
        <Modal
          isOpen={showCreateShipmentModal}
          onClose={() => setShowCreateShipmentModal(false)}
          title={`Create Shipment (${createShipmentForm.targetOrderIds.length} Orders Allocated)`}
          maxWidth="680px"
        >
          <form onSubmit={handleCreateShipmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Orders summary chip bar */}
            <div style={{ padding: '10px 12px', backgroundColor: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Allocated Order References:
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {createShipmentForm.targetOrderIds.length > 0 ? (
                  createShipmentForm.targetOrderIds.map(id => (
                    <span
                      key={id}
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#059669',
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 600
                      }}
                    >
                      #ORD-{id}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Empty order pool (will create an open shipment buffer for future assignment)
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                  Origin Warehouse:
                </label>
                <select
                  value={createShipmentForm.origin}
                  onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, origin: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                >
                  {WAREHOUSE_OPTIONS.filter(w => w !== 'All Warehouses').map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                  Destination Hub / City:
                </label>
                <input
                  type="text"
                  value={createShipmentForm.destination}
                  onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, destination: e.target.value })}
                  placeholder="e.g. Bengaluru Central Fulfillment Hub"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                Planned Route Corridor:
              </label>
              <input
                type="text"
                value={createShipmentForm.route}
                onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, route: e.target.value })}
                placeholder="Gujarat Central Hub -> Maharashtra Logistics Hub -> Telangana Regional Hub -> Bengaluru Central Hub"
                style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                  Logistics Carrier:
                </label>
                <select
                  value={createShipmentForm.carrierName}
                  onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, carrierName: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                >
                  {CARRIER_OPTIONS.filter(c => c !== 'All Carriers').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                  Vehicle Plate / Type:
                </label>
                <input
                  type="text"
                  value={createShipmentForm.vehicleNumber}
                  onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, vehicleNumber: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                  Tracking Number / AWB:
                </label>
                <input
                  type="text"
                  value={createShipmentForm.trackingNumber}
                  onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, trackingNumber: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                  Assign to Truck/Container (Optional):
                </label>
                <select
                  value={createShipmentForm.containerId}
                  onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, containerId: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                >
                  <option value="">-- Unassigned / Allocate Later --</option>
                  {containers.filter(c => c.canAcceptShipments !== false).map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.containerCode}] ({c.origin} → {c.destination})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Route Mismatch Override Checkbox if required */}
            <div style={{ padding: '8px 12px', backgroundColor: 'var(--background)', borderRadius: '4px', border: '1px solid var(--border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={createShipmentForm.routeException}
                  onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, routeException: e.target.checked })}
                />
                Authorize Route / Destination Corridor Exception
              </label>

              {createShipmentForm.routeException && (
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter authorized route exception reason..."
                    value={createShipmentForm.exceptionReason}
                    onChange={(e) => setCreateShipmentForm({ ...createShipmentForm, exceptionReason: e.target.value })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowCreateShipmentModal(false)} className="btn btn-outline btn-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={shipmentSubmitting}
                className="btn btn-primary btn-sm"
                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              >
                {shipmentSubmitting ? 'Creating Shipment...' : 'Create & Allocate Shipment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PROVISION LOGISTICS CONTAINER / TRUCK */}
      {/* ========================================================================= */}
      {showCreateContainerModal && (
        <Modal
          isOpen={showCreateContainerModal}
          onClose={() => setShowCreateContainerModal(false)}
          title="Provision Logistics Heavy Truck / Container"
          maxWidth="600px"
        >
          <form onSubmit={handleCreateContainerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                Container / Fleet Unit Code:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TRUCK-104 or CONT-GUJ-BLR-02"
                value={createContainerForm.containerCode}
                onChange={(e) => setCreateContainerForm({ ...createContainerForm, containerCode: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                Vehicle Plate / Model:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MH-04-EV-8821 (EV 16T Heavy Carrier)"
                value={createContainerForm.vehicleNumber}
                onChange={(e) => setCreateContainerForm({ ...createContainerForm, vehicleNumber: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Origin Warehouse:</label>
                <select
                  value={createContainerForm.origin}
                  onChange={(e) => setCreateContainerForm({ ...createContainerForm, origin: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                >
                  {WAREHOUSE_OPTIONS.filter(w => w !== 'All Warehouses').map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Destination Hub:</label>
                <input
                  type="text"
                  required
                  value={createContainerForm.destination}
                  onChange={(e) => setCreateContainerForm({ ...createContainerForm, destination: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Route Corridor:</label>
              <input
                type="text"
                value={createContainerForm.route}
                onChange={(e) => setCreateContainerForm({ ...createContainerForm, route: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Max Weight Capacity (kg):</label>
                <input
                  type="number"
                  value={createContainerForm.maxWeightKg}
                  onChange={(e) => setCreateContainerForm({ ...createContainerForm, maxWeightKg: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Max Volume Capacity (m³):</label>
                <input
                  type="number"
                  value={createContainerForm.maxVolumeM3}
                  onChange={(e) => setCreateContainerForm({ ...createContainerForm, maxVolumeM3: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowCreateContainerModal(false)} className="btn btn-outline btn-sm">Cancel</button>
              <button type="submit" disabled={containerSubmitting} className="btn btn-primary btn-sm" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                {containerSubmitting ? 'Provisioning...' : 'Provision Truck'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: REGISTER NEW DRIVER */}
      {/* ========================================================================= */}
      {showCreateDriverModal && (
        <Modal
          isOpen={showCreateDriverModal}
          onClose={() => setShowCreateDriverModal(false)}
          title="Register Logistics Fleet Driver"
          maxWidth="560px"
        >
          <form onSubmit={handleCreateDriverSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Driver Code:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DR-104"
                  value={createDriverForm.driverCode}
                  onChange={(e) => setCreateDriverForm({ ...createDriverForm, driverCode: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anil Sharma"
                  value={createDriverForm.name}
                  onChange={(e) => setCreateDriverForm({ ...createDriverForm, name: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Phone Number:</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={createDriverForm.phone}
                  onChange={(e) => setCreateDriverForm({ ...createDriverForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>License Number:</label>
                <input
                  type="text"
                  placeholder="e.g. GJ-01-2021-008912"
                  value={createDriverForm.licenseNumber}
                  onChange={(e) => setCreateDriverForm({ ...createDriverForm, licenseNumber: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>Base Hub Warehouse:</label>
              <select
                value={createDriverForm.warehouse}
                onChange={(e) => setCreateDriverForm({ ...createDriverForm, warehouse: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
              >
                {WAREHOUSE_OPTIONS.filter(w => w !== 'All Warehouses').map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowCreateDriverModal(false)} className="btn btn-outline btn-sm">Cancel</button>
              <button type="submit" disabled={driverSubmitting} className="btn btn-primary btn-sm" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                {driverSubmitting ? 'Registering...' : 'Register Driver'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: DELIVERY OTP VERIFICATION */}
      {/* ========================================================================= */}
      {showOtpModal && otpTargetShipment && (
        <Modal
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          title={`Delivery OTP Verification - #${otpTargetShipment.shipmentNumber}`}
        >
          <form onSubmit={handleVerifyOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(5, 150, 105, 0.08)', border: '1px solid #059669', borderRadius: '6px', fontSize: '0.82rem', color: '#047857' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} /> Cryptographic Proof of Delivery
              </div>
              <div style={{ marginTop: '4px' }}>
                A 6-digit PIN has been dispatched to the customer. Ask the recipient for the PIN to complete delivery.
              </div>
            </div>

            {otpError && <div style={{ color: '#dc2626', fontSize: '0.82rem' }}>{otpError}</div>}
            {otpSuccess && <div style={{ color: '#059669', fontSize: '0.82rem' }}>{otpSuccess}</div>}

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                Enter Customer Delivery PIN:
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="6-digit PIN"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                style={{ width: '100%', fontSize: '1.25rem', letterSpacing: '4px', textAlign: 'center', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <button
                type="button"
                onClick={async () => {
                  setOtpSending(true);
                  try {
                    await fulfillmentApi.sendDeliveryOtp(otpTargetShipment.id);
                    setOtpSuccess('Fresh OTP sent to customer email.');
                    setOtpCooldown(45);
                  } catch (err) {
                    setOtpError(err.message || 'Failed to resend OTP');
                  } finally {
                    setOtpSending(false);
                  }
                }}
                disabled={otpCooldown > 0 || otpSending}
                style={{ background: 'none', border: 'none', color: otpCooldown > 0 ? 'var(--text-muted)' : '#059669', cursor: otpCooldown > 0 ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
              >
                {otpCooldown > 0 ? `Resend PIN in ${otpCooldown}s` : 'Resend PIN'}
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setShowOtpModal(false)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" disabled={otpVerifying || enteredOtp.length !== 6} className="btn btn-primary btn-sm" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                  {otpVerifying ? 'Verifying...' : 'Verify & Mark Delivered'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: TELEMETRY & ROUTE EXCEPTION AUDITS */}
      {/* ========================================================================= */}
      {showTrackingModal && selectedShipment && (
        <Modal
          isOpen={showTrackingModal}
          onClose={() => setShowTrackingModal(false)}
          title={`Telemetry & Route Audits - #${selectedShipment.shipmentNumber}`}
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Capacity Snapshot */}
            <div style={{ padding: '12px', backgroundColor: 'var(--background)', borderRadius: '6px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>Shipment Capacity Utilization</div>
              {renderCapacityBar(selectedShipment.usedWeight, selectedShipment.maxWeight, 'kg', 'Weight Capacity')}
              <div style={{ marginTop: '8px' }}>
                {renderCapacityBar(selectedShipment.usedVolume, selectedShipment.maxVolume, 'm³', 'Volume Capacity')}
              </div>
            </div>

            {/* Route Exceptions Audit */}
            {shipmentRouteExceptions.length > 0 && (
              <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1px solid #ef4444', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <ShieldAlert size={16} /> Route Exception Audits ({shipmentRouteExceptions.length})
                </div>
                {shipmentRouteExceptions.map((ex, idx) => (
                  <div key={idx} style={{ fontSize: '0.78rem', color: '#991b1b', borderTop: idx > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : 'none', paddingTop: idx > 0 ? '6px' : 0, marginTop: idx > 0 ? '6px' : 0 }}>
                    <div><strong>Order #{ex.orderId}:</strong> {ex.actualShipmentRoute} (Expected: {ex.expectedRoute})</div>
                    <div><strong>Authorized By:</strong> {ex.actorUsername} ({ex.actorRole})</div>
                    <div><strong>Reason:</strong> {ex.exceptionReason}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tracking Milestones */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Live Tracking Milestones</div>
              {trackingLoading ? (
                <div style={{ textAlign: 'center', padding: '16px' }}><RefreshCw size={20} className="spin" /></div>
              ) : shipmentTrackingHistory.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No tracking events recorded yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {shipmentTrackingHistory.map((ev, idx) => (
                    <div key={idx} style={{ padding: '8px', backgroundColor: 'var(--background)', borderRadius: '4px', fontSize: '0.78rem' }}>
                      <div style={{ fontWeight: 600 }}>{ev.status} • {ev.locationName}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{ev.description}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px' }}>{new Date(ev.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTrackingModal(false)} className="btn btn-outline btn-sm">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 9: REJECT RETURN */}
      {/* ========================================================================= */}
      {showRejectModal && targetReturnForReject && (
        <Modal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title={`Reject Return Request #RET-${targetReturnForReject.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Specify the reason why this return request does not satisfy the return policy criteria.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Rejection Reason:</label>
              <textarea
                rows={3}
                placeholder="e.g. Return window expired / Item returned does not match purchased product condition..."
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowRejectModal(false)} className="btn btn-outline btn-sm">Cancel</button>
              <button
                onClick={handleRejectReturnSubmit}
                disabled={returnProcessing || !rejectionReasonText.trim()}
                className="btn btn-danger btn-sm"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
              >
                {returnProcessing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FulfillmentPage;
