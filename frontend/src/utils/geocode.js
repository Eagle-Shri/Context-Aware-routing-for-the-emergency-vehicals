const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

const BLURU_VIEWBOX = '77.461,12.834,77.762,13.139';

export async function geocodeLocation(locationName) {
  const query = locationName.trim();
  if (!query) throw new Error('Please enter a location name.');

  const lower = query.toLowerCase();
  const hasBengaluru = lower.includes('bengaluru') || lower.includes('bangalore') || lower.includes('blr');
  const searchQuery = hasBengaluru ? query : `${query}, Bengaluru`;

  const params = new URLSearchParams({
    q: searchQuery,
    format: 'json',
    limit: 8,
    addressdetails: 1,
    countrycodes: 'IN',
    viewbox: BLURU_VIEWBOX,
    bounded: 0,
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'AmbulanceRoutingSystem/1.0' },
  });

  if (!res.ok) throw new Error('Geocoding service unavailable. Please try again.');

  const data = await res.json();
  if (!data || data.length === 0) throw new Error(`No location found for "${query}" in Bengaluru. Try a different name.`);

  return data.map(item => ({
    label: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));
}
