import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeLampToggle } from './ThemeLampToggle';

export const Header = ({ title, subtitle, onToggleSidebar }) => {
  const { staff, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const staffInitial = staff?.fullName ? staff.fullName.charAt(0).toUpperCase() : (staff?.username ? staff.username.charAt(0).toUpperCase() : 'A');

  return (
    <header className="admin-header">
      <div className="header-left">
        <button
          className="btn-icon mobile-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          ☰
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

        {/* Theme Lamp Animation Toggle */}
        <ThemeLampToggle size="sm" />

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
            <span className="chevron">▾</span>
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
                    <span key={r} className="badge badge-pink badge-xs">
                      {r.replace('ROLE_', '')}
                    </span>
                  ))}
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-item text-danger"
                onClick={logout}
              >
                <span>🚪</span> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
