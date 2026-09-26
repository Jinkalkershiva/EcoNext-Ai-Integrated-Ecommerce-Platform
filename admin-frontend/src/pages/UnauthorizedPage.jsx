import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { staff } = useAuth();

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-card">
        <div className="unauthorized-icon">🚫</div>
        <h2>Access Restricted</h2>
        <p className="unauthorized-desc">
          Your staff account (<strong>{staff?.username}</strong>) does not have sufficient operational permissions to access this view.
        </p>
        <div className="assigned-roles">
          <span>Assigned Roles: </span>
          {staff?.roles?.map((r) => (
            <span key={r} className="badge badge-neutral">
              {r.replace('ROLE_', '')}
            </span>
          ))}
        </div>
        <p className="contact-admin">
          If you require access to this operational module, please request permission assignment from a System Administrator.
        </p>
        <div className="unauthorized-actions">
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
