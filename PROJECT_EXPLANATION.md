# Smart Ambulance Routing System - Complete Project Documentation

## 1. Project Overview

The **Smart Ambulance Routing System** is a real-time, GPS-enabled platform designed to optimize ambulance dispatch and routing during emergency situations. It integrates data from hospitals, police departments, and incident reports to ensure ambulances take the most efficient routes while avoiding traffic incidents, road blockages, and congestion zones.

### Key Objectives
- **Real-time Ambulance Tracking**: Monitor ambulance locations and status in real-time
- **Intelligent Routing**: Calculate optimal routes using OSRM (Open Source Routing Machine)
- **Incident Management**: Track traffic incidents, accidents, and road blockages
- **Multi-Role Access**: Support different user roles (drivers, police, admin, hospitals)
- **Activity Logging**: Audit trail for all system actions and user activities
- **Scalability**: Handle multiple concurrent ambulances, incidents, and users

---

## 2. Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Real-time Communication**: Socket.IO
- **External APIs**: 
  - OSRM (Open Source Routing Machine) for route optimization
  - Supabase (optional integration)
- **Key Dependencies**:
  - `pg` - PostgreSQL client
  - `axios` - HTTP client for external APIs
  - `socket.io` - WebSocket communication
  - `cors` - Cross-origin resource sharing
  - `dotenv` - Environment variable management

### Frontend
- **Framework**: React 19 with Vite
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS + PostCSS
- **Mapping**: Leaflet + React-Leaflet
- **Real-time**: Socket.IO Client
- **Icons**: Lucide React
- **Build Tool**: Vite

### Development Tools
- **Backend**: Nodemon for auto-reload
- **Linting**: ESLint
- **Type Safety**: TypeScript (optional setup)

---

## 3. Database Schema

### Core Tables

#### `ambulances`
Stores ambulance locations, status, and current destination
```
Fields: id, driver_name, status, latitude, longitude, destination,
        destination_lat, destination_lng, source_name, source_lat,
        source_lng, current_route, last_updated, created_at
Status: IDLE, ACTIVE, BUSY
```

#### `drivers`
Manages ambulance drivers with authentication
```
Fields: id, name, email, phone, ambulance_id, password_hash,
        status, license_number, created_at, updated_at
Status: IDLE, ACTIVE, BUSY
Foreign Key: ambulance_id → ambulances.id
```

#### `hospitals`
Hospital locations and real-time capacity tracking
```
Fields: id, name, latitude, longitude, capacity, available,
        phone, address, created_at
Purpose: Route ambulances to hospitals with available beds
```

#### `incidents`
Traffic incidents and emergencies
```
Fields: id, type, severity, latitude, longitude, impact_radius,
        description, resolved, created_at
Types: traffic, accident, roadblock, signal, vip, waterlogging, breakdown, rally
Severity: low, medium, high
```

#### `police_updates`
Road blockages and traffic updates from police
```
Fields: id, road_name, status, severity, latitude, longitude,
        impact_radius, expected_clearance, description, created_at
Status: open, blocked
Purpose: Trigger automatic ambulance rerouting
```

#### `police_officers`
Police personnel management
```
Fields: id, name, email, badge_number (UNIQUE), zone, password_hash,
        status, created_at, updated_at
Status: on_duty, off_duty
```

#### `police_stations`
Police station locations and zones
```
Fields: id, name, zone, latitude, longitude, address, phone, created_at
Purpose: Coordinate with local police for incident management
```

#### `route_cache`
Cached calculated routes for performance optimization
```
Fields: id, ambulance_id, source_lat, source_lng, dest_lat, dest_lng,
        route_data, created_at
Purpose: Reduce API calls to routing service
Unique Constraint: (ambulance_id, source_lat, source_lng, dest_lat, dest_lng)
```

#### `activity_logs`
Complete audit trail of all system actions
```
Fields: id, user_id, user_type, action, resource_type, resource_id,
        details (JSONB), ip_address, user_agent, status, timestamp, created_at
Purpose: Track CREATE, UPDATE, DELETE, UPDATE_STATUS, ASSIGN_DESTINATION events
```

---

## 4. Backend Architecture

