import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  AlertTriangle,
  CheckCircle2,
  X,
  Key,
  Lock,
  RefreshCw
} from 'lucide-react';
import { roleApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';

const ALL_PERMISSIONS = [
  { key: 'PERMISSION_STAFF_VIEW', domain: 'STAFF', label: 'View Staff Directory' },
  { key: 'PERMISSION_STAFF_MANAGE', domain: 'STAFF', label: 'Manage Staff & Security' },
  { key: 'PERMISSION_CATALOG_VIEW', domain: 'CATALOG', label: 'View Catalog Items' },
  { key: 'PERMISSION_CATALOG_MANAGE', domain: 'CATALOG', label: 'Create & Edit Products' },
  { key: 'PERMISSION_INVENTORY_VIEW', domain: 'INVENTORY', label: 'View Stock Balances' },
  { key: 'PERMISSION_INVENTORY_ADJUST', domain: 'INVENTORY', label: 'Execute Stock Adjustments' },
  { key: 'PERMISSION_ORDER_VIEW', domain: 'ORDERS', label: 'View Customer Orders' },
  { key: 'PERMISSION_ORDER_STATUS_UPDATE', domain: 'ORDERS', label: 'Execute Order Transitions' },
  { key: 'PERMISSION_IMPORT_RUN', domain: 'IMPORT', label: 'Run CSV/Excel Batch Imports' },
  { key: 'PERMISSION_ANALYTICS_VIEW', domain: 'ANALYTICS', label: 'Access BI Reports & Telemetry' },
  { key: 'PERMISSION_AUDIT_VIEW', domain: 'AUDIT', label: 'Inspect Forensic Audit Trail' }
];

export const RolesPermissionsPage = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRole, setNewRole] = useState({
    roleName: '',
    description: '',
    permissions: ['PERMISSION_CATALOG_VIEW']
  });

  const loadRoles = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await roleApi.getAllRoles();
      setRoles(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRole.roleName) return;
    setError('');
    setSuccess('');
    try {
      await roleApi.createRole({
        ...newRole,
        roleName: newRole.roleName.toUpperCase().replace(/\s+/g, '_')
      });
      setSuccess(`Role ${newRole.roleName} created successfully!`);
      setShowCreateModal(false);
      setNewRole({ roleName: '', description: '', permissions: ['PERMISSION_CATALOG_VIEW'] });
      loadRoles();
    } catch (err) {
      setError(err.message || 'Failed to create role');
    }
  };

  const columns = [
    {
      header: 'Role Code',
      key: 'roleName',
      render: (row) => (
        <div>
          <span className="font-bold mono-text">{row.roleName}</span>
          {row.isSystemRole && <span className="badge badge-primary badge-xs ml-2">SYSTEM</span>}
        </div>
      )
    },
    {
      header: 'Description',
      key: 'description',
      render: (row) => <span className="text-muted text-sm">{row.description}</span>
    },
    {
      header: 'Assigned Permissions',
      key: 'permissions',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.permissions && row.permissions.length > 0 ? (
            row.permissions.map((p) => (
              <span key={p} className="badge badge-info badge-xs">
                {p.replace('PERMISSION_', '')}
              </span>
            ))
          ) : (
            <span className="text-muted text-xs">No permissions</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="roles-permissions-page">
      {error && (
        <div className="alert alert-danger mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button className="btn-close" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
          <button className="btn-close" onClick={() => setSuccess('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="page-header-flex mb-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <ShieldCheck size={24} className="text-primary" />
            <span>RBAC & PBAC Policy Engine</span>
          </h2>
          <p className="page-subtitle">
            Configure system and custom security roles with granular permissions.
          </p>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={roles}
          loading={loading}
          searchPlaceholder="Search roles..."
          actions={
            <button className="btn btn-primary btn-sm flex items-center gap-1.5" onClick={() => setShowCreateModal(true)}>
              <Plus size={14} />
              <span>Define Custom Operational Role</span>
            </button>
          }
        />
      </div>

      {/* Create Role Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Define Custom Operational Role"
        maxWidth="680px"
      >
        <form onSubmit={handleCreateRole}>
          <div className="form-group">
            <label className="form-label text-xs font-semibold">Role Identifier (e.g. SUSTAINABILITY_AUDITOR)</label>
            <input
              type="text"
              className="input mono-text"
              required
              value={newRole.roleName}
              onChange={(e) => setNewRole({ ...newRole, roleName: e.target.value })}
              placeholder="ROLE_NAME_IN_CAPS"
            />
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Role Description</label>
            <input
              type="text"
              className="input"
              required
              value={newRole.description}
              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              placeholder="e.g. Responsible for reviewing sustainability metrics and carbon audits"
            />
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Grant Granular Permissions</label>
            <div className="permission-grid grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {ALL_PERMISSIONS.map((perm) => {
                const isSelected = newRole.permissions.includes(perm.key);
                return (
                  <label key={perm.key} className="permission-checkbox-card p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewRole({
                            ...newRole,
                            permissions: [...newRole.permissions, perm.key]
                          });
                        } else {
                          setNewRole({
                            ...newRole,
                            permissions: newRole.permissions.filter((k) => k !== perm.key)
                          });
                        }
                      }}
                    />
                    <div>
                      <div className="perm-label font-medium text-xs">{perm.label}</div>
                      <div className="mono-text text-[11px] text-muted">{perm.key}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="modal-actions-right mt-4">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Register Role Policy
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
