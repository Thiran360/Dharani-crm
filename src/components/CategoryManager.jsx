import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiEdit2, FiTrash2, FiPlus, FiImage, FiX, FiSearch, FiDownload, FiFolder } from 'react-icons/fi';
import './CategoryManager.css';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { API_BASE, API_HEADERS } from '../config/api';

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
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
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories/`, {
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
        items = data.results || data.data || data.categories || Object.values(data).find(Array.isArray) || [];
      }

      setCategories(items);
    } catch (err) {
      console.error("Error fetching categories", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => {
    const search = searchTerm.toLowerCase();
    const catName = (cat.name || '').toLowerCase();
    return catName.includes(search);
  });

  const openModal = (category = null) => {
    setStatus({ type: '', message: '' });
    if (category) {
      setEditingId(category.id);
      setName(category.name);
      setImagePreview(category.image || '');
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
      const url = editingId ? `${API_BASE}/categories/${editingId}/` : `${API_BASE}/categories/`;
      const method = editingId ? 'PUT' : 'POST';

      let fetchOptions = {
        method,
        headers: { ...API_HEADERS }
      };

      if (editingId) {
        // Send JSON for PUT to fix the backend "Expecting value: line 1 column 1" error
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify({ name: name });
      } else {
        // Send FormData for POST to support image uploads
        const formData = new FormData();
        formData.append('name', name);
        if (image) {
          formData.append('image', image);
        }
        fetchOptions.body = formData;
      }

      const response = await fetch(url, fetchOptions);

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: editingId ? 'Category updated successfully!' : 'Category added successfully!' });
        fetchCategories(); // Refresh list
        setTimeout(() => setIsModalOpen(false), 1500);
      } else {
        setStatus({ type: 'error', message: data.message || data.error || 'Failed to save category.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error while saving category.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (category) => {
    setDeleteConfirm({
      isOpen: true,
      id: category.id,
      name: category.name || ''
    });
  };

  const confirmDeleteCategory = async () => {
    if (!deleteConfirm.id) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`${API_BASE}/categories/${deleteConfirm.id}/`, {
        method: 'DELETE',
        headers: API_HEADERS
      });

      if (response.ok) {
        setCategories(categories.filter(c => c.id !== deleteConfirm.id));
        setDeleteConfirm({ isOpen: false, id: null, name: '' });
      } else {
        alert("Failed to delete category.");
      }
    } catch (err) {
      console.error("Error deleting category", err);
      alert("Network error while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    if (categories.length === 0) {
      alert("No categories to export!");
      return;
    }
    const headers = ["ID", "Category Name"];
    const csvContent = [
      headers.join(","),
      ...categories.map(c => `${c.id || c.category_id || ''},"${(c.name || '').replace(/"/g, '""')}"`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Categories_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="cat-manager">
      <div className="cat-header-bar">
        <div className="cat-toolbar">
          <div className="cat-search">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search categories..."
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
              <FiPlus /> Add Category
            </span>
            <div className="btn-glow"></div>
          </button>
        </div>
      </div>

      <div className="cat-table-container">
        {isLoading ? (
          <div className="cat-loading">Loading categories data...</div>
        ) : (
          <div className="table-responsive">
            <table className="cat-table">
              <thead>
                <tr>
                  <th>Category Profile</th>
                  <th>Category Name</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      No categories found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((category) => (
                    <tr key={category.id}>
                      <td>
                        <div className="cat-cell-profile">
                          <div className="cat-table-avatar">
                            {category.image ? (
                              <img src={category.image} alt={category.name} />
                            ) : (
                              <FiFolder style={{ fontSize: '1.2rem', color: '#000000' }} />
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cat-table-name">
                          <strong>{category.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="cat-badge badge-active">Active</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="cat-action-group">
                          <button className="cat-action-btn" onClick={() => openModal(category)} title="Edit">
                            <FiEdit2 />
                          </button>
                          <button className="cat-action-btn delete" onClick={() => handleDelete(category)} title="Delete">
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
              <h2>{editingId ? 'Edit Category' : 'Add New Category'}</h2>
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
                <input type="text" id="catName" value={name} onChange={e => setName(e.target.value)} placeholder=" " required />
                <label htmlFor="catName">Category Name</label>
              </div>

              <button type="submit" className="dash-btn" disabled={isSaving}>
                <span>{isSaving ? 'Saving...' : (editingId ? 'Update Category' : 'Add Category')}</span>
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
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        message="Are you sure you want to delete this category?"
        itemName={deleteConfirm.name}
        isLoading={isDeleting}
      />
    </div>
  );
}
