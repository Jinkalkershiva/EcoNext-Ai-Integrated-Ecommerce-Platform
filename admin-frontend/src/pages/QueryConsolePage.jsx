import React, { useState, useEffect } from 'react';
import {
  Database,
  Play,
  History,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Terminal,
  RefreshCw,
  Search,
  Lock,
  Clock,
  Layers,
  FileCode,
  Check,
  ChevronRight
} from 'lucide-react';
import { databaseQueryApi } from '../api/operationsApis';
import { StatusBadge } from '../components/Badge';

const SQL_TEMPLATES = [
  {
    label: 'List Products (Top 10)',
    query: 'SELECT id, name, current_price, stock, sustainability_score FROM products_product ORDER BY id DESC LIMIT 10;'
  },
  {
    label: 'List Orders (Latest 10)',
    query: 'SELECT id, order_reference_number, status, total_price, recipient_name, city, created_at FROM order_service_order ORDER BY id DESC LIMIT 10;'
  },
  {
    label: 'Show All Tables',
    query: 'SHOW TABLES;'
  },
  {
    label: 'Describe Products Table',
    query: 'DESCRIBE products_product;'
  },
  {
    label: 'Describe Orders Table',
    query: 'DESCRIBE order_service_order;'
  },
  {
    label: 'Security Test: Blocked DROP Query',
    query: 'DROP TABLE products_product;'
  }
];

