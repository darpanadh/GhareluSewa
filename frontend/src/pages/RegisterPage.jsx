import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ResidenceSelector from '../components/ResidenceSelector';
import MultiWardSelector from '../components/MultiWardSelector';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import {
  AlertCircle, ShieldCheck, Upload, CheckSquare, Square, BadgeCheck, X,
  Wrench, Zap, Sparkles, Snowflake, User, Mail, Lock, Phone, MapPin,
  FileText, Award, DollarSign, CheckCircle2, Shield, Info, ArrowRight, ArrowLeft, Check
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { id: '1', name: 'Plumbing', icon: Wrench },
  { id: '2', name: 'Electrical', icon: Zap },
  { id: '3', name: 'Cleaning', icon: Sparkles },
  { id: '4', name: 'AC Service', icon: Snowflake },
];

const SKILL_OPTIONS = [
  'Pipe Repair', 'Drain Cleaning', 'Water Heater', 'Tap Installation',
  'Wiring', 'Switch Installation', 'Appliance Repair', 'Power Backup',
  'Deep Cleaning', 'Kitchen Cleaning', 'Bathroom Sanitization',
  'AC Installation', 'AC Gas Refill', 'AC Filter Cleaning',
  'Carpentry', 'Painting', 'Tiling', 'General Handyman',
];

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

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    password: false,
    confirmPassword: false,
    experience: false,
    hourlyRate: false,
    bio: false,
    citizenshipNo: false,
  });

  const [step, setStep] = useState(1);
  const [skillBadges, setSkillBadges] = useState([]);
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

  // Field Validation Helpers
  const validateName = (val) => {
    const trimmed = (val || '').trim();
    if (!trimmed) return '';

    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.some((w) => w.length < 2) || trimmed.length > 70) {
      return 'Please enter a valid name';
    }

    return '';
  };

  const validateEmail = (val) => {
    const trimmed = (val || '').trim();
    if (!trimmed) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return 'Please enter a valid email address';
    return '';
  };

  const validatePhone = (val) => {
    const trimmed = (val || '').trim();
    if (!trimmed) return '';
    if (!/^\d{10}$/.test(trimmed)) {
      return 'Please enter a valid 10-digit phone number';
    }
    return '';
  };

  const validatePassword = (val) => {
    if (!val) return '';
    if (val.length < 6) return 'Password must be at least 6 characters long';
    return '';
  };

  const validateConfirmPassword = (val, pwd) => {
    if (!val) return '';
    if (val !== pwd) return 'Passwords do not match';
    return '';
  };

  const validateExperience = (val) => {
    if (val === '' || val === undefined || val === null) return '';
    if (Number(val) < 0) return 'Experience cannot be negative';
    return '';
  };

  const validateHourlyRate = (val) => {
    if (!val) return '';
    if (Number(val) < 100) return 'Hourly rate must be at least Rs. 100';
    return '';
  };

  const validateBio = (val) => {
    const trimmed = (val || '').trim();
    if (!trimmed) return '';
    if (trimmed.length < 10) return 'Bio must be at least 10 characters long';
    return '';
  };

  const validateCitizenshipNo = (val) => {
    const trimmed = (val || '').trim();
    if (!trimmed) return '';
    if (trimmed.length < 4) return 'Please enter a valid Citizenship or License Number';
    return '';
  };

  // Field error & success computations
  const nameError = touched.name ? validateName(formData.name) : '';
  const nameSuccess = touched.name && formData.name.trim().length > 0 && !validateName(formData.name);

  const emailError = touched.email ? validateEmail(formData.email) : '';
  const emailSuccess = touched.email && formData.email.trim().length > 0 && !validateEmail(formData.email);

  const phoneError = touched.phone ? validatePhone(formData.phone) : '';
  const phoneSuccess = touched.phone && formData.phone.trim().length > 0 && !validatePhone(formData.phone);

  const passwordError = touched.password ? validatePassword(formData.password) : '';
  const passwordSuccess = touched.password && formData.password.length > 0 && !validatePassword(formData.password);

  const confirmPasswordError = touched.confirmPassword ? validateConfirmPassword(formData.confirmPassword, formData.password) : '';
  const confirmPasswordSuccess = touched.confirmPassword && formData.confirmPassword.length > 0 && !validateConfirmPassword(formData.confirmPassword, formData.password);

  const experienceError = touched.experience ? validateExperience(formData.experience) : '';
  const experienceSuccess = touched.experience && formData.experience !== '' && !validateExperience(formData.experience);

  const hourlyRateError = touched.hourlyRate ? validateHourlyRate(formData.hourlyRate) : '';
  const hourlyRateSuccess = touched.hourlyRate && formData.hourlyRate !== '' && !validateHourlyRate(formData.hourlyRate);

  const bioError = touched.bio ? validateBio(formData.bio) : '';
  const bioSuccess = touched.bio && formData.bio.trim().length > 0 && !validateBio(formData.bio);

  const citizenshipNoError = touched.citizenshipNo ? validateCitizenshipNo(formData.citizenshipNo) : '';
  const citizenshipNoSuccess = touched.citizenshipNo && formData.citizenshipNo.trim().length > 0 && !validateCitizenshipNo(formData.citizenshipNo);

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleRoleChange = (selectedRole) => {
    setFormData((prev) => ({ ...prev, role: selectedRole }));
    setStep(1);
    setError('');
  };

  const toggleSkill = (skill) => {
    setSkillBadges((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
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

  const handleNextStep = () => {
    setError('');
    setTouched((prev) => ({
      ...prev,
      name: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    }));

    if (!formData.name.trim()) return setError('Please enter your full name');
    const nErr = validateName(formData.name);
    if (nErr) return setError(nErr);

    if (!formData.email.trim()) return setError('Please enter your email address');
    const eErr = validateEmail(formData.email);
    if (eErr) return setError(eErr);

    if (!formData.phone.trim()) return setError('Please enter your 10-digit phone number');
    const pErr = validatePhone(formData.phone);
    if (pErr) return setError(pErr);

    if (formData.role === 'provider' && (!formData.ward || !formData.ward.includes(','))) {
      return setError('Please select both your Residence Province and District');
    }

    if (!formData.password) return setError('Please enter a password');
    const passErr = validatePassword(formData.password);
    if (passErr) return setError(passErr);

    if (!formData.confirmPassword) return setError('Please confirm your password');
    const cPassErr = validateConfirmPassword(formData.confirmPassword, formData.password);
    if (cPassErr) return setError(cPassErr);

    // All clear -> Step 2
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.role === 'customer') {
      setTouched((prev) => ({
        ...prev,
        name: true,
        email: true,
        phone: true,
        password: true,
        confirmPassword: true,
      }));

      if (!formData.name.trim()) return setError('Please enter your full name');
      const nErr = validateName(formData.name);
      if (nErr) return setError(nErr);

      if (!formData.email.trim()) return setError('Please enter your email address');
      const eErr = validateEmail(formData.email);
      if (eErr) return setError(eErr);

      if (!formData.phone.trim()) return setError('Please enter your 10-digit phone number');
      const pErr = validatePhone(formData.phone);
      if (pErr) return setError(pErr);

      if (!formData.password) return setError('Please enter a password');
      const passErr = validatePassword(formData.password);
      if (passErr) return setError(passErr);

      if (!formData.confirmPassword) return setError('Please confirm your password');
      const cPassErr = validateConfirmPassword(formData.confirmPassword, formData.password);
      if (cPassErr) return setError(cPassErr);
    }

    if (formData.role === 'provider') {
      setTouched((prev) => ({
        ...prev,
        experience: true,
        hourlyRate: true,
        bio: true,
        citizenshipNo: true,
      }));

      if (!formData.categoryId) {
        return setError('Please select your primary service category');
      }

      if (formData.experience === '') return setError('Please enter your years of experience');
      const expErr = validateExperience(formData.experience);
      if (expErr) return setError(expErr);

      if (!formData.hourlyRate) return setError('Please enter your expected hourly rate in Rs.');
      const hrErr = validateHourlyRate(formData.hourlyRate);
      if (hrErr) return setError(hrErr);

      if (!formData.bio.trim()) return setError('Please describe your qualifications / bio');
      const bioErr = validateBio(formData.bio);
      if (bioErr) return setError(bioErr);

      if (!formData.citizenshipNo.trim()) return setError('Please enter your Citizenship or License Number');
      const citErr = validateCitizenshipNo(formData.citizenshipNo);
      if (citErr) return setError(citErr);

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
        skill_badges: skillBadges.join(','),
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
    <div className="min-h-screen bg-slate-50/80 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-xl">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-[#07535f] to-[#0a7587] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg text-white font-extrabold text-2xl">
            GS
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formData.role === 'provider' ? 'Become a Verified Professional Tasker' : 'Join Gharelu Sewa'}
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm max-w-md mx-auto">
            {formData.role === 'provider'
              ? 'Complete registration & KYC to start receiving home service job requests'
              : 'Create your customer account in seconds'}
          </p>
        </div>

        {/* Multi-step progress indicator for Service Provider */}
        {formData.role === 'provider' && (
          <div className="mb-6 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-around">
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
              <span className="text-xs">1. Basic & Residence</span>
            </div>

            <div className="h-0.5 w-12 bg-slate-200 rounded-full" />

            <div
              className={`flex items-center gap-2 transition-colors ${
                step === 2 ? 'text-[#07535f] font-black' : 'text-slate-400 font-medium'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                  step === 2
                    ? 'bg-[#07535f] text-white shadow-sm'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                2
              </div>
              <span className="text-xs">2. Professional Profile & KYC</span>
            </div>
          </div>
        )}

        <Card className="w-full shadow-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 animate-in fade-in duration-150">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-red-800 leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Account Type Selector Tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Select Account Type</label>
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleRoleChange('customer')}
                  className={`py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    formData.role === 'customer'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <User className="w-4 h-4 text-sky-600" /> Customer Account
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('provider')}
                  className={`py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    formData.role === 'provider'
                      ? 'bg-[#07535f] text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" /> Professional Provider
                </button>
              </div>
            </div>

            {/* ── STEP 1: Basic Information & Residence (Customer & Provider Step 1) ── */}
            {(formData.role === 'customer' || step === 1) && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <Input
                  label="Full Name *"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur('name')}
                  error={nameError}
                  success={nameSuccess}
                  placeholder="First and Last Name (e.g. Ram Sharma)"
                  required
                />
                <Input
                  label="Email Address *"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => handleBlur('email')}
                  error={emailError}
                  success={emailSuccess}
                  placeholder="yourname@example.com"
                  required
                />
                <Input
                  label="Phone Number *"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={() => handleBlur('phone')}
                  error={phoneError}
                  success={phoneSuccess}
                  placeholder="98XXXXXXXX"
                  required
                />

                {/* Residence Location: Province & District */}
                {formData.role === 'provider' && (
                  <div>
                    <p className="text-xs font-bold text-[#07535f] mb-1.5 flex items-center gap-1">
                      📍 Residence Location (Province & District) *
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Password *"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => handleBlur('password')}
                    error={passwordError}
                    success={passwordSuccess}
                    placeholder="At least 6 characters"
                    required
                  />
                  <Input
                    label="Confirm Password *"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={() => handleBlur('confirmPassword')}
                    error={confirmPasswordError}
                    success={confirmPasswordSuccess}
                    placeholder="Re-enter password"
                    required
                  />
                </div>

                {/* Action Button for Step 1 */}
                {formData.role === 'provider' ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full mt-3 py-3.5 bg-[#07535f] hover:bg-[#06424b] text-white rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={loading}
                    disabled={loading}
                    className="w-full mt-2 py-3.5 text-xs sm:text-sm font-extrabold rounded-2xl"
                  >
                    {loading ? 'Creating Customer Account...' : 'Create Customer Account'}
                  </Button>
                )}
              </div>
            )}

            {/* ── STEP 2: Provider Professional Profile & KYC ── */}
            {formData.role === 'provider' && step === 2 && (
              <div className="space-y-6 pt-1 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-[#07535f]" />
                  <h3 className="text-sm font-extrabold text-[#07535f] uppercase tracking-wide">
                    Professional Specialty & KYC Verification
                  </h3>
                </div>

                {/* Primary Service Specialty Card Grid */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Primary Service Specialty *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {CATEGORY_OPTIONS.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = formData.categoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, categoryId: cat.id }))}
                          className={`p-3 rounded-2xl border text-left transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'border-[#07535f] bg-[#07535f] text-white shadow-md'
                              : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-[#07535f]/40 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#07535f]'}`} />
                          <span className="text-xs font-bold text-center">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Experience & Hourly Rate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Years of Experience *"
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    onBlur={() => handleBlur('experience')}
                    error={experienceError}
                    success={experienceSuccess}
                    placeholder="e.g. 5"
                    min="0"
                    required
                  />
                  <Input
                    label="Hourly Rate (Rs.) *"
                    type="number"
                    name="hourlyRate"
                    value={formData.hourlyRate}
                    onChange={handleChange}
                    onBlur={() => handleBlur('hourlyRate')}
                    error={hourlyRateError}
                    success={hourlyRateSuccess}
                    placeholder="e.g. 600"
                    min="100"
                    required
                  />
                </div>

                {/* Bio / Qualifications */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Professional Bio & Qualifications *</span>
                    {bioSuccess && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    onBlur={() => handleBlur('bio')}
                    placeholder="Describe your qualifications, certifications, tools, and background experience..."
                    rows={3}
                    className={`w-full p-3.5 rounded-2xl text-xs font-medium outline-none transition-all resize-none border-2 ${
                      bioError
                        ? 'border-red-400 bg-red-50/20 text-slate-800'
                        : bioSuccess
                        ? 'border-emerald-500 bg-emerald-50/20 text-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#07535f] focus:ring-2 focus:ring-[#07535f]/20'
                    }`}
                    required
                  />
                  {bioError && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      {bioError}
                    </p>
                  )}
                </div>

                {/* Identity Document Verification */}
                <div className="space-y-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#07535f]" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Identity & Document Verification</h4>
                  </div>

                  <Input
                    label="Citizenship / Driving License Number *"
                    type="text"
                    name="citizenshipNo"
                    value={formData.citizenshipNo}
                    onChange={handleChange}
                    onBlur={() => handleBlur('citizenshipNo')}
                    error={citizenshipNoError}
                    success={citizenshipNoSuccess}
                    placeholder="e.g. 27-01-79-12345"
                    required
                  />

                  {/* ID Document Upload Dropzone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>ID Document Photo (Citizenship / License) *</span>
                    </label>
                    {idImagePreview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
                        <img
                          src={idImagePreview}
                          alt="ID Document Preview"
                          className="w-full h-36 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIdImagePreview(null);
                            setIdImageBase64('');
                          }}
                          className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow hover:bg-white text-slate-700 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-300 rounded-2xl py-6 px-4 flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-[#07535f] hover:text-[#07535f] hover:bg-white transition-all cursor-pointer"
                      >
                        <Upload className="w-6 h-6 text-[#07535f]" />
                        <span className="text-xs font-bold text-slate-700">Click to upload document photo</span>
                        <span className="text-[11px] text-slate-400">JPG or PNG (max 5MB)</span>
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
                </div>

                {/* Background Check Consent */}
                <div
                  onClick={() => setBgCheckConsent((p) => !p)}
                  className={`cursor-pointer flex items-start gap-3 p-4 rounded-2xl border-2 transition-all ${
                    bgCheckConsent
                      ? 'border-[#07535f] bg-[#07535f]/5 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 mt-0.5 shrink-0 ${
                      bgCheckConsent ? 'bg-[#07535f] border-[#07535f]' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {bgCheckConsent && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900">I consent to a background check & identity verification</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Gharelu Sewa verifies identity records and credentials for all service professionals to ensure safety across Nepal.
                    </p>
                  </div>
                </div>

                {/* Trust Guarantee Banner */}
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-900">Next Steps for Professional Verification</span>
                  </div>
                  <ul className="text-xs text-emerald-700 space-y-1 pl-1">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Documents submitted to Gharelu Sewa Admin review queue</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified badge added to your profile upon approval</li>
                  </ul>
                </div>

                {/* Buttons for Step 2 */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Step 1
                  </button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={loading}
                    disabled={loading}
                    className="flex-1 py-3 text-xs sm:text-sm font-extrabold rounded-2xl"
                  >
                    {loading ? 'Submitting Application...' : 'Submit Application & Complete KYC'}
                  </Button>
                </div>

              </div>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-600 text-xs sm:text-sm font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-[#07535f] hover:underline font-bold">
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
