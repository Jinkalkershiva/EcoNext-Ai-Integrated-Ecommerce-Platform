import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeSelector } from './ThemeSelector';
import { UiScaleControl } from './UiScaleControl';
import { Menu, ChevronDown, LogOut, User, Settings, ShieldCheck, Activity } from 'lucide-react';

export const Header = ({ title, subtitle, onToggleSidebar }) => {
  const { staff, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const staffInitial = staff?.fullName
    ? staff.fullName.charAt(0).toUpperCase()
    : (staff?.username ? staff.username.charAt(0).toUpperCase() : 'A');

  return (
    <header className="admin-header">
      <div className="header-left">
        <button
          className="btn-icon mobile-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          <Menu size={18} />
        </button>
        <div className="header-page-info">
          <h1 className="header-title">{title || 'Operational Dashboard'}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="header-right">
        {/* Core Online Status */}
        <div className="status-indicator">
          <span className="pulse-dot"></span>
          <span className="status-label">Operational Core Online</span>
        </div>

        {/* UI Scale Zoom Control [ A- ] 100% [ A+ ] */}
        <UiScaleControl size="sm" />

        {/* 3-Mode Theme Selector */}
        <ThemeSelector size="sm" />

        {/* Staff Profile Dropdown */}
        <div className="profile-menu-container">
          <button
            className="profile-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-expanded={showProfileMenu}
            aria-label="Staff profile menu"
          >
            <div className="avatar-circle">
              {staffInitial}
            </div>
            <span className="profile-name">{staff?.fullName || staff?.username || 'Staff Member'}</span>
            <ChevronDown size={14} className="chevron" />
          </button>

          {showProfileMenu && (
            <div
              className="profile-dropdown"
              onClick={() => setShowProfileMenu(false)}
            >
              <div className="dropdown-header">
                <p className="dropdown-user-name">{staff?.fullName || staff?.username}</p>
                <p className="dropdown-user-email">{staff?.email || `${staff?.username}@econext.internal`}</p>
                <div className="dropdown-roles">
                  {staff?.roles?.map((r) => (
                    <span key={r} className="badge badge-emerald badge-xs">
                      {r.replace('ROLE_', '')}
                    </span>
                  ))}
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-item"
                onClick={() => navigate('/settings')}
              >
                <Settings size={15} /> Operational Settings
              </button>
              <button
                className="dropdown-item text-danger"
                onClick={logout}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
