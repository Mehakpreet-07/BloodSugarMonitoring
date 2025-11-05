export function drawLine(canvasId, points){
  const cvs = document.getElementById(canvasId);
  const ctx = cvs.getContext('2d');
  const w=cvs.clientWidth, h=cvs.clientHeight; cvs.width=w; cvs.height=h;
  const xs=points.map(p=>p.x), ys=points.map(p=>p.y);
  const minx=Math.min(...xs), maxx=Math.max(...xs), miny=Math.min(...ys), maxy=Math.max(...ys);
  const pad=28, X=t=> pad+(w-2*pad)*((t-minx)/(maxx-minx||1)), Y=v=> h-pad-(h-2*pad)*((v-miny)/(maxy-miny||1));
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle='#2a3547'; ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.stroke();
  ctx.strokeStyle='#8aa3c7'; ctx.beginPath();
  points.sort((a,b)=>a.x-b.x).forEach((p,i)=> i?ctx.lineTo(X(p.x),Y(p.y)):ctx.moveTo(X(p.x),Y(p.y)));
  ctx.stroke();
  points.forEach(p=>{ ctx.beginPath(); ctx.arc(X(p.x),Y(p.y),3,0,Math.PI*2);
    ctx.fillStyle = p.cat==='Abnormal'?'#d9534f':(p.cat==='Borderline'?'#d79b00':'#3aa76d'); ctx.fill(); });
}
