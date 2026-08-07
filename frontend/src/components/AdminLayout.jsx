import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../services/api';
import { onNotification } from '../services/socket';
import { 
  LayoutDashboard, Users, Calendar, ShieldCheck, 
  BarChart2, LogOut, Settings, Bell, Menu, X, ArrowLeft, CreditCard, FileSpreadsheet
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      notificationAPI.getNotifications({ limit: 5 })
        .then(res => {
          const fetchedNotifs = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
          setNotifications(fetchedNotifs);
        })
        .catch(err => console.warn('Failed to fetch admin notifications', err));

      notificationAPI.getUnreadCount()
        .then(res => {
          setUnreadCount(res.data?.count || 0);
        })
        .catch(err => console.warn('Failed to fetch admin unread count', err));

      onNotification((data) => {
        setNotifications(prev => [{ ...data, id: Date.now(), created_at: new Date().toISOString() }, ...prev]);
        setUnreadCount(prev => prev + 1);
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

  const menuItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Bookings', path: '/admin/bookings', icon: Calendar },
    { label: 'Payments & Revenue', path: '/admin/payments', icon: CreditCard },
    { label: 'Master Reports & Export', path: '/admin/reports', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content area */}
      <main className="flex-1 w-full overflow-y-auto">
        {/* Page Content */}
        <div className="p-6 sm:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
