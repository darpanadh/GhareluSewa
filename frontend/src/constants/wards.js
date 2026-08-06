// Centralized Nepal Metropolitan Cities and Ward Data (Only 3 Cities: Kathmandu, Pokhara, Bharatpur)
export const CITIES = [
  {
    id: 'Kathmandu',
    name: 'Kathmandu',
    displayName: 'Kathmandu Metropolitan City',
    totalWards: 32,
    wards: Array.from({ length: 32 }, (_, i) => `Ward No. ${i + 1}`)
  },
  {
    id: 'Pokhara',
    name: 'Pokhara',
    displayName: 'Pokhara Metropolitan City',
    totalWards: 33,
    wards: Array.from({ length: 33 }, (_, i) => `Ward No. ${i + 1}`)
  },
  {
    id: 'Bharatpur',
    name: 'Bharatpur',
    displayName: 'Bharatpur Metropolitan City',
    totalWards: 29,
    wards: Array.from({ length: 29 }, (_, i) => `Ward No. ${i + 1}`)
  }
];

export const CITIES_MAP = CITIES.reduce((acc, city) => {
  acc[city.id] = city;
  return acc;
}, {});

// Helper to convert full ward string ("Kathmandu Ward No. 2") to city & ward object
export function parseWardString(fullWardStr) {
  if (!fullWardStr) return { city: '', ward: '' };
  
  for (const cityObj of CITIES) {
    if (fullWardStr.toLowerCase().includes(cityObj.name.toLowerCase())) {
      const wardMatch = fullWardStr.match(/Ward\s+No\.\s*\d+/i);
      return {
        city: cityObj.id,
        ward: wardMatch ? wardMatch[0].replace(/ward\s+no\.\s*/i, 'Ward No. ') : ''
      };
    }
  }
  return { city: '', ward: fullWardStr };
}

// Helper to construct full ward string ("Kathmandu Ward No. 2")
export function buildWardString(city, ward) {
  if (!city && !ward) return '';
  if (!city) return ward;
  if (!ward) return city;
  if (ward.toLowerCase().includes(city.toLowerCase())) return ward;
  return `${city} ${ward}`;
}
