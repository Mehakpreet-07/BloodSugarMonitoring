// Run: node server/server.js  (serves /public and simple mock endpoints)
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'public');

function send(res, code, body, type='text/plain'){
  res.writeHead(code, { 'Content-Type': type });
  res.end(body);
}
function serveFile(req, res){
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.normalize(path.join(ROOT, urlPath.split('?')[0]));
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden');
  fs.readFile(filePath, (err, buf)=>{
    if (err) return send(res, 404, 'Not found');
    const ext = path.extname(filePath).toLowerCase();
    const mime = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png' }[ext] || 'application/octet-stream';
    send(res, 200, buf, mime);
  });
}

const server = http.createServer((req,res)=>{
  // mock API endpoints (you can replace with real DB later)
  if (req.url.startsWith('/api/kpis'))     return fs.readFile(path.join(ROOT,'mock/kpis.json'), (e,b)=> send(res,200,b,'application/json'));
  if (req.url.startsWith('/api/alerts'))   return fs.readFile(path.join(ROOT,'mock/alerts.json'), (e,b)=> send(res,200,b,'application/json'));
  if (req.url.startsWith('/api/patients')) return fs.readFile(path.join(ROOT,'mock/patients.json'),(e,b)=> send(res,200,b,'application/json'));
  if (req.url.startsWith('/api/readings')) return fs.readFile(path.join(ROOT,'mock/readings.json'),(e,b)=> send(res,200,b,'application/json'));

  // static
  serveFile(req,res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log(`Dev server running → http://localhost:${PORT}`));
