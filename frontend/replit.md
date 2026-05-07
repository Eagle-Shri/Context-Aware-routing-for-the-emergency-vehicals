# Smart Ambulance Routing Dashboard

## Overview
A production-level, multi-page React + Vite frontend for an Ambulance Routing System centered on Bengaluru. Features a professional dashboard, live animated map, separate role pages, and admin management.

## Architecture
- **Frontend**: React 19 + Vite, Tailwind CSS v3
- **Map**: Leaflet.js with CartoDB dark tiles, centered on Bengaluru [12.9716, 77.5946]
- **Routing**: React Router DOM (7 pages)
- **Fonts**: Poppins (headings) + Inter (body) via Google Fonts

## Pages & Routes
| Route              | Page              | Description                                       |
|--------------------|-------------------|---------------------------------------------------|
| `/`                | Dashboard         | Hero section, stats, admin panel, fleet preview  |
| `/map`             | MapPage           | Live Bengaluru map, animated ambulance route      |
| `/driver`          | DriverPage        | Driver console, trip controls, fleet status       |
| `/police`          | PolicePage        | Incident management, report form, incident log    |
| `/admin/driver`    | AdminDriver       | Register/list ambulance drivers                   |
| `/admin/police`    | AdminPolice       | Register/list police officers with zones          |
| `/admin/station`   | AdminStation      | Register/list hospitals and dispatch stations     |

## Key Features
- **Dashboard Hero**: Live Operations banner, 4 stat cards (Ambulances, Incidents, Hospitals, Avg ETA)
- **Admin Panel**: Quick-action buttons navigating to separate admin pages
- **Map**: Animated AMB-04 along Koramangala → MG Road → Rajajinagar route (10 min, 600s)
- **Incident radius circle** on Leaflet, auto-fit bounds to route
- **Live activity feed** injecting real-time events during animation
- **Police Page**: Severity bar, filter tabs (All/Active/Resolved), report incident form with range slider
- **Driver Console**: Trip Start/End buttons, animated progress bar, location update form
- **Admin pages**: Add + list forms for drivers, police officers, and stations/hospitals
- **Navbar**: Sticky top nav with Admin dropdown and pulsing System Online badge

## Design System
- Light theme (bg-gray-50) for Dashboard + Admin + Driver + Police pages
- Dark theme (bg-[#0d1117]) for Map page
- Poppins for all headings, Inter for body text
- Color palette: Blue (primary), Red (emergency), Green (success), Orange (warning)

## Main Files
- `src/App.jsx` — Router with all 7 routes
- `src/components/Navbar.jsx` — Sticky navbar with Admin dropdown
- `src/pages/Dashboard.jsx` — Main dashboard with hero + panels
- `src/pages/MapPage.jsx` — Bengaluru animated route map (25/75 split)
- `src/pages/DriverPage.jsx` — Driver console
- `src/pages/PolicePage.jsx` — Incident management
- `src/pages/AdminDriver.jsx` — Manage drivers
- `src/pages/AdminPolice.jsx` — Manage police officers
- `src/pages/AdminStation.jsx` — Manage stations/hospitals

## Dev Server
- Port: 5000
- Command: `npm run dev`
- Vite config: `vite.config.js`
