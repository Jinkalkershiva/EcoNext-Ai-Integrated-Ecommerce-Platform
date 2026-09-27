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
  FolderOpen
} from 'lucide-react';
import { dataImportApi } from '../api/operationsApis';
import { StatusBadge } from '../components/Badge';

const EXPECTED_PRODUCT_FIELDS = [
  { key: 'name', label: 'Product Name', required: true },
  { key: 'sku', label: 'SKU Code', required: true },
  { key: 'price', label: 'Price (₹)', required: true },
  { key: 'stockQuantity', label: 'Stock Quantity', required: true },
  { key: 'categoryName', label: 'Category Name', required: false },
  { key: 'description', label: 'Description', required: false },
  { key: 'sustainabilityScore', label: 'Sustainability Score', required: false },
  { key: 'carbonFootprintKg', label: 'Carbon Footprint (kg)', required: false },
  { key: 'ecoCertifications', label: 'Eco Certifications', required: false },
  { key: 'materialsUsed', label: 'Materials Composition', required: false }
];

export const ImportWizardPage = () => {
  const navigate = useNavigate();

  // Wizard state: 1: Upload, 2: Mapping, 3: Validation Preview, 4: Executing, 5: Report
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [targetType, setTargetType] = useState('PRODUCTS');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState('');

  // Uploaded file metadata & detected headers
  const [fileMetadata, setFileMetadata] = useState(null);
  const [detectedHeaders, setDetectedHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});

  // Validation Preview
  const [previewData, setPreviewData] = useState([]);
  const [validationStats, setValidationStats] = useState({ total: 0, valid: 0, invalid: 0 });

  // Execution & Job report
  const [jobId, setJobId] = useState(null);
  const [jobReport, setJobReport] = useState(null);
  const [executing, setExecuting] = useState(false);

  // Sample CSV Template Generator
  const downloadSampleTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,SKU,Price,Stock,Category,Description,Sustainability_Score,Carbon_Footprint,Certifications,Materials\n" +
      "Organic Bamboo Toothbrush,ECO-BAM-001,149.00,100,Personal Care,Biodegradable bamboo toothbrush with soft charcoal bristles,95,0.12,FSC Certified,100% Bamboo\n" +
      "Hemp Canvas Tote Bag,ECO-BAG-002,499.00,75,Accessories,Durable sustainable hemp grocery tote bag,90,0.45,GOTS Organic,Raw Hemp Fiber\n" +
      "Stainless Steel Flask,ECO-BOT-003,899.00,50,Kitchen,Vacuum insulated BPA-free stainless steel bottle,85,1.20,BPA Free,Food Grade 304 Steel\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "econext_sample_products_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Step 1: Upload
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV or Excel file to upload');
      return;
    }
    setError('');
    setUploadLoading(true);
    try {
      const res = await dataImportApi.uploadFile(file);
      setFileMetadata(res);
      setDetectedHeaders(res.detectedHeaders || []);

      // Auto-map matching columns
      const autoMap = {};
      EXPECTED_PRODUCT_FIELDS.forEach((f) => {
        const match = res.detectedHeaders?.find((h) => {
          const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanF = f.key.toLowerCase();
          return cleanH.includes(cleanF) || cleanF.includes(cleanH);
        });
        if (match) {
          autoMap[f.key] = match;
        }
      });
      setColumnMapping(autoMap);
      setStep(2);
    } catch (err) {
      setError(err.message || 'File upload and parsing failed');
    } finally {
      setUploadLoading(false);
    }
  };

  // Step 2 -> Step 3: Validate Preview
  const handleProceedToValidation = async () => {
    setError('');
    try {
      const previewRes = await dataImportApi.previewData(fileMetadata.fileId, columnMapping);
      setPreviewData(previewRes.rows || []);
      const total = previewRes.rows?.length || 0;
      const invalid = previewRes.rows?.filter(r => !r.isValid)?.length || 0;
      setValidationStats({
        total,
        valid: total - invalid,
        invalid
      });
      setStep(3);
    } catch (err) {
      setError(err.message || 'Validation preview failed');
    }
  };

  // Step 3 -> Step 4: Execute Batch Import
  const handleExecuteImport = async () => {
    setError('');
    setExecuting(true);
    setStep(4);
    try {
      const res = await dataImportApi.executeImport(fileMetadata.fileId, targetType, columnMapping);
      setJobId(res.jobId || res.id);
      
      // Poll or fetch status
      const report = await dataImportApi.getJobStatus(res.jobId || res.id);
      setJobReport(report);
      setStep(5);
    } catch (err) {
      setError(err.message || 'Batch import execution encountered errors');
      setStep(3);
    } finally {
      setExecuting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setFileMetadata(null);
    setDetectedHeaders([]);
    setColumnMapping({});
    setPreviewData([]);
    setJobReport(null);
    setError('');
  };

  return (
    <div className="import-wizard-page">
      {/* Wizard Step Indicator */}
      <div className="wizard-stepper mb-4">
        <div className={`wizard-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
          <div className="step-num">{step > 1 ? <Check size={14} /> : '1'}</div>
          <span>Upload File</span>
        </div>
        <div className="step-line"></div>
        <div className={`wizard-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
          <div className="step-num">{step > 2 ? <Check size={14} /> : '2'}</div>
          <span>Map Columns</span>
        </div>
        <div className="step-line"></div>
        <div className={`wizard-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'done' : ''}`}>
          <div className="step-num">{step > 3 ? <Check size={14} /> : '3'}</div>
          <span>Validate Preview</span>
        </div>
        <div className="step-line"></div>
        <div className={`wizard-step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'done' : ''}`}>
          <div className="step-num">{step > 4 ? <Check size={14} /> : '4'}</div>
          <span>Execute Import</span>
        </div>
        <div className="step-line"></div>
        <div className={`wizard-step ${step >= 5 ? 'active' : ''}`}>
          <div className="step-num">5</div>
          <span>Summary Report</span>
        </div>
      </div>

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

      {/* STEP 1: Upload File */}
      {step === 1 && (
        <div className="card max-w-2xl mx-auto">
          <div className="card-header-flex">
            <h3 className="section-title flex items-center gap-2">
              <UploadCloud size={20} className="text-primary" />
              <span>Step 1: Upload CSV or Excel Dataset</span>
            </h3>
            <button className="btn btn-secondary btn-xs flex items-center gap-1" onClick={downloadSampleTemplate}>
              <Download size={12} />
              <span>Download Sample CSV</span>
            </button>
          </div>

          <form onSubmit={handleFileUpload} className="mt-4">
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Select Operational Target</label>
              <select
                className="input"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
              >
                <option value="PRODUCTS">Products Catalog Ingestion</option>
                <option value="INVENTORY">Inventory Stock Adjustments</option>
                <option value="CATEGORIES">Category Taxonomy</option>
              </select>
            </div>

            <div className="file-dropzone-box">
              <div className="dropzone-icon text-primary flex justify-center mb-2">
                <FolderOpen size={40} />
              </div>
              <p className="dropzone-title">Drag & drop your .csv, .xlsx, or .xls file here</p>
              <p className="dropzone-subtitle text-xs text-muted">Supported formats: OpenCSV & Apache POI Multi-sheet Excel</p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files[0])}
                className="file-input-hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="btn btn-secondary mt-3">
                {file ? `Selected: ${file.name}` : 'Browse Local File'}
              </label>
            </div>

            <div className="modal-actions-right mt-4">
              <button
                type="submit"
                className="btn btn-primary flex items-center gap-1.5"
                disabled={!file || uploadLoading}
              >
                <span>{uploadLoading ? 'Inspecting Headers...' : 'Upload & Analyze Headers'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: Header & Column Mapping */}
      {step === 2 && (
        <div className="card">
          <div className="card-header-flex">
            <div>
              <h3 className="section-title">Step 2: Column Schema Mapping</h3>
              <p className="text-muted text-xs">
                File: <strong>{fileMetadata?.originalFilename}</strong> ({fileMetadata?.totalRows} rows detected)
              </p>
            </div>
            <button className="btn btn-secondary btn-xs flex items-center gap-1" onClick={() => setStep(1)}>
              <ArrowLeft size={12} />
              <span>Choose Different File</span>
            </button>
          </div>

          <div className="mapping-grid mt-4">
            {EXPECTED_PRODUCT_FIELDS.map((field) => (
              <div key={field.key} className="mapping-row flex items-center gap-3 py-2 border-b border-[var(--border-subtle)]">
                <div className="field-meta w-1/3">
                  <span className="field-name font-medium text-sm">{field.label}</span>
                  {field.required && <span className="text-danger ml-1">*</span>}
                  <span className="mono-text text-muted text-xs block">{field.key}</span>
                </div>
                <div className="mapping-arrow text-muted">
                  <ArrowRight size={16} />
                </div>
                <div className="mapping-select flex-1">
                  <select
                    className="input input-sm"
                    value={columnMapping[field.key] || ''}
                    onChange={(e) =>
                      setColumnMapping({
                        ...columnMapping,
                        [field.key]: e.target.value
                      })
                    }
                  >
                    <option value="">-- Do Not Import / Default --</option>
                    {detectedHeaders.map((header) => (
                      <option key={header} value={header}>
                        Header: "{header}"
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="modal-actions-right mt-4 flex items-center gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn btn-primary btn-sm flex items-center gap-1.5" onClick={handleProceedToValidation}>
              <span>Validate & Preview Rows</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Validation Preview */}
      {step === 3 && (
        <div className="card">
          <div className="card-header-flex">
            <div>
              <h3 className="section-title">Step 3: Validation & Anomaly Inspection</h3>
              <div className="validation-pill-row mt-1 flex items-center gap-2">
                <span className="badge badge-neutral">Total: {validationStats.total}</span>
                <span className="badge badge-success">Valid: {validationStats.valid}</span>
                {validationStats.invalid > 0 && (
                  <span className="badge badge-danger">Invalid/Duplicate: {validationStats.invalid}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-xs flex items-center gap-1" onClick={() => setStep(2)}>
                <ArrowLeft size={12} />
                <span>Adjust Mapping</span>
              </button>
              <button
                className="btn btn-primary btn-sm flex items-center gap-1.5"
                onClick={handleExecuteImport}
                disabled={validationStats.valid === 0}
              >
                <span>Execute Import ({validationStats.valid} Valid Rows)</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="table-responsive mt-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Row #</th>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Validation Notes</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className={row.isValid ? '' : 'row-invalid'}>
                    <td>
                      {row.isValid ? (
                        <span className="badge badge-success badge-xs flex items-center gap-1">
                          <Check size={10} />
                          <span>VALID</span>
                        </span>
                      ) : (
                        <span className="badge badge-danger badge-xs flex items-center gap-1">
                          <AlertTriangle size={10} />
                          <span>ERROR</span>
                        </span>
                      )}
                    </td>
                    <td className="mono-text text-xs">{row.rowNumber || idx + 1}</td>
                    <td className="font-medium text-sm">{row.data?.name || '-'}</td>
                    <td className="mono-text text-xs">{row.data?.sku || '-'}</td>
                    <td className="font-semibold text-xs">₹{row.data?.price || '-'}</td>
                    <td className="text-xs">{row.data?.stockQuantity || '-'}</td>
                    <td>
                      {row.errors && row.errors.length > 0 ? (
                        <span className="text-danger text-xs">{row.errors.join('; ')}</span>
                      ) : (
                        <span className="text-success text-xs">Ready for catalog sync</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {previewData.length > 15 && (
            <p className="text-muted text-xs mt-2">
              Showing first 15 of {previewData.length} records.
            </p>
          )}

          <div className="modal-actions-right mt-4 flex items-center gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => setStep(2)}>
              Back to Mapping
            </button>
            <button
              className="btn btn-primary btn-sm flex items-center gap-1.5"
              onClick={handleExecuteImport}
              disabled={validationStats.valid === 0}
            >
              <span>Start Ingestion Pipeline</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Executing Pipeline */}
      {step === 4 && (
        <div className="card text-center py-8">
          <div className="spinner-large mx-auto mb-4"></div>
          <h3 className="font-bold text-lg">Executing Batch Data Ingestion</h3>
          <p className="text-muted max-w-md mx-auto mt-2 text-sm">
            Parsing structured records, verifying catalog constraints, updating database entities, and syncing to downstream operational repositories...
          </p>
        </div>
      )}

      {/* STEP 5: Final Summary Report */}
      {step === 5 && (
        <div className="card">
          <div className="success-banner text-center py-4">
            <div className="success-icon mb-2 flex justify-center text-primary">
              <Sparkles size={36} />
            </div>
            <h3 className="font-bold text-lg">Data Ingestion Pipeline Complete</h3>
            <p className="text-muted text-xs">Job ID: <span className="mono-text">{jobId || 'BATCH-RUN-1'}</span></p>
          </div>

          <div className="stats-grid my-4">
            <div className="stat-card border-left-emerald">
              <span className="stat-title">Processed Rows</span>
              <div className="stat-value">{jobReport?.totalRecords || validationStats.valid}</div>
            </div>
            <div className="stat-card border-left-emerald">
              <span className="stat-title">Successfully Synced</span>
              <div className="stat-value text-success">{jobReport?.successCount || validationStats.valid}</div>
            </div>
            <div className="stat-card border-left-amber">
              <span className="stat-title">Failed / Skipped</span>
              <div className="stat-value text-danger">{jobReport?.failureCount || validationStats.invalid}</div>
            </div>
          </div>

          <div className="modal-actions-right mt-4 flex items-center gap-2">
            <button className="btn btn-secondary btn-sm" onClick={handleReset}>
              Import Another File
            </button>
            <button className="btn btn-primary btn-sm flex items-center gap-1.5" onClick={() => navigate('/products')}>
              <span>View Updated Product Catalog</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
