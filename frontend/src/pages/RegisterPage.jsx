import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { AlertCircle } from 'lucide-react';

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
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, role: roleParam }));
  }, [roleParam]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...submitData } = formData;
      const result = await register(submitData);
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {formData.role === 'provider' ? 'Become a Tasker' : 'Join Gharelu Sewa'}
          </h1>
          <p className="text-gray-600 mt-2">
            {formData.role === 'provider' ? 'Register your skills and start earning' : 'Create your account in minutes'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="Enter your email"
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter your phone number"
          />

          <Input
            label="Ward/Area"
            type="text"
            name="ward"
            value={formData.ward}
            onChange={handleChange}
            placeholder="e.g., Lakeside, Chipiyata"
          />

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

          {formData.role === 'provider' && (
            <div className="space-y-4 pt-4 border-t border-gray-200 mt-4">
              <h3 className="text-sm font-bold text-gray-800">Provider Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Primary Service Category
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId || '1'}
                  onChange={handleChange}
                  className="input-field"
                  required={formData.role === 'provider'}
                >
                  <option value="1">Plumbing</option>
                  <option value="2">Electrical</option>
                  <option value="3">Cleaning</option>
                  <option value="4">AC Service</option>
                </select>
              </div>

              <Input
                label="Years of Experience"
                type="number"
                name="experience"
                value={formData.experience || ''}
                onChange={handleChange}
                placeholder="e.g. 5"
                min="0"
                required={formData.role === 'provider'}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Bio / Qualifications
                </label>
                <textarea
                  name="bio"
                  value={formData.bio || ''}
                  onChange={handleChange}
                  placeholder="Describe your qualifications, certifications, and experience..."
                  className="input-field resize-none h-24"
                  required={formData.role === 'provider'}
                />
              </div>

              <Input
                label="Citizenship / License Number"
                type="text"
                name="citizenshipNo"
                value={formData.citizenshipNo || ''}
                onChange={handleChange}
                placeholder="Required for KYC verification"
                required={formData.role === 'provider'}
              />
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-500 font-medium">
              Sign in here
            </Link>
          </p>
        </div>

        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
          <p className="font-medium mb-1">By registering, you agree to our Terms and Privacy Policy</p>
        </div>
      </Card>
    </div>
  );
}
