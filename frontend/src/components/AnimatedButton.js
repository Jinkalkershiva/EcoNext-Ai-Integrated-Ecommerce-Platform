import React from 'react';
import { motion } from 'framer-motion';
import styles from './AnimatedButton.module.css';

export const AnimatedButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  loading = false,
  ...props 
}) => {
  const variants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.05,
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
    },
    tap: { scale: 0.95 }
  };

  return (
    <motion.button
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      variants={variants}
      initial="initial"
      whileHover={!disabled ? "hover" : "initial"}
      whileTap={!disabled ? "tap" : "initial"}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className={styles.spinner}></span>
      ) : (
        children
      )}
    </motion.button>
  );
};

export default AnimatedButton;
