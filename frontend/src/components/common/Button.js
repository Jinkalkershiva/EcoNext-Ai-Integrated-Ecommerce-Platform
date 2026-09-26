import React from 'react';
import { motion } from 'framer-motion';
import './Button.css';

export const Button = ({
  children,
  onClick,
  variant = 'primary', // 'primary', 'secondary', 'outline', 'ghost', 'danger', 'accent'
  size = 'md', // 'sm', 'md', 'lg'
  disabled = false,
  loading = false,
  fullWidth = false,
  icon = null,
  iconPosition = 'left',
  type = 'button',
  className = '',
  style = {},
  ...props
}) => {
  return (
    <motion.button
      type={type}
      className={`econext-btn econext-btn-${variant} econext-btn-${size} ${fullWidth ? 'econext-btn-full' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15, ease: 'easeInOut' }}
      style={style}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="btn-icon left">{icon}</span>}
          <span className="btn-text">{children}</span>
          {icon && iconPosition === 'right' && <span className="btn-icon right">{icon}</span>}
        </>
      )}
    </motion.button>
  );
};

export default Button;
