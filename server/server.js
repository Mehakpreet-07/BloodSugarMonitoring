// Main server file - Blood Sugar Monitoring System
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { db } = require('./storage/db');
const { cookieParser, requireAuth, requireRole, requireCSRF } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const readingsRoutes = require('./routes/readings');
const patientsRoutes = require('./routes/patients');
const alertsRoutes = require('./routes/alerts');
const reportsRoutes = require('./routes/reports');
const emailTemplatesRoutes = require('./routes/emailTemplates'); 
const adminRoutes = require('./routes/admin');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '../public');

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { 
        body += chunk.toString(); 
        if(body.length > 1e6) { req.connection.destroy(); reject(new Error('Payload too large')); } 
    });
    req.on('end', () => { 
        try { resolve(body ? JSON.parse(body) : {}); } catch (err) { resolve({}); } 
    });
    req.on('error', reject);
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 
      'Content-Type': 'application/json', 
      'X-Content-Type-Options': 'nosniff' 
  });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath.split('?')[0]));

  if (!filePath.startsWith(PUBLIC_DIR)) { 
      res.writeHead(403); return res.end('Forbidden'); 
  }
  
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(filePath).toLowerCase();
    const types = { 
        '.html':'text/html', '.css':'text/css', '.js':'text/javascript', 
        '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', 
        '.svg':'image/svg+xml', '.ico':'image/x-icon' 
    };
    res.writeHead(200, { 'Content-Type': types[ext]||'application/octet-stream' });
    res.end(data);
  });
}

