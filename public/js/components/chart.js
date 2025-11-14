// public/js/components/chart.js
export function drawLine(canvasId, points){
  const cvs = document.getElementById(canvasId);
  const ctx = cvs.getContext('2d');

  const w = cvs.clientWidth, h = cvs.clientHeight;
  cvs.width = w; cvs.height = h;
  ctx.clearRect(0,0,w,h);

  if (!points || points.length === 0) {
    // axes only
    const pad = 28;
    ctx.strokeStyle = '#2a3547';
    ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.stroke();
    return;
  }

  // protect against identical x or y
  const xs = points.map(p=> +p.x), ys = points.map(p=> +p.y);
  let minx = Math.min(...xs), maxx = Math.max(...xs);
  let miny = Math.min(...ys), maxy = Math.max(...ys);
  if (maxx === minx) { maxx = minx + 1; }         // 1 point case
  if (maxy === miny) { maxy = miny + 1; }

  const pad = 28;
  const X = t => pad + (w - 2*pad) * ((t - minx) / (maxx - minx));
  const Y = v => h - pad - (h - 2*pad) * ((v - miny) / (maxy - miny));

  // axes
  ctx.strokeStyle = '#2a3547';
  ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.stroke();

  // line
  ctx.strokeStyle = '#8aa3c7';
  ctx.beginPath();
  points.slice().sort((a,b)=>a.x-b.x).forEach((p,i)=>{
    const x = X(+p.x), y = Y(+p.y);
    if (i) ctx.lineTo(x,y); else ctx.moveTo(x,y);
  });
  ctx.stroke();

  // points
  points.forEach(p=>{
    const x = X(+p.x), y = Y(+p.y);
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2);
    ctx.fillStyle = p.cat==='Abnormal' ? '#d9534f' : (p.cat==='Borderline' ? '#ae7a00' : '#148f4a');
    ctx.fill();
  });
}