### Directory Structure
```
backend/
├── db/
│   └── db.js                      # Database connection and schema
├── routes/
│   ├── ambulanceRoutes.js         # Ambulance endpoints
│   ├── driverRoutes.js            # Driver management endpoints
│   ├── incidentRoutes.js          # Incident management endpoints
│   ├── hospitalRoutes.js          # Hospital endpoints
│   ├── policeRoutes.js            # Police updates endpoints
│   ├── stationRoutes.js           # Police station endpoints
│   ├── officerRoutes.js           # Police officer endpoints
│   ├── routeRoutes.js             # Route caching endpoints
│   └── activityLogRoutes.js       # Activity logging endpoints
├── services/
│   ├── ambulanceService.js        # Ambulance business logic
│   ├── driverService.js           # Driver management logic
│   ├── incidentService.js         # Incident management logic
│   ├── hospitalService.js         # Hospital management logic
│   ├── policeService.js           # Police updates logic
│   ├── stationService.js          # Station management logic
│   ├── policeOfficerService.js    # Officer management logic
│   ├── routingService.js          # Route optimization (OSRM)
│   └── activityLogService.js      # Audit logging
├── sockets/
│   └── socketHandler.js           # WebSocket real-time events
├── scripts/
│   └── seed.js                    # Database seed data
├── tests/
│   ├── test.js                    # Unit tests
│   └── loadTest.js                # Performance testing
├── utiles/
│   └── simulation.js              # Simulation utilities
├── server.js                      # Express server setup
├── socketTest.js                  # WebSocket testing
└── package.json
```

### Service Layer

#### ambulanceService.js
**Functions**:
- `getAllAmbulances()` - Fetch all ambulances
- `getAmbulanceById(id)` - Fetch specific ambulance
- `getAmbulancesByStatus(status)` - Filter by status
- `createAmbulance(driverName, lat, lng)` - Register new ambulance
- `updateAmbulanceLocation(id, lat, lng, io)` - Update GPS coordinates
- `assignDestination(id, destName, destLat, destLng, io)` - Set destination
- `updateAmbulanceStatus(id, newStatus, io)` - Change ambulance status
- `clearDestination(id, io)` - Clear current destination
- `deleteAmbulance(id)` - Remove ambulance

**Features**:
- Automatic deviation detection from route
- Activity logging for all operations
- Real-time Socket.IO emission of status changes

#### driverService.js
**Functions**:
- `getAllDrivers()` - Get all drivers
- `getDriverById(id)` - Specific driver details
- `getDriverByAmbulanceId(ambulanceId)` - Find driver by ambulance
- `createDriver(driverData)` - Register new driver
- `updateDriver(id, updates)` - Modify driver information
- `updateDriverStatus(id, newStatus)` - Update work status
- `assignDriverToAmbulance(driverId, ambulanceId)` - Assign driver
- `deleteDriver(id)` - Remove driver record
- `getDriversByStatus(status)` - Filter drivers by status

#### incidentService.js
**Functions**:
- `getAllIncidents()` - Fetch all incidents
- `getActiveIncidents()` - Only unresolved incidents
- `getIncidentById(id)` - Specific incident details
- `createIncident(type, severity, lat, lng, radius, description, io)` - Report incident
- `triggerReroutingForIncident(incident, io)` - Auto-reroute affected ambulances
- `updateIncidentResolved(id, resolved)` - Mark as resolved
- `deleteIncident(id)` - Remove incident

**Features**:
- 8 incident types: traffic, accident, roadblock, signal, VIP, waterlogging, breakdown, rally
- Impact radius-based ambulance detection
- Automatic route recalculation for affected ambulances

#### routingService.js
**Functions**:
- `getBestRoute(from, to, ambulanceId)` - Calculate optimal route using OSRM
- `hasAmbulanceDeviated(currentLat, currentLng, routeCoords)` - Detect route deviation
- `checkIncidentImpact(incident, routeCoords)` - Check if incident affects route
- `getCachedRoute(ambulanceId, from, to)` - Retrieve cached routes
- `cacheRoute(ambulanceId, from, to, routeData)` - Store route in cache

**Features**:
- OSRM API integration for real-world routing
- Route caching to reduce external API calls
- ETA calculation based on route data
- Automatic rerouting on incidents

#### activityLogService.js
**Functions**:
- `logActivity(userId, userType, action, resourceType, resourceId, details)` - Main logging
- `getAllLogs()` - Paginated activity retrieval
- `getLogsByUser(userId)` - User-specific logs
- `getLogsByUserType(userType)` - Filter by user role
- `getLogsByResource(resourceType, resourceId)` - Resource audit trail
- `getLogsByAction(action)` - Action-specific logs
- `getLogsByDateRange(startDate, endDate)` - Temporal filtering
- `getActivitySummary()` - Statistics and analytics
- `deleteOldLogs(daysOld)` - Cleanup archived logs

