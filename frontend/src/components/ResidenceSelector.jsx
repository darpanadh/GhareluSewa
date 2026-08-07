import React, { useState, useEffect } from 'react';
import { NEPAL_PROVINCES } from '../data/nepalLocations';
import { MapPin, Building2 } from 'lucide-react';

export function parseResidenceString(residenceStr = '') {
  if (!residenceStr) return { province: '', district: '' };
  const parts = residenceStr.split(',').map((s) => s.trim());
  if (parts.length >= 2) {
    const district = parts[0];
    const province = parts[1];
    return { province, district };
  }
  // If only province or district is present
  const foundProv = NEPAL_PROVINCES.find((p) => p.name === residenceStr);
  if (foundProv) return { province: foundProv.name, district: '' };
  return { province: '', district: residenceStr };
}

export default function ResidenceSelector({
  value = '',
  onChange,
  required = false,
  showLabels = true,
  layout = 'row', // 'col' | 'row'
  className = '',
}) {
  const parsed = parseResidenceString(value);
  const [selectedProvince, setSelectedProvince] = useState(parsed.province);
  const [selectedDistrict, setSelectedDistrict] = useState(parsed.district);

  useEffect(() => {
    const p = parseResidenceString(value);
    setSelectedProvince(p.province);
    setSelectedDistrict(p.district);
  }, [value]);

  const handleProvinceChange = (e) => {
    const provinceName = e.target.value;
    setSelectedProvince(provinceName);
    setSelectedDistrict(''); // Reset district when province changes
    if (onChange) {
      onChange(provinceName ? `${provinceName}` : '');
    }
  };

  const handleDistrictChange = (e) => {
    const districtName = e.target.value;
    setSelectedDistrict(districtName);
    if (onChange) {
      const fullResidence = districtName && selectedProvince
        ? `${districtName}, ${selectedProvince}`
        : districtName || selectedProvince || '';
      onChange(fullResidence);
    }
  };

  const activeProvinceObj = NEPAL_PROVINCES.find((p) => p.name === selectedProvince);
  const districtList = activeProvinceObj ? activeProvinceObj.districts : [];

  return (
    <div className={`space-y-3 ${layout === 'row' ? 'sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0' : ''} ${className}`}>
      {/* 1. Province Selector */}
      <div className="space-y-1">
        {showLabels && (
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#07535f]" />
            Select Province
          </label>
        )}
        <div className="relative">
          <select
            value={selectedProvince}
            onChange={handleProvinceChange}
            required={required}
            className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f] cursor-pointer transition-all"
          >
            <option value="">Choose Province</option>
            {NEPAL_PROVINCES.map((prov) => (
              <option key={prov.id} value={prov.name}>
                {prov.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. District Selector (Dynamically filtered based on selected Province) */}
      <div className="space-y-1">
        {showLabels && (
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#07535f]" />
            Select District
          </label>
        )}
        <div className="relative">
          <select
            value={selectedDistrict}
            onChange={handleDistrictChange}
            disabled={!selectedProvince}
            required={required && Boolean(selectedProvince)}
            className={`w-full border rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#07535f] transition-all ${
              !selectedProvince
                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-50/80 border-gray-200 text-gray-800 cursor-pointer'
            }`}
          >
            <option value="">
              {!selectedProvince ? 'Choose District' : 'Choose District'}
            </option>
            {districtList.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
