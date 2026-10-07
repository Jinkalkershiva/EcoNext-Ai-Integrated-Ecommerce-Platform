import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api';
import { MessageSquare, Send, X, Bot, User as UserIcon, Sparkles, ShieldCheck, Truck } from 'lucide-react';
import Button from '../common/Button';
import './ProductInquiryModal.css';

export const ProductInquiryModal = ({ isOpen, onClose, product, selectedVariant }) => {
  const { isAuthenticated, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen || !product?.id) return;

    let isMounted = true;
    const fetchHistory = async () => {
      if (!isAuthenticated) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiService.getProductInquiries(product.id);
        if (isMounted && res && res.status === 'success') {
          setMessages(res.inquiries || []);
        }
      } catch (err) {
        console.warn('Could not fetch inquiries history:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHistory();
    return () => { isMounted = false; };
  }, [isOpen, product?.id, isAuthenticated]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen || !product) return null;

  const currentPrice = selectedVariant ? Number(selectedVariant.price) : Number(product.current_price || product.price || 0);
  const prodImg = product.image_url || product.imageUrl || '';

  const handleSend = async (customText = null) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend) return;

    if (!isAuthenticated) {
      setError('Please log in with your customer account to send inquiries.');
      return;
    }

    setSending(true);
    setError(null);

    // Optimistic user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      sender_type: 'CUSTOMER',
      message: textToSend,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setInputText('');

    try {
      const res = await apiService.sendProductInquiry(product.id, textToSend);
      if (res && res.status === 'success') {
        setMessages(res.inquiries || []);
      }
    } catch (err) {
      console.error('Failed to send inquiry:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    'Is this available in size XL?',
    'What sustainable materials are used?',
    'How does 7-day doorstep return work?',
    'Can I pay via Cash on Delivery with OTP?'
  ];

  return (
    <div className="inquiry-modal-overlay" onClick={onClose}>
      <div className="inquiry-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="inquiry-header">
          <div className="inquiry-header-left">
            <div className="inquiry-bot-icon">
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 className="inquiry-title">Product Inquiry & Discussion</h3>
              <p className="inquiry-sub">Direct product questions answered with verified catalog data</p>
            </div>
          </div>
          <button type="button" className="inquiry-close-btn" onClick={onClose} aria-label="Close inquiry modal">
            <X size={20} />
          </button>
        </div>

        {/* Product Context Banner */}
        <div className="inquiry-product-context">
          <div className="inquiry-prod-img">
            {prodImg ? <img src={prodImg} alt={product.name} /> : <span>Eco</span>}
          </div>
          <div className="inquiry-prod-details">
            <div className="inquiry-prod-name">{product.name}</div>
            <div className="inquiry-prod-meta">
              <span className="inquiry-prod-price">₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              {selectedVariant && (
                <span className="inquiry-prod-variant">Variant: <strong>{selectedVariant.size || selectedVariant.sku}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Chat Body */}
        <div className="inquiry-chat-body">
          {!isAuthenticated ? (
            <div className="inquiry-auth-prompt">
              <ShieldCheck size={36} style={{ color: 'var(--color-primary)', margin: '0 auto 0.75rem auto' }} />
              <h4>Sign in to Ask Questions</h4>
              <p>Sign in to save your conversation history and receive verified seller updates.</p>
            </div>
          ) : messages.length === 0 && !loading ? (
            <div className="inquiry-empty-state">
              <Bot size={36} style={{ color: 'var(--color-primary)', margin: '0 auto 0.5rem auto' }} />
              <p>Have a question about sizing, materials, or delivery for <strong>{product.name}</strong>?</p>
              <span className="inquiry-empty-hint">Pick a suggested question below or type your inquiry.</span>
            </div>
          ) : (
            <div className="inquiry-messages-list">
              {messages.map((msg, idx) => {
                const isCustomer = msg.sender_type === 'CUSTOMER';
                const timeStr = msg.created_at
                  ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Now';

                return (
                  <div key={msg.id || idx} className={`inquiry-msg-row ${isCustomer ? 'customer' : 'assistant'}`}>
                    <div className="inquiry-msg-avatar">
                      {isCustomer ? <UserIcon size={14} /> : <Bot size={14} />}
                    </div>
                    <div className="inquiry-msg-bubble">
                      <div className="inquiry-msg-sender">
                        {isCustomer ? (user?.first_name || 'You') : 'EcoNext Assistant'}
                      </div>
                      <div className="inquiry-msg-text">{msg.message}</div>
                      <div className="inquiry-msg-time">{timeStr}</div>
                    </div>
                  </div>
                );
              })}
              {sending && (
                <div className="inquiry-msg-row assistant">
                  <div className="inquiry-msg-avatar">
                    <Bot size={14} />
                  </div>
                  <div className="inquiry-msg-bubble typing">
                    <span>Checking verified catalog details...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        {isAuthenticated && (
          <div className="inquiry-quick-prompts">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className="quick-prompt-pill"
                onClick={() => handleSend(prompt)}
                disabled={sending}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        {isAuthenticated && (
          <form
            className="inquiry-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            {error && <div className="inquiry-error-banner">{error}</div>}
            <div className="inquiry-input-row">
              <input
                type="text"
                className="inquiry-input-field"
                placeholder="Ask about size, delivery, packaging..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={sending}
              />
              <button
                type="submit"
                className="inquiry-send-btn"
                disabled={sending || !inputText.trim()}
                title="Send inquiry"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProductInquiryModal;
