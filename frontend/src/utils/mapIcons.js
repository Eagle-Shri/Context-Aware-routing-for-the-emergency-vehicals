import L from 'leaflet';

export function createAmbulanceIcon(heading = 0) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        transform: rotate(${heading}deg);
        transition: transform 0.4s ease;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
      ">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="19" fill="#DC2626" stroke="white" stroke-width="2"/>
          <path d="M20 8 L28 28 L20 24 L12 28 Z" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

export function createIncidentIcon(severity = 'medium') {
  const colors = { low: '#F59E0B', medium: '#F97316', high: '#DC2626' };
  const color = colors[severity] || colors.medium;
  return L.divIcon({
    className: '',
    html: `
      <div style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <svg width="32" height="38" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16C0 28 16 38 16 38C16 38 32 28 32 16C32 7.163 24.837 0 16 0Z" fill="${color}"/>
          <circle cx="16" cy="16" r="7" fill="white"/>
          <path d="M15 10H17V17H15V10Z M15 19H17V21H15V19Z" fill="${color}"/>
        </svg>
      </div>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
  });
}

export function createPoliceIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <svg width="32" height="38" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16C0 28 16 38 16 38C16 38 32 28 32 16C32 7.163 24.837 0 16 0Z" fill="#1D4ED8"/>
          <circle cx="16" cy="16" r="7" fill="white"/>
          <text x="16" y="20" text-anchor="middle" font-size="10" font-weight="bold" fill="#1D4ED8">P</text>
        </svg>
      </div>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
  });
}
