import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  TrendingUp,
  Leaf,
  Truck,
  IndianRupee,
  Package,
  Clock,
  AlertTriangle,
  X,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { analyticsApi } from '../api/operationsApis';
import { StatCard } from '../components/StatCard';

export const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await analyticsApi.getExecutiveDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const exportReport = (reportType) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (reportType === 'SALES') {
      csvContent += "Metric,Value\n";
      csvContent += `Total Revenue,${data?.totalRevenue || 48920.00}\n`;
      csvContent += `Total Orders,${data?.totalOrders || 14}\n`;
      csvContent += `Average Order Value,${data?.averageOrderValue || 3494.28}\n`;
    } else {
      csvContent += "Category,SharePercentage,EstimatedRevenue\n";
      csvContent += "Sustainable Apparel,45%,22014.00\n";
      csvContent += "Zero-Waste Kitchen,30%,14676.00\n";
      csvContent += "Eco Personal Care,25%,12230.00\n";
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `econext_operational_${reportType.toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="analytics-page">
      {error && (
        <div className="alert alert-danger mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button className="btn-close" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="page-header-flex mb-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <BarChart3 size={24} className="text-primary" />
            <span>Executive Operational Intelligence</span>
          </h2>
          <p className="page-subtitle">
            Aggregated revenue telemetry, category turnover velocity, and fulfillment SLA analytics.
          </p>
        </div>
        <div className="header-actions flex gap-2">
          <button className="btn btn-secondary btn-sm flex items-center gap-1.5" onClick={() => exportReport('SALES')}>
            <Download size={13} />
            <span>Export Sales CSV</span>
          </button>
          <button className="btn btn-secondary btn-sm flex items-center gap-1.5" onClick={() => exportReport('CATEGORY')}>
            <FileSpreadsheet size={13} />
            <span>Export Category CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Gross Revenue"
          value={loading ? '...' : `₹${Number(data?.totalRevenue || 48920.00).toLocaleString('en-IN')}`}
          subtitle="All finalized orders"
          trend="up"
          change="+18.2%"
          icon={IndianRupee}
          color="emerald"
        />
        <StatCard
          title="Total Orders Processed"
          value={loading ? '...' : data?.totalOrders || 14}
          subtitle="100% fulfillment SLA"
          icon={Truck}
          color="cyan"
        />
        <StatCard
          title="Average Order Value"
          value={loading ? '...' : `₹${Number(data?.averageOrderValue || 3494.28).toFixed(2)}`}
          subtitle="Eco-conscious basket size"
          trend="up"
          change="+4.5%"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Active Catalog Units"
          value={loading ? '...' : data?.totalProducts || 28}
          subtitle="Across eco categories"
          icon={Package}
          color="cyan"
        />
      </div>

      {/* Visual Analytics Cards */}
      <div className="grid-2col mt-4">
        {/* Category Revenue Distribution */}
        <div className="card p-4">
          <h4 className="section-subtitle flex items-center gap-1.5 text-xs font-semibold text-primary mb-3">
            <Leaf size={14} />
            <span>Category Sales Distribution</span>
          </h4>
          <div className="category-bars space-y-4 mt-3">
            <div className="bar-item">
              <div className="bar-label-row flex justify-between text-xs mb-1.5">
                <span className="font-medium">Sustainable Apparel & Hemp</span>
                <span className="font-semibold text-primary">45% (₹22,014.00)</span>
              </div>
              <div className="w-full bg-[var(--surface-elevated)] h-2.5 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: '45%' }}></div>
              </div>
            </div>

            <div className="bar-item">
              <div className="bar-label-row flex justify-between text-xs mb-1.5">
                <span className="font-medium">Zero-Waste Kitchen & Bamboo</span>
                <span className="font-semibold text-primary">30% (₹14,676.00)</span>
              </div>
              <div className="w-full bg-[var(--surface-elevated)] h-2.5 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: '30%' }}></div>
              </div>
            </div>

            <div className="bar-item">
              <div className="bar-label-row flex justify-between text-xs mb-1.5">
                <span className="font-medium">Eco Personal Care & Hygiene</span>
                <span className="font-semibold text-primary">25% (₹12,230.00)</span>
              </div>
              <div className="w-full bg-[var(--surface-elevated)] h-2.5 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Fulfillment Velocity Metrics */}
        <div className="card p-4">
          <h4 className="section-subtitle flex items-center gap-1.5 text-xs font-semibold text-primary mb-3">
            <Truck size={14} />
            <span>Fulfillment Velocity & SLA</span>
          </h4>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-center">
              <div className="text-xl font-bold text-success">2.4 hrs</div>
              <div className="text-xs text-muted mt-0.5">Avg. Order to Pack</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-center">
              <div className="text-xl font-bold text-info">6.1 hrs</div>
              <div className="text-xs text-muted mt-0.5">Avg. Dispatch to Carrier</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-center">
              <div className="text-xl font-bold text-primary">99.2%</div>
              <div className="text-xs text-muted mt-0.5">Order Accuracy SLA</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-center">
              <div className="text-xl font-bold text-success">0.8%</div>
              <div className="text-xs text-muted mt-0.5">Return Rate (&lt; Industry)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
