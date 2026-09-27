import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  IndianRupee,
  ShieldCheck,
  FileText,
  Calendar,
  User,
  Package,
  X,
  Check
} from 'lucide-react';
import { paymentOpsApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';

export const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await paymentOpsApi.getPayments({
        search: searchQuery || undefined,
        page: 0,
        size: 100
      });
      const list = data.content || (Array.isArray(data) ? data : []);
      setPayments(list);
    } catch (err) {
      setError(err.message || 'Failed to load payment transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadPayments();
  };

  const openPaymentModal = (pay) => {
    setSelectedPayment(pay);
    setShowModal(true);
  };

  const columns = [
    {
      header: 'Order Reference',
      key: 'order_reference_number',
      render: (row) => (
        <div>
          <div className="font-bold mono-text text-primary flex items-center gap-1">
            <Package size={13} className="text-muted" />
            <span>#{row.order_reference_number || `ORD-${String(row.order_id || row.id).padStart(5, '0')}`}</span>
          </div>
          <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
            <Calendar size={11} />
            <span>{row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Recent'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Customer',
      key: 'customer_name',
      render: (row) => (
        <div>
          <div className="font-medium">{row.customer_name || 'Customer'}</div>
          <div className="text-xs text-muted">{row.customer_email || 'N/A'}</div>
        </div>
      )
    },
    {
      header: 'Method',
      key: 'payment_method',
      render: (row) => (
        <span className="badge badge-neutral badge-xs uppercase font-mono">
          {row.payment_method || 'Razorpay / UPI'}
        </span>
      )
    },
    {
      header: 'Amount',
      key: 'amount',
      render: (row) => (
        <span className="font-bold text-success">
          ₹{Number(row.amount || row.total_amount || 0).toFixed(2)}
        </span>
      )
    },
    {
      header: 'Payment Gateway Ref',
      key: 'razorpay_payment_id',
      render: (row) => (
        <span className="mono-text text-xs text-muted">
          {row.razorpay_payment_id || row.razorpay_order_id || 'Direct Verified'}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'payment_status',
      render: (row) => {
        const ps = (row.payment_status || 'PAID').toUpperCase();
        const isPaid = ps === 'PAID' || ps === 'COMPLETED' || ps === 'SUCCESS';
        return (
          <span className={`badge ${isPaid ? 'badge-success' : 'badge-warning'} badge-xs`}>
            {isPaid ? <Check size={11} className="inline mr-1" /> : <Clock size={11} className="inline mr-1" />}
            {ps}
          </span>
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
          onClick={() => openPaymentModal(row)}
        >
          <Eye size={12} />
          <span>Receipt</span>
        </button>
      )
    }
  ];

  return (
    <div className="payments-page">
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
            <CreditCard size={24} className="text-primary" />
            <span>Payments & Gateway Transactions</span>
          </h2>
          <p className="page-subtitle">
            Audit live payment ledger entries, Razorpay checkout captures, and settlement logs.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm flex items-center gap-1.5" onClick={loadPayments} disabled={loading}>
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
              placeholder="Search by Razorpay ID, Order Ref, Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={14} className="text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable
          columns={columns}
          data={payments}
          loading={loading}
          searchPlaceholder="Filter transactions..."
        />
      </div>

      {/* Payment Receipt Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Payment Transaction Receipt"
        maxWidth="550px"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-center">
              <div className="text-xs text-muted uppercase tracking-wider">Amount Captured</div>
              <div className="text-2xl font-bold text-success mt-1">
                ₹{Number(selectedPayment.amount || selectedPayment.total_amount || 0).toFixed(2)}
              </div>
              <div className="mt-2">
                <span className="badge badge-success badge-xs">
                  <Check size={11} className="inline mr-1" />
                  {selectedPayment.payment_status || 'PAID'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-muted">Order Reference:</span>
                <span className="font-mono font-bold text-primary">
                  #{selectedPayment.order_reference_number || `ORD-${String(selectedPayment.order_id || selectedPayment.id).padStart(5, '0')}`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-muted">Customer Name:</span>
                <span className="font-medium">{selectedPayment.customer_name || 'Customer'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-muted">Customer Email:</span>
                <span>{selectedPayment.customer_email || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-muted">Payment Channel:</span>
                <span className="font-mono uppercase">{selectedPayment.payment_method || 'Razorpay / UPI'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-muted">Razorpay Payment ID:</span>
                <span className="font-mono">{selectedPayment.razorpay_payment_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-muted">Razorpay Order ID:</span>
                <span className="font-mono">{selectedPayment.razorpay_order_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Transaction Timestamp:</span>
                <span>{selectedPayment.created_at ? new Date(selectedPayment.created_at).toLocaleString() : 'N/A'}</span>
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
