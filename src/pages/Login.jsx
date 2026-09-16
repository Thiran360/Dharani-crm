import React, { useState } from 'react';
import { FiLogIn } from 'react-icons/fi';
import './Login.css';
import logoVideo from '../assets/logo1.mp4';
import { API_BASE } from '../config/api';

function Login({ onLogin }) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mobile && password) {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/admin-login/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({ mobile, password }),
        });

        const data = await response.json();

        if (response.ok || data.success) {
          if (data.token || data.access) {
            localStorage.setItem('token', data.token || data.access);
          }
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
          onLogin();
        } else if (response.status === 404 && mobile === '9361244793') {
          // Fallback for volatile backend: if the default admin user doesn't exist, register them automatically
          try {
            const regResponse = await fetch(`${API_BASE}/store/register/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({ name: 'Admin', email: 'admin@admin.com', mobile, password, store_name: 'Main Store' })
            });
            const regData = await regResponse.json();
            if (regResponse.ok || regData.success) {
              if (regData.data) {
                localStorage.setItem('user', JSON.stringify(regData.data));
              }
              onLogin();
            } else {
              setError(regData.message || 'Auto-registration failed.');
            }
          } catch (regErr) {
            setError('Auto-registration network error.');
          }
        } else {
          setError(data.message || data.error || data.detail || 'Login failed. Please check your credentials.');
        }
      } catch (err) {
        setError('Network error. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="ultra-wrapper">
      <div className="diagonal-bg-green"></div>
      <div className="diagonal-bg-white"></div>

      <div className="ultra-container">
        <div className="ultra-branding">
          <div className="ultra-logo-box" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <filter id="remove-black-login">
                <feColorMatrix type="matrix" values="
                  1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  10 10 10 0 -0.5
                " />
              </filter>
            </svg>
            <video
              src={logoVideo}
              autoPlay
              loop
              muted
              playsInline
              className="ultra-brand-logo"
              style={{ filter: 'url(#remove-black-login)', objectFit: 'contain', width: '120px', height: '120px' }}
            />
            <div className="dash-brand-text" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', textAlign: 'left', alignItems: 'center', gap: '15px' }}>
              <span className="brand-dharani" style={{ fontSize: '3.2rem', fontWeight: 800, color: '#000000', fontFamily: 'Georgia, serif', lineHeight: 0.9, paddingRight: 0 }}>
                Vedan
              </span>
              <span className="brand-herbals" style={{ fontSize: '3.2rem', fontWeight: 800, color: '#000000', fontFamily: 'Georgia, serif', lineHeight: 0.9, position: 'relative', paddingRight: '22px' }}>
                Mart<sup style={{ fontSize: '1.2rem', position: 'absolute', top: '-5px', right: 0, fontFamily: 'sans-serif' }}>®</sup>
              </span>
            </div>
          </div>
          <p className="ultra-subtitle">Next-Gen CRM</p>
        </div>

        <div className="ultra-form-panel">
          <div className="ultra-form-header">
            <h2>Welcome</h2>
            <p>Access your dashboard</p>
          </div>
          <form className="ultra-form" onSubmit={handleSubmit}>
            {error && <div className="ultra-error">{error}</div>}
            <div className="ultra-input-group">
              <input
                type="tel"
                id="mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder=" "
                required
              />
              <label htmlFor="mobile">Mobile Number</label>
            </div>

            <div className="ultra-input-group">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                required
              />
              <label htmlFor="password">Password</label>
            </div>

            <div className="ultra-actions">
              <label className="ultra-checkbox">
                <input type="checkbox" />
                <span className="ultra-check"></span>
                Remember me
              </label>
            </div>

            <button type="submit" className="ultra-btn" disabled={isLoading}>
              <span style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '8px' }}>
                {isLoading ? 'Signing In...' : 'Sign In'} {!isLoading && <FiLogIn />}
              </span>
              <div className="btn-glow"></div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
