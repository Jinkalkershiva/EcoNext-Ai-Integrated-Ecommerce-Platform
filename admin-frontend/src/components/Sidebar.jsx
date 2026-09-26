import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ isCollapsed, onToggle }) => {
  const { staff, hasPermission, isAdmin } = useAuth();

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      visible: true
    },
    {
      section: 'CATALOG & INVENTORY'
    },
    {
      label: 'Products',
      path: '/products',
      icon: '📦',
      visible: isAdmin() || hasPermission('CATALOG_VIEW')
    },
    {
      label: 'Categories',
      path: '/categories',
      icon: '🏷️',
      visible: isAdmin() || hasPermission('CATALOG_VIEW')
    },
    {
      label: 'Inventory Control',
      path: '/inventory',
      icon: '📈',
      visible: isAdmin() || hasPermission('INVENTORY_VIEW')
    },
    {
      section: 'OPERATIONS & FULFILLMENT'
    },
    {
      label: 'Order Lifecycle',
      path: '/orders',
      icon: '🚚',
      visible: isAdmin() || hasPermission('ORDER_VIEW')
    },
    {
      label: 'Bulk Import Wizard',
      path: '/import',
      icon: '📥',
      visible: isAdmin() || hasPermission('IMPORT_RUN')
    },
    {
      label: 'Live Ingestion Sources',
      path: '/sources',
      icon: '⚡',
      visible: isAdmin() || hasPermission('IMPORT_RUN') || hasPermission('ANALYTICS_VIEW')
    },
    {
      section: 'GOVERNANCE & INSIGHTS'
    },
    {
      label: 'Big Data & Hadoop',
      path: '/big-data',
      icon: '🌊',
      visible: isAdmin() || hasPermission('ANALYTICS_VIEW')
    },
    {
      label: 'Staff Directory',
      path: '/staff',
      icon: '👥',
      visible: isAdmin() || hasPermission('STAFF_VIEW')
    },
    {
      label: 'Roles & Security',
      path: '/roles',
      icon: '🛡️',
      visible: isAdmin() || hasPermission('STAFF_MANAGE')
    },
    {
      label: 'Analytics & KPIs',
      path: '/analytics',
      icon: '📈',
      visible: isAdmin() || hasPermission('ANALYTICS_VIEW')
    },
    {
      label: 'Audit Trail',
      path: '/audit-logs',
      icon: '📝',
      visible: isAdmin() || hasPermission('AUDIT_VIEW')
    }
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-badge">🌱</div>
          {!isCollapsed && (
            <div className="logo-text">
              <span className="logo-title">EcoNext Ops</span>
              <span className="logo-subtitle">Admin & Staff Portal</span>
            </div>
          )}
        </div>
        <button
          className="btn-icon collapse-btn"
          onClick={onToggle}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <div className="sidebar-nav">
        {navItems.map((item, idx) => {
          if (item.section) {
            if (isCollapsed) return null;
            return (
              <div key={`sec-${idx}`} className="nav-section-title">
                {item.section}
              </div>
            );
          }

          if (!item.visible) return null;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          );
        })}
      </div>

      <div className="sidebar-footer">
        {!isCollapsed && staff && (
          <div className="staff-pill">
            <div className="staff-avatar">
              {staff.fullName ? staff.fullName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="staff-info">
              <span className="staff-name">{staff.fullName || staff.username}</span>
              <span className="staff-role">
                {staff.roles && staff.roles.length > 0
                  ? staff.roles[0].replace('ROLE_', '')
                  : 'STAFF'}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
