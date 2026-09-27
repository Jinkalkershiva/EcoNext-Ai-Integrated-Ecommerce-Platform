import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  Calendar,
  Send,
  User,
  X,
  Check
} from 'lucide-react';
import { notificationOpsApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await notificationOpsApi.getNotifications({
        channel: selectedChannel || undefined,
        search: searchQuery || undefined,
        page: 0,
        size: 100
      });
      const list = data.content || (Array.isArray(data) ? data : []);
      setNotifications(list);
    } catch (err) {
      setError(err.message || 'Failed to load customer notification logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [selectedChannel]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadNotifications();
  };

  const openModal = (notif) => {
    setSelectedNotification(notif);
    setShowModal(true);
  };

  const columns = [
    {
      header: 'Recipient',
      key: 'recipient',
      render: (row) => (
        <div>
          <div className="font-semibold text-sm">{row.recipient}</div>
          <div className="text-xs text-muted">Order #{row.order_id || 'N/A'}</div>
        </div>
      )
    },
    {
      header: 'Channel',
      key: 'channel',
      render: (row) => {
        const isEmail = (row.channel || '').toUpperCase() === 'EMAIL';
        return (
          <span className={`badge ${isEmail ? 'badge-primary' : 'badge-neutral'} badge-xs flex items-center gap-1 w-fit`}>
            {isEmail ? <Mail size={11} /> : <MessageSquare size={11} />}
            <span>{(row.channel || 'EMAIL').toUpperCase()}</span>
          </span>
        );
      }
    },
    {
      header: 'Trigger Event',
      key: 'event_type',
      render: (row) => (
        <span className="badge badge-neutral badge-xs font-mono">
          {row.event_type || 'STATUS_UPDATE'}
        </span>
      )
    },
    {
      header: 'Subject / Message Snippet',
      key: 'subject',
      render: (row) => (
        <div className="max-w-xs truncate">
          <div className="font-medium text-xs truncate">{row.subject || 'Notification'}</div>
          <div className="text-xs text-muted truncate">{row.message || ''}</div>
        </div>
      )
    },
    {
      header: 'Sent At',
      key: 'sent_at',
      render: (row) => (
        <div className="text-xs text-muted flex items-center gap-1">
          <Calendar size={11} />
          <span>{row.sent_at ? new Date(row.sent_at).toLocaleString() : 'Recent'}</span>
        </div>
      )
    },
    {
      header: 'Delivery Status',
      key: 'status',
      render: (row) => {
        const isSuccess = (row.status || 'SENT').toUpperCase() === 'SENT' || (row.status || '').toUpperCase() === 'DELIVERED';
        return (
          <span className={`badge ${isSuccess ? 'badge-success' : 'badge-warning'} badge-xs`}>
            {isSuccess ? <Check size={11} className="inline mr-1" /> : <Clock size={11} className="inline mr-1" />}
            {row.status || 'SENT'}
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
          onClick={() => openModal(row)}
        >
          <Eye size={12} />
          <span>View Payload</span>
        </button>
      )
    }
  ];

  return (
    <div className="notifications-page">
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
            <Bell size={24} className="text-primary" />
            <span>Customer Notifications Dispatch Center</span>
          </h2>
          <p className="page-subtitle">
            Forensic logs of all automated Email and SMS notifications dispatched to customers during order transitions.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm flex items-center gap-1.5" onClick={loadNotifications} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              className={`btn btn-xs ${selectedChannel === '' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedChannel('')}
            >
              All Channels
            </button>
            <button
              className={`btn btn-xs flex items-center gap-1 ${selectedChannel === 'EMAIL' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedChannel('EMAIL')}
            >
              <Mail size={12} />
              <span>Email Only</span>
            </button>
            <button
              className={`btn btn-xs flex items-center gap-1 ${selectedChannel === 'SMS' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedChannel('SMS')}
            >
              <MessageSquare size={12} />
              <span>SMS Only</span>
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2 min-w-[240px]">
            <div className="search-input-wrapper relative w-full">
              <input
                type="text"
                className="input input-sm pl-8 w-full"
                placeholder="Search recipient or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={14} className="text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable
          columns={columns}
          data={notifications}
          loading={loading}
          searchPlaceholder="Filter notification records..."
        />
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Dispatched Notification Payload"
        maxWidth="600px"
      >
        {selectedNotification && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-muted">Channel:</span>
                <span className="font-semibold uppercase">{selectedNotification.channel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-muted">Recipient:</span>
                <span className="font-semibold">{selectedNotification.recipient}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-muted">Trigger Event:</span>
                <span className="font-mono">{selectedNotification.event_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-muted">Sent Timestamp:</span>
                <span>{selectedNotification.sent_at ? new Date(selectedNotification.sent_at).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Delivery Status:</span>
                <span className="badge badge-success badge-xs">{selectedNotification.status || 'SENT'}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
                Subject
              </label>
              <div className="p-3 rounded bg-[var(--surface-elevated)] border border-[var(--border-subtle)] font-medium text-sm">
                {selectedNotification.subject}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
                Message Body Payload
              </label>
              <div className="p-3 rounded bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {selectedNotification.message}
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
