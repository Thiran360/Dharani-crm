import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiCheck, FiRefreshCw, FiCopy } from 'react-icons/fi';
import './StateShippingRates.css';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { API_BASE, API_HEADERS } from '../config/api';

const initialData = [
  { id: 1, name: 'Tamil Nadu', code: 'TN', shipping: 50, freeAbove: 750, minOrder: 110 },
  { id: 2, name: 'Andhra Pradesh', code: 'AP', shipping: 150, freeAbove: 1000, minOrder: 400 },
  { id: 3, name: 'Arunachal Pradesh', code: 'AR', shipping: 150, freeAbove: 1000, minOrder: 500 },
  { id: 4, name: 'Himachal Pradesh', code: 'HP', shipping: 200, freeAbove: 1000, minOrder: 500 },
  { id: 5, name: 'Bihar', code: 'BR', shipping: 200, freeAbove: 1000, minOrder: 500 },
  { id: 6, name: 'Chhattisgarh', code: 'CG', shipping: 200, freeAbove: 1000, minOrder: 500 },
  { id: 7, name: 'Jharkhand', code: 'JH', shipping: 200, freeAbove: 1000, minOrder: 500 },
  { id: 8, name: 'Kerala', code: 'KL', shipping: 150, freeAbove: 1000, minOrder: 400 },
  { id: 9, name: 'Goa', code: 'GA', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 10, name: 'Assam', code: 'AS', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 11, name: 'Mizoram', code: 'MZ', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 12, name: 'Karnataka', code: 'KA', shipping: 150, freeAbove: 1000, minOrder: 400 },
  { id: 13, name: 'Gujarat', code: 'GJ', shipping: 200, freeAbove: 1000, minOrder: 500 },
  { id: 14, name: 'Haryana', code: 'HR', shipping: 200, freeAbove: 1000, minOrder: 500 },
  { id: 15, name: 'Madhya Pradesh', code: 'MP', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 16, name: 'Maharashtra', code: 'MH', shipping: 250, freeAbove: 1200, minOrder: 500 },
  { id: 17, name: 'Meghalaya', code: 'ML', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 18, name: 'Odisha', code: 'OR', shipping: 200, freeAbove: 1000, minOrder: 500 },
  { id: 19, name: 'Andaman and Nicobar Islands', code: 'AN', shipping: 200, freeAbove: 1000, minOrder: 500 },
  { id: 20, name: 'Chandigarh', code: 'CH', shipping: 200, freeAbove: 1000, minOrder: 500 },
  { id: 21, name: 'Delhi', code: 'DL', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 22, name: 'Nagaland', code: 'NL', shipping: 300, freeAbove: 1100, minOrder: 550 },
  { id: 23, name: 'Lakshadweep', code: 'LD', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 24, name: 'Manipur', code: 'MN', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 25, name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DN', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 26, name: 'Punjab', code: 'PB', shipping: 200, freeAbove: 1000, minOrder: 500 },
  { id: 27, name: 'Rajasthan', code: 'RJ', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 28, name: 'Sikkim', code: 'SK', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 29, name: 'Telangana', code: 'TS', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 30, name: 'Tripura', code: 'TR', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 31, name: 'Puducherry', code: 'PY', shipping: 200, freeAbove: 1000, minOrder: 400 },
  { id: 32, name: 'Uttar Pradesh', code: 'UP', shipping: 200, freeAbove: 1000, minOrder: 500 },
  { id: 33, name: 'Jammu and Kashmir', code: 'JK', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 34, name: 'Ladakh', code: 'LA', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 35, name: 'West Bengal', code: 'WB', shipping: 250, freeAbove: 1000, minOrder: 500 },
  { id: 36, name: 'Uttarakhand', code: 'UK', shipping: 250, freeAbove: 1000, minOrder: 500 }
];

export default function StateShippingRates() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRates = async () => {
    try {
      const response = await fetch(`${API_BASE}/shipping-charge/`, {
        headers: API_HEADERS
      });
      if (response.ok) {
        const responseData = await response.json();
        // Handle both direct array and wrapped { data: [...] } structures
        const items = Array.isArray(responseData) ? responseData : (responseData.data || []);

        // Map backend payload to frontend state structure
        const mappedData = items.map(item => ({
          id: item.id || Math.random(),
          name: item.state_name,
          code: item.state_code,
          shipping: item.shipping_amount,
          freeAbove: item.free_above,
          minOrder: item.min_order
        }));
        setRates(mappedData);
      }
    } catch (error) {
      console.error('Error fetching shipping rates:', error);
    }
  };

  React.useEffect(() => {
    fetchRates();
  }, []);

  // Find duplicates logic
  const getDuplicates = () => {
    const counts = {};
    rates.forEach(r => {
      const keyName = r.name.toLowerCase();
      const keyCode = r.code.toLowerCase();
      counts[keyName] = (counts[keyName] || 0) + 1;
      counts[keyCode] = (counts[keyCode] || 0) + 1;
    });
    return rates.filter(r => counts[r.name.toLowerCase()] > 1 || counts[r.code.toLowerCase()] > 1);
  };

  const duplicates = getDuplicates();

  const handleOpenModal = (rate = null) => {
    if (rate) {
      setEditingId(rate.id);
      setFormData({ ...rate });
    } else {
      setEditingId(null);
      setFormData({ name: '', code: '', shipping: 0, freeAbove: 0, minOrder: 0 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    if (editingId) {
      try {
        const payload = {
          state_name: formData.name,
          state_code: formData.code,
          shipping_amount: Number(formData.shipping),
          free_above: Number(formData.freeAbove),
          min_order: Number(formData.minOrder)
        };

        const response = await fetch(`${API_BASE}/shipping-charge/${editingId}/`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...API_HEADERS
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          await fetchRates(); // Re-fetch to get updated list
          handleCloseModal();
        } else {
          alert('Failed to update state shipping rate');
        }
      } catch (error) {
        console.error('Error updating state:', error);
        alert('Error updating state');
      } finally {
        setIsSaving(false);
      }
    } else {
      try {
        const payload = {
          state_name: formData.name,
          state_code: formData.code,
          shipping_amount: Number(formData.shipping),
          free_above: Number(formData.freeAbove),
          min_order: Number(formData.minOrder)
        };

        const response = await fetch(`${API_BASE}/shipping-charge/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...API_HEADERS
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          await fetchRates(); // Re-fetch to get updated list with real IDs
          handleCloseModal();
        } else {
          alert('Failed to add state shipping rate');
        }
      } catch (error) {
        console.error('Error adding state:', error);
        alert('Error adding state');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDelete = (rate) => {
    setDeleteConfirm({
      isOpen: true,
      id: rate.id,
      name: rate.name || rate.code || 'State Rate'
    });
  };

  const confirmDeleteRate = async () => {
    if (!deleteConfirm.id) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`${API_BASE}/shipping-charge/${deleteConfirm.id}/`, {
        method: 'DELETE',
        headers: API_HEADERS
      });

      if (response.ok) {
        await fetchRates();
        setDeleteConfirm({ isOpen: false, id: null, name: '' });
      } else {
        alert('Failed to delete state shipping rate');
      }
    } catch (error) {
      console.error('Error deleting state:', error);
      alert('Error deleting state');
    } finally {
      setIsDeleting(false);
    }
  };

  const displayedRates = showDuplicates ? duplicates : rates.filter(rate =>
    rate.name.toLowerCase().includes(search.toLowerCase()) ||
    rate.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="shipping-rates-container">
      <div className="shipping-rates-header">
        <div className="header-left">
          <span className="total-count-badge">Total States: <strong>{rates.length}</strong></span>
        </div>
        <div className="shipping-header-actions">
          <div className="shipping-search-box">
            <FiSearch className="search-icon-inline" />
            <input
              type="text"
              placeholder="Search by name or code.."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowDuplicates(false); }}
            />
          </div>
          <button
            className={`btn-outline-warning ${showDuplicates ? 'active' : ''}`}
            onClick={() => setShowDuplicates(!showDuplicates)}
          >
            {showDuplicates ? 'Show All' : `Show Duplicates (${duplicates.length})`}
          </button>
          <button className="btn-primary" onClick={() => handleOpenModal()}>Add New State</button>
        </div>
      </div>

      <div className="alert-box">
        <p><strong>Note:</strong> Set -1 in free shipping fields to disable free shipping. When free shipping threshold is reached, shipping charges will be automatically disabled.</p>
      </div>

      <div className="table-responsive">
        <table className="shipping-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>State Name</th>
              <th>Code</th>
              <th>Shipping (₹)</th>
              <th>Free Above (₹)</th>
              <th>Min Order (₹)</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedRates.map((rate, index) => (
              <tr key={rate.id}>
                <td>{index + 1}</td>
                <td>{rate.name}</td>
                <td>{rate.code}</td>
                <td>₹{rate.shipping}</td>
                <td>₹{rate.freeAbove}</td>
                <td>₹{rate.minOrder}</td>
                <td className="actions-cell" style={{ textAlign: 'center' }}>
                  <button className="action-btn edit" title="Edit" onClick={() => handleOpenModal(rate)}><FiEdit2 /></button>
                  <button className="action-btn delete" title="Delete" onClick={() => handleDelete(rate)}><FiTrash2 /></button>
                </td>
              </tr>
            ))}
            {displayedRates.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center empty-state">No states found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="shipping-modal-overlay">
          <div className="shipping-modal">
            <h3>{editingId ? 'Edit State' : 'Add New State'}</h3>
            <form onSubmit={handleSave}>

              <div className="form-group-floating">
                <input
                  required
                  type="text"
                  placeholder=" "
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <label>State Name *</label>
              </div>

              <div className="form-group-floating">
                <input
                  required
                  type="text"
                  placeholder=" "
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
                <label>State Code (e.g., TN, KA) *</label>
              </div>

              <div className="form-group-floating">
                <input
                  required
                  type="number"
                  placeholder=" "
                  value={formData.shipping}
                  onChange={(e) => setFormData({ ...formData, shipping: e.target.value === '' ? '' : Number(e.target.value) })}
                />
                <label>Shipping Rate (₹)</label>
              </div>

              <div className="form-group-floating">
                <input
                  required
                  type="number"
                  placeholder=" "
                  value={formData.freeAbove}
                  onChange={(e) => setFormData({ ...formData, freeAbove: e.target.value === '' ? '' : Number(e.target.value) })}
                />
                <label>Free Shipping Above (₹) - Set -1 to disable</label>
              </div>

              <div className="form-group-floating">
                <input
                  required
                  type="number"
                  placeholder=" "
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: e.target.value === '' ? '' : Number(e.target.value) })}
                />
                <label>Minimum Order Value (₹)</label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel-filled" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn-primary-filled">{editingId ? 'Save Changes' : 'Create State'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={confirmDeleteRate}
        title="Delete Shipping Rate"
        message="Are you sure you want to delete shipping rate for this state?"
        itemName={deleteConfirm.name}
        isLoading={isDeleting}
      />
    </div>
  );
}
