import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiPackage, FiCalendar, FiBarChart2, FiRefreshCw, FiChevronDown } from 'react-icons/fi';
import './ProductSalesReport.css';
import { API_BASE, API_HEADERS } from '../config/api';

const BASE_URL = API_BASE;
const HEADERS = API_HEADERS;

// ── helpers ────────────────────────────────────────────────────────────────────
function getWeekLabel(dateStr) {
  const d = new Date(dateStr);
  // ISO week – Monday-based
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `W${weekNo} ${d.getFullYear()}`;
}

function getMonthLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('default', { month: 'short', year: 'numeric' });
}

function buildProductSales(orders, groupFn) {
  // Map: period → { product → { qty, revenue } }
  const periodMap = {};
  orders.forEach(order => {
    const period = groupFn(order.created_at);
    if (!periodMap[period]) periodMap[period] = {};
    (order.items || []).forEach(item => {
      const name = item.product || 'Unknown Product';
      if (!periodMap[period][name]) periodMap[period][name] = { qty: 0, revenue: 0 };
      periodMap[period][name].qty += Number(item.quantity || 0);
      const itemPrice = Number(item.price || item.rate || 0);
      const itemTotal = Number(item.total || item.amount || (itemPrice * Number(item.quantity || 0)));
      periodMap[period][name].revenue += itemTotal;
    });
  });
  return periodMap;
}

// Flatten periodMap into sorted array per period
function flattenForTable(periodMap) {
  return Object.entries(periodMap)
    .sort(([a], [b]) => {
      // sort periods descending by first order date (approximate)
      return b.localeCompare(a);
    })
    .map(([period, products]) => ({
      period,
      products: Object.entries(products)
        .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
    }));
}

// For the bar chart: top 6 products overall in the selected period
function topProductsForPeriod(periodData) {
  const merged = {};
  Object.values(periodData).forEach(products => {
    Object.entries(products).forEach(([name, d]) => {
      if (!merged[name]) merged[name] = { qty: 0, revenue: 0 };
      merged[name].qty += d.qty;
      merged[name].revenue += d.revenue;
    });
  });
  return Object.entries(merged)
    .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);
}

const COLORS = ['#B3C58A', '#B3C58A', '#B3C58A', '#B3C58A', '#4A5240', '#B3C58A', '#F5F7EC', '#8A927E'];

