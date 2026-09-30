import React, { useState } from 'react';
import { Leaf, Search, Camera, ShoppingBag, User, LogOut, Menu, X, Sparkles, SlidersHorizontal, ChevronDown, LayoutDashboard, Truck, TrendingUp } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';
import NotificationDrawer from '../notifications/NotificationDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import './Navbar.css';

export const Navbar = () => {
  const { page, params, navigateTo } = useNavigation();
  const { cartCount } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigateTo('search', { q: searchQuery.trim() });
    setMobileMenuOpen(false);
  };

  const segments = [
    { key: 'kids', label: 'Kids' },
    { key: 'teens', label: 'Teens' },
    { key: 'men', label: 'Men' },
    { key: 'women', label: 'Women' },
    { key: 'unisex', label: 'Unisex' },
  ];

  return (
    <header className="navbar-header">
      {/* Announcement Bar */}
      <div className="announcement-banner">
        <span className="tag">Eco Impact</span>
        <span>🌿 100% Carbon-Neutral Shipping on all orders above ₹499</span>
      </div>

      {/* Main Navbar */}
      <div className="container">
        <div className="navbar-main">
          {/* Logo */}
          <div
            className="navbar-brand"
            onClick={() => navigateTo('home')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigateTo('home')}
          >
            <div className="navbar-brand-icon">
              <Leaf size={20} strokeWidth={2.5} />
            </div>
            <span>EcoNext</span>
          </div>

          {/* Search Bar */}
          <form className="navbar-search-form" onSubmit={handleSearchSubmit}>
            <Search size={16} className="navbar-search-icon" />
            <input
              type="text"
              className="navbar-search-input"
              placeholder="Search eco-certified products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="navbar-visual-search-btn"
              title="Visual Search (Snap & Shop)"
              onClick={() => navigateTo('visual-search')}
            >
              <Camera size={17} />
            </button>
          </form>

          {/* Desktop Nav Links */}
          <ul className="navbar-nav">
            <li>
              <span
                className={`nav-link ${page === 'home' ? 'active' : ''}`}
                onClick={() => navigateTo('home')}
              >
                Home
              </span>
            </li>
            <li>
              <span
                className={`nav-link ${page === 'products' ? 'active' : ''}`}
                onClick={() => navigateTo('products')}
              >
                Explore
              </span>
            </li>
            <li>
              <span
                className={`nav-link ${page === 'trending' ? 'active' : ''}`}
                onClick={() => navigateTo('trending')}
              >
                <TrendingUp size={14} style={{ color: 'var(--color-primary)' }} /> Trending
              </span>
            </li>
            <li>
              <span
                className={`nav-link ${page === 'visual-search' ? 'active' : ''}`}
                onClick={() => navigateTo('visual-search')}
              >
                <Sparkles size={14} style={{ color: 'var(--color-accent)' }} /> Snap & Shop
              </span>
            </li>
            <li>
              <span
                className={`nav-link ${page === 'order-tracking' ? 'active' : ''}`}
                onClick={() => navigateTo('order-tracking')}
              >
                <Truck size={14} /> Track Orders
              </span>
            </li>
            {isAuthenticated && (user?.role === 'admin' || user?.is_staff || user?.is_superuser) && (
              <li>
                <span
                  className={`nav-link ${page === 'admin' ? 'active' : ''}`}
                  onClick={() => navigateTo('admin')}
                  style={{ color: 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <LayoutDashboard size={14} /> Admin
                </span>
              </li>
            )}
          </ul>

          {/* Right Action Icons */}
          <div className="navbar-actions">
            <ThemeToggle />
            <NotificationDrawer />

            {/* Cart Button */}
            <motion.button
              type="button"
              className="cart-icon-btn"
              onClick={() => navigateTo('cart')}
              aria-label="Shopping Cart"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ShoppingBag size={19} />
              {cartCount > 0 && (
                <motion.span
                  className="cart-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  {cartCount}
                </motion.span>
              )}
            </motion.button>

            {/* Auth Menu */}
            {isAuthenticated && user ? (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="user-menu-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  <div className="user-avatar-circle">
                    {(user.username || user.first_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.first_name || user.username}
                  </span>
                  <ChevronDown size={14} />
                </button>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 8px)',
                        width: '210px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '0.5rem',
                        zIndex: 150
                      }}
                    >
                      <button
                        type="button"
                        className="nav-link"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => {
                          setUserDropdownOpen(false);
                          navigateTo('order-tracking');
                        }}
                      >
                        <Truck size={15} /> Track My Orders
                      </button>
                      <button
                        type="button"
                        className="nav-link"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => {
                          setUserDropdownOpen(false);
                          navigateTo('profile');
                        }}
                      >
                        <User size={15} /> My Profile & Account
                      </button>
                      <button
                        type="button"
                        className="nav-link"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => {
                          setUserDropdownOpen(false);
                          navigateTo('preferences');
                        }}
                      >
                        <SlidersHorizontal size={15} /> Eco Preferences
                      </button>
                      {(user.role === 'admin' || user.is_staff || user.is_superuser) && (
                        <button
                          type="button"
                          className="nav-link"
                          style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--color-primary)', fontWeight: 600 }}
                          onClick={() => {
                            setUserDropdownOpen(false);
                            navigateTo('admin');
                          }}
                        >
                          <LayoutDashboard size={15} /> Admin Console
                        </button>
                      )}
                      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0.35rem 0' }} />
                      <button
                        type="button"
                        className="nav-link"
                        style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--color-danger)' }}
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                          navigateTo('home');
                        }}
                      >
                        <LogOut size={15} /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="nav-link"
                  onClick={() => navigateTo('login')}
                  style={{ fontWeight: 600 }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="econext-btn econext-btn-primary econext-btn-sm"
                  onClick={() => navigateTo('signup')}
                  style={{ display: 'none', '@media (min-width: 640px)': { display: 'inline-flex' } }}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Secondary Segment Subnav */}
        <div className="segment-subnav">
          <span
            className={`segment-pill ${page === 'products' && !params.segment ? 'active' : ''}`}
            onClick={() => navigateTo('products')}
          >
            All Products
          </span>
          {segments.map((seg) => (
            <span
              key={seg.key}
              className={`segment-pill ${page === 'segment' && params.segment === seg.key ? 'active' : ''}`}
              onClick={() => navigateTo(seg.key)}
            >
              {seg.label}
            </span>
          ))}
          <span
            className={`segment-pill ${page === 'preferences' ? 'active' : ''}`}
            onClick={() => navigateTo('preferences')}
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <SlidersHorizontal size={12} /> Personalized Picks
          </span>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="mobile-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              className="mobile-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="navbar-brand">
                  <div className="navbar-brand-icon">
                    <Leaf size={18} />
                  </div>
                  <span>EcoNext</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={22} />
                </button>
              </div>

              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </form>

              {/* Mobile Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Navigation
                </div>
                <button
                  type="button"
                  className="nav-link"
                  style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
                  onClick={() => { navigateTo('home'); setMobileMenuOpen(false); }}
                >
                  Home
                </button>
                <button
                  type="button"
                  className="nav-link"
                  style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
                  onClick={() => { navigateTo('products'); setMobileMenuOpen(false); }}
                >
                  Explore All Products
                </button>
                <button
                  type="button"
                  className="nav-link"
                  style={{ justifyContent: 'flex-start', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={() => { navigateTo('trending'); setMobileMenuOpen(false); }}
                >
                  <TrendingUp size={16} /> Trending Products
                </button>
                <button
                  type="button"
                  className="nav-link"
                  style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
                  onClick={() => { navigateTo('visual-search'); setMobileMenuOpen(false); }}
                >
                  <Camera size={16} /> Snap & Shop (Visual AI)
                </button>
                <button
                  type="button"
                  className="nav-link"
                  style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
                  onClick={() => { navigateTo('preferences'); setMobileMenuOpen(false); }}
                >
                  <SlidersHorizontal size={16} /> Personalization
                </button>
              </div>

              {/* Segments in Mobile */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Shop By Segment
                </div>
                {segments.map((seg) => (
                  <button
                    key={seg.key}
                    type="button"
                    className="nav-link"
                    style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem' }}
                    onClick={() => { navigateTo(seg.key); setMobileMenuOpen(false); }}
                  >
                    EcoNext {seg.label}
                  </button>
                ))}
              </div>

              {/* User Section in Mobile */}
              <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                {isAuthenticated && user ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div className="user-avatar-circle">
                        {(user.username || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{user.first_name || user.username}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="nav-link"
                      style={{ justifyContent: 'flex-start' }}
                      onClick={() => { navigateTo('profile'); setMobileMenuOpen(false); }}
                    >
                      <User size={16} /> Account Profile
                    </button>
                    {(user.role === 'admin' || user.is_staff || user.is_superuser) && (
                      <button
                        type="button"
                        className="nav-link"
                        style={{ justifyContent: 'flex-start', color: 'var(--color-primary)', fontWeight: 600 }}
                        onClick={() => { navigateTo('admin'); setMobileMenuOpen(false); }}
                      >
                        <LayoutDashboard size={16} /> Admin Console
                      </button>
                    )}
                    <button
                      type="button"
                      className="nav-link"
                      style={{ justifyContent: 'flex-start', color: 'var(--color-danger)' }}
                      onClick={() => { logout(); navigateTo('home'); setMobileMenuOpen(false); }}
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="econext-btn econext-btn-primary econext-btn-md econext-btn-full"
                      onClick={() => { navigateTo('login'); setMobileMenuOpen(false); }}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      className="econext-btn econext-btn-secondary econext-btn-md econext-btn-full"
                      onClick={() => { navigateTo('signup'); setMobileMenuOpen(false); }}
                    >
                      Create Account
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
