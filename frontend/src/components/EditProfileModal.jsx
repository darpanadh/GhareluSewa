import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, providerAPI } from '../services/api';
import ResidenceSelector from './ResidenceSelector';
import MultiWardSelector from './MultiWardSelector';
import Button from './Button';
import {
  X, Camera, Upload, User, Phone, MapPin, CheckCircle2,
  AlertCircle, Loader2, Link2, Sparkles, Award, DollarSign,
  Briefcase, ShieldCheck, Tag
} from 'lucide-react';

export default function EditProfileModal({ isOpen, onClose, onSaveSuccess }) {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ward, setWard] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [experienceYears, setExperienceYears] = useState('');

  const [previewPhoto, setPreviewPhoto] = useState('');
  const [photoMode, setPhotoMode] = useState('file'); // 'file' | 'url'
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setName(user.name || user.full_name || '');
      setPhone(user.phone || '');
      setWard(user.ward || user.service_wards || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatar_url || '');
      setPreviewPhoto(user.avatar_url || '');
      setUrlInput(user.avatar_url || '');
      setHourlyRate(user.hourly_rate ?? '');
      setExperienceYears(user.experience_years ?? '');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
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

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setPreviewPhoto(compressedBase64);
        setAvatarUrl(compressedBase64);
        setError('');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setPreviewPhoto(urlInput.trim());
    setAvatarUrl(urlInput.trim());
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name,
        full_name: name,
        phone,
        ward,
        bio,
        avatar_url: avatarUrl,
      };

      const res = await userAPI.updateProfile(payload);
      let updatedUserData = res.data?.user || res.data;

      // If user is a provider, also update provider profile details
      if (user?.role === 'provider') {
        try {
          await providerAPI.updateProfile({
            full_name: name,
            phone,
            bio,
            service_wards: ward,
            service_area: ward,
            hourly_rate: hourlyRate ? Number(hourlyRate) : undefined,
            experience_years: experienceYears ? Number(experienceYears) : undefined,
          });
        } catch (pErr) {
          console.warn('Provider profile sync note:', pErr);
        }
      }

      updateUser({
        ...user,
        ...updatedUserData,
        name,
        phone,
        ward,
        bio,
        avatar_url: avatarUrl || updatedUserData.avatar_url,
      });

      setSuccess('Profile updated successfully!');

      if (onSaveSuccess) onSaveSuccess(updatedUserData);
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1200);
    } catch (err) {
      console.error('Failed to update profile', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to update profile changes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Hero Header */}
        <div className="bg-gradient-to-r from-[#07535f] via-[#096472] to-[#0d7888] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Edit Profile & Account</h2>
              <p className="text-xs text-white/80 font-medium">Update your photo, contact details, and preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Notifications */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-2xl flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* ── Photo Upload Dropzone & Avatar Card ── */}
          <div className="flex flex-col items-center justify-center bg-slate-50/80 p-5 rounded-2xl border border-slate-200/70 space-y-3">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              title="Click to select photo"
            >
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-200 flex items-center justify-center text-3xl font-extrabold text-[#07535f]">
                {previewPhoto ? (
                  <img src={previewPhoto} alt="Profile Avatar" className="w-full h-full object-cover" />
                ) : (
                  (name || user?.name || 'U')[0].toUpperCase()
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-7 h-7" />
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#07535f] text-white flex items-center justify-center shadow-lg border-2 border-white hover:bg-[#06424b] transition-colors cursor-pointer"
                title="Change Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-0.5">
              <p className="text-xs font-bold text-slate-800">Click avatar to upload new photo</p>
              <p className="text-[11px] text-slate-500">Supports JPG, PNG, WebP image files</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Toggle File vs URL input option */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setPhotoMode(photoMode === 'file' ? 'url' : 'file')}
                className="text-[11px] font-semibold text-[#07535f] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {photoMode === 'file' ? (
                  <> <Link2 className="w-3.5 h-3.5" /> Or paste image URL link → </>
                ) : (
                  <> <Upload className="w-3.5 h-3.5" /> ← Back to file upload </>
                )}
              </button>
            </div>

            {photoMode === 'url' && (
              <div className="w-full flex items-center gap-2 pt-1 animate-in fade-in">
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#07535f]"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3.5 py-2 bg-[#07535f] text-white text-xs font-bold rounded-xl hover:bg-[#06424b] transition-colors cursor-pointer"
                >
                  Set URL
                </button>
              </div>
            )}
          </div>

          {/* ── Personal Info Inputs ── */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#07535f]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#07535f]"
                />
              </div>
            </div>

            {/* Provider Rate & Experience (if Provider role) */}
            {user?.role === 'provider' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hourly Rate (Rs.)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#07535f]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Years of Experience</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      placeholder="e.g. 4"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#07535f]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Residence Location / Service Area */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                📍 Residence Location / Service Area *
              </label>
              {user?.role === 'provider' ? (
                <MultiWardSelector
                  value={ward}
                  onChange={(w) => setWard(w)}
                />
              ) : (
                <ResidenceSelector
                  value={ward}
                  onChange={(w) => setWard(w)}
                  required
                  layout="col"
                  showLabels={false}
                />
              )}
            </div>

            {/* Bio / About */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bio / Qualifications</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a short summary about your experience or services..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#07535f] resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="flex-1 py-3 text-xs font-bold rounded-xl cursor-pointer"
            >
              {loading ? 'Saving Changes...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
