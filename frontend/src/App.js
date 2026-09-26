import React, { useState, useEffect, useCallback } from 'react';
import './modern-styles.css';
import './App.css';
import { apiService } from './api';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import ProductDetailView from './ProductDetailView';
import CheckoutPage from './CheckoutPage';
import ProfilePage from './ProfilePage';
import {
  AnimatedButton,
  ProductCard,
  HeroSection,
  ChatAssistant
} from './components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Leaf,
  Camera
} from 'lucide-react';
import VisualSearch from './VisualSearch';
import KidsPage from './pages/KidsPage';
import TeensPage from './pages/TeensPage';
import MenPage from './pages/MenPage';
import WomenPage from './pages/WomenPage';
import UnisexPage from './pages/UnisexPage';
import PreferenceForm from './components/personalization/PreferenceForm';
import RecommendationWidget from './components/personalization/RecommendationWidget';

function App() {
  // Navigation history system
  const [pageHistory, setPageHistory] = useState(['home']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const currentPage = pageHistory[historyIndex];

  const navigateTo = useCallback((page) => {
    if (page === pageHistory[historyIndex]) return; // Don't navigate to same page
    setPageHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(page);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
    window.history.pushState({ page }, '', `#${page}`);
    window.scrollTo(0, 0);
  }, [historyIndex, pageHistory]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      window.history.back();
      window.scrollTo(0, 0);
    } else {
      navigateTo('home');
    }
  }, [historyIndex, navigateTo]);

  const goForward = useCallback(() => {
    if (historyIndex < pageHistory.length - 1) {
      setHistoryIndex(prev => prev + 1);
      window.history.forward();
      window.scrollTo(0, 0);
    }
  }, [historyIndex, pageHistory.length]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < pageHistory.length - 1;

  // Set initial browser state on mount only
  useEffect(() => {
    window.history.replaceState({ page: 'home' }, '', '#home');
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state && e.state.page) {
        const page = e.state.page;
        const idx = pageHistory.lastIndexOf(page);
        if (idx !== -1) {
          setHistoryIndex(idx);
        }
      } else {
        // Browser back with no state - go to previous in our history
        setHistoryIndex(prev => Math.max(0, prev - 1));
      }
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [pageHistory]);

  const [products, setProducts] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [cart, setCart] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));

  // Load user on mount
  useEffect(() => {
    loadProducts();
    loadTrendingProducts();
    checkUserSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    if (featuredProducts.length > 0) {
      const timer = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % featuredProducts.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [featuredProducts]);

  // Keep selected slide index valid if featured products are refreshed.
  useEffect(() => {
    if (featuredProducts.length > 0) {
      setCarouselIndex((prev) => prev % featuredProducts.length);
    }
  }, [featuredProducts.length]);

  const checkUserSession = () => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setAuthToken(token);
    }
  };

  const handleLoginSuccess = (response) => {
    setUser(response.user);
    setAuthToken(response.tokens.access);
    navigateTo('home');
    showAlert('Welcome! You are now logged in.', 'success');
  };

  const handleSignupSuccess = (response) => {
    setUser(response.user);
    setAuthToken(response.tokens.access);
    navigateTo('home');
    showAlert('Welcome to EcoNext! Your account has been created.', 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setAuthToken(null);
    setCart([]);
    navigateTo('home');
    showAlert('You have been logged out.', 'success');
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await apiService.getProducts(1, 50);
      if (data.status === 'success') {
        setProducts(data.products);
        // Set featured products (randomly select 5)
        const featured = data.products
          .sort(() => Math.random() - 0.5)
          .slice(0, 5);
        setFeaturedProducts(featured);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      showAlert('Failed to load products', 'error');
    }
    setLoading(false);
  };

  const loadTrendingProducts = async () => {
    try {
      const data = await apiService.getTrendingProducts();
      if (data.status === 'success') {
        setTrendingProducts(data.trending_products);
      }
    } catch (error) {
      console.error('Error loading trending:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const query = e.target.querySelector('.search-input').value;

    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await apiService.intentSearch(query);
      if (data.status === 'success') {
        setSearchResults(data.results);
        navigateTo('search');
      }
    } catch (error) {
      showAlert('Search failed: ' + error.message, 'error');
    }
    setLoading(false);
  };

  const handleAddToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }

    showAlert(`${product.name} added to cart!`, 'success');
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
    showAlert('Item removed from cart', 'success');
  };

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.current_price) * item.quantity), 0);
  const safeCarouselIndex = featuredProducts.length > 0
    ? carouselIndex % featuredProducts.length
    : 0;
  const featuredProduct = featuredProducts[safeCarouselIndex];

  return (
    <div className="App">
      {/* Header */}
      <header>
        <nav>
          <div className="logo" onClick={() => navigateTo('home')} style={{ cursor: 'pointer' }}>
            <Leaf size={24} style={{ display: 'inline-block', marginRight: '8px' }} />
            EcoNext
          </div>

          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              className="search-input"
              placeholder="Search eco-friendly products..."
            />
            <button type="submit">Search</button>
            <button
              type="button"
              onClick={() => navigateTo('visual-search')}
              style={{
                marginLeft: '0.5rem',
                background: 'none',
                border: '1px solid #ccc',
                padding: '0.5rem',
                borderRadius: '50%',
                color: '#555',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px'
              }}
              title="Visual Search"
            >
              <Camera size={20} />
            </button>
          </form>

          <ul className="nav-menu">
            <li><a href="#home" onClick={(e) => { e.preventDefault(); navigateTo('home'); }}>Home</a></li>
            <li><a href="#trending" onClick={(e) => { e.preventDefault(); navigateTo('trending'); }}>Trending</a></li>
            <li><a href="#kids" onClick={(e) => { e.preventDefault(); navigateTo('kids'); }}>Kids</a></li>
            <li><a href="#teens" onClick={(e) => { e.preventDefault(); navigateTo('teens'); }}>Teens</a></li>
            <li><a href="#men" onClick={(e) => { e.preventDefault(); navigateTo('men'); }}>Men</a></li>
            <li><a href="#women" onClick={(e) => { e.preventDefault(); navigateTo('women'); }}>Women</a></li>
            <li><a href="#unisex" onClick={(e) => { e.preventDefault(); navigateTo('unisex'); }}>Unisex</a></li>
            <li><a href="#preferences" onClick={(e) => { e.preventDefault(); navigateTo('preferences'); }}>Preferences</a></li>
            <li><a href="#cart" onClick={(e) => { e.preventDefault(); navigateTo('cart'); }}>🛒 Cart ({cart.length})</a></li>

            {user ? (
              <>
                <li><a href="#profile" onClick={(e) => { e.preventDefault(); navigateTo('profile'); }}>👤 {user.username}</a></li>
                <li>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li><a href="#login" onClick={(e) => { e.preventDefault(); navigateTo('login'); }}>Login</a></li>
                <li><a href="#signup" onClick={(e) => { e.preventDefault(); navigateTo('signup'); }}>Sign up</a></li>
              </>
            )}
          </ul>
        </nav>
      </header>

      {/* Alerts */}
      {alert && (
        <motion.div
          className={`alert alert-${alert.type}`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
        >
          {alert.message}
        </motion.div>
      )}

      {/* Main Content */}
      <div className="container">
        {/* Authentication Pages */}
        {currentPage === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onSwitchPage={navigateTo}
          />
        )}

        {currentPage === 'signup' && (
          <SignupPage
            onSignupSuccess={handleSignupSuccess}
            onSwitchPage={navigateTo}
          />
        )}

        {currentPage === 'visual-search' && (
          <VisualSearch
            onBack={goBack}
            onProductClick={(productId) => navigateTo(`product-${productId}`)}
          />
        )}

        {/* Home Page */}
        {currentPage === 'home' && (
          <>
            <HeroSection onExplore={() => {
              const productsSection = document.querySelector('.products-section');
              if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth' });
              }
            }} />

            {/* Navigation Back/Forward Bar */}
            {(canGoBack || canGoForward) && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <AnimatedButton onClick={goBack} variant="outline" size="sm" style={{ opacity: canGoBack ? 1 : 0.4, pointerEvents: canGoBack ? 'auto' : 'none' }}>
                  <ChevronLeft size={16} /> Back
                </AnimatedButton>
                <AnimatedButton onClick={goForward} variant="outline" size="sm" style={{ opacity: canGoForward ? 1 : 0.4, pointerEvents: canGoForward ? 'auto' : 'none' }}>
                  Forward <ChevronRight size={16} />
                </AnimatedButton>
              </div>
            )}

            {/* Personalized Section */}
            {authToken && <RecommendationWidget />}

            {/* Segment Landing Shortcuts */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                marginBottom: '2rem',
                padding: '1rem',
                background: 'linear-gradient(135deg, #eefbf3 0%, #e9f5ff 100%)',
                borderRadius: '14px'
              }}
            >
              <div className="section-header">
                <h2>Shop By Segment</h2>
                <span style={{ color: 'var(--gray-600)' }}>Tailored eco picks for every persona</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {[
                  { key: 'kids', label: 'EcoNext Kids' },
                  { key: 'teens', label: 'EcoNext Teens' },
                  { key: 'men', label: 'EcoNext Men' },
                  { key: 'women', label: 'EcoNext Women' },
                  { key: 'unisex', label: 'EcoNext Unisex' },
                ].map((item) => (
                  <AnimatedButton key={item.key} onClick={() => navigateTo(item.key)} variant="secondary" size="sm" style={{ justifyContent: 'center' }}>
                    {item.label}
                  </AnimatedButton>
                ))}
              </div>
            </motion.div>

            {/* Featured Carousel */}
            {featuredProducts.length > 0 && (
              <motion.div
                className="carousel-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={safeCarouselIndex}
                    className="carousel-slide"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.5 }}
                    style={{
                      background: `linear-gradient(135deg, ${['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'][safeCarouselIndex % 5]} 0%, ${['#059669', '#1E40AF', '#D97706', '#DC2626', '#7C3AED'][safeCarouselIndex % 5]} 100%)`
                    }}
                  >
                    <div className="carousel-content">
                      <h2>Featured Product</h2>
                      <h3 style={{ color: 'white', marginBottom: '1rem' }}>{featuredProduct.name}</h3>
                      <p style={{ color: 'rgba(255,255,255,0.9)' }}>{featuredProduct.description}</p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <AnimatedButton
                          onClick={() => handleAddToCart(featuredProduct)}
                          variant="primary"
                        >
                          Add to Cart
                        </AnimatedButton>
                        <AnimatedButton
                          onClick={() => navigateTo(`product-${featuredProduct.id}`)}
                          variant="outline"
                        >
                          View Details
                        </AnimatedButton>
                      </div>
                    </div>
                    <img
                      src={featuredProduct.image_url || 'https://via.placeholder.com/500x300?text=Featured+Product'}
                      alt={featuredProduct.name}
                      className="carousel-image"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Carousel Controls */}
                <div className="carousel-controls">
                  {featuredProducts.map((_, idx) => (
                    <motion.div
                      key={idx}
                      className={`carousel-dot ${idx === safeCarouselIndex ? 'active' : ''}`}
                      onClick={() => setCarouselIndex(idx)}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Trending Products Section */}
            {trendingProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{ marginBottom: '3rem' }}
              >
                <div className="section-header">
                  <h2>🔥 Trending Now</h2>
                  <button
                    type="button"
                    className="view-all"
                    onClick={() => navigateTo('trending')}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                  >
                    View All
                  </button>
                </div>
                <div className="product-grid">
                  {trendingProducts.slice(0, 8).map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <ProductCard
                        product={item.product}
                        onAddCart={handleAddToCart}
                        onViewDetails={() => navigateTo(`product-${item.product.id}`)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* All Products Section */}
            {products.length > 0 && (
              <motion.div
                className="products-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="section-header">
                  <h2>All Eco-Friendly Products</h2>
                  <span style={{ color: 'var(--gray-600)' }}>Showing {products.length} products</span>
                </div>
                <div className="product-grid">
                  {products.map((product, idx) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (idx % 8) * 0.05 }}
                    >
                      <ProductCard
                        product={product}
                        onAddCart={handleAddToCart}
                        onViewDetails={() => navigateTo(`product-${product.id}`)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {loading && (
              <motion.div
                className="loading-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="loading"></div>
                <span className="loading-text">Loading products...</span>
              </motion.div>
            )}
          </>
        )}

        {currentPage === 'kids' && (
          <KidsPage
            onViewDetails={(productId) => navigateTo(`product-${productId}`)}
            onAddToCart={handleAddToCart}
          />
        )}

        {currentPage === 'teens' && (
          <TeensPage
            onViewDetails={(productId) => navigateTo(`product-${productId}`)}
            onAddToCart={handleAddToCart}
          />
        )}

        {currentPage === 'men' && (
          <MenPage
            onViewDetails={(productId) => navigateTo(`product-${productId}`)}
            onAddToCart={handleAddToCart}
          />
        )}

        {currentPage === 'women' && (
          <WomenPage
            onViewDetails={(productId) => navigateTo(`product-${productId}`)}
            onAddToCart={handleAddToCart}
          />
        )}

        {currentPage === 'unisex' && (
          <UnisexPage
            onViewDetails={(productId) => navigateTo(`product-${productId}`)}
            onAddToCart={handleAddToCart}
          />
        )}

        {currentPage === 'preferences' && (
          <PreferenceForm />
        )}

        {/* Product Detail Page */}
        {currentPage && currentPage.startsWith('product-') && (
          <ProductDetailView
            productId={parseInt(currentPage.split('-')[1])}
            onAddToCart={handleAddToCart}
            onBack={goBack}
          />
        )}

        {/* Search Results */}
        {currentPage === 'search' && searchResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <AnimatedButton onClick={goBack} variant="outline" size="sm">
                <ChevronLeft size={16} /> Back
              </AnimatedButton>
              {canGoForward && (
                <AnimatedButton onClick={goForward} variant="outline" size="sm">
                  Forward <ChevronRight size={16} />
                </AnimatedButton>
              )}
            </div>
            <h2 style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>Search Results</h2>
            {Object.entries(searchResults).map(([category, items]) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: '3rem' }}
              >
                <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>{category}</h3>
                <div className="product-grid">
                  {items.map(item => (
                    <ProductCard
                      key={item.product.id}
                      product={item.product}
                      onAddCart={handleAddToCart}
                      onViewDetails={() => navigateTo(`product-${item.product.id}`)}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Trending Page */}
        {currentPage === 'trending' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <AnimatedButton onClick={goBack} variant="outline" size="sm">
                <ChevronLeft size={16} /> Back
              </AnimatedButton>
              {canGoForward && (
                <AnimatedButton onClick={goForward} variant="outline" size="sm">
                  Forward <ChevronRight size={16} />
                </AnimatedButton>
              )}
            </div>
            <h2 style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>🔥 Trending Products</h2>
            <div className="product-grid">
              {trendingProducts.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <ProductCard
                    product={item.product}
                    onAddCart={handleAddToCart}
                    onViewDetails={() => navigateTo(`product-${item.product.id}`)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Cart Page */}
        {currentPage === 'cart' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <AnimatedButton onClick={goBack} variant="outline" size="sm">
                <ChevronLeft size={16} /> Back
              </AnimatedButton>
              {canGoForward && (
                <AnimatedButton onClick={goForward} variant="outline" size="sm">
                  Forward <ChevronRight size={16} />
                </AnimatedButton>
              )}
            </div>
            <h2 style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>🛒 Shopping Cart</h2>
            {cart.length === 0 ? (
              <motion.div
                className="empty-state"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
              >
                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</p>
                <p>Your cart is empty</p>
                <AnimatedButton onClick={() => navigateTo('home')} variant="primary" style={{ marginTop: '1rem' }}>
                  Continue Shopping
                </AnimatedButton>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
                  {cart.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: idx < cart.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      <div>
                        <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>{item.name}</h3>
                        <p style={{ margin: 0, color: 'var(--gray-600)' }}>₹{item.current_price}</p>
                      </div>
                      <AnimatedButton
                        onClick={() => handleRemoveFromCart(item.id)}
                        variant="outline"
                        size="sm"
                      >
                        Remove
                      </AnimatedButton>
                    </motion.div>
                  ))}
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '1.5rem', textAlign: 'center' }}>
                    Total: ₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <AnimatedButton
                    onClick={() => {
                      if (!authToken) {
                        showAlert('Please login to checkout', 'error');
                        navigateTo('login');
                        return;
                      }
                      navigateTo('checkout');
                    }}
                    variant="primary"
                    size="lg"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    💳 Proceed to Checkout
                  </AnimatedButton>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Checkout Page */}
        {currentPage === 'checkout' && (
          <CheckoutPage
            cart={cart}
            onBack={goBack}
            onOrderSuccess={(order) => {
              setCart([]);
              showAlert('Order placed successfully!', 'success');
              setTimeout(() => navigateTo('home'), 2000);
            }}
            authToken={authToken}
          />
        )}

        {/* Profile Page */}
        {currentPage === 'profile' && (
          <ProfilePage
            user={user}
            authToken={authToken}
            onBack={goBack}
          />
        )}

      </div>
      
      {currentPage === 'home' && (
        <ChatAssistant onViewDetails={(productId) => navigateTo(`product-${productId}`)} />
      )}
    </div>
  );
}

export default App;