async function handleAPI(req, res) {
  try {
    cookieParser(req, res, () => {});
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) req.body = await parseBody(req);

    res.json = (d) => sendJSON(res, res.statusCode || 200, d);
    res.status = (c) => { res.statusCode = c; return res; };

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const p = url.pathname;
    req.query = Object.fromEntries(url.searchParams);
    req.params = {};

    // --- Public Routes ---
    if (p === '/api/auth/register' && req.method === 'POST') return await authRoutes.register(req, res);
    if (p === '/api/auth/login' && req.method === 'POST') return await authRoutes.login(req, res);
    if (p === '/api/auth/logout' && req.method === 'POST') return await authRoutes.logout(req, res);
    if (p === '/api/auth/me' && req.method === 'GET') return await authRoutes.me(req, res);
    if (p === '/api/auth/forgot-password' && req.method === 'POST') return await authRoutes.forgotPassword(req, res); // ⭐ NEW
    if (p === '/api/auth/reset-password' && req.method === 'POST') return await authRoutes.resetPassword(req, res); // ⭐ NEW

    // --- Middleware Checks ---
    await new Promise((resolve, reject) => requireAuth(req, res, (e) => e ? reject(e) : resolve()));
    
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        await new Promise((resolve, reject) => requireCSRF(req, res, (e) => e ? reject(e) : resolve()));
    }

    // --- Protected Routes ---
    
    if (p === '/api/auth/profile' && req.method === 'PUT') return authRoutes.updateProfile(req, res);
    
    // Readings
    if (p === '/api/readings') {
        if (req.method === 'GET') return readingsRoutes.getReadings(req, res);
        if (req.method === 'POST') return readingsRoutes.createReading(req, res);
    }
    if (p.match(/\/api\/readings\/\d+/) && req.method === 'PUT') {
        req.params = { id: p.split('/').pop() };
        return readingsRoutes.updateReading(req, res);
    }
    if (p.match(/\/api\/readings\/\d+/) && req.method === 'DELETE') {
        req.params = { id: p.split('/').pop() };
        return readingsRoutes.deleteReading(req, res);
    }

    // Patients
    if (p === '/api/patients' && req.method === 'GET') return patientsRoutes.getPatients(req, res);
    if (p.match(/\/api\/patients\/\d+\/dashboard/) && req.method === 'GET') {
        req.params = { id: p.split('/')[3] };
        return patientsRoutes.getPatientDashboard(req, res);
    }
    if (p.match(/\/api\/patients\/\d+\/readings/) && req.method === 'GET') {
        req.params = { id: p.split('/')[3] };
        req.query.patientId = req.params.id;
        return readingsRoutes.getReadings(req, res);
    }
    if (p.match(/\/api\/patients\/\d+/) && req.method === 'GET') {
        req.params = { id: p.split('/').pop() };
        return patientsRoutes.getPatient(req, res);
    }
    if (p.match(/\/api\/patients\/\d+/) && req.method === 'PUT') {
        req.params = { id: p.split('/').pop() };
        return patientsRoutes.updatePatient(req, res);
    }

    // Alerts & Feedback
    if (p === '/api/alerts' && req.method === 'GET') return alertsRoutes.getAlerts(req, res);
    if (p.match(/\/api\/alerts\/\d+/) && req.method === 'PUT') {
        req.params = { id: p.split('/').pop() };
        return alertsRoutes.updateAlert(req, res);
    }
    if (p === '/api/feedback') {
        if (req.method === 'GET') return alertsRoutes.getFeedback(req, res);
        if (req.method === 'POST') return alertsRoutes.createFeedback(req, res);
    }
    
    // Admin Routes
    if (p === '/api/admin/users' && req.method === 'GET') return adminRoutes.getUsers(req, res);
    if (p === '/api/admin/create' && req.method === 'POST') return adminRoutes.createProfessional(req, res);
    if (p === '/api/admin/backup' && req.method === 'GET') return adminRoutes.getFullBackup(req, res);
    if (p === '/api/admin/restore' && req.method === 'POST') return adminRoutes.restoreBackup(req, res);
    
    if (p.match(/\/api\/admin\/users\/\w+\/\d+/) && req.method === 'PUT') {
        const parts = p.split('/');
        req.params = { role: parts[4], id: parts[5] };
        return adminRoutes.updateUser(req, res);
    }

    if (p.match(/\/api\/admin\/users\/\w+\/\d+/) && req.method === 'DELETE') {
        const parts = p.split('/');
        req.params = { role: parts[4], id: parts[5] };
        return adminRoutes.deleteUser(req, res);
    }

    // Reports, Logs & Settings
    if (p === '/api/reports') {
        if (req.method === 'POST') return reportsRoutes.generateReport(req, res);
        if (req.method === 'GET') return reportsRoutes.getReports(req, res);
    }
    if (p === '/api/audit-logs' && req.method === 'GET') return reportsRoutes.getAuditLogs(req, res);
    
    if (p === '/api/kpis' && req.method === 'GET') {
        let patientQuery = {};
        if (req.user.role === 'specialist') patientQuery.assignedSpecialistId = req.user.id;
        
        const patients = await db.find('patients', patientQuery);
        const allAlerts = await db.find('alerts');
        const openAlerts = allAlerts.filter(a => {
            const statusMatch = a.status === 'Pending';
            const userMatch = req.user.role === 'specialist' ? a.specialistId === req.user.id : true;
            return statusMatch && userMatch;
        });
        const critical = openAlerts.filter(a => a.reason && a.reason.toLowerCase().includes('abnormal')).length;
        
        return sendJSON(res, 200, { ok: true, patients: patients.length, alerts: openAlerts.length, critical, consults: 0, pending: 0 });
    }

    if (p === '/api/settings/thresholds') {
        if(req.method === 'GET') return reportsRoutes.getThresholds(req, res);
    }
    if (p.match(/\/api\/settings\/thresholds\/\d+/) && req.method === 'PUT') {
        req.params = { id: p.split('/').pop() };
        return reportsRoutes.updateThresholds(req, res);
    }
    if (p === '/api/email-templates') {
        if(req.method === 'GET') return emailTemplatesRoutes.getEmailTemplates(req, res);
        if(req.method === 'PUT') return emailTemplatesRoutes.updateEmailTemplates(req, res);
    }

    res.status(404).json({ ok: false, error: 'Not found' });
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { ok: false, error: 'Internal error' });
  }
}

async function startServer() {
  try {
    console.log('Initializing database...');
    await db.init();
    console.log('Database initialized');
    
    const server = http.createServer(async (req, res) => {
      if (req.url.startsWith('/api')) await handleAPI(req, res);
      else serveStatic(req, res);
    });

    server.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('  Blood Sugar Monitoring System');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      console.log(`  ➜  Local:   http://localhost:${PORT}`);
      console.log('');
      console.log('  Press Ctrl+C to stop');
      console.log('');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();