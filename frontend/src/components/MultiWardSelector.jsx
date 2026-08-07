import React, { useState, useEffect, useRef } from 'react';
import { CITIES } from '../constants/wards';
import { MapPin, Building2, Check, CheckSquare, Square, ChevronDown, ChevronUp, Search, CheckCircle2 } from 'lucide-react';

export default function MultiWardSelector({
  value = '', // string of comma-separated wards or array
  onChange,
  disabled = false,
  className = '',
}) {
  // Parse initial value
  const parseValue = (val) => {
    if (!val) return { city: 'Kathmandu', wards: [], isWholeCity: false };
    if (Array.isArray(val)) {
      const isWhole = val.some(v => v.includes('Whole City'));
      const cityName = val[0] ? val[0].split(' ')[0] : 'Kathmandu';
      return { city: cityName || 'Kathmandu', wards: val, isWholeCity: isWhole };
    }
    const parts = val.split(',').map(s => s.trim()).filter(Boolean);
    const isWhole = val.toLowerCase().includes('whole city');
    const cityName = parts[0] ? parts[0].split(' ')[0] : 'Kathmandu';
    const cityMatch = CITIES.find(c => c.id.toLowerCase() === cityName.toLowerCase());
    return {
      city: cityMatch ? cityMatch.id : 'Kathmandu',
      wards: parts,
      isWholeCity: isWhole
    };
  };

  const initial = parseValue(value);
  const [selectedCity, setSelectedCity] = useState(initial.city);
  const [selectedWards, setSelectedWards] = useState(initial.wards);
  const [isWholeCity, setIsWholeCity] = useState(initial.isWholeCity);

  // Menu open / close state
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmedMessage, setConfirmedMessage] = useState('');

  useEffect(() => {
    const parsed = parseValue(value);
    setSelectedCity(parsed.city);
    setSelectedWards(parsed.wards);
    setIsWholeCity(parsed.isWholeCity);
  }, [value]);

  const activeCityData = CITIES.find(c => c.id === selectedCity) || CITIES[0];

  const emitChange = (newCity, newWards, newIsWhole) => {
    if (!onChange) return;
    if (newIsWhole) {
      onChange(`${newCity} (Whole City)`);
      return;
    }
    if (newWards.length === activeCityData.wards.length && newWards.length > 0) {
      onChange(`${newCity} (Whole City)`);
      return;
    }
    onChange(newWards.join(', '));
  };

  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    setSelectedWards([]);
    setIsWholeCity(false);
    setSearchTerm('');
    if (onChange) onChange('');
  };

  const handleCheckboxToggle = (wardName) => {
    if (disabled) return;
    const fullWardString = `${selectedCity} ${wardName}`;
    let updated;
    if (isWholeCity) {
      updated = [fullWardString];
      setIsWholeCity(false);
    } else if (selectedWards.includes(fullWardString)) {
      updated = selectedWards.filter(w => w !== fullWardString);
    } else {
      updated = [...selectedWards, fullWardString];
    }
    setSelectedWards(updated);
  };

  const handleWholeCityToggle = () => {
    if (disabled) return;
    const nextWhole = !isWholeCity;
    setIsWholeCity(nextWhole);
    if (nextWhole) {
      const allWards = activeCityData.wards.map(w => `${selectedCity} ${w}`);
      setSelectedWards(allWards);
    } else {
      setSelectedWards([]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    setIsWholeCity(true);
    const allWards = activeCityData.wards.map(w => `${selectedCity} ${w}`);
    setSelectedWards(allWards);
  };

  const handleClearAll = () => {
    if (disabled) return;
    setIsWholeCity(false);
    setSelectedWards([]);
  };

  const handleConfirmSelection = () => {
    emitChange(selectedCity, selectedWards, isWholeCity);
    setConfirmedMessage('Wards Selection Confirmed ✓');
    setTimeout(() => setConfirmedMessage(''), 2500);
    setIsMenuOpen(false);
  };

  const filteredWards = activeCityData.wards.filter(w =>
    w.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${selectedCity} ${w}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCountText = isWholeCity
    ? `Whole City (${activeCityData.totalWards} Wards)`
    : selectedWards.length > 0
    ? `${selectedWards.length} Wards Selected`
    : 'No Wards Selected';

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 1. Base City Selector */}
      <div className="space-y-1">
        <label className="text-xs font-extrabold text-gray-700 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-[#07535f]" />
          Primary Service City
        </label>
        <select
          value={selectedCity}
          onChange={handleCityChange}
          disabled={disabled}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f] cursor-pointer transition-all disabled:opacity-60"
        >
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName} ({c.totalWards} Wards)
            </option>
          ))}
        </select>
      </div>

      {/* 2. Service Wards Dropdown Menu Trigger */}
      <div className="space-y-2 relative">
        <div className="flex justify-between items-center">
          <label className="text-xs font-extrabold text-gray-700 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#07535f]" />
            Select Service Wards
          </label>
          {confirmedMessage && (
            <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-in fade-in">
              {confirmedMessage}
            </span>
          )}
        </div>

        {/* Menu Toggle Button */}
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          disabled={disabled}
          className="w-full bg-white border border-gray-200 hover:border-[#07535f] rounded-2xl px-4 py-3 text-xs font-extrabold text-gray-800 flex items-center justify-between shadow-2xs transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#07535f]/10 text-[#07535f] flex items-center justify-center font-bold text-xs">
              {isWholeCity ? '★' : selectedWards.length}
            </div>
            <span>
              {selectedCity}: <span className="text-[#07535f] font-black">{selectedCountText}</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <span className="text-[11px] font-semibold">{isMenuOpen ? 'Hide Menu' : 'Open Ward Menu'}</span>
            {isMenuOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Selected Badges Preview (When Menu is Closed) */}
        {!isMenuOpen && (selectedWards.length > 0 || isWholeCity) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {isWholeCity ? (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold px-3 py-1 rounded-xl flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> All {activeCityData.totalWards} Wards Covered in {selectedCity} (Whole City)
              </span>
            ) : (
              selectedWards.map(w => (
                <span key={w} className="bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold px-2.5 py-1 rounded-xl">
                  {w}
                </span>
              ))
            )}
          </div>
        )}

        {/* 3. WARD SELECTION CHECKBOX MENU */}
        {isMenuOpen && (
          <div className="bg-white border-2 border-[#07535f]/20 rounded-2xl p-4 shadow-xl space-y-3 relative z-10 animate-in fade-in duration-150">
            
            {/* Search + Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between border-b border-gray-100 pb-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ward number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07535f]"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={disabled}
                  className="text-[11px] font-extrabold text-[#07535f] hover:bg-[#07535f]/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-gray-200">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={disabled}
                  className="text-[11px] font-extrabold text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Whole City Checkbox Option */}
            <label
              onClick={handleWholeCityToggle}
              className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-between cursor-pointer transition-all ${
                isWholeCity
                  ? 'bg-[#07535f] text-white border-[#07535f] shadow-xs'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isWholeCity}
                  onChange={() => {}} // handled by parent label click
                  className="w-4 h-4 accent-[#07535f] cursor-pointer"
                />
                <span>🌟 {selectedCity} - Provide Services Across Whole City (All Wards)</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isWholeCity ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-800'}`}>
                {isWholeCity ? 'All Wards Checked ✓' : 'Check All'}
              </span>
            </label>

            {/* Scrollable Checkbox List of All Wards */}
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-gray-50/50">
              {filteredWards.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 font-semibold">
                  No wards match "{searchTerm}"
                </div>
              ) : (
                filteredWards.map((w) => {
                  const fullW = `${selectedCity} ${w}`;
                  const isChecked = isWholeCity || selectedWards.includes(fullW);
                  return (
                    <label
                      key={w}
                      className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-100/80 transition-colors text-xs font-bold ${
                        isChecked ? 'bg-[#07535f]/5 text-[#07535f]' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxToggle(w)}
                          disabled={disabled}
                          className="w-4 h-4 accent-[#07535f] rounded-md cursor-pointer"
                        />
                        <span>{selectedCity} - {w}</span>
                      </div>
                      {isChecked && <Check className="w-4 h-4 text-[#07535f]" />}
                    </label>
                  );
                })
              )}
            </div>

            {/* CONFIRM SELECTION BUTTON */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-500">
                {isWholeCity ? `All ${activeCityData.totalWards} Wards Checked` : `${selectedWards.length} Wards Checked`}
              </span>
              <button
                type="button"
                onClick={handleConfirmSelection}
                className="bg-[#07535f] hover:bg-[#06424b] text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Confirm & Apply Selected Wards
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
