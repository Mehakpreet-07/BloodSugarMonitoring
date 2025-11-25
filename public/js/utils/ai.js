// public/js/utils/ai.js

const LOW_ALERT = 70;

// 1. Smart Tokenizer (Splits text into keywords)
function extractTriggers(text) {
  if (!text) return [];
  
  const stopWords = new Set([
    'and', 'with', 'a', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'was', 'had', 'did',
    'my', 'i', 'me', 'very', 'too', 'much', 'lot', 'little', 'some', 'any', 'no', 'none', 'null',
    'ate', 'eat', 'eating', 'drank', 'drink', 'drinking', 'took', 'taking', 'went', 'go', 'going',
    'felt', 'feeling', 'got', 'get', 'getting', 'morning', 'afternoon', 'evening', 'night', 'today', 'yesterday'
  ]);
  
  return text.toLowerCase()
    .split(/[\s,.]+/) // Split by space, comma, dot
    .map(w => w.trim())
    .filter(w => w.length > 2 && !stopWords.has(w));
}

// 2. Internal Categorization (Self-contained to prevent import errors)
function getCategory(val, thr) {
    const v = Number(val);
    if (isNaN(v)) return 'Normal'; // Safety
    if (v < 70) return 'AbnormalLow';
    if (v > thr.borderlineMax) return 'AbnormalHigh';
    if (v > thr.normalMax) return 'Borderline';
    return 'Normal';
}

export function makeAiAdvice(readings = [], thresholds) {
  console.log("--- AI DEBUG START ---"); // Debugging for you
  console.log("Readings to analyze:", readings.length);

  // 1. Prepare Data & Identify Triggers
  const withCat = readings.map(r => {
      // Use existing category OR calculate it locally
      const cat = r.category || r.cat || getCategory(r.valueMgdl, thresholds);
      
      // Combine fields
      const text = `${r.foodIntake || ''} ${r.eventActivity || ''} ${r.symptoms || ''} ${r.note || ''}`;
      const triggers = extractTriggers(text);
      
      return { ...r, cat, triggers };
  });

  // 2. Filter Abnormal Highs
  // We check if category says 'Abnormal' OR if value is simply high
  const abnormalHighs = withCat.filter(r => 
      (r.cat.includes('Abnormal') || r.cat === 'AbnormalHigh') && r.valueMgdl > thresholds.normalMax
  );
  
  const abnormalLows = withCat.filter(r => 
      r.cat === 'AbnormalLow' || r.valueMgdl < LOW_ALERT
  );
  
  console.log("Abnormal Highs found:", abnormalHighs.length);

  // 3. Count Patterns
  const triggerCounts = {};
  
  abnormalHighs.forEach(r => {
      r.triggers.forEach(t => {
          triggerCounts[t] = (triggerCounts[t] || 0) + 1;
      });
  });

  console.log("Trigger Counts:", triggerCounts);

  // 4. Generate Advice
  const advice = [];

  // A. Pattern Advice (>= 2 occurrences)
  Object.entries(triggerCounts).forEach(([trigger, count]) => {
      if (count >= 2) { 
          advice.push({
              level: 'warning',
              text: `Pattern detected: High glucose frequently occurs after '${trigger}'.`
          });
      }
  });

  // B. Frequency Advice
  if (abnormalHighs.length >= 3) {
    advice.push({
      level: 'warning',
      text: 'Multiple high readings detected recently. Review your meal plan.'
    });
  }

  if (abnormalLows.length > 0) {
    advice.push({
      level: 'caution',
      text: 'Low glucose event detected. Keep fast-acting carbs nearby.'
    });
  }

  // C. Positive / Tip
  // Only show positive if NO bad patterns found
  if (advice.length === 0 && readings.length > 0) {
      advice.push({
          level: 'positive',
          text: 'No negative patterns detected. Great job keeping stable!'
      });
  } else if (readings.length === 0) {
      advice.push({
          level: 'tip',
          text: 'Start logging food and events to unlock AI insights.'
      });
  }

  console.log("Advice Generated:", advice);
  console.log("--- AI DEBUG END ---");
  
  return advice;
}

export function adviceHtml(items = []) {
  const badge = lvl =>
    lvl === 'warning' ? 'b-bad'
    : lvl === 'caution' ? 'b-warn'
    : lvl === 'positive' ? 'b-ok'
    : 'b-warn';

  return items.map(a => `
    <div class="panel" style="padding:.8rem 1rem; margin-bottom:0.5rem; border:1px solid var(--line); background:#fff">
      <span class="badge ${badge(a.level)}" style="margin-right:.5rem; font-weight:bold">${a.level.toUpperCase()}</span>
      ${a.text}
    </div>
  `).join('');
}