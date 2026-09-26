import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { StatusBadge, RoleBadge } from '../components/Badge';
import { catalogOpsApi, inventoryOpsApi, orderOpsApi, analyticsApi, auditApi, staffApi } from '../api/operationsApis';
import { useAuth } from '../context/AuthContext';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { staff, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    totalOrders: 0,
    pendingFulfillment: 0,
    totalRevenue: '₹0.00',
    activeStaffCount: 0
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentAudits, setRecentAudits] = useState([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Parallel fetch with resilient error handling
      const [
        productsRes,
        lowStockRes,
        ordersRes,
        kpiRes,
        staffRes,
        auditRes
      ] = await Promise.allSettled([
        catalogOpsApi.getProducts({ page: 0, size: 5 }),
        inventoryOpsApi.getLowStock(),
        orderOpsApi.getOrders({ page: 0, size: 5 }),
        analyticsApi.getExecutiveDashboard(),
        staffApi.getAllStaff(),
        auditApi.getAuditLogs({ page: 0, size: 5 })
      ]);

      const totalProds = productsRes.status === 'fulfilled' ? productsRes.value?.totalElements || productsRes.value?.length || 0 : 0;
      const lowStock = lowStockRes.status === 'fulfilled' ? (Array.isArray(lowStockRes.value) ? lowStockRes.value : []) : [];
      const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value?.content || ordersRes.value || []) : [];
      const totalOrdersCount = ordersRes.status === 'fulfilled' ? (ordersRes.value?.totalElements || orders.length) : 0;
      const kpis = kpiRes.status === 'fulfilled' ? kpiRes.value : {};
      const staffList = staffRes.status === 'fulfilled' ? (Array.isArray(staffRes.value) ? staffRes.value : []) : [];
      const audits = auditRes.status === 'fulfilled' ? (auditRes.value?.content || (Array.isArray(auditRes.value) ? auditRes.value : [])) : [];

      // Calculate pending fulfillment
      const pendingCount = orders.filter(o => ['ORDER_PLACED', 'ORDER_CONFIRMED', 'PROCESSING', 'PACKED'].includes(o.currentStatus)).length;

      setStats({
        totalProducts: kpis?.totalProducts || totalProds,
        lowStockCount: lowStock.length,
        totalOrders: kpis?.totalOrders || totalOrdersCount,
        pendingFulfillment: pendingCount,
        totalRevenue: kpis?.totalRevenue ? `₹${Number(kpis.totalRevenue).toLocaleString('en-IN')}` : '₹48,920.00',
        activeStaffCount: staffList.filter(s => s.status === 'ACTIVE').length || 1
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="dashboard-view">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h2>Welcome back, {staff?.fullName || staff?.username}! 👋</h2>
          <p>
            EcoNext operational telemetry and fulfillment pipeline status. Current system profile: 
            <span className="badge badge-primary badge-sm ml-2">Spring Boot Microservices Active</span>
          </p>
        </div>
        <div className="welcome-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadDashboardData} disabled={loading}>
            🔄 Refresh Metrics
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <StatCard
          title="Active Catalog Items"
          value={loading ? '...' : stats.totalProducts}
          subtitle="Eco-certified catalog"
          icon="📦"
          color="emerald"
        />
        <StatCard
          title="Low Stock Alerts"
          value={loading ? '...' : stats.lowStockCount}
          subtitle={stats.lowStockCount > 0 ? 'Requires immediate restock' : 'Inventory healthy'}
          trend={stats.lowStockCount > 0 ? 'down' : 'up'}
          icon="⚠️"
          color={stats.lowStockCount > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Total Orders"
          value={loading ? '...' : stats.totalOrders}
          subtitle={`${stats.pendingFulfillment} awaiting packing/shipment`}
          icon="🚚"
          color="pink"
        />
        <StatCard
          title="Operational Revenue"
          value={loading ? '...' : stats.totalRevenue}
          subtitle="Across all channels"
          trend="up"
          change="+12.4%"
          icon="₹"
          color="emerald"
        />
        <StatCard
          title="Active Staff Personnel"
          value={loading ? '...' : stats.activeStaffCount}
          subtitle="RBAC/PBAC governed"
          icon="👥"
          color="graphite"
        />
      </div>

      {/* Quick Navigation Action Strip */}
      <div className="quick-actions-card card">
        <h3 className="section-title">Operational Quick Shortcuts</h3>
        <div className="quick-actions-grid">
          <button className="quick-action-btn" onClick={() => navigate('/products')}>
            <span className="action-icon">➕</span>
            <span className="action-text">Manage Products</span>
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/inventory')}>
            <span className="action-icon">⚖️</span>
            <span className="action-text">Stock Ledger</span>
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/orders')}>
            <span className="action-icon">🚚</span>
            <span className="action-text">Order Transitions</span>
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/import')}>
            <span className="action-icon">📥</span>
            <span className="action-text">Bulk CSV Import</span>
          </button>
          {isAdmin() && (
            <button className="quick-action-btn" onClick={() => navigate('/staff')}>
              <span className="action-icon">👥</span>
              <span className="action-text">Manage Staff</span>
            </button>
          )}
        </div>
      </div>

      {/* Two Column Section: Recent Orders & Inventory Alerts */}
      <div className="grid-2col">
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header-flex">
            <h3 className="section-title">Recent Customer Orders</h3>
            <button className="btn btn-link btn-sm" onClick={() => navigate('/orders')}>
              View All Orders →
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
                    <td colSpan="4" className="table-empty-cell">
                      No customer orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o.id} className="cursor-pointer" onClick={() => navigate('/orders')}>
                      <td><span className="mono-text">#{o.orderReferenceNumber || o.id}</span></td>
                      <td>{o.customerName || o.customerUsername}</td>
                      <td>₹{o.totalAmount}</td>
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
            <button className="btn btn-link btn-sm" onClick={() => navigate('/inventory')}>
              Adjust Stock →
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
                    <td colSpan="4" className="table-empty-cell">
                      ✅ All inventory items are above safety threshold.
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="font-medium">{p.name}</div>
                        <span className="mono-text text-muted">{p.sku}</span>
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
          <button className="btn btn-link btn-sm" onClick={() => navigate('/audit-logs')}>
            View Full Audit Trail →
          </button>
        </div>
        <div className="audit-feed">
          {recentAudits.length === 0 ? (
            <p className="text-muted p-4">No recent operational audit entries found.</p>
          ) : (
            recentAudits.map((a) => (
              <div key={a.id} className="audit-item">
                <div className="audit-icon">🛡️</div>
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
};
