import React, { useState, useEffect } from 'react';
import { FiEye, FiArrowLeft, FiFileText, FiUser, FiClock, FiCreditCard, FiCheckCircle, FiBox } from 'react-icons/fi';
import './TransactionManager.css';
import { API_BASE, API_HEADERS } from '../config/api';

const BASE = API_BASE;
const HDR = API_HEADERS;

export default function TransactionManager() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      // Since there isn't a dedicated fully working /transactions/ endpoint returning payment IDs yet,
      // we'll fetch from /orders/ and map it to match the requested design.
      const res = await fetch(`${BASE}/orders/`, { headers: HDR });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { return; }

      let items = Array.isArray(data) ? data : data.results || data.orders || Object.values(data).find(Array.isArray) || [];

      // Map orders to transaction-like format as requested by the user
      const mapped = items.map(order => {
        const qty = order.items?.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0) || 0;

        // Mock payment/order IDs if backend doesn't provide them yet
        const isCompleted = order.status?.toLowerCase() !== 'pending';
        const displayStatus = isCompleted ? 'Completed' : 'Pending';

        const mockPaymentId = order.payment_id || '-';
        const mockRazorpayOrderId = order.razorpay_order_id || order.order_id ? `order_DH${order.order_id}` : '-';

        return {
          id: order.order_id,
          orderNumber: order.order_no || `DH-ECOM-${order.order_id + 1600}`,
          customerName: order.customer || 'Unknown',
          paymentId: order.payment_id || mockPaymentId,
          razorpayOrderId: order.razorpay_order_id || mockRazorpayOrderId,
          amount: parseFloat(order.total_amount || 0).toFixed(2),
          qty: qty,
          status: displayStatus,
          date: order.created_at,
          originalOrder: order // Keep original to show items in detail view
        };
      });

      setTransactions(mapped);
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const time = date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return (
      <>
        {day}-{month}-{year}<br />
        {time}
      </>
    );
  };

  const openDetail = (txn) => {
    setSelectedTxn(txn);
    setViewMode('detail');
  };

  const closeDetail = () => {
    setViewMode('list');
    setSelectedTxn(null);
  };

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const currentTransactions = transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    // Simple pagination: show max 5 buttons
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`txn-page-btn ${currentPage === i ? 'active' : ''}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="txn-pagination">
        <button className="txn-page-btn" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>|&lt;</button>
        <button className="txn-page-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>&lt;</button>

        {startPage > 1 && <span className="txn-page-dots">...</span>}
        {pages}
        {endPage < totalPages && <span className="txn-page-dots">...</span>}

        <button className="txn-page-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>&gt;</button>
        <button className="txn-page-btn" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}>&gt;|</button>
      </div>
    );
  };

  return (
    <div className="transaction-manager">
      {viewMode === 'list' ? (
        <>
          <div className="transaction-table-container">
            {isLoading ? (
              <div className="transaction-loading">Loading transactions...</div>
            ) : (
              <div className="table-responsive">
                <table className="transaction-table">
                  <thead>
                    <tr>
                      <th>Order Number</th>
                      <th>Customer Name</th>
                      <th>Payment ID</th>
                      <th>Order ID</th>
                      <th>Amount</th>
                      <th>Qty</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ padding: '40px', color: '#000000' }}>No transactions found.</td>
                      </tr>
                    ) : (
                      currentTransactions.map((txn, idx) => (
                        <tr key={idx}>
                          <td>{txn.orderNumber}</td>
                          <td style={{ textTransform: 'capitalize' }}>{txn.customerName}</td>
                          <td>{txn.paymentId}</td>
                          <td>{txn.razorpayOrderId}</td>
                          <td>₹{txn.amount}</td>
                          <td>{txn.qty}</td>
                          <td>
                            <span className={`txn-badge txn-badge-${txn.status.toLowerCase()}`}>
                              {txn.status}
                            </span>
                          </td>
                          <td style={{ lineHeight: '1.4' }}>{formatDate(txn.date)}</td>
                          <td>
                            <button className="txn-view-btn" title="View details" onClick={() => openDetail(txn)}>
                              <FiEye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!isLoading && renderPagination()}
          </div>
        </>
      ) : (
        <div className="txn-detail-wrapper">
          <div className="txn-detail-header">
            <button className="txn-back-btn" onClick={closeDetail}>
              <FiArrowLeft size={18} /> Back to Transactions
            </button>
            <div className="txn-detail-title-bar">
              <h2>Transaction Details</h2>
              <span className={`txn-badge txn-badge-${selectedTxn.status.toLowerCase()}`}>
                {selectedTxn.status}
              </span>
            </div>
          </div>

          <div className="txn-detail-content">
            <div className="txn-detail-card">
              <div className="txn-card-header">
                <FiFileText className="txn-card-icon" /> General Information
              </div>
              <div className="txn-info-grid">
                <div className="txn-info-item">
                  <span className="txn-info-label">Order Number</span>
                  <span className="txn-info-value">{selectedTxn.orderNumber}</span>
                </div>
                <div className="txn-info-item">
                  <span className="txn-info-label">Order ID</span>
                  <span className="txn-info-value">{selectedTxn.razorpayOrderId}</span>
                </div>
                <div className="txn-info-item">
                  <span className="txn-info-label">Payment ID</span>
                  <span className="txn-info-value">{selectedTxn.paymentId}</span>
                </div>
                <div className="txn-info-item">
                  <span className="txn-info-label">Total Amount</span>
                  <span className="txn-info-value txn-amount-large">₹{selectedTxn.amount}</span>
                </div>
              </div>
            </div>

            <div className="txn-detail-card">
              <div className="txn-card-header">
                <FiUser className="txn-card-icon" /> Customer & Timing
              </div>
              <div className="txn-info-grid">
                <div className="txn-info-item">
                  <span className="txn-info-label">Customer Name</span>
                  <span className="txn-info-value" style={{ textTransform: 'capitalize' }}>{selectedTxn.customerName}</span>
                </div>
                {selectedTxn.originalOrder?.mobile && (
                  <div className="txn-info-item">
                    <span className="txn-info-label">Phone / Mobile</span>
                    <span className="txn-info-value">{selectedTxn.originalOrder.mobile}</span>
                  </div>
                )}
                {selectedTxn.originalOrder?.shipping_address && (
                  <div className="txn-info-item">
                    <span className="txn-info-label">Shipping Address</span>
                    <span className="txn-info-value">{selectedTxn.originalOrder.shipping_address}</span>
                  </div>
                )}
                {selectedTxn.originalOrder?.tracking_number && (
                  <div className="txn-info-item">
                    <span className="txn-info-label">Tracking Number</span>
                    <span className="txn-info-value">{selectedTxn.originalOrder.tracking_number}</span>
                  </div>
                )}
                <div className="txn-info-item">
                  <span className="txn-info-label">Transaction Date</span>
                  <span className="txn-info-value">{selectedTxn.date ? new Date(selectedTxn.date).toLocaleString('en-IN') : '—'}</span>
                </div>
              </div>
            </div>

            {selectedTxn.originalOrder?.items && selectedTxn.originalOrder.items.length > 0 && (
              <div className="txn-detail-card" style={{ gridColumn: '1 / -1' }}>
                <div className="txn-card-header">
                  <FiBox className="txn-card-icon" /> Order Items ({selectedTxn.qty} units)
                </div>
                <div className="table-responsive">
                  <table className="txn-items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Price</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTxn.originalOrder.items.map((item, i) => (
                        <tr key={i}>
                          <td>{item.product}</td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>₹{parseFloat(item.price || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            ₹{(parseFloat(item.price || 0) * (parseInt(item.quantity) || 1)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
