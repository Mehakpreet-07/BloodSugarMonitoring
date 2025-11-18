// public/js/components/kpicard.js
// KPI card component
// full form: Key Performance Indicator(KPI)
// Exports a single function: kpiCard(title, value, note)
// Returns HTML for a KPI card with the given title, value, and optional note
export function kpiCard(title, value='—', note=''){
  return `
    <div class="panel kpi">
      <h3>${title}</h3>
      <div class="val">${value}</div>
      ${note? `<div class="muted">${note}</div>`:''}
    </div>
  `;
}
