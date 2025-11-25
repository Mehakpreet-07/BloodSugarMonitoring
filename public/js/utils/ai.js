import { categorizeByThresholds } from './units.js';
const LOW_ALERT = 70;

function extractTriggers(text) {
  if (!text) return [];
  const stopWords = new Set(['and','with','a','the','in','on','at','to','for','of','is','was','had','did','my','i','me','very','too','much','lot','little','some','any','no','none','null','ate','eat','eating','drank','drink','drinking','took','taking','went','go','going','felt','feeling','got','get','getting','morning','afternoon','evening','night','today','yesterday']);
  return text.toLowerCase().split(/[\s,.]+/).map(w => w.trim()).filter(w => w.length > 2 && !stopWords.has(w));
}

export function makeAiAdvice(readings = [], thresholds) {
  const withCat = readings.map(r => {
      const cat = r.cat || categorizeByThresholds(r.valueMgdl, thresholds);
      const text = `${r.foodIntake||''} ${r.eventActivity||''} ${r.symptoms||''} ${r.note||''}`;
      return { ...r, cat, triggers: extractTriggers(text) };
  });

  const abnormalHighs = withCat.filter(r => (r.cat.includes('Abnormal') || r.cat === 'AbnormalHigh') && r.valueMgdl > thresholds.normalMax);
  const abnormalLows  = withCat.filter(r => r.cat === 'AbnormalLow' || r.valueMgdl < LOW_ALERT);
  const triggerCounts = {};
  
  abnormalHighs.forEach(r => r.triggers.forEach(t => triggerCounts[t] = (triggerCounts[t] || 0) + 1));

  const advice = [];
  Object.entries(triggerCounts).forEach(([trigger, count]) => { if (count >= 2) advice.push({ level: 'warning', text: `Pattern detected: High glucose frequently occurs after '${trigger}'.` }); });

  if (abnormalHighs.length >= 3) advice.push({ level: 'warning', text: 'Multiple high readings detected recently. Review your meal plan.' });
  if (abnormalLows.length > 0) advice.push({ level: 'caution', text: 'Low glucose event detected. Keep fast-acting carbs nearby.' });
  if (advice.length === 0 && readings.length > 0) advice.push({ level: 'positive', text: 'No negative patterns detected. Great job!' });
  else if (readings.length === 0) advice.push({ level: 'tip', text: 'Start logging food and events to unlock AI insights.' });

  return advice;
}

export function adviceHtml(items = []) {
  const badge = lvl => lvl === 'warning' ? 'b-bad' : lvl === 'caution' ? 'b-warn' : lvl === 'positive' ? 'b-ok' : 'b-warn';
  return items.map(a => `<div class="panel" style="padding:.8rem 1rem; margin-bottom:0.5rem; border:1px solid var(--line); background:#fff"><span class="badge ${badge(a.level)}" style="margin-right:.5rem; font-weight:bold">${a.level.toUpperCase()}</span>${a.text}</div>`).join('');
}