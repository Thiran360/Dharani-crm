import React, { useState, useEffect, useMemo } from 'react';
import { FiUser, FiSearch, FiDownload, FiMoreVertical, FiMail, FiPhone } from 'react-icons/fi';
import './CustomerManager.css';
import { API_BASE, API_HEADERS } from '../config/api';

export default function CustomerManager() {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const ts = Date.now();
      const headers = API_HEADERS;
      const [resCust, resOrd] = await Promise.all([
        fetch(`${API_BASE}/customers/?_t=${ts}`, { headers }),
        fetch(`${API_BASE}/orders/?_t=${ts}`, { headers })
      ]);
      const [textCust, textOrd] = await Promise.all([resCust.text(), resOrd.text()]);

      let cData, oData;
      try { cData = JSON.parse(textCust); oData = JSON.parse(textOrd); } catch (e) { }

      let cItems = [];
      if (Array.isArray(cData)) cItems = cData;
      else if (cData && typeof cData === 'object') cItems = cData.results || cData.data || cData.customers || Object.values(cData).find(Array.isArray) || [];

      let oItems = [];
      if (Array.isArray(oData)) oItems = oData;
      else if (oData && typeof oData === 'object') oItems = oData.results || oData.data || oData.orders || Object.values(oData).find(Array.isArray) || [];

      setCustomers(cItems);
      setOrders(oItems);
    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const getCustomerName = (cust) => {
    if (cust.name) return cust.name;
    if (cust.first_name || cust.last_name) return `${cust.first_name || ''} ${cust.last_name || ''}`.trim();
    if (cust.username) return cust.username;
    return 'Unknown Customer';
  };

  const getCustomerPhone = (cust) => {
    return cust.mobile || cust.phone || cust.phone_number || 'N/A';
  };

  const getInitials = (name) => {
    if (!name || name === 'Unknown Customer') return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const filteredCustomers = useMemo(() => {
    return customers.map(cust => {
      const custOrders = orders.filter(o => {
        if (String(o.customer_id) === String(cust.id)) return true;
        if (o.customer && String(o.customer).toLowerCase().trim() === String(getCustomerName(cust)).toLowerCase().trim()) return true;
        const oMobile = String(o.mobile || '').replace(/\s/g, '');
        const cMobile = String(getCustomerPhone(cust) || '').replace(/\s/g, '');
        if (oMobile && oMobile !== 'N/A' && oMobile === cMobile) return true;
        return false;
      });
      const totalSpent = custOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
      return { ...cust, orderCount: custOrders.length, totalSpent };
    }).filter(cust => {
      const name = getCustomerName(cust).toLowerCase();
      const email = (cust.email || '').toLowerCase();
      const phone = getCustomerPhone(cust).toLowerCase();
      const search = searchTerm.toLowerCase();
      return name.includes(search) || email.includes(search) || phone.includes(search);
    });
  }, [customers, orders, searchTerm]);

  const handleExport = () => {
    try {
      console.log("Export clicked. Total customers:", filteredCustomers.length);
      if (filteredCustomers.length === 0) {
        alert("No customers to export");
        return;
      }

      const headers = ['Customer Name', 'Email', 'Phone', 'Total Orders', 'Total Spent'];
      const rows = filteredCustomers.map(cust => [
        `"${(getCustomerName(cust) || '').replace(/"/g, '""')}"`,
        `"${(cust.email || 'N/A').replace(/"/g, '""')}"`,
        `"${(getCustomerPhone(cust) || '').replace(/"/g, '""')}"`,
        cust.orderCount || 0,
        (cust.totalSpent || 0).toFixed(2)
      ]);

      const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log("Export successful");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please check the console for details.");
    }
  };

  return (
    <div className="customer-manager">
      <div className="customer-header-bar">
        <div className="customer-toolbar">
          <div className="customer-search">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="button" className="ultra-btn outline-btn" onClick={handleExport} style={{ margin: 0, width: 'auto', padding: '0.6rem 1.2rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <FiDownload /> Export
            </span>
          </button>
        </div>
      </div>

      <div className="customer-table-container">
        {isLoading ? (
          <div className="customer-loading">Loading customers data...</div>
        ) : (
          <div className="table-responsive">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Total Orders</th>
                  <th>Total Spent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      No customers found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust, index) => (
                    <tr key={cust.id || index}>
                      <td>
                        <div className="cust-cell-profile">
                          <div className="cust-table-avatar">
                            {getInitials(getCustomerName(cust))}
                          </div>
                          <div className="cust-table-name">
                            <strong>{getCustomerName(cust)}</strong>
                            <span className="cust-table-email">{cust.email || 'No email'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cust-table-contact">
                          <span><FiPhone /> {getCustomerPhone(cust)}</span>
                        </div>
                      </td>
                      <td><div style={{ fontWeight: '600' }}>{cust.orderCount}</div></td>
                      <td style={{ whiteSpace: 'nowrap' }}><div style={{ fontWeight: '600', color: '#000000', whiteSpace: 'nowrap', display: 'inline-block' }}>₹{cust.totalSpent.toFixed(2)}</div></td>
                      <td>
                        <span className={`cust-badge ${cust.is_active === false ? 'badge-inactive' : 'badge-active'}`}>
                          {cust.is_active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
