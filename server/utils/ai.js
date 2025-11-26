// AI Pattern Detection Algorithm - ENHANCED & FIXED

/**
 * Analyze blood sugar readings and identify patterns/triggers
 */
function analyzePatterns(readings, thresholds) {
  if (!readings || readings.length === 0) {
    return {
      topTriggersHigh: [],
      topTriggersLow: [],
      correlations: [],
      summary: {
        totalReadings: 0,
        abnormalHigh: 0,
        abnormalLow: 0,
        normal: 0,
        borderline: 0
      }
    };
  }

  const triggerCountsHigh = {};
  const triggerCountsLow = {};
  const triggerTotalHigh = {};
  const triggerTotalLow = {};

  let abnormalHighCount = 0;
  let abnormalLowCount = 0;
  let normalCount = 0;
  let borderlineCount = 0;

  // Process each reading
  for (const reading of readings) {
    const value = reading.valueMgdl || reading.valueMgPerdL;
    const category = categorizeReading(value, thresholds);

    // Count categories
    if (category === 'AbnormalHigh') abnormalHighCount++;
    else if (category === 'AbnormalLow') abnormalLowCount++;
    else if (category === 'Normal') normalCount++;
    else if (category === 'Borderline') borderlineCount++;

    // ⭐ FIX: Extract triggers from reading fields directly
    const triggers = [];
    if (reading.foodIntake) triggers.push(...extractTriggers(reading.foodIntake));
    if (reading.eventActivity) triggers.push(...extractTriggers(reading.eventActivity));
    if (reading.symptoms) triggers.push(...extractTriggers(reading.symptoms));

    // ⭐ BACKWARD COMPATIBILITY: Also check foodActivityLogs if present
    if (reading.foodActivityLogs && reading.foodActivityLogs.length > 0) {
      for (const log of reading.foodActivityLogs) {
        const description = log.description || '';
        triggers.push(...extractTriggers(description));
      }
    }

    // Count triggers by category
    for (const trigger of triggers) {
      if (category === 'AbnormalHigh') {
        triggerCountsHigh[trigger] = (triggerCountsHigh[trigger] || 0) + 1;
        triggerTotalHigh[trigger] = (triggerTotalHigh[trigger] || 0) + 1;
      } else if (category === 'AbnormalLow') {
        triggerCountsLow[trigger] = (triggerCountsLow[trigger] || 0) + 1;
        triggerTotalLow[trigger] = (triggerTotalLow[trigger] || 0) + 1;
      } else {
        // Track normal occurrences for correlation calculation
        triggerTotalHigh[trigger] = (triggerTotalHigh[trigger] || 0);
        triggerTotalLow[trigger] = (triggerTotalLow[trigger] || 0);
      }
    }
  }

  // Calculate correlations and rank triggers
  const triggersHigh = Object.entries(triggerCountsHigh)
    .map(([trigger, abnormalCount]) => {
      const totalOccurrences = triggerTotalHigh[trigger] || abnormalCount;
      const correlation = totalOccurrences > 0 
        ? (abnormalCount / totalOccurrences * 100)
        : 0;
      
      return {
        trigger,
        occurrences: abnormalCount,
        correlation: Math.round(correlation),
        type: 'high'
      };
    })
    .filter(t => t.correlation >= 30) // ⭐ Only show meaningful correlations
    .sort((a, b) => b.correlation - a.correlation || b.occurrences - a.occurrences)
    .slice(0, 5);

  const triggersLow = Object.entries(triggerCountsLow)
    .map(([trigger, abnormalCount]) => {
      const totalOccurrences = triggerTotalLow[trigger] || abnormalCount;
      const correlation = totalOccurrences > 0 
        ? (abnormalCount / totalOccurrences * 100)
        : 0;
      
      return {
        trigger,
        occurrences: abnormalCount,
        correlation: Math.round(correlation),
        type: 'low'
      };
    })
    .filter(t => t.correlation >= 30) // ⭐ Only show meaningful correlations
    .sort((a, b) => b.correlation - a.correlation || b.occurrences - a.occurrences)
    .slice(0, 5);

  return {
    topTriggersHigh: triggersHigh,
    topTriggersLow: triggersLow,
    correlations: [...triggersHigh, ...triggersLow],
    summary: {
      totalReadings: readings.length,
      abnormalHigh: abnormalHighCount,
      abnormalLow: abnormalLowCount,
      normal: normalCount,
      borderline: borderlineCount
    }
  };
}

/**
 * Extract potential triggers from text - ENHANCED
 */
