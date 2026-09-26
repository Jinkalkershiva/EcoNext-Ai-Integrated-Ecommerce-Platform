import React from 'react';

export const Badge = ({
  children,
  variant = 'primary', // 'primary', 'secondary', 'accent', 'success', 'warning', 'danger', 'neutral', 'eco'
  size = 'md', // 'sm', 'md'
  icon = null,
  className = '',
  style = {}
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'eco':
        return {
          backgroundColor: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          border: '1px solid var(--color-primary-hover)'
        };
      case 'accent':
        return {
          backgroundColor: 'var(--color-accent-light)',
          color: 'var(--color-accent)',
          border: '1px solid transparent'
        };
      case 'success':
        return {
          backgroundColor: 'var(--color-success-bg)',
          color: 'var(--color-success)',
          border: '1px solid var(--color-success-border)'
        };
      case 'warning':
        return {
          backgroundColor: 'var(--color-warning-bg)',
          color: 'var(--color-warning-text)',
          border: '1px solid var(--color-warning-border)'
        };
      case 'danger':
        return {
          backgroundColor: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          border: '1px solid var(--color-danger-border)'
        };
      case 'neutral':
        return {
          backgroundColor: 'var(--bg-surface-sunken)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)'
        };
      case 'primary':
      default:
        return {
          backgroundColor: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          border: '1px solid transparent'
        };
    }
  };

  const isSmall = size === 'sm';

  return (
    <span
      className={`badge badge-${variant} ${className}`}
      style={{
        ...getVariantStyles(),
        padding: isSmall ? '0.15rem 0.5rem' : '0.25rem 0.65rem',
        fontSize: isSmall ? '0.7rem' : '0.75rem',
        borderRadius: 'var(--radius-full)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontWeight: '600',
        lineHeight: 1,
        ...style
      }}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
