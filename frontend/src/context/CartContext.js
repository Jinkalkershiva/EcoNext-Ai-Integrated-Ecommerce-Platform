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
          const itemsList = res?.cart?.items || res?.items;
          if (Array.isArray(itemsList) && itemsList.length > 0) {
            const formatted = itemsList.map(it => ({
              id: it.product?.id || it.id,
              cartItemId: it.id,
              name: it.product?.name || it.product_name || 'Product',
              variant: it.variant || null,
              variant_id: it.variant?.id || it.variant_id || null,
              variant_name: it.variant?.size || it.variant_name || '',
              current_price: Number(it.price || it.variant?.price || it.product?.current_price || it.product?.price || 0),
              image_url: it.product?.image_url || it.product?.imageUrl,
              category: it.product?.category,
              eco_tags: it.product?.eco_tags,
              quantity: it.quantity,
            }));
            setCart(formatted);
          }
        } catch (err) {
          console.warn('Could not sync remote cart on init:', err?.message);
        }
      }
    };
    fetchRemoteCart();
  }, []);

  const addToCart = useCallback(async (product, quantity = 1, variant = null) => {
    if (!product || !product.id) return;

    const unitPrice = variant && variant.price !== null && variant.price !== undefined
      ? Number(variant.price)
      : Number(product.current_price || product.price || 0);

    const variantId = variant?.id || null;

    setCart(prevCart => {
      const existingIdx = prevCart.findIndex(item =>
        item.id === product.id && ((!variantId && !item.variant_id) || (item.variant_id === variantId))
      );

      if (existingIdx > -1) {
        const updated = [...prevCart];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + quantity,
          current_price: unitPrice,
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            id: product.id,
            name: product.name,
            current_price: unitPrice,
            image_url: product.image_url || product.imageUrl,
            category: product.category,
            eco_tags: product.eco_tags,
            quantity: quantity,
            variant: variant,
            variant_id: variantId,
            variant_name: variant?.size || '',
          }
        ];
      }
    });

    const varTitle = variant?.size ? ` (Size: ${variant.size})` : '';
    showToast(`Added "${product.name}${varTitle}" to your cart!`, 'success');

    // Sync with backend if authenticated
    if (tokenStore.isAuthenticated()) {
      try {
        await apiService.addToCart(product.id, quantity, variantId);
      } catch (err) {
        console.warn('Remote cart sync failed, saved locally:', err?.message);
      }
    }
  }, [showToast]);

  const removeFromCart = useCallback(async (productId, variantId = null) => {
    setCart(prevCart =>
      prevCart.filter(item =>
        !(item.id === productId && ((!variantId && !item.variant_id) || (item.variant_id === variantId)))
      )
    );
    showToast('Item removed from cart', 'info');

    if (tokenStore.isAuthenticated()) {
      try {
        await apiService.removeFromCart(productId);
      } catch (err) {
        console.warn('Remote cart remove sync error:', err?.message);
      }
    }
  }, [showToast]);

  const updateQuantity = useCallback(async (productId, newQuantity, variantId = null) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === productId && ((!variantId && !item.variant_id) || (item.variant_id === variantId))) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );

    if (tokenStore.isAuthenticated()) {
      try {
        await apiService.updateCartItem(productId, newQuantity);
      } catch (err) {
        console.warn('Remote cart update sync error:', err?.message);
      }
    }
  }, [removeFromCart]);

  const clearCart = useCallback(async () => {
    setCart([]);
    if (tokenStore.isAuthenticated()) {
      try {
        await apiService.clearCart();
      } catch (err) {
        console.warn('Remote cart clear sync error:', err?.message);
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
