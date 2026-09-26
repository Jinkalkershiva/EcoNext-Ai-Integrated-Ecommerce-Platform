import React, { useState, useEffect } from 'react';
import { orderOpsApi } from '../api/operationsApis';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';

// 10-stage transition map for allowed forward and cancel actions
const ALLOWED_NEXT_STATUSES = {
  ORDER_PLACED: ['ORDER_CONFIRMED', 'CANCELLED'],
  ORDER_CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: []
};

const ORDER_LIFECYCLE_STEPS = [
  'ORDER_PLACED',
  'ORDER_CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
];

export const OrdersPage = () => {
  const { hasPermission, isAdmin } = useAuth();
  const canUpdate = isAdmin() || hasPermission('ORDER_STATUS_UPDATE');

  const [orders, setOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Transition / Details Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [transitionForm, setTransitionForm] = useState({
    newStatus: '',
    reasonNote: '',
    trackingNumber: '',
    carrierName: 'EcoExpress Carbon-Neutral'
  });

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await orderOpsApi.getOrders({
        page: 0,
        size: 100,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus
      });
      setOrders(data.content || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [selectedStatus]);

  const openOrderDetails = async (order) => {
    setError('');
    try {
      const fullOrder = await orderOpsApi.getOrderById(order.id);
      setSelectedOrder(fullOrder);
      const allowed = ALLOWED_NEXT_STATUSES[fullOrder.currentStatus] || [];
      setTransitionForm({
        newStatus: allowed.length > 0 ? allowed[0] : '',
        reasonNote: '',
        trackingNumber: fullOrder.trackingNumber || '',
        carrierName: fullOrder.carrierName || 'EcoExpress Carbon-Neutral'
      });
      setShowOrderModal(true);
    } catch (err) {
      setError(err.message || 'Failed to load order details');
    }
  };

  const handleStatusTransition = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !transitionForm.newStatus) return;
    setError('');
    setSuccess('');
    try {
      const updated = await orderOpsApi.updateOrderStatus(selectedOrder.id, transitionForm);
      setSuccess(`Order #${selectedOrder.orderReferenceNumber || selectedOrder.id} transitioned to ${transitionForm.newStatus}`);
      setSelectedOrder(updated);
      loadOrders();
    } catch (err) {
      setError(err.message || 'Failed to update order status');
    }
  };

  const columns = [
    {
      header: 'Order Reference',
      key: 'orderReferenceNumber',
      render: (row) => (
        <div>
          <span className="font-bold mono-text">#{row.orderReferenceNumber || row.id}</span>
          <div className="text-xs text-muted">{new Date(row.createdAt).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      header: 'Customer',
      key: 'customerName',
      render: (row) => (
        <div>
          <div className="font-medium">{row.customerName || row.customerUsername}</div>
          <div className="text-xs text-muted">{row.customerEmail}</div>
        </div>
      )
    },
    {
      header: 'Items',
      key: 'items',
      render: (row) => <span>{row.items?.length || 0} item(s)</span>
    },
    {
      header: 'Total Amount',
      key: 'totalAmount',
      render: (row) => <span className="font-semibold">₹{Number(row.totalAmount).toFixed(2)}</span>
    },
    {
      header: 'Destination',
      key: 'city',
      render: (row) => <span>{row.city || 'Standard'}, {row.state || 'IN'}</span>
    },
    {
      header: 'Status',
      key: 'currentStatus',
      render: (row) => <StatusBadge status={row.currentStatus} />
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <button className="btn btn-secondary btn-xs" onClick={() => openOrderDetails(row)}>
          Inspect & Fulfill
        </button>
      )
    }
  ];

  const allowedNext = selectedOrder ? (ALLOWED_NEXT_STATUSES[selectedOrder.currentStatus] || []) : [];

  return (
    <div className="orders-page">
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

      {/* Filter Tabs */}
      <div className="order-filter-bar mb-4">
        <select
          className="input select-status-filter"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="ALL">All Order States</option>
          <option value="ORDER_PLACED">ORDER_PLACED</option>
          <option value="ORDER_CONFIRMED">ORDER_CONFIRMED</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="PACKED">PACKED</option>
          <option value="SHIPPED">SHIPPED</option>
          <option value="IN_TRANSIT">IN_TRANSIT</option>
          <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="RETURNED">RETURNED</option>
        </select>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          searchPlaceholder="Search orders by customer or reference..."
        />
      </div>

      {/* Order Details & Lifecycle Modal */}
      <Modal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title={`Order Fulfillment: #${selectedOrder?.orderReferenceNumber || selectedOrder?.id}`}
        maxWidth="800px"
      >
        {selectedOrder && (
          <div className="order-details-wrapper">
            {/* Status Stepper */}
            <div className="stepper-bar mb-4">
              {ORDER_LIFECYCLE_STEPS.map((step, idx) => {
                const currentIdx = ORDER_LIFECYCLE_STEPS.indexOf(selectedOrder.currentStatus);
                const isPassed = currentIdx >= idx;
                const isCurrent = selectedOrder.currentStatus === step;

                return (
                  <div key={step} className={`step-node ${isPassed ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                    <div className="step-circle">{idx + 1}</div>
                    <div className="step-label">{step.replace(/_/g, ' ')}</div>
                  </div>
                );
              })}
            </div>

            {/* Customer & Address Overview */}
            <div className="grid-2col mb-4">
              <div className="info-block">
                <h5>Customer Details</h5>
                <p><strong>{selectedOrder.customerName}</strong></p>
                <p className="text-muted">{selectedOrder.customerEmail}</p>
                <p className="text-muted">{selectedOrder.customerPhone || 'Phone not provided'}</p>
              </div>
              <div className="info-block">
                <h5>Shipping Address</h5>
                <p>{selectedOrder.shippingAddress}</p>
                <p>{selectedOrder.city}, {selectedOrder.state} - {selectedOrder.zipcode}</p>
                <p>{selectedOrder.country}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-4">
              <h5>Order Items</h5>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((it) => (
                      <tr key={it.id}>
                        <td>{it.productName}</td>
                        <td>{it.quantity}</td>
                        <td>₹{it.priceAtPurchase}</td>
                        <td className="font-semibold">₹{it.subtotal}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan="3" className="text-right font-bold">Total Order Value:</td>
                      <td className="font-bold text-success">₹{selectedOrder.totalAmount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* State Machine Transition Controls */}
            {canUpdate && allowedNext.length > 0 && (
              <form onSubmit={handleStatusTransition} className="transition-form-box">
                <h5 className="mb-3">Execute State Transition</h5>
                <div className="grid-2col">
                  <div className="form-group">
                    <label className="form-label">Next Permitted Status *</label>
                    <select
                      className="input"
                      value={transitionForm.newStatus}
                      onChange={(e) => setTransitionForm({ ...transitionForm, newStatus: e.target.value })}
                      required
                    >
                      {allowedNext.map((st) => (
                        <option key={st} value={st}>
                          {st.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Carrier Partner</label>
                    <input
                      type="text"
                      className="input"
                      value={transitionForm.carrierName}
                      onChange={(e) => setTransitionForm({ ...transitionForm, carrierName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2col">
                  <div className="form-group">
                    <label className="form-label">Tracking / AWB Number</label>
                    <input
                      type="text"
                      className="input mono-text"
                      value={transitionForm.trackingNumber}
                      onChange={(e) => setTransitionForm({ ...transitionForm, trackingNumber: e.target.value })}
                      placeholder="e.g. ECO-AWB-981249"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fulfillment Operational Note</label>
                    <input
                      type="text"
                      className="input"
                      value={transitionForm.reasonNote}
                      onChange={(e) => setTransitionForm({ ...transitionForm, reasonNote: e.target.value })}
                      placeholder="e.g. Package inspected & dispatched from Hub 4"
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-sm mt-2">
                  Confirm Status Change & Sync
                </button>
              </form>
            )}

            {/* Historical State Transition Timeline */}
            <div className="timeline-section mt-4">
              <h5>Audit Timeline & Stage History</h5>
              <div className="timeline-list">
                {selectedOrder.timeline?.length === 0 ? (
                  <p className="text-muted text-xs">No stage history recorded yet.</p>
                ) : (
                  selectedOrder.timeline?.map((t, idx) => (
                    <div key={idx} className="timeline-entry">
                      <div className="timeline-bullet"></div>
                      <div className="timeline-content">
                        <span className="font-semibold">{t.fromStatus} → {t.toStatus}</span>
                        <span className="timeline-staff"> by {t.changedByUsername || 'Staff'}</span>
                        <span className="timeline-date">{new Date(t.timestamp).toLocaleString()}</span>
                        {t.reasonNote && <p className="timeline-note text-muted text-xs">{t.reasonNote}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
