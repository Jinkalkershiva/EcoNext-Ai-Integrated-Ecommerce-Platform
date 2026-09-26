import React, { useState, useEffect } from 'react';
import { inventoryOpsApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';

export const InventoryPage = () => {
  const { hasPermission, isAdmin } = useAuth();
  const canAdjust = isAdmin() || hasPermission('INVENTORY_ADJUST');

  const [products, setProducts] = useState([]);
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Stock Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    adjustmentType: 'RESTOCK',
    quantityChange: 10,
    reason: '',
    referenceNumber: ''
  });

  const loadInventory = async () => {
    setLoading(true);
    setError('');
    try {
      if (filterLowStockOnly) {
        const data = await inventoryOpsApi.getLowStock();
        setProducts(data || []);
      } else {
        const data = await inventoryOpsApi.getInventoryList();
        setProducts(data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [filterLowStockOnly]);

  const openAdjustModal = (product) => {
    setSelectedProduct(product);
    setAdjustForm({
      adjustmentType: 'RESTOCK',
      quantityChange: 10,
      reason: 'Warehouse shipment replenishment',
      referenceNumber: `PO-${Date.now().toString().slice(-6)}`
    });
    setShowAdjustModal(true);
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setError('');
    setSuccess('');
    try {
      const isNegative = ['DAMAGE', 'LOSS'].includes(adjustForm.adjustmentType);
      const finalDelta = isNegative
        ? -Math.abs(Number(adjustForm.quantityChange))
        : Math.abs(Number(adjustForm.quantityChange));

      await inventoryOpsApi.adjustStock({
        productId: selectedProduct.id,
        adjustmentType: adjustForm.adjustmentType,
        quantityChange: finalDelta,
        reason: adjustForm.reason,
        referenceNumber: adjustForm.referenceNumber
      });

      setSuccess(`Stock adjusted for ${selectedProduct.name} (Delta: ${finalDelta > 0 ? '+' : ''}${finalDelta})`);
      setShowAdjustModal(false);
      loadInventory();
    } catch (err) {
      setError(err.message || 'Failed to adjust stock');
    }
  };

  const columns = [
    {
      header: 'Product / SKU',
      key: 'name',
      render: (row) => (
        <div>
          <div className="font-semibold">{row.name}</div>
          <div className="mono-text text-muted text-xs">SKU: {row.sku}</div>
        </div>
      )
    },
    {
      header: 'Warehouse Stock',
      key: 'stockQuantity',
      render: (row) => {
        const isLow = row.stockQuantity <= (row.lowStockThreshold || 10);
        const isOut = row.stockQuantity <= 0;
        return (
          <div className="stock-level-cell">
            <span className={`stock-number ${isOut ? 'text-danger font-bold' : isLow ? 'text-warning font-bold' : 'text-success'}`}>
              {row.stockQuantity} units
            </span>
          </div>
        );
      }
    },
    {
      header: 'Safety Threshold',
      key: 'lowStockThreshold',
      render: (row) => <span className="text-muted">{row.lowStockThreshold || 10} units</span>
    },
    {
      header: 'Inventory Health',
      key: 'health',
      render: (row) => {
        if (row.stockQuantity <= 0) return <StatusBadge status="OUT_OF_STOCK" />;
        if (row.stockQuantity <= (row.lowStockThreshold || 10)) return <StatusBadge status="LOW_STOCK" />;
        return <StatusBadge status="HEALTHY" />;
      }
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <div className="action-buttons-group">
          {canAdjust && (
            <button className="btn btn-secondary btn-xs" onClick={() => openAdjustModal(row)}>
              ⚖️ Adjust Stock
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="inventory-page">
      {error && (
        <div className="alert alert-danger mb-4">
          <span>⚠️ {error}</span>
          <button className="btn-close" onClick={() => setError('')}>✕</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-4">
          <span>✅ {success}</span>
          <button className="btn-close" onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      <div className="inventory-filter-bar mb-4">
        <div className="btn-group">
          <button
            className={`btn btn-sm ${!filterLowStockOnly ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterLowStockOnly(false)}
          >
            All Inventory Items
          </button>
          <button
            className={`btn btn-sm ${filterLowStockOnly ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setFilterLowStockOnly(true)}
          >
            ⚠️ Low Stock Alerts Only
          </button>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={products}
          loading={loading}
          searchPlaceholder="Search inventory by product name or SKU..."
        />
      </div>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title={`Adjust Stock: ${selectedProduct?.name}`}
      >
        <form onSubmit={handleAdjustStock}>
          <div className="current-stock-info mb-3">
            <span>Current Stock Level: </span>
            <strong>{selectedProduct?.stockQuantity} units</strong> (SKU: {selectedProduct?.sku})
          </div>

          <div className="form-group">
            <label className="form-label">Adjustment Type *</label>
            <select
              className="input"
              value={adjustForm.adjustmentType}
              onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentType: e.target.value })}
            >
              <option value="RESTOCK">RESTOCK (+ Add inventory)</option>
              <option value="DAMAGE">DAMAGE (- Damaged in warehouse)</option>
              <option value="AUDIT_CORRECTION">AUDIT CORRECTION (+/- Count reconciliation)</option>
              <option value="RETURN_RESTOCK">RETURN RESTOCK (+ Restock returned item)</option>
              <option value="LOSS">LOSS (- Missing / shrinkage)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity Units *</label>
            <input
              type="number"
              className="input"
              required
              min="1"
              value={adjustForm.quantityChange}
              onChange={(e) => setAdjustForm({ ...adjustForm, quantityChange: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reference PO / Receipt ID</label>
            <input
              type="text"
              className="input"
              value={adjustForm.referenceNumber}
              onChange={(e) => setAdjustForm({ ...adjustForm, referenceNumber: e.target.value })}
              placeholder="e.g. PO-892144 or INV-RET-12"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Audit Reason / Justification *</label>
            <textarea
              className="input"
              rows="2"
              required
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              placeholder="Explain why stock is being modified..."
            />
          </div>

          <div className="modal-actions-right mt-4">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Record Stock Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
