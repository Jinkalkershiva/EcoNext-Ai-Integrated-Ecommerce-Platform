import React, { useState, useEffect, useRef } from 'react';
import { Bot, MessageSquare, X, Send, RotateCcw, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../api';
import './ChatAssistant.css';

export const ChatAssistant = ({ onViewDetails }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! 👋 I'm your EcoNext AI Shopping Assistant. Ask me anything about our eco-friendly products, materials, price predictions, or recommendations!",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString()
    };

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await apiService.sendChatMessage(text, history);
      const assistantMessage = {
        role: 'assistant',
        content: response?.reply || "Here is what I found for your request.",
        timestamp: new Date().toISOString(),
        products: response?.products || []
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat AI error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having a momentary connection glitch. Please check your backend connection and try asking again!",
          timestamp: new Date().toISOString(),
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Hello! 👋 I'm your EcoNext AI Shopping Assistant. Ask me anything about our eco-friendly products, materials, price predictions, or recommendations!",
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const samplePrompts = [
    "Show me organic cotton clothing",
    "What are the best sustainable picks under ₹2000?",
    "Explain how price prediction works"
  ];

  return (
    <div className="chat-assistant-widget">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chat-window-card"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="chat-window-header">
              <div className="chat-header-info">
                <div className="chat-header-avatar">
                  <Bot size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    EcoNext AI Assistant
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'inline-block' }} />
                    Active & Ready
                  </div>
                </div>
              </div>

              <div className="chat-header-actions">
                <button
                  type="button"
                  className="chat-icon-btn"
                  onClick={handleClear}
                  title="Clear chat history"
                  aria-label="Clear chat"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  type="button"
                  className="chat-icon-btn"
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  aria-label="Close chat"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="chat-body-messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble-row ${msg.role}`}>
                  <div className={`chat-bubble ${msg.isError ? 'error-bubble' : ''}`}>
                    {msg.content}

                    {/* Product recommendations inline */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="chat-product-suggestions">
                        {msg.products.map((p) => (
                          <div
                            key={p.id}
                            className="chat-product-card-mini"
                            onClick={() => {
                              onViewDetails && onViewDetails(p.id);
                              setIsOpen(false);
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                            <span style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ₹{p.price || p.current_price} <ArrowRight size={13} />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="chat-time-tag">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="chat-bubble-row assistant">
                  <div className="chat-bubble">
                    <div className="chat-typing-dots">
                      <div className="chat-typing-dot" />
                      <div className="chat-typing-dot" />
                      <div className="chat-typing-dot" />
                    </div>
                  </div>
                </div>
              )}

              {/* Starter prompts when only 1 greeting message */}
              {messages.length === 1 && (
                <div className="chat-prompts-suggestions">
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Quick questions to ask:
                  </span>
                  {samplePrompts.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      className="chat-prompt-pill"
                      onClick={() => handleSend(p)}
                    >
                      <Sparkles size={12} style={{ display: 'inline', marginRight: '5px', color: 'var(--color-accent)' }} />
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              className="chat-input-row"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <input
                type="text"
                className="chat-input-field"
                placeholder="Ask about products or sustainability..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      {!isOpen && (
        <motion.button
          type="button"
          className="chat-fab-trigger"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Shopping Assistant"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <MessageSquare size={22} />
        </motion.button>
      )}
    </div>
  );
};

export default ChatAssistant;
