import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Download,
  Check,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Eye,
  Filter,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  CheckCheck
} from 'lucide-react';
import { bulkImportApi, dataImportApi } from '../api/operationsApis';
import { StatusBadge } from '../components/Badge';

const EXPECTED_PRODUCT_FIELDS = [
  { key: 'sku', label: 'SKU Code *', required: true, aliases: ['sku', 'product_sku', 'sku_code', 'item_sku'] },
  { key: 'name', label: 'Product Name *', required: true, aliases: ['name', 'product_name', 'productname', 'title', 'item_name'] },
  { key: 'price', label: 'Price (₹) *', required: true, aliases: ['price', 'unit_price', 'current_price', 'currentprice', 'mrp', 'cost'] },
  { key: 'stock', label: 'Stock Quantity *', required: true, aliases: ['stock', 'stock_quantity', 'stockquantity', 'quantity', 'inventory', 'qty'] },
  { key: 'category', label: 'Category *', required: true, aliases: ['category', 'category_name', 'categoryname', 'category_slug', 'cat'] },
  { key: 'sustainabilityScore', label: 'Sustainability Score (0-100)', required: false, aliases: ['sustainability_score', 'sustainabilityscore', 'eco_score', 'score'] },
  { key: 'carbonFootprintKg', label: 'Carbon Footprint (kg)', required: false, aliases: ['carbon_footprint', 'carbonfootprint', 'carbon_footprint_kg', 'carbon'] },
  { key: 'description', label: 'Description', required: false, aliases: ['description', 'desc', 'details', 'summary'] },
  { key: 'materials', label: 'Materials Composition', required: false, aliases: ['materials', 'materials_used', 'composition', 'fabric'] },
  { key: 'certifications', label: 'Eco Certifications', required: false, aliases: ['certifications', 'eco_certifications', 'standards'] }
];

