import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Mail,
  UserCheck
} from 'lucide-react';
import { staffApi, roleApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge, RoleBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';

const DEFAULT_OPERATIONAL_ROLES = [
  { roleName: 'INVENTORY_MANAGER', name: 'INVENTORY_MANAGER', description: 'Manages stock inventory, adjustments, thresholds, and low-stock alerts' },
  { roleName: 'CATALOG_MANAGER', name: 'CATALOG_MANAGER', description: 'Manages products, categories, pricing, attributes, and catalog data entry' },
  { roleName: 'ORDER_MANAGER', name: 'ORDER_MANAGER', description: 'Supervises order processing, lifecycle states, cancellations, and logistics' },
  { roleName: 'ORDER_PROCESSING_STAFF', name: 'ORDER_PROCESSING_STAFF', description: 'Handles daily picking, packing, and shipment dispatch transitions' },
  { roleName: 'DATA_ANALYST', name: 'DATA_ANALYST', description: 'Accesses reports, operational analytics, sales aggregations, and data exports' },
  { roleName: 'DATA_ENTRY_STAFF', name: 'DATA_ENTRY_STAFF', description: 'Performs manual product creation and batch CSV/Excel data entry' },
  { roleName: 'DELIVERY_STAFF', name: 'DELIVERY_STAFF', description: 'Field and dispatch logistics updates (Out for delivery, Delivered)' }
];

export const StaffManagementPage = () => {
  const { staff: currentStaff } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [availableRoles, setAvailableRoles] = useState(DEFAULT_OPERATIONAL_ROLES);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Form states
  const [newStaff, setNewStaff] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    roles: ['INVENTORY_MANAGER']
  });

  const [editRoles, setEditRoles] = useState([]);
  const [newPassword, setNewPassword] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [staffData, rolesData] = await Promise.all([
        staffApi.getAllStaff(),
        roleApi.getAllRoles()
      ]);

      const rawStaff = Array.isArray(staffData) ? staffData : (staffData?.content || []);
      const normalizedStaff = rawStaff.map((s) => ({
        ...s,
        fullName: s.fullName || s.name || s.username,
        name: s.name || s.fullName || s.username,
        roles: (s.roles && s.roles.length > 0)
          ? s.roles
          : (s.roleName ? [s.roleName] : (s.role ? [s.role] : ['ROLE_STAFF']))
      }));

      const rawRoles = Array.isArray(rolesData) ? rolesData : (rolesData?.content || []);
      const normalizedRoles = rawRoles.length > 0 ? rawRoles.map((r) => ({
        id: r.id || r.name || r.roleName,
        roleName: r.roleName || r.name,
        name: r.name || r.roleName,
        description: r.description || r.roleName || r.name,
        permissions: r.permissions || []
      })) : DEFAULT_OPERATIONAL_ROLES;

      setStaffList(normalizedStaff);
      setAvailableRoles(normalizedRoles);

      // Default role if not set
      if (normalizedRoles.length > 0 && (!newStaff.roles || newStaff.roles.length === 0)) {
        setNewStaff((prev) => ({ ...prev, roles: [normalizedRoles[0].roleName] }));
      }
    } catch (err) {
      console.error('Failed to load staff/roles:', err);
      setError(err.message || 'Failed to load staff directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const selectedRole = newStaff.roles?.[0] || availableRoles[0]?.roleName || 'INVENTORY_MANAGER';
      const payload = {
        username: newStaff.username?.trim(),
        name: newStaff.fullName?.trim() || newStaff.username?.trim(),
        fullName: newStaff.fullName?.trim() || newStaff.username?.trim(),
        email: newStaff.email?.trim().toLowerCase(),
        password: newStaff.password,
        roleName: selectedRole,
        roles: [selectedRole]
      };

      await staffApi.createStaff(payload);
      setSuccess(`Staff account '${payload.username}' provisioned and persisted successfully!`);
      setShowCreateModal(false);
      setNewStaff({
        username: '',
        fullName: '',
        email: '',
        password: '',
        roles: [availableRoles[0]?.roleName || 'INVENTORY_MANAGER']
      });
      await loadData();
    } catch (err) {
      console.error('Failed to create staff member:', err);
      setError(err.message || 'Failed to create staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRoles = async () => {
    if (!selectedStaff) return;
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const primaryRole = editRoles[0] || selectedStaff.roleName || 'INVENTORY_MANAGER';
      await staffApi.updateStaff(selectedStaff.id, {
        name: selectedStaff.name || selectedStaff.fullName,
        email: selectedStaff.email,
        roleName: primaryRole,
        roles: editRoles
      });
      setSuccess(`Assigned roles updated for '${selectedStaff.username}'`);
      setShowRoleModal(false);
      await loadData();
    } catch (err) {
      console.error('Failed to update roles:', err);
      setError(err.message || 'Failed to update roles');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedStaff || !newPassword) return;
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await staffApi.resetPassword(selectedStaff.id, newPassword);
      setSuccess(`Password updated successfully for '${selectedStaff.username}'`);
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err) {
      console.error('Failed to reset password:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staffMember) => {
    const newStatus = staffMember.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await staffApi.updateStaffStatus(staffMember.id, newStatus);
      setSuccess(`Status changed to ${newStatus} for '${staffMember.username}'`);
      await loadData();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setError(err.message || 'Failed to toggle status');
    }
  };

  const columns = [
    {
      header: 'Staff Member',
      key: 'fullName',
      render: (row) => (
        <div>
          <div className="font-semibold text-sm">{row.fullName || row.name || row.username}</div>
          <div className="mono-text text-muted text-xs">@{row.username}</div>
        </div>
      )
    },
    {
      header: 'Email',
      key: 'email',
      render: (row) => <span className="text-sm">{row.email}</span>
    },
    {
      header: 'Roles',
      key: 'roles',
      render: (row) => {
        const roles = (row.roles && row.roles.length > 0) ? row.roles : (row.roleName ? [row.roleName] : ['ROLE_STAFF']);
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((r) => (
              <RoleBadge key={r} roleName={r} />
            ))}
          </div>
        );
      }
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Last Login',
      key: 'lastLoginAt',
      render: (row) => (
        <span className="text-xs text-muted">
          {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : 'Never'}
        </span>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <div className="action-buttons-group flex items-center gap-1">
          <button
            className="btn btn-secondary btn-xs flex items-center gap-1"
            onClick={() => {
              setSelectedStaff(row);
              const currentRoles = (row.roles && row.roles.length > 0) ? row.roles : (row.roleName ? [row.roleName] : []);
              setEditRoles(currentRoles);
              setShowRoleModal(true);
            }}
          >
            <Shield size={11} />
            <span>Assign Roles</span>
          </button>
          <button
            className="btn btn-secondary btn-xs flex items-center gap-1"
            onClick={() => {
              setSelectedStaff(row);
              setShowPasswordModal(true);
            }}
          >
            <KeyRound size={11} />
            <span>Reset Pwd</span>
          </button>
          <button
            className={`btn ${row.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'} btn-xs`}
            onClick={() => handleToggleStatus(row)}
            disabled={row.username === 'admin'}
          >
            {row.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="staff-management-page">
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
            <Users size={24} className="text-primary" />
            <span>Staff Administration & Operations Team</span>
          </h2>
          <p className="page-subtitle">
            Provision staff operators, manage role assignments, and oversee access credentials.
          </p>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={staffList}
          loading={loading}
          searchPlaceholder="Search staff by name, username, or email..."
          actions={
            <button className="btn btn-primary btn-sm flex items-center gap-1.5" onClick={() => setShowCreateModal(true)}>
              <UserPlus size={14} />
              <span>Provision Staff Account</span>
            </button>
          }
        />
      </div>

      {/* Create Staff Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Provision New Staff Account"
      >
        <form onSubmit={handleCreateStaff}>
          <div className="form-group">
            <label className="form-label text-xs font-semibold">Full Name</label>
            <input
              type="text"
              className="input"
              required
              value={newStaff.fullName}
              onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
              placeholder="e.g. Priyesh Sharma"
            />
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Username</label>
            <input
              type="text"
              className="input"
              required
              value={newStaff.username}
              onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
              placeholder="e.g. priyesh_ops"
            />
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Corporate Email</label>
            <input
              type="email"
              className="input"
              required
              value={newStaff.email}
              onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
              placeholder="e.g. priyesh@econext.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Temporary Password</label>
            <input
              type="password"
              className="input"
              required
              value={newStaff.password}
              onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
              placeholder="Minimum 8 characters"
            />
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Assign Initial Role</label>
            <select
              className="input"
              value={newStaff.roles[0] || 'INVENTORY_MANAGER'}
              onChange={(e) => setNewStaff({ ...newStaff, roles: [e.target.value] })}
            >
              {(availableRoles.length > 0 ? availableRoles : DEFAULT_OPERATIONAL_ROLES)
                .filter((r) => (r.roleName || r.name) !== 'ROLE_ADMIN')
                .map((r) => {
                  const roleKey = r.roleName || r.name;
                  return (
                    <option key={roleKey} value={roleKey}>
                      {roleKey} — {r.description || roleKey}
                    </option>
                  );
                })}
            </select>
          </div>

          <div className="modal-actions-right mt-4">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Role Assignment Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title={`Assign Roles for ${selectedStaff?.fullName || selectedStaff?.username}`}
      >
        <p className="text-muted text-xs mb-3">Select one or more operational roles to grant policy permissions:</p>
        <div className="roles-checklist space-y-2">
          {availableRoles.map((role) => {
            const roleKey = role.roleName || role.name;
            const isChecked = editRoles.includes(roleKey);
            return (
              <label key={roleKey} className="role-checkbox-item p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEditRoles([...editRoles, roleKey]);
                    } else {
                      setEditRoles(editRoles.filter((r) => r !== roleKey));
                    }
                  }}
                />
                <div className="role-info">
                  <div className="font-semibold text-sm">{roleKey}</div>
                  <div className="text-xs text-muted">{role.description}</div>
                </div>
              </label>
            );
          })}
        </div>
        <div className="modal-actions-right mt-4">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRoleModal(false)} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleUpdateRoles} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Role Permissions'}
          </button>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={`Reset Password for ${selectedStaff?.username}`}
      >
        <div className="form-group">
          <label className="form-label text-xs font-semibold">New Password</label>
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter secure replacement password"
          />
        </div>
        <div className="modal-actions-right mt-4">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPasswordModal(false)} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleResetPassword} disabled={!newPassword || submitting}>
            {submitting ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default StaffManagementPage;
