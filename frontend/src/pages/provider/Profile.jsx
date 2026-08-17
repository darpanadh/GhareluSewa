import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { providerAPI } from '../../services/api';
import MultiWardSelector from '../../components/MultiWardSelector';
import EditProfileModal from '../../components/EditProfileModal';
import {
  User, Phone, MapPin, Briefcase, Edit3,
  Save, X, Loader2, Camera, ShieldCheck, Award,
  Clock, AlertCircle, Tag, CheckCircle2,
  DollarSign, Plus
} from 'lucide-react';

export default function ProviderProfile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'wards' | 'skills' | 'kyc'
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    bio: '',
    service_area: '',
    service_wards: '',
    hourly_rate: '',
    experience_years: '',
    skills: '',
  });

  const [newSkillInput, setNewSkillInput] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      if (user?.id) {
        const res = await providerAPI.getProfile(user.id);
        const data = res.data || {};
        setProfile(data);

        // Sync verification status to context user if available
        if (updateUser && data.is_verified !== undefined && data.is_verified !== user?.is_verified) {
          updateUser({
            ...user,
            is_verified: data.is_verified,
          });
        }

        setForm({
          full_name: data.full_name || user.full_name || user.name || '',
          phone: data.phone || user.phone || '',
          bio: data.bio || user.bio || '',
          service_area: data.service_area || user.ward || '',
          service_wards: data.service_wards || data.service_area || user.ward || '',
          hourly_rate: data.hourly_rate ?? '',
          experience_years: data.experience_years ?? '',
          skills: Array.isArray(data.skills) ? data.skills.join(', ') : (data.skills || ''),
        });
      }
    } catch (err) {
      console.warn('Fallback to context user data', err);
      setForm({
        full_name: user?.full_name || user?.name || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
        service_area: user?.ward || '',
        service_wards: user?.ward || '',
        hourly_rate: '',
        experience_years: '',
        skills: '',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        full_name: form.full_name,
        phone: form.phone,
        bio: form.bio,
        service_area: form.service_wards || form.service_area,
        service_wards: form.service_wards || form.service_area,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : undefined,
        experience_years: form.experience_years ? Number(form.experience_years) : undefined,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      await providerAPI.updateProfile(payload);
      
      // Also sync context user if name/phone changed
      if (updateUser) {
        updateUser({
          ...user,
          name: form.full_name,
          phone: form.phone,
          bio: form.bio,
          ward: form.service_wards || form.service_area,
        });
      }

      setSuccess('Profile updated successfully!');
      setEditing(false);
      fetchProfile();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Update profile error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddSkillChip = () => {
    if (!newSkillInput.trim()) return;
    const currentSkills = form.skills
      ? form.skills.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    if (!currentSkills.includes(newSkillInput.trim())) {
      const updated = [...currentSkills, newSkillInput.trim()].join(', ');
      setForm(prev => ({ ...prev, skills: updated }));
    }
    setNewSkillInput('');
  };

  const handleRemoveSkillChip = (skillToRemove) => {
    const currentSkills = form.skills
      ? form.skills.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const updated = currentSkills.filter(s => s !== skillToRemove).join(', ');
    setForm(prev => ({ ...prev, skills: updated }));
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-[#07535f] mb-3" />
        <p className="text-sm font-medium">Loading provider profile…</p>
      </div>
    );
  }

  const isVerified = Boolean(
    profile?.is_verified === true ||
    user?.is_verified === true ||
    profile?.is_verified === 1 ||
    user?.is_verified === 1 ||
    profile?.background_check_status === 'approved' ||
    profile?.background_check_status === 'verified' ||
    profile?.verification_status === 'approved' ||
    profile?.verification_status === 'verified'
  );
  const verificationStatus = isVerified ? 'verified' : (profile?.verification_status || profile?.background_check_status || 'pending');
  const skillsList = form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
  const serviceWardsList = (form.service_wards || form.service_area || user?.ward || '')
    .split(',')
    .map(w => w.trim())
    .filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      
      {/* Alert Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-semibold">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Profile Hero Banner Card ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg overflow-hidden">
        
        {/* Cover Graphic Header */}
        <div className="relative bg-gradient-to-r from-[#07535f] via-[#096472] to-[#0d7888] px-6 pt-8 pb-16 text-white">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs border border-white/20 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" /> Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditing(false); fetchProfile(); }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/20 cursor-pointer"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            
            {/* Avatar with click action */}
            <div 
              className="relative group cursor-pointer"
              onClick={() => setIsModalOpen(true)}
              title="Click to update photo"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-200 flex items-center justify-center text-3xl font-extrabold text-[#07535f]">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user?.name || 'Provider'} className="w-full h-full object-cover" />
                ) : (
                  (form.full_name || user?.name || 'P')[0].toUpperCase()
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-6 h-6" />
              </div>
              <button 
                className="absolute bottom-1 right-1 p-1.5 bg-white text-[#07535f] rounded-full shadow-lg border border-slate-100 cursor-pointer"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Provider Details */}
            <div className="text-center sm:text-left space-y-1 pb-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {form.full_name || user?.name || 'Service Provider'}
                </h1>
                {verificationStatus === 'verified' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> KYC Verified
                  </span>
                )}
              </div>

              <p className="text-white/80 text-xs sm:text-sm font-medium flex items-center justify-center sm:justify-start gap-2">
                <span>{profile?.category_name || 'Home Service Provider'}</span>
                <span>•</span>
                <span>{user?.email}</span>
              </p>
            </div>

          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="bg-slate-50/90 border-b border-slate-200/80 px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium block">Hourly Rate</span>
            <span className="text-base font-bold text-slate-800">
              {form.hourly_rate ? `Rs. ${form.hourly_rate}/hr` : 'Not Set'}
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium block">Experience</span>
            <span className="text-base font-bold text-slate-800">
              {form.experience_years ? `${form.experience_years} Years` : 'Fresh'}
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium block">Service Coverage</span>
            <span className="text-base font-bold text-[#07535f]">
              {serviceWardsList.length > 0 ? `${serviceWardsList.length} Wards` : 'None'}
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium block">Account Status</span>
            <span className={`text-sm font-bold capitalize ${verificationStatus === 'verified' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {verificationStatus}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white overflow-x-auto">
          {[
            { id: 'info', label: 'Basic Info', icon: User },
            { id: 'wards', label: 'Service Wards', icon: MapPin },
            { id: 'skills', label: 'Skills & Bio', icon: Award },
            { id: 'kyc', label: 'KYC & Verification', icon: ShieldCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-4 font-semibold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#07535f] text-[#07535f]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#07535f]' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="p-6 sm:p-8">
          
          {/* TAB 1: BASIC INFO */}
          {activeTab === 'info' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Personal & Contact Information</h3>
                  <p className="text-xs text-slate-500">Keep your primary contact details up to date</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="full_name"
                      value={form.full_name}
                      onChange={handleChange}
                      disabled={!editing}
                      placeholder="e.g. Ram Shrestha"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all outline-none ${
                        editing
                          ? 'bg-white border border-indigo-200 focus:ring-2 focus:ring-[#07535f]'
                          : 'bg-slate-50 border border-slate-200 text-slate-700'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      disabled={!editing}
                      placeholder="98XXXXXXXX"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all outline-none ${
                        editing
                          ? 'bg-white border border-indigo-200 focus:ring-2 focus:ring-[#07535f]'
                          : 'bg-slate-50 border border-slate-200 text-slate-700'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hourly Rate (Rs)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      name="hourly_rate"
                      value={form.hourly_rate}
                      onChange={handleChange}
                      disabled={!editing}
                      placeholder="e.g. 500"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all outline-none ${
                        editing
                          ? 'bg-white border border-indigo-200 focus:ring-2 focus:ring-[#07535f]'
                          : 'bg-slate-50 border border-slate-200 text-slate-700'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Years of Experience</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      name="experience_years"
                      value={form.experience_years}
                      onChange={handleChange}
                      disabled={!editing}
                      placeholder="e.g. 4"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all outline-none ${
                        editing
                          ? 'bg-white border border-indigo-200 focus:ring-2 focus:ring-[#07535f]'
                          : 'bg-slate-50 border border-slate-200 text-slate-700'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SERVICE WARDS & COVERAGE */}
          {activeTab === 'wards' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Service Coverage Wards</h3>
                  <p className="text-xs text-slate-500">Select all Pokhara wards where you can accept job requests</p>
                </div>
              </div>

              {editing ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <MultiWardSelector
                    value={form.service_wards || form.service_area || user?.ward || ''}
                    onChange={(w) => setForm(prev => ({ ...prev, service_wards: w, service_area: w }))}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-2 mb-3 text-slate-700 text-xs font-bold">
                      <MapPin className="w-4 h-4 text-[#07535f]" /> Active Service Areas ({serviceWardsList.length})
                    </div>

                    {serviceWardsList.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {serviceWardsList.map(w => (
                          <span
                            key={w}
                            className="px-3 py-1.5 bg-sky-100 text-sky-800 font-semibold text-xs rounded-xl border border-sky-200 flex items-center gap-1.5"
                          >
                            <MapPin className="w-3 h-3 text-sky-600" /> {w}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">No service wards selected yet. Click "Edit Profile" to add wards.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SKILLS & BIO */}
          {activeTab === 'skills' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Skills Chip Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Skills & Specializations</h3>
                    <p className="text-xs text-slate-500">Showcase your technical skills to potential customers</p>
                  </div>
                </div>

                {editing && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkillChip(); } }}
                      placeholder="Type a skill (e.g. Pipe Fitting, Wiring) and press Enter"
                      className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#07535f]"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkillChip}
                      className="px-4 py-2 bg-[#07535f] text-white rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-[#06424b] transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Skill
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {skillsList.length > 0 ? (
                    skillsList.map(skill => (
                      <span
                        key={skill}
                        className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-xs rounded-xl flex items-center gap-1.5"
                      >
                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                        {skill}
                        {editing && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSkillChip(skill)}
                            className="ml-1 text-indigo-400 hover:text-indigo-700 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No skills added yet.</p>
                  )}
                </div>
              </div>

              {/* Bio Section */}
              <div className="space-y-2 pt-4">
                <label className="block text-xs font-semibold text-slate-700">Bio / Service Description</label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  disabled={!editing}
                  rows={4}
                  placeholder="Introduce yourself, your experience, and what makes your work reliable..."
                  className={`w-full p-4 rounded-xl text-xs sm:text-sm outline-none transition-all ${
                    editing
                      ? 'bg-white border border-indigo-200 focus:ring-2 focus:ring-[#07535f] resize-y'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 resize-none'
                  }`}
                />
              </div>

            </div>
          )}

          {/* TAB 4: KYC & VERIFICATION */}
          {activeTab === 'kyc' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Verification & KYC Status</h3>
                  <p className="text-xs text-slate-500">Verified status boosts your profile rank and builds trust</p>
                </div>
              </div>

              <div className={`p-6 rounded-2xl border ${
                verificationStatus === 'verified'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-start gap-4">
                  {verificationStatus === 'verified' ? (
                    <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600 flex-shrink-0">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 flex-shrink-0">
                      <Clock className="w-8 h-8" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <h4 className="text-base font-bold">
                      {verificationStatus === 'verified' ? 'Account Verified ✓' : 'Verification Under Review'}
                    </h4>
                    <p className="text-xs sm:text-sm opacity-90">
                      {verificationStatus === 'verified'
                        ? 'Your identity documents have been authenticated by Gharelu Sewa administrators. Your profile shows a verified badge to customers.'
                        : 'Your account details are currently under review by our admin team. You can still customize your profile in the meantime.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Benefits of Verified Providers</h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> High placement in customer search results
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Trust Badge displayed on your profile card
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Ability to receive high-value & emergency service requests
                  </li>
                </ul>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Edit Photo & Account Modal */}
      <EditProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveSuccess={fetchProfile}
      />
    </div>
  );
}
