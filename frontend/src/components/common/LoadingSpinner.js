import React from 'react';

export const LoadingSpinner = ({
  size = 'md', // 'sm', 'md', 'lg'
  text = 'Loading...',
  fullPage = false,
  style = {}
}) => {
  const getDimensions = () => {
    switch (size) {
      case 'sm': return { width: '18px', height: '18px', borderWidth: '2px' };
      case 'lg': return { width: '48px', height: '48px', borderWidth: '3.5px' };
      case 'md':
      default: return { width: '32px', height: '32px', borderWidth: '3px' };
    }
  };

  const spinner = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: fullPage ? '4rem 1rem' : '2rem 1rem',
        color: 'var(--text-muted)',
        ...style
      }}
    >
      <div
        style={{
          ...getDimensions(),
          borderRadius: '50%',
          borderStyle: 'solid',
          borderColor: 'var(--border-default)',
          borderTopColor: 'var(--color-primary)',
          animation: 'btn-spin 0.7s linear infinite',
        }}
      />
      {text && <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{text}</span>}
    </div>
  );

  return spinner;
};

export default LoadingSpinner;
