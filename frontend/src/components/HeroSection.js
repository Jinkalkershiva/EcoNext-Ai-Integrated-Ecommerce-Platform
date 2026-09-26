import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Leaf } from 'lucide-react';
import styles from './HeroSection.module.css';

export const HeroSection = ({ onExplore }) => {
  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  };

  const scaleIn = {
    animate: {
      scale: [0.8, 1],
      opacity: [0, 1],
      transition: {
        duration: 0.8,
        delay: 0.3,
      },
    },
  };

  return (
    <motion.section 
      className={styles.hero}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Background gradient animation */}
      <motion.div
        className={styles.gradientBg}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Floating shapes */}
      <motion.div 
        className={`${styles.shape} ${styles.shape1}`}
        animate={{
          y: [0, -30, 0],
          rotate: [0, 45, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div 
        className={`${styles.shape} ${styles.shape2}`}
        animate={{
          y: [0, 30, 0],
          rotate: [0, -45, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className={styles.content}>
        <motion.div variants={itemVariants} className={styles.iconContainer}>
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <Leaf size={48} className={styles.icon} />
          </motion.div>
        </motion.div>

        <motion.h1 variants={itemVariants} className={styles.title}>
          Welcome to <span className={styles.highlight}>EcoNext</span>
        </motion.h1>

        <motion.p variants={itemVariants} className={styles.subtitle}>
          Discover sustainable products for a better tomorrow
        </motion.p>

        <motion.button
          variants={scaleIn}
          className={styles.ctaButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onExplore}
        >
          <span>Explore Now</span>
          <motion.span
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronRight size={20} />
          </motion.span>
        </motion.button>

        {/* Stats */}
        <motion.div variants={itemVariants} className={styles.stats}>
          {[
            { label: 'Products', value: '10K+' },
            { label: 'Users', value: '50K+' },
            { label: 'Eco-Friendly', value: '100%' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              className={styles.stat}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                className={styles.statValue}
                animate={{
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: idx * 0.2,
                }}
              >
                {stat.value}
              </motion.div>
              <div className={styles.statLabel}>{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
};

export default HeroSection;
