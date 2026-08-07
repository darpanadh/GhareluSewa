import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Bell, LogOut, Home, Search, Calendar, User, ChevronDown, Shield, BarChart2, LayoutGrid, Clock, TrendingUp, CreditCard, Wrench, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../services/api';
import { onNotification } from '../services/socket';
import { ToastContainer } from './ToastContainer';
import EditProfileModal from './EditProfileModal';

export const Header = () => {
  const { user, logout, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toastRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Left Area: Logo & All Services */}
            <div className="flex items-center gap-10">
              <Link to={isAuthenticated ? (user?.role === 'admin' ? '/admin' : user?.role === 'provider' ? '/provider' : '/customer') : '/'} className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#07535f] flex items-center justify-center text-white shadow-xs">
                  <Wrench className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="font-extrabold text-2xl tracking-tight text-[#07535f]">
                  Gharelu<span className="text-[#07535f]">Sewa</span>
                </span>
              </Link>

              {/* All Services Dropdown - Only shown for guest / unauthenticated homepage */}
              {!isAuthenticated && (
                <div className="relative group hidden sm:block">
                  <Link
                    to="/services"
                    className="flex items-center gap-1.5 text-gray-800 hover:text-[#07535f] font-semibold text-sm transition-colors py-2"
                  >
                    <span>All Services</span>
                    <ChevronDown className="w-4 h-4 text-gray-600 group-hover:text-[#07535f] transition-transform duration-200 group-hover:rotate-180" />
                  </Link>

                  {/* Dropdown Menu */}
                  <div className="absolute left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 hidden group-hover:block z-50 animate-in fade-in duration-150">
                    <Link to="/services?category=cleaning" className="block px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#07535f]">
                      Cleaning & Housekeeping
                    </Link>
                    <Link to="/services?category=plumbing" className="block px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#07535f]">
                      Plumbing & Repairs
                    </Link>
                    <Link to="/services?category=electrical" className="block px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#07535f]">
                      Electrical Work
                    </Link>
                    <Link to="/services?category=handyman" className="block px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#07535f]">
                      Handyman & Carpentry
                    </Link>
                    <Link to="/services?category=moving" className="block px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#07535f]">
                      Moving & Shifting
                    </Link>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <Link to="/services" className="block px-4 py-2 text-xs font-bold text-[#07535f] hover:bg-[#07535f]/5">
                        View All Categories &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Center Navigation — role-aware */}
            <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-600">
              {user?.role === 'provider' ? (
                /* Provider Nav */
                <>
                  <Link
                    to="/provider"
                    className={
                      location.pathname === '/provider'
                        ? "flex items-center gap-1.5 bg-[#07535f] text-white px-3.5 py-1.5 rounded-full font-semibold shadow-2xs transition-all"
                        : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3 py-1.5 rounded-full transition-all"
                    }
                  >
                    <Home className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/provider/profile"
                    className={
                      location.pathname.startsWith('/provider/profile')
                        ? "flex items-center gap-1.5 bg-[#07535f] text-white px-3.5 py-1.5 rounded-full font-semibold shadow-2xs transition-all"
                        : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3 py-1.5 rounded-full transition-all"
                    }
                  >
                    <User className="w-4 h-4" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    to="/provider/bookings"
                    className={
                      location.pathname.startsWith('/provider/bookings')
                        ? "flex items-center gap-1.5 bg-[#07535f] text-white px-3.5 py-1.5 rounded-full font-semibold shadow-2xs transition-all"
                        : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3 py-1.5 rounded-full transition-all"
                    }
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Bookings</span>
                  </Link>
                  <Link
                    to="/provider/schedule"
                    className={
                      location.pathname.startsWith('/provider/schedule')
                        ? "flex items-center gap-1.5 bg-[#07535f] text-white px-3.5 py-1.5 rounded-full font-semibold shadow-2xs transition-all"
                        : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3 py-1.5 rounded-full transition-all"
                    }
                  >
                    <Clock className="w-4 h-4" />
                    <span>Schedule</span>
                  </Link>
                  <Link
                    to="/provider/earnings"
                    className={
                      location.pathname.startsWith('/provider/earnings')
                        ? "flex items-center gap-1.5 bg-[#07535f] text-white px-3.5 py-1.5 rounded-full font-semibold shadow-2xs transition-all"
                        : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3 py-1.5 rounded-full transition-all"
                    }
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
                        ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-2xs transition-all hover:bg-[#06424b]"
                        : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3.5 py-2 rounded-full transition-all font-medium"
                    }
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/admin/bookings"
                    className={
                      location.pathname.startsWith('/admin/bookings')
                        ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-2xs transition-all hover:bg-[#06424b]"
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
                        ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-2xs transition-all hover:bg-[#06424b]"
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
                        ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-2xs transition-all hover:bg-[#06424b]"
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
                        ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-2xs transition-all hover:bg-[#06424b]"
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
                        ? "flex items-center gap-1.5 bg-[#07535f] text-white px-4 py-2 rounded-full font-semibold shadow-2xs transition-all hover:bg-[#06424b]"
                        : "flex items-center gap-1.5 text-gray-600 hover:text-[#07535f] hover:bg-gray-100/60 px-3.5 py-2 rounded-full transition-all font-medium"
                    }
                  >
                    <Calendar className="w-4 h-4" />
                    <span>My Bookings</span>
                  </Link>
                </>
              ) : null}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-4">

              {/* User Profile & Notifications / Auth Buttons */}
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  {/* Notifications */}
                  <div className="relative" ref={notificationRef}>
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative p-2 text-gray-500 hover:text-gray-800 transition-colors rounded-full hover:bg-gray-100"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                          {unreadCount}
                        </span>
                      )}
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

                  <div className="flex items-center gap-2 border-l border-gray-100 pl-3">
                    {/* User profile link button */}
                    <Link
                      to={user?.role === 'provider' ? '/provider/profile' : '#'}
                      onClick={(e) => {
                        if (user?.role !== 'provider') {
                          e.preventDefault();
                          setIsEditModalOpen(true);
                        }
                      }}
                      className="group flex items-center gap-2 text-left p-1 rounded-xl hover:bg-gray-100/80 transition-all cursor-pointer relative"
                      title={user?.role === 'provider' ? 'View & edit provider profile' : 'Edit profile'}
                    >
                      <div className="relative">
                        <img
                          src={user?.avatar_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"}
                          alt={user?.name || 'User'}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-[#07535f] transition-all"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 bg-[#07535f] text-white p-0.5 rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">
                          ✏️
                        </span>
                      </div>
                      <div className="hidden lg:flex flex-col min-w-0">
                        <span className="text-xs font-bold text-gray-800 truncate max-w-[90px] group-hover:text-[#07535f] transition-colors">{user?.name}</span>
                        <span className="text-[10px] text-[#07535f] font-semibold hover:underline">
                          {user?.role === 'provider' ? 'My Profile' : 'Edit Profile'}
                        </span>
                      </div>
                    </Link>
                    <button
                      onClick={() => { logout(); navigate('/login'); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <Link
                    to="/login"
                    className="text-gray-800 hover:text-[#07535f] font-semibold text-sm transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="text-gray-800 hover:text-[#07535f] font-semibold text-sm transition-colors"
                  >
                    Sign up
                  </Link>
                  <Link
                    to="/register?role=provider"
                    className="border border-[#07535f] text-[#07535f] hover:bg-[#07535f] hover:text-white px-5 py-2 rounded-full font-semibold text-sm transition-all shadow-2xs"
                  >
                    Become a Tasker
                  </Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="md:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
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
                      <Home className="w-4 h-4" /> Dashboard
                    </Link>
                    <Link to="/provider/profile" onClick={() => setShowMenu(false)} className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#07535f]" /> My Profile
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
                          ? "px-3 py-2 rounded-lg bg-[#07535f] text-[#07535f] flex items-center gap-2 font-bold"
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
                      to="/services"
                      onClick={() => setShowMenu(false)}
                      className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium"
                    >
                      <Search className="w-4 h-4" /> Services
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
                      className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 font-bold cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 px-3 pt-1">
                      <div className="flex items-center gap-2">
                        <Link to="/login" onClick={() => setShowMenu(false)} className="flex-1 text-center py-2 text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50">
                          Log in
                        </Link>
                        <Link to="/register" onClick={() => setShowMenu(false)} className="flex-1 text-center py-2 text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50">
                          Sign up
                        </Link>
                      </div>
                      <Link to="/register?role=provider" onClick={() => setShowMenu(false)} className="w-full text-center py-2 text-sm font-semibold text-[#07535f] border border-[#07535f] rounded-lg hover:bg-[#07535f]/5">
                        Become a Tasker
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
      <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
      <ToastContainer ref={toastRef} />
    </>
  );
};

export default Header;
