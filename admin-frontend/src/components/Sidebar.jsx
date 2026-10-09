import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Tag,
  Layers,
  Truck,
  Navigation,
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
  ChevronRight,
  Crown,
  Eye,
  X
} from 'lucide-react';

export const Sidebar = ({ isCollapsed, onToggle }) => {
  const { staff, hasPermission, isAdmin, isSuperAdmin, previewRole, exitPreview } = useAuth();
  const isDriver = staff?.role === 'ROLE_DRIVER' || staff?.roles?.includes('ROLE_DRIVER');

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
      icon: FileText,
      visible: isAdmin() || hasPermission('ORDER_VIEW')
    },
    {
      label: 'Fulfillment & GPS',
      path: '/fulfillment',
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
      section: 'GOVERNANCE & INSIGHTS'
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
      label: 'SQL Query Console',
      path: '/query-console',
      icon: Database,
      visible: isAdmin() || hasPermission('AUDIT_VIEW') || hasPermission('DATABASE_QUERY_READ')
    },
    {
      label: 'Settings & Theme',
      path: '/settings',
      icon: Settings,
      visible: true
    }
  ];

  // Filter nav items and only show section headers if at least one item underneath is visible
  const visibleNavItems = navItems.filter((item, index, array) => {
    // If user is Driver, isolate strictly to Dashboard and Settings
    if (isDriver && !['Dashboard', 'Settings & Theme'].includes(item.label) && !item.section) {
      return false;
    }

    if (item.section) {
      if (isCollapsed || isDriver) return false;
      for (let i = index + 1; i < array.length; i++) {
        if (array[i].section) break;
        if (array[i].visible) return true;
      }
      return false;
    }
    return item.visible;
  });

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-badge">
            <Leaf size={20} color="var(--primary-color)" />
          </div>
          {!isCollapsed && (
            <div className="logo-text">
              <span className="logo-title flex items-center gap-1.5">
                EcoNext Ops
                {isSuperAdmin() && !previewRole && (
                  <Crown size={14} className="text-amber-500 fill-amber-500 inline" title="Platform Owner (Super Admin)" />
                )}
              </span>
              <span className="logo-subtitle">
                {isSuperAdmin() && !previewRole ? 'Platform Owner Console' : 'Staff Operational Portal'}
              </span>
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

      {/* Role Preview Emulation Banner */}
      {!isCollapsed && previewRole && (
        <div className="mx-2 mb-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 truncate">
            <Eye size={12} className="flex-shrink-0" />
            <span className="truncate">Preview: <strong>{previewRole.replace('ROLE_', '')}</strong></span>
          </div>
          <button
            onClick={exitPreview}
            className="btn btn-ghost btn-xs p-0.5 text-amber-600 hover:text-amber-800 dark:text-amber-400"
            title="Exit Role Preview"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="sidebar-nav">
        {visibleNavItems.map((item, idx) => {
          if (item.section) {
            return (
              <div key={`sec-${idx}`} className="nav-section-title">
                {item.section}
              </div>
            );
          }

          const IconComponent = item.icon;
          const displayLabel = (item.label === 'Dashboard' && isDriver) ? 'My Delivery Tasks' : item.label;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              title={isCollapsed ? displayLabel : undefined}
            >
              <span className="nav-icon">
                <IconComponent size={18} />
              </span>
              {!isCollapsed && <span className="nav-label">{displayLabel}</span>}
            </NavLink>
          );
        })}
      </div>

      <div className="sidebar-footer">
        {!isCollapsed && staff && (
          <div className={`staff-pill ${isSuperAdmin() && !previewRole ? 'border border-amber-500/30 bg-amber-500/5' : ''}`}>
            <div className={`staff-avatar ${isSuperAdmin() && !previewRole ? 'bg-amber-500 text-white font-bold' : ''}`}>
              {isSuperAdmin() && !previewRole ? (
                <Crown size={14} className="fill-white" />
              ) : (
                staff.fullName ? staff.fullName.charAt(0).toUpperCase() : (staff.username ? staff.username.charAt(0).toUpperCase() : 'S')
              )}
            </div>
            <div className="staff-info">
              <span className="staff-name flex items-center gap-1">
                {staff.fullName || staff.username}
              </span>
              <span className="staff-role font-mono text-[10px]">
                {previewRole ? (
                  <span className="text-amber-600 dark:text-amber-400">EMULATING {previewRole.replace('ROLE_', '')}</span>
                ) : isSuperAdmin() ? (
                  <span className="text-amber-600 dark:text-amber-400 font-bold">SUPER ADMIN</span>
                ) : (
                  staff.roles && staff.roles.length > 0
                    ? staff.roles[0].replace('ROLE_', '')
                    : 'STAFF'
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
