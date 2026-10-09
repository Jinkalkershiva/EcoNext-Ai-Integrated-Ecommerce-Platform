import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  UserCheck,
  Crown,
  Eye,
  EyeOff,
  Edit2,
  Building,
  Info,
  Filter,
  Check,
  Lock,
  Search,
  UserX
} from 'lucide-react';
import { staffApi, roleApi, departmentApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge, RoleBadge, DepartmentBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';

const DEFAULT_OPERATIONAL_DEPARTMENTS = [
  { id: 'dept_admin', name: 'Administration', allowedRoles: ['ROLE_ADMIN', 'ADMIN'] },
  { id: 'dept_warehouse', name: 'Inventory/Warehouse', allowedRoles: ['ROLE_WAREHOUSE', 'INVENTORY_MANAGER', 'CATALOG_MANAGER', 'DATA_ENTRY_STAFF'] },
  { id: 'dept_order', name: 'Order Management', allowedRoles: ['ROLE_ORDER_MANAGER', 'ORDER_MANAGER'] },
  { id: 'dept_fulfillment', name: 'Fulfillment/Logistics', allowedRoles: ['ROLE_FULFILLMENT', 'ORDER_PROCESSING_STAFF'] },
  { id: 'dept_driver', name: 'Driver/Fleet', allowedRoles: ['ROLE_DRIVER', 'DELIVERY_STAFF'] },
  { id: 'dept_finance', name: 'Finance/Payments', allowedRoles: ['ROLE_FINANCE', 'DATA_ANALYST'] },
  { id: 'dept_support', name: 'Customer Support', allowedRoles: ['ROLE_SUPPORT', 'CUSTOMER_SUPPORT'] },
  { id: 'dept_notifications', name: 'Notifications/Communications', allowedRoles: ['ROLE_NOTIFICATIONS'] },
  { id: 'dept_governance', name: 'Platform Governance', allowedRoles: ['ROLE_SUPER_ADMIN', 'SUPER_ADMIN'] }
];

const DEFAULT_OPERATIONAL_ROLES = [
  { roleName: 'ROLE_ADMIN', name: 'ROLE_ADMIN', department: 'Administration', description: 'Store operations & administration' },
  { roleName: 'INVENTORY_MANAGER', name: 'INVENTORY_MANAGER', department: 'Inventory/Warehouse', description: 'Inbound receipt, stock allocation, and catalog oversight' },
  { roleName: 'ROLE_WAREHOUSE', name: 'ROLE_WAREHOUSE', department: 'Inventory/Warehouse', description: 'Inbound receipt, inspection, and inventory control' },
  { roleName: 'CATALOG_MANAGER', name: 'CATALOG_MANAGER', department: 'Inventory/Warehouse', description: 'Product catalog, attributes, and category management' },
  { roleName: 'DATA_ENTRY_STAFF', name: 'DATA_ENTRY_STAFF', department: 'Inventory/Warehouse', description: 'Catalog data entry and product data import' },
  { roleName: 'ORDER_MANAGER', name: 'ORDER_MANAGER', department: 'Order Management', description: 'Order lifecycle supervision and state transitions' },
  { roleName: 'ROLE_ORDER_MANAGER', name: 'ROLE_ORDER_MANAGER', department: 'Order Management', description: 'Order lifecycle supervision and state transitions' },
  { roleName: 'ORDER_PROCESSING_STAFF', name: 'ORDER_PROCESSING_STAFF', department: 'Fulfillment/Logistics', description: 'Outbound dispatch, packing, and fulfillment center coordination' },
  { roleName: 'ROLE_FULFILLMENT', name: 'ROLE_FULFILLMENT', department: 'Fulfillment/Logistics', description: 'Outbound dispatch, packing, and carrier fleet coordination' },
  { roleName: 'DELIVERY_STAFF', name: 'DELIVERY_STAFF', department: 'Driver/Fleet', description: 'Field delivery & reverse pickup logistics' },
  { roleName: 'ROLE_DRIVER', name: 'ROLE_DRIVER', department: 'Driver/Fleet', description: 'Field delivery & reverse pickup logistics' },
  { roleName: 'DATA_ANALYST', name: 'DATA_ANALYST', department: 'Finance/Payments', description: 'Payment reconciliation, refund ledger, and financial reporting' },
  { roleName: 'ROLE_FINANCE', name: 'ROLE_FINANCE', department: 'Finance/Payments', description: 'Payment reconciliation, refund ledger, and offline COD payouts' },
  { roleName: 'ROLE_SUPPORT', name: 'ROLE_SUPPORT', department: 'Customer Support', description: 'Customer inquiries, claims review, and return support' },
  { roleName: 'ROLE_NOTIFICATIONS', name: 'ROLE_NOTIFICATIONS', department: 'Notifications/Communications', description: 'Customer Email/SMS dispatch monitoring & delivery alerts' },
  { roleName: 'ROLE_SUPER_ADMIN', name: 'ROLE_SUPER_ADMIN', department: 'Platform Governance', description: 'Master Platform Owner with unrestricted governance' }
];

export const resolveCanonicalDepartment = (staff) => {
  const roleName = (staff.roles && staff.roles[0]) || staff.roleName || staff.role || '';
  const cleanRole = String(roleName).toUpperCase().trim();

  if (['ROLE_SUPER_ADMIN', 'SUPER_ADMIN'].includes(cleanRole)) return 'Platform Governance';
  if (['ROLE_ORDER_MANAGER', 'ORDER_MANAGER'].includes(cleanRole)) return 'Order Management';
  if (['ROLE_WAREHOUSE', 'INVENTORY_MANAGER', 'CATALOG_MANAGER', 'DATA_ENTRY_STAFF'].includes(cleanRole)) return 'Inventory/Warehouse';
  if (['ROLE_FULFILLMENT', 'ORDER_PROCESSING_STAFF'].includes(cleanRole)) return 'Fulfillment/Logistics';
  if (['ROLE_DRIVER', 'DELIVERY_STAFF'].includes(cleanRole)) return 'Driver/Fleet';
  if (['ROLE_FINANCE', 'DATA_ANALYST'].includes(cleanRole)) return 'Finance/Payments';
  if (['ROLE_SUPPORT', 'CUSTOMER_SUPPORT'].includes(cleanRole)) return 'Customer Support';
  if (['ROLE_NOTIFICATIONS'].includes(cleanRole)) return 'Notifications/Communications';
  if (['ROLE_ADMIN', 'ADMIN'].includes(cleanRole)) return 'Administration';

  if (staff.department && staff.department !== 'Administration' && staff.department !== 'General Operations') {
    return staff.department;
  }

  return staff.department || 'Administration';
};

export const StaffManagementPage = () => {
  const navigate = useNavigate();
  const { staff: currentStaff, isSuperAdmin, setPreviewRole } = useAuth();

  const [staffList, setStaffList] = useState([]);
  const [availableRoles, setAvailableRoles] = useState(DEFAULT_OPERATIONAL_ROLES);
  const [departments, setDepartments] = useState(DEFAULT_OPERATIONAL_DEPARTMENTS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters state
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [confirmAction, setConfirmAction] = useState({ title: '', message: '', onConfirm: null });

  // Create Form State
  const [newStaff, setNewStaff] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    department: 'Administration',
    roleName: 'ROLE_ADMIN',
    status: 'ACTIVE'
  });
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Edit Form State
  const [editStaff, setEditStaff] = useState({
    fullName: '',
    email: '',
    department: '',
    roleName: '',
    status: 'ACTIVE'
  });

  const [newPassword, setNewPassword] = useState('');
  const [showResetPasswordText, setShowResetPasswordText] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [staffRes, rolesRes, deptRes] = await Promise.allSettled([
        staffApi.getAllStaff(),
        roleApi.getAllRoles(),
        departmentApi.getAllDepartments()
      ]);

      if (staffRes.status === 'fulfilled') {
        const staffData = staffRes.value;
        const rawStaff = Array.isArray(staffData) ? staffData : (staffData?.content || staffData?.data || []);
        const normalizedStaff = rawStaff.map((s) => {
          const roles = (s.roles && s.roles.length > 0)
            ? s.roles
            : (s.roleName ? [s.roleName] : (s.role ? [s.role] : ['ROLE_ADMIN']));
          const canonicalDept = resolveCanonicalDepartment({ ...s, roles });
          return {
            ...s,
            fullName: s.fullName || s.name || s.username,
            name: s.name || s.fullName || s.username,
            department: canonicalDept,
            roles
          };
        });
        setStaffList(normalizedStaff);
      } else {
        console.error('Failed to load staff list:', staffRes.reason);
        setError(staffRes.reason?.message || 'Failed to load staff members.');
      }

      if (rolesRes.status === 'fulfilled') {
        const rolesData = rolesRes.value;
        const rawRoles = Array.isArray(rolesData) ? rolesData : (rolesData?.content || rolesData?.data || []);
        const normalizedRoles = rawRoles.length > 0 ? rawRoles.map((r) => {
          const roleKey = r.roleName || r.name;
          const canonicalDept = resolveCanonicalDepartment({ roleName: roleKey, department: r.department });
          return {
            id: r.id || roleKey,
            roleName: roleKey,
            name: r.name || roleKey,
            department: canonicalDept,
            description: r.description || roleKey,
            permissions: r.permissions || []
          };
        }) : DEFAULT_OPERATIONAL_ROLES;
        setAvailableRoles(normalizedRoles);
      } else {
        setAvailableRoles(DEFAULT_OPERATIONAL_ROLES);
      }

      if (deptRes.status === 'fulfilled') {
        const deptData = deptRes.value;
        const rawDepts = Array.isArray(deptData) ? deptData : (deptData?.data || []);
        const deptMap = new Map();
        DEFAULT_OPERATIONAL_DEPARTMENTS.forEach((d) => deptMap.set(d.name, { ...d }));
        if (Array.isArray(rawDepts)) {
          rawDepts.forEach((d) => {
            if (d && d.name) {
              const existing = deptMap.get(d.name);
              if (existing) {
                deptMap.set(d.name, {
                  ...existing,
                  ...d,
                  allowedRoles: Array.from(new Set([...(existing.allowedRoles || []), ...(d.allowedRoles || [])]))
                });
              } else {
                deptMap.set(d.name, d);
              }
            }
          });
        }
        setDepartments(Array.from(deptMap.values()));
      } else {
        setDepartments(DEFAULT_OPERATIONAL_DEPARTMENTS);
      }
    } catch (err) {
      console.error('Failed to load staff directory data:', err);
      setError(err.message || 'Failed to load staff directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered staff list
  const filteredStaffList = useMemo(() => {
    return staffList.filter((s) => {
      if (departmentFilter !== 'ALL' && s.department !== departmentFilter) {
        return false;
      }
      if (roleFilter !== 'ALL') {
        const matchesRole = (s.roles && s.roles.includes(roleFilter)) || s.roleName === roleFilter;
        if (!matchesRole) return false;
      }
      if (statusFilter !== 'ALL' && s.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [staffList, departmentFilter, roleFilter, statusFilter]);

  // Department coverage breakdown
  const departmentCoverage = useMemo(() => {
    const coverage = {};
    departments.forEach((d) => {
      coverage[d.name] = { count: 0, activeCount: 0 };
    });
    staffList.forEach((s) => {
      const deptName = s.department || 'General Operations';
      if (!coverage[deptName]) {
        coverage[deptName] = { count: 0, activeCount: 0 };
      }
      coverage[deptName].count += 1;
      if (s.status === 'ACTIVE') {
        coverage[deptName].activeCount += 1;
      }
    });
    return coverage;
  }, [departments, staffList]);

  // Roles available for selected department in Create Form
  const rolesForSelectedCreateDepartment = useMemo(() => {
    const dept = departments.find((d) => d.name === newStaff.department);
    if (dept && Array.isArray(dept.allowedRoles) && dept.allowedRoles.length > 0) {
      const filtered = availableRoles.filter((r) => dept.allowedRoles.includes(r.roleName || r.name));
      if (filtered.length > 0) return filtered;
    }
    return availableRoles.filter((r) => (r.roleName || r.name) !== 'ROLE_SUPER_ADMIN');
  }, [departments, availableRoles, newStaff.department]);

  // Handle department change in Create Form
  const handleCreateDepartmentChange = (deptName) => {
    const dept = departments.find((d) => d.name === deptName);
    const matchingRoles = availableRoles.filter((r) => dept?.allowedRoles?.includes(r.roleName || r.name));
    const defaultRole = matchingRoles[0]?.roleName || dept?.defaultRole || dept?.allowedRoles?.[0] || 'ROLE_ADMIN';
    setNewStaff((prev) => ({
      ...prev,
      department: deptName,
      roleName: defaultRole
    }));
  };

  // Create Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validations
    if (!newStaff.fullName.trim() || !newStaff.username.trim() || !newStaff.email.trim() || !newStaff.password) {
      setError('All fields are required.');
      return;
    }
    if (newStaff.password.length < 8) {
      setError('Temporary password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        username: newStaff.username.trim(),
        name: newStaff.fullName.trim(),
        fullName: newStaff.fullName.trim(),
        email: newStaff.email.trim().toLowerCase(),
        password: newStaff.password,
        department: newStaff.department,
        roleName: newStaff.roleName,
        roles: [newStaff.roleName],
        status: newStaff.status
      };

      await staffApi.createStaff(payload);
      setSuccess(`Staff account '@${payload.username}' provisioned successfully in ${payload.department}!`);
      setShowCreateModal(false);
      setNewStaff({
        username: '',
        fullName: '',
        email: '',
        password: '',
        department: 'Administration',
        roleName: 'ROLE_ADMIN',
        status: 'ACTIVE'
      });
      await loadData();
    } catch (err) {
      console.error('Failed to create staff member:', err);
      setError(err.message || 'Failed to provision staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (staffMember) => {
    setSelectedStaff(staffMember);
    const currentRole = (staffMember.roles && staffMember.roles[0]) || staffMember.roleName || 'ROLE_ADMIN';
    setEditStaff({
      fullName: staffMember.fullName || staffMember.name || staffMember.username,
      email: staffMember.email,
      department: staffMember.department || 'Administration',
      roleName: currentRole,
      status: staffMember.status || 'ACTIVE'
    });
    setShowEditModal(true);
  };

  // Submit Edit Staff
  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await staffApi.updateStaff(selectedStaff.id, {
        name: editStaff.fullName.trim(),
        fullName: editStaff.fullName.trim(),
        email: editStaff.email.trim().toLowerCase(),
        department: editStaff.department,
        roleName: editStaff.roleName,
        roles: [editStaff.roleName],
        status: editStaff.status
      });

      setSuccess(`Updated profile and department assignment for '@${selectedStaff.username}'`);
      setShowEditModal(false);
      await loadData();
    } catch (err) {
      console.error('Failed to update staff member:', err);
      setError(err.message || 'Failed to update staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedStaff || !newPassword) return;
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await staffApi.resetPassword(selectedStaff.id, newPassword);
      setSuccess(`Password updated successfully for '@${selectedStaff.username}'`);
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err) {
      console.error('Failed to reset password:', err);
      setError(err.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  // Prompt Confirmation for Destructive Action
  const promptToggleStatus = (staffMember) => {
    const isSuspending = staffMember.status === 'ACTIVE';
    const actionText = isSuspending ? 'suspend' : 'activate';

    setConfirmAction({
      title: `${isSuspending ? 'Suspend' : 'Activate'} Staff Account`,
      message: `Are you sure you want to ${actionText} the account '@${staffMember.username}'? ${
        isSuspending
          ? 'Their access to administrative tools and operational dashboards will be revoked immediately.'
          : 'They will regain operational dashboard access immediately.'
      }`,
      onConfirm: async () => {
        try {
          const nextStatus = isSuspending ? 'SUSPENDED' : 'ACTIVE';
          await staffApi.updateStaffStatus(staffMember.id, nextStatus);
          setSuccess(`Account '@${staffMember.username}' is now ${nextStatus}.`);
          setShowConfirmModal(false);
          await loadData();
        } catch (err) {
          setError(err.message || `Failed to ${actionText} account.`);
          setShowConfirmModal(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Table Columns
  const columns = [
    {
      header: 'Staff Member',
      key: 'fullName',
      render: (row) => {
        const isSuper = row.isSuperAdmin || row.roleName === 'ROLE_SUPER_ADMIN' || row.username === 'Jinkalker_Shiva';
        return (
          <div>
            <div className="font-semibold text-sm flex items-center gap-1.5">
              <span>{row.fullName || row.name || row.username}</span>
              {isSuper && (
                <span className="badge badge-warning badge-xs font-bold flex items-center gap-1 text-[10px] py-0 px-1.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <Crown size={10} className="fill-amber-500 text-amber-500" />
                  <span>Platform Owner</span>
                </span>
              )}
            </div>
            <div className="mono-text text-muted text-xs">@{row.username}</div>
          </div>
        );
      }
    },
    {
      header: 'Corporate Email',
      key: 'email',
      render: (row) => <span className="text-sm font-mono text-[13px]">{row.email}</span>
    },
    {
      header: 'Department',
      key: 'department',
      render: (row) => <DepartmentBadge department={row.department} />
    },
    {
      header: 'Role Assignment',
      key: 'roles',
      render: (row) => {
        const roles = (row.roles && row.roles.length > 0) ? row.roles : (row.roleName ? [row.roleName] : ['ROLE_ADMIN']);
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
      render: (row) => {
        const isSuper = row.isSuperAdmin || row.roleName === 'ROLE_SUPER_ADMIN' || row.username === 'Jinkalker_Shiva';
        const primaryRole = (row.roles && row.roles[0]) || row.roleName || 'ROLE_ADMIN';
        const canEditThisStaff = isSuperAdmin() || !isSuper;

        return (
          <div className="action-buttons-group flex items-center gap-1">
            {/* 1. Preview Dashboard Button */}
            <button
              className="btn btn-secondary btn-xs flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500"
              title={`Preview ${primaryRole.replace('ROLE_', '')} operational dashboard`}
              onClick={() => {
                setPreviewRole(primaryRole);
                navigate('/dashboard');
              }}
            >
              <Eye size={11} />
              <span>Preview</span>
            </button>

            {/* 2. Details Modal Button */}
            <button
              className="btn btn-secondary btn-xs flex items-center gap-1"
              title="View staff details & permissions"
              onClick={() => {
                setSelectedStaff(row);
                setShowDetailsModal(true);
              }}
            >
              <Info size={11} />
              <span>Details</span>
            </button>

            {/* 3. Edit Assignment Button */}
            <button
              className="btn btn-secondary btn-xs flex items-center gap-1"
              onClick={() => handleOpenEdit(row)}
              disabled={!canEditThisStaff}
              title={!canEditThisStaff ? 'Only the Super Admin can edit the Platform Owner account' : 'Edit staff profile & role assignment'}
            >
              <Edit2 size={11} />
              <span>Edit</span>
            </button>

            {/* 4. Password Reset Button */}
            <button
              className="btn btn-secondary btn-xs flex items-center gap-1"
              onClick={() => {
                setSelectedStaff(row);
                setShowPasswordModal(true);
              }}
              disabled={!canEditThisStaff}
              title={!canEditThisStaff ? 'Only the Super Admin can reset the Platform Owner password' : 'Reset staff password'}
            >
              <KeyRound size={11} />
              <span>Pwd</span>
            </button>

            {/* 5. Suspend / Activate Button */}
            <button
              className={`btn ${row.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'} btn-xs`}
              onClick={() => promptToggleStatus(row)}
              disabled={row.username === 'admin' || isSuper}
              title={
                isSuper
                  ? 'The Super Admin account cannot be deactivated'
                  : row.username === 'admin'
                  ? 'Root admin account cannot be suspended'
                  : (row.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account')
              }
            >
              {row.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="staff-management-page space-y-4">
      {/* Alert Banners */}
      {error && (
        <div className="alert alert-danger flex items-center justify-between">
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
        <div className="alert alert-success flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
          <button className="btn-close" onClick={() => setSuccess('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header-flex flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="page-title flex items-center gap-2 text-xl font-bold">
            <Users size={24} className="text-primary" />
            <span>Staff Administration & Operations Directory</span>
          </h2>
          <p className="page-subtitle text-xs text-muted">
            Provision staff operators, manage department assignments, review fine-grained role permissions, and access role-specific dashboards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
            onClick={() => setShowCreateModal(true)}
          >
            <UserPlus size={15} />
            <span>Provision Staff Account</span>
          </button>
        </div>
      </div>

      {/* Operational Department Coverage Overview */}
      <div className="card p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
            <Building size={14} className="text-primary" />
            <span>Department Staff Coverage (Active Staff per Department)</span>
          </span>
          <span className="text-[11px] text-muted">
            Total Staff: <strong>{staffList.length}</strong> • Active: <strong>{staffList.filter(s => s.status === 'ACTIVE').length}</strong>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {departments.filter(d => d.name !== 'Platform Governance').map((dept) => {
            const data = departmentCoverage[dept.name] || { count: 0, activeCount: 0 };
            const isCovered = data.activeCount > 0;
            return (
              <div
                key={dept.id || dept.name}
                onClick={() => setDepartmentFilter(departmentFilter === dept.name ? 'ALL' : dept.name)}
                className={`cursor-pointer px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                  departmentFilter === dept.name
                    ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                    : isCovered
                    ? 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-primary/50'
                    : 'border-red-500/30 bg-red-500/10 text-red-500'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isCovered ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
                  <span>{dept.name}</span>
                </div>
                <span className={`badge badge-xs ${isCovered ? 'badge-neutral' : 'badge-danger font-bold'}`}>
                  {data.activeCount} active
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="card p-3 border border-[var(--border-subtle)] rounded-xl bg-[var(--surface)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Filter size={14} />
            <span>Filter By:</span>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted">Department:</label>
            <select
              className="input input-sm py-1 px-2 text-xs rounded-md"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted">Role:</label>
            <select
              className="input input-sm py-1 px-2 text-xs rounded-md"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All Roles</option>
              {availableRoles.map((r) => {
                const rKey = r.roleName || r.name;
                return (
                  <option key={rKey} value={rKey}>
                    {rKey.replace('ROLE_', '')}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted">Status:</label>
            <select
              className="input input-sm py-1 px-2 text-xs rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>

          {(departmentFilter !== 'ALL' || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              className="btn btn-secondary btn-xs text-xs flex items-center gap-1"
              onClick={() => {
                setDepartmentFilter('ALL');
                setRoleFilter('ALL');
                setStatusFilter('ALL');
              }}
            >
              <X size={12} />
              <span>Reset Filters</span>
            </button>
          )}

          <div className="ml-auto text-xs text-muted">
            Showing <strong>{filteredStaffList.length}</strong> of <strong>{staffList.length}</strong> staff accounts
          </div>
        </div>
      </div>

      {/* Main Staff Directory Table */}
      <div className="card shadow-xs">
        <DataTable
          columns={columns}
          data={filteredStaffList}
          loading={loading}
          searchPlaceholder="Search staff by name, username, email, department..."
          emptyMessage={
            departmentFilter !== 'ALL' || roleFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No staff members match the selected filter criteria.'
              : 'No staff members found in the directory.'
          }
        />
      </div>

      {/* 1. PROVISION STAFF ACCOUNT MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Provision New Staff Account"
      >
        <form onSubmit={handleCreateStaff} className="space-y-3">
          <p className="text-xs text-muted mb-2">
            Securely create an authorized corporate staff account and assign an operational department and role.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Full Name *</label>
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
              <label className="form-label text-xs font-semibold">Username *</label>
              <input
                type="text"
                className="input"
                required
                value={newStaff.username}
                onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                placeholder="e.g. priyesh_ops"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Corporate Email *</label>
            <input
              type="email"
              className="input"
              required
              value={newStaff.email}
              onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
              placeholder="e.g. priyesh@econext.org"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Department *</label>
              <select
                className="input"
                required
                value={newStaff.department}
                onChange={(e) => handleCreateDepartmentChange(e.target.value)}
              >
                {departments
                  .filter((d) => d.name !== 'Platform Governance')
                  .map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Operational Role *</label>
              <select
                className="input"
                required
                value={newStaff.roleName}
                onChange={(e) => setNewStaff({ ...newStaff, roleName: e.target.value })}
              >
                {rolesForSelectedCreateDepartment.map((r) => {
                  const roleKey = r.roleName || r.name;
                  return (
                    <option key={roleKey} value={roleKey}>
                      {roleKey.replace('ROLE_', '')} — {r.description || roleKey}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Account Status</label>
              <select
                className="input"
                value={newStaff.status}
                onChange={(e) => setNewStaff({ ...newStaff, status: e.target.value })}
              >
                <option value="ACTIVE">ACTIVE (Immediate Access)</option>
                <option value="SUSPENDED">SUSPENDED (Pending Activation)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Temporary Password *</label>
              <div className="relative flex items-center">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  className="input pr-10"
                  required
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  placeholder="Min 8 characters"
                />
                <button
                  type="button"
                  className="absolute right-2 text-muted hover:text-foreground"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                >
                  {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="modal-actions-right mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowCreateModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm flex items-center gap-1.5" disabled={submitting}>
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
              <span>{submitting ? 'Provisioning...' : 'Provision Account'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. EDIT ASSIGNMENT MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Staff Assignment: @${selectedStaff?.username}`}
      >
        <form onSubmit={handleUpdateStaff} className="space-y-3">
          <div className="form-group">
            <label className="form-label text-xs font-semibold">Full Name *</label>
            <input
              type="text"
              className="input"
              required
              value={editStaff.fullName}
              onChange={(e) => setEditStaff({ ...editStaff, fullName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Corporate Email *</label>
            <input
              type="email"
              className="input"
              required
              value={editStaff.email}
              onChange={(e) => setEditStaff({ ...editStaff, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Department *</label>
              <select
                className="input"
                required
                value={editStaff.department}
                onChange={(e) => {
                  const newDept = e.target.value;
                  const deptObj = departments.find((d) => d.name === newDept);
                  const matchingRoles = availableRoles.filter((r) => deptObj?.allowedRoles?.includes(r.roleName || r.name));
                  const isCurrentRoleValid = matchingRoles.some((r) => (r.roleName || r.name) === editStaff.roleName);
                  setEditStaff({
                    ...editStaff,
                    department: newDept,
                    roleName: isCurrentRoleValid ? editStaff.roleName : (matchingRoles[0]?.roleName || editStaff.roleName)
                  });
                }}
              >
                {departments
                  .filter((d) => isSuperAdmin() || d.name !== 'Platform Governance')
                  .map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold">Primary Role *</label>
              <select
                className="input"
                required
                value={editStaff.roleName}
                onChange={(e) => setEditStaff({ ...editStaff, roleName: e.target.value })}
              >
                {availableRoles
                  .filter((r) => {
                    if (!isSuperAdmin() && (r.roleName || r.name) === 'ROLE_SUPER_ADMIN') return false;
                    const deptObj = departments.find((d) => d.name === editStaff.department);
                    if (deptObj && deptObj.allowedRoles && deptObj.allowedRoles.length > 0) {
                      return deptObj.allowedRoles.includes(r.roleName || r.name);
                    }
                    return true;
                  })
                  .map((r) => {
                    const roleKey = r.roleName || r.name;
                    return (
                      <option key={roleKey} value={roleKey}>
                        {roleKey.replace('ROLE_', '')}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">Account Status</label>
            <select
              className="input"
              value={editStaff.status}
              onChange={(e) => setEditStaff({ ...editStaff, status: e.target.value })}
              disabled={selectedStaff?.isSuperAdmin || selectedStaff?.username === 'admin'}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>

          <div className="modal-actions-right mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowEditModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm flex items-center gap-1.5" disabled={submitting}>
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. VIEW DETAILS MODAL */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Staff Details: @${selectedStaff?.username}`}
      >
        {selectedStaff && (
          <div className="space-y-4">
            <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-1.5">
                  <span>{selectedStaff.fullName || selectedStaff.username}</span>
                  {selectedStaff.isSuperAdmin && (
                    <span className="badge badge-warning badge-xs">Platform Owner</span>
                  )}
                </h3>
                <p className="text-xs text-muted">@{selectedStaff.username} • {selectedStaff.email}</p>
              </div>
              <StatusBadge status={selectedStaff.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)]">
                <span className="text-muted block mb-1">Department:</span>
                <DepartmentBadge department={selectedStaff.department} />
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)]">
                <span className="text-muted block mb-1">Assigned Role:</span>
                <RoleBadge roleName={selectedStaff.roleName || selectedStaff.roles?.[0]} />
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)]">
                <span className="text-muted block mb-1">Account Created:</span>
                <span>{selectedStaff.createdAt ? new Date(selectedStaff.createdAt).toLocaleDateString() : 'Initial Setup'}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)]">
                <span className="text-muted block mb-1">Last Active:</span>
                <span>{selectedStaff.lastLoginAt ? new Date(selectedStaff.lastLoginAt).toLocaleString() : 'Never'}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-muted block mb-2">Effective Operational Permissions:</span>
              <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
                {selectedStaff.effectivePermissions && selectedStaff.effectivePermissions.length > 0 ? (
                  selectedStaff.effectivePermissions.map((perm) => (
                    <span key={perm} className="badge badge-neutral text-[10px] font-mono py-0.5 px-1.5">
                      {perm}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted">Standard operational read permissions.</span>
                )}
              </div>
            </div>

            <div className="modal-actions-right pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 4. RESET PASSWORD MODAL */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={`Reset Password for @${selectedStaff?.username}`}
      >
        <form onSubmit={handleResetPassword} className="space-y-3">
          <p className="text-xs text-muted">
            Set a new secure replacement password for <strong>{selectedStaff?.fullName}</strong>.
          </p>

          <div className="form-group">
            <label className="form-label text-xs font-semibold">New Password *</label>
            <div className="relative flex items-center">
              <input
                type={showResetPasswordText ? 'text' : 'password'}
                className="input pr-10"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                className="absolute right-2 text-muted hover:text-foreground"
                onClick={() => setShowResetPasswordText(!showResetPasswordText)}
              >
                {showResetPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="modal-actions-right mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowPasswordModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm flex items-center gap-1.5"
              disabled={!newPassword || submitting}
            >
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
              <span>{submitting ? 'Updating...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. CONFIRMATION MODAL FOR DESTRUCTIVE ACTIONS */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={confirmAction.title}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{confirmAction.message}</p>
          </div>

          <div className="modal-actions-right pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={confirmAction.onConfirm}
            >
              Confirm Action
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffManagementPage;
