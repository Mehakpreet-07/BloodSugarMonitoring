export function kpiCard(title, value='—', note=''){
  return `
    <div class="panel kpi">
      <h3>${title}</h3>
      <div class="val">${value}</div>
      ${note? `<div class="muted">${note}</div>`:''}
    </div>
  `;
}
