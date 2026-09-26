import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import ChatAssistant from '../ai/ChatAssistant';
import { useCart } from '../../context/CartContext';
import { useNavigation } from '../../context/NavigationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Layout = ({ children }) => {
  const { notification, dismissToast } = useCart();
  const { navigateTo } = useNavigation();

  return (
    <div className="page-wrapper">
      <Navbar />

      {/* Global Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: '80px',
              right: '20px',
              zIndex: 1000,
              backgroundColor: 'var(--bg-surface-elevated)',
              border: `1px solid ${
                notification.type === 'error'
                  ? 'var(--color-danger-border)'
                  : notification.type === 'info'
                  ? 'var(--color-info-border)'
                  : 'var(--color-success-border)'
              }`,
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: '0.875rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              maxWidth: '380px'
            }}
          >
            {notification.type === 'error' ? (
              <AlertCircle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
            ) : notification.type === 'info' ? (
              <Info size={18} style={{ color: 'var(--color-info)', flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
              {notification.message}
            </span>
            <button
              type="button"
              onClick={dismissToast}
              style={{
                marginLeft: 'auto',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>

      {/* Persistent AI Shopping Assistant */}
      <ChatAssistant onViewDetails={(productId) => navigateTo(`product/${productId}`)} />

      <Footer />
    </div>
  );
};

export default Layout;
