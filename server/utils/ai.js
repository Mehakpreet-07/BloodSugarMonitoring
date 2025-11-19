// AI Pattern Detection Algorithm for Blood Sugar Monitoring
// Implements frequency-based correlation analysis to identify triggers

/**
 * Analyze blood sugar readings and identify patterns/triggers
 * @param {Array} readings - Array of reading objects with foodActivityLogs
 * @param {Object} thresholds - Threshold settings for categorization
 * @returns {Object} Analysis results with top triggers and correlations
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

    // Analyze food/activity logs if present
    if (reading.foodActivityLogs && reading.foodActivityLogs.length > 0) {
      for (const log of reading.foodActivityLogs) {
        const description = log.description || '';
        const triggers = extractTriggers(description);

        for (const trigger of triggers) {
          if (category === 'AbnormalHigh') {
            triggerCountsHigh[trigger] = (triggerCountsHigh[trigger] || 0) + 1;
            triggerTotalHigh[trigger] = (triggerTotalHigh[trigger] || 0) + 1;
          } else if (category === 'AbnormalLow') {
            triggerCountsLow[trigger] = (triggerCountsLow[trigger] || 0) + 1;
            triggerTotalLow[trigger] = (triggerTotalLow[trigger] || 0) + 1;
          } else {
            // Track in normal/borderline to calculate correlation
            triggerTotalHigh[trigger] = (triggerTotalHigh[trigger] || 0);
            triggerTotalLow[trigger] = (triggerTotalLow[trigger] || 0);
          }
        }
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
 * Extract potential triggers from food/activity description
 * @param {string} description - Text description
 * @returns {Array} List of identified triggers
 */
function extractTriggers(description) {
  if (!description) return [];
  
  const text = description.toLowerCase();
  const triggers = [];

  // Common food triggers
  const foodPatterns = [
    { pattern: /rice|noodle|pasta|bread|wheat/i, trigger: 'high-carb foods' },
    { pattern: /sugar|candy|sweet|dessert|cake|cookie/i, trigger: 'sugary foods' },
    { pattern: /fast food|burger|pizza|fries/i, trigger: 'fast food' },
    { pattern: /soda|juice|beverage/i, trigger: 'sweetened beverages' },
    { pattern: /alcohol|beer|wine/i, trigger: 'alcohol' },
    { pattern: /fruit/i, trigger: 'fruit' },
    { pattern: /coffee|caffeine/i, trigger: 'caffeine' },
    { pattern: /milk|dairy/i, trigger: 'dairy products' }
  ];

  // Activity/lifestyle triggers
  const activityPatterns = [
    { pattern: /skip.*breakfast|no breakfast/i, trigger: 'skipping breakfast' },
    { pattern: /skip.*meal|no.*meal|missed.*meal/i, trigger: 'skipping meals' },
    { pattern: /exercise|workout|gym|run|jog/i, trigger: 'exercise' },
    { pattern: /stress|anxiety|worry/i, trigger: 'stress' },
    { pattern: /sleep|tired|fatigue/i, trigger: 'poor sleep' },
    { pattern: /medication|medicine|pill/i, trigger: 'medication timing' },
    { pattern: /illness|sick|fever/i, trigger: 'illness' }
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

  // If no specific triggers found, use generic description
  if (triggers.length === 0 && text.length > 0) {
    triggers.push(text.slice(0, 30));
  }

  return [...new Set(triggers)]; // Remove duplicates
}

/**
 * Categorize a blood sugar reading
 * @param {number} value - Reading value in mg/dL
 * @param {Object} thresholds - Threshold settings
 * @returns {string} Category name
 */
function categorizeReading(value, thresholds) {
  if (value < thresholds.abnormalMaxMg) {
    return 'AbnormalLow';
  } else if (value >= thresholds.abnormalHighMinMg) {
    return 'AbnormalHigh';
  } else if (value >= thresholds.normalMinMg && value < thresholds.normalMaxMg) {
    return 'Normal';
  } else {
    return 'Borderline';
  }
}

/**
 * Detect if alert should be triggered (3+ abnormal in 7 days)
 * @param {Array} readings - Recent readings
 * @param {Object} thresholds - Threshold settings
 * @returns {boolean} Whether to trigger alert
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
 * Generate AI insights text based on analysis
 * @param {Object} analysis - Results from analyzePatterns
 * @returns {string} Human-readable insights
 */
function generateInsights(analysis) {
  const insights = [];

  if (analysis.topTriggersHigh.length > 0) {
    const top = analysis.topTriggersHigh[0];
    insights.push(
      `High glucose levels occur ${top.correlation}% of the time after ${top.trigger}.`
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
      `Most abnormal readings are high glucose. Consider reducing carbohydrate intake.`
    );
  } else if (analysis.summary.abnormalLow > analysis.summary.abnormalHigh) {
    insights.push(
      `Most abnormal readings are low glucose. Ensure regular meal timing.`
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
