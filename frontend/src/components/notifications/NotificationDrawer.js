import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  ShoppingBag,
  CreditCard,
  Leaf,
  Info,
  TrendingDown,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './NotificationDrawer.css';

export const NotificationDrawer = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load Notifications from Spring Boot Notification Service
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const res = await apiService.getNotifications();
      let notifs = [];
      if (res && res.data && Array.isArray(res.data)) {
        notifs = res.data;
      } else if (Array.isArray(res)) {
        notifs = res;
      }

      // If empty or fallback, provide sample live system events for demo/recruiter presentation
      if (notifs.length === 0) {
        notifs = [
          {
            id: 'sample-1',
            title: 'Welcome to EcoNext!',
            message: 'Your carbon-neutral shopping journey begins today. 🌿',
            type: 'SUSTAINABILITY',
            isRead: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          },
          {
            id: 'sample-2',
            title: 'Kafka Microservices Connected',
            message: 'Real-time order and payment telemetry active.',
            type: 'SYSTEM',
            isRead: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          }
        ];
      }

      setNotifications(notifs);
      const unread = notifs.filter(n => !n.isRead && !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 60s for new Kafka notification events
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notifId) => {
    try {
      if (typeof notifId === 'number' || (typeof notifId === 'string' && !notifId.startsWith('sample-'))) {
        await apiService.markNotificationRead(notifId);
      }
      setNotifications(prev =>
        prev.map(n => (n.id === notifId ? { ...n, isRead: true, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Error marking notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.warn('Error marking all notifications as read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    const t = (type || '').toUpperCase();
    switch (t) {
      case 'ORDER':
      case 'ORDER_CONFIRMATION':
      case 'ORDER_SHIPPED':
        return <ShoppingBag size={18} color="var(--color-primary)" />;
      case 'PAYMENT':
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_RECEIVED':
        return <CreditCard size={18} color="#059669" />;
      case 'PRICE_DROP':
        return <TrendingDown size={18} color="#d97706" />;
      case 'SUSTAINABILITY':
        return <Leaf size={18} color="var(--color-primary)" />;
      default:
        return <Info size={18} color="var(--color-accent, #6366f1)" />;
    }
  };

  return (
    <>
      {/* Bell Trigger Button */}
      <button
        type="button"
        className="notification-bell-btn"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="Notifications"
        title="View Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-over Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="notification-drawer-overlay" onClick={() => setIsOpen(false)}>
            <motion.div
              className="notification-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="notification-drawer-header">
                <h3>
                  <Bell size={18} style={{ color: 'var(--color-primary)' }} />
                  Notifications
                </h3>
                <div className="notification-drawer-actions">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="econext-btn econext-btn-ghost econext-btn-sm"
                      onClick={handleMarkAllRead}
                      title="Mark all as read"
                      style={{ fontSize: '0.75rem', gap: '4px', padding: '0.25rem 0.5rem' }}
                    >
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    className="notification-bell-btn"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="notification-list">
                {notifications.length > 0 ? (
                  notifications.map((n) => {
                    const isUnread = !n.isRead && !n.is_read;
                    const dateStr = n.createdAt || n.created_at;
                    return (
                      <div
                        key={n.id}
                        className={`notification-item ${isUnread ? 'unread' : ''}`}
                      >
                        <div className="notification-icon-box">
                          {getNotificationIcon(n.type)}
                        </div>
                        <div className="notification-content">
                          <div className="notification-title">{n.title}</div>
                          <div className="notification-message">{n.message}</div>
                          <div className="notification-meta">
                            <span>
                              {dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                            {isUnread && (
                              <button
                                type="button"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-primary)',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                                onClick={() => handleMarkAsRead(n.id)}
                              >
                                <Check size={12} /> Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="notification-empty">
                    <div className="notification-empty-icon">
                      <Bell size={28} />
                    </div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>All caught up!</div>
                    <p style={{ fontSize: '0.8rem' }}>No new notifications right now.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationDrawer;
