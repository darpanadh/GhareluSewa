import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Bell, LogOut, Home, Search, Calendar, User, ChevronDown, Shield, BarChart2, LayoutGrid, Clock, TrendingUp, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../services/api';
import { onNotification } from '../services/socket';
import { ToastContainer } from './ToastContainer';

export const Header = () => {
  const { user, logout, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toastRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch initial notifications
      notificationAPI.getNotifications({ limit: 5 })
        .then(res => {
          const fetchedNotifs = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
          setNotifications(fetchedNotifs);
        })
        .catch(err => console.warn('Failed to fetch notifications', err));

      notificationAPI.getUnreadCount()
        .then(res => {
          setUnreadCount(res.data?.count || 0);
        })
        .catch(err => console.warn('Failed to fetch unread count', err));

      // Listen for incoming socket notifications
      onNotification((data) => {
        setNotifications(prev => [{ ...data, id: Date.now(), created_at: new Date().toISOString() }, ...prev]);
        setUnreadCount(prev => prev + 1);
        toastRef.current?.addToast(data.message, data.type, data.bookingId);
      });
    }
  }, [isAuthenticated]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.warn('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn('Failed to mark all as read', err);
    }
  };

  const getRolePath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'customer':
        return '/customer';
      case 'provider':
        return '/provider';
      case 'admin':
        return '/admin';
      default:
        return '/';
    }
  };

  const getRoleBadge = () => {
    if (!user) return null;
    switch (user.role) {
      case 'admin':
        return { label: 'ADMIN', color: '#6366f1', bg: '#ede9fe' };
      case 'provider':
        return { label: 'PROVIDER', color: '#0ea5e9', bg: '#e0f2fe' };
      default:
        return { label: 'CUSTOMER', color: '#07535f', bg: '#e6f4f6' };
    }
  };
  const roleBadge = getRoleBadge();


  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to={isAuthenticated && user?.role === 'customer' ? '/customer' : '/'} className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#07535f] flex items-center justify-center text-white font-extrabold text-2xl font-serif">
              G
            </div>
            <span className="font-bold text-2xl flex items-center tracking-tight">
              <span className="text-[#07535f]">Gharelu</span>
              <span className="text-[#10b981]">Sewa</span>
            </span>
          </Link>

          {/* Center Navigation — role-aware */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            {user?.role === 'provider' ? (
              /* Provider Nav */
              <>
                <Link
                  to="/provider"
                  className={`flex items-center gap-1.5 hover:text-[#07535f] transition-colors ${
                    location.pathname === '/provider' ? 'text-[#07535f] font-semibold' : ''
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/provider/bookings"
                  className={`flex items-center gap-1.5 hover:text-[#07535f] transition-colors ${
                    location.pathname === '/provider/bookings' ? 'text-[#07535f] font-semibold' : ''
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>My Bookings</span>
                </Link>
                <Link
                  to="/provider/schedule"
                  className={`flex items-center gap-1.5 hover:text-[#07535f] transition-colors ${
                    location.pathname === '/provider/schedule' ? 'text-[#07535f] font-semibold' : ''
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Schedule</span>
                </Link>
                <Link
                  to="/provider/earnings"
                  className={`flex items-center gap-1.5 hover:text-[#07535f] transition-colors ${
                    location.pathname === '/provider/earnings' ? 'text-[#07535f] font-semibold' : ''
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Earnings</span>
                </Link>
              </>
            ) : user?.role === 'admin' ? (
              /* Admin Nav */
              <>
                <Link
                  to="/admin"
                  className={
                    location.pathname === '/admin'
                      ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-sm transition-all hover:bg-[#06424b]"
                      : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3.5 py-2 rounded-full transition-all font-medium"
                  }
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/admin/users"
                  className={
                    location.pathname.startsWith('/admin/users')
                      ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-sm transition-all hover:bg-[#06424b]"
                      : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3.5 py-2 rounded-full transition-all font-medium"
                  }
                >
                  <User className="w-4 h-4" />
                  <span>Users</span>
                </Link>
                <Link
                  to="/admin/bookings"
                  className={
                    location.pathname.startsWith('/admin/bookings')
                      ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-sm transition-all hover:bg-[#06424b]"
                      : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3.5 py-2 rounded-full transition-all font-medium"
                  }
                >
                  <Calendar className="w-4 h-4" />
                  <span>Bookings</span>
                </Link>
                <Link
                  to="/admin/payments"
                  className={
                    location.pathname.startsWith('/admin/payments')
                      ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-sm transition-all hover:bg-[#06424b]"
                      : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3.5 py-2 rounded-full transition-all font-medium"
                  }
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Payments & Revenue</span>
                </Link>
              </>
            ) : user?.role === 'customer' ? (
              /* Customer Nav */
              <>
                <Link
                  to="/customer"
                  className={
                    location.pathname === '/customer' || location.pathname === '/'
                      ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-sm transition-all hover:bg-[#06424b]"
                      : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3.5 py-2 rounded-full transition-all font-medium"
                  }
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/services"
                  className={
                    location.pathname.startsWith('/services') || location.pathname.startsWith('/browse') || location.pathname.startsWith('/customer/browse')
                      ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-sm transition-all hover:bg-[#06424b]"
                      : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3.5 py-2 rounded-full transition-all font-medium"
                  }
                >
                  <Search className="w-4 h-4" />
                  <span>Find Pros</span>
                </Link>
                <Link
                  to="/customer/history"
                  className={
                    location.pathname.startsWith('/customer/history')
                      ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-sm transition-all hover:bg-[#06424b]"
                      : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3.5 py-2 rounded-full transition-all font-medium"
                  }
                >
                  <Calendar className="w-4 h-4" />
                  <span>My Bookings</span>
                </Link>
              </>
            ) : (
              /* Guest Nav */
              <>
                <Link
                  to="/"
                  className={
                    location.pathname === '/'
                      ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-sm transition-all hover:bg-[#06424b]"
                      : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3.5 py-2 rounded-full transition-all font-medium"
                  }
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </Link>
                <Link
                  to="/services"
                  className={
                    location.pathname.startsWith('/services') || location.pathname.startsWith('/browse') || location.pathname.startsWith('/customer/browse')
                      ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-sm transition-all hover:bg-[#06424b]"
                      : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3.5 py-2 rounded-full transition-all font-medium"
                  }
                >
                  <Search className="w-4 h-4" />
                  <span>Services</span>
                </Link>
                <Link
                  to="/book"
                  className={
                    location.pathname.startsWith('/book')
                      ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-sm transition-all hover:bg-[#06424b]"
                      : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3.5 py-2 rounded-full transition-all font-medium"
                  }
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Now</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-500 hover:text-gray-800 transition-colors rounded-full hover:bg-gray-100"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 0 ? unreadCount : 5}
                </span>
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <div className="p-3 border-b border-gray-50 font-bold text-gray-800 flex justify-between items-center bg-gray-50/50">
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllAsRead} className="text-[10px] text-[#07535f] hover:underline font-semibold bg-[#07535f]/10 px-2 py-1 rounded-full">
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-3 border-b border-gray-50 text-sm hover:bg-gray-50 transition-colors cursor-pointer ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                          onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                        >
                          <div className="text-gray-700">{n.message}</div>
                          <div className="text-xs text-gray-400 mt-1 font-medium">
                            {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Auth Buttons */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2 border-l border-gray-100 pl-3">
                <img
                  src={user?.avatar_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"}
                  alt={user?.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-100"
                />
                <div className="hidden lg:flex flex-col min-w-0">
                  <span className="text-xs font-bold text-gray-800 truncate max-w-[90px]">{user?.name}</span>
                  <Link
                    to={getRolePath()}
                    className="text-[10px] text-[#07535f] font-semibold hover:underline"
                  >
                    Dashboard
                  </Link>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-medium text-[#07535f] hover:bg-gray-50 rounded-lg transition-all border border-gray-200"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 text-sm font-semibold text-white bg-[#07535f] hover:bg-[#06424b] rounded-lg transition-all shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="md:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMenu && (
          <div className="md:hidden pb-4 border-t border-gray-100">
            <nav className="flex flex-col gap-1 mt-3 text-sm font-medium text-gray-600">

              {/* Role Badge on mobile */}
              {isAuthenticated && roleBadge && (
                <div className="px-3 py-2 flex items-center gap-2">
                  <span
                    style={{ background: roleBadge.bg, color: roleBadge.color, border: `1px solid ${roleBadge.color}40` }}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                  >
                    {roleBadge.label}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">{user?.name}</span>
                </div>
              )}

              {/* Role-specific mobile nav links */}
              {user?.role === 'admin' ? (
                <>
                  <Link to="/admin" onClick={() => setShowMenu(false)} className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" /> Dashboard
                  </Link>
                  <Link to="/admin/users" onClick={() => setShowMenu(false)} className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <User className="w-4 h-4" /> Users
                  </Link>
                  <Link to="/admin/bookings" onClick={() => setShowMenu(false)} className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Bookings
                  </Link>
                  <Link to="/admin/payments" onClick={() => setShowMenu(false)} className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Payments & Revenue
                  </Link>
                </>
              ) : user?.role === 'provider' ? (
                <>
                  <Link to="/provider" onClick={() => setShowMenu(false)} className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" /> Dashboard
                  </Link>
                  <Link to="/provider/bookings" onClick={() => setShowMenu(false)} className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> My Bookings
                  </Link>
                  <Link to="/provider/schedule" onClick={() => setShowMenu(false)} className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Work Schedule
                  </Link>
                  <Link to="/provider/earnings" onClick={() => setShowMenu(false)} className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Earnings & Payouts
                  </Link>
                </>
              ) : user?.role === 'customer' ? (
                <>
                  <Link
                    to="/customer"
                    onClick={() => setShowMenu(false)}
                    className={
                      location.pathname === '/customer' || location.pathname === '/'
                        ? "px-3 py-2 rounded-lg bg-[#07535f] text-white flex items-center gap-2 font-bold"
                        : "px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    }
                  >
                    <LayoutGrid className="w-4 h-4" /> Dashboard
                  </Link>
                  <Link
                    to="/services"
                    onClick={() => setShowMenu(false)}
                    className={
                      location.pathname.startsWith('/services') || location.pathname.startsWith('/browse') || location.pathname.startsWith('/customer/browse')
                        ? "px-3 py-2 rounded-lg bg-[#07535f] text-white flex items-center gap-2 font-bold"
                        : "px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    }
                  >
                    <Search className="w-4 h-4" /> Find Pros
                  </Link>
                  <Link
                    to="/customer/history"
                    onClick={() => setShowMenu(false)}
                    className={
                      location.pathname.startsWith('/customer/history')
                        ? "px-3 py-2 rounded-lg bg-[#07535f] text-white flex items-center gap-2 font-bold"
                        : "px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    }
                  >
                    <Calendar className="w-4 h-4" /> My Bookings
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/"
                    onClick={() => setShowMenu(false)}
                    className={
                      location.pathname === '/'
                        ? "px-3 py-2 rounded-lg bg-[#07535f] text-white flex items-center gap-2 font-bold"
                        : "px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    }
                  >
                    <Home className="w-4 h-4" /> Home
                  </Link>
                  <Link
                    to="/services"
                    onClick={() => setShowMenu(false)}
                    className={
                      location.pathname.startsWith('/services') || location.pathname.startsWith('/browse') || location.pathname.startsWith('/customer/browse')
                        ? "px-3 py-2 rounded-lg bg-[#07535f] text-white flex items-center gap-2 font-bold"
                        : "px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    }
                  >
                    <Search className="w-4 h-4" /> Services
                  </Link>
                  <Link
                    to="/book"
                    onClick={() => setShowMenu(false)}
                    className={
                      location.pathname.startsWith('/book')
                        ? "px-3 py-2 rounded-lg bg-[#07535f] text-white flex items-center gap-2 font-bold"
                        : "px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    }
                  >
                    <Calendar className="w-4 h-4" /> Book Now
                  </Link>
                </>
              )}

              <div className="border-t border-gray-100 mt-2 pt-2">
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      logout();
                      setShowMenu(false);
                      navigate('/login');
                    }}
                    className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 font-bold"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                ) : (
                  <div className="flex gap-2 px-3">
                    <Link to="/login" onClick={() => setShowMenu(false)} className="flex-1 text-center py-2 text-sm font-medium text-[#07535f] border border-gray-200 rounded-lg hover:bg-gray-50">
                      Sign In
                    </Link>
                    <Link to="/register" onClick={() => setShowMenu(false)} className="flex-1 text-center py-2 text-sm font-semibold text-white bg-[#07535f] rounded-lg hover:bg-[#06424b]">
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
      <ToastContainer ref={toastRef} />
    </>
  );
};

export default Header;
