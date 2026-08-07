import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ResidenceSelector from '../components/ResidenceSelector';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import {
  AlertCircle,
  ShieldCheck,
  Upload,
  CheckCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role') === 'provider' ? 'provider' : 'customer';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: roleParam,
    ward: '',
    categoryId: '1',
    experience: '',
    hourlyRate: '500',
    bio: '',
    citizenshipNo: '',
  });

  // Step state for Service Provider multi-step form (1: Basic & Residence, 2: Trust & KYC)
  const [step, setStep] = useState(1);
  const [bgCheckConsent, setBgCheckConsent] = useState(false);
  const [idImagePreview, setIdImagePreview] = useState(null);
  const [idImageBase64, setIdImageBase64] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    setFormData((prev) => ({ ...prev, role: roleParam }));
    setStep(1);
  }, [roleParam]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (selectedRole) => {
    setFormData((prev) => ({ ...prev, role: selectedRole }));
    setStep(1);
    setError('');
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
        setError('');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Strict Validation for Step 1 before proceeding
  const handleNextStep = () => {
    setError('');

    // Full Name
    if (!formData.name.trim()) {
      return setError('Please enter your full name');
    }
    const nameParts = formData.name.trim().split(/\s+/);
    if (nameParts.length < 2 || nameParts.some((part) => part.length < 2)) {
      return setError('Please enter both your first and last name (e.g. Ram Sharma)');
    }

    // Email Address
    if (!formData.email.trim()) {
      return setError('Please enter your email address');
    }

    // Phone Number
    const phoneClean = formData.phone.trim();
    if (!phoneClean) {
      return setError('Please enter your 10-digit phone number');
    }
    if (!/^\d{10}$/.test(phoneClean)) {
      return setError('Phone number must be exactly 10 digits (e.g. 98XXXXXXXX)');
    }

    // Residence Location (Required for Provider)
    if (formData.role === 'provider' && (!formData.ward || !formData.ward.includes(','))) {
      return setError('Please select both your Residence Province and District');
    }

    // Password
    if (!formData.password) {
      return setError('Please enter a password');
    }
    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters long');
    }
    if (!formData.confirmPassword) {
      return setError('Please confirm your password');
    }
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match. Please re-enter your password');
    }

    // All clear -> Proceed to Step 2
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // If Customer: Validate Step 1 fields
    if (formData.role === 'customer') {
      if (!formData.name.trim()) return setError('Please enter your full name');
      const nameParts = formData.name.trim().split(/\s+/);
      if (nameParts.length < 2 || nameParts.some((part) => part.length < 2)) {
        return setError('Please enter both your first and last name (e.g. Ram Sharma)');
      }

      if (!formData.email.trim()) return setError('Please enter your email address');

      const phoneClean = formData.phone.trim();
      if (!phoneClean) return setError('Please enter your 10-digit phone number');
      if (!/^\d{10}$/.test(phoneClean)) {
        return setError('Phone number must be exactly 10 digits (e.g. 98XXXXXXXX)');
      }

      if (!formData.password) return setError('Please enter a password');
      if (formData.password.length < 6) return setError('Password must be at least 6 characters');
      if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
    }

    // If Provider Step 2 Validation:
    if (formData.role === 'provider') {
      if (!formData.categoryId) {
        return setError('Please select your primary service category');
      }
      if (!formData.experience || Number(formData.experience) < 0) {
        return setError('Please enter your years of experience');
      }
      if (!formData.hourlyRate || Number(formData.hourlyRate) <= 0) {
        return setError('Please enter your expected hourly rate in Rs.');
      }
      if (!formData.bio.trim()) {
        return setError('Please provide a short description of your qualifications / bio');
      }
      if (!formData.citizenshipNo.trim()) {
        return setError('Please enter your Citizenship or License Number for KYC verification');
      }
      if (!idImageBase64) {
        return setError('Please upload a clear photo of your ID document (Citizenship / License)');
      }
      if (!bgCheckConsent) {
        return setError('Please check the box consenting to the background check before submitting');
      }
    }

    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      const result = await register({
        ...submitData,
        citizenship_image_url: idImageBase64 || '',
      });
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07535f]/5 to-[#07535f]/10 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#07535f] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <span className="text-white text-2xl font-bold font-serif">G</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            {formData.role === 'provider' ? 'Become a Verified Tasker' : 'Join Gharelu Sewa'}
          </h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm">
            {formData.role === 'provider'
              ? 'Complete registration & KYC to start offering home services'
              : 'Create your customer account in seconds'}
          </p>
        </div>

        {/* Multi-step progress indicator for Service Provider */}
        {formData.role === 'provider' && (
          <div className="mb-6 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-around">
            <div
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 cursor-pointer transition-colors ${
                step === 1 ? 'text-[#07535f] font-black' : 'text-emerald-700 font-bold'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                  step === 1
                    ? 'bg-[#07535f] text-white shadow-sm'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-xs">1. Account & Residence</span>
            </div>

            <div className="h-0.5 w-12 bg-gray-200 rounded-full" />

            <div
              className={`flex items-center gap-2 transition-colors ${
                step === 2 ? 'text-[#07535f] font-black' : 'text-gray-400 font-medium'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                  step === 2
                    ? 'bg-[#07535f] text-white shadow-sm'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                2
              </div>
              <span className="text-xs">2. Verified Trust & KYC</span>
            </div>
          </div>
        )}

        <Card className="w-full">
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 animate-in fade-in duration-150">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-semibold text-red-700 leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Toggle */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-3 p-1 bg-gray-50/80">
              {['customer', 'provider'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                    formData.role === r
                      ? 'bg-[#07535f] text-white shadow-sm'
                      : 'bg-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {r === 'provider' ? '🔧 Service Provider' : '🏠 Customer'}
                </button>
              ))}
            </div>

            {/* ── STEP 1: Basic Information & Residence (Customer & Provider) ── */}
            {(formData.role === 'customer' || step === 1) && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <Input
                  label="Full Name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  required
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="98XXXXXXXX"
                  required
                />

                {/* Residence Location: Province & District (Only for Service Provider) */}
                {formData.role === 'provider' && (
                  <div>
                    <p className="text-xs font-bold text-[#07535f] mb-1.5 flex items-center gap-1">
                      📍 Residence Location (Province & District)
                    </p>
                    <ResidenceSelector
                      value={formData.ward}
                      onChange={(residence) =>
                        setFormData((prev) => ({ ...prev, ward: residence }))
                      }
                      required
                      layout="row"
                    />
                  </div>
                )}

                <Input
                  label="Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  required
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                />

                {/* Button Action for Step 1 */}
                {formData.role === 'provider' ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full mt-3 py-3 bg-[#07535f] hover:bg-[#06424b] text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    Next: Verified Trust Details <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={loading}
                    disabled={loading}
                    className="w-full mt-2 py-3 text-xs sm:text-sm font-extrabold"
                  >
                    {loading ? 'Creating Customer Account...' : 'Create Customer Account'}
                  </Button>
                )}
              </div>
            )}

            {/* ── STEP 2: Provider Verified Trust & KYC System ── */}
            {formData.role === 'provider' && step === 2 && (
              <div className="space-y-5 pt-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <ShieldCheck className="w-5 h-5 text-[#07535f]" />
                  <h3 className="text-sm font-extrabold text-[#07535f] uppercase tracking-wide">
                    Verified Trust System & KYC
                  </h3>
                </div>

                {/* Primary Service Category */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Primary Service Category
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f]"
                    required
                  >
                    <option value="1">🔧 Plumbing</option>
                    <option value="2">⚡ Electrical</option>
                    <option value="3">🧹 Cleaning</option>
                    <option value="4">❄️ AC Service</option>
                  </select>
                </div>

                {/* Experience & Hourly Rate */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Years of Experience"
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="e.g. 5"
                    min="0"
                    required
                  />
                  <Input
                    label="Hourly Rate (Rs.)"
                    type="number"
                    name="hourlyRate"
                    value={formData.hourlyRate}
                    onChange={handleChange}
                    placeholder="e.g. 600"
                    min="100"
                    required
                  />
                </div>

                {/* Bio / Qualifications */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Bio / Qualifications
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Describe your qualifications, certifications, and experience..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f] resize-none h-24"
                    required
                  />
                </div>

                {/* Citizenship / License Number */}
                <Input
                  label="Citizenship / License Number"
                  type="text"
                  name="citizenshipNo"
                  value={formData.citizenshipNo}
                  onChange={handleChange}
                  placeholder="Required for official KYC verification"
                  required
                />

                {/* ID Document Upload */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                    <span>ID Document Photo</span>
                    <span className="text-[10px] text-gray-400 font-normal">Citizenship / License</span>
                  </label>
                  {idImagePreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                      <img
                        src={idImagePreview}
                        alt="ID Document Preview"
                        className="w-full h-36 object-cover"
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-700 shadow-sm">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Photo Uploaded
                        <button
                          type="button"
                          onClick={() => {
                            setIdImagePreview(null);
                            setIdImageBase64('');
                          }}
                          className="ml-1 text-gray-400 hover:text-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-[#07535f]/30 hover:border-[#07535f] bg-gray-50/70 rounded-2xl py-6 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-[#07535f] transition-all cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#07535f]/10 text-[#07535f] flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-extrabold">Click to Upload ID Document Photo</span>
                      <span className="text-[10px] text-gray-400">JPG, PNG, WebP up to 5MB</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleIdImageChange}
                  />
                </div>

                {/* Background Check Consent */}
                <div
                  onClick={() => setBgCheckConsent((p) => !p)}
                  className={`cursor-pointer flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all ${
                    bgCheckConsent
                      ? 'border-[#07535f] bg-[#07535f]/5'
                      : 'border-gray-200 hover:border-[#07535f]/40'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border-2 mt-0.5 shrink-0 ${
                      bgCheckConsent ? 'bg-[#07535f] border-[#07535f]' : 'border-gray-300'
                    }`}
                  >
                    {bgCheckConsent && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">I consent to a background check</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Gharelu Sewa will verify your identity, citizenship record, and credentials. Required for provider verification.
                    </p>
                  </div>
                </div>

                {/* Buttons for Step 2 */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Step 1
                  </button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={loading}
                    disabled={loading}
                    className="flex-1 py-3 text-xs sm:text-sm font-extrabold"
                  >
                    {loading ? 'Submitting Application...' : 'Submit Application & Complete KYC'}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 pt-5 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-xs sm:text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#07535f] hover:text-[#06424b] font-extrabold">
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
