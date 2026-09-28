import React from 'react';

export const Badge = ({ children, variant = 'info', size = 'md' }) => {
  return (
    <span className={`badge badge-${variant} badge-${size}`}>
      {children}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  if (!status) return null;
  const s = status.toUpperCase();

  let variant = 'info';
  if (['ACTIVE', 'ORDER_CONFIRMED', 'DELIVERED', 'COMPLETED', 'PUBLISHED', 'CLOSED'].includes(s)) {
    variant = 'success';
  } else if (['PROCESSING', 'PACKED', 'SHIPPED', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED_AT_HUB', 'OUT_FOR_DELIVERY', 'IN_PROGRESS'].includes(s)) {
    variant = 'info';
  } else if (['LOW_STOCK', 'ORDER_PLACED', 'PENDING', 'CREATED', 'VALIDATING', 'IMPORTING'].includes(s)) {
    variant = 'warning';
  } else if (['SUSPENDED', 'CANCELLED', 'RETURNED', 'FAILED', 'FAILED_DELIVERY', 'OUT_OF_STOCK', 'ARCHIVED', 'INACTIVE'].includes(s)) {
    variant = 'danger';
  }

  const label = s.replace(/_/g, ' ');

  return <span className={`badge badge-${variant}`}>{label}</span>;
};

export const RoleBadge = ({ roleName }) => {
  if (!roleName) return null;
  const isSuper = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';
  return (
    <span className={`badge ${isSuper ? 'badge-primary' : 'badge-neutral'}`}>
      {roleName.replace(/_/g, ' ')}
    </span>
  );
};
