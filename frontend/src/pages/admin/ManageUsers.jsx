import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Users, Search, Ban, CheckCircle, Shield, User } from 'lucide-react';
import { format } from 'date-fns';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAllUsers();
      const data = Array.isArray(res.data) ? res.data : [];
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (user) => {
    setActionLoading(user.id);
    try {
      if (user.is_active) {
        await adminAPI.deactivateUser(user.id, { reason: 'Admin action' });
      } else {
        await adminAPI.activateUser(user.id);
      }
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      setSuccess(`User "${user.name}" ${user.is_active ? 'deactivated' : 'activated'} successfully.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter(u => {
    const matchRole = roleFilter === '' || u.role === roleFilter;
    const matchSearch = search === '' ||
      `${u.name} ${u.email} ${u.ward || ''}`.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const counts = {
    all: users.length,
    customer: users.filter(u => u.role === 'customer').length,
    provider: users.filter(u => u.role === 'provider').length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="w-8 h-8 text-[#07535f]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Database</h1>
          <p className="text-sm text-gray-500">View and manage all registered customers and providers.</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: counts.all, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Customers', value: counts.customer, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Providers', value: counts.provider, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Inactive', value: counts.inactive, color: 'text-red-500', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Success alert */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by name, email, or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#07535f] cursor-pointer"
        >
          <option value="">All Roles</option>
          <option value="customer">Customers</option>
          <option value="provider">Providers</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Joined</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="6" className="px-5 py-4">
                      <div className="h-8 bg-gray-100 rounded-xl animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-gray-400 text-sm">No users found.</td>
                </tr>
              ) : (
                filtered.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#07535f]/10 flex items-center justify-center text-[#07535f] font-bold text-sm flex-shrink-0">
                          {user.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{user.name}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'provider' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                        }`}>
                          {user.role}
                        </span>
                        {user.role === 'provider' && user.is_verified && (
                          <Shield className="w-3.5 h-3.5 text-green-500" title="Verified" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">{user.ward || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`flex items-center gap-1 text-xs font-bold ${
                        user.is_active ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {user.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={actionLoading === user.id}
                        className={`text-xs font-bold px-4 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                          user.is_active
                            ? 'text-red-500 border-red-100 bg-red-50 hover:bg-red-100'
                            : 'text-green-600 border-green-100 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {actionLoading === user.id ? '...' : user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
