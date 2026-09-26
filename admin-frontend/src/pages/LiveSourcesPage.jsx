import React, { useState, useEffect } from 'react';
import { liveSourcesApi } from '../api/operationsApis';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export default function LiveSourcesPage() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // New source modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    sourceName: '',
    sourceType: 'KAFKA_TOPIC',
    targetTopic: '',
    endpointUrl: '',
    hdfsSinkPath: '',
    description: ''
  });

  const loadSources = async () => {
    try {
      setLoading(true);
      const data = await liveSourcesApi.getSources();
      setSources(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load live data sources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
    const interval = setInterval(loadSources, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, []);

  const handleToggleStatus = async (id, name) => {
    try {
      setActionLoading(`toggle-${id}`);
      await liveSourcesApi.toggleStatus(id);
      setSuccessMessage(`Updated ingestion status for ${name}`);
      await loadSources();
    } catch (err) {
      setError(err.message || 'Failed to toggle status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatchTestEvent = async (id, name) => {
    try {
      setActionLoading(`test-${id}`);
      const res = await liveSourcesApi.dispatchTestEvent(id);
      setSuccessMessage(`Test event dispatched to ${res.topic || name}. Total events: ${res.totalEventsIngested}`);
      await loadSources();
    } catch (err) {
      setError(err.message || 'Failed to dispatch test event');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateSource = async (e) => {
    e.preventDefault();
    try {
      setActionLoading('create');
      await liveSourcesApi.createSource({
        ...formData,
        status: 'ACTIVE',
        ingestionRatePerSec: 5.0,
        hdfsSinkPath: formData.hdfsSinkPath || `/econext/raw/${formData.targetTopic || 'events'}/`
      });
      setIsModalOpen(false);
      setFormData({
        sourceName: '',
        sourceType: 'KAFKA_TOPIC',
        targetTopic: '',
        endpointUrl: '',
        hdfsSinkPath: '',
        description: ''
      });
      setSuccessMessage('New Live Data Source registered successfully');
      await loadSources();
    } catch (err) {
      setError(err.message || 'Failed to create data source');
    } finally {
      setActionLoading(null);
    }
  };

  const totalThroughput = sources
    .filter(s => s.status === 'ACTIVE')
    .reduce((acc, s) => acc + (s.ingestionRatePerSec || 0), 0);

  const totalEvents = sources.reduce((acc, s) => acc + (s.totalEventsIngested || 0), 0);
  const activeCount = sources.filter(s => s.status === 'ACTIVE').length;

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Live Ingestion Data Sources</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Manage Kafka topics, CDC streams, and REST event pipelines feeding into Apache Hadoop HDFS.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={loadSources}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🔄 Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ➕ Register Live Source
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {successMessage && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '16px' }}>
          ✅ {successMessage}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard
          title="Active Pipelines"
          value={`${activeCount} / ${sources.length}`}
          subtitle="Streaming live events"
          icon="⚡"
          trend={activeCount === sources.length ? 'up' : 'neutral'}
        />
        <StatCard
          title="Live Ingestion Rate"
          value={`${totalThroughput.toFixed(1)} ev/s`}
          subtitle="Real-time throughput"
          icon="📈"
          trend="up"
        />
        <StatCard
          title="Total Events Ingested"
          value={totalEvents.toLocaleString()}
          subtitle="Across all Kafka topics"
          icon="📦"
          trend="up"
        />
        <StatCard
          title="HDFS Lake Sink"
          value="Healthy"
          subtitle="Partitioned /econext/raw/"
          icon="🌊"
          trend="up"
        />
      </div>

      {/* Live Data Sources Table */}
      <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Registered Ingestion Pipelines</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Auto-refreshes every 15s</span>
        </div>

        {loading && sources.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading live data sources...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px' }}>Source / Pipeline</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Target Kafka Topic</th>
                  <th style={{ padding: '12px 16px' }}>HDFS Sink Path</th>
                  <th style={{ padding: '12px 16px' }}>Rate</th>
                  <th style={{ padding: '12px 16px' }}>Events Ingested</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((src) => (
                  <tr key={src.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{src.sourceName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{src.description}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Badge variant="neutral">{src.sourceType}</Badge>
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: 'var(--primary-color)' }}>
                      {src.targetTopic}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {src.hdfsSinkPath}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                      {src.status === 'ACTIVE' ? `${(src.ingestionRatePerSec || 0).toFixed(1)} ev/s` : '0.0 ev/s'}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                      {(src.totalEventsIngested || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Badge variant={src.status === 'ACTIVE' ? 'success' : 'warning'}>
                        {src.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleDispatchTestEvent(src.id, src.sourceName)}
                          disabled={actionLoading === `test-${src.id}`}
                          title="Dispatch single test event to Kafka"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          {actionLoading === `test-${src.id}` ? '...' : '🧪 Test'}
                        </button>
                        <button
                          className={`btn btn-sm ${src.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => handleToggleStatus(src.id, src.sourceName)}
                          disabled={actionLoading === `toggle-${src.id}`}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          {src.status === 'ACTIVE' ? '⏸️ Pause' : '▶️ Resume'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Source Modal */}
      <Modal
        isOpen={isModalOpen}
        title="Register Live Data Ingestion Source"
        onClose={() => setIsModalOpen(false)}
      >
          <form onSubmit={handleCreateSource} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Pipeline Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g., Customer Review Sentiment Feed"
                value={formData.sourceName}
                onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Source Type</label>
                <select
                  className="form-select"
                  value={formData.sourceType}
                  onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                >
                  <option value="KAFKA_TOPIC">Kafka Topic Stream</option>
                  <option value="CDC_STREAM">Database CDC Stream</option>
                  <option value="APP_EVENT_BUS">Spring Event Bus</option>
                  <option value="REST_POLL">External REST Feed</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Target Kafka Topic *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g., customer-reviews"
                  value={formData.targetTopic}
                  onChange={(e) => setFormData({ ...formData, targetTopic: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>HDFS Destination Path</label>
              <input
                type="text"
                className="form-input"
                placeholder="/econext/raw/topic_name/"
                value={formData.hdfsSinkPath}
                onChange={(e) => setFormData({ ...formData, hdfsSinkPath: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Description</label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="Describe the payload format and business use case..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={actionLoading === 'create'}
              >
                {actionLoading === 'create' ? 'Registering...' : 'Register Pipeline'}
              </button>
            </div>
          </form>
        </Modal>
    </div>
  );
}
