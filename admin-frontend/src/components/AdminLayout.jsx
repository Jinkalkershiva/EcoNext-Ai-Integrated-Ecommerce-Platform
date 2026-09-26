import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const pageMetaMap = {
  '/dashboard': { title: 'Operational Command Center', subtitle: 'Real-time telemetry, revenue metrics, and high-priority alerts' },
  '/staff': { title: 'Staff Directory & Access Control', subtitle: 'Manage operational personnel, assign roles, and configure system access' },
  '/roles': { title: 'Role & Permission Governance', subtitle: 'Fine-grained policy configuration across operational domains' },
  '/products': { title: 'Product Catalog Management', subtitle: 'Manage active catalog items, sustainability metrics, and pricing' },
  '/categories': { title: 'Catalog Categories', subtitle: 'Hierarchy and taxonomy management for eco-friendly product lines' },
  '/inventory': { title: 'Inventory & Stock Operations', subtitle: 'Real-time warehouse stock tracking, threshold alerts, and ledger adjustments' },
  '/orders': { title: 'Order Lifecycle & Fulfillment', subtitle: '10-stage state machine tracking and carrier updates' },
  '/import': { title: 'Bulk Data Import Wizard', subtitle: 'Multi-stage CSV/Excel ingestion, validation preview, and batch processing' },
  '/analytics': { title: 'Operational Intelligence & KPIs', subtitle: 'Business analytics, fulfillment velocity, and exportable reports' },
  '/audit-logs': { title: 'Immutable Audit Trail', subtitle: 'Complete forensic log of staff actions, security events, and data modifications' }
};

export const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const currentMeta = pageMetaMap[location.pathname] || {
    title: 'EcoNext Operational Management',
    subtitle: 'Admin & Staff Control Platform'
  };

  return (
    <div className={`admin-app-container ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar isCollapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="main-content-wrapper">
        <Header
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          onToggleSidebar={() => setCollapsed(!collapsed)}
        />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