export const QueryConsolePage = () => {
  const [query, setQuery] = useState('SELECT id, name, current_price, stock, sustainability_score FROM products_product ORDER BY id DESC LIMIT 10;');
  const [selectedDb, setSelectedDb] = useState('econext');
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  // Active View Tab: 'results' | 'history' | 'schema'
  const [activeTab, setActiveTab] = useState('results');
  const [historyList, setHistoryList] = useState([]);
  const [schemaData, setSchemaData] = useState({});
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination for results
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const loadHistory = async () => {
    try {
      const history = await databaseQueryApi.getQueryHistory();
      setHistoryList(Array.isArray(history) ? history : []);
    } catch {
      setHistoryList([]);
    }
  };

  const loadSchema = async () => {
    setSchemaLoading(true);
    try {
      const schema = await databaseQueryApi.getDatabaseSchema();
      setSchemaData(schema || {});
    } catch {
      setSchemaData({});
    } finally {
      setSchemaLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    loadSchema();
  }, []);

  const handleExecute = async (sqlToRun = query) => {
    if (!sqlToRun || !sqlToRun.trim()) return;

    setLoading(true);
    setErrorInfo(null);
    setResultData(null);
    setActiveTab('results');
    setCurrentPage(1);

    try {
      const res = await databaseQueryApi.executeQuery(sqlToRun, selectedDb);
      if (res.status === 'success') {
        setResultData(res);
      } else {
        setErrorInfo({
          type: res.error_type || 'EXECUTION_ERROR',
          message: res.message || 'An error occurred during query execution.',
          query: res.query
        });
      }
    } catch (err) {
      setErrorInfo({
        type: err.error_type || 'RESTRICTION_ERROR',
        message: err.message || 'Controlled database console blocked or failed to execute query.',
        query: sqlToRun
      });
    } finally {
      setLoading(false);
      loadHistory();
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportResultsToCsv = () => {
    if (!resultData || !resultData.rows || resultData.rows.length === 0) return;

    const columns = resultData.columns || Object.keys(resultData.rows[0]);
    const csvRows = [];
    csvRows.push(columns.join(','));

    resultData.rows.forEach((row) => {
      const values = columns.map((col) => {
        const val = row[col] === null || row[col] === undefined ? '' : String(row[col]);
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });

    const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `query_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination calculations
  const totalRows = resultData?.rows?.length || 0;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  const paginatedRows = resultData?.rows
    ? resultData.rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
    : [];

  const filteredSchemaTables = Object.keys(schemaData).filter((table) =>
    table.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="query-console-page">
      {/* Header Banner */}
      <div className="card-header-flex mb-4">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Terminal size={24} className="text-primary" />
            <span>Database Query Console</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            Controlled read-only SQL inspection console with RBAC security policies, keyword validation, and automated audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-raised px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-success">
            <Lock size={14} />
            <span>READ-ONLY ENFORCED</span>
          </div>
          <button className="btn btn-secondary btn-sm flex items-center gap-1" onClick={loadSchema}>
            <RefreshCw size={14} className={schemaLoading ? 'animate-spin' : ''} />
            <span>Refresh Schema</span>
          </button>
        </div>
      </div>

      {/* SQL Editor Area */}
      <div className="card mb-4">
        <div className="card-header-flex pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <FileCode size={16} className="text-primary" />
            <span className="font-semibold text-sm">SQL Query Editor</span>
            <span className="text-xs text-muted">(Supports SELECT, SHOW, DESCRIBE, EXPLAIN)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-secondary btn-xs flex items-center gap-1"
              onClick={handleCopyQuery}
              title="Copy query"
            >
              {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              className="btn btn-secondary btn-xs text-muted"
              onClick={() => setQuery('')}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Quick Query Templates */}
        <div className="mt-3 mb-2 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-muted mr-1">Templates:</span>
          {SQL_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              className={`btn btn-xs ${tmpl.label.includes('DROP') ? 'btn-danger-outline' : 'btn-secondary'}`}
              onClick={() => {
                setQuery(tmpl.query);
                if (!tmpl.label.includes('DROP')) {
                  handleExecute(tmpl.query);
                }
              }}
            >
              {tmpl.label}
            </button>
          ))}
        </div>

        {/* Textarea Editor */}
        <div className="mt-2 relative">
          <textarea
            className="input w-full font-mono text-sm"
            rows={5}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your read-only SQL query here (e.g. SELECT * FROM products_product LIMIT 10;)"
            style={{
              backgroundColor: 'var(--surface-color)',
              lineHeight: '1.5',
              letterSpacing: '0.2px'
            }}
          />
        </div>

        {/* Execution Toolbar */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Clock size={14} />
            <span>Press <kbd className="bg-surface-raised px-1.5 py-0.5 rounded border border-border">Ctrl + Enter</kbd> to execute</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-primary flex items-center gap-2 font-semibold"
              onClick={() => handleExecute()}
              disabled={loading || !query.trim()}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
              <span>{loading ? 'Executing Query...' : 'Execute Query'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-3 border-b border-border">
        <button
          className={`tab-btn flex items-center gap-1.5 py-2 px-3 text-sm font-semibold border-b-2 ${
            activeTab === 'results' ? 'border-primary text-primary' : 'border-transparent text-muted'
          }`}
          onClick={() => setActiveTab('results')}
        >
          <Database size={16} />
          <span>Results Grid {resultData ? `(${totalRows})` : ''}</span>
        </button>

        <button
          className={`tab-btn flex items-center gap-1.5 py-2 px-3 text-sm font-semibold border-b-2 ${
            activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted'
          }`}
          onClick={() => {
            setActiveTab('history');
            loadHistory();
          }}
        >
          <History size={16} />
          <span>Execution History ({historyList.length})</span>
        </button>

        <button
          className={`tab-btn flex items-center gap-1.5 py-2 px-3 text-sm font-semibold border-b-2 ${
            activeTab === 'schema' ? 'border-primary text-primary' : 'border-transparent text-muted'
          }`}
          onClick={() => {
            setActiveTab('schema');
            loadSchema();
          }}
        >
          <Layers size={16} />
          <span>Schema Browser ({Object.keys(schemaData).length} Tables)</span>
        </button>
      </div>

      {/* TAB 1: Query Results */}
      {activeTab === 'results' && (
        <div>
          {/* Error Banner */}
          {errorInfo && (
            <div className="alert alert-danger mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={20} className="text-danger shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">
                    {errorInfo.type === 'SECURITY_RESTRICTION'
                      ? 'Access Restricted: Mutating Statement Blocked'
                      : 'SQL Execution Error'}
                  </div>
                  <p className="text-xs mt-1 font-mono">{errorInfo.message}</p>
                  {errorInfo.type === 'SECURITY_RESTRICTION' && (
                    <p className="text-xs text-muted mt-2">
                      EcoNext SQL Query Console is restricted to read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN).
                      Modifying statements (DROP, TRUNCATE, DELETE, UPDATE, INSERT) are strictly prevented.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Success Status Bar */}
          {resultData && (
            <div className="card p-3 mb-3 bg-surface-raised flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                <span className="badge badge-success font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>SUCCESS</span>
                </span>
                <span className="text-muted">
                  Rows: <strong className="text-body font-mono">{resultData.row_count}</strong>
                </span>
                <span className="text-muted">
                  Execution Time: <strong className="text-body font-mono">{resultData.execution_time_ms} ms</strong>
                </span>
              </div>

              {resultData.rows && resultData.rows.length > 0 && (
                <button
                  className="btn btn-secondary btn-xs flex items-center gap-1"
                  onClick={exportResultsToCsv}
                >
                  <Download size={12} />
                  <span>Export CSV</span>
                </button>
              )}
            </div>
          )}

          {/* Result Data Table */}
          {resultData && resultData.rows && resultData.rows.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="table-responsive">
                <table className="table table-hover w-full text-xs">
                  <thead>
                    <tr>
                      {resultData.columns.map((col, idx) => (
                        <th key={idx} className="font-mono uppercase font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {resultData.columns.map((col, colIdx) => (
                          <td key={colIdx} className="font-mono">
                            {row[col] !== null && row[col] !== undefined ? (
                              String(row[col])
                            ) : (
                              <span className="text-muted italic">NULL</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted">
                    Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
                    {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows} records
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      className="btn btn-secondary btn-xs"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span className="px-2 font-mono">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-xs"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : !errorInfo && !loading ? (
            <div className="card p-8 text-center text-muted">
              <Terminal size={36} className="mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-sm">No Active Query Results</p>
              <p className="text-xs mt-1">Select a template above or enter a read-only SQL query to inspect data.</p>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: Execution History */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header-flex pb-3 border-b border-border">
            <h3 className="section-title text-sm flex items-center gap-2">
              <History size={16} />
              <span>Query Execution Audit Trail</span>
            </h3>
            <button className="btn btn-secondary btn-xs" onClick={loadHistory}>
              <RefreshCw size={12} />
              <span>Refresh History</span>
            </button>
          </div>

          {historyList.length === 0 ? (
            <div className="p-6 text-center text-muted text-xs">No recorded query executions yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table w-full text-xs">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Rows</th>
                    <th>SQL Statement</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-muted font-mono whitespace-nowrap">{item.timestamp}</td>
                      <td className="font-semibold">{item.user}</td>
                      <td>
                        <span
                          className={`badge ${
                            item.status === 'SUCCESS'
                              ? 'badge-success'
                              : item.status === 'BLOCKED'
                              ? 'badge-danger'
                              : 'badge-warning'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="font-mono">{item.duration_ms} ms</td>
                      <td className="font-mono">{item.row_count}</td>
                      <td className="font-mono max-w-md truncate" title={item.query}>
                        {item.query}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => {
                            setQuery(item.query);
                            setActiveTab('results');
                            handleExecute(item.query);
                          }}
                        >
                          Rerun
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Schema Browser */}
      {activeTab === 'schema' && (
        <div className="card">
          <div className="card-header-flex pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-primary" />
              <span className="font-semibold text-sm">Database Schema Explorer</span>
            </div>

            <div className="relative w-64">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted" />
              <input
                type="text"
                className="input input-sm pl-8 w-full text-xs"
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {filteredSchemaTables.map((tableName, idx) => {
              const columns = schemaData[tableName] || [];
              return (
                <div key={idx} className="card p-3 border border-border bg-surface-raised">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-xs text-primary">{tableName}</span>
                    <button
                      className="btn btn-secondary btn-xs flex items-center gap-0.5"
                      onClick={() => {
                        const q = `SELECT * FROM ${tableName} LIMIT 10;`;
                        setQuery(q);
                        setActiveTab('results');
                        handleExecute(q);
                      }}
                      title="Query table"
                    >
                      <span>Query</span>
                      <ChevronRight size={10} />
                    </button>
                  </div>

                  <div className="space-y-1 text-xs font-mono max-h-40 overflow-y-auto pr-1">
                    {columns.map((c, cIdx) => (
                      <div key={cIdx} className="flex items-center justify-between text-muted hover:text-body">
                        <span>{c.name}</span>
                        <span className="text-2xs opacity-75">{c.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryConsolePage;
