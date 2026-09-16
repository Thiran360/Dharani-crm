import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiPlus, FiTrash2, FiImage, FiX, FiCheck } from 'react-icons/fi';
import './SliderManager.css';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { API_BASE, API_HEADERS } from '../config/api';

export default function SliderManager() {
  const [sliders, setSliders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [textOverlay, setTextOverlay] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSliders();
  }, []);

  const fetchSliders = async () => {
    try {
      const res = await fetch(`${API_BASE}/sliders/`, {
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
        items = data.results || data.data || data.sliders || Object.values(data).find(Array.isArray) || [];
      }

      setSliders(items);
    } catch (err) {
      console.error("Error fetching sliders", err);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = () => {
    setStatus({ type: '', message: '' });
    setTextOverlay('');
    setImagePreview('');
    setImage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) {
      setStatus({ type: 'error', message: 'Image is required for slider.' });
      return;
    }
    setIsSaving(true);
    setStatus({ type: '', message: '' });

    const submitData = new FormData();
    submitData.append('text_overlay', textOverlay);
    submitData.append('title', textOverlay); // Fallback in case backend uses title
    submitData.append('image', image);

    try {
      const response = await fetch(`${API_BASE}/sliders/`, { method: 'POST', body: submitData, headers: API_HEADERS });
      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'Slider created successfully!' });
        fetchSliders();
        setTimeout(closeModal, 1500);
      } else {
        setStatus({ type: 'error', message: data.message || 'Failed to save slider.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (slider) => {
    setDeleteConfirm({
      isOpen: true,
      id: slider.id,
      name: slider.text_overlay || slider.title || 'Slider Banner'
    });
  };

  const confirmDeleteSlider = async () => {
    if (!deleteConfirm.id) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`${API_BASE}/sliders/${deleteConfirm.id}/`, { method: 'DELETE', headers: API_HEADERS });
      if (response.ok) {
        fetchSliders();
        setDeleteConfirm({ isOpen: false, id: null, name: '' });
      } else {
        alert('Failed to delete slider.');
      }
    } catch (err) {
      alert('Network error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="slider-manager">
      <div className="page-header slider-header-actions" style={{ justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <button className="ultra-btn" onClick={openModal} style={{ width: 'auto', margin: 0, padding: '0.8rem 1.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
            <FiPlus /> Add Slider
          </span>
          <div className="btn-glow"></div>
        </button>
      </div>

      {isLoading ? (
        <p>Loading sliders...</p>
      ) : (
        <div className="slider-grid">
          {sliders.length === 0 ? (
            <p>No sliders found.</p>
          ) : (
            sliders.map(slider => (
              <div key={slider.id} className="slider-card">
                <div className="slider-image-container">
                  {slider.image ? (
                    <img src={slider.image} alt="Slider" className="slider-image" />
                  ) : (
                    <FiImage className="slider-placeholder" />
                  )}
                  {(slider.text_overlay || slider.title) && (
                    <div className="slider-text-overlay">
                      {slider.text_overlay || slider.title}
                    </div>
                  )}
                </div>
                <div className="slider-actions">
                  <button className="cat-btn cat-btn-delete" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleDelete(slider)}>
                    <FiTrash2 /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isModalOpen && createPortal(
        <div className="cat-modal-overlay">
          <div className="cat-modal" style={{ maxWidth: '600px' }}>
            <div className="cat-modal-header">
              <h2>New Slider</h2>
              <button className="cat-close-btn" onClick={closeModal}><FiX /></button>
            </div>

            {status.message && (
              <div className={`dash-${status.type} cat-status`}>
                {status.message}
              </div>
            )}

            <form className="dash-form" onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>

              <div className="dash-input-group">
                <input
                  type="text"
                  id="textOverlay"
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value)}
                  placeholder=" "
                />
                <label htmlFor="textOverlay">Text Overlay (Optional)</label>
              </div>

              <div className="cat-file-upload slider-upload">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="slider-preview-img" />
                ) : (
                  <>
                    <FiImage style={{ fontSize: '2.5rem', marginBottom: '0.8rem', color: '#000000' }} />
                    <span style={{ color: '#000000' }}>Click to upload slider image (16:9 recommended)</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} required />
              </div>

              <button type="submit" className="dash-btn" disabled={isSaving}>
                <span>{isSaving ? 'Saving...' : 'Save Slider'}</span>
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
        onConfirm={confirmDeleteSlider}
        title="Delete Slider Banner"
        message="Are you sure you want to delete this slider banner?"
        itemName={deleteConfirm.name}
        isLoading={isDeleting}
      />
    </div>
  );
}
