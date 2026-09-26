import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiService, tokenStore } from '../api';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('econext_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  const [notification, setNotification] = useState(null);

  // Persist cart to local storage
  useEffect(() => {
    try {
      localStorage.setItem('econext_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  const showToast = useCallback((message, type = 'success') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification(prev => (prev?.id ? null : prev));
    }, 3500);
  }, []);

  const dismissToast = useCallback(() => {
    setNotification(null);
  }, []);

  // Sync cart from backend if user is authenticated
  useEffect(() => {
    const fetchRemoteCart = async () => {
      if (tokenStore.isAuthenticated()) {
        try {
          const res = await apiService.getCart();
          if (res && res.status === 'success' && Array.isArray(res.items)) {
            // Merge with local cart if non-empty
            setCart(res.items);
          }
        } catch {
          // Fallback to local cart
        }
      }
    };
    fetchRemoteCart();
  }, []);

  const addToCart = useCallback(async (product, quantity = 1) => {
    if (!product || !product.id) return;

    setCart(prevCart => {
      const existingIdx = prevCart.findIndex(item => item.id === product.id);
      if (existingIdx > -1) {
        const updated = [...prevCart];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + quantity
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            id: product.id,
            name: product.name,
            current_price: Number(product.current_price || product.price || 0),
            image_url: product.image_url,
            category: product.category,
            eco_tags: product.eco_tags,
            quantity: quantity,
          }
        ];
      }
    });

    showToast(`Added "${product.name}" to your cart!`, 'success');

    // Optionally sync with backend if authenticated
    if (tokenStore.isAuthenticated()) {
      try {
        await apiService.addToCart(product.id, quantity);
      } catch (err) {
        console.warn('Remote cart sync failed, saved locally:', err.message);
      }
    }
  }, [showToast]);

  const removeFromCart = useCallback(async (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
    showToast('Item removed from cart', 'info');

    if (tokenStore.isAuthenticated()) {
      try {
        await apiService.removeFromCart(productId);
      } catch (err) {
        console.warn('Remote cart remove sync error:', err.message);
      }
    }
  }, [showToast]);

  const updateQuantity = useCallback(async (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );

    if (tokenStore.isAuthenticated()) {
      try {
        await apiService.updateCartItem(productId, newQuantity);
      } catch (err) {
        console.warn('Remote cart update sync error:', err.message);
      }
    }
  }, [removeFromCart]);

  const clearCart = useCallback(async () => {
    setCart([]);
    if (tokenStore.isAuthenticated()) {
      try {
        await apiService.clearCart();
      } catch (err) {
        console.warn('Remote cart clear sync error:', err.message);
      }
    }
  }, []);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (parseFloat(item.current_price || 0) * item.quantity), 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }, [cart]);

  // Estimated carbon offset / eco-points calculation based on cart items
  const ecoSavingsKg = useMemo(() => {
    return (cartCount * 1.8).toFixed(1);
  }, [cartCount]);

  return (
    <CartContext.Provider value={{
      cart,
      cartTotal,
      cartCount,
      ecoSavingsKg,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      notification,
      showToast,
      dismissToast
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
