import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, RefreshCw } from 'lucide-react';
import './ChatAssistant.css';
import { apiService } from '../api';

const ChatAssistant = ({ onViewDetails }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! 👋 I'm EcoNext AI. I can help you find products, compare options, understand product features, and make smarter shopping decisions. What are you looking for today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async (text) => {
    if (!text.trim()) return;
    
    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    
    // We only send previous role/content pairs to the API
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await apiService.sendChatMessage(text, history);
      
      const assistantMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        products: response.products || []
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Hi! 👋 I'm EcoNext AI. I can help you find products, compare options, understand product features, and make smarter shopping decisions. What are you looking for today?",
      timestamp: new Date().toISOString()
    }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Convert markdown-style asterisks to simple b tags (very basic parser for chat)
  const formatText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="chat-assistant-container">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="chat-window"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="chat-header">
              <div className="chat-header-title">
                <Bot size={20} />
                EcoNext AI
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="chat-close-btn" onClick={clearChat} title="Clear Chat">
                  <RefreshCw size={16} />
                </button>
                <button className="chat-close-btn" onClick={() => setIsOpen(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="chat-messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-message-wrapper ${msg.role}`}>
                  <div className={`chat-message ${msg.role}`}>
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i}>{formatText(line)}</p>
                    ))}
                    {msg.products && msg.products.length > 0 && (
                      <div className="chat-suggestions" style={{ marginTop: '12px' }}>
                        {msg.products.map(p => (
                          <div 
                            key={p.id} 
                            className="chat-suggestion-chip"
                            onClick={() => onViewDetails && onViewDetails(p.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <span>{p.name} (₹{p.price})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="chat-timestamp">
                    {msg.role === 'user' ? 'You' : 'EcoNext AI'} • {formatTime(msg.timestamp)}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="chat-message-wrapper assistant">
                  <div className="chat-typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}
              
              {messages.length === 1 && !isLoading && (
                <div className="chat-suggestions">
                  <button className="chat-suggestion-chip" onClick={() => handleSend("Find me the best laptop under ₹60,000")}>
                    Find me a laptop under ₹60,000
                  </button>
                  <button className="chat-suggestion-chip" onClick={() => handleSend("Suggest an eco-friendly product")}>
                    Suggest eco-friendly products
                  </button>
                  <button className="chat-suggestion-chip" onClick={() => handleSend("Help me choose a skincare routine")}>
                    Skincare routine
                  </button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="chat-input-area">
              <textarea
                className="chat-input"
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={1}
              />
              <button 
                className="chat-send-btn"
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isLoading}
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isOpen && (
        <motion.button 
          className="chat-toggle-btn"
          onClick={() => setIsOpen(true)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <MessageSquare size={24} />
        </motion.button>
      )}
    </div>
  );
};

export default ChatAssistant;
