# Architecture & Implementation Details

## System Architecture

### Overview
The Blood Sugar Monitoring System follows a **client-server architecture** with:
- **Frontend**: Single Page Application (SPA) using vanilla JavaScript
- **Backend**: RESTful API server using Node.js core modules only
- **Storage**: JSON file-based database with ACID-like properties

### Technology Stack
- **Server**: Node.js 18+ (core modules only)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Storage**: File-based JSON database
- **Security**: Scrypt password hashing, HTTP-only cookies, CSRF tokens

## Frontend Architecture

### Structure
```
public/
├── index.html          # SPA entry point
├── js/
│   ├── main.js         # App initialization
│   ├── router.js       # Client-side routing
│   ├── config.js       # Configuration
│   ├── api/            # API client modules
│   ├── components/     # Reusable UI components
│   ├── views/          # Page views
│   ├── state/          # State management
│   └── utils/          # Utilities
└── css/                # Stylesheets
```

### Routing
Client-side hash-based routing:
- `#/login` - Login page
- `#/register` - Registration
- `#/dashboard` - Main dashboard (specialist/staff/admin)
- `#/overview` - Patient overview
- `#/patients` - Patient list
- `#/alerts` - Alerts page
- `#/settings` - Settings
- `#/profile` - User profile

### State Management
Simple event-driven state:
```javascript
store = {
  user: null,
  filters: {},
  set(partial) {
    Object.assign(this, partial);
    document.dispatchEvent(new Event('state:change'));
  }
}
```

### Components
Reusable components:
- **Header**: Navigation and user info
- **Sidebar**: Main navigation menu
- **Chart**: Blood sugar visualization
- **Table**: Data grid with sorting/filtering
- **KPI Card**: Statistics display
- **Bell**: Alert notifications

## Backend Architecture

### Structure
```
server/
├── server.js           # Main entry point
├── storage/
│   └── db.js           # Database layer
├── routes/
│   ├── auth.js         # Authentication
│   ├── readings.js     # Blood sugar readings
│   ├── patients.js     # Patient management
│   ├── alerts.js       # Alerts & feedback
│   └── reports.js      # Reports & settings
├── middleware/
│   └── auth.js         # Auth & authorization
└── utils/
    ├── security.js     # Security utilities
    ├── ai.js           # AI pattern detection
    └── helpers.js      # Helper functions
```

### Database Layer

#### Design Principles
1. **ACID-like Operations**
   - Atomicity: Temp file + rename
   - Consistency: Schema validation
   - Isolation: Write queues per collection
   - Durability: Persistent JSON files

2. **Collections**
```javascript
collections = {
  patients,
  specialists,
  staff,
  administrators,
  readings,
  foodActivityLogs,
  feedback,
  alerts,
  thresholdSettings,
  reports,
  auditLogs,
  sessions
}
```

3. **Operations**
```javascript
// CRUD operations
await db.find(collection, query)
await db.findOne(collection, query)
await db.findById(collection, id)
await db.insert(collection, document)
await db.update(collection, query, updates)
await db.updateById(collection, id, updates)
await db.delete(collection, query)
await db.deleteById(collection, id)

// Advanced
await db.aggregate(collection, pipeline)
await db.transaction(operations)
```

### Security Implementation

#### Password Hashing
```javascript
// Scrypt with salt
async function hashPassword(password) {
  const salt = await randomBytes(32);
  const derivedKey = await scrypt(password, salt, 64);
  return salt.toString('hex') + ':' + derivedKey.toString('hex');
}
```

#### Session Management
```javascript
// Session structure
{
  sessionId: "...",      // Random token
  userId: 123,
  role: "patient",
  csrfToken: "...",
  active: true,
  expiresAt: "...",      // 30 minute timeout
  createdAt: "..."
}
```

#### RBAC (Role-Based Access Control)
```javascript
// Role hierarchy
roles = {
  patient: ['own_data'],
  specialist: ['patient_data', 'feedback'],
  staff: ['settings', 'patient_info'],
  admin: ['all']
}

// Middleware
requireAuth()           // Must be logged in
requireRole('admin')    // Must have specific role
requireOwnership()      // Must own resource
```

### API Design

#### Principles
1. **RESTful**: Standard HTTP methods
2. **JSON**: Request/response format
3. **Stateless**: Session via cookies
4. **Secure**: HTTPS ready, CSRF protection

#### Endpoints Pattern
```
GET    /api/{resource}        # List
GET    /api/{resource}/:id    # Get one
POST   /api/{resource}        # Create
PUT    /api/{resource}/:id    # Update
DELETE /api/{resource}/:id    # Delete
```

#### Response Format
```javascript
// Success
{
  ok: true,
  data: {...},
  meta: { total, limit, offset }
}

// Error
{
  ok: false,
  error: "Error message"
}
```

### AI Pattern Detection

#### Algorithm Overview
1. **Data Collection**: Gather readings with logs
2. **Trigger Extraction**: Parse food/activity descriptions
3. **Frequency Analysis**: Count trigger occurrences
4. **Correlation**: Calculate percentages
5. **Insight Generation**: Create recommendations

#### Implementation
```javascript
function analyzePatterns(readings, thresholds) {
  // Extract triggers from food/activity logs
  const triggers = extractTriggers(reading.foodActivityLogs);
  
  // Count occurrences with abnormal readings
  for (trigger of triggers) {
    if (isAbnormal(reading)) {
      triggerCounts[trigger]++;
    }
  }
  
  // Calculate correlations
  correlations = calculateCorrelations(triggerCounts);
  
  // Rank by correlation strength
  return topTriggers.sort((a, b) => b.correlation - a.correlation);
}
```

