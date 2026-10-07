import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { normalizeOrderId, formatOrderReference } from '../utils/orderUtils';

const NavigationContext = createContext();

const parseRoute = (pathOrHash, searchStr = '') => {
  let clean = (pathOrHash || '').replace(/^[#/]+/, '').replace(/\/+$/, '');
  let queryPart = searchStr || '';
  if (clean.includes('?')) {
    const parts = clean.split('?');
    clean = parts[0];
    queryPart = parts[1] || '';
  }
  const searchParams = new URLSearchParams(queryPart);

  // Orders / Tracking routes
  // Matches: orders/123/tracking, orders/123, orders/ORD-101/tracking, order-tracking, order/123, tracking
  if (
    clean.startsWith('orders/') ||
    clean === 'orders' ||
    clean.startsWith('order/') ||
    clean.startsWith('order-tracking') ||
    clean === 'tracking'
  ) {
    let orderId = searchParams.get('id') || searchParams.get('orderId') || searchParams.get('order_id') || '';

    const segments = clean.split('/');
    if (segments.length >= 2) {
      if (segments[0] === 'orders') {
        orderId = segments[1];
      } else if (segments[0] === 'order') {
        orderId = segments[1];
      } else if (segments[0] === 'order-tracking' && segments[1]) {
        orderId = segments[1];
      }
    }

    const normId = normalizeOrderId(orderId);
    return {
      page: 'order-tracking',
      params: orderId ? { orderId: normId || orderId, id: normId || orderId, rawOrderId: orderId } : {}
    };
  }

  // Product routes
  if (clean.startsWith('product-') || clean.startsWith('product/') || clean.startsWith('products/')) {
    const id = clean.replace(/^products?\/?/, '').replace(/^product-/, '');
    return { page: 'product-detail', params: { id } };
  }

  // Search routes
  if (clean.startsWith('search')) {
    return { page: 'search', params: { q: searchParams.get('q') || '' } };
  }

  // Segment routes
  if (['kids', 'teens', 'men', 'women', 'unisex'].includes(clean.toLowerCase())) {
    return { page: 'segment', params: { segment: clean.toLowerCase() } };
  }

  if (clean) {
    return { page: clean, params: {} };
  }

  return { page: 'home', params: {} };
};

export const NavigationProvider = ({ children }) => {
  const getInitialRoute = () => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      return parseRoute(hash, window.location.search);
    }
    const pathname = window.location.pathname;
    if (pathname && pathname !== '/' && pathname !== '') {
      return parseRoute(pathname, window.location.search);
    }
    return { page: 'home', params: {} };
  };

  const [history, setHistory] = useState(() => [getInitialRoute()]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Update hash when navigating
  const syncHash = (route) => {
    let hashString = route.page;
    if (route.page === 'product-detail') {
      hashString = `product/${route.params.id}`;
    } else if (route.page === 'search') {
      hashString = route.params.q ? `search?q=${encodeURIComponent(route.params.q)}` : 'search';
    } else if (route.page === 'segment') {
      hashString = route.params.segment;
    } else if (route.page === 'order-tracking' || route.page === 'orders' || route.page === 'tracking') {
      const orderId = route.params.rawOrderId || route.params.orderId || route.params.id;
      hashString = orderId ? `orders/${orderId}/tracking` : 'orders';
    }
    window.history.pushState(route, '', `#${hashString}`);
  };

  const navigateTo = useCallback((pageName, params = {}) => {
    let page = pageName;
    let finalParams = { ...params };

    if (pageName.startsWith('/') || pageName.startsWith('#') || pageName.includes('/')) {
      const parsed = parseRoute(pageName, '');
      page = parsed.page;
      finalParams = { ...parsed.params, ...params };
    } else if (pageName.startsWith('product-') || pageName.startsWith('product/')) {
      const id = pageName.replace(/^product[-/]/, '');
      page = 'product-detail';
      finalParams.id = id;
    } else if (['kids', 'teens', 'men', 'women', 'unisex'].includes(pageName.toLowerCase())) {
      page = 'segment';
      finalParams.segment = pageName.toLowerCase();
    } else if (pageName === 'order-tracking' || pageName === 'orders' || pageName === 'tracking') {
      page = 'order-tracking';
      if (params.orderId || params.id) {
        const normId = normalizeOrderId(params.orderId || params.id);
        finalParams.orderId = normId || params.orderId || params.id;
        finalParams.id = normId || params.id || params.orderId;
      }
    }

    const newRoute = { page, params: finalParams };

    setHistory(prev => {
      const nextHistory = prev.slice(0, currentIndex + 1);
      return [...nextHistory, newRoute];
    });
    setCurrentIndex(prev => prev + 1);

    syncHash(newRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      window.history.back();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigateTo('home');
    }
  }, [currentIndex, navigateTo]);

  const goForward = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      window.history.forward();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentIndex, history.length]);

  // Handle browser back/forward buttons & hash changes
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state && e.state.page) {
        setHistory(prev => {
          const idx = prev.findIndex(item => item.page === e.state.page && JSON.stringify(item.params) === JSON.stringify(e.state.params));
          if (idx !== -1) {
            setCurrentIndex(idx);
            return prev;
          }
          return [...prev, e.state];
        });
      } else {
        const parsed = getInitialRoute();
        setHistory(prev => [...prev, parsed]);
        setCurrentIndex(prev => prev + 1);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleHashChange = () => {
      const parsed = getInitialRoute();
      setHistory(prev => [...prev, parsed]);
      setCurrentIndex(prev => prev + 1);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < history.length - 1;

  const value = useMemo(() => {
    const current = history[currentIndex] || { page: 'home', params: {} };
    return {
      page: current.page,
      params: current.params,
      navigateTo,
      goBack,
      goForward,
      canGoBack,
      canGoForward
    };
  }, [history, currentIndex, navigateTo, goBack, goForward, canGoBack, canGoForward]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export default NavigationContext;