### Socket.IO Real-time Events

#### Emitted Events (Server → Client)
```javascript
'ambulance_location_updated'  // Ambulance moved
'ambulance_status_changed'    // Status changed (IDLE/ACTIVE/BUSY)
'destination_assigned'        // New destination set
'route_updated'              // Route recalculated
'incident_added'             // New incident reported
'incident_resolved'          // Incident cleared
'police_update'              // Road blockage update
'trip_completed'             // Ambulance reached destination
'reroute_triggered'          // Automatic rerouting due to incident
```

#### Received Events (Client → Server)
```javascript
'update_location'            // Driver updates ambulance location
'request_route'              // Client requests route calculation
'update_status'              // Status change request
'report_incident'            // Report new incident
'resolve_incident'           // Mark incident resolved
```

---

## 5. Frontend Architecture

### Directory Structure
```
frontend/src/
├── pages/
│   ├── Dashboard.jsx              # Admin overview dashboard
│   ├── MapPage.jsx                # Real-time map visualization
│   ├── DriverPage.jsx             # Driver interface
│   ├── PolicePage.jsx             # Police officer interface
│   ├── AdminDriver.jsx            # Driver management panel
│   ├── AdminPolice.jsx            # Police management panel
│   └── AdminStation.jsx           # Station management panel
├── components/
│   ├── Navbar.jsx                 # Navigation bar
│   ├── LocationSearch.jsx         # Address/location search
│   ├── FormField.jsx              # Reusable form input
│   ├── StatusBadge.jsx            # Status display component
│   └── Toast.jsx                  # Notifications
├── context/
│   └── TripContext.jsx            # Global trip state management
├── services/
│   ├── api.js                     # REST API client
│   └── socket.js                  # WebSocket client
├── utils/
│   ├── geocode.js                 # Location encoding/decoding
│   └── mapIcons.js                # Map marker icons
├── hooks/
│   └── useToast.js                # Toast notification hook
├── App.jsx                        # Main app component
├── main.jsx                       # Entry point
├── index.css                      # Global styles
└── styles.css                     # Additional styles
```

### Key Pages

#### Dashboard.jsx
**Role**: Admin overview
**Features**:
- Real-time ambulance map
- Active incidents panel
- Hospital capacity status
- Police updates
- Driver and officer status
- Activity log viewer
- Performance metrics

#### MapPage.jsx
**Role**: Real-time visualization
**Features**:
- Leaflet map with ambulance markers
- Incident markers with severity coloring
- Hospital location pins
- Route visualization
- Live location updates via Socket.IO
- Automatic map recentering

#### DriverPage.jsx
**Role**: Ambulance driver interface
**Features**:
- Current ambulance status
- Assigned destination display
- Real-time location tracking
- Route guidance with turn-by-turn
- Incident warnings
- Trip progress indicator
- Manual location update option

#### PolicePage.jsx
**Role**: Police officer interface
**Features**:
- Report road blockages
- Update traffic incidents
- View nearby police stations
- Manage incident severity
- Communication with other units
- Zone-based filtering

#### AdminDriver.jsx
**Role**: Driver management
**Features**:
- Create/edit/delete drivers
- Assign drivers to ambulances
- Update driver status
- View driver history
- Authentication management

#### AdminPolice.jsx
**Role**: Police management
**Features**:
- Create/edit/delete officers
- Assign officers to zones
- Update officer status
- View officer activity
- Zone-based organization

#### AdminStation.jsx
**Role**: Station management
**Features**:
- Register police stations
- Update station information
- Set zone coverage
- View nearby stations
- Update station capacity

### Context Management (TripContext.jsx)

**Global State**:
```javascript
{
  trip: {
    ambId,              // Ambulance ID
    ambName,            // Ambulance name
    srcName,            // Source location
    dstName,            // Destination location
    status,             // 'active' or 'idle'
    startedAt,          // Trip start timestamp
    progress,           // Percentage 0-100
    routeState: {       // Route details
      coords,           // Current coordinates
      step,             // Current step number
      routeInfo,        // Route metadata
      rerouteMsg,       // Reroute notification
      rerouted          // Reroute flag
    }
  },
  notification: {       // Trip completion notification
    type,               // 'arrived'
    ambName,
    ambId,
    dstName
  }
}
```

