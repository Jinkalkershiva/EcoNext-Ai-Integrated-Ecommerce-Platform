import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
  // Parse initial route from window.location.hash
  const getRouteFromHash = () => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (!hash) return { page: 'home', params: {} };

    // Format: search?q=shirts or product/12 or product-12
    if (hash.startsWith('product-') || hash.startsWith('product/')) {
      const id = hash.replace(/^product[-/]/, '');
      return { page: 'product-detail', params: { id } };
    }

    if (hash.startsWith('search')) {
      const queryPart = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(queryPart);
      return { page: 'search', params: { q: params.get('q') || '' } };
    }

    if (['kids', 'teens', 'men', 'women', 'unisex'].includes(hash.toLowerCase())) {
      return { page: 'segment', params: { segment: hash.toLowerCase() } };
    }

    return { page: hash, params: {} };
  };

  const [history, setHistory] = useState(() => [getRouteFromHash()]);
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
    }
    window.history.pushState(route, '', `#${hashString}`);
  };

  const navigateTo = useCallback((pageName, params = {}) => {
    let page = pageName;
    let finalParams = { ...params };

    if (pageName.startsWith('product-') || pageName.startsWith('product/')) {
      const id = pageName.replace(/^product[-/]/, '');
      page = 'product-detail';
      finalParams.id = id;
    } else if (['kids', 'teens', 'men', 'women', 'unisex'].includes(pageName.toLowerCase())) {
      page = 'segment';
      finalParams.segment = pageName.toLowerCase();
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

  // Handle browser back/forward buttons
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
        const parsed = getRouteFromHash();
        setHistory(prev => [...prev, parsed]);
        setCurrentIndex(prev => prev + 1);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