#### Trigger Patterns
```javascript
patterns = {
  food: /rice|sugar|bread|fast food/i,
  activity: /exercise|stress|sleep/i,
  timing: /skip.*meal|no breakfast/i
}
```

### Report Generation

#### Process
1. **Query Period**: Filter readings by date range
2. **Aggregate Stats**: Calculate avg/min/max
3. **Run AI Analysis**: Detect patterns
4. **Category Breakdown**: Count by classification
5. **Format Output**: JSON + visualizations

#### Structure
```javascript
report = {
  periodStart,
  periodEnd,
  numberOfPatients,
  totalReadings,
  avgBloodSugarMg,
  maxBloodSugarMg,
  minBloodSugarMg,
  categoryBreakdown: {
    Normal: 45,
    Borderline: 12,
    AbnormalHigh: 8,
    AbnormalLow: 3
  },
  foodActivityTriggers: {
    topTriggersHigh: [...],
    topTriggersLow: [...]
  }
}
```

## Data Model

### Entity Relationships

```
Patient 1---* Reading
Reading 1---* FoodActivityLog
Patient 1---* Alert
Specialist 1---* Feedback
Patient *---1 Feedback
Administrator 1---* Report
```

### Schema Design

#### Patient
```javascript
{
  id: number,
  fullName: string,
  email: string,
  passwordHash: string,
  healthCareNumber: string?,
  dateOfBirth: date?,
  phone: string?,
  preferredUnit: 'mg/dL' | 'mmol/L',
  registrationDate: datetime,
  createdAt: datetime,
  updatedAt: datetime
}
```

#### Reading
```javascript
{
  id: number,
  patientId: number,
  valueMgPerdL: decimal(6,2),  // Always stored in mg/dL
  unitEntered: 'mg/dL' | 'mmol/L',
  category: 'Normal' | 'Borderline' | 'AbnormalHigh' | 'AbnormalLow',
  notes: string?,
  recordedAt: datetime,
  createdAt: datetime,
  updatedAt: datetime
}
```

### Indexing Strategy
- Primary keys: Auto-increment IDs
- Foreign keys: Reference integrity
- Indexes: In-memory for fast lookups
- Sorting: By timestamp for recent data

## Performance Optimizations

### Database
1. **Write Queues**: Sequential writes per collection
2. **Atomic Operations**: Temp file + rename
3. **In-Memory Cache**: Collections loaded in memory
4. **Lazy Loading**: Related data on demand

### Frontend
1. **Component Reuse**: Shared components
2. **Event Delegation**: Efficient DOM handling
3. **Debouncing**: Prevent excessive updates
4. **Pagination**: Limit data transfer

### API
1. **Query Optimization**: Filter before load
2. **Response Compression**: Minimal payload
3. **Caching Headers**: Browser caching
4. **Rate Limiting**: Prevent abuse

## Security Measures

### Authentication
- ✅ Scrypt password hashing
- ✅ Random salt per user
- ✅ Session-based authentication
- ✅ HTTP-only cookies
- ✅ 30-minute timeout

### Authorization
- ✅ Role-based access control
- ✅ Resource ownership checks
- ✅ Deny-by-default permissions
- ✅ Audit logging

### Input Validation
- ✅ XSS prevention (sanitization)
- ✅ Type checking
- ✅ Range validation
- ✅ Required field validation

### Network Security
- ✅ CSRF tokens
- ✅ SameSite cookies
- ✅ Content Security Policy headers
- ✅ Rate limiting

## Testing Strategy

### Manual Testing
1. **Unit Testing**: Individual functions
2. **Integration Testing**: API endpoints
3. **E2E Testing**: User workflows
4. **Security Testing**: Penetration testing

### Test Scenarios
1. **Auth Flow**: Register → Login → Logout
2. **CRUD Operations**: Create → Read → Update → Delete
3. **AI Analysis**: Readings → Patterns → Insights
4. **Report Generation**: Select Period → Generate → View
5. **Alert System**: Abnormal Readings → Trigger → Notify

## Deployment

### Production Checklist
- [ ] Change default passwords
- [ ] Enable HTTPS
- [ ] Set secure environment variables
- [ ] Configure firewall
- [ ] Set up backups
- [ ] Enable monitoring
- [ ] Configure logging
- [ ] Test disaster recovery

### Environment Variables
```bash
PORT=3000
NODE_ENV=production
SESSION_SECRET=random-secret-here
```

### Process Management
Use PM2 or systemd for production:
```bash
# PM2
pm2 start server/server.js --name blood-sugar-system

# Systemd
systemctl start blood-sugar-system
```

## Future Enhancements

### Planned Features
1. **Real-time Alerts**: WebSocket notifications
2. **Mobile App**: React Native or Progressive Web App
3. **Device Integration**: CGM device support
4. **Advanced AI**: Machine learning models
5. **Data Export**: PDF/Excel reports
6. **Email Notifications**: SMTP integration
7. **Multi-language**: Internationalization
8. **Cloud Deployment**: AWS/Azure/GCP

### Scalability
1. **Database**: Migrate to PostgreSQL
2. **Caching**: Redis for sessions
3. **Load Balancing**: Multiple server instances
4. **CDN**: Static asset delivery
5. **Microservices**: Service decomposition

## Maintenance

### Regular Tasks
1. **Backups**: Daily automated backups
2. **Logs**: Rotate and archive logs
3. **Updates**: Security patches
4. **Monitoring**: Check system health
5. **Audits**: Review security logs

### Troubleshooting
1. Check server logs
2. Verify database integrity
3. Test API endpoints
4. Review audit logs
5. Monitor performance

---

**For detailed implementation, see the source code with inline comments.**
