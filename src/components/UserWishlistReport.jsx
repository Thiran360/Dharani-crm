import React, { useState } from 'react';
import { FiHeart, FiStar, FiDownload } from 'react-icons/fi';
import './UserWishlistReport.css';
import { API_BASE, API_HEADERS } from '../config/api';

const BASE_URL = API_BASE;
const HDR = API_HEADERS;


const UserWishlistReport = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    fetchWishlistData();
  }, []);

  const fetchWishlistData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all customers
      const custRes = await fetch(`${BASE_URL}/customers/`, { headers: HDR });
      const custData = await custRes.json();

      let customers = [];
      if (Array.isArray(custData)) customers = custData;
      else if (custData && typeof custData === 'object') {
        customers = custData.results || custData.data || custData.customers || Object.values(custData).find(Array.isArray) || [];
      }

      // 2. Fetch wishlist for each customer (in batches of 5 to avoid overwhelming the server)
      const BATCH_SIZE = 5;
      let allWishlists = [];

      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        const batch = customers.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (cust) => {
          try {
            const wRes = await fetch(`${BASE_URL}/wishlist/${cust.id}/`, { headers: HDR });
            const wData = await wRes.json();

            if (wData.success && wData.wishlist && wData.wishlist.length > 0) {
              // Extract product name properly based on API response structure
              const formatProduct = (w) => w.product_name || w.name || (w.product && w.product.name) || `Product #${w.product_id || w.id || 'Unknown'}`;

              // Extract date if available
              const dateStr = wData.wishlist[0].added_at || wData.wishlist[0].created_at;
              const formattedDate = dateStr
                ? new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '\n')
                : new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '\n');

              return {
                id: cust.id,
                name: cust.name || cust.first_name || 'Unknown',
                phone: cust.mobile || cust.phone || 'N/A',
                email: cust.email || 'N/A',
                itemsCount: wData.wishlist.length,
                products: wData.wishlist.map(formatProduct),
                lastUpdated: formattedDate
              };
            }
          } catch (e) {
            console.error(`Error fetching wishlist for customer ${cust.id}`, e);
          }
          return null;
        });

        const batchResults = await Promise.all(batchPromises);
        allWishlists = [...allWishlists, ...batchResults.filter(Boolean)];
      }

      setReportData(allWishlists);
    } catch (err) {
      console.error("Error fetching wishlist report data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = reportData.filter(row => {
    const term = searchTerm.toLowerCase();
    return (
      (row.name && row.name.toLowerCase().includes(term)) ||
      (row.phone && row.phone.toLowerCase().includes(term)) ||
      (row.email && row.email.toLowerCase().includes(term))
    );
  });

  const handleExportCSV = () => {
    if (filteredData.length === 0) return;

    const headers = ['S.No', 'Customer Name', 'Phone', 'Email', 'Items Count', 'Wishlist Products', 'Last Updated'];
    const csvRows = filteredData.map((row, index) => {
      return [
        index + 1,
        `"${row.name}"`,
        `"${row.phone}"`,
        `"${row.email}"`,
        row.itemsCount,
        `"${row.products.join(', ')}"`,
        `"${row.lastUpdated.replace('\n', ' ')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `User_Wishlist_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="wishlist-report-wrapper">
      <div className="wishlist-report-page-header">
        <h1>User Wishlist</h1>
      </div>

      <div className="wishlist-summary-cards">
        <div className="summary-card">
          <div className="summary-info">
            <h3>{reportData.length}</h3>
            <p>Total Wishlists with Items</p>
          </div>
          <div className="summary-icon-wrapper">
            <FiHeart className="summary-icon" />
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-info">
            <h3>{reportData.reduce((acc, curr) => acc + curr.itemsCount, 0)}</h3>
            <p>Total Wishlisted Items</p>
          </div>
          <div className="summary-icon-wrapper">
            <FiStar className="summary-icon" />
          </div>
        </div>
      </div>

      <div className="wishlist-report-table-container">
        <div className="modern-toolbar">
          <div className="modern-toolbar-left">
            <div className="modern-icon-badge">
              <FiHeart />
            </div>
            <div className="modern-title-area">
              <p>Total {reportData.length} records (with items only)</p>
            </div>
          </div>

          <div className="modern-toolbar-right">
            <div className="modern-search-container">
              <input
                type="text"
                placeholder="Search by Name / Phone / Email..."
                className="modern-search-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="modern-download-btn" onClick={handleExportCSV}>
              <FiDownload /> Export CSV
            </button>
          </div>
        </div>

        <table className="wishlist-report-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Customer</th>
              <th>Contact No.</th>
              <th>Email Address</th>
              <th style={{ textAlign: 'center' }}>Total Items</th>
              <th>Product Details</th>
              <th style={{ textAlign: 'center' }}>Updated On</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#000000' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid rgba(48, 55, 42, 0.12)', borderTopColor: '#B3C58A', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <span>Loading wishlist data from server...</span>
                  </div>
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </td>
              </tr>
            ) : filteredData.length > 0 ? (
              filteredData.map((row, index) => (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                  <td style={{ fontWeight: 600 }}>{row.name}</td>
                  <td>{row.phone}</td>
                  <td style={{ fontSize: '0.85rem' }}>{row.email}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="items-count-badge">
                      {row.itemsCount} {row.itemsCount === 1 ? 'item' : 'items'}
                    </span>
                  </td>
                  <td>
                    <div className="wishlist-items-list">
                      {row.products.map((item, i) => (
                        <span key={i} className="wishlist-item-tag">{item}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#000000', whiteSpace: 'pre-line', textAlign: 'center' }}>
                    {row.lastUpdated}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#000000' }}>
                  No wishlist records found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserWishlistReport;
