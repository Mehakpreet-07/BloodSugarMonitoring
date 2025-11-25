// server/utils/ai.js

// Conversion threshold defaults if not provided
const DEFAULT_THRESHOLDS = {
    normalMax: 140,
    borderlineMax: 180,
    abnormalMinMg: 0,   // Safety floor
    abnormalMaxMg: 70   // Hypo threshold
};

// Smart Tokenizer: Matches the Frontend logic exactly
function extractTriggers(text) {
  if (!text) return [];
  
  // Stop words to ignore (grammar & generic actions)
  const stopWords = new Set([
    'and', 'with', 'a', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'was', 'had', 'did',
    'my', 'i', 'me', 'very', 'too', 'much', 'lot', 'little', 'some', 'any', 'no', 'none', 'null',
    'ate', 'eat', 'eating', 'drank', 'drink', 'drinking', 'took', 'taking', 'went', 'go', 'going',
    'felt', 'feeling', 'got', 'get', 'getting', 'morning', 'afternoon', 'evening', 'night', 'today', 'yesterday'
  ]);
  
  return text.toLowerCase()
    .split(/[\s,.]+/) // Split by space, comma, dot
    .map(w => w.trim())
    .filter(w => w.length > 2 && !stopWords.has(w)); // Filter short/stop words
}

/**
 * Categorize a single reading value
 */
function categorizeReading(value, thresholds) {
    const t = thresholds || DEFAULT_THRESHOLDS;
    if (value < t.abnormalMaxMg) return 'AbnormalLow'; // Hypo
    if (value > t.borderlineMax) return 'AbnormalHigh'; // Hyper
    if (value > t.normalMax) return 'Borderline';
    return 'Normal';
}

/**
 * Check if Alert should be sent (>3 abnormal in 7 days)
 */
function shouldTriggerAlert(readings, thresholds) {
    const sevenDaysAgo = Date.now() - (7 * 86400000);
    
    // Filter for recent AND abnormal
    const recentAbnormal = readings.filter(r => {
        const ts = new Date(r.recordedAt).getTime();
        const cat = categorizeReading(r.valueMgPerdL, thresholds);
        return ts >= sevenDaysAgo && (cat === 'AbnormalHigh' || cat === 'AbnormalLow');
    });

    return recentAbnormal.length >= 3; 
}

/**
 * Analyze patterns for Reports (Frequency Analysis)
 */
function analyzePatterns(readings, thresholds) {
  const t = thresholds || DEFAULT_THRESHOLDS;
  
  if (!readings || readings.length === 0) {
    return { topTriggersHigh: [], topTriggersLow: [], summary: { total:0, abnormal:0 } };
  }

  // Counters
  const highTriggers = {};
  const lowTriggers = {};
  
  let abnormalCount = 0;
  let normalCount = 0;
  let borderlineCount = 0;
  let highCount = 0;
  let lowCount = 0;

  for (const r of readings) {
    const cat = categorizeReading(r.valueMgPerdL, t);
    
    // Stats
    if (cat === 'Normal') normalCount++;
    else if (cat === 'Borderline') borderlineCount++;
    else {
        abnormalCount++;
        if (cat === 'AbnormalHigh') highCount++;
        else lowCount++;
    }

    // Pattern Recognition (Only on Abnormal readings)
    if (cat.includes('Abnormal')) {
        // Combine all text fields
        const text = `${r.foodIntake || ''} ${r.eventActivity || ''} ${r.symptoms || ''} ${r.notes || ''}`;
        const tokens = extractTriggers(text);
        
        tokens.forEach(token => {
            if (cat === 'AbnormalHigh') {
                highTriggers[token] = (highTriggers[token] || 0) + 1;
            } else {
                lowTriggers[token] = (lowTriggers[token] || 0) + 1;
            }
        });
    }
  }

  // Sort and Format Results
  const sortObj = (obj, totalTypeCount) => Object.entries(obj)
    .map(([trigger, count]) => ({
        trigger,
        count,
        // Correlation % (How often did this trigger appear in the abnormal set?)
        correlation: Math.round((count / (totalTypeCount || 1)) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3); // Top 3

  return {
    topTriggersHigh: sortObj(highTriggers, highCount),
    topTriggersLow: sortObj(lowTriggers, lowCount),
    summary: {
        totalReadings: readings.length,
        abnormalHigh: highCount,
        abnormalLow: lowCount,
        normal: normalCount,
        borderline: borderlineCount
    }
  };
}

function generateInsights(analysis) {
    const high = analysis.topTriggersHigh[0];
    const low = analysis.topTriggersLow[0];
    const insights = [];

    if (high) insights.push(`Primary trigger for high glucose: ${high.trigger} (${high.correlation}% correlation).`);
    if (low) insights.push(`Primary trigger for low glucose: ${low.trigger} (${low.correlation}% correlation).`);
    
    if (insights.length === 0) return "No specific patterns detected in this period.";
    return insights.join(' ');
}

module.exports = { 
    analyzePatterns, 
    categorizeReading, 
    shouldTriggerAlert, 
    generateInsights 
};