**Key Functions**:
- `startTrip()` - Initiate new trip
- `updateProgress()` - Update trip progress
- `saveRouteState()` - Save route information
- `completeTrip()` - Mark trip as complete
- `dismissNotification()` - Clear notifications
- `clearTrip()` - Reset trip state

### API Service (services/api.js)

**Endpoints**:
- `GET /api/ambulances` - All ambulances
- `GET /api/ambulances/:id` - Specific ambulance
- `GET /api/incidents` - All incidents
- `GET /api/hospitals` - All hospitals
- `GET /api/police-updates` - Traffic updates
- `GET /api/officers` - Police officers
- `GET /api/stations` - Police stations
- `GET /api/drivers` - Drivers
- `POST /api/ambulances` - Create ambulance
- `POST /api/incidents` - Report incident
- `PUT /api/ambulances/:id` - Update ambulance
- `PATCH /api/ambulances/:id/status` - Update status
- Plus CRUD operations for all resources

### WebSocket Service (services/socket.js)

**Real-time Event Handling**:
- Location updates from drivers
- Status change notifications
- Incident alerts
- Route update notifications
- Trip completion alerts

---

## 6. Key Features

### 1. Real-time Location Tracking
- GPS coordinates streamed from ambulances
- Live map visualization
- Location history
- Geofencing for incident zones

### 2. Intelligent Route Optimization
- OSRM integration for optimal routing
- Route caching for performance
- Real-time deviation detection
- Alternative route suggestions

### 3. Incident Management
- Multiple incident types and severity levels
- Automatic ambulance rerouting
- Incident zone impact radius
- Real-time incident notifications

### 4. Multi-role User System
- **Ambulance Drivers**: Track location, receive instructions
- **Police Officers**: Report incidents, update road status
- **Hospital Staff**: Update bed capacity
- **Administrators**: System-wide management
- **Citizens**: Report incidents

### 5. Activity Logging & Audit Trail
- Complete action history
- User identification for accountability
- Timestamp and IP tracking
- Searchable logs
- Performance analytics

### 6. Hospital Capacity Management
- Real-time bed availability
- Optimal hospital selection
- Capacity-based routing
- Hospital-to-ambulance coordination

### 7. Police Integration
- Zone-based organization
- Road blockage reporting
- Traffic update coordination
- Incident escalation

### 8. WebSocket Real-time Communication
- Live status updates
- Push notifications
- Bidirectional communication
- Event-driven architecture

---

## 7. API Endpoints Reference

### Ambulances
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/ambulances` | Get all ambulances |
| GET | `/api/ambulances/:id` | Get specific ambulance |
| GET | `/api/ambulances/status/:status` | Filter by status |
| POST | `/api/ambulances` | Create new ambulance |
| PATCH | `/api/ambulances/:id/status` | Update status |
| PATCH | `/api/ambulances/:id/destination` | Set destination |
| DELETE | `/api/ambulances/:id` | Delete ambulance |

### Drivers
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/drivers` | Get all drivers |
| GET | `/api/drivers/:id` | Get specific driver |
| GET | `/api/drivers/status/:status` | Filter by status |
| POST | `/api/drivers` | Create driver |
| PUT | `/api/drivers/:id` | Update driver |
| PATCH | `/api/drivers/:id/status` | Update status |
| PATCH | `/api/drivers/:id/assign` | Assign to ambulance |
| DELETE | `/api/drivers/:id` | Delete driver |

### Incidents
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/incidents` | Get all incidents |
| GET | `/api/incidents/active` | Get active incidents |
| GET | `/api/incidents/:id` | Get specific incident |
| POST | `/api/incidents` | Report new incident |
| PATCH | `/api/incidents/:id` | Update incident |
| DELETE | `/api/incidents/:id` | Delete incident |

### Hospitals
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/hospitals` | Get all hospitals |
| GET | `/api/hospitals/:id` | Get specific hospital |
| POST | `/api/hospitals` | Create hospital |
| PUT | `/api/hospitals/:id` | Update hospital |
| PATCH | `/api/hospitals/:id/capacity` | Update capacity |
| DELETE | `/api/hospitals/:id` | Delete hospital |

