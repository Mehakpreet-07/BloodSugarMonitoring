// Main server file - Blood Sugar Monitoring System
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { db } = require('./storage/db');

// Middleware
const { cookieParser, requireAuth, requireRole, requireCSRF, setSecureCookie } = require('./middleware/auth');

// Route handlers
const authRoutes = require('./routes/auth');
const readingsRoutes = require('./routes/readings');
const patientsRoutes = require('./routes/patients');
const alertsRoutes = require('./routes/alerts');
const reportsRoutes = require('./routes/reports');
const emailTemplatesRoutes = require('./routes/emailTemplates'); 

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '../public');

// Parse request body
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Send response helper
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  res.end(JSON.stringify(data));
}

// Serve static files
function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath.split('?')[0]));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };

    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(data);
  });
}

// Route matcher
function matchRoute(method, path, pattern) {
  if (method !== pattern.method && pattern.method !== 'ANY') return null;

  const patternParts = pattern.path.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

// API Router
async function handleAPI(req, res) {
  try {
    cookieParser(req, res, () => {});

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      req.body = await parseBody(req);
    }

    res.json = (data) => sendJSON(res, res.statusCode || 200, data);
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    req.query = Object.fromEntries(url.searchParams);
    req.params = {};

    // Auth routes (Public)
    if (pathname === '/api/auth/register' && req.method === 'POST') return await authRoutes.register(req, res);
    if (pathname === '/api/auth/login' && req.method === 'POST') return await authRoutes.login(req, res);
    if (pathname === '/api/auth/logout' && req.method === 'POST') return await authRoutes.logout(req, res);
    if (pathname === '/api/auth/me' && req.method === 'GET') return await authRoutes.me(req, res);

    // Authentication Middleware
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // CSRF Protection (Security Fix)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        await new Promise((resolve, reject) => {
            requireCSRF(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Readings routes
    if (pathname === '/api/readings') {
        if (req.method === 'GET') return await readingsRoutes.getReadings(req, res);
        if (req.method === 'POST') return await readingsRoutes.createReading(req, res);
    }

    const readingMatch = matchRoute(req.method, pathname, { method: 'PUT', path: '/api/readings/:id' });
    if (readingMatch) { req.params = readingMatch; return await readingsRoutes.updateReading(req, res); }

    const readingDeleteMatch = matchRoute(req.method, pathname, { method: 'DELETE', path: '/api/readings/:id' });
    if (readingDeleteMatch) { req.params = readingDeleteMatch; return await readingsRoutes.deleteReading(req, res); }

    // Patient routes
    if (pathname === '/api/patients' && req.method === 'GET') {
      if (!['specialist', 'admin', 'staff'].includes(req.user.role)) return res.status(403).json({ ok: false, error: 'Access forbidden' });
      return await patientsRoutes.getPatients(req, res);
    }

    const patientMatch = matchRoute(req.method, pathname, { method: 'GET', path: '/api/patients/:id' });
    if (patientMatch) { req.params = patientMatch; return await patientsRoutes.getPatient(req, res); }

    const patientUpdateMatch = matchRoute(req.method, pathname, { method: 'PUT', path: '/api/patients/:id' });
    if (patientUpdateMatch) { req.params = patientUpdateMatch; return await patientsRoutes.updatePatient(req, res); }

    const dashboardMatch = matchRoute(req.method, pathname, { method: 'GET', path: '/api/patients/:id/dashboard' });
    if (dashboardMatch) { req.params = dashboardMatch; return await patientsRoutes.getPatientDashboard(req, res); }

    const patientReadingsMatch = matchRoute(req.method, pathname, { method: 'GET', path: '/api/patients/:id/readings' });
    if (patientReadingsMatch) {
      req.params = patientReadingsMatch;
      req.query.patientId = patientReadingsMatch.id;
      return await readingsRoutes.getReadings(req, res);
    }

    // Alerts routes
    if (pathname === '/api/alerts' && req.method === 'GET') return await alertsRoutes.getAlerts(req, res);

    const alertMatch = matchRoute(req.method, pathname, { method: 'PUT', path: '/api/alerts/:id' });
    if (alertMatch) { req.params = alertMatch; return await alertsRoutes.updateAlert(req, res); }

    // KPIs route
    if (pathname === '/api/kpis' && req.method === 'GET') {
      const patients = await db.find('patients');
      const alerts = await db.find('alerts');
      const openAlerts = alerts.filter(a => a.status === 'Pending');
      const critical = openAlerts.filter(a => a.reason && a.reason.toLowerCase().includes('abnormal')).length;
      return sendJSON(res, 200, { ok: true, patients: patients.length, alerts: openAlerts.length, critical, consults: 0, pending: 0 });
    }

    // Feedback routes
    if (pathname === '/api/feedback') {
        if (req.method === 'GET') return await alertsRoutes.getFeedback(req, res);
        if (req.method === 'POST') {
            if (req.user.role !== 'specialist' && req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Access forbidden' });
            return await alertsRoutes.createFeedback(req, res);
        }
    }
    const feedbackDeleteMatch = matchRoute(req.method, pathname, { method: 'DELETE', path: '/api/feedback/:id' });
    if (feedbackDeleteMatch) { req.params = feedbackDeleteMatch; return await alertsRoutes.deleteFeedback(req, res); }

    // Reports & Settings routes
    if (pathname === '/api/reports') {
        if (req.method === 'POST' && req.user.role === 'admin') return await reportsRoutes.generateReport(req, res);
        if (req.method === 'GET' && req.user.role === 'admin') return await reportsRoutes.getReports(req, res);
    }
    const reportMatch = matchRoute(req.method, pathname, { method: 'GET', path: '/api/reports/:id' });
    if (reportMatch) {
        if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Access forbidden' });
        req.params = reportMatch; return await reportsRoutes.getReport(req, res);
    }
    if (pathname === '/api/settings/thresholds') {
        if (req.method === 'GET') return await reportsRoutes.getThresholds(req, res);
        if (req.method === 'POST' && req.user.role === 'admin') return await reportsRoutes.createThresholds(req, res);
    }
    const thresholdMatch = matchRoute(req.method, pathname, { method: 'PUT', path: '/api/settings/thresholds/:id' });
    if (thresholdMatch) {
        if (!['staff', 'admin'].includes(req.user.role)) return res.status(403).json({ ok: false, error: 'Access forbidden' });
        req.params = thresholdMatch; return await reportsRoutes.updateThresholds(req, res);
    }
    if (pathname === '/api/audit-logs' && req.method === 'GET') {
        if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Access forbidden' });
        return await reportsRoutes.getAuditLogs(req, res);
    }

    // Email Templates routes
    if (pathname === '/api/email-templates') {
        if (req.method === 'GET') return await emailTemplatesRoutes.getEmailTemplates(req, res);
        if (req.method === 'PUT' && req.user.role === 'admin') return await emailTemplatesRoutes.updateEmailTemplates(req, res);
    }

    return res.status(404).json({ ok: false, error: 'Not found' });
  } catch (err) {
    console.error('API Error:', err);
    return sendJSON(res, 500, { ok: false, error: 'Internal server error' });
  }
}

// Main request handler
async function handleRequest(req, res) {
  try {
    if (req.url.startsWith('/api/')) return await handleAPI(req, res);
    serveStatic(req, res);
  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500);
    res.end('Internal server error');
  }
}

// Start server
async function startServer() {
  try {
    console.log('Initializing database...');
    await db.init();
    console.log('Database initialized');
    const server = http.createServer(handleRequest);
    server.listen(PORT, () => {
      console.log(`\n Blood Sugar Monitoring System\n ➜  Local:   http://localhost:${PORT}\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();