import React from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiX, FiTrash2 } from 'react-icons/fi';
import './ConfirmDeleteModal.css';

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Item",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  itemName = "",
  isLoading = false
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="confirm-modal-close" onClick={onClose}>
          <FiX />
        </button>

        <div className="confirm-modal-icon-wrap">
          <div className="confirm-modal-icon-badge">
            <FiAlertTriangle />
          </div>
        </div>

        <div className="confirm-modal-body">
          <h3 className="confirm-modal-title">{title}</h3>
          <p className="confirm-modal-message">
            {message}
            {itemName && <strong className="confirm-item-name"> "{itemName}"</strong>}
          </p>
        </div>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="confirm-btn-delete"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="confirm-loading">Deleting...</span>
            ) : (
              <>
                <FiTrash2 style={{ marginRight: '6px' }} /> Yes, Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
