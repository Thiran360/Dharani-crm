import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { 
  FiGrid, FiUsers, FiBox, FiShoppingBag, 
  FiBarChart2, FiSettings, FiSearch, FiBell,
  FiDollarSign, FiTrendingUp, FiTrendingDown, FiMinus, FiUserPlus, FiLayers, FiImage, FiMenu, FiX, FiMessageSquare, FiTruck,
  FiFileText, FiChevronDown, FiChevronUp, FiShoppingCart, FiStar, FiActivity, FiHeart, FiPieChart, FiClock
} from 'react-icons/fi';
import './Dashboard.css';
import logoVideo from '../assets/logo1.mp4';
import CategoryManager from '../components/CategoryManager';
import ProductManager from '../components/ProductManager';
import SliderManager from '../components/SliderManager';
import CustomerManager from '../components/CustomerManager';
import StoreMemberManager from '../components/StoreMemberManager';
import OrderManager from '../components/OrderManager';
import EcomUserManager from '../components/EcomUserManager';
import DashboardOverview from '../components/DashboardOverview';
import BrandManager from '../components/BrandManager';
import ProductSalesReport from '../components/ProductSalesReport';
import TransactionManager from '../components/TransactionManager';
import ProductReviewManager from '../components/ProductReviewManager';
import StateShippingRates from '../components/StateShippingRates';
import OrdersReport from '../components/OrdersReport';
import UserCartReport from '../components/UserCartReport';
import UserWishlistReport from '../components/UserWishlistReport';
import { API_BASE, API_HEADERS } from '../config/api';

const TAB_INFO = {
  overview: {
    title: 'Executive Overview',
    subtitle: 'Live analytics and performance metrics for your store.'
  },
  products: {
    title: 'Products Management',
    subtitle: "Manage your store's product catalog, pricing, stock and details."
  },
  categories: {
    title: 'Category Management',
    subtitle: 'Organize products into categories and sub-categories.'
  },
  brands: {
    title: 'Brand Management',
    subtitle: 'Manage product brand names and logos.'
  },
  customers: {
    title: 'Customer Management',
    subtitle: 'View customer profiles, contacts and order history.'
  },
  orders: {
    title: 'Order Management',
    subtitle: 'Track, manage and process customer orders and invoices.'
  },
  transactions: {
    title: 'Transaction Logs',
    subtitle: 'View payment history, transactions and financial logs.'
  },
  ecom_users: {
    title: 'E-commerce Users',
    subtitle: 'Manage registered e-commerce customer accounts.'
  },
  store_members: {
    title: 'Store Members',
    subtitle: 'Manage internal staff, team members and admin roles.'
  },
  product_reviews: {
    title: 'Product Reviews',
    subtitle: 'Moderate and review customer product ratings and feedback.'
  },
  state_shipping: {
    title: 'State Shipping Rates',
    subtitle: 'Configure regional tax and state-wise shipping charges.'
  },
  sliders: {
    title: 'Banner Sliders',
    subtitle: 'Manage store homepage banners and carousel sliders.'
  },
  sales_report: {
    title: 'Product Sales Report',
    subtitle: 'Analyze sales performance, revenue trends and reports.'
  },
  orders_report: {
    title: 'Orders Analytics Report',
    subtitle: 'View order volume analytics, delivery status and metrics.'
  },
  user_cart_report: {
    title: 'User Cart Report',
    subtitle: 'Monitor active and abandoned customer shopping carts.'
  },
  user_wishlist_report: {
    title: 'User Wishlist Report',
    subtitle: 'Track customer wishlist trends and popular items.'
  }
};

const ROUTE_TAB_MAP = {
  '': 'overview',
  'overview': 'overview',
  'products': 'products',
  'categories': 'categories',
  'brands': 'brands',
  'customers': 'customers',
  'orders': 'orders',
  'transactions': 'transactions',
  'ecom-users': 'ecom_users',
  'ecom_users': 'ecom_users',
  'store-members': 'store_members',
  'store_members': 'store_members',
  'product-reviews': 'product_reviews',
  'product_reviews': 'product_reviews',
  'state-shipping': 'state_shipping',
  'state_shipping': 'state_shipping',
  'sliders': 'sliders',
  'sales-report': 'sales_report',
  'sales_report': 'sales_report',
  'orders-report': 'orders_report',
  'orders_report': 'orders_report',
  'user-cart-report': 'user_cart_report',
  'user_cart_report': 'user_cart_report',
  'user-wishlist-report': 'user_wishlist_report',
  'user_wishlist_report': 'user_wishlist_report',
};

