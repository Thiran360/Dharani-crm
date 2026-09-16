import React, { useState, useEffect } from 'react';
import { FiUsers, FiDollarSign, FiBox, FiShoppingBag, FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
import './DashboardOverview.css';
import { API_BASE, API_HEADERS } from '../config/api';

export default function DashboardOverview() {
  const [period, setPeriod] = useState('This Week');
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [reports, setReports] = useState({
    sales: { total_sales: '0.00', today_sales: '0.00' },
    orders: { total_orders: 0, breakdown: {} },
    customers: { total_customers: 0, top_customers: [] },
    products: { total_products: 0 },
    chartData: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllReports(true);
    const interval = setInterval(() => fetchAllReports(false), 15000);
    return () => clearInterval(interval);
  }, [period]);

  const fetchAllReports = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    const headers = API_HEADERS;
    const ts = Date.now();

    try {
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        fetch(`${API_BASE}/orders/?_t=${ts}`, { headers }).catch(() => null),
        fetch(`${API_BASE}/customers/?_t=${ts}`, { headers }).catch(() => null),
        fetch(`${API_BASE}/store/products/?_t=${ts}`, { headers }).catch(() => null),
      ]);

      const allOrders = ordersRes && ordersRes.ok ? await ordersRes.json() : [];
      const allCustomers = customersRes && customersRes.ok ? await customersRes.json() : [];
      let allProducts = [];
      if (productsRes && productsRes.ok) {
        const pData = await productsRes.json();
        allProducts = Array.isArray(pData) ? pData : (pData.data || pData.results || []);
      }

      const ordersArr = Array.isArray(allOrders) ? allOrders : (allOrders.data || allOrders.results || allOrders.orders || []);
      const customersArr = Array.isArray(allCustomers) ? allCustomers : (allCustomers.data || allCustomers.results || allCustomers.customers || []);

      const now = new Date();
      let startDate = new Date(0);
      let chartData = [];

      if (period === 'Today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'This Week') {
        const firstDay = now.getDate() - now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), firstDay);
      } else if (period === 'This Month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const filteredOrders = ordersArr.filter(o => {
        const d = new Date(o.created_at || o.date);
        return d >= startDate;
      });

      const total_sales = filteredOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || o.total || 0), 0);

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const today_sales = ordersArr.filter(o => new Date(o.created_at || o.date) >= todayStart)
        .reduce((sum, o) => sum + parseFloat(o.total_amount || o.total || 0), 0);

      const pending = filteredOrders.filter(o => o.status === 'pending').length;
      const shipped = filteredOrders.filter(o => o.status === 'shipped').length;

      const customerTotals = {};
      const customerIdMap = new Map();
      const customerNameMap = new Map();
      const customerMobileMap = new Map();

      customersArr.forEach(c => {
        const cNameRaw = c.name || c.full_name || c.username || 'Unknown';
        const cName = String(cNameRaw).toLowerCase().trim();
        const cMobile = String(c.mobile || c.phone || '').replace(/\s/g, '');

        customerTotals[c.id] = { name: cNameRaw, total: 0 };

        if (c.id) customerIdMap.set(String(c.id), c.id);
        if (cName && cName !== 'unknown') customerNameMap.set(cName, c.id);
        if (cMobile) customerMobileMap.set(cMobile, c.id);
      });

      filteredOrders.forEach(o => {
        let matchedId = o.customer_id;
        if (!matchedId || !customerTotals[matchedId]) {
          const oName = String(typeof o.customer === 'object' ? (o.customer.name || o.customer.full_name) : o.customer || '').toLowerCase().trim();
          const oMobile = String(o.mobile || '').replace(/\s/g, '');

          if (o.customer_id && customerIdMap.has(String(o.customer_id))) matchedId = customerIdMap.get(String(o.customer_id));
          else if (oName && customerNameMap.has(oName)) matchedId = customerNameMap.get(oName);
          else if (oMobile && customerMobileMap.has(oMobile)) matchedId = customerMobileMap.get(oMobile);
        }

        if (matchedId && customerTotals[matchedId]) {
          customerTotals[matchedId].total += parseFloat(o.total_amount || o.total || 0);
        } else {
          const fallbackName = typeof o.customer === 'object' ? (o.customer.name || o.customer.full_name) : (o.customer || 'Unknown');
          const key = `un_${fallbackName}`;
          if (!customerTotals[key]) customerTotals[key] = { name: fallbackName, total: 0 };
          customerTotals[key].total += parseFloat(o.total_amount || o.total || 0);
        }
      });

      const top_customers = Object.values(customerTotals)
        .filter(c => c.total > 0)
        .map(c => ({ customer__name: c.name, total: c.total.toFixed(2) }))
        .sort((a, b) => parseFloat(b.total) - parseFloat(a.total));

      // Generate dynamic chart data based on period
      if (period === 'Today') {
        // Show hours for today
        const hours = {};
        for (let i = 0; i < 24; i += 4) hours[`${i}:00`] = { sales: 0, orders: 0 };
        filteredOrders.forEach(o => {
          const d = new Date(o.created_at || o.date);
          const slot = `${Math.floor(d.getHours() / 4) * 4}:00`;
          if (hours[slot]) {
            hours[slot].sales += parseFloat(o.total_amount || o.total || 0);
            hours[slot].orders += 1;
          }
        });
        chartData = Object.keys(hours).map(k => ({ label: k, sales: hours[k].sales, orders: hours[k].orders * 10 }));
      } else if (period === 'This Week') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekMap = {};
        days.forEach(d => weekMap[d] = { sales: 0, orders: 0 });
        filteredOrders.forEach(o => {
          const d = new Date(o.created_at || o.date);
          const day = days[d.getDay()];
          weekMap[day].sales += parseFloat(o.total_amount || o.total || 0);
          weekMap[day].orders += 1;
        });
        chartData = days.map(d => ({ label: d, sales: weekMap[d].sales, orders: weekMap[d].orders * 10 }));
      } else {
        // This month
        const weeks = { 'Week 1': { sales: 0, orders: 0 }, 'Week 2': { sales: 0, orders: 0 }, 'Week 3': { sales: 0, orders: 0 }, 'Week 4': { sales: 0, orders: 0 } };
        filteredOrders.forEach(o => {
          const d = new Date(o.created_at || o.date);
          const w = Math.ceil(d.getDate() / 7);
          const wKey = `Week ${w > 4 ? 4 : w}`;
          weeks[wKey].sales += parseFloat(o.total_amount || o.total || 0);
          weeks[wKey].orders += 1;
        });
        chartData = Object.keys(weeks).map(w => ({ label: w, sales: weeks[w].sales, orders: weeks[w].orders * 10 }));
      }

      // Scale sales for the bar chart visuals (relative to max)
      const maxSales = Math.max(...chartData.map(c => c.sales), 1);
      const maxOrders = Math.max(...chartData.map(c => c.orders), 1);
      chartData = chartData.map(c => ({
        label: c.label,
        salesVal: c.sales.toFixed(2),
        ordersCount: c.orders / 10,
        sales: Math.max((c.sales / maxSales) * 100, 5), // percentage for css height
        orders: Math.max((c.orders / maxOrders) * 100, 5) // percentage for css height
      }));

      setReports({
        sales: { total_sales: total_sales.toFixed(2), today_sales: today_sales.toFixed(2) },
        orders: { total_orders: filteredOrders.length, breakdown: { pending, shipped } },
        customers: { total_customers: customersArr.length, top_customers },
        products: { total_products: allProducts.length },
        chartData
      });
    } catch (err) {
      console.error("Error fetching reports", err);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const chartData = reports.chartData || [];

  return (
    <div className="dash-overview-container">
      <div className="overview-header" style={{ justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <div className="overview-filters">
          <button className={`filter-btn ${period === 'Today' ? 'active' : ''}`} onClick={() => setPeriod('Today')}>Today</button>
          <button className={`filter-btn ${period === 'This Week' ? 'active' : ''}`} onClick={() => setPeriod('This Week')}>This Week</button>
          <button className={`filter-btn ${period === 'This Month' ? 'active' : ''}`} onClick={() => setPeriod('This Month')}>This Month</button>
        </div>
      </div>

      <div className="premium-bento">
        {/* Total Revenue */}
        <div className="premium-metric-card">
          <div className="metric-header-row">
            <span className="metric-title">Total Revenue</span>
            <div className="metric-icon-box icon-green"><FiDollarSign /></div>
          </div>
          <h3 className="metric-value-large">₹{reports.sales.total_sales || '0.00'}</h3>
          <div className="metric-trend-row">
            <FiTrendingUp className="trend-up" />
            <span className="trend-up">+₹{reports.sales.today_sales || '0.00'}</span> today
          </div>
        </div>

        {/* Total Orders */}
        <div className="premium-metric-card">
          <div className="metric-header-row">
            <span className="metric-title">Total Orders</span>
            <div className="metric-icon-box icon-blue"><FiBox /></div>
          </div>
          <h3 className="metric-value-large">{reports.orders.total_orders || 0}</h3>
          <div className="metric-trend-row">
            <span className="trend-flat">
              Pending: {reports.orders.breakdown?.pending || 0} • Shipped: {reports.orders.breakdown?.shipped || 0}
            </span>
          </div>
        </div>

        {/* Total Customers */}
        <div className="premium-metric-card">
          <div className="metric-header-row">
            <span className="metric-title">Total Customers</span>
            <div className="metric-icon-box icon-purple"><FiUsers /></div>
          </div>
          <h3 className="metric-value-large">{reports.customers.total_customers || 0}</h3>
          <div className="metric-trend-row">
            <FiTrendingUp className="trend-up" />
            <span className="trend-up">+12%</span> vs last month
          </div>
        </div>

        {/* Active Products */}
        <div className="premium-metric-card">
          <div className="metric-header-row">
            <span className="metric-title">Active Products</span>
            <div className="metric-icon-box icon-orange"><FiShoppingBag /></div>
          </div>
          <h3 className="metric-value-large">{reports.products.total_products || reports.products.total || 0}</h3>
          <div className="metric-trend-row">
            <FiMinus className="trend-flat" />
            <span className="trend-flat">Available in store</span>
          </div>
        </div>
      </div>

      <div className="premium-bottom-grid">
        {/* Chart Panel */}
        <div className="premium-panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-head">
            <h2>Revenue & Orders ({period})</h2>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ color: '#000000', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 10, height: 10, background: '#B3C58A', borderRadius: '2px' }}></div> Revenue
              </span>
              <span style={{ color: '#000000', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 10, height: 10, background: '#B3C58A', borderRadius: '2px' }}></div> Orders
              </span>
            </div>
          </div>
          <div className="panel-body">
            <div className="professional-chart">
              {chartData.map((d, idx) => (
                <div className="chart-column" key={idx}>
                  <div className="chart-tooltip">
                    {d.label}: ₹{d.salesVal} | {d.ordersCount} orders
                  </div>
                  <div className="chart-bar-group">
                    <div className="chart-bar sales" style={{ height: `${d.sales}%` }}></div>
                    <div className="chart-bar orders" style={{ height: `${d.orders}%` }}></div>
                  </div>
                  <span className="chart-label">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Customers Panel */}
        <div className="premium-panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-head">
            <h2>Top Customers Leaderboard</h2>
            <button className="filter-btn" style={{ padding: '0.3rem 0.8rem' }} onClick={() => setShowAllCustomers(!showAllCustomers)}>
              {showAllCustomers ? 'View Less' : 'View All'}
            </button>
          </div>
          <div className="panel-body">
            <div className="leaderboard-list">
              {reports.customers.top_customers && reports.customers.top_customers.length > 0 ? (
                (showAllCustomers ? reports.customers.top_customers : reports.customers.top_customers.slice(0, 3)).map((tc, idx) => {
                  const name = tc.customer__name || tc.customer__username || tc.customer || 'Unknown User';
                  const initials = name.substring(0, 2).toUpperCase();
                  return (
                    <div className="leaderboard-item" key={idx}>
                      <div className={`lb-rank top-${idx + 1}`}>{idx + 1}</div>
                      <div className="lb-avatar">{initials}</div>
                      <div className="lb-info">
                        <span className="lb-name">{name}</span>
                        <span className="lb-sub">Loyal Customer</span>
                      </div>
                      <div className="lb-amount">₹{tc.total}</div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  No top customer data available yet.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
