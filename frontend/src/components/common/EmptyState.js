import React from 'react';
import { motion } from 'framer-motion';
import Button from './Button';

export const EmptyState = ({
  icon = null,
  title = 'No items found',
  description = 'We couldn\'t find anything matching your criteria. Try adjusting your filters or search terms.',
  actionText = null,
  onAction = null,
  actionIcon = null,
  style = {}
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        maxWidth: '480px',
        margin: '0 auto',
        ...style
      }}
    >
      {icon && (
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-surface-sunken)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            marginBottom: '1.25rem',
            border: '1px solid var(--border-subtle)'
          }}
        >
          {icon}
        </div>
      )}
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginBottom: actionText ? '1.5rem' : 0 }}>
        {description}
      </p>
      {actionText && onAction && (
        <Button onClick={onAction} variant="primary" icon={actionIcon}>
          {actionText}
        </Button>
      )}
    </motion.div>
  );
};

export default EmptyState;
