import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Leaf, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from './api';
import './auth-styles.css';

function SignupPage({ onSignupSuccess, onSwitchPage }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    if (password.length === 0) return { strength: '', text: '' };
    if (password.length < 6) return { strength: 'weak', text: 'Weak' };
    if (password.length < 10) return { strength: 'medium', text: 'Medium' };
    return { strength: 'strong', text: 'Strong' };
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (!formData.email.includes('@')) {
      newErrors.email = 'Enter a valid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) return;

    setLoading(true);
    setErrors({});

    try {
      const response = await apiService.signup(formData);
      if (response.status === 'success') {
        localStorage.setItem('authToken', response.tokens.access);
        localStorage.setItem('refreshToken', response.tokens.refresh);
        localStorage.setItem('user', JSON.stringify(response.user));
        onSignupSuccess(response);
      } else {
        const apiErrors = response.errors || {};
        const normalizedErrors = Object.entries(apiErrors).reduce((acc, [key, value]) => {
          acc[key] = Array.isArray(value) ? value[0] : value;
          return acc;
        }, {});

        if (!normalizedErrors.general) {
          normalizedErrors.general = response.message || 'Signup failed';
        }

        if (normalizedErrors.username || normalizedErrors.email) {
          setCurrentStep(1);
        }

        setErrors(normalizedErrors);
      }
    } catch (err) {
      setErrors({ general: err.message || 'An error occurred during signup' });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

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
          <h2>Join EcoNext Today</h2>
          <p>Create your account and start your eco-friendly shopping journey with AI-powered insights.</p>
          
          <div className="features-list">
            <motion.div 
              className="feature-item"
              whileHover={{ x: 8 }}
            >
              <CheckCircle size={24} />
              <span>Smart Price Predictions</span>
            </motion.div>
            <motion.div 
              className="feature-item"
              whileHover={{ x: 8 }}
            >
              <CheckCircle size={24} />
              <span>Personalized Recommendations</span>
            </motion.div>
            <motion.div 
              className="feature-item"
              whileHover={{ x: 8 }}
            >
              <CheckCircle size={24} />
              <span>Exclusive Eco Deals</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side - Signup Form */}
        <motion.div 
          className="auth-form-container"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="form-header">
            <h1>Create Account</h1>
            <p>Step {currentStep} of 2 - {currentStep === 1 ? 'Basic Info' : 'Security'}</p>
          </div>

          {/* Progress Steps */}
          <div className="progress-steps">
            <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
            <div className={`step-line ${currentStep >= 2 ? 'active' : ''}`} />
            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
          </div>

          <AnimatePresence>
            {errors.general && (
              <motion.div 
                className="alert-box alert-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AlertCircle size={20} />
                <span>{errors.general}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {currentStep === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="form-group-row">
                    <div className="form-group">
                      <label htmlFor="first_name">First Name</label>
                      <div className="input-wrapper">
                        <User className="input-icon" size={18} />
                        <input
                          id="first_name"
                          type="text"
                          name="first_name"
                          className="form-input"
                          placeholder="John"
                          value={formData.first_name}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="last_name">Last Name</label>
                      <div className="input-wrapper">
                        <User className="input-icon" size={18} />
                        <input
                          id="last_name"
                          type="text"
                          name="last_name"
                          className="form-input"
                          placeholder="Doe"
                          value={formData.last_name}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="username">Username *</label>
                    <div className="input-wrapper">
                      <User className="input-icon" size={18} />
                      <input
                        id="username"
                        type="text"
                        name="username"
                        className="form-input"
                        placeholder="Choose a unique username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {errors.username && (
                      <span className="error-text">
                        <AlertCircle size={14} />
                        {errors.username}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <div className="input-wrapper">
                      <Mail className="input-icon" size={18} />
                      <input
                        id="email"
                        type="email"
                        name="email"
                        className="form-input"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {errors.email && (
                      <span className="error-text">
                        <AlertCircle size={14} />
                        {errors.email}
                      </span>
                    )}
                  </div>

                  <motion.button
                    type="button"
                    className="btn-submit"
                    onClick={handleNext}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Continue
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="form-group">
                    <label htmlFor="password">Password *</label>
                    <div className="input-wrapper">
                      <Lock className="input-icon" size={18} />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        className="form-input"
                        placeholder="At least 6 characters"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                      <button
                        type="button"
                        className="toggle-password-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formData.password && (
                      <div className="password-strength">
                        <div className={`strength-indicator ${passwordStrength.strength}`} />
                        <span className="strength-text">{passwordStrength.text}</span>
                      </div>
                    )}
                    {errors.password && (
                      <span className="error-text">
                        <AlertCircle size={14} />
                        {errors.password}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="password_confirm">Confirm Password *</label>
                    <div className="input-wrapper">
                      <Lock className="input-icon" size={18} />
                      <input
                        id="password_confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="password_confirm"
                        className="form-input"
                        placeholder="Re-enter your password"
                        value={formData.password_confirm}
                        onChange={handleChange}
                        required
                      />
                      <button
                        type="button"
                        className="toggle-password-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formData.password_confirm && formData.password === formData.password_confirm && (
                      <span className="success-text">
                        <CheckCircle size={14} />
                        Passwords match
                      </span>
                    )}
                    {errors.password_confirm && (
                      <span className="error-text">
                        <AlertCircle size={14} />
                        {errors.password_confirm}
                      </span>
                    )}
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
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <span>Create Account</span>
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    className="btn-back"
                    onClick={handleBack}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Back
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <div className="form-footer">
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onSwitchPage('login')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', textDecoration: 'underline', font: 'inherit' }}
              >
                Sign in here
              </button>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default SignupPage;
