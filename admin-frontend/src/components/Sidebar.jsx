import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Tag,
  Layers,
  Truck,
  UploadCloud,
  Radio,
  Database,
  Users,
  UserCheck,
  CreditCard,
  Bell,
  ShieldCheck,
  BarChart3,
  FileText,
  Settings,
  Leaf,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const Sidebar = ({ isCollapsed, onToggle }) => {
  const { staff, hasPermission, isAdmin } = useAuth();

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      visible: true
    },
    {
      section: 'CATALOG & INVENTORY'
    },
    {
      label: 'Products',
      path: '/products',
      icon: Package,
      visible: isAdmin() || hasPermission('CATALOG_VIEW')
    },
    {
      label: 'Categories',
      path: '/categories',
      icon: Tag,
      visible: isAdmin() || hasPermission('CATALOG_VIEW')
    },
    {
      label: 'Inventory Control',
      path: '/inventory',
      icon: Layers,
      visible: isAdmin() || hasPermission('INVENTORY_VIEW')
    },
    {
      section: 'OPERATIONS & FULFILLMENT'
    },
    {
      label: 'Order Lifecycle',
      path: '/orders',
      icon: Truck,
      visible: isAdmin() || hasPermission('ORDER_VIEW')
    },
    {
      label: 'Customers',
      path: '/customers',
      icon: UserCheck,
      visible: isAdmin() || hasPermission('STAFF_VIEW')
    },
    {
      label: 'Payments',
      path: '/payments',
      icon: CreditCard,
      visible: isAdmin() || hasPermission('ANALYTICS_VIEW')
    },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: Bell,
      visible: isAdmin() || hasPermission('ORDER_VIEW')
    },
    {
      label: 'Bulk Import Wizard',
      path: '/import',
      icon: UploadCloud,
      visible: isAdmin() || hasPermission('IMPORT_RUN')
    },
    {
      label: 'Live Ingestion Sources',
      path: '/sources',
      icon: Radio,
      visible: isAdmin() || hasPermission('IMPORT_RUN') || hasPermission('ANALYTICS_VIEW')
    },
    {
      section: 'GOVERNANCE & INSIGHTS'
    },
    {
      label: 'Big Data & Hadoop',
      path: '/big-data',
      icon: Database,
      visible: isAdmin() || hasPermission('ANALYTICS_VIEW')
    },
    {
      label: 'Staff Directory',
      path: '/staff',
      icon: Users,
      visible: isAdmin() || hasPermission('STAFF_VIEW')
    },
    {
      label: 'Roles & Security',
      path: '/roles',
      icon: ShieldCheck,
      visible: isAdmin() || hasPermission('STAFF_MANAGE')
    },
    {
      label: 'Analytics & KPIs',
      path: '/analytics',
      icon: BarChart3,
      visible: isAdmin() || hasPermission('ANALYTICS_VIEW')
    },
    {
      label: 'Audit Trail',
      path: '/audit-logs',
      icon: FileText,
      visible: isAdmin() || hasPermission('AUDIT_VIEW')
    },
    {
      label: 'Settings & Theme',
      path: '/settings',
      icon: Settings,
      visible: true
    }
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-badge">
            <Leaf size={20} color="var(--primary-color)" />
          </div>
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
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
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

          const IconComponent = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <span className="nav-icon">
                <IconComponent size={18} />
              </span>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          );
        })}
      </div>

      <div className="sidebar-footer">
        {!isCollapsed && staff && (
          <div className="staff-pill">
            <div className="staff-avatar">
              {staff.fullName ? staff.fullName.charAt(0).toUpperCase() : (staff.username ? staff.username.charAt(0).toUpperCase() : 'S')}
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

export default Sidebar;