### Police
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/police-updates` | Get all updates |
| GET | `/api/police-updates/active` | Get active blockages |
| POST | `/api/police-updates` | Report blockage |
| PATCH | `/api/police-updates/:id` | Update status |

### Officers & Stations
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/officers` | Get all officers |
| GET | `/api/officers/zone/:zone` | Filter by zone |
| POST | `/api/officers` | Create officer |
| GET | `/api/stations` | Get all stations |
| GET | `/api/stations/nearby` | Find nearby stations |
| POST | `/api/stations` | Create station |

### Activity Logs
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/activity-logs` | Get all logs (paginated) |
| GET | `/api/activity-logs/user/:userId` | User-specific logs |
| GET | `/api/activity-logs/action/:action` | Filter by action |
| GET | `/api/activity-logs/summary` | Activity statistics |
| DELETE | `/api/activity-logs/cleanup/:daysOld` | Archive old logs |

---

## 8. Setup & Installation

### Prerequisites
- Node.js (v14+)
- PostgreSQL (v12+)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables** (create `.env`)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ambulance_routing
DB_USER=postgres
DB_PASSWORD=your_password
PORT=5000
NODE_ENV=development
OSRM_API=http://localhost:5000  # Or cloud OSRM endpoint
```

4. **Initialize database**
```bash
npm run seed
```

5. **Start development server**
```bash
npm run dev
```

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables** (create `.env.local`)
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_MAP_TOKEN=your_leaflet_token  # Optional
```

4. **Start development server**
```bash
npm run dev
```

5. **Build for production**
```bash
npm run build
```

---

## 9. Development Workflow

### Running Tests

**Backend Tests**:
```bash
# Unit tests
npm test

