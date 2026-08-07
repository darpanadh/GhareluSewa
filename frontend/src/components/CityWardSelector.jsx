import React, { useState, useEffect } from 'react';
import { CITIES, parseWardString, buildWardString } from '../constants/wards';
import { MapPin, Building2 } from 'lucide-react';

export default function CityWardSelector({
  value = '',
  onChange,
  required = false,
  showLabels = true,
  layout = 'col', // 'col' | 'row'
  className = '',
}) {
  const parsed = parseWardString(value);
  const [selectedCity, setSelectedCity] = useState(parsed.city);
  const [selectedWard, setSelectedWard] = useState(parsed.ward);

  useEffect(() => {
    const p = parseWardString(value);
    setSelectedCity(p.city);
    setSelectedWard(p.ward);
  }, [value]);

  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    setSelectedWard(''); // reset ward when city changes
    if (onChange) {
      onChange(city ? `${city}` : '');
    }
  };

  const handleWardChange = (e) => {
    const ward = e.target.value;
    setSelectedWard(ward);
    const fullString = buildWardString(selectedCity, ward);
    if (onChange) {
      onChange(fullString);
    }
  };

  const activeCityData = CITIES.find(c => c.id === selectedCity);

  return (
    <div className={`space-y-3 ${layout === 'row' ? 'sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0' : ''} ${className}`}>
      {/* 1. City Selector */}
      <div className="space-y-1">
        {showLabels && (
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#07535f]" />
            Select City *
          </label>
        )}
        <div className="relative">
          <select
            value={selectedCity}
            onChange={handleCityChange}
            required={required}
            className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f] cursor-pointer transition-all"
          >
            <option value="">Choose City</option>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Ward Selector (Dynamically populated based on selected city) */}
      <div className="space-y-1">
        {showLabels && (
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#07535f]" />
            Select Ward *
          </label>
        )}
        <div className="relative">
          <select
            value={selectedWard}
            onChange={handleWardChange}
            disabled={!selectedCity}
            required={required && Boolean(selectedCity)}
            className={`w-full border rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#07535f] transition-all ${
              !selectedCity
                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-50/80 border-gray-200 text-gray-800 cursor-pointer'
            }`}
          >
            <option value="">
              {!selectedCity ? 'Choose Ward / City Area' : 'Select Specific Ward or Whole City'}
            </option>
            {selectedCity && (
              <option value="Whole City" className="font-bold text-[#07535f]">
                🌟 {selectedCity} - Whole City (All Wards / Workplace)
              </option>
            )}
            {activeCityData?.wards.map((w) => (
              <option key={w} value={w}>
                {selectedCity} - {w}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
