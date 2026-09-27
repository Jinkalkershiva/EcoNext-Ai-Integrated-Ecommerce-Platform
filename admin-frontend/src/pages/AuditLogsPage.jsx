import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Eye,
  AlertTriangle,
  X,
  RefreshCw,
  Clock,
  User,
  Globe
} from 'lucide-react';
import { auditApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await auditApi.getAuditLogs({ page: 0, size: 100 });
      setLogs(data.content || (Array.isArray(data) ? data : []));
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const openLogDetail = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const columns = [
    {
      header: 'Timestamp',
      key: 'createdAt',
      render: (row) => (
        <span className="mono-text text-xs text-muted">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Staff Actor',
      key: 'staffUsername',
      render: (row) => (
        <div>
          <span className="font-semibold text-sm">{row.staffUsername || 'SYSTEM'}</span>
          {row.staffId && <span className="text-muted text-xs block mono-text">ID: #{row.staffId}</span>}
        </div>
      )
    },
    {
      header: 'Action',
      key: 'actionType',
      render: (row) => <span className="badge badge-info badge-xs mono-text">{row.actionType}</span>
    },
    {
      header: 'Target Entity',
      key: 'entityType',
      render: (row) => (
        <span className="text-sm">
          <strong>{row.entityType}</strong> {row.entityId ? `#${row.entityId}` : ''}
        </span>
      )
    },
    {
      header: 'Audit Description',
      key: 'actionDetails',
      render: (row) => (
        <div className="text-truncate max-w-xs text-sm" title={row.actionDetails}>
          {row.actionDetails}
        </div>
      )
    },
    {
      header: 'IP Address',
      key: 'ipAddress',
      render: (row) => <span className="mono-text text-xs text-muted">{row.ipAddress || '127.0.0.1'}</span>
    },
    {
      header: 'Forensics',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <button className="btn btn-secondary btn-xs flex items-center gap-1" onClick={() => openLogDetail(row)}>
          <Eye size={12} />
          <span>Inspect</span>
        </button>
      )
    }
  ];

  return (
    <div className="audit-logs-page">
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
            <ShieldCheck size={24} className="text-primary" />
            <span>Forensic Audit Trail</span>
          </h2>
          <p className="page-subtitle">
            Immutable system and staff operational activity log for compliance and accountability.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm flex items-center gap-1.5" onClick={loadLogs} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          searchPlaceholder="Search audit trail by user, action, entity, or description..."
        />
      </div>

      {/* Forensic Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Forensic Audit Entry Details"
        maxWidth="650px"
      >
        {selectedLog && (
          <div className="audit-detail-content space-y-3">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs">
              <div>
                <label className="text-muted uppercase font-bold block mb-0.5">Audit Entry ID</label>
                <div className="mono-text font-semibold text-primary">#{selectedLog.id}</div>
              </div>
              <div>
                <label className="text-muted uppercase font-bold block mb-0.5">Recorded At</label>
                <div className="mono-text font-semibold">{new Date(selectedLog.createdAt).toUTCString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs">
              <div>
                <label className="text-muted uppercase font-bold block mb-0.5">Staff Actor</label>
                <div>{selectedLog.staffUsername} (Staff ID: {selectedLog.staffId})</div>
              </div>
              <div>
                <label className="text-muted uppercase font-bold block mb-0.5">Action Type</label>
                <div><span className="badge badge-info">{selectedLog.actionType}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs">
              <div>
                <label className="text-muted uppercase font-bold block mb-0.5">Target Entity</label>
                <div>{selectedLog.entityType} (ID: {selectedLog.entityId || 'N/A'})</div>
              </div>
              <div>
                <label className="text-muted uppercase font-bold block mb-0.5">Origin IP Address</label>
                <div className="mono-text">{selectedLog.ipAddress || '127.0.0.1'}</div>
              </div>
            </div>

            <div>
              <label className="text-muted text-xs uppercase font-bold block mb-1">Operational Note</label>
              <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-sm">{selectedLog.actionDetails}</div>
            </div>

            {selectedLog.previousStateJson && (
              <div>
                <label className="text-muted text-xs uppercase font-bold block mb-1">Previous State Payload</label>
                <pre className="p-3 rounded bg-[var(--surface)] text-xs font-mono overflow-x-auto">{selectedLog.previousStateJson}</pre>
              </div>
            )}

            {selectedLog.newStateJson && (
              <div>
                <label className="text-muted text-xs uppercase font-bold block mb-1">New State Payload</label>
                <pre className="p-3 rounded bg-[var(--surface)] text-xs font-mono overflow-x-auto">{selectedLog.newStateJson}</pre>
              </div>
            )}

            <div className="modal-actions-right mt-4">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