export default function ProductSalesReport() {
  const [view, setView] = useState('monthly'); // 'monthly' | 'weekly'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPeriod, setExpandedPeriod] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/orders/`, { headers: HEADERS });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = []; }
      let items = [];
      if (Array.isArray(data)) items = data;
      else if (data && typeof data === 'object')
        items = data.results || data.orders || Object.values(data).find(Array.isArray) || [];
      setOrders(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const groupFn = view === 'monthly' ? getMonthLabel : getWeekLabel;
  const periodMap = buildProductSales(orders, groupFn);
  const tableData = flattenForTable(periodMap);
  const topProducts = topProductsForPeriod(periodMap);
  const maxRevenue = topProducts.length ? topProducts[0].revenue : 1;

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || o.grand_total || o.total || 0), 0);
  const totalQty = Object.values(periodMap).reduce((sum, prods) =>
    sum + Object.values(prods).reduce((s, p) => s + p.qty, 0), 0);
  const uniqueProducts = topProducts.length;

  return (
    <div className="psr-container">
      {/* ── Header ── */}
      <div className="psr-header" style={{ justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <div className="psr-controls">
          <div className="psr-view-toggle">
            <button
              className={`psr-toggle-btn ${view === 'weekly' ? 'active' : ''}`}
              onClick={() => { setView('weekly'); setExpandedPeriod(null); }}
            >
              <FiCalendar /> Weekly
            </button>
            <button
              className={`psr-toggle-btn ${view === 'monthly' ? 'active' : ''}`}
              onClick={() => { setView('monthly'); setExpandedPeriod(null); }}
            >
              <FiCalendar /> Monthly
            </button>
          </div>
          <button className="psr-refresh-btn" onClick={fetchOrders} title="Refresh">
            <FiRefreshCw className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="psr-kpi-row">
        <div className="psr-kpi-card">
          <span className="psr-kpi-label">Total Revenue</span>
          <span className="psr-kpi-value">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="psr-kpi-sub">All time</span>
        </div>
        <div className="psr-kpi-card">
          <span className="psr-kpi-label">Total Units Sold</span>
          <span className="psr-kpi-value">{totalQty.toLocaleString('en-IN')}</span>
          <span className="psr-kpi-sub">Across all products</span>
        </div>
        <div className="psr-kpi-card">
          <span className="psr-kpi-label">Total Orders</span>
          <span className="psr-kpi-value">{orders.length.toLocaleString('en-IN')}</span>
          <span className="psr-kpi-sub">Processed</span>
        </div>
        <div className="psr-kpi-card">
          <span className="psr-kpi-label">Products Tracked</span>
          <span className="psr-kpi-value">{uniqueProducts}</span>
          <span className="psr-kpi-sub">Unique SKUs</span>
        </div>
      </div>

      {loading ? (
        <div className="psr-loading">
          <div className="psr-spinner" />
          <p>Loading sales data…</p>
        </div>
      ) : (
        <>
          {/* ── Top Products Bar Chart ── */}
          <div className="psr-panel">
            <div className="psr-panel-head">
              <div className="psr-panel-title">
                <FiTrendingUp />
                Top Products by Revenue
              </div>
              <span className="psr-panel-badge">{view === 'monthly' ? 'All Months' : 'All Weeks'}</span>
            </div>
            <div className="psr-chart-area">
              {topProducts.length === 0 ? (
                <div className="psr-empty">No sales data found.</div>
              ) : (
                topProducts.map((p, i) => (
                  <div className="psr-bar-row" key={i}>
                    <div className="psr-bar-label" title={p.name}>
                      <span className="psr-color-dot" style={{ background: COLORS[i % COLORS.length] }} />
                      {p.name.length > 28 ? p.name.substring(0, 28) + '…' : p.name}
                    </div>
                    <div className="psr-bar-track">
                      <div
                        className="psr-bar-fill"
                        style={{
                          width: `${(p.revenue / maxRevenue) * 100}%`,
                          background: COLORS[i % COLORS.length]
                        }}
                      />
                    </div>
                    <div className="psr-bar-stats">
                      <span className="psr-bar-revenue">₹{p.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="psr-bar-qty">{p.qty} units</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Period Table ── */}
          <div className="psr-panel">
            <div className="psr-panel-head">
              <div className="psr-panel-title">
                <FiPackage />
                {view === 'monthly' ? 'Month-wise' : 'Week-wise'} Product Breakdown
              </div>
              <span className="psr-panel-badge">{tableData.length} period{tableData.length !== 1 ? 's' : ''}</span>
            </div>

            {tableData.length === 0 ? (
              <div className="psr-empty" style={{ padding: '3rem' }}>No sales data available yet.</div>
            ) : (
              <div className="psr-accordion">
                {tableData.map(({ period, products }) => {
                  const isOpen = expandedPeriod === period;
                  const periodTotal = products.reduce((s, p) => s + p.revenue, 0);
                  const periodQty = products.reduce((s, p) => s + p.qty, 0);
                  return (
                    <div key={period} className={`psr-accordion-item ${isOpen ? 'open' : ''}`}>
                      <div
                        className="psr-accordion-header"
                        onClick={() => setExpandedPeriod(isOpen ? null : period)}
                      >
                        <div className="psr-acc-left">
                          <span className="psr-period-badge">{period}</span>
                          <span className="psr-prod-count">{products.length} product{products.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="psr-acc-right">
                          <span className="psr-acc-qty">{periodQty} units</span>
                          <span className="psr-acc-revenue">₹{periodTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <FiChevronDown className={`psr-chevron ${isOpen ? 'rotated' : ''}`} />
                        </div>
                      </div>
                      {isOpen && (
                        <div className="psr-accordion-body">
                          <div className="table-responsive">
                            <table className="psr-table">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Product</th>
                                  <th>Units Sold</th>
                                  <th>Revenue</th>
                                  <th>Share</th>
                                </tr>
                              </thead>
                              <tbody>
                                {products.map((p, idx) => (
                                  <tr key={idx}>
                                    <td className="psr-td-rank">{idx + 1}</td>
                                    <td className="psr-td-name">
                                      <span className="psr-prod-dot" style={{ background: COLORS[idx % COLORS.length] }} />
                                      {p.name}
                                    </td>
                                    <td className="psr-td-qty">{p.qty}</td>
                                    <td className="psr-td-revenue">₹{p.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="psr-td-share">
                                      <div className="psr-mini-bar-wrap">
                                        <div
                                          className="psr-mini-bar"
                                          style={{
                                            width: `${periodTotal ? (p.revenue / periodTotal) * 100 : 0}%`,
                                            background: COLORS[idx % COLORS.length]
                                          }}
                                        />
                                        <span>{periodTotal ? ((p.revenue / periodTotal) * 100).toFixed(1) : 0}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
