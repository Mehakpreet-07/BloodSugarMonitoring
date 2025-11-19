// public/js/utils/dates.js

// One day in milliseconds (24 * 60 * 60 * 1000)
export const DAY = 86400000;

// Get current timestamp
export const now = () => Date.now();

// Format a timestamp into a readable date string
export const fmtDate = ts => {
  if (!ts) return 'Invalid Date';
  // Returns string like "11/19/2025, 10:30 AM"
  return new Date(ts).toLocaleString();
};