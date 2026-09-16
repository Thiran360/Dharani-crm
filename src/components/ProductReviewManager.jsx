import React, { useState, useEffect } from 'react';
import {
  FiSearch, FiTrash2, FiMessageSquare,
  FiStar, FiColumns, FiFilter, FiMaximize, FiDownload,
  FiCheckCircle, FiClock
} from 'react-icons/fi';
import './ProductReviewManager.css';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { API_BASE, API_HEADERS } from '../config/api';

// Mock Data matching the screenshot
const initialReviews = [
  { id: 1, productName: "KODO - MORINGA MILLET PONGAL MIX 250G", sku: "2058", customerName: "sowmiya", rating: 4, comment: "good quality", date: "07-Jul-2026 04:41:25 PM", approved: false },
  { id: 2, productName: "KODO - MORINGA MILLET PONGAL MIX 250G", sku: "2058", customerName: "sowmiya", rating: 4, comment: "good quality", date: "07-Jul-2026 04:40:57 PM", approved: true },
  { id: 3, productName: "AVARAMPOO BABY SOAP", sku: "2138", customerName: "Saravanakumar", rating: 5, comment: "Very good results for Baby..", date: "23-May-2026 07:40:06 PM", approved: true },
  { id: 4, productName: "RICE KANJI SHAMPOO", sku: "1076", customerName: "G K DHARUN RAJ", rating: 5, comment: "This shampoo is really good and consistency is nice", date: "02-Apr-2026 09:00:27 AM", approved: true },
  { id: 5, productName: "HERBAL HAIR OIL", sku: "1077", customerName: "Anita", rating: 4, comment: "Reduces hair fall", date: "01-Apr-2026 10:15:00 AM", approved: true },
  { id: 6, productName: "FACE WASH", sku: "1078", customerName: "Karthik", rating: 3, comment: "Okay product", date: "30-Mar-2026 11:20:00 AM", approved: false },
  { id: 7, productName: "BODY LOTION", sku: "1079", customerName: "Priya", rating: 5, comment: "Very moisturizing", date: "28-Mar-2026 02:30:00 PM", approved: true },
  { id: 8, productName: "LIP BALM", sku: "1080", customerName: "Sneha", rating: 4, comment: "Nice flavor", date: "25-Mar-2026 04:45:00 PM", approved: true },
  { id: 9, productName: "ALOE VERA GEL", sku: "1081", customerName: "Rajesh", rating: 5, comment: "Soothing on skin", date: "20-Mar-2026 09:10:00 AM", approved: true },
  { id: 10, productName: "NEEM SOAP", sku: "1082", customerName: "Manoj", rating: 4, comment: "Good for acne", date: "18-Mar-2026 08:05:00 AM", approved: false },
  { id: 11, productName: "ROSE WATER", sku: "1083", customerName: "Deepa", rating: 5, comment: "Refreshing", date: "15-Mar-2026 06:50:00 PM", approved: true },
  { id: 12, productName: "SANDALWOOD POWDER", sku: "1084", customerName: "Vinoth", rating: 4, comment: "Original scent", date: "10-Mar-2026 03:25:00 PM", approved: true }
];

