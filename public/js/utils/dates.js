// Utility functions for date and time operations
//24 hours × 60 minutes × 60 seconds × 1000 ms = 86400000
// Used to represent one day in milliseconds
export const DAY = 86400000;
export const now = ()=> Date.now();
export const fmtDate = ts => new Date(ts).toLocaleString();
