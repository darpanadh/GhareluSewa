import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CityWardSelector from '../components/CityWardSelector';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { AlertCircle, ShieldCheck, Upload, CheckSquare, Square, BadgeCheck, X } from 'lucide-react';

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
    name: '', email: '', phone: '', password: '',
    confirmPassword: '', role: roleParam, ward: '',
    categoryId: '1', experience: '', bio: '', citizenshipNo: '',
  });

  const [skillBadges, setSkillBadges] = useState([]);
  const [bgCheckConsent, setBgCheckConsent] = useState(false);
  const [idImagePreview, setIdImagePreview] = useState(null);
  const [idImageBase64, setIdImageBase64] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    setFormData(prev => ({ ...prev, role: roleParam }));
  }, [roleParam]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleSkill = (skill) => {
    setSkillBadges(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
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
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
    if (formData.password.length < 6) return setError('Password must be at least 6 characters');
    if (formData.role === 'provider' && !bgCheckConsent) return setError('Please consent to background check to register as a provider');

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
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07535f]/5 to-[#07535f]/10 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#07535f] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <span className="text-white text-2xl font-bold font-serif">G</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            {formData.role === 'provider' ? 'Become a Tasker' : 'Join Gharelu Sewa'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            {formData.role === 'provider' ? 'Complete KYC to start earning as a verified provider' : 'Create your account in minutes'}
          </p>
        </div>

        <Card className="w-full">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Toggle */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-2">
              {['customer', 'provider'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: r }))}
                  className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                    formData.role === r
                      ? 'bg-[#07535f] text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {r === 'provider' ? '🔧 Service Provider' : '🏠 Customer'}
                </button>
              ))}
            </div>

            <Input label="Full Name" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your full name" required />
            <Input label="Email Address" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" required />
            <Input label="Phone Number" type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="98XXXXXXXX" />

            <div>
              {formData.role === 'provider' && (
                <p className="text-xs font-semibold text-[#07535f] mb-1">
                  📍 Workplace / Coverage Area (Select Specific Ward or Whole City):
                </p>
              )}
              <CityWardSelector
                value={formData.ward}
                onChange={(w) => setFormData(prev => ({ ...prev, ward: w }))}
                required
                layout="row"
              />
            </div>

            <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="At least 6 characters" required />
            <Input label="Confirm Password" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" required />

            {/* ── Provider Trust Section ─────────────────────────────────── */}
            {formData.role === 'provider' && (
              <div className="space-y-5 pt-4 border-t-2 border-[#07535f]/10 mt-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#07535f]" />
                  <h3 className="text-sm font-extrabold text-[#07535f] uppercase tracking-wide">Verified Trust System</h3>
                </div>

                {/* Service Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Primary Service Category *</label>
                  <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#07535f]/30" required>
                    <option value="1">🔧 Plumbing</option>
                    <option value="2">⚡ Electrical</option>
                    <option value="3">🧹 Cleaning</option>
                    <option value="4">❄️ AC Service</option>
                  </select>
                </div>

                {/* Experience & Rate */}
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Years of Experience" type="number" name="experience" value={formData.experience} onChange={handleChange} placeholder="e.g. 5" min="0" required />
                  <Input label="Hourly Rate (Rs.)" type="number" name="hourlyRate" value={formData.hourlyRate || ''} onChange={handleChange} placeholder="e.g. 600" min="100" />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bio / Qualifications *</label>
                  <textarea
                    name="bio" value={formData.bio} onChange={handleChange}
                    placeholder="Describe your qualifications, certifications, and experience..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#07535f]/30 resize-none h-24"
                    required
                  />
                </div>

                {/* Citizenship No */}
                <Input label="Citizenship / License Number *" type="text" name="citizenshipNo" value={formData.citizenshipNo} onChange={handleChange} placeholder="Required for KYC verification" required />

                {/* ID Document Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    ID Document Photo
                    <span className="ml-1.5 text-xs text-gray-400 font-normal">(Citizenship / License)</span>
                  </label>
                  {idImagePreview ? (
                    <div className="relative">
                      <img src={idImagePreview} alt="ID Preview" className="w-full h-32 object-cover rounded-xl border border-gray-200" />
                      <button type="button" onClick={() => { setIdImagePreview(null); setIdImageBase64(''); }} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:border-[#07535f] hover:text-[#07535f] transition-colors"
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-xs font-semibold">Click to upload ID document</span>
                      <span className="text-[10px]">JPG, PNG up to 5MB</span>
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleIdImageChange} />
                </div>

                {/* Skill Badges */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Skill Badges
                    <span className="ml-1.5 text-xs text-gray-400 font-normal">(select all that apply)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_OPTIONS.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          skillBadges.includes(skill)
                            ? 'bg-[#07535f] text-white border-[#07535f]'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#07535f]'
                        }`}
                      >
                        {skillBadges.includes(skill) ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                        {skill}
                      </button>
                    ))}
                  </div>
                  {skillBadges.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                      <BadgeCheck className="w-4 h-4" />
                      {skillBadges.length} skill{skillBadges.length > 1 ? 's' : ''} selected
                    </div>
                  )}
                </div>

                {/* Background Check Consent */}
                <div
                  onClick={() => setBgCheckConsent(p => !p)}
                  className={`cursor-pointer flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                    bgCheckConsent ? 'border-[#07535f] bg-[#07535f]/5' : 'border-gray-200 hover:border-[#07535f]/40'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 mt-0.5 shrink-0 ${
                    bgCheckConsent ? 'bg-[#07535f] border-[#07535f]' : 'border-gray-300'
                  }`}>
                    {bgCheckConsent && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">I consent to a background check</p>
                    <p className="text-xs text-gray-500 mt-0.5">Gharelu Sewa will verify your identity, criminal record, and professional credentials. This is required for all providers.</p>
                  </div>
                </div>

                {/* Trust Info Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <p className="text-xs font-bold text-emerald-800">What happens after registration?</p>
                  </div>
                  <ul className="text-xs text-emerald-700 space-y-1">
                    <li>✓ Admin verifies your ID and citizenship number</li>
                    <li>✓ Background check is conducted within 48 hours</li>
                    <li>✓ Skill badges are reviewed and approved</li>
                    <li>✓ You get a verified badge visible to customers</li>
                  </ul>
                </div>
              </div>
            )}

            <Button type="submit" variant="primary" size="md" loading={loading} disabled={loading} className="w-full mt-2">
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#07535f] hover:text-[#06424b] font-bold">Sign in here</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
