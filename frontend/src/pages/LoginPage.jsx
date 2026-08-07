import React, { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import {
  AlertCircle, Shield, Upload, X, CheckCircle, FileText, RefreshCw,
  Wrench, Zap, Sparkles, Snowflake, CheckCircle2, ShieldCheck
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { id: '1', name: 'Plumbing', icon: Wrench },
  { id: '2', name: 'Electrical', icon: Zap },
  { id: '3', name: 'Cleaning', icon: Sparkles },
  { id: '4', name: 'AC Service', icon: Snowflake },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, googleLogin } = useAuth();
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
        let dest = redirectPath;
        if (!redirectPath || redirectPath === '/') {
          if (result.user?.role === 'admin') dest = '/admin';
          else if (result.user?.role === 'provider') dest = '/provider';
          else dest = '/customer';
        }
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
    <div className="min-h-screen bg-slate-50/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#07535f] to-[#0a7587] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md text-white font-extrabold text-xl">
            GS
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">Sign in to your Gharelu Sewa account</p>
        </div>

        {reverifySuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            {reverifySuccess}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-amber-900 font-semibold leading-relaxed">{error}</p>
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
            className="w-full py-3 text-sm font-bold shadow-md cursor-pointer rounded-2xl"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        {/* ── Google Sign In Button ── */}
        <div className="mt-5 space-y-3">
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] text-slate-400 font-bold uppercase tracking-wider absolute">Or</span>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                setLoading(true);
                const googleSimData = {
                  email: 'demo.google@gmail.com',
                  name: 'Ram Shrestha',
                  avatar_url: 'https://lh3.googleusercontent.com/a/default-user',
                  role: 'customer',
                };
                const result = await googleLogin(googleSimData);
                if (result.success) {
                  navigate(result.user?.role === 'provider' ? '/provider' : '/customer');
                } else {
                  setError(result.error);
                }
              } catch (err) {
                setError('Google sign-in failed');
              } finally {
                setLoading(false);
              }
            }}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-2xl shadow-xs transition-all cursor-pointer text-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-slate-600 text-xs sm:text-sm font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#07535f] hover:underline font-bold">
              Sign up here
            </Link>
          </p>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 p-3.5 bg-sky-50/80 border border-sky-200/80 rounded-2xl text-xs text-sky-950 space-y-2">
          <p className="font-bold flex items-center justify-between">
            <span>Demo Quick Login:</span>
          </p>
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => { setEmail('priya@gmail.com'); setPassword('password'); }}
              className="bg-white hover:bg-sky-100 text-sky-900 font-bold py-1.5 px-2 rounded-xl border border-sky-200 text-[11px] transition-colors text-center cursor-pointer shadow-2xs"
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => { setEmail('rajesh@gmail.com'); setPassword('password'); }}
              className="bg-white hover:bg-sky-100 text-sky-900 font-bold py-1.5 px-2 rounded-xl border border-sky-200 text-[11px] transition-colors text-center cursor-pointer shadow-2xs"
            >
              Provider
            </button>
            <button
              type="button"
              onClick={() => { setEmail('admin@gharelusewa.com'); setPassword('password'); }}
              className="bg-white hover:bg-sky-100 text-sky-900 font-bold py-1.5 px-2 rounded-xl border border-sky-200 text-[11px] transition-colors text-center cursor-pointer shadow-2xs"
            >
              Admin
            </button>
          </div>
        </div>
      </Card>

      {/* ── RE-VERIFY KYC MODAL ─────────────────────────────────────────── */}
      {showReverifyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 relative animate-in fade-in zoom-in-95 duration-150 border border-slate-100 max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              onClick={() => setShowReverifyModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#07535f] to-[#0a7587] text-white flex items-center justify-center font-extrabold text-xl shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Tasker Professional Re-Verification</h2>
                <p className="text-xs text-slate-500">Update your document details and re-submit for Admin approval.</p>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password to verify"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#07535f]/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Citizenship / License Number *</label>
                <input
                  type="text"
                  value={reverifyData.citizenshipNo}
                  onChange={(e) => setReverifyData(p => ({ ...p, citizenshipNo: e.target.value }))}
                  placeholder="e.g. 27-01-79-12345"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#07535f]/30"
                  required
                />
              </div>

              {/* Service Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Primary Service Specialty</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = reverifyData.categoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setReverifyData(p => ({ ...p, categoryId: cat.id }))}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-[#07535f] text-white border-[#07535f]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#07535f]/40'
                        }`}
                      >
                        <Icon className="w-4 h-4" /> {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ID Document Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Updated Document Image (Citizenship / License) *
                </label>
                {idImagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
                    <img src={idImagePreview} alt="ID Document Preview" className="w-full h-36 object-contain" />
                    <button
                      type="button"
                      onClick={() => { setIdImagePreview(null); setIdImageBase64(''); }}
                      className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow hover:bg-white text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-5 flex flex-col items-center gap-1.5 text-slate-400 hover:border-[#07535f] hover:text-[#07535f] transition-all cursor-pointer bg-slate-50/50"
                  >
                    <Upload className="w-5 h-5 text-[#07535f]" />
                    <span className="text-xs font-bold text-slate-700">Click to upload new document photo</span>
                    <span className="text-[10px] text-slate-400">JPG or PNG format</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleIdImageChange} />
              </div>

              {/* Hourly Rate & Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hourly Service Rate (Rs.)</label>
                <input
                  type="number"
                  value={reverifyData.hourlyRate}
                  onChange={(e) => setReverifyData(p => ({ ...p, hourlyRate: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#07535f]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bio / Work Qualifications</label>
                <textarea
                  value={reverifyData.bio}
                  onChange={(e) => setReverifyData(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Describe your qualifications, experience, and service details..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#07535f]/30 h-20 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReverifyModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReverifySubmit}
                  disabled={reverifyLoading}
                  className="flex-1 bg-[#07535f] hover:bg-[#06424b] disabled:opacity-50 text-white py-3 rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {reverifyLoading ? 'Submitting...' : 'Submit Documents'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
