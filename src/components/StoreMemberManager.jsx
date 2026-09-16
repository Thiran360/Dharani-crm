import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiUserPlus, FiPhone, FiX, FiShield, FiTrash2 } from 'react-icons/fi';
import './StoreMemberManager.css';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { API_BASE, API_HEADERS } from '../config/api';

export default function StoreMemberManager() {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Registration Form State
  const [storeMemberData, setStoreMemberData] = useState({ name: '', email: '', mobile: '', password: '', store_name: '', store_address: '' });
  const [storeMemberStatus, setStoreMemberStatus] = useState({ type: '', message: '' });
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/staff/`, {
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
        items = data.results || data.data || data.staff || Object.values(data).find(Array.isArray) || [];
      }

      // Handle single object return
      if (items.length === 0 && data && data.id) {
        items = [data];
      }



      setMembers(items);
    } catch (err) {
      console.error("Error fetching members", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'SM';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleRegisterMember = async (e) => {
    e.preventDefault();
    setStoreMemberStatus({ type: '', message: '' });
    setIsRegistering(true);

    try {
      const payload = {
        fullname: storeMemberData.name,
        email: storeMemberData.email,
        mobile: storeMemberData.mobile,
        store_name: storeMemberData.store_name,
        store_address: storeMemberData.store_address,
        address: storeMemberData.store_address
      };
      const response = await fetch(`${API_BASE}/store/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...API_HEADERS },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Attempt to create the address using the backend's expected payload
        try {
          const registeredUser = data.data || data;
          const userId = registeredUser.id || registeredUser.user_id || (registeredUser.user && registeredUser.user.id) || 9;
          const addressPayload = {
            user_id: userId,
            full_name: storeMemberData.name || "Staff User",
            phone: storeMemberData.mobile || "9876543210",
            address: storeMemberData.store_address || "No. 12, Anna Nagar",
            city: "Chennai",
            state: "Tamil Nadu",
            pincode: "600040",
            latitude: 13.0827,
            longitude: 80.2707,
            is_default: true
          };
          await fetch(`${API_BASE}/address/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...API_HEADERS
            },
            body: JSON.stringify(addressPayload)
          });
        } catch (addrErr) {
          console.error("Failed to post address payload:", addrErr);
        }

        setStoreMemberStatus({ type: 'success', message: 'Store member created successfully!' });
        setStoreMemberData({ name: '', email: '', mobile: '', store_name: '', store_address: '' });
        fetchMembers(); // Refresh table
        setTimeout(() => setIsModalOpen(false), 1500);
      } else {
        setStoreMemberStatus({ type: 'error', message: data.message || data.error || 'Failed to create store member.' });
      }
    } catch (err) {
      setStoreMemberStatus({ type: 'error', message: 'Network error. Please try again later.' });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeleteMember = (member) => {
    setDeleteConfirm({
      isOpen: true,
      id: member.id,
      name: member.name || member.username || ''
    });
  };

  const confirmDeleteMember = async () => {
    if (!deleteConfirm.id) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`${API_BASE}/delete/store-staff/${deleteConfirm.id}/`, {
        method: 'DELETE',
        headers: API_HEADERS
      });

      if (response.ok || response.status === 204) {
        setMembers(members.filter(m => m.id !== deleteConfirm.id));
        setDeleteConfirm({ isOpen: false, id: null, name: '' });
      } else {
        alert("Failed to delete member.");
      }
    } catch (err) {
      console.error("Error deleting member", err);
      alert("Network error while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="storemember-manager">
      <div className="storemember-header-bar" style={{ justifyContent: 'flex-end' }}>
        <div className="storemember-toolbar">
          <button className="ultra-btn" onClick={() => { setStoreMemberStatus({ type: '', message: '' }); setIsModalOpen(true); }} style={{ margin: 0, width: 'auto', padding: '0.6rem 1.2rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <FiUserPlus /> Add Member
            </span>
            <div className="btn-glow"></div>
          </button>
        </div>
      </div>

      <div className="storemember-table-container">
        {isLoading ? (
          <div className="storemember-loading">Loading store members data...</div>
        ) : (
          <div className="table-responsive">
            <table className="storemember-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      No store members found.
                    </td>
                  </tr>
                ) : (
                  members.map((member, index) => (
                    <tr key={member.id || index}>
                      <td>
                        <div className="storemember-cell-profile">
                          <div className="storemember-table-avatar">
                            {getInitials(member.name || member.username)}
                          </div>
                          <div className="storemember-table-name">
                            <strong>{member.name || member.username || 'Unknown'}</strong>
                            {member.email && <span className="storemember-table-email">{member.email}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="storemember-table-contact">
                          <span><FiPhone /> {member.mobile || member.phone || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="storemember-badge badge-active">
                          <FiShield style={{ marginRight: '4px' }} /> {member.role || 'Staff'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="storemember-action-btn delete" onClick={() => handleDeleteMember(member)} title="Delete Member">
                          <FiTrash2 />
                        </button>
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
          <div className="cat-modal" style={{ maxWidth: '500px' }}>
            <div className="cat-modal-header">
              <h2>Register Store Member</h2>
              <button className="cat-close-btn" onClick={() => setIsModalOpen(false)}><FiX /></button>
            </div>

            {storeMemberStatus.message && (
              <div className={`dash-${storeMemberStatus.type} cat-status`}>
                {storeMemberStatus.message}
              </div>
            )}

            <form className="dash-form" onSubmit={handleRegisterMember} style={{ marginTop: '1.5rem' }}>
              <div className="dash-input-group">
                <input type="text" id="name" value={storeMemberData.name} onChange={e => setStoreMemberData({ ...storeMemberData, name: e.target.value })} placeholder=" " required />
                <label htmlFor="name">Full Name</label>
              </div>
              <div className="dash-input-group">
                <input type="email" id="email" value={storeMemberData.email} onChange={e => setStoreMemberData({ ...storeMemberData, email: e.target.value })} placeholder=" " required />
                <label htmlFor="email">Email Address</label>
              </div>
              <div className="dash-input-group">
                <input type="tel" id="mobile" value={storeMemberData.mobile} onChange={e => setStoreMemberData({ ...storeMemberData, mobile: e.target.value })} placeholder=" " required />
                <label htmlFor="mobile">Mobile Number</label>
              </div>
              <div className="dash-input-group">
                <input type="text" id="store_address" value={storeMemberData.store_address} onChange={e => setStoreMemberData({ ...storeMemberData, store_address: e.target.value })} placeholder=" " required />
                <label htmlFor="store_address">Address</label>
              </div>

              <div className="dash-input-group">
                <input type="text" id="store_name" value={storeMemberData.store_name} onChange={e => setStoreMemberData({ ...storeMemberData, store_name: e.target.value })} placeholder=" " required />
                <label htmlFor="store_name">Store Name</label>
              </div>

              <button type="submit" className="dash-btn" disabled={isRegistering}>
                <span>{isRegistering ? 'Creating Member...' : 'Create Store Member'}</span>
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
        onConfirm={confirmDeleteMember}
        title="Delete Store Member"
        message="Are you sure you want to delete this store member?"
        itemName={deleteConfirm.name}
        isLoading={isDeleting}
      />
    </div>
  );
}
