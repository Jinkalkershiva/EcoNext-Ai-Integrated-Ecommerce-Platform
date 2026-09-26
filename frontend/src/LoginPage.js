import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Eye, EyeOff, Leaf, Sparkles, ShieldCheck } from 'lucide-react';
import { apiService } from './api';
import './auth-styles.css';

function LoginPage({ onLoginSuccess, onSwitchPage }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiService.login(formData);
      if (response.status === 'success') {
        localStorage.setItem('authToken', response.tokens.access);
        localStorage.setItem('refreshToken', response.tokens.refresh);
        localStorage.setItem('user', JSON.stringify(response.user));
        onLoginSuccess(response);
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-background" />
      
      <motion.div 
        className="auth-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Left Side - Branding */}
        <motion.div 
          className="auth-branding"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="brand-icon">
            <Leaf size={40} />
          </div>
          <h2>Welcome to EcoNext</h2>
          <p>Your AI-powered eco-friendly marketplace. Shop smart, save money, and protect the planet.</p>
          
          <div className="features-list">
            <motion.div 
              className="feature-item"
              whileHover={{ x: 8 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Sparkles size={24} />
              <span>AI Price Predictions</span>
            </motion.div>
            <motion.div 
              className="feature-item"
              whileHover={{ x: 8 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <ShieldCheck size={24} />
              <span>Secure Shopping</span>
            </motion.div>
            <motion.div 
              className="feature-item"
              whileHover={{ x: 8 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Leaf size={24} />
              <span>Eco-Friendly Products</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div 
          className="auth-form-container"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="form-header">
            <h1>Sign In</h1>
            <p>Enter your credentials to access your account</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                className="alert-box alert-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input
                  id="username"
                  type="text"
                  name="username"
                  className="form-input"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="forgot-password"
                  onClick={() => onSwitchPage('signup')}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember">Remember me for 30 days</label>
            </div>

            <motion.button
              type="submit"
              className="btn-submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <>
                  <div className="loader" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </motion.button>
          </form>

          <div className="divider">
            <span>or continue with</span>
          </div>

          <div className="form-footer">
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => onSwitchPage('signup')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', textDecoration: 'underline', font: 'inherit' }}
              >
                Create one now
              </button>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default LoginPage;
