import React, { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { AlertCircle, Shield, Upload, X, CheckCircle, FileText, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = new URLSearchParams(location.search).get('redirect') || '/';

  // KYC Re-verification Modal state
  const [showReverifyModal, setShowReverifyModal] = useState(false);
  const [reverifyData, setReverifyData] = useState({
    name: '',
    phone: '',
    ward: 'Kathmandu',
    categoryId: '1',
    hourlyRate: '500',
    citizenshipNo: '',
    bio: '',
  });
  const [idImagePreview, setIdImagePreview] = useState(null);
  const [idImageBase64, setIdImageBase64] = useState('');
  const [reverifyLoading, setReverifyLoading] = useState(false);
  const [reverifyError, setReverifyError] = useState('');
  const [reverifySuccess, setReverifySuccess] = useState('');
  const fileInputRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        const dest = result.user?.role === 'customer' && redirectPath === '/' ? '/customer' : redirectPath;
        navigate(dest);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleIdImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        setIdImagePreview(compressedBase64);
        setIdImageBase64(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleReverifySubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setReverifyError('');
    setReverifySuccess('');

    if (!email) {
      setReverifyError('Email address is required.');
      return;
    }
    if (!password) {
      setReverifyError('Account Password is required to verify your identity.');
      return;
    }
    if (!reverifyData.citizenshipNo) {
      setReverifyError('Citizenship / License Number is required.');
      return;
    }

    setReverifyLoading(true);

    try {
      const res = await authAPI.reverifyKYC({
        email,
        password,
        ...reverifyData,
        citizenship_image_url: idImageBase64,
      });

      if (res.data?.success || res.status === 200) {
        setReverifySuccess('KYC application re-submitted successfully! Your application has been sent to the Admin queue for approval.');
        setError('');
        setTimeout(() => {
          setShowReverifyModal(false);
          setReverifySuccess('');
        }, 3500);
      }
    } catch (err) {
      console.error('Reverify error:', err);
      setReverifyError(err.response?.data?.error || 'Failed to submit KYC re-verification. Please verify your password.');
    } finally {
      setReverifyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to your Gharelu Sewa account</p>
        </div>

        {reverifySuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            {reverifySuccess}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-200">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900 font-semibold leading-relaxed">{error}</p>
            </div>

            {(error.includes('KYC') || error.includes('re-verify') || error.includes('approved')) && (
              <div className="pt-3 border-t border-amber-200/80 flex flex-col gap-2">
                <span className="text-xs text-amber-800 font-bold">Need to update your identity documents?</span>
                <button
                  type="button"
                  onClick={() => setShowReverifyModal(true)}
                  className="w-full text-xs font-extrabold text-white bg-[#07535f] hover:bg-[#06424b] px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" /> Re-Verify KYC & Submit Documents
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            disabled={loading}
            className="w-full cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-500 font-medium">
              Sign up here
            </Link>
          </p>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <p className="font-medium mb-1">Demo Credentials:</p>
          <p>Customer: priya@gmail.com / password</p>
          <p>Provider: rajesh@gmail.com / password</p>
          <p>Admin: admin@gharelusewa.com / password</p>
        </div>
      </Card>

      {/* ── RE-VERIFY KYC MODAL ─────────────────────────────────────────── */}
      {showReverifyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 relative animate-in fade-in zoom-in-95 duration-150 border border-gray-100 max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              onClick={() => setShowReverifyModal(false)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#07535f]/10 text-[#07535f] flex items-center justify-center font-extrabold text-xl">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Tasker KYC Re-Verification</h2>
                <p className="text-xs text-gray-500">Update your ID details and re-submit for Admin approval.</p>
              </div>
            </div>

            {reverifyError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                {reverifyError}
              </div>
            )}

            <form onSubmit={handleReverifySubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Account Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Account Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password to verify"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#07535f]/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nepal Citizenship / License Number *</label>
                <input
                  type="text"
                  value={reverifyData.citizenshipNo}
                  onChange={(e) => setReverifyData(p => ({ ...p, citizenshipNo: e.target.value }))}
                  placeholder="e.g. 27-01-79-12345"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#07535f]/30"
                  required
                />
              </div>

              {/* ID Document Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Updated ID Document Photo *
                </label>
                {idImagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-900">
                    <img src={idImagePreview} alt="ID Document Preview" className="w-full h-40 object-contain" />
                    <button
                      type="button"
                      onClick={() => { setIdImagePreview(null); setIdImageBase64(''); }}
                      className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow hover:bg-white"
                    >
                      <X className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:border-[#07535f] hover:text-[#07535f] transition-all cursor-pointer bg-gray-50/50"
                  >
                    <Upload className="w-6 h-6 text-[#07535f]" />
                    <span className="text-xs font-bold text-gray-700">Click to upload new ID document photo</span>
                    <span className="text-[10px] text-gray-400">JPG or PNG image format</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleIdImageChange} />
              </div>

              {/* Service Category & Ward */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Service Category</label>
                  <select
                    value={reverifyData.categoryId}
                    onChange={(e) => setReverifyData(p => ({ ...p, categoryId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#07535f]/30"
                  >
                    <option value="1">🔧 Plumbing</option>
                    <option value="2">⚡ Electrical</option>
                    <option value="3">🧹 Cleaning</option>
                    <option value="4">❄️ AC Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Hourly Rate (Rs.)</label>
                  <input
                    type="number"
                    value={reverifyData.hourlyRate}
                    onChange={(e) => setReverifyData(p => ({ ...p, hourlyRate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#07535f]/30"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Bio / Work Experience</label>
                <textarea
                  value={reverifyData.bio}
                  onChange={(e) => setReverifyData(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Describe your qualifications, experience, and service details..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#07535f]/30 h-20 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReverifyModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReverifySubmit}
                  disabled={reverifyLoading}
                  className="flex-1 bg-[#07535f] hover:bg-[#06424b] disabled:opacity-50 text-white py-3 rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {reverifyLoading ? 'Submitting...' : 'Re-Submit KYC Application'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
