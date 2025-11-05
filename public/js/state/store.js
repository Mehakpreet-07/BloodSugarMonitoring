// tiny global store (no framework)
export const store = {
  user: { role:'doctor', name:'Dr. A. Sharma' },
  filters: { patient:'', category:'' },
  set(partial){ Object.assign(this, partial); document.dispatchEvent(new Event('state:change')); }
};