const TAB_ROUTE_MAP = {
  overview: '/dashboard/overview',
  products: '/dashboard/products',
  categories: '/dashboard/categories',
  brands: '/dashboard/brands',
  customers: '/dashboard/customers',
  orders: '/dashboard/orders',
  transactions: '/dashboard/transactions',
  ecom_users: '/dashboard/ecom-users',
  store_members: '/dashboard/store-members',
  product_reviews: '/dashboard/product-reviews',
  state_shipping: '/dashboard/state-shipping',
  sliders: '/dashboard/sliders',
  sales_report: '/dashboard/sales-report',
  orders_report: '/dashboard/orders-report',
  user_cart_report: '/dashboard/user-cart-report',
  user_wishlist_report: '/dashboard/user-wishlist-report',
};

function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const pathSegment = location.pathname.replace(/^\/dashboard\/?/, '').split('/')[0];
  const activeTab = ROUTE_TAB_MAP[pathSegment] || 'overview';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(() => {
    return ['orders_report', 'user_cart_report', 'user_wishlist_report'].includes(activeTab);
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    if (['orders_report', 'user_cart_report', 'user_wishlist_report'].includes(activeTab)) {
      setIsReportsOpen(true);
    }
  }, [activeTab]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleTabSelect = (tabKey) => {
    const targetRoute = TAB_ROUTE_MAP[tabKey] || '/dashboard/overview';
    navigate(targetRoute);
    localStorage.setItem('activeTab', tabKey);
    setIsSidebarOpen(false);
  };

  const fetchNotifications = useCallback(async (showLoader = false) => {
    if (showLoader) setNotificationsLoading(true);
    const ts = Date.now();

    try {
      const [ordersRes, reviewsRes, productsRes] = await Promise.all([
        fetch(`${API_BASE}/orders/?_t=${ts}`, { headers: API_HEADERS }).catch(() => null),
        fetch(`${API_BASE}/crm/reviews/?_t=${ts}`, { headers: API_HEADERS }).catch(() => null),
        fetch(`${API_BASE}/store/products/?_t=${ts}`, { headers: API_HEADERS }).catch(() => null),
      ]);

      const items = [];

      if (ordersRes?.ok) {
        const ordersData = await ordersRes.json();
        const orders = Array.isArray(ordersData)
          ? ordersData
          : (
            ordersData.data
            || ordersData.results
            || ordersData.orders
            || Object.values(ordersData).find(Array.isArray)
            || []
          );

        orders
          .filter(o => ['pending', 'processing'].includes(String(o.status || '').toLowerCase()))
          .slice(0, 8)
          .forEach(o => {
            items.push({
              id: `order-${o.order_id || o.id}`,
              type: 'order',
              tab: 'orders',
              title: `Pending order #${o.order_id || o.order_no || o.id}`,
              message: `${o.customer || 'Customer'} · ₹${parseFloat(o.total_amount || o.total || 0).toFixed(2)}`,
              time: o.created_at,
            });
          });
      }

      if (reviewsRes?.ok) {
        const reviewsData = await reviewsRes.json();
        const reviews = Array.isArray(reviewsData) ? reviewsData : (reviewsData.results || []);

        reviews
          .filter(r => !r.approved)
          .slice(0, 5)
          .forEach(r => {
            items.push({
              id: `review-${r.id}`,
              type: 'review',
              tab: 'product_reviews',
              title: 'Review awaiting approval',
              message: `${r.customerName || r.customer_name || 'Customer'} · ${r.productName || r.product_name || 'Product'}`,
              time: r.date || r.created_at,
            });
          });
      }

      if (productsRes?.ok) {
        const productsData = await productsRes.json();
        const products = Array.isArray(productsData)
          ? productsData
          : (productsData.data || productsData.results || productsData.products || []);

        products
          .filter(p => {
            const stock = parseInt(p.stock ?? p.quantity ?? p.qty, 10);
            return !Number.isNaN(stock) && stock >= 0 && stock <= 10;
          })
          .slice(0, 5)
          .forEach(p => {
            items.push({
              id: `product-${p.id}`,
              type: 'product',
              tab: 'products',
              title: 'Low stock alert',
              message: `${p.name || p.product_name || 'Product'} · ${p.stock ?? 0} left`,
              time: null,
            });
          });
      }

      items.sort((a, b) => {
        const ta = a.time ? new Date(a.time).getTime() : 0;
        const tb = b.time ? new Date(b.time).getTime() : 0;
        return tb - ta;
      });

      setNotifications(items.slice(0, 12));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      if (showLoader) setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(false), 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const handleNotificationClick = (notification) => {
    handleTabSelect(notification.tab);
    setShowNotifications(false);
    setIsSidebarOpen(false);
  };

  const toggleNotifications = () => {
    setShowNotifications(prev => {
      const next = !prev;
      if (next) fetchNotifications(true);
      return next;
    });
  };

  const formatNotificationTime = (time) => {
    if (!time) return 'Just now';
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return 'Recently';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="ultra-dash-wrapper">
      <div className="dash-bg-shapes">
        <div className="dash-shape dash-shape-1"></div>
        <div className="dash-shape dash-shape-2"></div>
      </div>
      
      <div className="ultra-dash-layout">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        {/* Floating Sidebar */}
        <aside className={`ultra-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-brand-container">
            <div className="sidebar-brand-pill">
               <svg width="0" height="0" style={{ position: 'absolute' }}>
                 <filter id="remove-black-dash">
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
                 className="dash-brand-logo" 
                 style={{ filter: 'url(#remove-black-dash)' }}
               />
               <div className="dash-brand-text" style={{ flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                 <span className="brand-dharani" style={{ paddingRight: 0 }}>Vedan</span>
                 <span className="brand-herbals">Mart<sup style={{ fontSize: '0.6rem', fontWeight: '600', marginLeft: '2px', verticalAlign: 'super', opacity: 0.8, fontFamily: 'sans-serif' }}>®</sup></span>
               </div>
            </div>
            <button className="sidebar-close-btn mobile-close-btn" onClick={() => setIsSidebarOpen(false)} title="Close Menu">
              <FiX />
            </button>
          </div>
          <nav className="sidebar-menu">
            <a href="#" className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabSelect('overview'); }}>
              <span className="menu-icon"><FiGrid /></span> Dashboard
            </a>
            <a href="#" className={`menu-item ${activeTab === 'products' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabSelect('products'); }}>
              <span className="menu-icon"><FiShoppingBag /></span> Products
            </a>
            <a href="#" className={`menu-item ${activeTab === 'categories' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabSelect('categories'); }}>
              <span className="menu-icon"><FiLayers /></span> Categories
            </a>
            <a href="#" className={`menu-item ${activeTab === 'brands' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabSelect('brands'); }}>
              <span className="menu-icon"><FiBox /></span> Brands
            </a>
            <a href="#" className={`menu-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabSelect('customers'); }}>
              <span className="menu-icon"><FiUsers /></span> Customers
            </a>
            <a href="#" className={`menu-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabSelect('orders'); }}>
              <span className="menu-icon"><FiBox /></span> Orders
            </a>
            <a href="#" className={`menu-item ${activeTab === 'transactions' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabSelect('transactions'); }}>
              <span className="menu-icon"><FiDollarSign /></span> Transactions
            </a>
            <a href="#" className={`menu-item ${activeTab === 'ecom_users' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabSelect('ecom_users'); }}>
              <span className="menu-icon"><FiUsers /></span> Ecom Users
            </a>
            <a href="#" className={`menu-item ${activeTab === 'store_members' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabSelect('store_members'); }}>
              <span className="menu-icon"><FiUserPlus /></span> Store Members
            </a>
            <a href="#" className={`menu-item ${activeTab === 'product_reviews' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabSelect('product_reviews'); }}>
              <span className="menu-icon"><FiMessageSquare /></span> Product Reviews
            </a>
            <a href="#" className={`menu-item ${activeTab === 'state_shipping' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabSelect('state_shipping'); }}>
              <span className="menu-icon"><FiTruck /></span> State Shipping Rates
            </a>
            <a href="#" className={`menu-item ${activeTab === 'sliders' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabSelect('sliders'); }}>
              <span className="menu-icon"><FiImage /></span> Sliders
            </a>
            <a href="#" className={`menu-item ${activeTab === 'sales_report' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabSelect('sales_report'); }}>
              <span className="menu-icon"><FiBarChart2 /></span> Sales Report
            </a>

            <div className="menu-group">
              <a href="#" className="menu-item" onClick={(e) => { e.preventDefault(); setIsReportsOpen(!isReportsOpen); }}>
                <span className="menu-icon"><FiFileText /></span> Reports
                <span className="menu-arrow" style={{ marginLeft: 'auto', transform: isReportsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}><FiChevronDown /></span>
              </a>
              {isReportsOpen && (
                <div className="submenu" style={{ display: 'flex', flexDirection: 'column', paddingLeft: '2rem', marginTop: '0.2rem', gap: '0.2rem' }}>
                  <a href="#" className={`menu-item ${activeTab === 'orders_report' ? 'active' : ''}`} style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }} onClick={(e) => { e.preventDefault(); handleTabSelect('orders_report'); }}>
                    <span className="menu-icon menu-icon-accent menu-icon-accent--gold"><FiActivity size={14} /></span> Orders Report
                  </a>
                  <a href="#" className={`menu-item ${activeTab === 'user_cart_report' ? 'active' : ''}`} style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }} onClick={(e) => { e.preventDefault(); handleTabSelect('user_cart_report'); }}>
                    <span className="menu-icon menu-icon-accent menu-icon-accent--botanical"><FiShoppingBag size={14} /></span> User Cart Report
                  </a>
                  <a href="#" className={`menu-item ${activeTab === 'user_wishlist_report' ? 'active' : ''}`} style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }} onClick={(e) => { e.preventDefault(); handleTabSelect('user_wishlist_report'); }}>
                    <span className="menu-icon menu-icon-accent menu-icon-accent--brown"><FiHeart size={14} /></span> User Wishlist Report
                  </a>
                </div>
              )}
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="ultra-main">
          {/* Floating Header */}
          <header className={`ultra-header${showNotifications ? ' notifications-open' : ''}`}>
            <div className="header-left">
              <button className="hamburger-btn" onClick={toggleSidebar}>
                <FiMenu />
              </button>
              <div className="header-page-info">
                <h1 className="header-page-title">{TAB_INFO[activeTab]?.title || 'Dashboard'}</h1>
                <p className="header-page-subtitle">{TAB_INFO[activeTab]?.subtitle || ''}</p>
              </div>
            </div>
            <div className="header-actions">
              <div className="notification-wrap" ref={notificationRef}>
                <button
                  type="button"
                  className={`icon-btn notification-btn ${showNotifications ? 'active' : ''}`}
                  onClick={toggleNotifications}
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <FiBell />
                  {notifications.length > 0 && (
                    <span className="notification-badge">{notifications.length > 9 ? '9+' : notifications.length}</span>
                  )}
                </button>

                {showNotifications && (
                  <div className="notification-panel">
                    <div className="notification-panel-header">
                      <h3>Notifications</h3>
                      <span className="notification-count">{notifications.length} alert{notifications.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="notification-panel-body">
                      {notificationsLoading ? (
                        <div className="notification-empty">Loading notifications...</div>
                      ) : notifications.length === 0 ? (
                        <div className="notification-empty">No new notifications</div>
                      ) : (
                        notifications.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            className="notification-item"
                            onClick={() => handleNotificationClick(item)}
                          >
                            <span className={`notification-icon notification-icon--${item.type}`}>
                              {item.type === 'order' && <FiShoppingBag />}
                              {item.type === 'review' && <FiMessageSquare />}
                              {item.type === 'product' && <FiBox />}
                            </span>
                            <span className="notification-content">
                              <strong>{item.title}</strong>
                              <span>{item.message}</span>
                              <small><FiClock /> {formatNotificationTime(item.time)}</small>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="user-profile" onClick={onLogout} title="Click to logout">
                <div className="avatar">VM</div>
                <div className="user-info">
                  <span className="user-name">Vedan mart</span>
                </div>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="ultra-content">
            <Routes>
              <Route path="/" element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<DashboardOverview />} />
              <Route path="categories" element={<CategoryManager />} />
              <Route path="brands" element={<BrandManager />} />
              <Route path="customers" element={<CustomerManager />} />
              <Route path="orders" element={<OrderManager />} />
              <Route path="ecom-users" element={<EcomUserManager />} />
              <Route path="ecom_users" element={<Navigate to="../ecom-users" replace />} />
              <Route path="products" element={<ProductManager />} />
              <Route path="product-reviews" element={<ProductReviewManager />} />
              <Route path="product_reviews" element={<Navigate to="../product-reviews" replace />} />
              <Route path="sliders" element={<SliderManager />} />
              <Route path="store-members" element={<StoreMemberManager />} />
              <Route path="store_members" element={<Navigate to="../store-members" replace />} />
              <Route path="sales-report" element={<ProductSalesReport />} />
              <Route path="sales_report" element={<Navigate to="../sales-report" replace />} />
              <Route path="transactions" element={<TransactionManager />} />
              <Route path="state-shipping" element={<StateShippingRates />} />
              <Route path="state_shipping" element={<Navigate to="../state-shipping" replace />} />
              <Route path="orders-report" element={<OrdersReport />} />
              <Route path="orders_report" element={<Navigate to="../orders-report" replace />} />
              <Route path="user-cart-report" element={<UserCartReport />} />
              <Route path="user_cart_report" element={<Navigate to="../user-cart-report" replace />} />
              <Route path="user-wishlist-report" element={<UserWishlistReport />} />
              <Route path="user_wishlist_report" element={<Navigate to="../user-wishlist-report" replace />} />
              <Route path="*" element={<Navigate to="overview" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
