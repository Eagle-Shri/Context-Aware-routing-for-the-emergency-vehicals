const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options && options.headers) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

function severityLabel(num) {
  const n = Number(num);
  if (n >= 7) return 'high';
  if (n >= 4) return 'medium';
  return 'low';
}

function mapIncidentType(type) {
  const t = (type || '').toLowerCase();
  // Pass through all valid types directly
  const VALID = ['traffic', 'accident', 'roadblock', 'signal', 'vip', 'waterlogging', 'breakdown', 'rally'];
  if (VALID.includes(t)) return t;
  if (t === 'fire') return 'accident';
  if (t === 'festival' || t === 'strike') return 'rally';
  return 'traffic';
}

export async function addIncident(data) {
  const payload = {
    type: mapIncidentType(data.type),
    severity: typeof data.severity === 'number' ? severityLabel(data.severity) : data.severity,
    latitude: data.latitude,
    longitude: data.longitude,
    impact_radius: data.radius ?? data.impact_radius,
    description: data.description || '',
  };
  return request('/api/incidents', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getIncidents() {
  return request('/api/incidents');
}

export async function getActiveIncidents() {
  return request('/api/incidents/active');
}

export async function resolveIncident(id) {
  return request(`/api/incidents/${id}/resolve`, { method: 'POST' });
}

export async function deleteIncident(id) {
  return request(`/api/incidents/${id}`, { method: 'DELETE' });
}

export async function updateAmbulanceLocation(id, latitude, longitude) {
  return request(`/api/ambulances/${id}/location`, {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function assignDestination(id, data) {
  return request(`/api/ambulances/${id}/destination`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAmbulances() {
  return request('/api/ambulances');
}

export async function getAmbulanceById(id) {
  return request(`/api/ambulances/${id}`);
}

export async function createAmbulance(data) {
  return request('/api/ambulances', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAmbulanceStatus(id, status) {
  return request(`/api/ambulances/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function clearAmbulanceDestination(id) {
  return request(`/api/ambulances/${id}/clear-destination`, { method: 'POST' });
}

/**
 * Full dispatch: set source + destination, calculate avoid-zone route, set status ACTIVE.
 */
export async function dispatchAmbulance(id, { destination, dest_lat, dest_lng, source_name, src_lat, src_lng }) {
  return request(`/api/ambulances/${id}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({ destination, dest_lat, dest_lng, source_name, src_lat, src_lng }),
  });
}

export async function getHospitals() {
  return request('/api/hospitals');
}

export async function getAvailableHospitals() {
  return request('/api/hospitals/available');
}

export async function createHospital(data) {
  return request('/api/hospitals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPoliceUpdates() {
  return request('/api/police/updates');
}

export async function createPoliceUpdate(data) {
  return request('/api/police/update', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function clearPoliceUpdate(id) {
  return request(`/api/police/${id}/clear`, { method: 'POST' });
}

export async function deletePoliceUpdate(id) {
  return request(`/api/police/${id}`, { method: 'DELETE' });
}

export async function getStations() {
  return request('/api/stations');
}

export async function createStation(data) {
  return request('/api/stations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteStation(id) {
  return request(`/api/stations/${id}`, { method: 'DELETE' });
}

export async function getOfficers() {
  return request('/api/officers');
}

export async function createOfficer(data) {
  return request('/api/officers', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteOfficer(id) {
  return request(`/api/officers/${id}`, { method: 'DELETE' });
}

export async function updateOfficerStatus(id, status) {
  return request(`/api/officers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function calculateRoute(fromLat, fromLng, toLat, toLng) {
  return request(`/api/routes?from=${fromLat},${fromLng}&to=${toLat},${toLng}`);
}

export async function getNaiveRoute(fromLat, fromLng, toLat, toLng) {
  return request(`/api/routes?from=${fromLat},${fromLng}&to=${toLat},${toLng}&naive=true`);
}

// ===== DRIVER API =====
export async function getDrivers() {
  return request('/api/drivers');
}

export async function getDriverById(id) {
  return request(`/api/drivers/${id}`);
}

export async function getDriversByStatus(status) {
  return request(`/api/drivers/status/${status}`);
}

export async function createDriver(data) {
  // Expects: { name, email, phone, license_number, ambulance_id }
  return request('/api/drivers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDriver(id, data) {
  return request(`/api/drivers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateDriverStatus(id, status) {
  return request(`/api/drivers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function assignDriverToAmbulance(driverId, ambulanceId) {
  return request(`/api/drivers/${driverId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ ambulance_id: ambulanceId }),
  });
}

export async function deleteDriver(id) {
  return request(`/api/drivers/${id}`, { method: 'DELETE' });
}
