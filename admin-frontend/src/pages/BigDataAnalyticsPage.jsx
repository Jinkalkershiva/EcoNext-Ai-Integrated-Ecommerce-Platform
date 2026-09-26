import React, { useState, useEffect } from 'react';
import { bigDataApi } from '../api/operationsApis';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';

export default function BigDataAnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [searchTrends, setSearchTrends] = useState(null);
  const [hdfsMetrics, setHdfsMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'search', 'hdfs', 'spark'

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewData, searchData, hdfsData] = await Promise.all([
        bigDataApi.getOverview(),
        bigDataApi.getSearchTrends(),
        bigDataApi.getHdfsLakeMetrics()
      ]);
      setOverview(overviewData);
      setSearchTrends(searchData);
      setHdfsMetrics(hdfsData);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load Big Data analytics telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !overview) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading Big Data & Ingestion Telemetry...
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Big Data & Hadoop Analytics</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Real-time Kafka streaming telemetry, Apache Spark structured pipelines, and HDFS Data Lake storage.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
            🔄 Refresh Metrics
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Top Telemetry KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard
          title="Kafka Cluster"
          value={overview?.kafkaClusterStatus || 'CONNECTED'}
          subtitle={overview?.kafkaBootstrapServers || 'localhost:9092'}
          icon="⚡"
          trend="up"
        />
        <StatCard
          title="Live Throughput"
          value={`${overview?.currentIngestionThroughputPerSec || 0} ev/s`}
          subtitle="Real-time ingestion"
          icon="📈"
          trend="up"
        />
        <StatCard
          title="24h Total Events"
          value={(overview?.totalEventsProcessed24h || 0).toLocaleString()}
          subtitle="Streamed & partitioned"
          icon="📦"
          trend="up"
        />
        <StatCard
          title="HDFS Lake Storage"
          value={`${hdfsMetrics?.usedCapacityGb || 4.28} GB`}
          subtitle={`${hdfsMetrics?.lakeUsagePercentage || 0.86}% of cluster pool`}
          icon="🌊"
          trend="neutral"
        />
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
        {[
          { id: 'overview', label: '📊 Streaming Overview & AI Forecast' },
          { id: 'search', label: '🔍 Search Intelligence & Demand' },
          { id: 'hdfs', label: '🗄️ HDFS Data Lake Partitions' },
          { id: 'spark', label: '⚡ Spark Structured Pipelines' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary-color)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Streaming Overview & AI Demand Forecast */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Real-time Ingestion Trend & Topic Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Real-Time Throughput Trend (Events / Sec)</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '140px', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                {overview?.throughputTrend?.map((pt, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.min(100, Math.max(15, (pt.eventsPerSec / 30) * 100))}%`,
                        background: 'var(--primary-color)',
                        borderRadius: '4px 4px 0 0',
                        opacity: 0.85
                      }}
                      title={`${pt.timestamp}: ${pt.eventsPerSec} ev/s`}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>{pt.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Events by Topic */}
            <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Events Distribution by Kafka Topic</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {overview?.eventsPerTopic &&
                  Object.entries(overview.eventsPerTopic).map(([topic, count]) => (
                    <div
                      key={topic}
                      style={{
                        padding: '12px',
                        background: 'var(--bg-subtle)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{topic}</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{count.toLocaleString()}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* AI Demand Forecasting & Insights */}
          <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>🤖 AI Demand & Eco Forecasting</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {overview?.aiForecastingInsights?.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{item.categoryName}</span>
                    <Badge variant="success">+{item.predictedGrowthPercentage}% Demand</Badge>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--primary-color)', margin: '4px 0', fontWeight: 500 }}>
                    🌿 {item.sustainabilityLift}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    💡 {item.recommendedAction}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>
                    Confidence: {(item.confidenceScore * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Search Intelligence & Zero Result Queries */}
      {activeTab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Searches Table */}
          <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Top High-Intent Customer Search Queries</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px' }}>Search Query</th>
                  <th style={{ padding: '12px 16px' }}>Volume</th>
                  <th style={{ padding: '12px 16px' }}>Avg Result Items</th>
                  <th style={{ padding: '12px 16px' }}>Search-to-Cart Conversion</th>
                  <th style={{ padding: '12px 16px' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {searchTrends?.topQueries?.map((q, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>"{q.query}"</td>
                    <td style={{ padding: '12px 16px' }}>{q.count.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>{q.avgResults}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--primary-color)' }}>{q.conversionRate}%</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant={q.trend === 'UP' ? 'success' : q.trend === 'DOWN' ? 'warning' : 'neutral'}>
                        {q.trend === 'UP' ? '↗ Rising' : q.trend === 'DOWN' ? '↘ Falling' : '→ Stable'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Zero-Result Queries (Untapped Product Demand) */}
          <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>⚠️ Zero-Result Queries (Untapped Sustainable Product Demand)</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Products searched for by customers that currently return 0 catalog results. Use for catalog expansion.
              </p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px' }}>Searched Term</th>
                  <th style={{ padding: '12px 16px' }}>Search Attempts</th>
                  <th style={{ padding: '12px 16px' }}>Action Recommendation</th>
                  <th style={{ padding: '12px 16px' }}>Urgency</th>
                </tr>
              </thead>
              <tbody>
                {searchTrends?.zeroResultQueries?.map((z, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#dc2626' }}>"{z.query}"</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{z.count.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>Source eco-friendly supplier or create catalog product listing</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant="danger">High Demand Gap</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: HDFS Data Lake Partitions */}
      {activeTab === 'hdfs' && (
        <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Hadoop HDFS Partitioned Storage Layers</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Cluster NameNode: <span style={{ fontFamily: 'monospace' }}>{hdfsMetrics?.hdfsClusterUri}</span>
              </p>
            </div>
            <Badge variant="success">Status: {hdfsMetrics?.hdfsStatus}</Badge>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px' }}>HDFS Directory Path</th>
                <th style={{ padding: '12px 16px' }}>Layer</th>
                <th style={{ padding: '12px 16px' }}>Format</th>
                <th style={{ padding: '12px 16px' }}>File Count</th>
                <th style={{ padding: '12px 16px' }}>Size (MB)</th>
                <th style={{ padding: '12px 16px' }}>Retention / Partitioning</th>
              </tr>
            </thead>
            <tbody>
              {hdfsMetrics?.directoryBreakdown?.map((dir, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-color)' }}>
                    {dir.path}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge variant={dir.layer === 'RAW' ? 'neutral' : dir.layer === 'PROCESSED' ? 'warning' : 'success'}>
                      {dir.layer}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{dir.format}</td>
                  <td style={{ padding: '12px 16px' }}>{dir.fileCount.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{dir.sizeMb.toFixed(1)} MB</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{dir.retentionPolicy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: Spark Structured Pipelines */}
      {activeTab === 'spark' && (
        <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Active Apache Spark Streaming & Compaction Pipelines</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px' }}>Pipeline Name</th>
                <th style={{ padding: '12px 16px' }}>Mode</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Processed Rows / Hr</th>
                <th style={{ padding: '12px 16px' }}>End-to-End Latency</th>
                <th style={{ padding: '12px 16px' }}>Last Checkpoint</th>
              </tr>
            </thead>
            <tbody>
              {hdfsMetrics?.sparkPipelines?.map((pipe, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{pipe.pipelineName}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{pipe.streamingMode}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge variant={pipe.status === 'RUNNING' ? 'success' : 'neutral'}>{pipe.status}</Badge>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{pipe.processedRowsLastHour.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>{pipe.latencySeconds}s</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{pipe.lastCheckpointTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
