import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { providerAPI, userAPI } from '../../services/api';
import CityWardSelector from '../../components/CityWardSelector';
import EditProfileModal from '../../components/EditProfileModal';
import Card from '../../components/Card';
import {
  User, Phone, MapPin, Briefcase, Star, Edit3,
  Save, X, Check, Loader, Camera, Shield, Award,
  Clock, AlertCircle, ChevronRight
} from 'lucide-react';

const SERVICE_CATEGORIES = [
  'Plumbing', 'Electrical', 'Cleaning', 'Carpentry',
  'Painting', 'Appliance Repair', 'Pest Control', 'Gardening'
];

const POKHARA_AREAS = [
  'Lakeside (Baidam)', 'Chipiyata', 'Bagar', 'Mahendrapul',
  'New Road', 'Srijana Chowk', 'Prithvi Chowk', 'Mustang Chowk',
  'Nadipur', 'Matepani', 'Ramghat', 'Naya Bazaar', 'Baglung Bus Park',
  'Firke', 'Rambazar', 'Hospital Road', 'Khalte', 'Lamachaur',
];

export default function ProviderProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    bio: '',
    service_area: '',
    hourly_rate: '',
    experience_years: '',
    skills: '',
  });

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
        setForm({
          full_name: data.full_name || user.full_name || '',
          phone: data.phone || user.phone || '',
          bio: data.bio || '',
          service_area: data.service_area || '',
          hourly_rate: data.hourly_rate || '',
          experience_years: data.experience_years || '',
          skills: Array.isArray(data.skills) ? data.skills.join(', ') : (data.skills || ''),
        });
      }
    } catch (err) {
      // fallback to user data if no provider profile yet
      setForm({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        bio: '',
        service_area: '',
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
        ...form,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : undefined,
        experience_years: form.experience_years ? Number(form.experience_years) : undefined,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      await providerAPI.updateProfile(payload);
      setSuccess('Profile updated successfully!');
      setEditing(false);
      fetchProfile();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: '#94a3b8' }}>
        <Loader style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
        <p>Loading profile…</p>
      </div>
    );
  }

  const verificationStatus = profile?.is_verified ? 'verified' : (profile?.verification_status || 'pending');

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>My Profile</h1>
          <p style={{ color: '#64748b' }}>Manage your provider information</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', padding: '0.625rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
          >
            <Edit3 style={{ width: 16, height: 16 }} /> Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => { setEditing(false); fetchProfile(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.625rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
            >
              <X style={{ width: 16, height: 16 }} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '10px', padding: '0.625rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? <Loader style={{ width: 16, height: 16 }} /> : <Save style={{ width: 16, height: 16 }} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Success / Error */}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#15803d' }}>
          <Check style={{ width: 18, height: 18 }} /> {success}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#b91c1c' }}>
          <AlertCircle style={{ width: 18, height: 18 }} /> {error}
        </div>
      )}

      {/* Profile Card */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '1.5rem' }}>
        {/* Avatar band */}
        <div style={{ background: 'linear-gradient(135deg, #07535f 0%, #0a7587 100%)', padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div
            onClick={() => setIsModalOpen(true)}
            style={{ position: 'relative', cursor: 'pointer' }}
            title="Click to edit profile photo"
            className="group"
          >
            <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0, border: '3px solid rgba(255,255,255,0.6)', color: 'white', fontWeight: 700 }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user?.name || 'Provider'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (form.full_name || user?.name || 'P')[0].toUpperCase()
              )}
            </div>
            <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#ffffff', color: '#07535f', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              <Camera style={{ width: 14, height: 14 }} />
            </div>
          </div>
          <div>
            <div style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700 }}>{form.full_name || user?.name || 'Provider'}</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>{user?.email}</div>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {verificationStatus === 'verified' ? (
                <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '3px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Shield style={{ width: 12, height: 12 }} /> KYC Verified
                </span>
              ) : (
                <span style={{ background: 'rgba(255,200,0,0.2)', color: '#fef9c3', padding: '3px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock style={{ width: 12, height: 12 }} /> Verification {verificationStatus}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', padding: '3px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Camera style={{ width: 12, height: 12 }} /> Change Photo
              </button>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {[
              { name: 'full_name',         label: 'Full Name',         icon: User,      type: 'text',   placeholder: 'Your full name' },
              { name: 'phone',             label: 'Phone Number',      icon: Phone,     type: 'tel',    placeholder: '98XXXXXXXX' },
              { name: 'hourly_rate',       label: 'Hourly Rate (Rs)',  icon: Award,     type: 'number', placeholder: 'e.g. 500' },
              { name: 'experience_years',  label: 'Years of Experience', icon: Briefcase, type: 'number', placeholder: 'e.g. 3' },
            ].map(field => {
              const Icon = field.icon;
              return (
                <div key={field.name}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                    {field.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Icon style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94a3b8' }} />
                    <input
                      type={field.type}
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      disabled={!editing}
                      placeholder={field.placeholder}
                      style={{
                        width: '100%', paddingLeft: '2.25rem', paddingRight: '1rem',
                        paddingTop: '0.625rem', paddingBottom: '0.625rem',
                        border: '1px solid', borderColor: editing ? '#c7d2fe' : '#f1f5f9',
                        borderRadius: '8px', fontSize: '0.875rem',
                        background: editing ? 'white' : '#f8fafc',
                        color: '#1e293b', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Service Area dropdown — full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              {editing ? (
                <CityWardSelector
                  value={form.service_area}
                  onChange={(w) => setForm(prev => ({ ...prev, service_area: w }))}
                  layout="row"
                />
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                    Service Area
                  </label>
                  <div style={{ position: 'relative' }}>
                    <MapPin style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={form.service_area || '—'}
                      disabled
                      style={{
                        width: '100%', paddingLeft: '2.25rem', paddingRight: '1rem',
                        paddingTop: '0.625rem', paddingBottom: '0.625rem',
                        border: '1px solid #f1f5f9', borderRadius: '8px',
                        fontSize: '0.875rem', background: '#f8fafc', color: '#1e293b',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Skills */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                Skills (comma-separated)
              </label>
              <input
                type="text"
                name="skills"
                value={form.skills}
                onChange={handleChange}
                disabled={!editing}
                placeholder="e.g. Pipe Repair, Tap Replacement, Drain Cleaning"
                style={{
                  width: '100%', padding: '0.625rem 1rem',
                  border: '1px solid', borderColor: editing ? '#c7d2fe' : '#f1f5f9',
                  borderRadius: '8px', fontSize: '0.875rem',
                  background: editing ? 'white' : '#f8fafc',
                  color: '#1e293b', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {/* Skills tag preview */}
              {form.skills && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {form.skills.split(',').map(s => s.trim()).filter(Boolean).map(skill => (
                    <span key={skill} style={{ background: '#eef2ff', color: '#4338ca', padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500 }}>
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Bio */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                Bio / About Me
              </label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                disabled={!editing}
                placeholder="Write a short description about yourself and your services…"
                rows={4}
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  border: '1px solid', borderColor: editing ? '#c7d2fe' : '#f1f5f9',
                  borderRadius: '8px', fontSize: '0.875rem',
                  background: editing ? 'white' : '#f8fafc',
                  color: '#1e293b', outline: 'none',
                  resize: editing ? 'vertical' : 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* KYC Status Info */}
      <div style={{ background: verificationStatus === 'verified' ? '#f0fdf4' : '#fef9c3', borderRadius: '12px', padding: '1.25rem', border: '1px solid', borderColor: verificationStatus === 'verified' ? '#bbf7d0' : '#fde68a', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {verificationStatus === 'verified' ? (
          <>
            <Shield style={{ width: 24, height: 24, color: '#16a34a', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#15803d' }}>KYC Verified ✓</div>
              <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: 2 }}>Your identity has been verified by Gharelu Sewa admin. You can accept bookings.</div>
            </div>
          </>
        ) : (
          <>
            <Clock style={{ width: 24, height: 24, color: '#ca8a04', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#92400e' }}>KYC Verification {verificationStatus}</div>
              <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: 2 }}>Your documents are under review. You'll be notified once verified.</div>
            </div>
          </>
        )}
      </div>
      <EditProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaveSuccess={fetchProfile} />
    </div>
  );
}
