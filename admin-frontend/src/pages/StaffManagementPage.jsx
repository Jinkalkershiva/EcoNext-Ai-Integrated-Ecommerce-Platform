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

export const StaffManagementPage = () => {
  const { staff: currentStaff } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(true);
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
      setStaffList(staffData || []);
      setAvailableRoles(rolesData || []);
    } catch (err) {
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
    try {
      await staffApi.createStaff(newStaff);
      setSuccess(`Staff member ${newStaff.username} created successfully!`);
      setShowCreateModal(false);
      setNewStaff({ username: '', fullName: '', email: '', password: '', roles: ['INVENTORY_MANAGER'] });
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to create staff member');
    }
  };

  const handleUpdateRoles = async () => {
    if (!selectedStaff) return;
    setError('');
    setSuccess('');
    try {
      await staffApi.updateStaffRoles(selectedStaff.id, editRoles);
      setSuccess(`Updated roles for ${selectedStaff.username}`);
      setShowRoleModal(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to update roles');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedStaff || !newPassword) return;
    setError('');
    setSuccess('');
    try {
      await staffApi.resetPassword(selectedStaff.id, newPassword);
      setSuccess(`Password reset successfully for ${selectedStaff.username}`);
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    }
  };

  const handleToggleStatus = async (staffMember) => {
    const newStatus = staffMember.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await staffApi.updateStaffStatus(staffMember.id, newStatus);
      setSuccess(`Status changed to ${newStatus} for ${staffMember.username}`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to toggle status');
    }
  };

  const columns = [
    {
      header: 'Staff Member',
      key: 'fullName',
      render: (row) => (
        <div>
          <div className="font-semibold text-sm">{row.fullName}</div>
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
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles?.map((r) => (
            <RoleBadge key={r} roleName={r} />
          ))}
        </div>
      )
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
              setEditRoles(row.roles || []);
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
              {availableRoles.map((r) => (
                <option key={r.roleName} value={r.roleName}>
                  {r.roleName} - {r.description}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions-right mt-4">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Create Account
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
            const isChecked = editRoles.includes(role.roleName);
            return (
              <label key={role.id} className="role-checkbox-item p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEditRoles([...editRoles, role.roleName]);
                    } else {
                      setEditRoles(editRoles.filter((r) => r !== role.roleName));
                    }
                  }}
                />
                <div className="role-info">
                  <div className="font-semibold text-sm">{role.roleName}</div>
                  <div className="text-xs text-muted">{role.description}</div>
                </div>
              </label>
            );
          })}
        </div>
        <div className="modal-actions-right mt-4">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRoleModal(false)}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleUpdateRoles}>
            Save Role Permissions
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
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPasswordModal(false)}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleResetPassword} disabled={!newPassword}>
            Update Password
          </button>
        </div>
      </Modal>
    </div>
  );
};