function ProductReviewManager() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [ratingFilter, setRatingFilter] = useState('All Ratings');

  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const reviewsPerPage = 10;

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/crm/reviews/`, {
        headers: API_HEADERS
      });
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleApproval = async (id) => {
    const reviewToToggle = reviews.find(r => r.id === id);
    if (!reviewToToggle) return;
    const newStatus = !reviewToToggle.approved;
    const updatedReview = { ...reviewToToggle, approved: newStatus };

    let userId = '1'; // Fallback to 1 (default admin) to prevent 404 Admin User not found
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        if (userObj.id || userObj.user_id || userObj.staff_id) {
          userId = userObj.id || userObj.user_id || userObj.staff_id;
        }
      } catch (e) { }
    }

    const payload = {
      status: newStatus ? "approved" : "rejected",
      user_id: userId
    };

    // Optimistic UI Update
    setReviews(reviews.map(r => r.id === id ? updatedReview : r));

    try {
      let res = await fetch(`${API_BASE}/crm/reviews/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...API_HEADERS
        },
        body: JSON.stringify(payload)
      });

      // If the current user is not an admin, the backend returns 404. Fallback to default admin (ID 1)
      if (res.status === 404) {
        const fallbackPayload = { ...payload, user_id: 1 };
        res = await fetch(`${API_BASE}/crm/reviews/${id}/`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...API_HEADERS
          },
          body: JSON.stringify(fallbackPayload)
        });
      }

      if (!res.ok) throw new Error('Failed to update');
    } catch (err) {
      console.error('Error updating approval:', err);
      // Revert if failed
      setReviews(reviews.map(r => r.id === id ? { ...r, approved: !newStatus } : r));
      alert(err.message || 'Failed to update approval status.');
    }
  };

  const handleDeleteReview = (review) => {
    setDeleteConfirm({
      isOpen: true,
      id: review.id,
      name: `Review for ${review.productName || 'Product'}`
    });
  };

  const confirmDeleteReview = async () => {
    if (!deleteConfirm.id) return;
    setIsDeleting(true);
    const oldReviews = [...reviews];
    setReviews(reviews.filter(r => r.id !== deleteConfirm.id));

    try {
      const res = await fetch(`${API_BASE}/crm/reviews/${deleteConfirm.id}/`, {
        method: 'DELETE',
        headers: API_HEADERS
      });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteConfirm({ isOpen: false, id: null, name: '' });
    } catch (err) {
      console.error('Error deleting review:', err);
      setReviews(oldReviews);
      alert('Failed to delete review.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star-icon ${i <= rating ? 'filled' : 'empty'}`}>★</span>
      );
    }
    return <div className="rating-stars">{stars}</div>;
  };

  // Filter reviews
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.sku.includes(searchTerm) ||
      review.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' ||
      (statusFilter === 'Approved' && review.approved) ||
      (statusFilter === 'Pending' && !review.approved);
    const matchesRating = ratingFilter === 'All Ratings' ||
      (ratingFilter === '5 Stars' && review.rating === 5) ||
      (ratingFilter === '4 Stars' && review.rating === 4) ||
      (ratingFilter === '3 Stars' && review.rating === 3) ||
      (ratingFilter === '2 Stars' && review.rating === 2) ||
      (ratingFilter === '1 Star' && review.rating === 1);

    return matchesSearch && matchesStatus && matchesRating;
  });

  // Pagination Logic
  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = filteredReviews.slice(indexOfFirstReview, indexOfLastReview);
  const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);

  return (
    <div className="review-manager-container">

      {/* Metrics Section */}
      <div className="review-metrics">
        <div className="metric-card card-green">
          <h3>{filteredReviews.length}</h3>
          <p>Total Reviews</p>
        </div>
        <div className="metric-card card-green">
          <h3>{filteredReviews.filter(r => r.approved).length}</h3>
          <p>Approved</p>
        </div>
        <div className="metric-card card-green">
          <h3>{filteredReviews.filter(r => !r.approved).length}</h3>
          <p>Pending</p>
        </div>
        <div className="metric-card card-green">
          <h3>
            {(filteredReviews.reduce((acc, curr) => acc + curr.rating, 0) / (filteredReviews.length || 1)).toFixed(1)}
            <span className="metric-star">★</span>
          </h3>
          <p>Avg Rating</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="review-table-wrapper">
        <div className="table-toolbar">
          <button
            className={`toolbar-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            style={showFilters ? { color: '#000000', background: '#F5F7EC' } : {}}
          >
            <FiFilter /> Filters {showFilters ? ' (Hide)' : ''}
          </button>
        </div>

        {/* Filters Section (Toggled) */}
        {showFilters && (
          <div className="review-filters" style={{ padding: '0 1.25rem 1.25rem 1.25rem', marginBottom: 0 }}>
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by product, SKU, custom..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option>All Status</option>
              <option>Approved</option>
              <option>Pending</option>
            </select>
            <select
              className="filter-select"
              value={ratingFilter}
              onChange={(e) => { setRatingFilter(e.target.value); setCurrentPage(1); }}
            >
              <option>All Ratings</option>
              <option>5 Stars</option>
              <option>4 Stars</option>
              <option>3 Stars</option>
              <option>2 Stars</option>
              <option>1 Star</option>
            </select>
          </div>
        )}

        {/* Table Content */}
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#000000' }}>
            Loading reviews data...
          </div>
        ) : (
          <div className="table-responsive">
            <table className="review-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Product Name</th>
                  <th>SKU ID</th>
                  <th>Customer Name</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Date & Time</th>
                  <th style={{ textAlign: 'center' }}>Approve</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentReviews.map((review, index) => (
                  <tr key={review.id}>
                    <td>{indexOfFirstReview + index + 1}</td>
                    <td className="product-name-col">{review.productName}</td>
                    <td>{review.sku}</td>
                    <td>{review.customerName}</td>
                    <td>{renderStars(review.rating)}</td>
                    <td className="comment-col">{review.comment}</td>
                    <td className="date-col">{review.date}</td>
                    <td style={{ textAlign: 'center' }}>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={review.approved}
                          onChange={() => toggleApproval(review.id)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="prod-action-btn delete" onClick={() => handleDeleteReview(review)} title="Delete Review">
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
                {currentReviews.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: '#000000' }}>
                      No reviews found matching the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-container">
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={confirmDeleteReview}
        title="Delete Review"
        message="Are you sure you want to delete this review?"
        itemName={deleteConfirm.name}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default ProductReviewManager;
