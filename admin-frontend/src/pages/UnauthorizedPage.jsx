import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { staff } = useAuth();

  return (
    <div className="unauthorized-page flex items-center justify-center min-h-[70vh] p-4">
      <div className="unauthorized-card card max-w-md w-full text-center p-6">
        <div className="unauthorized-icon w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={36} />
        </div>
        <h2 className="font-bold text-xl mb-2">Access Restricted</h2>
        <p className="unauthorized-desc text-muted text-sm mb-4 leading-relaxed">
          Your staff account (<strong>{staff?.username}</strong>) does not have sufficient operational permissions to access this view.
        </p>
        <div className="assigned-roles mb-4 text-xs">
          <span className="text-muted block mb-1.5">Your Assigned Roles: </span>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {staff?.roles?.map((r) => (
              <span key={r} className="badge badge-neutral">
                {r.replace('ROLE_', '')}
              </span>
            ))}
          </div>
        </div>
        <p className="contact-admin text-xs text-muted mb-5 leading-relaxed">
          If you require access to this operational module, please request permission assignment from a System Administrator.
        </p>
        <div className="unauthorized-actions flex justify-center">
          <button className="btn btn-primary btn-sm flex items-center gap-1.5" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={14} />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
