import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';

// Customer Pages
import CustomerDashboard from './pages/customer/Dashboard';
import BrowseServices from './pages/customer/BrowseServices';
import BookingDetails from './pages/customer/BookingDetails';
import BookingHistory from './pages/customer/BookingHistory';
import BookingWizard from './pages/customer/BookingWizard';
import EmergencyBooking from './pages/customer/EmergencyBooking';
import LiveTracking from './pages/customer/LiveTracking';
import InvoicePage from './pages/customer/InvoicePage';
import PaymentSuccess from './pages/customer/PaymentSuccess';

// Provider Pages
import ProviderDashboard from './pages/provider/Dashboard';
import ProviderProfile from './pages/provider/Profile';
import MyBookings from './pages/provider/MyBookings';
import MyEarnings from './pages/provider/Earnings';
import FindJobs from './pages/provider/FindJobs';
import ProviderSchedule from './pages/provider/Schedule';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageProviders from './pages/admin/ManageProviders';
import Analytics from './pages/admin/Analytics';
import ManageUsers from './pages/admin/ManageUsers';
import ManageBookings from './pages/admin/ManageBookings';
import ManagePayments from './pages/admin/ManagePayments';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return children;
};

import AdminLayout from './components/AdminLayout';

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  const getDashboardPath = () => {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'provider') return '/provider';
    return '/customer';
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={getDashboardPath()} replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to={getDashboardPath()} replace /> : <RegisterPage />} />
      <Route path="/services" element={<BrowseServices />} />
      <Route path="/browse" element={<BrowseServices />} />
      <Route path="/book" element={<BookingWizard />} />
      <Route path="/emergency" element={<EmergencyBooking />} />
      <Route path="/track" element={<LiveTracking />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/failed" element={<PaymentSuccess />} />

      {/* Customer Routes */}
      <Route
        path="/customer/*"
        element={
          <ProtectedRoute requiredRole="customer">
            <Routes>
              <Route path="/" element={<CustomerDashboard />} />
              <Route path="/browse" element={<BrowseServices />} />
              <Route path="/bookings/:bookingId" element={<BookingDetails />} />
              <Route path="/invoice/:bookingId" element={<InvoicePage />} />
              <Route path="/history" element={<BookingHistory />} />
              <Route path="/track" element={<LiveTracking />} />
              <Route path="/track/:bookingId" element={<LiveTracking />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      {/* Provider Routes */}
      <Route
        path="/provider/*"
        element={
          <ProtectedRoute requiredRole="provider">
            <Routes>
              <Route path="/" element={<ProviderDashboard />} />
              <Route path="/profile" element={<ProviderProfile />} />
              <Route path="/bookings" element={<MyBookings />} />
              <Route path="/bookings/:bookingId" element={<BookingDetails />} />
              <Route path="/schedule" element={<ProviderSchedule />} />
              <Route path="/earnings" element={<MyEarnings />} />
              <Route path="/find-jobs" element={<FindJobs />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/providers" element={<ManageProviders />} />
                <Route path="/bookings" element={<ManageBookings />} />
                <Route path="/payments" element={<ManagePayments />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/users" element={<ManageUsers />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch All */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="flex-grow">
            <AppRoutes />
          </main>
          <footer className="bg-gray-900 text-gray-300 py-8 mt-16">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <p>&copy; 2026 Gharelu Sewa. All rights reserved.</p>
              <p className="text-sm text-gray-500 mt-2">Connecting you with trusted local service providers</p>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