function extractTriggers(description) {
  if (!description) return [];
  
  const text = description.toLowerCase();
  const triggers = [];

  // Enhanced food patterns
  const foodPatterns = [
    { pattern: /rice|noodle|pasta|bread|wheat|roti|chapati/i, trigger: 'high-carb foods' },
    { pattern: /sugar|candy|sweet|dessert|cake|cookie|chocolate/i, trigger: 'sugary foods' },
    { pattern: /fast food|burger|pizza|fries|fried/i, trigger: 'fast food' },
    { pattern: /soda|juice|beverage|pop|soft drink/i, trigger: 'sweetened beverages' },
    { pattern: /alcohol|beer|wine|liquor/i, trigger: 'alcohol' },
    { pattern: /fruit|banana|apple|orange|mango/i, trigger: 'fruit' },
    { pattern: /coffee|caffeine|tea/i, trigger: 'caffeine' },
    { pattern: /milk|dairy|cheese|yogurt/i, trigger: 'dairy products' },
    { pattern: /meat|chicken|beef|pork/i, trigger: 'protein' },
    { pattern: /vegetable|salad|greens/i, trigger: 'vegetables' }
  ];

  // Enhanced activity/lifestyle patterns
  const activityPatterns = [
    { pattern: /skip.*breakfast|no breakfast|missed breakfast/i, trigger: 'skipping breakfast' },
    { pattern: /skip.*meal|no.*meal|missed.*meal/i, trigger: 'skipping meals' },
    { pattern: /exercise|workout|gym|run|jog|walk/i, trigger: 'exercise' },
    { pattern: /stress|anxiety|worry|pressure/i, trigger: 'stress' },
    { pattern: /sleep|tired|fatigue|exhausted/i, trigger: 'poor sleep' },
    { pattern: /medication|medicine|pill|insulin/i, trigger: 'medication timing' },
    { pattern: /illness|sick|fever|cold/i, trigger: 'illness' },
    { pattern: /work|meeting|deadline/i, trigger: 'work stress' },
    { pattern: /party|celebration|event/i, trigger: 'social events' }
  ];

  // Check for food triggers
  for (const { pattern, trigger } of foodPatterns) {
    if (pattern.test(text)) {
      triggers.push(trigger);
    }
  }

  // Check for activity triggers
  for (const { pattern, trigger } of activityPatterns) {
    if (pattern.test(text)) {
      triggers.push(trigger);
    }
  }

  // ⭐ FIX: If no specific triggers found, extract meaningful words
  if (triggers.length === 0 && text.length > 0) {
    const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','up','about','into','through','during','before','after','above','below','between','under','again','further','then','once','here','there','when','where','why','how','all','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','can','will','just','should','now']);
    
    const words = text.split(/[\s,.;!?]+/).filter(w => w.length > 3 && !stopWords.has(w));
    if (words.length > 0) {
      triggers.push(words[0]); // Take first meaningful word
    }
  }

  return [...new Set(triggers)]; // Remove duplicates
}

/**
 * Categorize a blood sugar reading - FIXED
 */
function categorizeReading(value, thresholds) {
  const normalMax = thresholds.normalMaxMg || thresholds.normalMax || 140;
  const borderlineMax = thresholds.borderlineMaxMg || thresholds.borderlineMax || 180;
  const abnormalMaxMg = thresholds.abnormalMaxMg || 70;
  const abnormalHighMinMg = thresholds.abnormalHighMinMg || 180;

  if (value < abnormalMaxMg) {
    return 'AbnormalLow';
  } else if (value >= abnormalHighMinMg) {
    return 'AbnormalHigh';
  } else if (value <= normalMax) {
    return 'Normal';
  } else {
    return 'Borderline';
  }
}

/**
 * Detect if alert should be triggered (3+ abnormal in 7 days)
 */
function shouldTriggerAlert(readings, thresholds) {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  const recentReadings = readings.filter(r => {
    const timestamp = new Date(r.recordedAt).getTime();
    return timestamp >= sevenDaysAgo;
  });

  const abnormalCount = recentReadings.filter(r => {
    const value = r.valueMgdl || r.valueMgPerdL;
    const category = categorizeReading(value, thresholds);
    return category === 'AbnormalHigh' || category === 'AbnormalLow';
  }).length;

  return abnormalCount > 3;
}

/**
 * Generate AI insights text - ENHANCED
 */
function generateInsights(analysis) {
  const insights = [];

  if (analysis.topTriggersHigh.length > 0) {
    const top = analysis.topTriggersHigh[0];
    insights.push(
      `High glucose levels occur ${top.correlation}% of the time after consuming ${top.trigger}.`
    );
  }

  if (analysis.topTriggersLow.length > 0) {
    const top = analysis.topTriggersLow[0];
    insights.push(
      `Low glucose levels occur ${top.correlation}% of the time after ${top.trigger}.`
    );
  }

  if (analysis.summary.abnormalHigh > analysis.summary.abnormalLow) {
    insights.push(
      `Most abnormal readings are high glucose. Consider reducing carbohydrate intake and increasing physical activity.`
    );
  } else if (analysis.summary.abnormalLow > analysis.summary.abnormalHigh) {
    insights.push(
      `Most abnormal readings are low glucose. Ensure regular meal timing and monitor insulin dosage.`
    );
  }

  // ⭐ NEW: Provide positive feedback if doing well
  if (analysis.summary.normal > (analysis.summary.totalReadings * 0.7)) {
    insights.push(
      `Great job! Over 70% of your readings are in the normal range. Keep up the good work!`
    );
  }

  return insights.join(' ');
}

module.exports = {
  analyzePatterns,
  extractTriggers,
  categorizeReading,
  shouldTriggerAlert,
  generateInsights
};