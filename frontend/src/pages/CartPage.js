import React from 'react';
import { useCart } from '../context/CartContext';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import { ShoppingBag, Trash2, ArrowRight, ShieldCheck, Leaf, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './CartPage.css';

export const CartPage = () => {
  const { cart, cartTotal, cartCount, ecoSavingsKg, updateQuantity, removeFromCart, clearCart } = useCart();
  const { navigateTo, goBack } = useNavigation();
  const { isAuthenticated } = useAuth();

  if (!cart || cart.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 0' }}>
        <EmptyState
          icon={<ShoppingBag size={36} />}
          title="Your Shopping Cart is Empty"
          description="Explore our curated collection of verified eco-friendly goods and discover sustainable alternatives."
          actionText="Start Shopping"
          actionIcon={<ArrowRight size={16} />}
          onAction={() => navigateTo('products')}
        />
      </div>
    );
  }

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      navigateTo('login');
    } else {
      navigateTo('checkout');
    }
  };

  return (
    <div className="container">
      {/* Back and Page Header */}
      <div style={{ margin: '1rem 0 1.5rem 0' }}>
        <Button variant="ghost" size="sm" onClick={goBack} icon={<ArrowLeft size={16} />}>
          Continue Shopping
        </Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Your Eco Cart</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {cartCount} item{cartCount > 1 ? 's' : ''} ready for carbon-neutral delivery
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={clearCart} style={{ color: 'var(--color-danger)' }}>
          Clear all items
        </Button>
      </div>

      {/* Cart Layout Grid */}
      <div className="cart-page-layout">
        {/* Items List */}
        <div className="cart-items-container">
          <AnimatePresence>
            {cart.map((item) => (
              <motion.div
                key={item.id}
                className="cart-item-row"
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
              >
                <img
                  src={item.image_url || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=200&q=80'}
                  alt={item.name}
                  className="cart-item-thumbnail"
                  onClick={() => navigateTo(`product/${item.id}`)}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                    {item.category?.name || item.category || 'Eco Item'}
                  </span>
                  <h3
                    style={{ fontSize: '1rem', fontWeight: 600, cursor: 'pointer', lineHeight: 1.3 }}
                    onClick={() => navigateTo(`product/${item.id}`)}
                  >
                    {item.name}
                  </h3>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    ₹{Number(item.current_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Quantity Buttons */}
                <div className="product-quantity-selector" style={{ alignSelf: 'center' }}>
                  <button
                    type="button"
                    className="product-qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="product-qty-value">{item.quantity}</span>
                  <button
                    type="button"
                    className="product-qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Subtotal & Delete */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 800 }}>
                    ₹{(Number(item.current_price || 0) * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-danger)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                      padding: '0.25rem'
                    }}
                    title="Remove item"
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Right Summary Side */}
        <div className="cart-summary-card">
          <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            Order Summary
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="cart-summary-row">
              <span>Items Subtotal</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="cart-summary-row">
              <span>Carbon-Neutral Delivery</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>FREE</span>
            </div>

            <div className="cart-summary-row">
              <span>Eco Packaging</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Included</span>
            </div>

            {/* Eco Impact Calculation Card */}
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--color-primary-subtle)',
                border: '1px solid var(--color-primary-light)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                margin: '0.5rem 0'
              }}
            >
              <Leaf size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Environmental Impact
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  This order offsets ~{ecoSavingsKg} kg of carbon emissions.
                </div>
              </div>
            </div>

            <div className="cart-summary-total-row">
              <span>Estimated Total</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                ₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleProceedToCheckout}
            icon={<ArrowRight size={18} />}
            iconPosition="right"
          >
            {isAuthenticated ? 'Proceed to Checkout' : 'Sign In & Checkout'}
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.775rem' }}>
            <ShieldCheck size={16} />
            <span>256-bit Encrypted Secure Checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
