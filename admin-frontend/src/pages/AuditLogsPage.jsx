import React, { useState, useEffect } from 'react';
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
        <span className="mono-text text-xs">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Staff Actor',
      key: 'staffUsername',
      render: (row) => (
        <div>
          <span className="font-semibold">{row.staffUsername || 'SYSTEM'}</span>
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
        <span>
          <strong>{row.entityType}</strong> {row.entityId ? `#${row.entityId}` : ''}
        </span>
      )
    },
    {
      header: 'Audit Description',
      key: 'actionDetails',
      render: (row) => (
        <div className="text-truncate max-w-xs" title={row.actionDetails}>
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
        <button className="btn btn-secondary btn-xs" onClick={() => openLogDetail(row)}>
          Inspect
        </button>
      )
    }
  ];

  return (
    <div className="audit-logs-page">
      {error && (
        <div className="alert alert-danger mb-4">
          <span>⚠️ {error}</span>
          <button className="btn-close" onClick={() => setError('')}>✕</button>
        </div>
      )}

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
          <div className="audit-detail-content">
            <div className="grid-2col mb-3">
              <div>
                <label className="text-muted text-xs uppercase font-bold">Audit Entry ID</label>
                <div className="mono-text font-semibold">#{selectedLog.id}</div>
              </div>
              <div>
                <label className="text-muted text-xs uppercase font-bold">Recorded At</label>
                <div className="mono-text font-semibold">{new Date(selectedLog.createdAt).toUTCString()}</div>
              </div>
            </div>

            <div className="grid-2col mb-3">
              <div>
                <label className="text-muted text-xs uppercase font-bold">Staff Actor</label>
                <div>{selectedLog.staffUsername} (Staff ID: {selectedLog.staffId})</div>
              </div>
              <div>
                <label className="text-muted text-xs uppercase font-bold">Action Type</label>
                <div><span className="badge badge-info">{selectedLog.actionType}</span></div>
              </div>
            </div>

            <div className="grid-2col mb-3">
              <div>
                <label className="text-muted text-xs uppercase font-bold">Target Entity</label>
                <div>{selectedLog.entityType} (ID: {selectedLog.entityId || 'N/A'})</div>
              </div>
              <div>
                <label className="text-muted text-xs uppercase font-bold">Origin IP Address</label>
                <div className="mono-text">{selectedLog.ipAddress || '127.0.0.1'}</div>
              </div>
            </div>

            <div className="mb-3">
              <label className="text-muted text-xs uppercase font-bold">Operational Note</label>
              <div className="p-3 bg-secondary rounded text-sm mt-1">{selectedLog.actionDetails}</div>
            </div>

            {selectedLog.previousStateJson && (
              <div className="mb-3">
                <label className="text-muted text-xs uppercase font-bold">Previous State Payload</label>
                <pre className="code-block mt-1">{selectedLog.previousStateJson}</pre>
              </div>
            )}

            {selectedLog.newStateJson && (
              <div className="mb-3">
                <label className="text-muted text-xs uppercase font-bold">New State Payload</label>
                <pre className="code-block mt-1">{selectedLog.newStateJson}</pre>
              </div>
            )}

            <div className="modal-actions-right mt-4">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
