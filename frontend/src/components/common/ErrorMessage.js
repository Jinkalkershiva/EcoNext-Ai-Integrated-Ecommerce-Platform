import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export const ErrorMessage = ({
  message = 'An unexpected error occurred. Please try again.',
  onRetry = null,
  style = {}
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1rem 1.25rem',
        backgroundColor: 'var(--color-danger-bg)',
        border: '1px solid var(--color-danger-border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-danger-text)',
        fontSize: '0.9rem',
        margin: '1rem 0',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <AlertCircle size={20} style={{ flexShrink: 0, color: 'var(--color-danger)' }} />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw size={14} />}
          style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', flexShrink: 0 }}
        >
          Retry
        </Button>
      )}
    </div>
  );
};

export default ErrorMessage;
