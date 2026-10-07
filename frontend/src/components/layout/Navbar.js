import React, { useState, useRef, useEffect } from 'react';
import {
  Leaf,
  Search,
  Camera,
  ShoppingBag,
  User,
  LogOut,
  Menu,
  X,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  LayoutDashboard,
  Truck,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Tag,
  Flame,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';
import UiScaleControl from '../common/UiScaleControl';
import { motion, AnimatePresence } from 'framer-motion';
import './Navbar.css';

export const Navbar = () => {
  const { page, params, navigateTo } = useNavigation();
  const { cartCount } = useCart();
  const { user, isAuthenticated, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState(params.q || '');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const searchContainerRef = useRef(null);
  const userDropdownRef = useRef(null);

  // Sync searchQuery when URL query param changes
  useEffect(() => {
    if (params.q !== undefined) {
      setSearchQuery(params.q);
    }
  }, [params.q]);

  // Click outside to close search suggestions & user dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSuggestionsOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      navigateTo('products');
      return;
    }
    navigateTo('search', { q: searchQuery.trim() });
    setSuggestionsOpen(false);
    setMobileMenuOpen(false);
  };

  const handleSuggestionClick = (query) => {
    setSearchQuery(query);
    navigateTo('search', { q: query });
    setSuggestionsOpen(false);
  };

  const popularSearches = [
    'Organic Cotton Shirts',
    'Bamboo Cutlery',
    'Recycled Glass Bottles',
    'Hemp Streetwear',
    'Zero Waste Kits',
    'Biodegradable Soap',
  ];

  const categoriesNav = [
    { key: 'all', label: 'All Products', page: 'products', params: {} },
    { key: 'trending', label: 'Trending', page: 'trending', icon: TrendingUp, params: {} },
    { key: 'new', label: 'New Arrivals', page: 'products', icon: Sparkles, params: { sort_by: '-created_at' } },
    { key: 'women', label: 'Women', page: 'women', params: {} },
    { key: 'men', label: 'Men', page: 'men', params: {} },
    { key: 'kids', label: 'Kids & Baby', page: 'kids', params: {} },
    { key: 'teens', label: 'Teens', page: 'teens', params: {} },
    { key: 'unisex', label: 'Unisex', page: 'unisex', params: {} },
    { key: 'home', label: 'Home & Living', page: 'products', params: { category: 'Home & Living' } },
    { key: 'personal-care', label: 'Personal Care', page: 'products', params: { category: 'Personal Care' } },
    { key: 'zero-waste', label: 'Zero Waste', page: 'products', params: { eco_tags: ['Zero-Waste'] } },
    { key: 'deals', label: 'Under ₹999', page: 'products', icon: Tag, params: { price_max: 999 } },
  ];

  const isCategoryActive = (item) => {
    if (item.page === 'women' && page === 'women') return true;
    if (item.page === 'men' && page === 'men') return true;
    if (item.page === 'kids' && page === 'kids') return true;
    if (item.page === 'teens' && page === 'teens') return true;
    if (item.page === 'unisex' && page === 'unisex') return true;
    if (item.page === 'trending' && page === 'trending') return true;
    if (item.key === 'all' && page === 'products' && !params.category && !params.eco_tags && !params.price_max) return true;
    if (item.key === 'home' && params.category === 'Home & Living') return true;
    if (item.key === 'personal-care' && params.category === 'Personal Care') return true;
    if (item.key === 'deals' && params.price_max === 999) return true;
    return false;
  };

  return (
    <header className="navbar-header">
      {/* ROW 1: Top Benefit / Trust Ticker */}
      <div className="announcement-banner">
        <div className="announcement-container">
          <span className="tag">Eco Impact</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Leaf size={13} aria-hidden="true" /> 100% Carbon-Neutral Delivery on orders above ₹499
          </span>
          <span className="announcement-divider">|</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <RotateCcw size={13} aria-hidden="true" /> 7-Day Easy Doorstep Returns
          </span>
          <span className="announcement-divider">|</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={13} aria-hidden="true" /> Verified 6-Digit Delivery PIN Verification
          </span>
        </div>
      </div>

      {/* ROW 2: Main Marketplace Header */}
      <div className="navbar-main-wrapper">
        <div className="container">
          <div className="navbar-main">
            {/* 1. Logo Brand (Far Left) */}
            <div
              className="navbar-brand"
              onClick={() => navigateTo('home')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigateTo('home')}
              aria-label="EcoNext Sustainable Marketplace Home"
            >
              <div className="navbar-brand-icon">
                <Leaf size={24} strokeWidth={2.4} />
              </div>
              <div className="navbar-brand-text-wrap">
                <span className="navbar-brand-name">EcoNext</span>
                <span className="navbar-brand-sub">SUSTAINABLE MARKETPLACE</span>
              </div>
            </div>

            {/* 2. Large Center Search Bar */}
            <div className="navbar-search-wrapper" ref={searchContainerRef}>
              <form className="navbar-search-form" onSubmit={handleSearchSubmit}>
                <Search size={19} className="navbar-search-icon" />
                <input
                  type="text"
                  className="navbar-search-input"
                  placeholder="Search 1,000+ eco products, organic cotton, bamboo, materials..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  aria-label="Search sustainable products"
                />

                <div className="navbar-search-actions-group">
                  <button
                    type="button"
                    className="navbar-visual-search-btn"
                    title="Snap & Shop with Visual AI Search"
                    onClick={() => navigateTo('visual-search')}
                    aria-label="Snap photo to search with Visual AI"
                  >
                    <Camera size={18} />
                  </button>
                  <button
                    type="submit"
                    className="navbar-search-submit-btn"
                    title="Search Catalog"
                    aria-label="Submit search"
                  >
                    <Search size={17} />
                  </button>
                </div>
              </form>

              {/* Autocomplete Dropdown */}
              <AnimatePresence>
                {suggestionsOpen && (
                  <motion.div
                    className="search-suggestions-dropdown"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="suggestion-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <TrendingUp size={13} aria-hidden="true" />
                      <span>Popular Searches</span>
                    </div>
                    {popularSearches.map((term, i) => (
                      <button
                        key={i}
                        type="button"
                        className="suggestion-item"
                        onClick={() => handleSuggestionClick(term)}
                      >
                        <Search size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{term}</span>
                      </button>
                    ))}

                    <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0.4rem 0' }} />

                    <div className="suggestion-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Sparkles size={13} aria-hidden="true" />
                      <span>Quick AI Visual Match</span>
                    </div>
                    <button
                      type="button"
                      className="suggestion-item"
                      style={{ color: 'var(--color-primary)', fontWeight: 600 }}
                      onClick={() => {
                        setSuggestionsOpen(false);
                        navigateTo('visual-search');
                      }}
                    >
                      <Camera size={15} />
                      <span>Upload a photo to find matching sustainable goods</span>
                      <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. Right Utility Actions (FAR RIGHT) */}
            <div className="navbar-actions">
              {/* Orders Action */}
              <button
                type="button"
                className={`action-nav-item ${page === 'order-tracking' ? 'active' : ''}`}
                onClick={() => navigateTo('order-tracking')}
                title="Track Orders"
                aria-label="Track Orders"
              >
                <Truck size={19} />
                <span className="action-nav-label">Orders</span>
              </button>

              {/* Theme Toggle (Light / Dark / Warm) */}
              <ThemeToggle />

              {/* Accessibility UI Scale Control ([ A- ] 100% [ A+ ]) */}
              <UiScaleControl />

              {/* Cart Button */}
              <motion.button
                type="button"
                className="cart-icon-btn"
                onClick={() => navigateTo('cart')}
                aria-label="Shopping Cart"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <ShoppingBag size={20} />
                <span className="cart-label">Cart</span>
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

              {/* User Profile / Auth (FAR RIGHT) */}
              {isAuthenticated && user ? (
                <div className="user-menu-wrapper" ref={userDropdownRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="user-menu-btn"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-label="User Profile & Account Menu"
                    aria-expanded={userDropdownOpen}
                  >
                    <div className="user-avatar-circle">
                      {(user.first_name || user.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="user-menu-name">
                      {user.first_name || user.username}
                    </span>
                    <ChevronDown size={14} />
                  </button>

                  <AnimatePresence>
                    {userDropdownOpen && (
                      <motion.div
                        className="user-dropdown-menu"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="user-dropdown-header">
                          <div className="user-dropdown-title">
                            {user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username}
                          </div>
                          <div className="user-dropdown-email">
                            {user.email || 'Eco Shopper'}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="nav-link dropdown-link-item"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            navigateTo('order-tracking');
                          }}
                        >
                          <Truck size={15} /> Track My Orders
                        </button>

                        <button
                          type="button"
                          className="nav-link dropdown-link-item"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            navigateTo('profile');
                          }}
                        >
                          <User size={15} /> My Profile & Account
                        </button>

                        <button
                          type="button"
                          className="nav-link dropdown-link-item"
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
                            className="nav-link dropdown-link-item admin-link"
                            onClick={() => {
                              setUserDropdownOpen(false);
                              navigateTo('admin');
                            }}
                          >
                            <LayoutDashboard size={15} /> Admin Console
                          </button>
                        )}

                        <div className="dropdown-divider" />

                        <button
                          type="button"
                          className="nav-link dropdown-link-item signout-link"
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
                <div className="auth-btns-group">
                  <button
                    type="button"
                    className="signin-nav-btn"
                    onClick={() => navigateTo('login')}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    className="signup-nav-btn"
                    onClick={() => navigateTo('signup')}
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
        </div>
      </div>

      {/* ROW 3: Horizontal Secondary Category Navigation Bar */}
      <nav className="marketplace-category-nav" aria-label="Marketplace Categories">
        <div className="container">
          <ul className="category-nav-list">
            {categoriesNav.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    className={`category-nav-item ${isCategoryActive(item) ? 'active' : ''}`}
                    onClick={() => navigateTo(item.page, item.params)}
                  >
                    {Icon && <Icon size={14} aria-hidden="true" style={{ marginRight: '0.35rem', verticalAlign: '-1px' }} />}
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 300,
              display: 'flex',
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              style={{
                width: '300px',
                height: '100%',
                backgroundColor: 'var(--bg-surface)',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem 1rem',
                overflowY: 'auto',
                gap: '1rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="navbar-brand">
                  <div className="navbar-brand-icon">
                    <Leaf size={20} />
                  </div>
                  <span className="navbar-brand-name">EcoNext</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Marketplace Categories
                </div>
                {categoriesNav.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      className="nav-link"
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem 0.5rem', fontSize: '0.875rem', gap: '0.5rem' }}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigateTo(cat.page, cat.params);
                      }}
                    >
                      {Icon && <Icon size={16} aria-hidden="true" />}
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="nav-link"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem 0.5rem' }}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigateTo('order-tracking');
                  }}
                >
                  <Truck size={16} /> Track My Orders
                </button>
                <button
                  type="button"
                  className="nav-link"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem 0.5rem' }}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigateTo('visual-search');
                  }}
                >
                  <Camera size={16} /> Visual Snap Search
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0.5rem 0 0.5rem', borderTop: '1px dashed var(--border-subtle)', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>UI Scale:</span>
                  <UiScaleControl />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
