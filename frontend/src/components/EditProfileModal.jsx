import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, providerAPI } from '../services/api';
import CityWardSelector from './CityWardSelector';
import Button from './Button';
import { X, Camera, Upload, User, Phone, MapPin, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function EditProfileModal({ isOpen, onClose, onSaveSuccess }) {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ward, setWard] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  const [previewPhoto, setPreviewPhoto] = useState('');
  const [photoMode, setPhotoMode] = useState('file'); // 'file' | 'url'
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setWard(user.ward || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatar_url || '');
      setPreviewPhoto(user.avatar_url || '');
      setUrlInput(user.avatar_url || '');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WebP)');
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name,
        phone,
        ward,
        bio,
        avatar_url: avatarUrl,
      };

      const res = await userAPI.updateProfile(payload);
      let updatedUserData = res.data.user || res.data;

      // If user is a provider and set hourly rate
      if (user?.role === 'provider' && hourlyRate) {
        try {
          await providerAPI.updateProfile({ hourly_rate: Number(hourlyRate) });
        } catch (pErr) {
          console.warn('Failed to update provider rate', pErr);
        }
      }

      updateUser({ ...user, ...updatedUserData, avatar_url: avatarUrl || updatedUserData.avatar_url });
      setSuccess('Profile and photo updated successfully!');

      if (onSaveSuccess) onSaveSuccess(updatedUserData);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to update profile', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#07535f] to-[#0a7587] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Edit Profile & Photo</h2>
              <p className="text-xs text-white/80">Customize your avatar and account information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Avatar Click & Change Section */}
          <div className="flex flex-col items-center justify-center bg-gray-50/80 p-5 rounded-2xl border border-gray-100">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-[#07535f]/20 shadow-md bg-gray-200">
                {previewPhoto ? (
                  <img src={previewPhoto} alt="Profile Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#07535f] text-white text-3xl font-bold">
                    {(name || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-7 h-7" />
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#07535f] text-white flex items-center justify-center shadow-lg border-2 border-white hover:bg-[#06424b] transition-colors"
                title="Change Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 text-center">
              <p className="text-xs font-bold text-gray-800">Click photo to upload from computer</p>
              <p className="text-[11px] text-gray-500 mt-0.5">JPG, PNG, WebP supported</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Toggle file vs url upload option */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPhotoMode(photoMode === 'file' ? 'url' : 'file')}
                className="text-[11px] font-semibold text-[#07535f] hover:underline"
              >
                {photoMode === 'file' ? 'Or use image URL string →' : '← Back to file upload'}
              </button>
            </div>

            {photoMode === 'url' && (
              <div className="mt-3 w-full flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f]"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3 py-1.5 bg-[#07535f] text-white text-xs font-bold rounded-xl hover:bg-[#06424b] transition-colors"
                >
                  Set URL
                </button>
              </div>
            )}
          </div>

          {/* Inputs Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your full name"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f]"
                />
              </div>
            </div>

            {/* Workplace / Ward Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {user?.role === 'provider' ? 'Workplace / Service Area (Specific Ward or Whole City) *' : 'Location / Ward *'}
              </label>
              <CityWardSelector
                value={ward}
                onChange={(w) => setWard(w)}
                required
                layout="col"
                showLabels={false}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Bio / About</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a short bio or qualifications..."
                rows={3}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f] resize-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="flex-1 py-2.5 text-xs font-bold"
            >
              {loading ? 'Saving Profile...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
