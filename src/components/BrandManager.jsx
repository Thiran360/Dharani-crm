import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiEdit2, FiTrash2, FiPlus, FiImage, FiX, FiSearch, FiDownload, FiFolder } from 'react-icons/fi';
import './BrandManager.css';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { API_BASE, API_HEADERS } from '../config/api';

export default function BrandManager() {
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchbrands();
  }, []);

  const fetchbrands = async () => {
    try {
      const res = await fetch(`${API_BASE}/brands/`, {
        headers: API_HEADERS
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('JSON Parse Error:', e);
        return;
      }

      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data && typeof data === 'object') {
        items = data.results || data.data || data.brands || Object.values(data).find(Array.isArray) || [];
      }

      setBrands(items);
    } catch (err) {
      console.error("Error fetching brands", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredbrands = brands.filter(cat => {
    const search = searchTerm.toLowerCase();
    const brandName = (cat.name || '').toLowerCase();
    return brandName.includes(search);
  });

  const openModal = (Brand = null) => {
    setStatus({ type: '', message: '' });
    if (Brand) {
      setEditingId(Brand.id);
      setName(Brand.name);
      setImagePreview(Brand.logo || '');
      setImage(null);
    } else {
      setEditingId(null);
      setName('');
      setImagePreview('');
      setImage(null);
    }
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus({ type: '', message: '' });

    try {
      const url = editingId ? `${API_BASE}/brands/${editingId}/` : `${API_BASE}/brands/`;
      const method = editingId ? 'PUT' : 'POST';

      let fetchOptions = {
        method,
        headers: { ...API_HEADERS }
      };

      if (editingId) {
        // Send JSON for PUT to ensure the backend actually updates the fields
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify({ name: name });
      } else {
        const formData = new FormData();
        formData.append('name', name);
        if (image) {
          formData.append('logo', image);
        }
        fetchOptions.body = formData;
      }

      const response = await fetch(url, fetchOptions);

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: editingId ? 'Brand updated successfully!' : 'Brand added successfully!' });
        fetchbrands(); // Refresh list
        setTimeout(() => setIsModalOpen(false), 1500);
      } else {
        setStatus({ type: 'error', message: data.message || data.error || 'Failed to save Brand.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error while saving Brand.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (brand) => {
    setDeleteConfirm({
      isOpen: true,
      id: brand.id || brand.brand_id,
      name: brand.name || ''
    });
  };

  const confirmDeleteBrand = async () => {
    if (!deleteConfirm.id) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`${API_BASE}/brands/${deleteConfirm.id}/`, {
        method: 'DELETE',
        headers: API_HEADERS
      });

      if (response.ok) {
        await fetchbrands();
        setDeleteConfirm({ isOpen: false, id: null, name: '' });
      } else {
        alert("Failed to delete Brand.");
      }
    } catch (err) {
      console.error("Error deleting Brand", err);
      alert("Network error while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    if (brands.length === 0) {
      alert("No brands to export!");
      return;
    }
    const headers = ["ID", "Brand Name"];
    const csvContent = [
      headers.join(","),
      ...brands.map(b => `${b.id || b.brand_id || ''},"${(b.name || '').replace(/"/g, '""')}"`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Brands_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="brand-manager">
      <div className="brand-header-bar">
        <div className="brand-toolbar">
          <div className="brand-search">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="ultra-btn outline-btn" onClick={handleExport} style={{ margin: 0, width: 'auto', padding: '0.6rem 1.2rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <FiDownload /> Export
            </span>
          </button>
          <button className="ultra-btn" onClick={() => openModal()} style={{ margin: 0, width: 'auto', padding: '0.6rem 1.2rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <FiPlus /> Add Brand
            </span>
            <div className="btn-glow"></div>
          </button>
        </div>
      </div>

      <div className="brand-table-container">
        {isLoading ? (
          <div className="brand-loading">Loading brands data...</div>
        ) : (
          <div className="table-responsive">
            <table className="brand-table">
              <thead>
                <tr>
                  <th>Brand Profile</th>
                  <th>Brand Name</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredbrands.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      No brands found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredbrands.map((Brand) => {
                    const id = Brand.brand_id || Brand.id;
                    return (
                      <tr key={id}>
                        <td>
                          <div className="brand-cell-profile">
                            <div className="brand-table-avatar">
                              {Brand.logo ? (
                                <img src={Brand.logo} alt={Brand.name} />
                              ) : (
                                <FiFolder style={{ fontSize: '1.2rem', color: '#000000' }} />
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="brand-table-name">
                            <strong>{Brand.name}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="brand-badge badge-active">Active</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="brand-action-group">
                            <button className="brand-action-btn" onClick={() => openModal({ ...Brand, id })} title="Edit">
                              <FiEdit2 />
                            </button>
                            <button className="brand-action-btn delete" onClick={() => handleDelete({ ...Brand, id })} title="Delete">
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="cat-modal-overlay">
          <div className="cat-modal">
            <div className="cat-modal-header">
              <h2>{editingId ? 'Edit Brand' : 'Add New Brand'}</h2>
              <button className="cat-close-btn" onClick={() => setIsModalOpen(false)}><FiX /></button>
            </div>

            {status.message && (
              <div className={`dash-${status.type} cat-status`}>
                {status.message}
              </div>
            )}

            <form className="dash-form" onSubmit={handleSubmit}>
              <div className="image-upload-section">
                <div className="image-preview">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" />
                  ) : (
                    <div className="image-placeholder"><FiImage /></div>
                  )}
                </div>
                <div className="upload-btn-wrapper">
                  <button type="button" className="ultra-btn outline-btn" style={{ margin: 0 }}>Choose Image</button>
                  <input type="file" accept="image/*" onChange={handleImageChange} />
                </div>
              </div>

              <div className="dash-input-group">
                <input type="text" id="brandName" value={name} onChange={e => setName(e.target.value)} placeholder=" " required />
                <label htmlFor="brandName">Brand Name</label>
              </div>

              <button type="submit" className="dash-btn" disabled={isSaving}>
                <span>{isSaving ? 'Saving...' : (editingId ? 'Update Brand' : 'Add Brand')}</span>
                <div className="btn-glow"></div>
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={confirmDeleteBrand}
        title="Delete Brand"
        message="Are you sure you want to delete this brand?"
        itemName={deleteConfirm.name}
        isLoading={isDeleting}
      />
    </div>
  );
}
