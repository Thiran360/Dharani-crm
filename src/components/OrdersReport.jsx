import React, { useState, useEffect } from 'react';
import { FiBarChart2 } from 'react-icons/fi';
import './OrdersReport.css';
import { API_BASE, API_HEADERS } from '../config/api';

const OrdersReport = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState(null);
  const [filteredCategories, setFilteredCategories] = useState(null);
  const [filteredBrands, setFilteredBrands] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE}/orders/?_t=${Date.now()}`, {
          headers: API_HEADERS
        });
        const data = await response.json();

        if (data.status === 'success' && Array.isArray(data.data)) {
          const formatted = data.data.map(order => {
            const rawDate = order.created_at || '';
            const dateOnly = rawDate ? rawDate.split('T')[0].split(' ')[0] : '';
            return {
              id: order.order_id || order.id,
              orderId: order.order_no || `ORD-${order.order_id || order.id}`,
              customer: order.customer || (order.address && order.address.full_name) || 'N/A',
              phone: order.mobile || (order.address && order.address.phone) || 'N/A',
              date: dateOnly,
              rawAmount: parseFloat(order.total_amount || order.total || 0),
              status: order.status || 'Pending',
              items: order.items || []
            };
          });
          setAllOrders(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const [activeTab, setActiveTab] = useState('date');
  const [summary, setSummary] = useState({ totalOrders: 0, totalAmount: 0 });

  const aggregateOrders = (ordersList, startDate, endDate) => {
    const groupedByDate = {};
    const groupedByCategory = {};
    const groupedByBrand = {};
    let tOrders = 0;
    let tAmount = 0;

    ordersList.forEach(order => {
      if (!order.date) return;
      const orderDate = new Date(order.date);

      if (startDate && endDate) {
        if (orderDate < startDate || orderDate > endDate) return;
      }

      // Date Grouping
      const dateParts = order.date.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : order.date;

      if (!groupedByDate[order.date]) {
        groupedByDate[order.date] = {
          rawDate: order.date,
          displayDate: formattedDate,
          ordersCount: 0,
          amount: 0,
          customersMap: {}
        };
      }

      groupedByDate[order.date].ordersCount += 1;
      groupedByDate[order.date].amount += order.rawAmount;

      const customerString = `${order.customer} (${order.phone})`;
      groupedByDate[order.date].customersMap[customerString] = true;

      tOrders += 1;
      tAmount += order.rawAmount;

      // Category Grouping
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          let cat = 'Uncategorized';
          if (item.product_image) {
            const match = item.product_image.match(/\/images\/([^\/]+)\//);
            if (match && match[1]) {
              cat = decodeURIComponent(match[1]);
            }
          } else if (item.category) {
            cat = item.category;
          }

          if (!groupedByCategory[cat]) {
            groupedByCategory[cat] = {
              category: cat,
              ordersCount: 0,
              amount: 0,
              orderIds: new Set()
            };
          }

          const itemTotal = parseFloat(item.price || 0) * parseInt(item.quantity || 1);
          groupedByCategory[cat].amount += itemTotal;

          if (!groupedByCategory[cat].orderIds.has(order.id)) {
            groupedByCategory[cat].ordersCount += 1;
            groupedByCategory[cat].orderIds.add(order.id);
          }

          let brand = item.brand_name || item.brand || 'Unbranded';
          if (!groupedByBrand[brand]) {
            groupedByBrand[brand] = {
              brand: brand,
              ordersCount: 0,
              amount: 0,
              orderIds: new Set()
            };
          }
          groupedByBrand[brand].amount += itemTotal;
          if (!groupedByBrand[brand].orderIds.has(order.id)) {
            groupedByBrand[brand].ordersCount += 1;
            groupedByBrand[brand].orderIds.add(order.id);
          }
        });
      }
    });

    const aggregatedList = Object.values(groupedByDate).sort((a, b) => {
      return new Date(b.rawDate) - new Date(a.rawDate);
    });

    const aggregatedCategories = Object.values(groupedByCategory).sort((a, b) => {
      return b.amount - a.amount;
    });

    const aggregatedBrands = Object.values(groupedByBrand).sort((a, b) => {
      return b.amount - a.amount;
    });

    setFilteredOrders(aggregatedList);
    setFilteredCategories(aggregatedCategories);
    setFilteredBrands(aggregatedBrands);
    setSummary({ totalOrders: tOrders, totalAmount: tAmount });
  };

  const handleGenerate = () => {
    if (!fromDate || !toDate) {
      alert("Please select both From Date and To Date to generate the report.");
      return;
    }

    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    aggregateOrders(allOrders, start, end);
  };

  return (
    <div className="orders-report-wrapper">
      <div className="orders-report-page-header">
        <h1>Orders Report</h1>
      </div>

      <div className="orders-report-card">

        <div className="orders-report-form">
          <div className="form-group">
            <label>From Date</label>
            <div className="input-container">
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>To Date</label>
            <div className="input-container">
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>

          <div className="form-group button-group">
            <button className="generate-btn" onClick={handleGenerate}>
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {filteredOrders && (
        <div className="orders-report-aggregated-section">

          <div className="aggregated-summary-cards">
            <div className="agg-card agg-green">
              <span className="agg-label">Total Orders</span>
              <span className="agg-value">{summary.totalOrders}</span>
            </div>
            <div className="agg-card agg-green">
              <span className="agg-label">Total Amount</span>
              <span className="agg-value">₹{summary.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="aggregated-tabs">
            <div
              className={`agg-tab ${activeTab === 'date' ? 'active' : ''}`}
              onClick={() => setActiveTab('date')}
            >
              <FiBarChart2 /> Date Wise
            </div>
            <div
              className={`agg-tab ${activeTab === 'category' ? 'active' : ''}`}
              onClick={() => setActiveTab('category')}
            >
              Category Wise
            </div>
            <div
              className={`agg-tab ${activeTab === 'brand' ? 'active' : ''}`}
              onClick={() => setActiveTab('brand')}
            >
              Brand Wise
            </div>
          </div>

          {filteredOrders.length > 0 ? (
            <div className="orders-table-container">
              {activeTab === 'date' && (
                <table className="orders-report-table custom-agg-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Date</th>
                      <th>Orders</th>
                      <th>Amount</th>
                      <th>Customers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((row, index) => (
                      <tr key={index}>
                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ fontWeight: 600, textAlign: 'center' }}>{row.displayDate}</td>
                        <td style={{ textAlign: 'center' }}>{row.ordersCount}</td>
                        <td style={{ fontWeight: 600, textAlign: 'center' }}>₹{row.amount.toLocaleString('en-IN')}</td>
                        <td style={{ fontSize: '0.85rem', color: '#000000' }}>
                          {Object.keys(row.customersMap).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'category' && filteredCategories && (
                <table className="orders-report-table custom-agg-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Category</th>
                      <th>Orders</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((row, index) => (
                      <tr key={index}>
                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ fontWeight: 600, textAlign: 'center' }}>{row.category}</td>
                        <td style={{ textAlign: 'center' }}>{row.ordersCount}</td>
                        <td style={{ fontWeight: 600, textAlign: 'center' }}>₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    {filteredCategories.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No category data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'brand' && filteredBrands && (
                <table className="orders-report-table custom-agg-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Brand</th>
                      <th>Orders</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBrands.map((row, index) => (
                      <tr key={index}>
                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ fontWeight: 600, textAlign: 'center' }}>{row.brand}</td>
                        <td style={{ textAlign: 'center' }}>{row.ordersCount}</td>
                        <td style={{ fontWeight: 600, textAlign: 'center' }}>₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    {filteredBrands.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No brand data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="no-results">
              No orders found in this date range.
            </div>
          )}
        </div>
      )}

      <div className="orders-report-footer">
        © 2026, Developed by ThinkAside
      </div>
    </div>
  );
};

export default OrdersReport;
