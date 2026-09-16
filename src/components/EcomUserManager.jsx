import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiSearch, FiEdit2, FiTrash2, FiPlus, FiX, FiCheck, FiUser, FiMail, FiPhone, FiColumns, FiClock, FiDownload } from 'react-icons/fi';
import './EcomUserManager.css';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { API_BASE, API_HEADERS } from '../config/api';

export default function EcomUserManager() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    userType: '',
    addressType: 'Billing',
    creditPayment: false,
    creditLimit: ''
  });
  const [addresses, setAddresses] = useState([]);
  const [isAddressTypeOpen, setIsAddressTypeOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [columnSearchTerm, setColumnSearchTerm] = useState('');
  const [columnVisibility, setColumnVisibility] = useState({
    sno: true,
    name: true,
    phone: true,
    email: true,
    userType: true,
    creditPayment: true,
    creditLimit: true,
    purchaseHistory: true,
    actions: true
  });

  const handleDownloadCSV = () => {
    setIsExportOpen(false);
    if (filteredUsers.length === 0) {
      alert("No data to export");
      return;
    }
    const headers = ['S.No', 'Name', 'Phone', 'Email', 'User Type', 'Credit Payment', 'Credit Limit'];
    const rows = filteredUsers.map((user, index) => [
      index + 1,
      `"${getUserName(user).replace(/"/g, '""')}"`,
      `"${getUserPhone(user).replace(/"/g, '""')}"`,
      `"${(user.email || 'N/A').replace(/"/g, '""')}"`,
      'customer',
      'Disabled',
      'N/A'
    ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ecom_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setIsExportOpen(false);
    window.print();
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setEditingUserId(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      userType: '',
      addressType: 'Billing',
      creditPayment: false,
      creditLimit: ''
    });
    setAddresses([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setIsEditMode(true);
    setEditingUserId(user.id || user._id || user.email);
    setFormData({
      name: getUserName(user),
      phone: getUserPhone(user),
      email: user.email || '',
      userType: 'customer',
      addressType: 'Billing',
      creditPayment: user.creditPaymentEnabled || false,
      creditLimit: user.creditLimit || ''
    });
    // If the user has existing addresses, we could prefill them here.
    // For now, we'll start with an empty array or fetch them.
    setAddresses([]);
    setIsModalOpen(true);
  };

  const handleAddAddress = () => {
    setAddresses([...addresses, {
      id: Date.now(),
      type: formData.addressType,
      address: '',
      city: '',
      state: '',
      pincode: ''
    }]);
  };

  const handleRemoveAddress = (id) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
  };

  const handleAddressChange = (id, field, value) => {
    setAddresses(addresses.map(addr => addr.id === id ? { ...addr, [field]: value } : addr));
  };

  const handleSaveModal = async () => {
    // Construct the payload to send to the backend
    const payload = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      userType: 'customer',
      creditPaymentEnabled: formData.creditPayment,
      creditLimit: formData.creditLimit,
      addresses: addresses.map(a => ({
        type: a.type,
        address: a.address,
        city: a.city,
        state: a.state,
        pincode: a.pincode
      }))
    };

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...API_HEADERS
      };

      let response;
      // If we are editing, use PUT endpoint. Otherwise, use POST endpoint.
      if (isEditMode && editingUserId) {
        response = await fetch(`${API_BASE}/customers/${editingUserId}/`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_BASE}/customers/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        setIsModalOpen(false); // Close the modal on success
        fetchUsers();          // Instantly refresh the customer list from the database!
      } else {
        const errorText = await response.text();
        alert(`Failed to save customer: ${errorText}`);
      }
    } catch (err) {
      console.error("Error saving customer:", err);
      alert("Error saving customer. Please check the console for details.");
    }
  };

  const handleDeleteUser = (user) => {
    const id = typeof user === 'object' ? (user.id || user._id || user.email) : user;
    const name = typeof user === 'object' ? getUserName(user) : 'Customer';
    setDeleteConfirm({
      isOpen: true,
      id,
      name
    });
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirm.id) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/customers/delete/${deleteConfirm.id}/`, {
        method: 'DELETE',
        headers: API_HEADERS
      });
      if (response.ok) {
        fetchUsers();
        setDeleteConfirm({ isOpen: false, id: null, name: '' });
      } else {
        const errorText = await response.text();
        alert(`Failed to delete customer: ${errorText}`);
      }
    } catch (err) {
      console.error("Error deleting customer:", err);
      alert("Error deleting customer. Please check the console.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const ts = Date.now();
      const headers = API_HEADERS;
      const response = await fetch(`${API_BASE}/customers/?_t=${ts}`, { headers });
      const text = await response.text();

      let data;
      try { data = JSON.parse(text); } catch (e) { }

      let items = [];
      if (Array.isArray(data)) items = data;
      else if (data && typeof data === 'object') items = data.results || data.data || data.customers || Object.values(data).find(Array.isArray) || [];

      setUsers(items);
    } catch (err) {
      console.error("Error fetching ecom users data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewHistory = async (user) => {
    setSelectedUserForHistory(user);
    setHistoryModalOpen(true);
    setIsHistoryLoading(true);

    try {
      const ts = Date.now();
      const headers = API_HEADERS;
      const response = await fetch(`${API_BASE}/orders/?_t=${ts}`, { headers });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { }

      let allOrders = [];
      if (Array.isArray(data)) allOrders = data;
      else if (data && typeof data === 'object') allOrders = data.results || data.data || data.orders || Object.values(data).find(Array.isArray) || [];

      const userPhone = getUserPhone(user).replace(/\D/g, '');
      const userEmail = (user.email || '').toLowerCase();

      const filteredOrders = allOrders.filter(order => {
        const orderPhone = (order.billing_phone || order.phone || order.mobile || '').replace(/\D/g, '');
        const orderEmail = (order.billing_email || order.email || '').toLowerCase();
        const orderName = (order.billing_name || order.customer || '').toLowerCase();

        if (userPhone && orderPhone && orderPhone.includes(userPhone)) return true;
        if (userEmail && orderEmail && orderEmail === userEmail) return true;
        if (user.name && orderName && orderName.includes(user.name.toLowerCase())) return true;
        return false;
      }).map(order => {
        let itemsStr = 'N/A';
        if (Array.isArray(order.items)) {
          itemsStr = order.items.map(it => `${it.quantity || 1}x ${it.product || it.name || 'Item'}`).join(', ');
        }
        return {
          id: order.id || order.order_id || 'N/A',
          date: order.date || order.created_at ? new Date(order.date || order.created_at).toLocaleDateString() : 'N/A',
          items: itemsStr,
          amount: `₹${parseFloat(order.total || order.total_amount || 0).toFixed(2)}`,
          status: order.status || 'Processing'
        };
      });

      setUserOrders(filteredOrders);
    } catch (err) {
      console.error("Error fetching user history:", err);
      setUserOrders([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const getUserName = (user) => {
    if (user.name) return user.name;
    if (user.first_name || user.last_name) return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (user.username) return user.username;
    return 'Unknown';
  };

  const getUserPhone = (user) => {
    return user.mobile || user.phone || user.phone_number || 'N/A';
  };

  const toggleCreditPayment = (userId) => {
    setUsers(users.map(user => {
      const id = user.id || user._id || user.email; // Fallback to email if no id
      if (id === userId) {
        return { ...user, creditPaymentEnabled: !user.creditPaymentEnabled };
      }
      return user;
    }));
  };



  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const name = getUserName(user).toLowerCase();
      const email = (user.email || '').toLowerCase();
      const phone = getUserPhone(user).toLowerCase();
      const search = searchTerm.toLowerCase();
      return name.includes(search) || email.includes(search) || phone.includes(search);
    });
  }, [users, searchTerm]);

  return (
    <div className="ecomuser-manager">
      <div className="ecomuser-header-bar" style={{ justifyContent: 'flex-end' }}>
        <div className="ecomuser-toolbar">
          <div className="ecomuser-search">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="button" className="ecomuser-add-btn" onClick={handleOpenAddModal}>
            <FiPlus /> Add Customer
          </button>
        </div>
      </div>

      <div className="ecomuser-table-container">
        <div className="ecomuser-table-toolbar">
          <div style={{ position: 'relative' }}>
            <button className="ecomuser-toolbar-btn" onClick={() => setIsColumnsOpen(!isColumnsOpen)}>
              <FiColumns /> Columns
            </button>
            {isColumnsOpen && (
              <div className="ecom-columns-dropdown">
                <div className="ecom-col-search-wrapper">
                  <span className="ecom-col-search-label">Find column</span>
                  <input
                    type="text"
                    placeholder="Column title"
                    value={columnSearchTerm}
                    onChange={(e) => setColumnSearchTerm(e.target.value)}
                    className="ecom-col-search-input"
                  />
                </div>
                <div className="ecom-col-list">
                  {Object.entries({
                    sno: 'S.No',
                    name: 'Name',
                    phone: 'Phone',
                    email: 'Email',
                    userType: 'User Type',
                    creditPayment: 'Credit Payment',
                    creditLimit: 'Credit Limit',
                    purchaseHistory: 'Purchase History',
                    actions: 'Actions'
                  }).filter(([key, label]) => label.toLowerCase().includes(columnSearchTerm.toLowerCase())).map(([key, label]) => (
                    <div key={key} className="ecom-col-item">
                      <label className="ecom-switch">
                        <input
                          type="checkbox"
                          checked={columnVisibility[key]}
                          onChange={(e) => setColumnVisibility({ ...columnVisibility, [key]: e.target.checked })}
                        />
                        <span className="ecom-slider round"></span>
                      </label>
                      <span className="ecom-col-label">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="ecom-col-actions">
                  <button onClick={() => setColumnVisibility(Object.keys(columnVisibility).reduce((acc, k) => ({ ...acc, [k]: false }), {}))}>Hide all</button>
                  <button onClick={() => setColumnVisibility(Object.keys(columnVisibility).reduce((acc, k) => ({ ...acc, [k]: true }), {}))}>Show all</button>
                </div>
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <button className="ecomuser-toolbar-btn" onClick={() => setIsExportOpen(!isExportOpen)}>
              <FiDownload /> Export
            </button>
            {isExportOpen && (
              <div className="ecom-export-dropdown">
                <div className="ecom-export-option" onClick={handleDownloadCSV}>Download as CSV</div>
                <div className="ecom-export-option" onClick={handlePrint}>Print</div>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="ecomuser-loading">Loading users...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ecomuser-table">
              <thead>
                <tr>
                  {columnVisibility.sno && <th>S.No</th>}
                  {columnVisibility.name && <th>Name</th>}
                  {columnVisibility.phone && <th>Phone</th>}
                  {columnVisibility.email && <th>Email</th>}
                  {columnVisibility.userType && <th>User Type</th>}
                  {columnVisibility.creditPayment && <th>Credit Payment</th>}
                  {columnVisibility.creditLimit && <th>Credit Limit</th>}
                  {columnVisibility.purchaseHistory && <th style={{ textAlign: 'center' }}>Purchase History</th>}
                  {columnVisibility.actions && <th style={{ textAlign: 'center' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr key={user.id || index}>
                      {columnVisibility.sno && <td>{index + 1}</td>}
                      {columnVisibility.name && <td>{getUserName(user)}</td>}
                      {columnVisibility.phone && <td>{getUserPhone(user)}</td>}
                      {columnVisibility.email && <td>{user.email || 'N/A'}</td>}
                      {columnVisibility.userType && <td>customer</td>}
                      {columnVisibility.creditPayment && <td>
                        <span
                          className={user.creditPaymentEnabled ? "badge-enabled" : "badge-disabled"}
                          onClick={() => toggleCreditPayment(user.id || user._id || user.email)}
                        >
                          {user.creditPaymentEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>}
                      {columnVisibility.creditLimit && <td>{user.creditLimit || 'N/A'}</td>}
                      {columnVisibility.purchaseHistory && <td style={{ textAlign: 'center' }}>
                        <button className="action-btn-green" title="View History" onClick={() => handleViewHistory(user)}>
                          <FiClock />
                        </button>
                      </td>}
                      {columnVisibility.actions && <td style={{ textAlign: 'center' }}>
                        <div className="table-actions" style={{ justifyContent: 'center' }}>
                          <button className="action-btn-yellow" title="Edit" onClick={() => handleOpenEditModal(user)}>
                            <FiEdit2 />
                          </button>
                          <button className="action-btn-red" title="Delete" onClick={() => handleDeleteUser(user)}>
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="ecom-modal-overlay">
          <div className="ecom-modal-content">
            <div className="ecom-modal-header">
              <h2>{isEditMode ? 'Edit Customer' : 'Add Customer'}</h2>
            </div>

            <form className="ecom-modal-body">
              <div className="ecom-form-row">
                <div className="ecom-form-group">
                  <label>Name <span className="required">*</span></label>
                  <input type="text" className="ecom-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isEditMode} />
                </div>
                <div className="ecom-form-group">
                  <label>Phone <span className="required">*</span></label>
                  <input type="text" className="ecom-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} disabled={isEditMode} />
                </div>
                <div className="ecom-form-group">
                  <label>Email</label>
                  <input type="email" className="ecom-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={isEditMode} />
                </div>
              </div>

              <div className="ecom-form-row align-center">
                <div className="ecom-form-group">
                  <label>User Type</label>
                  <input type="text" className="ecom-input" value="customer" disabled />
                </div>

                <div className="ecom-credit-toggle-group">
                  <label className="ecom-switch">
                    <input
                      type="checkbox"
                      checked={formData.creditPayment}
                      onChange={(e) => setFormData({ ...formData, creditPayment: e.target.checked })}
                    />
                    <span className="ecom-slider round"></span>
                  </label>
                  <span className="ecom-credit-label">Credit Payment</span>
                </div>

                {formData.creditPayment ? (
                  <div className="ecom-form-group">
                    <label>Credit Limit</label>
                    <input type="number" className="ecom-input" value={formData.creditLimit} onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })} />
                    <span className="ecom-help-text">Set -1 to disable the order value limit</span>
                  </div>
                ) : (
                  <div style={{ flex: 1 }}></div>
                )}
              </div>

              <div className="ecom-address-section">
                <h3>Addresses</h3>
                <div className={`address-type-selector ${isAddressTypeOpen ? 'open' : ''}`} onClick={() => setIsAddressTypeOpen(!isAddressTypeOpen)}>
                  <span className="address-type-label">Address Type</span>
                  <div className="address-type-display">
                    {formData.addressType}
                    <span className="address-type-arrow">▾</span>
                  </div>
                  {isAddressTypeOpen && (
                    <div className="address-type-dropdown">
                      <div className="address-type-option" onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, addressType: 'Billing' }); setIsAddressTypeOpen(false); }}>Billing</div>
                      <div className="address-type-option" onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, addressType: 'Shipping' }); setIsAddressTypeOpen(false); }}>Shipping</div>
                    </div>
                  )}
                </div>
                <button type="button" className="add-address-btn" onClick={handleAddAddress}>
                  + Add Address
                </button>
              </div>

              {addresses.map((addr) => (
                <div key={addr.id} className="ecom-address-card">
                  <div className="ecom-address-card-header">
                    <span className="ecom-address-card-title">{addr.type} Address</span>
                    <button type="button" className="ecom-address-remove-btn" onClick={() => handleRemoveAddress(addr.id)}>Remove</button>
                  </div>
                  <div className="ecom-form-row">
                    <div className="ecom-form-group">
                      <label>Address</label>
                      <input type="text" value={addr.address} onChange={(e) => handleAddressChange(addr.id, 'address', e.target.value)} className="ecom-input" />
                    </div>
                  </div>
                  <div className="ecom-form-row">
                    <div className="ecom-form-group">
                      <label>City</label>
                      <input type="text" value={addr.city} onChange={(e) => handleAddressChange(addr.id, 'city', e.target.value)} className="ecom-input" />
                    </div>
                    <div className="ecom-form-group">
                      <label>State</label>
                      <input type="text" value={addr.state} onChange={(e) => handleAddressChange(addr.id, 'state', e.target.value)} className="ecom-input" />
                    </div>
                    <div className="ecom-form-group">
                      <label>Pincode</label>
                      <input type="text" value={addr.pincode} onChange={(e) => handleAddressChange(addr.id, 'pincode', e.target.value)} className="ecom-input" />
                    </div>
                  </div>
                </div>
              ))}
            </form>

            <div className="ecom-modal-footer">
              <button type="button" className="ecom-btn-close" onClick={() => setIsModalOpen(false)}>Close</button>
              <button type="button" className="ecom-btn-save" onClick={handleSaveModal}>Save</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {historyModalOpen && createPortal(
        <div className="ecom-modal-overlay">
          <div className="ecom-modal-content" style={{ maxWidth: '1100px', padding: '2rem' }}>
            <div className="history-modal-header">
              <div className="history-user-info">
                <h2>Purchase History</h2>
                <p>
                  {selectedUserForHistory ? getUserName(selectedUserForHistory) : ''} | {selectedUserForHistory ? getUserPhone(selectedUserForHistory) : ''} | {selectedUserForHistory?.email || ''}
                </p>
              </div>
              <div className="history-summary">
                <p>Total Orders: <strong>{userOrders.length}</strong></p>
                <p>Total Spend: <strong>₹{userOrders.reduce((sum, order) => sum + parseFloat(order.amount.replace(/[^0-9.]/g, '') || 0), 0).toFixed(0)}</strong></p>
              </div>
            </div>

            <div className="ecom-modal-body" style={{ marginTop: '1.5rem' }}>
              {isHistoryLoading ? (
                <div className="ecomuser-loading" style={{ padding: '2rem' }}>Loading purchase history...</div>
              ) : (
                userOrders.length > 0 ? (
                  <div className="history-table-container">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th style={{ width: '5%' }}>S.No</th>
                          <th style={{ width: '12%' }}>Order No</th>
                          <th style={{ width: '45%' }}>Products</th>
                          <th style={{ width: '12%' }}>Amount</th>
                          <th style={{ width: '12%' }}>Status</th>
                          <th style={{ width: '14%' }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userOrders.map((order, i) => (
                          <tr key={i}>
                            <td style={{ textAlign: 'center' }}>{i + 1}</td>
                            <td style={{ fontWeight: 500 }}>{order.id}</td>
                            <td style={{ color: '#000000', fontSize: '0.9rem', lineHeight: '1.4' }}>{order.items}</td>
                            <td style={{ fontWeight: 600, fontSize: '1.05rem' }}>{order.amount}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`history-badge ${order.status.toLowerCase() === 'dispatched' || order.status.toLowerCase() === 'delivered' ? 'history-badge-success' : 'history-badge-warning'}`}>
                                {order.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>{order.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#000000', border: '1px solid rgba(48, 55, 42, 0.12)', borderRadius: '8px' }}>
                    No purchase history found for this user.
                  </div>
                )
              )}
            </div>

            <div className="ecom-modal-footer" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="ecom-btn-close" onClick={() => setHistoryModalOpen(false)} style={{ maxWidth: '120px' }}>Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={confirmDeleteUser}
        title="Delete Customer"
        message="Are you sure you want to delete this customer account?"
        itemName={deleteConfirm.name}
        isLoading={isDeleting}
      />
    </div>
  );
}