export const ImportWizardPage = () => {
  const navigate = useNavigate();

  // Stepper state (1: Upload, 2: Column Mapping, 3: Validate & AI Review, 4: Execute, 5: Summary Report)
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [parsedRawRows, setParsedRawRows] = useState([]);
  const [detectedHeaders, setDetectedHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState('');

  // Validation Data & AI suggestions
  const [validatedRows, setValidatedRows] = useState([]);
  const [validationSummary, setValidationSummary] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL'); // 'ALL' | 'ERRORS' | 'WARNINGS' | 'AI_SUGGESTIONS' | 'VALID'

  // Execution & Summary
  const [executing, setExecuting] = useState(false);
  const [importSummaryReport, setImportSummaryReport] = useState(null);

  // Sample CSV generator
  const downloadSampleTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "sku,name,description,price,stock,category,sustainability_score,carbon_footprint,materials,certifications\n" +
      "ECO-KID-TSHIRT-001,Organic Cotton Kids T-Shirt,Soft breathable kids T-shirt made from organic cotton,899,100,Kids,88,2.4,95% Organic Cotton; 5% Recycled Elastane,GOTS Certified; OEKO-TEX Standard 100\n" +
      "ECO-KID-ROMPER-002,Organic Bamboo Cotton Kids Romper,Hypoallergenic romper for infants and kids,1099,75,Kids,96,1.8,70% Organic Bamboo; 30% Organic Cotton,OEKO-TEX Standard 100\n" +
      "ECO-MEN-HEMP-003,Men Organic Hemp Overshirt,Durable minimalist hemp overshirt,2499,35,Apparel,94,3.1,100% Organic Hemp Fiber,FairTrade Certified\n" +
      "ECO-WOMEN-DRESS-004,Women Organic Linen Maxi Dress,Breathable organic flax linen dress,2999,40,Apparel,91,2.9,100% Certified Organic Linen,GOTS Certified\n" +
      "ECO-HOME-TOWEL-005,Organic Bamboo Bath Towel Set,Ultra-absorbent luxury bath towel set,1499,60,Home & Living,89,1.5,100% Organic Bamboo,OEKO-TEX Standard 100\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "econext_products_import_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Parser helper in browser
  const parseCsvText = (text) => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      // Split preserving quotes
      const rowValues = [];
      let inQuotes = false;
      let curVal = '';

      for (let ch of lines[i]) {
        if (ch === '"' || ch === "'") {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          rowValues.push(curVal.trim());
          curVal = '';
        } else {
          curVal += ch;
        }
      }
      rowValues.push(curVal.trim());

      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = rowValues[idx] || '';
      });

      rows.push({
        rowNumber: i,
        raw: rowObj
      });
    }

    return { headers, rows };
  };

  // Step 1: File selection & upload
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const { headers, rows } = parseCsvText(text);

        if (headers.length === 0 || rows.length === 0) {
          setError('Uploaded file contains no data rows.');
          return;
        }

        setDetectedHeaders(headers);
        setParsedRawRows(rows);

        // Auto detect mappings based on aliases
        const initialMapping = {};
        EXPECTED_PRODUCT_FIELDS.forEach((field) => {
          const match = headers.find((h) => {
            const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            return field.aliases.some(alias => {
              const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
              return cleanH === cleanAlias || cleanH.includes(cleanAlias) || cleanAlias.includes(cleanH);
            });
          });
          if (match) {
            initialMapping[field.key] = match;
          }
        });

        setColumnMapping(initialMapping);
        setStep(2);
      } catch (err) {
        setError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(selected);
  };

  // Step 2 -> Step 3: Run Deterministic Validation & AI Review
  const handleProceedToValidation = async () => {
    setError('');
    setUploadLoading(true);

    // Map rows according to columnMapping
    const mappedRows = parsedRawRows.map((r) => {
      const mappedData = {};
      EXPECTED_PRODUCT_FIELDS.forEach((f) => {
        const header = columnMapping[f.key];
        if (header && r.raw[header] !== undefined) {
          mappedData[f.key] = r.raw[header];
        }
      });
      return {
        rowNumber: r.rowNumber,
        data: mappedData
      };
    });

    try {
      const res = await bulkImportApi.validateProducts(mappedRows, true);
      setValidatedRows(res.rows || []);
      setValidationSummary(res.summary || {
        totalRows: mappedRows.length,
        validRows: res.rows?.filter(r => r.isValid).length || 0,
        errorRows: res.rows?.filter(r => !r.isValid).length || 0,
        warningRows: 0,
        aiSuggestionRows: res.rows?.filter(r => r.aiSuggestions && r.aiSuggestions.length > 0).length || 0,
        canProceed: true
      });
      setStep(3);
    } catch (err) {
      setError(err.message || 'Validation request failed.');
    } finally {
      setUploadLoading(false);
    }
  };

  // Explicit AI Suggestion Approval: Apply suggestion to a row
  const handleApplyAiSuggestion = (rowNumber, suggestion) => {
    setValidatedRows((prevRows) =>
      prevRows.map((row) => {
        if (row.rowNumber === rowNumber) {
          const updatedData = { ...row.data, [suggestion.field]: suggestion.suggested_value };
          // Remove category error if applicable
          const updatedErrors = row.errors.filter((e) => e.field !== suggestion.field);
          const updatedAi = row.aiSuggestions.filter((s) => s.field !== suggestion.field);
          return {
            ...row,
            data: updatedData,
            errors: updatedErrors,
            isValid: updatedErrors.length === 0,
            aiSuggestions: updatedAi,
            appliedSuggestion: true
          };
        }
        return row;
      })
    );

    // Update summary counts
    setValidationSummary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        validRows: prev.validRows + 1,
        errorRows: Math.max(0, prev.errorRows - 1),
        aiSuggestionRows: Math.max(0, prev.aiSuggestionRows - 1)
      };
    });
  };

  // Step 3 -> Step 4 & 5: Execute Import
  const handleExecuteImport = async () => {
    setError('');
    setExecuting(true);
    setStep(4);

    const validRowsToImport = validatedRows.filter((r) => r.isValid);

    try {
      const res = await bulkImportApi.executeImport(validRowsToImport, file ? file.name : 'bulk_products.csv');
      setImportSummaryReport(res);
      setStep(5);
    } catch (err) {
      setError(err.message || 'Bulk import execution failed.');
      setStep(3);
    } finally {
      setExecuting(false);
    }
  };

  // Export Error Report
  const downloadErrorReport = () => {
    if (!importSummaryReport || !importSummaryReport.skippedRecords) return;

    const csvRows = ['Row Number,SKU,Product Name,Failure Reason'];
    importSummaryReport.skippedRecords.forEach((r) => {
      csvRows.push(`"${r.rowNumber || ''}","${r.sku || ''}","${r.name || ''}","${r.reason || ''}"`);
    });

    const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `import_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setParsedRawRows([]);
    setDetectedHeaders([]);
    setColumnMapping({});
    setValidatedRows([]);
    setValidationSummary(null);
    setImportSummaryReport(null);
    setError('');
  };

  // Filtered rows for Step 3 Table
  const filteredRows = validatedRows.filter((r) => {
    if (filterSeverity === 'ERRORS') return !r.isValid;
    if (filterSeverity === 'VALID') return r.isValid;
    if (filterSeverity === 'AI_SUGGESTIONS') return r.aiSuggestions && r.aiSuggestions.length > 0;
    return true;
  });

  return (
    <div className="import-wizard-page space-y-6">
      {/* Header */}
      <div className="card-header-flex">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <UploadCloud size={24} className="text-primary" />
            <span>Bulk Data Import Wizard</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            Enterprise batch catalog ingestion engine with deterministic validation, assistive AI suggestions, and automated audit logging.
          </p>
        </div>

        <button
          className="btn btn-secondary btn-sm flex items-center gap-1.5"
          onClick={downloadSampleTemplate}
        >
          <Download size={14} />
          <span>Download Sample CSV Template</span>
        </button>
      </div>

      {/* Stepper Progress Indicator */}
      <div className="card p-4 bg-surface">
        <div className="flex items-center justify-between max-w-4xl mx-auto text-xs">
          {[
            { num: 1, label: 'Upload File' },
            { num: 2, label: 'Map Columns' },
            { num: 3, label: 'Validate & AI Review' },
            { num: 4, label: 'Execute Import' },
            { num: 5, label: 'Summary Report' }
          ].map((s, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                    step === s.num
                      ? 'bg-primary text-white ring-2 ring-primary/30'
                      : step > s.num
                      ? 'bg-success text-white'
                      : 'bg-surface-raised text-muted border border-border'
                  }`}
                >
                  {step > s.num ? <Check size={14} /> : s.num}
                </div>
                <span className={`font-semibold ${step >= s.num ? 'text-body' : 'text-muted'}`}>
                  {s.label}
                </span>
              </div>
              {idx < 4 && <div className="flex-1 h-0.5 bg-border mx-3" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="alert alert-danger flex items-center justify-between p-3 rounded-lg border border-danger">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-danger shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button className="btn-close" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: UPLOAD FILE                                                       */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="card max-w-2xl mx-auto p-6">
          <div className="text-center mb-6">
            <FolderOpen size={48} className="mx-auto text-primary opacity-80 mb-2" />
            <h3 className="text-base font-bold">Select CSV or Excel Catalog File</h3>
            <p className="text-xs text-muted mt-1">
              Supports CSV, XLSX, and multi-sheet product catalogs. Column mapping will be auto-detected.
            </p>
          </div>

          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors bg-surface-raised">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              id="catalog-file-input"
              className="hidden"
              onChange={handleFileChange}
            />
            <label htmlFor="catalog-file-input" className="cursor-pointer space-y-3 block">
              <UploadCloud size={36} className="mx-auto text-muted" />
              <div>
                <span className="btn btn-primary btn-sm font-semibold">Choose File to Upload</span>
              </div>
              <p className="text-2xs text-muted">or drag & drop your .csv or .xlsx file here</p>
            </label>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: COLUMN MAPPING                                                    */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="card space-y-4 p-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="section-title text-sm font-bold flex items-center gap-2">
                <Layers size={16} className="text-primary" />
                <span>Step 2: Map Uploaded Columns to Catalog Attributes</span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                File: <strong>{file?.name}</strong> | Detected Columns: <strong>{detectedHeaders.join(', ')}</strong>
              </p>
            </div>

            <button className="btn btn-secondary btn-xs" onClick={() => setStep(1)}>
              Change File
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EXPECTED_PRODUCT_FIELDS.map((field) => (
              <div key={field.key} className="p-3 bg-surface-raised rounded-lg border border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-body">
                    {field.label}
                  </label>
                  {columnMapping[field.key] && (
                    <span className="badge badge-success text-2xs flex items-center gap-0.5">
                      <Check size={10} />
                      <span>Mapped</span>
                    </span>
                  )}
                </div>

                <select
                  className="input text-xs"
                  value={columnMapping[field.key] || ''}
                  onChange={(e) =>
                    setColumnMapping((prev) => ({
                      ...prev,
                      [field.key]: e.target.value
                    }))
                  }
                >
                  <option value="">-- Select Matching Column --</option>
                  {detectedHeaders.map((h, idx) => (
                    <option key={idx} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="btn btn-primary flex items-center gap-2 font-bold"
              onClick={handleProceedToValidation}
              disabled={uploadLoading || !columnMapping.name || !columnMapping.price}
            >
              {uploadLoading ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              <span>Run Deterministic Validation & AI Review</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: VALIDATE & AI REVIEW                                              */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          {validationSummary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="card p-3 text-center bg-surface">
                <span className="text-xs text-muted font-semibold">Total Rows</span>
                <div className="text-xl font-bold font-mono text-body mt-1">{validationSummary.totalRows}</div>
              </div>

              <div className="card p-3 text-center bg-surface">
                <span className="text-xs text-muted font-semibold">Valid Records</span>
                <div className="text-xl font-bold font-mono text-success mt-1">{validationSummary.validRows}</div>
              </div>

              <div className="card p-3 text-center bg-surface">
                <span className="text-xs text-muted font-semibold">Errors (Blocking)</span>
                <div className="text-xl font-bold font-mono text-danger mt-1">{validationSummary.errorRows}</div>
              </div>

              <div className="card p-3 text-center bg-surface">
                <span className="text-xs text-muted font-semibold">AI Suggestions</span>
                <div className="text-xl font-bold font-mono text-primary mt-1">{validationSummary.aiSuggestionRows}</div>
              </div>

              <div className="card p-3 text-center bg-surface">
                <span className="text-xs text-muted font-semibold">Action Status</span>
                <div className="text-xs font-bold text-success mt-2">
                  {validationSummary.validRows > 0 ? 'READY TO IMPORT' : 'FIX ERRORS'}
                </div>
              </div>
            </div>
          )}

          {/* Validation Filter Tabs */}
          <div className="card">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  className={`btn btn-xs ${filterSeverity === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilterSeverity('ALL')}
                >
                  All Rows ({validatedRows.length})
                </button>
                <button
                  className={`btn btn-xs ${filterSeverity === 'ERRORS' ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => setFilterSeverity('ERRORS')}
                >
                  Errors ({validationSummary?.errorRows || 0})
                </button>
                <button
                  className={`btn btn-xs ${filterSeverity === 'AI_SUGGESTIONS' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilterSeverity('AI_SUGGESTIONS')}
                >
                  AI Suggestions ({validationSummary?.aiSuggestionRows || 0})
                </button>
                <button
                  className={`btn btn-xs ${filterSeverity === 'VALID' ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => setFilterSeverity('VALID')}
                >
                  Valid ({validationSummary?.validRows || 0})
                </button>
              </div>

              <span className="text-xs text-muted">
                Deterministic validation is authoritative. AI suggestions require explicit approval.
              </span>
            </div>

            {/* Validation Rows Table */}
            <div className="table-responsive">
              <table className="table w-full text-xs">
                <thead>
                  <tr>
                    <th>Row #</th>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Category</th>
                    <th>Validation Status</th>
                    <th>Errors / AI Suggestions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.rowNumber} className={!row.isValid ? 'bg-danger-subtle/20' : ''}>
                      <td className="font-mono font-bold">{row.rowNumber}</td>
                      <td className="font-mono">{row.data.sku || <span className="text-danger italic">MISSING</span>}</td>
                      <td className="font-semibold">{row.data.name || <span className="text-danger italic">MISSING</span>}</td>
                      <td className="font-mono">₹{row.data.price}</td>
                      <td className="font-mono">{row.data.stock}</td>
                      <td>{row.data.category}</td>
                      <td>
                        {row.isValid ? (
                          <span className="badge badge-success font-semibold flex items-center gap-1 w-fit">
                            <Check size={10} />
                            <span>VALID</span>
                          </span>
                        ) : (
                          <span className="badge badge-danger font-semibold flex items-center gap-1 w-fit">
                            <AlertTriangle size={10} />
                            <span>ERROR</span>
                          </span>
                        )}
                      </td>
                      <td>
                        {/* Errors */}
                        {row.errors && row.errors.length > 0 && (
                          <div className="space-y-1">
                            {row.errors.map((err, errIdx) => (
                              <div key={errIdx} className="text-danger text-2xs font-semibold flex items-center gap-1">
                                <span>•</span>
                                <span>{err.message}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* AI Suggestions with Approve Button */}
                        {row.aiSuggestions && row.aiSuggestions.length > 0 && (
                          <div className="mt-1.5 p-2 bg-primary-subtle rounded border border-primary/30 space-y-1.5">
                            {row.aiSuggestions.map((sug, sugIdx) => (
                              <div key={sugIdx} className="flex items-center justify-between gap-2">
                                <div className="text-2xs">
                                  <span className="font-bold text-primary flex items-center gap-1">
                                    <Sparkles size={10} />
                                    <span>AI Suggestion: Change "{sug.current_value}" → "{sug.suggested_value}"</span>
                                  </span>
                                  <span className="text-muted block text-3xs mt-0.5">{sug.reason}</span>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-xs whitespace-nowrap text-2xs font-bold"
                                  onClick={() => handleApplyAiSuggestion(row.rowNumber, sug)}
                                >
                                  Apply Fix
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {row.isValid && (!row.aiSuggestions || row.aiSuggestions.length === 0) && (
                          <span className="text-muted text-2xs">Ready for transactional import</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Execution Toolbar */}
            <div className="p-4 border-t border-border flex items-center justify-between">
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                Back to Column Mapping
              </button>

              <div className="flex items-center gap-2">
                <button
                  className="btn btn-primary flex items-center gap-2 font-bold"
                  onClick={handleExecuteImport}
                  disabled={executing || (validationSummary && validationSummary.validRows === 0)}
                >
                  <CheckCheck size={16} />
                  <span>Execute Bulk Import ({validationSummary?.validRows || 0} Valid Records)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: EXECUTING SPINNER                                                 */}
      {/* ========================================================================= */}
      {step === 4 && (
        <div className="card p-12 text-center max-w-xl mx-auto space-y-4">
          <RefreshCw size={48} className="animate-spin mx-auto text-primary" />
          <h3 className="text-lg font-bold">Importing Valid Catalog Records...</h3>
          <p className="text-xs text-muted">
            Executing transactional insert, category association, age-group linking, and audit logging.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: SUMMARY REPORT                                                    */}
      {/* ========================================================================= */}
      {step === 5 && importSummaryReport && (
        <div className="card max-w-3xl mx-auto p-6 space-y-6">
          <div className="text-center space-y-2">
            <CheckCircle2 size={48} className="mx-auto text-success" />
            <h3 className="text-xl font-bold">Bulk Import Completed Successfully</h3>
            <p className="text-xs text-muted">
              Import Reference ID: <strong className="font-mono text-primary">{importSummaryReport.importId}</strong> | File: <strong>{importSummaryReport.filename}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-surface-raised rounded-lg border border-border text-center">
              <span className="text-xs text-muted font-semibold">Total Submitted</span>
              <div className="text-xl font-bold font-mono text-body mt-1">{importSummaryReport.totalRows}</div>
            </div>

            <div className="p-3 bg-surface-raised rounded-lg border border-success/40 text-center">
              <span className="text-xs text-muted font-semibold">Successfully Imported</span>
              <div className="text-xl font-bold font-mono text-success mt-1">{importSummaryReport.imported}</div>
            </div>

            <div className="p-3 bg-surface-raised rounded-lg border border-border text-center">
              <span className="text-xs text-muted font-semibold">Skipped / Excluded</span>
              <div className="text-xl font-bold font-mono text-danger mt-1">{importSummaryReport.skipped}</div>
            </div>

            <div className="p-3 bg-surface-raised rounded-lg border border-border text-center">
              <span className="text-xs text-muted font-semibold">Execution Duration</span>
              <div className="text-xl font-bold font-mono text-primary mt-1">{importSummaryReport.durationMs} ms</div>
            </div>
          </div>

          {/* Imported Records List */}
          {importSummaryReport.importedRecords && importSummaryReport.importedRecords.length > 0 && (
            <div>
              <h4 className="font-bold text-xs uppercase text-muted mb-2">Imported Catalog Items</h4>
              <div className="table-responsive max-h-48 overflow-y-auto">
                <table className="table w-full text-xs">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>SKU</th>
                      <th>Product Name</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importSummaryReport.importedRecords.map((item, idx) => (
                      <tr key={idx}>
                        <td className="font-mono font-bold text-primary">#{item.id}</td>
                        <td className="font-mono">{item.sku}</td>
                        <td className="font-semibold">{item.name}</td>
                        <td className="font-mono">₹{item.price}</td>
                        <td className="font-mono">{item.stock}</td>
                        <td>{item.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Skipped Records & Error Download */}
          {importSummaryReport.skippedRecords && importSummaryReport.skippedRecords.length > 0 && (
            <div className="p-3 bg-danger-subtle/30 rounded-lg border border-danger/40 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-danger">
                  {importSummaryReport.skippedRecords.length} record(s) skipped due to constraints.
                </span>
                <p className="text-2xs text-muted mt-0.5">Download error log for SKU conflict details.</p>
              </div>

              <button className="btn btn-secondary btn-xs flex items-center gap-1" onClick={downloadErrorReport}>
                <Download size={12} />
                <span>Download Skipped Report</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button className="btn btn-secondary" onClick={handleReset}>
              Import Another File
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/products')}>
              View in Products Catalog
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportWizardPage;
