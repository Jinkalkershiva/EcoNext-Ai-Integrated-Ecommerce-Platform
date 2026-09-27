import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  IndianRupee,
  ShoppingBag,
  Eye,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  UserCheck,
  Building
} from 'lucide-react';
import { customerOpsApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge, RoleBadge } from '../components/Badge';

export const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await customerOpsApi.getCustomers({
        search: searchQuery || undefined,
        page: 0,
        size: 100
      });
      const list = data.content || (Array.isArray(data) ? data : []);
      setCustomers(list);
    } catch (err) {
      setError(err.message || 'Failed to load customer directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadCustomers();
  };

  const openCustomerModal = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const columns = [
    {
      header: 'Customer Details',
      key: 'username',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
            {(row.first_name?.[0] || row.username?.[0] || 'U')}
          </div>
          <div>
            <div className="font-semibold text-sm">
              {row.first_name || row.last_name ? `${row.first_name} ${row.last_name}`.trim() : row.username}
            </div>
            <div className="text-xs text-muted flex items-center gap-1">
              <Mail size={11} />
              <span>{row.email || 'No email provided'}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Account Role',
      key: 'role',
      render: (row) => <RoleBadge roleName={row.role || (row.is_staff ? 'STAFF' : 'CUSTOMER')} />
    },
    {
      header: 'Total Orders',
      key: 'orders_count',
      render: (row) => (
        <div className="flex items-center gap-1 text-sm font-medium">
          <ShoppingBag size={13} className="text-muted" />
          <span>{row.orders_count ?? row.totalOrders ?? 0}</span>
        </div>
      )
    },
    {
      header: 'Total Spend',
      key: 'total_spent',
      render: (row) => (
        <span className="font-semibold text-success">
          ₹{Number(row.total_spent ?? row.totalSpent ?? 0).toFixed(2)}
        </span>
      )
    },
    {
      header: 'Registration Date',
      key: 'date_joined',
      render: (row) => {
        const d = row.date_joined || row.createdAt;
        return (
          <div className="text-xs text-muted flex items-center gap-1">
            <Calendar size={12} />
            <span>{d ? new Date(d).toLocaleDateString() : 'N/A'}</span>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <button
          className="btn btn-secondary btn-xs flex items-center gap-1"
          onClick={() => openCustomerModal(row)}
        >
          <Eye size={12} />
          <span>View Profile</span>
        </button>
      )
    }
  ];

  return (
    <div className="customers-page">
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

      {/* Header */}
      <div className="page-header-flex mb-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <Users size={24} className="text-primary" />
            <span>Customer Accounts & Directory</span>
          </h2>
          <p className="page-subtitle">
            View registered user profiles, lifetime customer spending, order histories, and contact records.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm flex items-center gap-1.5" onClick={loadCustomers} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card p-3 mb-4">
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="search-input-wrapper relative flex-1 max-w-md">
            <input
              type="text"
              className="input input-sm pl-8 w-full"
              placeholder="Search by customer name, email, or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={14} className="text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setTimeout(loadCustomers, 50);
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable
          columns={columns}
          data={customers}
          loading={loading}
          searchPlaceholder="Filter customers..."
        />
      </div>

      {/* Customer Profile Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Customer Profile: ${selectedCustomer?.username || ''}`}
        maxWidth="600px"
      >
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold uppercase">
                {(selectedCustomer.first_name?.[0] || selectedCustomer.username?.[0] || 'U')}
              </div>
              <div>
                <h4 className="font-bold text-base">
                  {selectedCustomer.first_name || selectedCustomer.last_name
                    ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`.trim()
                    : selectedCustomer.username}
                </h4>
                <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                  <Mail size={12} />
                  <span>{selectedCustomer.email || 'No email specified'}</span>
                </div>
                <div className="mt-1.5">
                  <RoleBadge roleName={selectedCustomer.role || (selectedCustomer.is_staff ? 'STAFF' : 'CUSTOMER')} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-center">
                <div className="text-xs text-muted">Total Lifetime Orders</div>
                <div className="text-lg font-bold text-primary mt-1">
                  {selectedCustomer.orders_count ?? selectedCustomer.totalOrders ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-center">
                <div className="text-xs text-muted">Total Gross Spend</div>
                <div className="text-lg font-bold text-success mt-1">
                  ₹{Number(selectedCustomer.total_spent ?? selectedCustomer.totalSpent ?? 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-muted">User ID:</span>
                <span className="font-mono font-medium">#{selectedCustomer.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-muted">Active Account Status:</span>
                <span className="badge badge-success badge-xs">ACTIVE</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-muted">Member Since:</span>
                <span>{selectedCustomer.date_joined ? new Date(selectedCustomer.date_joined).toLocaleString() : 'N/A'}</span>
              </div>
            </div>

            <div className="modal-actions-right pt-2">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
