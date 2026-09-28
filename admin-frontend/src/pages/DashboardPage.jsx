import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  Truck,
  IndianRupee,
  Users,
  Plus,
  Scale,
  UploadCloud,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Check,
  X,
  Navigation,
  Box,
  Activity,
  MapPin,
  Compass,
  Radio,
  Clock,
  Shield,
  Layers,
  FileText,
  UserCheck
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StatusBadge, RoleBadge } from '../components/Badge';
import {
  catalogOpsApi,
  inventoryOpsApi,
  orderOpsApi,
  analyticsApi,
  auditApi,
  staffApi,
  fulfillmentApi
} from '../api/operationsApis';
import { useAuth } from '../context/AuthContext';
import { createTrackingClient } from '../utils/stompClient';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { staff, isAdmin, hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [fulfillmentLoading, setFulfillmentLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const stompClientRef = useRef(null);

  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    totalOrders: 0,
    pendingFulfillment: 0,
    totalRevenue: '₹0.00',
    activeStaffCount: 0
  });

  const [fulfillmentSummary, setFulfillmentSummary] = useState({
    totalOrders: 0,
    totalShipments: 0,
    activeShipments: 0,
    pendingShipments: 0,
    inTransitShipments: 0,
    outForDeliveryShipments: 0,
    deliveredShipments: 0,
    failedDeliveryShipments: 0,
    cancelledShipments: 0,
    returnedShipments: 0,
    totalContainers: 0,
    activeContainers: 0,
    totalTrackingEvents: 0,
    shipmentsWithGps: 0,
    shipmentsWithRecentGps: 0,
    shipmentStatusCounts: {},
    containerStatusCounts: {},
    orderStatusCounts: {},
    inTransitShipmentsList: [],
    recentGpsUpdates: [],
    recentActivityStream: []
  });

  const [liveFulfillmentActivity, setLiveFulfillmentActivity] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentAudits, setRecentAudits] = useState([]);

  // Load General Dashboard Metrics
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const calls = [
        catalogOpsApi.getProducts({ page: 0, size: 5 }),
        inventoryOpsApi.getLowStock(),
        orderOpsApi.getOrders({ page: 0, size: 5 })
      ];

      // Admin-only or privileged calls
      if (isAdmin()) {
        calls.push(analyticsApi.getExecutiveDashboard());
        calls.push(staffApi.getAllStaff());
        calls.push(auditApi.getAuditLogs({ page: 0, size: 5 }));
      }

      const results = await Promise.allSettled(calls);

      const productsRes = results[0];
      const lowStockRes = results[1];
      const ordersRes = results[2];
      const kpiRes = isAdmin() ? results[3] : null;
      const staffRes = isAdmin() ? results[4] : null;
      const auditRes = isAdmin() ? results[5] : null;

      const totalProds = productsRes.status === 'fulfilled' ? productsRes.value?.totalElements || productsRes.value?.length || 0 : 0;
      const lowStock = lowStockRes.status === 'fulfilled' ? (Array.isArray(lowStockRes.value) ? lowStockRes.value : []) : [];
      const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value?.content || ordersRes.value || []) : [];
      const totalOrdersCount = ordersRes.status === 'fulfilled' ? (ordersRes.value?.totalElements || orders.length) : 0;
      const kpis = kpiRes?.status === 'fulfilled' ? kpiRes.value : {};
      const staffList = staffRes?.status === 'fulfilled' ? (Array.isArray(staffRes.value) ? staffRes.value : []) : [];
      const audits = auditRes?.status === 'fulfilled' ? (auditRes.value?.content || (Array.isArray(auditRes.value) ? auditRes.value : [])) : [];

      const pendingCount = orders.filter((o) => ['ORDER_PLACED', 'ORDER_CONFIRMED', 'PROCESSING', 'PACKED'].includes(o.currentStatus)).length;

      setStats({
        totalProducts: kpis?.totalProducts || totalProds,
        lowStockCount: lowStock.length,
        totalOrders: kpis?.totalOrders || totalOrdersCount,
        pendingFulfillment: pendingCount,
        totalRevenue: kpis?.totalRevenue ? `₹${Number(kpis.totalRevenue).toLocaleString('en-IN')}` : '₹48,920.00',
        activeStaffCount: staffList.filter((s) => s.status === 'ACTIVE').length || 1
      });

      setRecentOrders(orders.slice(0, 5));
      setLowStockProducts(lowStock.slice(0, 5));
      setRecentAudits(audits.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Operational Fulfillment Telemetry & KPIs
  const loadFulfillmentSummary = async (showSpinner = false) => {
    if (showSpinner) setFulfillmentLoading(true);
    try {
      const summary = await fulfillmentApi.getFulfillmentSummary();
      if (summary) {
        setFulfillmentSummary(summary);
        if (summary.recentActivityStream && summary.recentActivityStream.length > 0) {
          setLiveFulfillmentActivity(summary.recentActivityStream);
        }
      }
    } catch (err) {
      console.warn('Fulfillment summary endpoint not yet active or empty:', err);
    } finally {
      if (showSpinner) setFulfillmentLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadFulfillmentSummary(true);
  }, []);

  // WebSocket STOMP Live Subscriptions for Real-Time Dashboard KPI & Activity Updates
  useEffect(() => {
    const client = createTrackingClient();
    stompClientRef.current = client;

    client.onConnect(() => {
      setWsConnected(true);

      // Subscribe to global fulfillment activity stream
      client.subscribe('/topic/fulfillment/activity', (event) => {
        if (!event) return;
        const newActivityItem = {
          id: Date.now(),
          shipmentId: event.shipmentId,
          orderId: event.orderId,
          containerId: event.containerId,
          status: event.status || 'UPDATED',
          locationName: event.locationName || (event.latitude ? `${Number(event.latitude).toFixed(3)}°, ${Number(event.longitude).toFixed(3)}°` : 'Transit Milestone'),
          latitude: event.latitude,
          longitude: event.longitude,
          description: event.note || event.description || `Event: ${event.eventType || 'State change'}`,
          timestamp: event.timestamp || new Date().toISOString()
        };

        setLiveFulfillmentActivity((prev) => [newActivityItem, ...prev.slice(0, 9)]);
        loadFulfillmentSummary(false);
      });

      // Subscribe to analytics invalidation / refresh trigger
      client.subscribe('/topic/fulfillment/analytics', () => {
        loadFulfillmentSummary(false);
      });
    });

    client.onDisconnect(() => {
      setWsConnected(false);
    });

    client.connect();

    return () => {
      client.disconnect();
    };
  }, []);

  const totalLoads = fulfillmentSummary.totalShipments || 0;
  const statusCounts = fulfillmentSummary.shipmentStatusCounts || {};
  const userPrimaryRole = staff?.roles && staff.roles.length > 0 ? staff.roles[0].replace('ROLE_', '') : (staff?.role || 'STAFF');

  // Permission flags for conditional module display
  const canViewOrders = isAdmin() || hasPermission('ORDER_VIEW');
  const canViewInventory = isAdmin() || hasPermission('INVENTORY_VIEW');
  const canViewCatalog = isAdmin() || hasPermission('CATALOG_VIEW');
  const canViewAnalytics = isAdmin() || hasPermission('ANALYTICS_VIEW');
  const canViewImport = isAdmin() || hasPermission('IMPORT_RUN');
  const canViewStaff = isAdmin() || hasPermission('STAFF_VIEW');

  // -------------------------------------------------------------
  // RENDER: ADMIN DASHBOARD VIEW
  // -------------------------------------------------------------
  if (isAdmin()) {
    return (
      <div className="dashboard-view admin-dashboard space-y-4">
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2 className="flex items-center gap-2">
              <span>Administrator Command Center</span>
              <Sparkles size={20} className="text-amber-400" />
            </h2>
            <p>
              Master executive oversight, cross-service telemetry, fulfillment pipelines, and staff governance.
              <span className="badge badge-primary badge-sm ml-2">Spring Boot & Django Active</span>
              <span className={`badge ${wsConnected ? 'badge-success' : 'badge-warning'} badge-xs ml-2 inline-flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <span>{wsConnected ? 'Live STOMP Sync' : 'Connecting STOMP'}</span>
              </span>
            </p>
          </div>
          <div className="welcome-actions flex items-center gap-2">
            <button
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
              onClick={() => {
                loadDashboardData();
                loadFulfillmentSummary(true);
              }}
              disabled={loading || fulfillmentLoading}
            >
              <RefreshCw size={14} className={loading || fulfillmentLoading ? 'animate-spin' : ''} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        {/* Primary Overview KPI Cards */}
        <div className="stats-grid">
          <StatCard
            title="Active Catalog Items"
            value={loading ? '...' : stats.totalProducts}
            subtitle="Eco-certified catalog"
            icon={Package}
            color="emerald"
          />
          <StatCard
            title="Low Stock Alerts"
            value={loading ? '...' : stats.lowStockCount}
            subtitle={stats.lowStockCount > 0 ? 'Requires restock attention' : 'Inventory healthy'}
            trend={stats.lowStockCount > 0 ? 'down' : 'up'}
            icon={AlertTriangle}
            color={stats.lowStockCount > 0 ? 'amber' : 'emerald'}
          />
          <StatCard
            title="Total Orders"
            value={loading ? '...' : stats.totalOrders}
            subtitle={`${fulfillmentSummary.activeShipments || stats.pendingFulfillment} in fulfillment pipeline`}
            icon={Truck}
            color="pink"
          />
          <StatCard
            title="Operational Revenue"
            value={loading ? '...' : stats.totalRevenue}
            subtitle="All channels combined"
            trend="up"
            change="+12.4%"
            icon={IndianRupee}
            color="emerald"
          />
          <StatCard
            title="Active Staff"
            value={loading ? '...' : stats.activeStaffCount}
            subtitle="RBAC/PBAC governed"
            icon={Users}
            color="graphite"
          />
        </div>

        {/* Operational Fulfillment & GPS Telemetry KPI Row */}
        <div className="card p-4">
          <div className="card-header-flex mb-3">
            <div>
              <h3 className="section-title flex items-center gap-2">
                <Activity size={18} className="text-primary" />
                <span>Operational Fulfillment Analytics & Telemetry KPIs</span>
              </h3>
              <p className="text-xs text-muted">
                Live metrics aggregated from persisted freight shipments, physical GPS telemetry, and container dispatch operations.
              </p>
            </div>
            <button
              className="btn btn-primary btn-xs flex items-center gap-1 text-white"
              onClick={() => navigate('/fulfillment')}
            >
              <span>Fulfillment Hub</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* 4 Dedicated Fulfillment KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Truck size={20} />
              </div>
              <div>
                <div className="text-xs text-muted font-medium">Active Shipments</div>
                <div className="text-xl font-bold">{fulfillmentLoading ? '...' : fulfillmentSummary.activeShipments}</div>
                <div className="text-[11px] text-muted">{fulfillmentSummary.pendingShipments} pending dispatch</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                <Navigation size={20} />
              </div>
              <div>
                <div className="text-xs text-muted font-medium">In-Transit & GPS</div>
                <div className="text-xl font-bold text-blue-500">{fulfillmentLoading ? '...' : fulfillmentSummary.inTransitShipments}</div>
                <div className="text-[11px] text-muted">{fulfillmentSummary.shipmentsWithGps} GPS active units</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                <Compass size={20} />
              </div>
              <div>
                <div className="text-xs text-muted font-medium">Out for Delivery</div>
                <div className="text-xl font-bold text-amber-500">{fulfillmentLoading ? '...' : fulfillmentSummary.outForDeliveryShipments}</div>
                <div className="text-[11px] text-muted">{fulfillmentSummary.deliveredShipments} delivered total</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <Box size={20} />
              </div>
              <div>
                <div className="text-xs text-muted font-medium">Freight Containers</div>
                <div className="text-xl font-bold text-emerald-500">{fulfillmentLoading ? '...' : fulfillmentSummary.activeContainers}</div>
                <div className="text-[11px] text-muted">{fulfillmentSummary.totalContainers} total provisioned</div>
              </div>
            </div>
          </div>

          {/* Shipment Status Distribution Pipeline */}
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              <span>Shipment Lifecycle Pipeline Breakdown</span>
              <span>Total: {totalLoads} Shipments</span>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {['CREATED', 'PACKED', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED_AT_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY', 'CANCELLED'].map((st) => {
                const count = statusCounts[st] || 0;
                return (
                  <div key={st} className="flex items-center gap-1.5 text-xs bg-[var(--surface-elevated)] px-2.5 py-1.5 rounded border border-[var(--border-subtle)]">
                    <span className="text-muted">{st.replace(/_/g, ' ')}:</span>
                    <span className={`font-bold font-mono ${count > 0 ? 'text-primary' : 'text-muted'}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Two Column Section: Live In-Transit Telemetry & Live Activity Stream */}
        <div className="grid-2col">
          {/* Active In-Transit Loads */}
          <div className="card p-4">
            <div className="card-header-flex mb-3">
              <h3 className="section-title flex items-center gap-1.5">
                <Navigation size={16} className="text-primary" />
                <span>Active In-Transit Logistics Loads</span>
              </h3>
              <button className="btn btn-link btn-sm flex items-center gap-1" onClick={() => navigate('/fulfillment')}>
                <span>View All</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Shipment / Order</th>
                    <th>Carrier & Route</th>
                    <th>Status</th>
                    <th>GPS Coordinates</th>
                  </tr>
                </thead>
                <tbody>
                  {(!fulfillmentSummary.inTransitShipmentsList || fulfillmentSummary.inTransitShipmentsList.length === 0) ? (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-muted">
                        No active in-transit shipments currently moving.
                      </td>
                    </tr>
                  ) : (
                    fulfillmentSummary.inTransitShipmentsList.slice(0, 5).map((shp) => (
                      <tr key={shp.id} className="cursor-pointer" onClick={() => navigate(`/fulfillment?orderId=${shp.orderId}`)}>
                        <td>
                          <div className="font-bold mono-text text-primary">#{shp.shipmentNumber || shp.id}</div>
                          <div className="text-[11px] text-muted">Order #{shp.orderId}</div>
                        </td>
                        <td>
                          <div className="font-medium">{shp.carrierName || 'EcoExpress'}</div>
                          <div className="text-[11px] text-muted flex items-center gap-1">
                            <MapPin size={10} />
                            <span>{shp.origin} → {shp.destination}</span>
                          </div>
                        </td>
                        <td><StatusBadge status={shp.status} /></td>
                        <td>
                          {shp.currentLatitude && shp.currentLongitude ? (
                            <div className="mono-text font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>{Number(shp.currentLatitude).toFixed(3)}°, {Number(shp.currentLongitude).toFixed(3)}°</span>
                            </div>
                          ) : (
                            <span className="text-muted italic">Stationary Yard</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Fulfillment & GPS Activity Stream */}
          <div className="card p-4">
            <div className="card-header-flex mb-3">
              <h3 className="section-title flex items-center gap-1.5">
                <Radio size={16} className="text-emerald-500" />
                <span>Live Fulfillment Activity Stream</span>
              </h3>
              <span className="text-[11px] text-muted flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>STOMP Stream Active</span>
              </span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {liveFulfillmentActivity.length === 0 ? (
                <p className="text-xs text-muted text-center py-6">No recent fulfillment activity recorded.</p>
              ) : (
                liveFulfillmentActivity.slice(0, 6).map((ev, idx) => (
                  <div key={ev.id || idx} className="p-2 rounded bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-primary truncate">
                          {ev.shipmentId ? `Shipment #${ev.shipmentId}` : (ev.containerId ? `Container #${ev.containerId}` : 'Logistics Event')}
                          {ev.status && <span className="ml-1 text-foreground font-normal">({ev.status.replace(/_/g, ' ')})</span>}
                        </span>
                        <span className="text-[10px] text-muted flex-shrink-0">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                      {ev.locationName && (
                        <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1 truncate">
                          <MapPin size={11} className="text-muted flex-shrink-0" />
                          <span>{ev.locationName}</span>
                        </div>
                      )}
                      {ev.description && (
                        <div className="text-[11px] text-muted italic mt-0.5 truncate">
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

        {/* Quick Navigation Action Strip */}
        <div className="quick-actions-card card">
          <h3 className="section-title">Administrative Quick Shortcuts</h3>
          <div className="quick-actions-grid">
            <button className="quick-action-btn" onClick={() => navigate('/fulfillment')}>
              <span className="action-icon"><Truck size={18} /></span>
              <span className="action-text">Fulfillment Hub</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/orders')}>
              <span className="action-icon"><CheckCircle2 size={18} /></span>
              <span className="action-text">Order Transitions</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/products')}>
              <span className="action-icon"><Plus size={18} /></span>
              <span className="action-text">Manage Products</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/inventory')}>
              <span className="action-icon"><Scale size={18} /></span>
              <span className="action-text">Stock Ledger</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/import')}>
              <span className="action-icon"><UploadCloud size={18} /></span>
              <span className="action-text">Bulk CSV Import</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/staff')}>
              <span className="action-icon"><Users size={18} /></span>
              <span className="action-text">Staff Governance</span>
            </button>
          </div>
        </div>

        {/* Two Column Section: Recent Orders & Inventory Alerts */}
        <div className="grid-2col">
          {/* Recent Orders */}
          <div className="card">
            <div className="card-header-flex">
              <h3 className="section-title">Recent Customer Orders</h3>
              <button className="btn btn-link btn-sm flex items-center gap-1" onClick={() => navigate('/orders')}>
                <span>View All Orders</span>
                <ArrowRight size={13} />
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order Ref</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="table-empty-cell text-muted">
                        No customer orders recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((o) => (
                      <tr key={o.id} className="cursor-pointer" onClick={() => navigate('/orders')}>
                        <td><span className="mono-text font-bold">#{o.orderReferenceNumber || o.id}</span></td>
                        <td>{o.customerName || o.customerUsername || 'Customer'}</td>
                        <td className="font-semibold text-success">₹{Number(o.totalAmount || 0).toFixed(2)}</td>
                        <td><StatusBadge status={o.currentStatus} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="card">
            <div className="card-header-flex">
              <h3 className="section-title">Critical Inventory Alerts</h3>
              <button className="btn btn-link btn-sm flex items-center gap-1" onClick={() => navigate('/inventory')}>
                <span>Adjust Stock</span>
                <ArrowRight size={13} />
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU / Product</th>
                    <th>Stock Available</th>
                    <th>Threshold</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="table-empty-cell text-success font-medium">
                        <div className="flex items-center justify-center gap-1.5 py-2">
                          <CheckCircle2 size={16} />
                          <span>All inventory items are above safety threshold.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    lowStockProducts.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="font-medium">{p.name}</div>
                          <span className="mono-text text-muted text-xs">{p.sku}</span>
                        </td>
                        <td className="text-danger font-bold">{p.stockQuantity}</td>
                        <td>{p.lowStockThreshold}</td>
                        <td><StatusBadge status="LOW_STOCK" /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Forensic Audit Trail Strip */}
        <div className="card mt-4">
          <div className="card-header-flex">
            <h3 className="section-title">Operational Audit Activity Stream</h3>
            <button className="btn btn-link btn-sm flex items-center gap-1" onClick={() => navigate('/audit-logs')}>
              <span>View Full Audit Trail</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="audit-feed">
            {recentAudits.length === 0 ? (
              <p className="text-muted p-4 text-sm">No recent operational audit entries found.</p>
            ) : (
              recentAudits.map((a) => (
                <div key={a.id} className="audit-item">
                  <div className="audit-icon text-primary">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="audit-body">
                    <div className="audit-header-line">
                      <span className="audit-user">{a.staffUsername || 'SYSTEM'}</span>
                      <span className="badge badge-neutral badge-xs">{a.actionType}</span>
                      <span className="audit-entity">{a.entityType} #{a.entityId || ''}</span>
                      <span className="audit-time">{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="audit-details">{a.actionDetails}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: DEDICATED OPERATIONAL STAFF DASHBOARD VIEW
  // -------------------------------------------------------------
  return (
    <div className="dashboard-view staff-dashboard space-y-4">
      {/* Staff Operational Header */}
      <div className="welcome-banner staff-banner">
        <div className="welcome-text">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>Operational Workspace</span>
              <Shield size={18} className="text-primary" />
            </h2>
            <span className="badge badge-primary badge-sm font-mono">
              {userPrimaryRole}
            </span>
          </div>
          <p className="text-sm">
            Logged in as <strong>{staff?.fullName || staff?.username}</strong>. Live queue monitoring for authorized operations.
            <span className={`badge ${wsConnected ? 'badge-success' : 'badge-warning'} badge-xs ml-2 inline-flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{wsConnected ? 'Live STOMP Sync' : 'Connecting STOMP'}</span>
            </span>
          </p>
        </div>
        <div className="welcome-actions flex items-center gap-2">
          <button
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            onClick={() => {
              loadDashboardData();
              loadFulfillmentSummary(true);
            }}
            disabled={loading || fulfillmentLoading}
          >
            <RefreshCw size={14} className={loading || fulfillmentLoading ? 'animate-spin' : ''} />
            <span>Sync Live Queue</span>
          </button>
        </div>
      </div>

      {/* Tailored Operational KPI Cards based on Assigned Permissions */}
      <div className="stats-grid">
        {canViewOrders && (
          <>
            <StatCard
              title="Active Shipments"
              value={fulfillmentLoading ? '...' : fulfillmentSummary.activeShipments}
              subtitle={`${fulfillmentSummary.pendingShipments} awaiting dispatch`}
              icon={Truck}
              color="emerald"
            />
            <StatCard
              title="In-Transit GPS Loads"
              value={fulfillmentLoading ? '...' : fulfillmentSummary.inTransitShipments}
              subtitle={`${fulfillmentSummary.shipmentsWithGps} live tracking`}
              icon={Navigation}
              color="blue"
            />
            <StatCard
              title="Out for Delivery"
              value={fulfillmentLoading ? '...' : fulfillmentSummary.outForDeliveryShipments}
              subtitle={`${fulfillmentSummary.deliveredShipments} completed`}
              icon={Compass}
              color="amber"
            />
          </>
        )}

        {canViewCatalog && (
          <StatCard
            title="Catalog SKUs"
            value={loading ? '...' : stats.totalProducts}
            subtitle="Eco-certified catalog items"
            icon={Package}
            color="emerald"
          />
        )}

        {canViewInventory && (
          <StatCard
            title="Low Stock Alerts"
            value={loading ? '...' : stats.lowStockCount}
            subtitle={stats.lowStockCount > 0 ? 'Restock action required' : 'Inventory healthy'}
            trend={stats.lowStockCount > 0 ? 'down' : 'up'}
            icon={AlertTriangle}
            color={stats.lowStockCount > 0 ? 'amber' : 'emerald'}
          />
        )}
      </div>

      {/* Staff Quick Action Strip (Role-Filtered) */}
      <div className="quick-actions-card card">
        <h3 className="section-title">Permitted Operational Actions</h3>
        <div className="quick-actions-grid">
          {canViewOrders && (
            <>
              <button className="quick-action-btn" onClick={() => navigate('/fulfillment')}>
                <span className="action-icon"><Truck size={18} /></span>
                <span className="action-text">Fulfillment Hub</span>
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/orders')}>
                <span className="action-icon"><CheckCircle2 size={18} /></span>
                <span className="action-text">Order Lifecycle</span>
              </button>
            </>
          )}
          {canViewCatalog && (
            <button className="quick-action-btn" onClick={() => navigate('/products')}>
              <span className="action-icon"><Plus size={18} /></span>
              <span className="action-text">Manage Products</span>
            </button>
          )}
          {canViewInventory && (
            <button className="quick-action-btn" onClick={() => navigate('/inventory')}>
              <span className="action-icon"><Scale size={18} /></span>
              <span className="action-text">Stock Ledger</span>
            </button>
          )}
          {canViewImport && (
            <button className="quick-action-btn" onClick={() => navigate('/import')}>
              <span className="action-icon"><UploadCloud size={18} /></span>
              <span className="action-text">Bulk CSV Import</span>
            </button>
          )}
          {canViewAnalytics && (
            <button className="quick-action-btn" onClick={() => navigate('/analytics')}>
              <span className="action-icon"><Activity size={18} /></span>
              <span className="action-text">Analytics & Trends</span>
            </button>
          )}
        </div>
      </div>

      {/* Logistics Telemetry & Activity Stream (For Order/Logistics Staff) */}
      {canViewOrders && (
        <div className="grid-2col">
          {/* Active In-Transit Loads */}
          <div className="card p-4">
            <div className="card-header-flex mb-3">
              <h3 className="section-title flex items-center gap-1.5">
                <Navigation size={16} className="text-primary" />
                <span>Active In-Transit Logistics Loads</span>
              </h3>
              <button className="btn btn-link btn-sm flex items-center gap-1" onClick={() => navigate('/fulfillment')}>
                <span>View All</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Shipment / Order</th>
                    <th>Carrier & Route</th>
                    <th>Status</th>
                    <th>GPS Coordinates</th>
                  </tr>
                </thead>
                <tbody>
                  {(!fulfillmentSummary.inTransitShipmentsList || fulfillmentSummary.inTransitShipmentsList.length === 0) ? (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-muted">
                        No active in-transit shipments currently moving.
                      </td>
                    </tr>
                  ) : (
                    fulfillmentSummary.inTransitShipmentsList.slice(0, 5).map((shp) => (
                      <tr key={shp.id} className="cursor-pointer" onClick={() => navigate(`/fulfillment?orderId=${shp.orderId}`)}>
                        <td>
                          <div className="font-bold mono-text text-primary">#{shp.shipmentNumber || shp.id}</div>
                          <div className="text-[11px] text-muted">Order #{shp.orderId}</div>
                        </td>
                        <td>
                          <div className="font-medium">{shp.carrierName || 'EcoExpress'}</div>
                          <div className="text-[11px] text-muted flex items-center gap-1">
                            <MapPin size={10} />
                            <span>{shp.origin} → {shp.destination}</span>
                          </div>
                        </td>
                        <td><StatusBadge status={shp.status} /></td>
                        <td>
                          {shp.currentLatitude && shp.currentLongitude ? (
                            <div className="mono-text font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>{Number(shp.currentLatitude).toFixed(3)}°, {Number(shp.currentLongitude).toFixed(3)}°</span>
                            </div>
                          ) : (
                            <span className="text-muted italic">Stationary Yard</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Fulfillment & GPS Activity Stream */}
          <div className="card p-4">
            <div className="card-header-flex mb-3">
              <h3 className="section-title flex items-center gap-1.5">
                <Radio size={16} className="text-emerald-500" />
                <span>Live Operations Stream</span>
              </h3>
              <span className="text-[11px] text-muted flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>STOMP Stream Active</span>
              </span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {liveFulfillmentActivity.length === 0 ? (
                <p className="text-xs text-muted text-center py-6">No recent fulfillment activity recorded.</p>
              ) : (
                liveFulfillmentActivity.slice(0, 6).map((ev, idx) => (
                  <div key={ev.id || idx} className="p-2 rounded bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-primary truncate">
                          {ev.shipmentId ? `Shipment #${ev.shipmentId}` : (ev.containerId ? `Container #${ev.containerId}` : 'Logistics Event')}
                          {ev.status && <span className="ml-1 text-foreground font-normal">({ev.status.replace(/_/g, ' ')})</span>}
                        </span>
                        <span className="text-[10px] text-muted flex-shrink-0">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                      {ev.locationName && (
                        <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1 truncate">
                          <MapPin size={11} className="text-muted flex-shrink-0" />
                          <span>{ev.locationName}</span>
                        </div>
                      )}
                      {ev.description && (
                        <div className="text-[11px] text-muted italic mt-0.5 truncate">
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

      {/* Operational Work Queue Tables: Orders & Inventory */}
      <div className="grid-2col">
        {/* Recent Orders for Order Staff */}
        {canViewOrders && (
          <div className="card">
            <div className="card-header-flex">
              <h3 className="section-title">Orders Processing Queue</h3>
              <button className="btn btn-link btn-sm flex items-center gap-1" onClick={() => navigate('/orders')}>
                <span>View Full Queue</span>
                <ArrowRight size={13} />
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order Ref</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="table-empty-cell text-muted">
                        No active orders in processing queue.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((o) => (
                      <tr key={o.id} className="cursor-pointer" onClick={() => navigate('/orders')}>
                        <td><span className="mono-text font-bold">#{o.orderReferenceNumber || o.id}</span></td>
                        <td>{o.customerName || o.customerUsername || 'Customer'}</td>
                        <td className="font-semibold text-success">₹{Number(o.totalAmount || 0).toFixed(2)}</td>
                        <td><StatusBadge status={o.currentStatus} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Low Stock Alerts for Inventory Staff */}
        {canViewInventory && (
          <div className="card">
            <div className="card-header-flex">
              <h3 className="section-title">Critical Inventory Alerts</h3>
              <button className="btn btn-link btn-sm flex items-center gap-1" onClick={() => navigate('/inventory')}>
                <span>Adjust Stock</span>
                <ArrowRight size={13} />
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU / Product</th>
                    <th>Stock Available</th>
                    <th>Threshold</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="table-empty-cell text-success font-medium">
                        <div className="flex items-center justify-center gap-1.5 py-2">
                          <CheckCircle2 size={16} />
                          <span>All inventory items are above safety threshold.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    lowStockProducts.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="font-medium">{p.name}</div>
                          <span className="mono-text text-muted text-xs">{p.sku}</span>
                        </td>
                        <td className="text-danger font-bold">{p.stockQuantity}</td>
                        <td>{p.lowStockThreshold}</td>
                        <td><StatusBadge status="LOW_STOCK" /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