# Load testing
npm run test:load
```

**Frontend Linting**:
```bash
npm run lint
```

### Database Commands

**Seed database with sample data**:
```bash
npm run seed
```

**View database schema**:
```bash
psql -U postgres -d ambulance_routing -f backend/db/db.js
```

### WebSocket Testing

**Test Socket.IO connections**:
```bash
node socketTest.js
```

---

## 10. System Workflows

### Ambulance Dispatch Workflow
1. **Incident Reported** → Incident created in database
2. **Incident Detection** → System identifies nearby ambulances
3. **Route Calculation** → OSRM calculates optimal route
4. **Ambulance Assignment** → Driver receives notification
5. **Real-time Tracking** → GPS coordinates streamed
6. **Automatic Rerouting** → If incidents/blockages detected
7. **Destination Reached** → Status updated to IDLE

### Incident Response Workflow
1. **User/Police Reports Incident** → Via mobile app or API
2. **Incident Logged** → Stored in database with location & severity
3. **Impact Zone Calculated** → Determines affected area
4. **Affected Ambulances Identified** → Query by route intersection
5. **Rerouting Triggered** → New routes calculated
6. **Drivers Notified** → Real-time Socket.IO update
7. **Incident Resolved** → Status marked complete

### Police Coordination Workflow
1. **Officer Reports Road Blockage** → Via police interface
2. **Blockage Logged** → Location, severity, expected clearance
3. **Traffic Pattern Analysis** → Identify affected routes
4. **Ambulance Alert** → Real-time notification to drivers
5. **Alternative Routes Provided** → Route recalculation
6. **Blockage Cleared** → Status updated in system
7. **Normal Routing Resumed** → Return to optimal routes

### Hospital Management Workflow
1. **Hospital Updates Capacity** → Bed availability changed
2. **Capacity Recorded** → Stored in database
3. **Ambulance Destination Selection** → Selects hospital with capacity
4. **Patient Transfer** → Ambulance routes to hospital
5. **Arrival Notification** → Hospital receives ambulance ETA
6. **Patient Admission** → Hospital updates availability
7. **Trip Logged** → Recorded in activity log

---

## 11. Performance Optimization Strategies

### Backend
- **Route Caching**: Frequently calculated routes cached in database
- **Database Indexing**: Indexes on ambulance_id, status, timestamp
- **Connection Pooling**: PostgreSQL connection reuse
- **Async Operations**: Non-blocking I/O for all database queries
- **Rate Limiting**: Prevent API abuse

### Frontend
- **Lazy Loading**: Pages loaded on demand
- **Component Memoization**: React.memo for expensive components
- **Socket.IO Optimization**: Event debouncing for location updates
- **Map Rendering**: Efficient Leaflet layer management
- **Local Storage**: Cache trip state and user preferences

### Network
- **WebSocket Reuse**: Single persistent connection
- **Pagination**: Limit returned records
- **Selective Syncing**: Only sync changed data
- **Compression**: GZip for API responses

---

## 12. Security Considerations

### Authentication & Authorization
- **Password Hashing**: BCrypt for password storage
- **Role-based Access Control**: Different permissions per role
- **Session Management**: JWT or session tokens
- **API Authentication**: Token validation on protected endpoints

### Data Protection
- **HTTPS**: Encrypted data transmission
- **CORS Configuration**: Restrict cross-origin requests
- **Input Validation**: Sanitize all user inputs
- **SQL Injection Prevention**: Parameterized queries

### Audit & Monitoring
- **Activity Logging**: All actions logged with user identification
- **IP Tracking**: Log source IP for security review
- **Error Logging**: Detailed error tracking for debugging
- **Rate Limiting**: Prevent DoS attacks

---

## 13. Troubleshooting Guide

### Common Issues

**Ambulance Location Not Updating**
- Check Socket.IO connection status
- Verify GPS permissions on mobile device
- Check update_location event listener

**Routes Not Calculating**
- Verify OSRM service is running/accessible
- Check latitude/longitude format (decimal degrees)
- Ensure route cache is cleared for new incidents

**Database Connection Failed**
- Verify PostgreSQL is running
- Check .env database credentials
- Ensure database and schema exist
- Test connection: `psql -U user -d ambulance_routing`

**Real-time Updates Not Showing**
- Check WebSocket connection (Network tab)
- Verify Socket.IO middleware is enabled
- Check browser console for errors
- Verify event names match between client/server

**High Memory Usage**
- Check for memory leaks in Socket.IO listeners
- Clear old activity logs: `DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '30 days'`
- Monitor database query performance
- Check for disconnected socket connections

---

## 14. Future Enhancements

### Planned Features
- **Machine Learning**: Predictive incident detection
- **Voice Integration**: Voice commands for drivers
- **SMS Alerts**: Text message notifications
- **Mobile Native App**: iOS/Android native applications
- **Advanced Analytics**: Dashboard with trends and insights
- **Predictive Routing**: ML-based ETA improvements
- **Integration**: Third-party EMS system integration
- **Multi-language**: Localization support
- **Offline Mode**: Offline operation for drivers
- **Blockchain**: Immutable audit trail

### Scaling Considerations
- **Load Balancing**: Horizontal scaling with Nginx
- **Microservices**: Separate services for different domains
- **Caching Layer**: Redis for frequent queries
- **Message Queue**: Kafka/RabbitMQ for event processing
- **CDN**: Content delivery network for static assets
- **Database Replication**: Master-slave PostgreSQL setup

---

## 15. Project Statistics

### Code Metrics
- **Backend Routes**: 9 route files
- **Backend Services**: 9 service files
- **Database Tables**: 9 tables
- **API Endpoints**: 50+ endpoints
- **Frontend Pages**: 7 main pages
- **Frontend Components**: 5 reusable components
- **Real-time Events**: 10+ Socket.IO events

### Technology Distribution
- **Backend**: JavaScript (Node.js/Express)
- **Frontend**: JavaScript (React/Vite)
- **Database**: PostgreSQL
- **Styling**: Tailwind CSS
- **Mapping**: Leaflet
- **Communication**: Socket.IO, REST API

---

## 16. Contributing Guidelines

### Code Standards
- **Naming Conventions**: camelCase for functions/variables, PascalCase for components
- **Comments**: Document complex logic and API responses
- **Error Handling**: Try-catch blocks with meaningful error messages
- **Testing**: Write tests for new features
- **Commits**: Clear, descriptive commit messages

### Development Process
1. Create feature branch: `git checkout -b feature/name`
2. Make changes with tests
3. Submit pull request with description
4. Code review by maintainers
5. Merge to main branch
6. Deploy to production

---

## 17. Contact & Support

For questions, issues, or contributions, please contact the development team or create an issue in the project repository.

### Key Contacts
- **Project Lead**: [To be filled]
- **Backend Lead**: [To be filled]
- **Frontend Lead**: [To be filled]
- **Database Admin**: [To be filled]

---

**Last Updated**: May 6, 2026  
**Version**: 1.0.0  
**Status**: Active Development
