// Utility functions for blood sugar unit conversion and validation

// Conversion constants as per SRS: 1 mmol/L = 18 mg/dL
const MMOL_TO_MGDL = 18;
const MGDL_TO_MMOL = 1 / 18;

/**
 * Convert blood sugar value to mg/dL
 * @param {number} value - The value to convert
 * @param {string} unit - Current unit ('mg/dL' or 'mmol/L')
 * @returns {number} Value in mg/dL
 */
function toMgdL(value, unit) {
  if (unit === 'mmol/L') {
    return Math.round(value * MMOL_TO_MGDL * 100) / 100;
  }
  return Math.round(value * 100) / 100;
}

/**
 * Convert blood sugar value from mg/dL to target unit
 * @param {number} valueMgdL - Value in mg/dL
 * @param {string} targetUnit - Target unit ('mg/dL' or 'mmol/L')
 * @returns {number} Converted value
 */
function fromMgdL(valueMgdL, targetUnit) {
  if (targetUnit === 'mmol/L') {
    return Math.round(valueMgdL * MGDL_TO_MMOL * 100) / 100;
  }
  return Math.round(valueMgdL * 100) / 100;
}

/**
 * Validate blood sugar value
 * @param {number} value - Value to validate
 * @param {string} unit - Unit of measurement
 * @returns {Object} Validation result
 */
function validateBloodSugarValue(value, unit) {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Value must be a number' };
  }

  if (value < 0) {
    return { valid: false, error: 'Value cannot be negative' };
  }

  // Reasonable range checks
  if (unit === 'mg/dL') {
    if (value > 600) {
      return { valid: false, error: 'Value seems unreasonably high (>600 mg/dL)' };
    }
  } else if (unit === 'mmol/L') {
    if (value > 33) {
      return { valid: false, error: 'Value seems unreasonably high (>33 mmol/L)' };
    }
  }

  return { valid: true };
}

/**
 * Validate unit type
 * @param {string} unit - Unit to validate
 * @returns {boolean} Whether unit is valid
 */
function isValidUnit(unit) {
  return unit === 'mg/dL' || unit === 'mmol/L';
}

/**
 * Format timestamp to ISO 8601 UTC
 * @param {Date|string|number} timestamp
 * @returns {string} ISO 8601 formatted string
 */
function formatTimestamp(timestamp) {
  if (!timestamp) {
    return new Date().toISOString();
  }
  
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  return new Date(timestamp).toISOString();
}

/**
 * Parse date range for queries
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {Object} Parsed date range
 */
function parseDateRange(startDate, endDate) {
  const start = startDate ? new Date(startDate) : new Date(0);
  const end = endDate ? new Date(endDate) : new Date();
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format');
  }
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

/**
 * Validate required fields
 * @param {Object} data - Data object to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} Validation result
 */
function validateRequiredFields(data, requiredFields) {
  const missing = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(', ')}`
    };
  }
  
  return { valid: true };
}

/**
 * Safe parseInt with default
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default if parsing fails
 * @returns {number} Parsed integer
 */
function safeParseInt(value, defaultValue = 0) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safe parseFloat with default
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default if parsing fails
 * @returns {number} Parsed float
 */
function safeParseFloat(value, defaultValue = 0) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

module.exports = {
  toMgdL,
  fromMgdL,
  validateBloodSugarValue,
  isValidUnit,
  formatTimestamp,
  parseDateRange,
  validateRequiredFields,
  safeParseInt,
  safeParseFloat,
  MMOL_TO_MGDL,
  MGDL_TO_MMOL
};
